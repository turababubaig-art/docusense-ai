from __future__ import annotations

import hashlib
import mimetypes
import re
import uuid
from pathlib import Path
from typing import BinaryIO

from fastapi import HTTPException, UploadFile

from config import Settings

MAGIC = {
    ".pdf": (b"%PDF-",),
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
    ".webp": (b"RIFF",),
}


def safe_filename(filename: str | None) -> str:
    original = Path(filename or "document").name
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", original).strip("._")
    return cleaned[:180] or "document"


def secure_document_id(filename: str) -> str:
    stem = re.sub(r"[^a-z0-9]+", "-", Path(filename).stem.lower()).strip("-") or "document"
    return f"{stem}-{uuid.uuid4().hex[:12]}"


def sha256_file(path: Path, block_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while block := handle.read(block_size):
            digest.update(block)
    return digest.hexdigest()


def validate_magic(path: Path, extension: str) -> bool:
    signatures = MAGIC.get(extension)
    if not signatures:
        return True
    with path.open("rb") as handle:
        header = handle.read(16)
    return any(header.startswith(signature) for signature in signatures)

async def save_upload(file: UploadFile, settings: Settings) -> tuple[Path, str, int, str, str, str]:
    filename = safe_filename(file.filename)
    extension = Path(filename).suffix.lower()
    if extension not in settings.extension_set:
        raise HTTPException(415, f"Unsupported file type '{extension or 'unknown'}'.")
    document_id = secure_document_id(filename)
    destination = settings.upload_dir / f"{document_id}{extension}"
    total = 0
    try:
        with destination.open("wb") as output:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > settings.max_file_size:
                    raise HTTPException(413, f"File exceeds the {settings.max_file_size_mb} MB maximum upload size.")
                output.write(chunk)
    except HTTPException:
        destination.unlink(missing_ok=True)
        raise
    except Exception:
        destination.unlink(missing_ok=True)
        raise HTTPException(500, "Could not persist the uploaded file.")
    finally:
        await file.close()
    if total == 0:
        destination.unlink(missing_ok=True)
        raise HTTPException(400, "The uploaded file is empty.")
    if not validate_magic(destination, extension):
        destination.unlink(missing_ok=True)
        raise HTTPException(400, "The uploaded file signature does not match its extension.")
    digest = sha256_file(destination)
    mime = file.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    return destination, filename, total, digest, mime, document_id
