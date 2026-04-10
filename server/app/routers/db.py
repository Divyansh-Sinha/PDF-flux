from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException

from app.models import DBConnectRequest, DBConnectResponse
from app.services.db_service import build_postgres_url, create_db_engine, introspect_public_tables
from app.state import DBConnectionConfig, db_connections

router = APIRouter(prefix="/api/db", tags=["db"])


@router.post("/connect", response_model=DBConnectResponse)
def connect_db(payload: DBConnectRequest) -> DBConnectResponse:
    connection_id = str(uuid.uuid4())
    db_url = build_postgres_url(
        host=payload.host,
        port=payload.port,
        user=payload.user,
        password=payload.password,
        dbname=payload.dbname,
    )

    try:
        engine = create_db_engine(db_url)
        tables = introspect_public_tables(engine)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Database connection failed: {exc}") from exc
    finally:
        try:
            engine.dispose()  # type: ignore[name-defined]
        except Exception:
            pass

    db_connections[connection_id] = DBConnectionConfig(connection_id=connection_id, url=db_url)

    return DBConnectResponse(success=True, connectionId=connection_id, tables=tables)

