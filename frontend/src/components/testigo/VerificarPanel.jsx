/* ═══════════════════════════════════════════════════════════════════
   RUIDO — VerificarPanel
   SHA-256 certificate verification integrated into the Witness flow.
   Accepts the cert object directly (preloaded) or paste/drag JSON.
   ═══════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect } from "react";
import { API_BASE, apiPost } from "../../api/api";
import LoadingButton from "../ui/LoadingButton";

/**
 * @param {{
 *   certificado: object|null,   — cert preloaded from the ResultPanel
 *   onBack: function(): void    — back to result (optional)
 *   onResult: function(object): void — callback with the verification result (optional)
 * }} props
 */
export default function VerificarPanel({ certificado, onBack, onResult }) {
    const [jsonText, setJsonText] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // Preload the result cert if it comes from the ResultPanel
    useEffect(() => {
        if (certificado) {
            const text = JSON.stringify(certificado, null, 2);
            setJsonText(text);
            verify(text);
        }
        // on mount only
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function verify(text) {
        const trimmed = (text ?? jsonText).trim();
        if (!trimmed) {
            setError("Paste or drag the certificate JSON to verify.");
            return;
        }
        let certData;
        try {
            certData = JSON.parse(trimmed);
        } catch {
            setError("The text is not valid JSON.");
            return;
        }
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await apiPost(`${API_BASE}/certificado/verificar`, { certificado: certData });
            const data = await res.json();
            setResult(data);
            onResult?.(data);
        } catch (err) {
            setError(err.message);
            onResult?.(null);
        } finally {
            setLoading(false);
        }
    }

    function handleFileRead(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            setJsonText(content);
            verify(content);
        };
        reader.readAsText(file);
    }

    return (
        <div className="verificar-panel" id="verificar-panel">
            {/* Header */}
            <div className="verificar-head">
                {onBack && (
                    <button className="btn-back" onClick={onBack} aria-label="Back to result">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Back to result
                    </button>
                )}
                <div className="verificar-title-wrap">
                    <span className="verificar-eyebrow">signal audit</span>
                    <h2 className="verificar-title">Verify Certificate</h2>
                    <p className="verificar-desc">
                        Check whether the SHA-256 certificate is intact or has been altered.
                    </p>
                </div>
            </div>

            {/* Input area */}
            <div
                className={`verificar-dropzone${isDragging ? " is-dragging" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.[0]) handleFileRead(e.dataTransfer.files[0]);
                }}
            >
                <div className="verificar-field-head">
                    <label className="verificar-field-label" htmlFor="cert-json-inline">
                        Certificate JSON
                    </label>
                    <label className="btn-file-upload">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Load .json
                        <input
                            type="file"
                            accept=".json,application/json"
                            style={{ display: "none" }}
                            onChange={(e) => { if (e.target.files?.[0]) handleFileRead(e.target.files[0]); }}
                        />
                    </label>
                </div>
                <textarea
                    id="cert-json-inline"
                    rows="10"
                    spellCheck="false"
                    className="mono verificar-textarea"
                    placeholder='Paste the content of the ruido-certificado-XXXX.json file here, or drag it in…'
                    value={jsonText}
                    onChange={(e) => { setJsonText(e.target.value); setResult(null); setError(null); }}
                />
                {isDragging && (
                    <div className="verificar-drop-overlay">
                        <span>Drop the JSON file here</span>
                    </div>
                )}
            </div>

            <LoadingButton
                loading={loading}
                onClick={() => verify()}
                className="btn-primary btn-verificar-submit"
                id="btn-verificar-inline"
                icon={
                    <svg className="btn-ico" width="16" height="16" viewBox="0 0 24 24"
                        fill="none" aria-hidden="true">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                }
            >
                Verify integrity
            </LoadingButton>

            {/* Result */}
            {(result || error) && (
                <div className={`verificar-result${result ? (result.valido ? " is-valid" : " is-invalid") : " is-error"}`}>
                    {error ? (
                        <>
                            <span className="vr-icon">⚠</span>
                            <div>
                                <p className="vr-status">Verification error</p>
                                <p className="vr-msg">{error}</p>
                            </div>
                        </>
                    ) : result ? (
                        <>
                            <span className="vr-icon" aria-hidden="true">
                                {result.valido ? (
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                            stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                ) : (
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                )}
                            </span>
                            <div>
                                <p className="vr-status">
                                    {result.valido ? "CERTIFICATE INTACT" : "CERTIFICATE ALTERED"}
                                </p>
                                <p className="vr-msg">{result.mensaje}</p>
                            </div>
                        </>
                    ) : null}
                </div>
            )}
        </div>
    );
}
