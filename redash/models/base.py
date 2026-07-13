import functools

from flask_sqlalchemy import SQLAlchemy
from flask_sqlalchemy.query import Query
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import object_session
from sqlalchemy_searchable import SearchQueryMixin, vectorizer

from redash import settings

db = SQLAlchemy(session_options={"expire_on_commit": False})


class SearchBaseQuery(Query, SearchQueryMixin):
    """
    The SQA query class to use when full text search is wanted.
    """


@vectorizer(db.Integer)
def integer_vectorizer(column):
    return db.func.cast(column, db.Text)


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
