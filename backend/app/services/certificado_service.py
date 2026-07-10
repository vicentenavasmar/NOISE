"""
Service for generating and verifying degradation certificates.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from app.utils.hash import calcular_hash


def _campos_certificado(
    certificado_id: str,
    timestamp_creacion: str,
    obra: dict,
    transformaciones: list[dict],
    modo_testigo: bool,
    momento_detencion: Optional[str],
) -> dict:
    return {
        "certificado_id": certificado_id,
        "timestamp_creacion": timestamp_creacion,
        "obra": {
            "prompt_original": obra.get("prompt_original", ""),
            "texto_base": obra.get("texto_base", ""),
            "texto_final": obra.get("texto_final", ""),
        },
        "transformaciones": transformaciones,
        "modo_testigo": modo_testigo,
        "momento_detencion": momento_detencion,
    }


def crear_certificado(
    obra: dict,
    transformaciones: list[dict],
    modo_testigo: bool = False,
    momento_detencion: Optional[datetime] = None,
) -> dict:
    """
    Create a degradation certificate with an immutable SHA-256 hash.
    """
    certificado_id = str(uuid.uuid4())
    timestamp_creacion = datetime.now(timezone.utc).isoformat()
    momento_iso = momento_detencion.isoformat() if momento_detencion else None

    certificado_sin_hash = _campos_certificado(
        certificado_id=certificado_id,
        timestamp_creacion=timestamp_creacion,
        obra=obra,
        transformaciones=transformaciones,
        modo_testigo=modo_testigo,
        momento_detencion=momento_iso,
    )

    return {
        **certificado_sin_hash,
        "hash_sha256": calcular_hash(certificado_sin_hash),
    }


def verificar_certificado(certificado: dict) -> bool:
    """Verify integrity by recomputing the SHA-256 hash."""
    hash_almacenado = certificado.get("hash_sha256")
    if not hash_almacenado:
        return False

    certificado_sin_hash = {
        key: certificado[key]
        for key in (
            "certificado_id",
            "timestamp_creacion",
            "obra",
            "transformaciones",
            "modo_testigo",
            "momento_detencion",
        )
        if key in certificado
    }

    return calcular_hash(certificado_sin_hash) == hash_almacenado
