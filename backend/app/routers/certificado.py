"""
Router for degradation certificates.
POST /api/certificado/verificar
"""

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.certificado_service import verificar_certificado

router = APIRouter()


class VerificarRequest(BaseModel):
    """Input schema to verify a certificate."""
    certificado: dict


class VerificarResponse(BaseModel):
    """Output schema for verification."""
    valido: bool
    mensaje: str


@router.post("/certificado/verificar", response_model=VerificarResponse)
async def verificar(request: VerificarRequest):
    """
    Verify the integrity of a certificate by recomputing its hash.
    """
    es_valido = verificar_certificado(request.certificado)

    return VerificarResponse(
        valido=es_valido,
        mensaje="Certificate intact" if es_valido else "Certificate altered: the hash does not match",
    )
