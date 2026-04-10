from __future__ import annotations

import hashlib
import json
from typing import Any


def deduplicate_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []

    for row in rows:
        normalized = json.dumps(row, sort_keys=True, default=str)
        fingerprint = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        unique.append(row)

    return unique

