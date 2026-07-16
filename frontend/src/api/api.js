/* ═══════════════════════════════════════════════════════════════════
   RUIDO — API config & base fetch helpers
   ═══════════════════════════════════════════════════════════════════ */

export const API_ORIGIN = window.RUIDO_API ?? "http://localhost:8000";
export const API_BASE = `${API_ORIGIN}/api`;

/**
 * POST JSON to an API endpoint. Throws with the server detail message on error.
 * @param {string} url
 * @param {object} body
 * @returns {Promise<Response>}
 */
export async function apiPost(url, body) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${res.status}`);
    }
    return res;
}
