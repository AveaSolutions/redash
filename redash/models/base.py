import functools

from flask_sqlalchemy import SQLAlchemy
from flask_sqlalchemy.query import Query
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import object_session
from sqlalchemy.sql.sqltypes import INTEGER
from sqlalchemy_searchable import SearchQueryMixin, vectorizer

from redash import settings

db = SQLAlchemy(session_options={"expire_on_commit": False})


class _LegacyEntityZero(object):
    def __init__(self, model_class):
        self.class_ = model_class


class _LegacyQueryEntity(object):
    def __init__(self, model_class):
        self.entity_zero = _LegacyEntityZero(model_class)


class SearchBaseQuery(Query, SearchQueryMixin):
    """
    The SQA query class to use when full text search is wanted.
    """

    @property
    def _entities(self):
        # SQLAlchemy-Searchable 0.10.6 expects the legacy Query._entities API
        # removed in Flask-SQLAlchemy 3 / SQLAlchemy 1.4.
        entities = []
        for description in self.column_descriptions:
            entity = description.get("entity")
            if entity is not None:
                entities.append(_LegacyQueryEntity(entity))
        if not entities:
            expr = self.column_descriptions[0].get("expr")
            if expr is not None:
                entities.append(_LegacyQueryEntity(expr))
        return entities


def _integer_vectorizer(column):
    return db.func.cast(column, db.Text)


vectorizer(db.Integer)(_integer_vectorizer)
vectorizer(INTEGER)(_integer_vectorizer)


@vectorizer(postgresql.UUID)
def uuid_vectorizer(column):
    return db.func.cast(column, db.Text)


Column = functools.partial(db.Column, nullable=False)

# AccessPermission and Change use a 'generic foreign key' approach to refer to
# either queries or dashboards.
# TODO replace this with association tables.
_gfk_types = {}


def gfk_type(cls):
    _gfk_types[cls.__tablename__] = cls
    return cls


class GFKBase(object):
    """
    Compatibility with 'generic foreign key' approach Peewee used.
    """

    object_type = Column(db.String(255))
    object_id = Column(db.Integer)

    _object = None

    @property
    def object(self):
        session = object_session(self)
        if self._object or not session:
            return self._object
        else:
            object_class = _gfk_types[self.object_type]
            self._object = (
                session.query(object_class)
                .filter(object_class.id == self.object_id)
                .first()
            )
            return self._object

    @object.setter
    def object(self, value):
        self._object = value
        self.object_type = value.__class__.__tablename__
        self.object_id = value.id


key_definitions = settings.dynamic_settings.database_key_definitions((db.Integer, {}))


def key_type(name):
    return key_definitions[name][0]


def primary_key(name):
    key_type, kwargs = key_definitions[name]
    return Column(key_type, primary_key=True, **kwargs)
