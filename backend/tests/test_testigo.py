"""
Unit tests for Witness Mode.
Verifies the irreversibility rule: calling /detener twice must fail.
"""

import json
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def limpiar_sesiones():
    """Clear sessions before each test."""
    from app.routers.testigo import _sesiones
    _sesiones.clear()
    yield
    _sesiones.clear()


@pytest.fixture
def mock_granite():
    """Mock of generar_texto to avoid real calls to Ollama."""
    with patch("app.services.narrativa.generar_texto", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = {
            "texto": json.dumps({
                "frases": ["The first sentence rewritten.", "A new sentence at the end."]
            }),
            "tokens_usados": 20,
        }
        yield mock_gen


def test_iniciar_sesion(mock_granite):
    """Starting a witness session must return sesion_id and active state."""
    response = client.post(
        "/api/testigo/iniciar",
        json={"prompt": "A tale about the sea", "velocidad": 3},
    )

    assert response.status_code == 200
    data = response.json()
    assert "sesion_id" in data
    assert data["estado"] == "activo"


def test_estado_sesion(mock_granite):
    """Query the state of an active session."""
    resp = client.post(
        "/api/testigo/iniciar",
        json={"prompt": "A tale", "velocidad": 60},
    )
    sesion_id = resp.json()["sesion_id"]

    response = client.get(f"/api/testigo/{sesion_id}")
    assert response.status_code == 200
    data = response.json()
    assert "fragmentos" in data
    assert "degradacion_actual" in data
    assert isinstance(data["fragmentos"], list)


def test_sesion_no_encontrada():
    """Querying a nonexistent session must return 404."""
    response = client.get("/api/testigo/sesion-inexistente")
    assert response.status_code == 404


def test_detener_sesion(mock_granite):
    """Stopping an active session must return obra_final and certificado."""
    resp = client.post(
        "/api/testigo/iniciar",
        json={"prompt": "A tale about the sea", "velocidad": 60},
    )
    sesion_id = resp.json()["sesion_id"]

    response = client.post(f"/api/testigo/{sesion_id}/detener")
    assert response.status_code == 200
    data = response.json()

    assert "obra_final" in data
    assert "certificado" in data
    assert "hash_sha256" in data["certificado"]
    assert "certificado_id" in data["certificado"]
    assert data["certificado"]["modo_testigo"] is True


def test_detener_dos_veces_falla(mock_granite):
    """Calling /detener twice must fail the second time."""
    resp = client.post(
        "/api/testigo/iniciar",
        json={"prompt": "A tale", "velocidad": 60},
    )
    sesion_id = resp.json()["sesion_id"]

    response1 = client.post(f"/api/testigo/{sesion_id}/detener")
    assert response1.status_code == 200

    response2 = client.post(f"/api/testigo/{sesion_id}/detener")
    assert response2.status_code == 409
    assert "closed" in response2.json()["detail"].lower()


def test_detener_sesion_inexistente():
    """Stopping a nonexistent session must return 404."""
    response = client.post("/api/testigo/sesion-inexistente/detener")
    assert response.status_code == 404


def test_estado_despues_de_detener(mock_granite):
    """The state of a closed session can be queried (but not reopened)."""
    resp = client.post(
        "/api/testigo/iniciar",
        json={"prompt": "A tale", "velocidad": 60},
    )
    sesion_id = resp.json()["sesion_id"]
    client.post(f"/api/testigo/{sesion_id}/detener")

    response = client.get(f"/api/testigo/{sesion_id}")
    assert response.status_code == 200


def test_velocidad_default(mock_granite):
    """If velocidad is not specified, it must default to 3."""
    response = client.post(
        "/api/testigo/iniciar",
        json={"prompt": "A tale"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["estado"] == "activo"

    from app.routers.testigo import _sesiones
    sesion = _sesiones[data["sesion_id"]]
    assert sesion["velocidad"] == 3


def test_stream_sesion(mock_granite):
    """The witness SSE endpoint must respond with event-stream."""
    resp = client.post(
        "/api/testigo/iniciar",
        json={"prompt": "A tale", "velocidad": 60},
    )
    sesion_id = resp.json()["sesion_id"]

    response = client.get(f"/api/testigo/{sesion_id}/stream")
    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")


def test_detener_preserva_fragmentos_generados(mock_granite):
    """obra_final must not be empty if the session generated fragments."""
    from app.routers.testigo import _sesiones

    resp = client.post(
        "/api/testigo/iniciar",
        json={"prompt": "A tale about the sea", "velocidad": 60},
    )
    sesion_id = resp.json()["sesion_id"]

    sesion = _sesiones[sesion_id]
    sesion["fragmentos"] = [
        "The sea stretched infinite before their eyes.",
        "The waves crashed against the rocks with fury.",
    ]
    sesion["fragmentos_originales"] = [
        "The sea stretched infinite before their eyes.",
        "The waves crashed against the rocks with fury.",
    ]
    sesion["degradacion_actual"] = 2
    sesion["transformaciones"] = [
        {
            "orden": 1,
            "modulo": "OXIDACION",
            "parametros": {"nivel": 1, "fragmento_idx": 0},
            "estado_pre": "The sea stretched infinite before their eyes.",
            "estado_post": "The sea stretched infinite before their eyes.",
            "timestamp": "2025-01-01T00:00:00+00:00",
        }
    ]

    response = client.post(f"/api/testigo/{sesion_id}/detener")
    assert response.status_code == 200
    data = response.json()

    assert data["obra_final"] != ""
    assert "The sea" in data["obra_final"]
    assert "The waves" in data["obra_final"]

    cert = data["certificado"]
    assert cert["obra"]["texto_base"] != ""
    assert cert["obra"]["texto_final"] != ""
    assert cert["obra"]["texto_final"] == data["obra_final"]
    assert len(cert["transformaciones"]) == 1
    assert cert["transformaciones"][0]["modulo"] == "OXIDACION"


@pytest.mark.anyio
async def test_detener_timeout_wait_for():
    """
    If Ollama takes too long, /detener must resolve in < 4s
    and return the accumulated fragments.
    """
    import asyncio
    import time
    import httpx
    from app.routers.testigo import _sesiones

    async def mock_generar_lento(*args, **kwargs):
        await asyncio.sleep(10)
        return {"texto": '{"frases": []}', "tokens_usados": 5}

    with patch("app.services.narrativa.generar_texto", side_effect=mock_generar_lento):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post(
                "/api/testigo/iniciar",
                json={"prompt": "A story about ships", "velocidad": 60},
            )
            assert resp.status_code == 200
            sesion_id = resp.json()["sesion_id"]

            await asyncio.sleep(0.1)

            sesion = _sesiones[sesion_id]
            sesion["fragmentos"] = ["The ship set sail.", "The wind was blowing."]
            sesion["fragmentos_originales"] = ["The ship set sail.", "The wind was blowing."]

            start_time = time.time()
            resp_detener = await ac.post(f"/api/testigo/{sesion_id}/detener")
            duration = time.time() - start_time

            assert duration < 4.0, f"detener took {duration}s, expected < 4.0s"
            assert resp_detener.status_code == 200

            data = resp_detener.json()
            assert "The ship set sail. The wind was blowing." in data["obra_final"]
            assert data["certificado"]["modo_testigo"] is True


def test_iniciar_solo_contexto(mock_granite):
    """Start a session with context only (no initial sentence)."""
    response = client.post(
        "/api/testigo/iniciar",
        json={"contexto": "A story in space", "velocidad": 10},
    )

    assert response.status_code == 200
    data = response.json()
    assert "sesion_id" in data
    assert data["estado"] == "activo"

    from app.routers.testigo import _sesiones
    sesion = _sesiones[data["sesion_id"]]
    assert sesion["prompt"] == ""
    assert sesion["contexto"] == "A story in space"


def test_iniciar_prompt_y_contexto(mock_granite):
    """Start a session with an optional initial sentence and a required context."""
    response = client.post(
        "/api/testigo/iniciar",
        json={
            "prompt": "Once upon a time there was a lonely lighthouse.",
            "contexto": "Ghost ships sailing in the mist",
            "velocidad": 15
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "sesion_id" in data

    from app.routers.testigo import _sesiones
    sesion = _sesiones[data["sesion_id"]]
    assert sesion["prompt"] == "Once upon a time there was a lonely lighthouse."
    assert sesion["contexto"] == "Ghost ships sailing in the mist"
