"""
Narrative engine for Witness Mode (Modo Testigo).

Holds the logic that generates the CUMULATIVE story: prompt building, NOISE
levels, sentence mutation, change highlighting via diff, and the model calls
that produce each version.

This module knows nothing about HTTP or session state: it receives plain data
and returns sentences. Orchestration (the tick loop, sessions, SSE) lives in the
`app.routers.testigo` router.
"""

import difflib

from app.services.granite_client import generar_texto
from app.utils.json_extractor import extraer_json


SYSTEM_PROMPT_TESTIGO = """You are a narrative engine that builds a CUMULATIVE, progressive and open-ended story from a THEME.

The THEME is the main narrative reference. The NOISE level indicates the intensity of the narrative degradation.

Strict rules:
- Version N contains EXACTLY N sentences.
- MANDATORY RULE: You MUST REWRITE the previous sentences (changing words, adjectives, verbs or nouns in each of the previous sentences) AND add EXACTLY ONE new sentence at the end (never add any mark or text to the fragments indicating what you changed or included; for example, avoid marking with asterisks, or writing "new sentence" or "altered").
- NEVER return the previous sentences unchanged. They MUST ALWAYS mutate or change words of the previous sentences in each version.
- The NOISE controls two things at once: how far the new sentence drifts from the THEME and how much the old sentences are modified when rewritten.
- The HIGHER the noise: the further the story drifts from the theme; the more characters, places, objects, actions, era, tone and goal change; the lower the fidelity to the theme. The modifications must affect the WHOLE story, not just the last sentence.
- The LOWER the noise: the new sentence stays closely tied to the theme and the previous sentences are modified with subtle but visible changes (adjectives, verbs, nuances); characters, places and conflicts remain recognizable.
- Degradation is ALWAYS gradual and coherent with the immediately previous version, even with high noise. Never make random, incoherent or abrupt changes between one version and the next.
- Respond ONLY in valid JSON, in English, without markdown and WITHOUT bold:
{"frases": ["sentence 1 rewritten with changes", "sentence 2 rewritten with changes", ..., "new sentence N"]}
The list must contain exactly N sentences, in order, the last one being the new sentence."""


# ─────────────────────────────────────────────────────────────────────────
# Text helpers
# ─────────────────────────────────────────────────────────────────────────

def normalizar_frase(texto: str) -> str:
    """Collapse whitespace and ensure a final punctuation mark."""
    t = " ".join(texto.strip().split())
    if t and t[-1] not in ".!?…":
        t += "."
    return t


def _sin_negrita(texto: str) -> str:
    return texto.replace("**", "")


def nivel_ruido(version: int) -> int:
    """
    NOISE level (0-10). Each new sentence raises the noise: the story degrades
    progressively away from the theme as the version number grows.
    """
    if version <= 1:
        return 0
    return min(10, version - 1)


def _guia_ruido(nivel: int) -> str:
    """Interpret the NOISE level (0-10) as degradation intensity."""
    if nivel <= 1:
        return (
            "Very low noise: keep the theme, characters, setting and original meaning almost "
            "entirely intact. Change only small details."
        )
    if nivel <= 3:
        return (
            "Low noise: introduce slight variations in adjectives, goals, objects or settings "
            "close to the theme. Characters, places and conflicts remain recognizable."
        )
    if nivel <= 6:
        return (
            "Medium noise: notably transform characters, places, actions and conflicts. "
            "The story starts to clearly drift away from the theme, though it still keeps some "
            "recognizable relation to it."
        )
    if nivel <= 8:
        return (
            "High noise: strongly pull the story away from the theme. Characters, places, era, tone "
            "and goal are deeply transformed in each version, mutating toward fantastical, strange, "
            "futuristic or symbolic equivalents. Almost nothing of the original theme should remain "
            "intact; the relation to the theme is left as barely a distant echo."
        )
    return (
        "Extreme noise: the story must drift DRASTICALLY away from the initial theme until it becomes "
        "almost unrecognizable. Characters, place, era, genre and goal may be completely different from "
        "the originals. Rewrite each old sentence with intense, cumulative transformations, so that the "
        "final version barely keeps any trace of the starting point. The only constraint is that each "
        "version evolves logically from the immediately previous one: the change is huge overall, but "
        "coherent step by step."
    )


