from __future__ import annotations

from urllib.parse import quote_plus

from sqlalchemy import Boolean, Column, Date, Float, Integer, MetaData, String, Table, create_engine, inspect
from sqlalchemy.engine import Engine

from app.models import DBColumnInfo, DBTableInfo, TableSchema, normalize_schema_type


def build_database_url(db_type: str, host: str, port: int, user: str, password: str, dbname: str) -> str:
    if db_type == "postgresql+psycopg":
        return (
            f"postgresql+psycopg://{quote_plus(user)}:{quote_plus(password)}"
            f"@{host}:{port}/{quote_plus(dbname)}"
        )
    if db_type == "mysql+pymysql":
        return (
            f"mysql+pymysql://{quote_plus(user)}:{quote_plus(password)}"
            f"@{host}:{port}/{quote_plus(dbname)}"
        )
    raise ValueError(f"Unsupported database type: {db_type}")


def create_db_engine(url: str) -> Engine:
    return create_engine(url, pool_pre_ping=True, future=True)


def _get_schema_name(engine: Engine) -> str | None:
    inspector = inspect(engine)
    if engine.dialect.name == "postgresql":
        return "public"
    return inspector.default_schema_name


def _to_sqlalchemy_type(schema_type: str):
    normalized = normalize_schema_type(schema_type)
    if normalized == "text":
        return String()
    if normalized == "int":
        return Integer()
    if normalized == "float":
        return Float()
    if normalized == "date":
        return Date()
    if normalized == "boolean":
        return Boolean()
    raise ValueError(f"Unsupported schema type: {schema_type}")


def introspect_tables(engine: Engine) -> list[DBTableInfo]:
    inspector = inspect(engine)
    schema = _get_schema_name(engine)
    output: list[DBTableInfo] = []

    for table_name in inspector.get_table_names(schema=schema):
        columns = [
            DBColumnInfo(name=column["name"], type=str(column["type"]))
            for column in inspector.get_columns(table_name, schema=schema)
        ]
        output.append(DBTableInfo(name=table_name, columns=columns))

    return output


def create_table_from_schema(engine: Engine, schema_definition: TableSchema) -> DBTableInfo:
    metadata = MetaData()
    schema = _get_schema_name(engine)
    inspector = inspect(engine)

    if inspector.has_table(schema_definition.table, schema=schema):
        raise ValueError(f"Table '{schema_definition.table}' already exists")

    table = Table(
        schema_definition.table,
        metadata,
        *[
            Column(column.name, _to_sqlalchemy_type(column.type), nullable=True)
            for column in schema_definition.columns
        ],
        schema=schema,
    )
    metadata.create_all(engine, tables=[table])

    return DBTableInfo(
        name=schema_definition.table,
        columns=[
            DBColumnInfo(name=column.name, type=str(column.type))
            for column in schema_definition.columns
        ],
    )

