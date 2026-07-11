"""
Unit tests for the generation and hash verification of certificates.
"""

import copy

import pytest

from app.services.certificado_service import crear_certificado, verificar_certificado


@pytest.fixture
def obra_ejemplo():
    """Example work for tests."""
    return {
        "prompt_original": "Write a poem about the rain",
        "texto_base": "The rain falls over the sleeping city, wetting the empty sidewalks.",
        "texto_final": "The [...] falls over the [...] sleeping, wetting the [...] empty.",
    }


@pytest.fixture
def transformaciones_ejemplo():
    """Example transformations."""
    return [
        {
            "orden": 1,
            "modulo": "OXIDACION",
            "parametros": {"nivel": 7},
            "estado_pre": "The rain falls over the sleeping city, wetting the empty sidewalks.",
            "estado_post": "The [...] falls over the [...] sleeping, wetting the [...] empty.",
            "timestamp": "2025-01-01T00:00:00+00:00",
        }
    ]


def test_crear_certificado_estructura(obra_ejemplo, transformaciones_ejemplo):
    """Verify that the certificate has all required fields."""
    cert = crear_certificado(
        obra=obra_ejemplo,
        transformaciones=transformaciones_ejemplo,
        modo_testigo=False,
        momento_detencion=None,
    )

    assert "certificado_id" in cert
    assert "timestamp_creacion" in cert
    assert "hash_sha256" in cert
    assert "obra" in cert
    assert "transformaciones" in cert
    assert "modo_testigo" in cert
    assert "momento_detencion" in cert

    # Verify the contents of the work
    assert cert["obra"]["prompt_original"] == obra_ejemplo["prompt_original"]
    assert cert["obra"]["texto_base"] == obra_ejemplo["texto_base"]
    assert cert["obra"]["texto_final"] == obra_ejemplo["texto_final"]

    # Verify the hash is not empty
    assert len(cert["hash_sha256"]) == 64  # SHA-256 hex = 64 chars


def test_verificar_certificado_integro(obra_ejemplo, transformaciones_ejemplo):
    """An unaltered certificate must verify as intact."""
    cert = crear_certificado(
        obra=obra_ejemplo,
        transformaciones=transformaciones_ejemplo,
    )

    assert verificar_certificado(cert) is True


def test_verificar_certificado_alterado_texto(obra_ejemplo, transformaciones_ejemplo):
    """If the final text is altered, the hash must not match."""
    cert = crear_certificado(
        obra=obra_ejemplo,
        transformaciones=transformaciones_ejemplo,
    )

    # Alter a field
    cert_alterado = copy.deepcopy(cert)
    cert_alterado["obra"]["texto_final"] = "Completely different text"

    assert verificar_certificado(cert_alterado) is False


def test_verificar_certificado_alterado_transformaciones(
    obra_ejemplo, transformaciones_ejemplo
):
    """If the transformations are altered, the hash must not match."""
    cert = crear_certificado(
        obra=obra_ejemplo,
        transformaciones=transformaciones_ejemplo,
    )

    cert_alterado = copy.deepcopy(cert)
    cert_alterado["transformaciones"][0]["parametros"]["nivel"] = 1

    assert verificar_certificado(cert_alterado) is False


def test_verificar_certificado_sin_hash():
    """A certificate without a hash must verify as invalid."""
    cert = {"obra": {}, "transformaciones": []}
    assert verificar_certificado(cert) is False


def test_verificar_certificado_hash_manipulado(obra_ejemplo, transformaciones_ejemplo):
    """If the hash is changed directly, verification must fail."""
    cert = crear_certificado(
        obra=obra_ejemplo,
        transformaciones=transformaciones_ejemplo,
    )

    cert_alterado = copy.deepcopy(cert)
    cert_alterado["hash_sha256"] = "a" * 64  # fake hash

    assert verificar_certificado(cert_alterado) is False


def test_certificados_distintos_tienen_hashes_distintos(obra_ejemplo):
    """Two certificates with different transformations must have different hashes."""
    cert1 = crear_certificado(
        obra=obra_ejemplo,
        transformaciones=[{"orden": 1, "modulo": "OXIDACION", "parametros": {"nivel": 3}}],
    )

    cert2 = crear_certificado(
        obra=obra_ejemplo,
        transformaciones=[{"orden": 1, "modulo": "OXIDACION", "parametros": {"nivel": 9}}],
    )

    assert cert1["hash_sha256"] != cert2["hash_sha256"]


def test_certificado_modo_testigo(obra_ejemplo, transformaciones_ejemplo):
    """A certificate in witness mode must have modo_testigo=True."""
    from datetime import datetime, timezone

    momento = datetime.now(timezone.utc)

    cert = crear_certificado(
        obra=obra_ejemplo,
        transformaciones=transformaciones_ejemplo,
        modo_testigo=True,
        momento_detencion=momento,
    )

    assert cert["modo_testigo"] is True
    assert cert["momento_detencion"] is not None
    assert verificar_certificado(cert) is True
