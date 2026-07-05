"""
Hashing utilities for degradation certificates.
"""

import hashlib
import json


def calcular_hash(data: dict) -> str:
    """
    Compute SHA-256 over a dictionary serialized to JSON.

    Uses sort_keys=True to guarantee determinism regardless of the
    key insertion order.

    Args:
        data: Dictionary to hash.

    Returns:
        SHA-256 hash as a hexadecimal string.
    """
    json_str = json.dumps(data, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(json_str.encode("utf-8")).hexdigest()
