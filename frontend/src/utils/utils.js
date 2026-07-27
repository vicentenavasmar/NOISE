/* ═══════════════════════════════════════════════════════════════════
   RUIDO — Shared UI helpers (React)
   ═══════════════════════════════════════════════════════════════════ */

/** Escapes HTML characters to prevent XSS. */
export function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
}

/**
 * Highlights the transmission changes:
 *  - [...] markers → "burnt" gap (compatibility).
 *  - **text** → fragment modified relative to the previous version.
 * Applied over text already escaped with escapeHtml.
 */
export function highlightOxidation(text) {
    return text
        .replace(/\[\.\.\.]/g, '<span class="oxidized-gap">[...]</span>')
        .replace(/\*\*([^*]+)\*\*/g, '<span class="signal-changed">$1</span>');
}

/**
 * Downloads an object as a JSON file in the browser (100% client-side).
 * Serializes verbatim so the certificate hash keeps verifying.
 */
export function descargarJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], {
        type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}
