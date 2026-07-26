"""Formateur de logs JSON structurés, avec injection automatique du correlation_id
courant (§15 — logs structurés avec correlation_id).
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime

from core.correlation import id_correlation_courant

_CHAMPS_STANDARD = frozenset(
    logging.LogRecord(
        "",
        0,
        "",
        0,
        "",
        (),
        None,
    ).__dict__.keys()
)


class FormateurJSON(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        corps = {
            "horodatage": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "niveau": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": id_correlation_courant(),
        }
        if record.exc_info:
            corps["exception"] = self.formatException(record.exc_info)

        extra = {k: v for k, v in record.__dict__.items() if k not in _CHAMPS_STANDARD}
        corps.update(extra)
        return json.dumps(corps, ensure_ascii=False, default=str)
