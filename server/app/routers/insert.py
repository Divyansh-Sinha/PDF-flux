from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import MetaData, Table
import uuid

from app.models import InsertError, InsertRequest, InsertResponse
from app.services.db_service import create_db_engine
from app.state import db_connections

router = APIRouter(prefix="/api", tags=["insert"])


@router.post("/insert", response_model=InsertResponse)
def insert_rows(payload: InsertRequest) -> InsertResponse:
    if payload.mode != "insert":
        raise HTTPException(status_code=400, detail="Phase 1 supports mode='insert' only")

    conn = db_connections.get(payload.connectionId)
    if conn is None:
        raise HTTPException(status_code=404, detail="connectionId not found")

    if not payload.rows:
        return InsertResponse(inserted=0, failed=0, errors=[])

    engine = create_db_engine(conn.url)
    metadata = MetaData()
    schema = "public" if conn.db_type == "postgresql+psycopg" else None

    try:
        table = Table(payload.table, metadata, autoload_with=engine, schema=schema)
    except Exception as exc:
        engine.dispose()
        raise HTTPException(status_code=400, detail=f"Unable to load table '{payload.table}': {exc}") from exc

    errors: list[InsertError] = []
    inserted = 0

    try:
        with engine.begin() as connection:
            for idx, row in enumerate(payload.rows):
                filtered_row = {key: row.get(key) for key in table.columns.keys() if key in row}
                
                # Inject UUID for 'id' column if missing but required by table schema
                if 'id' in table.columns.keys() and 'id' not in filtered_row:
                    col_type = str(table.columns['id'].type).lower()
                    if 'uuid' in col_type or 'char' in col_type or 'text' in col_type:
                        filtered_row['id'] = str(uuid.uuid4())
                        
                try:
                    connection.execute(table.insert().values(**filtered_row))
                    inserted += 1
                except Exception as row_exc:
                    # Any row failure aborts the transaction in Phase 1.
                    errors.append(InsertError(index=idx, error=str(row_exc)))
                    raise
    except Exception:
        engine.dispose()
        return InsertResponse(inserted=0, failed=len(payload.rows), errors=errors)

    engine.dispose()
    return InsertResponse(inserted=inserted, failed=0, errors=[])