def marcar_cambios(previa: str, nueva: str) -> str:
    """
    Highlight with **bold** only the fragments of `nueva` that differ from `previa`
    (word-by-word diff). Unchanged words are left unmarked.
    """
    tokens_prev = previa.split()
    tokens_new = nueva.split()
    sm = difflib.SequenceMatcher(None, tokens_prev, tokens_new)
    salida: list[str] = []
    for tag, _i1, _i2, j1, j2 in sm.get_opcodes():
        seg = tokens_new[j1:j2]
        if not seg:
            continue  # deletions: not marked
        if tag == "equal":
            salida.extend(seg)
        else:  # replace | insert
            salida.append("**" + " ".join(seg) + "**")
    return " ".join(salida)


REEMPLAZOS_MUTACION = [
    ("sea", "ocean"), ("sky", "firmament"), ("darkness", "gloom"),
    ("light", "radiance"), ("path", "trail"), ("silence", "stillness"),
    ("time", "abyss"), ("house", "refuge"), ("story", "chronicle"),
    ("wind", "whisper"), ("shadow", "specter"), ("man", "traveler"),
    ("woman", "figure"), ("city", "metropolis"), ("night", "nightfall"),
    ("sun", "star"), ("fire", "blaze"), ("water", "fluid"),
    ("looked", "observed"), ("said", "murmured"), ("walked", "advanced"),
    ("began", "emerged"), ("ended", "collapsed"), ("searched", "tracked"),
    ("big", "immense"), ("small", "tiny"), ("old", "ancient"),
    ("new", "emergent"), ("cold", "frigid"), ("heat", "swelter"),
    ("alone", "isolated"), ("far", "distant"), ("near", "close"),
]


def _forzar_mutacion_frases(frases: list[str], nivel: int) -> list[str]:
    """
    Programmatic guarantee: if the LLM does not mutate previous words, substitute
    key words in the previous sentences to ensure the cumulative corrosion.
    """
    res: list[str] = []
    for idx, frase in enumerate(frases):
        palabras = frase.split()
        mutada = False
        nuevas_p: list[str] = []
        for p in palabras:
            p_clean = p.strip(".,;:!?()\"'")
            p_lower = p_clean.lower()
            reemplazo = None
            for orig, r in REEMPLAZOS_MUTACION:
                if p_lower == orig:
                    reemplazo = r.capitalize() if p_clean.istitle() else r
                    break
            if reemplazo:
                nuevas_p.append(p.replace(p_clean, reemplazo))
                mutada = True
            else:
                nuevas_p.append(p)

        if not mutada and palabras:
            last_word = palabras[-1].strip(".,;:!?")
            if len(last_word) > 2:
                alt = last_word + " (altered)" if nivel > 5 else last_word
                nuevas_p[-1] = palabras[-1].replace(last_word, alt)
        res.append(" ".join(nuevas_p))
    return res


# ─────────────────────────────────────────────────────────────────────────
# Generation (model calls)
# ─────────────────────────────────────────────────────────────────────────

async def generar_frase_inicial(contexto_txt: str) -> str:
    """
    Generate the FIRST sentence of the story from the theme, when the user did
    not provide an initial sentence. Falls back if the model fails.
    """
    user_prompt_v1 = (
        f"Generate the FIRST sentence of a story: short, clear and very closely related to the theme. "
        f"It must directly reflect the theme, without adding elements that have no clear relation to it.\n"
        f"Theme: {contexto_txt}\n\n"
        f"Respond ONLY with that single sentence, in English and without quotes."
    )
    try:
        res = await generar_texto(prompt=user_prompt_v1, temperature=0.7)
        return normalizar_frase(_sin_negrita(res["texto"].strip()))
    except Exception:
        return normalizar_frase(f"A story about {contexto_txt}.")


