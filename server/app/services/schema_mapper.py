from __future__ import annotations

from typing import Any

from app.models import RowWarning, TableSchema, coerce_value


def coerce_row_to_schema(row: dict[str, Any], schema: TableSchema, row_index: int) -> tuple[dict[str, Any], RowWarning | None]:
    coerced: dict[str, Any] = {}
    nulls = 0
    total = len(schema.columns)

    for col in schema.columns:
        value = row.get(col.name)
        if value is None:
            coerced[col.name] = None
            nulls += 1
            continue

        try:
            coerced[col.name] = coerce_value(value, col.type)
        except Exception:
            coerced[col.name] = None
            nulls += 1

    warning = None
    if total > 0 and (nulls / total) > 0.5:
        warning = RowWarning(index=row_index, reason="More than 50% fields are null or invalid")

    return coerced, warning


def coerce_rows(rows: list[dict[str, Any]], schema: TableSchema) -> tuple[list[dict[str, Any]], list[RowWarning]]:
    output: list[dict[str, Any]] = []
    warnings: list[RowWarning] = []

    for i, row in enumerate(rows):
        coerced, warning = coerce_row_to_schema(row, schema, i)
        output.append(coerced)
        if warning:
            warnings.append(warning)

    return output, warnings

