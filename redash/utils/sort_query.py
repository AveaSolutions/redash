"""
Vendored from SQLAlchemy-Utils 0.36.5 (sort_query removed in 0.37.0).

Used by list endpoints for ?order= query parameters. Kept local so we can
upgrade SQLAlchemy-Utils for SQLAlchemy 1.4 without losing sort_query.
"""
from inspect import isclass

import sqlalchemy as sa
from sqlalchemy.orm import mapperlib
from sqlalchemy.orm.attributes import InstrumentedAttribute
from sqlalchemy.orm.properties import ColumnProperty, RelationshipProperty
from sqlalchemy.orm.util import AliasedInsp
from sqlalchemy.sql.expression import asc, desc

try:
    from sqlalchemy.orm.context import _ColumnEntity, _MapperEntity
except ImportError:  # SQLAlchemy <1.4
    from sqlalchemy.orm.query import _ColumnEntity, _MapperEntity


class QuerySorterException(Exception):
    pass


def _get_mapper(mixed):
    if isinstance(mixed, _MapperEntity):
        mixed = mixed.expr
    elif isinstance(mixed, sa.Column):
        mixed = mixed.table
    elif isinstance(mixed, _ColumnEntity):
        mixed = mixed.expr

    if isinstance(mixed, sa.orm.Mapper):
        return mixed
    if isinstance(mixed, sa.orm.util.AliasedClass):
        return sa.inspect(mixed).mapper
    if isinstance(mixed, sa.sql.selectable.Alias):
        mixed = mixed.element
    if isinstance(mixed, AliasedInsp):
        return mixed.mapper
    if isinstance(mixed, InstrumentedAttribute):
        mixed = mixed.class_
    if isinstance(mixed, sa.Table):
        if hasattr(mapperlib, "_all_registries"):
            all_mappers = set()
            for mapper_registry in mapperlib._all_registries():
                all_mappers.update(mapper_registry.mappers)
        else:
            all_mappers = mapperlib._mapper_registry
        mappers = [mapper for mapper in all_mappers if mixed in mapper.tables]
        if len(mappers) > 1:
            raise ValueError("Multiple mappers found for table '%s'." % mixed.name)
        if not mappers:
            raise ValueError("Could not get mapper for table '%s'." % mixed.name)
        return mappers[0]
    if not isclass(mixed):
        mixed = type(mixed)
    return sa.inspect(mixed)


def _get_polymorphic_mappers(mixed):
    if isinstance(mixed, AliasedInsp):
        return mixed.with_polymorphic_mappers
    return mixed.polymorphic_map.values()


def _query_labels(query):
    from sqlalchemy.sql.elements import Label

    return [
        d["name"]
        for d in query.column_descriptions
        if d.get("name") and isinstance(d.get("expr"), Label)
    ]


def _get_query_entity(expr):
    if isinstance(expr, InstrumentedAttribute):
        return expr.parent.class_
    if isinstance(expr, sa.Column):
        return expr.table
    if isinstance(expr, AliasedInsp):
        return expr.entity
    return expr


def _get_query_entities(query):
    entities = []
    seen = set()

    for d in query.column_descriptions:
        for key in ("entity", "expr"):
            value = d.get(key)
            if value is None:
                continue
            entity = _get_query_entity(value)
            ident = id(entity)
            if ident in seen:
                continue
            seen.add(ident)
            entities.append(entity)

    return entities


def _get_query_entity_by_alias(query, alias):
    entities = _get_query_entities(query)

    if not alias:
        return entities[0]

    for entity in entities:
        if isinstance(entity, sa.orm.util.AliasedClass):
            name = sa.inspect(entity).name
        else:
            name = _get_mapper(entity).tables[0].name

        if name == alias:
            return entity


def _get_all_descriptors(expr):
    if isinstance(expr, sa.sql.selectable.Selectable):
        return expr.c
    insp = sa.inspect(expr)
    try:
        polymorphic_mappers = _get_polymorphic_mappers(insp)
    except sa.exc.NoInspectionAvailable:
        return _get_mapper(expr).all_orm_descriptors
    attrs = dict(_get_mapper(expr).all_orm_descriptors)
    for submapper in polymorphic_mappers:
        for key, descriptor in submapper.all_orm_descriptors.items():
            if key not in attrs:
                attrs[key] = descriptor
    return attrs


def _get_descriptor(entity, attr):
    mapper = sa.inspect(entity)

    for key, descriptor in _get_all_descriptors(mapper).items():
        if attr == key:
            prop = descriptor.property if hasattr(descriptor, "property") else None
            if isinstance(prop, ColumnProperty):
                if isinstance(entity, sa.orm.util.AliasedClass):
                    for c in mapper.selectable.c:
                        if c.key == attr:
                            return c
                return getattr(prop.parent.class_, attr)
            if isinstance(entity, sa.orm.util.AliasedClass):
                return getattr(entity, attr)
            try:
                return getattr(mapper.class_, attr)
            except AttributeError:
                pass


def _get_query_descriptor(query, entity, attr):
    if attr in _query_labels(query):
        return attr
    entity = _get_query_entity_by_alias(query, entity)
    if entity:
        descriptor = _get_descriptor(entity, attr)
        if hasattr(descriptor, "property") and isinstance(
            descriptor.property, RelationshipProperty
        ):
            return None
        return descriptor


class QuerySorter(object):
    def __init__(self, silent=True, separator="-"):
        self.separator = separator
        self.silent = silent

    def assign_order_by(self, entity, attr, func):
        expr = _get_query_descriptor(self.query, entity, attr)

        if expr is not None:
            return self.query.order_by(func(expr))
        if not self.silent:
            raise QuerySorterException(
                "Could not sort query with expression '%s'" % attr
            )
        return self.query

    def parse_sort_arg(self, arg):
        if arg[0] == self.separator:
            func = desc
            arg = arg[1:]
        else:
            func = asc

        parts = arg.split(self.separator)
        return {
            "entity": parts[0] if len(parts) > 1 else None,
            "attr": parts[1] if len(parts) > 1 else arg,
            "func": func,
        }

    def __call__(self, query, *args):
        self.query = query

        for sort in args:
            if not sort:
                continue
            self.query = self.assign_order_by(**self.parse_sort_arg(sort))
        return self.query


def sort_query(query, *args, **kwargs):
    return QuerySorter(**kwargs)(query, *args)
