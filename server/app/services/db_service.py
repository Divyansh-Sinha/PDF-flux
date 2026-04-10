from __future__ import annotations

from urllib.parse import quote_plus

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.models import DBTableInfo


def build_postgres_url(host: str, port: int, user: str, password: str, dbname: str) -> str:
    return (
        f"postgresql+psycopg://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:{port}/{quote_plus(dbname)}"
    )


def create_db_engine(url: str) -> Engine:
    return create_engine(url, pool_pre_ping=True, future=True)


def introspect_public_tables(engine: Engine) -> list[DBTableInfo]:
    tables_sql = text(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
        """
    )
    columns_sql = text(
        """
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = :table_name
        ORDER BY ordinal_position;
        """
    )

    output: list[DBTableInfo] = []
    with engine.connect() as conn:
        table_names = [row[0] for row in conn.execute(tables_sql).fetchall()]
        for table_name in table_names:
            columns = [
                {"name": row[0], "type": row[1]}
                for row in conn.execute(columns_sql, {"table_name": table_name}).fetchall()
            ]
            output.append(DBTableInfo(name=table_name, columns=columns))

    return output

