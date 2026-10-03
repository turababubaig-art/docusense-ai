from __future__ import annotations
import logging
import uuid
from contextvars import ContextVar

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True

def configure_logging(level: str = "INFO") -> None:
    root = logging.getLogger()
    root.setLevel(level.upper())
    if not root.handlers:
        handler = logging.StreamHandler()
        handler.addFilter(RequestIdFilter())
        handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | request=%(request_id)s | %(message)s"))
        root.addHandler(handler)

def new_request_id() -> str:
    return uuid.uuid4().hex
