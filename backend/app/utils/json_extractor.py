import json
import re

def limpiar_y_parsear_json(json_str: str) -> dict:
    """
    Try to clean up common JSON formatting errors
    (trailing commas, single quotes) and parse.
    """
    json_str = json_str.strip()
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        pass

    # 1. Remove trailing commas before a closing brace/bracket
    json_str = re.sub(r",\s*([\]}])", r"\1", json_str)

    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        pass

    # 2. Convert single-quote delimiters to double quotes
    json_str = re.sub(r"'\s*:\s*'", r'": "', json_str)
    json_str = re.sub(r"'\s*:\s*(\d+|true|false|null|\[|\{)", r'": \1', json_str)
    json_str = re.sub(r"([{,])\s*'", r'\1"', json_str)
    json_str = re.sub(r"'\s*([},\]])", r'"\1', json_str)

    return json.loads(json_str)

def extraer_json(texto: str) -> dict:
    """
    Find, clean and extract the first valid JSON object in a conversational text.
    """
    # 1. Look inside markdown code blocks ```json ... ```
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", texto, re.DOTALL)
    if match:
        try:
            return limpiar_y_parsear_json(match.group(1))
        except Exception:
            pass

    # 2. Look for the outermost braces { ... }
    first_brace = texto.find('{')
    last_brace = texto.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidate = texto[first_brace:last_brace+1]
        try:
            return limpiar_y_parsear_json(candidate)
        except Exception:
            pass

    # 3. Try to parse the whole text
    return limpiar_y_parsear_json(texto)