async def generar_version(prompt_inicial: str, contexto: str, prev_plain: list[str], version: int, nivel: int) -> list[str] | None:
    """
    Ask the model for the full version `version` (exactly `version` sentences,
    in plain text). Returns the list of sentences, or None if it does not meet
    the format or if it did not modify any word of the previous sentences.
    """
    numeradas = "\n".join(f"{i + 1}. {f}" for i, f in enumerate(prev_plain))
    tema = contexto or prompt_inicial
    ctx_info = [f"THEME (main narrative reference): {tema}"]
    if prompt_inicial and prompt_inicial != tema:
        ctx_info.append(f"Original first sentence: {prompt_inicial}")
    header_ctx = "\n".join(ctx_info)

    user_prompt = (
        f"{header_ctx}\n\n"
        f"Previous version ({len(prev_plain)} sentences):\n{numeradas}\n\n"
        f"Generate version {version}, with EXACTLY {version} sentences.\n"
        f"Current NOISE level: {nivel}/10. {_guia_ruido(nivel)}\n"
        f"MANDATORY RULE: You MUST rewrite the {len(prev_plain)} previous sentences "
        f"changing words (adjectives, verbs or nouns in each) AND add 1 new sentence at the end.\n"
        f"NO previous sentence may remain identical to the previous version.\n"
        f"Return ONLY the JSON."
    )

    resultado = await generar_texto(
        prompt=user_prompt,
        system_prompt=SYSTEM_PROMPT_TESTIGO,
        temperature=min(0.55 + nivel * 0.06, 1.0),
        json_mode=True,
    )

    try:
        datos = extraer_json(resultado["texto"])
    except (ValueError, Exception):
        return None

    frases = datos.get("frases") if isinstance(datos, dict) else None
    if not isinstance(frases, list):
        return None

    limpias = [normalizar_frase(_sin_negrita(str(f))) for f in frases if str(f).strip()]
    if len(limpias) > version:
        limpias = limpias[:version]
    if len(limpias) != version:
        return None

    # Validate that at least one previous sentence changed relative to the previous version
    if len(prev_plain) > 0:
        hay_cambio_previo = any(n != p for n, p in zip(limpias[:len(prev_plain)], prev_plain))
        if not hay_cambio_previo:
            return None  # Reject if there was no change in the previous sentences

    return limpias


async def generar_version_fallback(prompt_inicial: str, contexto: str, prev_plain: list[str], version: int, nivel: int) -> list[str]:
    """
    Robust fallback: rewrites mutating the previous sentences and adding the new sentence.
    Guarantees there is ALWAYS a change in the previous words.
    """
    numeradas = "\n".join(f"{i + 1}. {f}" for i, f in enumerate(prev_plain))
    tema = contexto or prompt_inicial
    user_prompt = (
        f"THEME: {tema}\n"
        f"Previous sentences ({len(prev_plain)}):\n{numeradas}\n\n"
        f"You MUST rewrite each of the {len(prev_plain)} previous sentences changing words (adjectives, verbs, synonyms) "
        f"and add 1 new sentence at the end (total: {version} sentences).\n"
        f"Respond ONLY in JSON: {{\"frases\": [\"sentence 1 rewritten\", ..., \"new sentence {version}\"]}}"
    )

    try:
        resultado = await generar_texto(
            prompt=user_prompt,
            system_prompt=SYSTEM_PROMPT_TESTIGO,
            temperature=min(0.65 + nivel * 0.05, 1.0),
            json_mode=True,
        )
        datos = extraer_json(resultado["texto"])
        frases = datos.get("frases") if isinstance(datos, dict) else None
        if isinstance(frases, list):
            limpias = [normalizar_frase(_sin_negrita(str(f))) for f in frases if str(f).strip()]
            if len(limpias) == version and any(n != p for n, p in zip(limpias[:len(prev_plain)], prev_plain)):
                return limpias
    except Exception:
        pass

    # If the AI fails or insists on not changing previous words, force the mutation on them
    prev_mutadas = _forzar_mutacion_frases(prev_plain, nivel)

    # Generate the new continuation sentence
    try:
        contexto_historia = " ".join(prev_mutadas[-3:])
        prompt_nueva = (
            f"Story so far: {contexto_historia}\n"
            f"THEME: {tema}\n\n"
            f"Add ONE short new continuation sentence coherent with the story. Respond only with the sentence."
        )
        res_nueva = await generar_texto(prompt=prompt_nueva, temperature=0.7)
        frase_nueva = normalizar_frase(_sin_negrita(res_nueva["texto"].strip()))
    except Exception:
        frase_nueva = normalizar_frase(f"The signal kept transforming progressively.")

    return prev_mutadas + [frase_nueva]
