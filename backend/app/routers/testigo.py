"""
Router for Witness Mode (Modo Testigo).

Generates a CUMULATIVE, progressive and open-ended story from the user's initial
sentence. Each version rewrites ALL previous sentences applying an increasing
degradation level and adds EXACTLY one new sentence at the end. Version N
contains N sentences.

- The "noise" (degradacion_actual) is the intensity level of the transformation.
- Integrity (derived on the frontend) indicates how faithful the story still is
  to the initial sentence.

This router deals with transport (HTTP/SSE), session state and orchestration of
the generation loop. All narrative logic (prompts, noise levels, mutation and
model calls) lives in `app.services.narrativa`.
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.obra import ModoObra, Obra
from app.models.certificado import Certificado as CertificadoModel
from app.services import narrativa
from app.services.certificado_service import crear_certificado

router = APIRouter()

_sesiones: dict[str, dict] = {}
_lock = asyncio.Lock()


class IniciarRequest(BaseModel):
    """Input schema to start a witness session."""
    prompt: str = ""
    contexto: str = ""
    velocidad: int = Field(default=3, ge=1, le=60)


class IniciarResponse(BaseModel):
    """Output schema when starting a session."""
    sesion_id: str
    estado: str


class EstadoResponse(BaseModel):
    """State schema of an active session."""
    fragmentos: list[str]
    degradacion_actual: int
    generando: bool = False
    fragmento_en_progreso: str = ""


class DetenerResponse(BaseModel):
    """Output schema when stopping a session."""
    obra_final: str
    certificado: dict


def _estado_sesion(sesion: dict) -> dict:
    return {
        "fragmentos": sesion["fragmentos"],
        "degradacion_actual": sesion["degradacion_actual"],
        "generando": sesion.get("generando", False),
        "fragmento_en_progreso": sesion.get("fragmento_en_progreso", ""),
    }


def _notificar_suscriptores(sesion: dict) -> None:
    evento = _estado_sesion(sesion)
    for cola in sesion.get("suscriptores", []):
        try:
            cola.put_nowait(evento)
        except asyncio.QueueFull:
            pass


# ─────────────────────────────────────────────────────────────────────────
# Witness mode orchestration loop
# ─────────────────────────────────────────────────────────────────────────

async def _tick_testigo(sesion_id: str):
    """
    Main loop of witness mode.

    Version 1: initial sentence, or a sentence generated from the context (not
    highlighted).
    Version N (N>1): rewrites the N-1 previous sentences according to the
    degradation level and adds a new sentence; the changes are highlighted with
    **bold**.
    """
    sesion = _sesiones.get(sesion_id)
    if not sesion:
        return

    es_primer_tick = True

    while sesion["estado"] == "activo":
        try:
            if not es_primer_tick:
                sesion["generando"] = False
                _notificar_suscriptores(sesion)
                await asyncio.sleep(sesion["velocidad"])
                if sesion["estado"] != "activo":
                    break
            es_primer_tick = False

            sesion["generando"] = True
            _notificar_suscriptores(sesion)

            version = sesion["version"] + 1

            # ── Version 1: initial sentence intact, or generated from theme ─
            if version == 1:
                prompt_txt = sesion.get("prompt", "").strip()
                contexto_txt = sesion.get("contexto", "").strip()

                if prompt_txt:
                    inicial = narrativa.normalizar_frase(prompt_txt)
                else:
                    # If the user did not provide a first sentence, the AI invents it:
                    inicial = await narrativa.generar_frase_inicial(contexto_txt)

                sesion["frases_plain"] = [inicial]
                sesion["fragmentos_originales"] = [inicial]
                sesion["fragmentos"] = [inicial]  # no bold in the first version
                sesion["version"] = 1
                sesion["degradacion_actual"] = 0
                sesion["generando"] = False
                _notificar_suscriptores(sesion)
                continue

            # ── Version N>1: rewrite everything + add one sentence ──────────
            prev_plain = list(sesion["frases_plain"])
            nivel = narrativa.nivel_ruido(version)

            try:
                nuevas = await narrativa.generar_version(
                    sesion.get("prompt", ""),
                    sesion.get("contexto", ""),
                    prev_plain,
                    version,
                    nivel
                )
            except Exception:
                nuevas = None

            if sesion["estado"] != "activo":
                break

            if not nuevas:
                # Guaranteed fallback: rewrite mutating previous sentences + add new sentence
                nuevas = await narrativa.generar_version_fallback(
                    sesion.get("prompt", ""),
                    sesion.get("contexto", ""),
                    prev_plain,
                    version,
                    nivel
                )

            if sesion["estado"] != "activo":
                break

            marcadas = []
            for i, frase in enumerate(nuevas):
                if i < len(prev_plain):
                    marcadas.append(narrativa.marcar_cambios(prev_plain[i], frase))
                else:
                    marcadas.append(frase)  # new sentence: not highlighted

            estado_pre = " ".join(prev_plain)
            estado_post = " ".join(nuevas)

            sesion["frases_plain"] = nuevas
            sesion["fragmentos_originales"] = nuevas
            sesion["fragmentos"] = marcadas
            sesion["version"] = version
            sesion["degradacion_actual"] = min(10, nivel)
            sesion["transformaciones"].append({
                "orden": len(sesion["transformaciones"]) + 1,
                "modulo": "DEGRADACION_NARRATIVA",
                "parametros": {"version": version, "nivel": nivel},
                "estado_pre": estado_pre,
                "estado_post": estado_post,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            _notificar_suscriptores(sesion)

            sesion["generando"] = False
            _notificar_suscriptores(sesion)

        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(1)


@router.post("/testigo/iniciar", response_model=IniciarResponse)
async def iniciar_testigo(request: IniciarRequest):
    """Start a Witness Mode session."""
    sesion_id = str(uuid.uuid4())

    prompt_val = (request.prompt or "").strip()
    contexto_val = (request.contexto or "").strip()
    if not contexto_val and prompt_val:
        contexto_val = prompt_val

    sesion = {
        "sesion_id": sesion_id,
        "prompt": prompt_val,
        "contexto": contexto_val,
        "velocidad": request.velocidad,
        "estado": "activo",
        "version": 0,
        "frases_plain": [],
        "fragmentos": [],
        "fragmentos_originales": [],
        "degradacion_actual": 0,
        "task": None,
        "transformaciones": [],
        "creado_en": datetime.now(timezone.utc),
        "generando": True,
        "fragmento_en_progreso": "",
        "suscriptores": [],
    }

    async with _lock:
        _sesiones[sesion_id] = sesion

    task = asyncio.create_task(_tick_testigo(sesion_id))
    sesion["task"] = task

    return IniciarResponse(sesion_id=sesion_id, estado="activo")


@router.get("/testigo/{sesion_id}", response_model=EstadoResponse)
async def estado_testigo(sesion_id: str):
    """Return the current state of a witness session."""
    async with _lock:
        sesion = _sesiones.get(sesion_id)

    if not sesion:
        raise HTTPException(status_code=404, detail="Session not found")

    return EstadoResponse(**_estado_sesion(sesion))


@router.get("/testigo/{sesion_id}/stream")
async def stream_testigo(sesion_id: str):
    """
    SSE stream of a witness session's state in real time.
    Replaces the frontend polling.
    """
    async with _lock:
        sesion = _sesiones.get(sesion_id)

    if not sesion:
        raise HTTPException(status_code=404, detail="Session not found")

    cola: asyncio.Queue = asyncio.Queue(maxsize=32)
    sesion["suscriptores"].append(cola)

    async def event_generator():
        try:
            yield f"data: {json.dumps(_estado_sesion(sesion), ensure_ascii=False)}\n\n"

            while sesion["estado"] == "activo" or not cola.empty():
                try:
                    estado = await asyncio.wait_for(cola.get(), timeout=30.0)
                    yield f"data: {json.dumps(estado, ensure_ascii=False)}\n\n"
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
        finally:
            if cola in sesion.get("suscriptores", []):
                sesion["suscriptores"].remove(cola)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/testigo/{sesion_id}/detener", response_model=DetenerResponse)
async def detener_testigo(sesion_id: str, db: Session = Depends(get_db)):
    """
    Stop a witness session IRREVERSIBLY.
    """
    async with _lock:
        sesion = _sesiones.get(sesion_id)

        if not sesion:
            raise HTTPException(status_code=404, detail="Session not found")

        if sesion["estado"] == "cerrado":
            raise HTTPException(
                status_code=409,
                detail="The session is already closed. Witness Mode is irreversible: "
                "once stopped, the session cannot be reopened, undone or regenerated.",
            )

        sesion["estado"] = "cerrado"
        momento_detencion = datetime.now(timezone.utc)
        _notificar_suscriptores(sesion)

    if sesion.get("task") and not sesion["task"].done():
        try:
            await asyncio.wait_for(asyncio.shield(sesion["task"]), timeout=3.0)
        except asyncio.TimeoutError:
            sesion["task"].cancel()
            try:
                await sesion["task"]
            except (asyncio.CancelledError, Exception):
                pass
        except (asyncio.CancelledError, Exception):
            pass

    # Final work: plain text of the last version (without bold marks).
    # texto_base: the faithful initial story (starting sentence).
    obra_final = " ".join(sesion["fragmentos_originales"])
    texto_base = narrativa.normalizar_frase(sesion["prompt"]) if sesion["prompt"] else ""

    obra_db = Obra(
        prompt_original=sesion["prompt"],
        texto_base=texto_base,
        texto_final=obra_final,
        modo=ModoObra.TESTIGO,
        creado_en=sesion["creado_en"],
    )
    db.add(obra_db)
    db.flush()

    certificado = crear_certificado(
        obra={
            "prompt_original": sesion["prompt"],
            "texto_base": texto_base,
            "texto_final": obra_final,
        },
        transformaciones=sesion["transformaciones"],
        modo_testigo=True,
        momento_detencion=momento_detencion,
    )

    certificado_db = CertificadoModel(
        id=certificado["certificado_id"],
        obra_id=obra_db.id,
        hash_sha256=certificado["hash_sha256"],
        transformaciones=json.dumps(sesion["transformaciones"], ensure_ascii=False),
        momento_detencion=momento_detencion,
    )
    db.add(certificado_db)
    db.commit()

    # Release heavy resources; keep a minimal snapshot for GET queries
    sesion["task"] = None
    sesion["suscriptores"] = []
    sesion["fragmento_en_progreso"] = ""
    sesion["generando"] = False
    sesion["fragmentos_originales"] = []
    sesion["frases_plain"] = []
    sesion["transformaciones"] = []
    sesion["prompt"] = ""

    return DetenerResponse(
        obra_final=obra_final,
        certificado=certificado,
    )
