/* ═══════════════════════════════════════════════════════════════════
   RUIDO — ResultPanel
   Result: frozen final work + degradation certificate + metrics.
   ═══════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useRef } from "react";
import GlitchText from "../ui/GlitchText";
import CopyButton from "../ui/CopyButton";
import { escapeHtml, highlightOxidation, descargarJSON } from "../../utils/utils";

/**
 * @param {{
 *   obraFinal: string,
 *   certificado: object,
 *   onVerify: function(): void,
 *   onReset: function(): void
 * }} props
 */
export default function ResultPanel({ obraFinal, certificado, onReset }) {
    const [downloaded, setDownloaded] = useState(false);
    const titleRef = useRef(null);

    // Glitch burst on mount
    useEffect(() => {
        const el = titleRef.current;
        if (!el) return;
        el.classList.remove("is-glitching");
        void el.offsetWidth;
        el.classList.add("is-glitching");
        const t = setTimeout(() => el.classList.remove("is-glitching"), 460);
        return () => clearTimeout(t);
    }, []);

    // Work metrics
    const wordCount = obraFinal ? obraFinal.trim().split(/\s+/).filter(Boolean).length : 0;
    const charCount = obraFinal ? obraFinal.length : 0;
    const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));
    const transformacionesCount = certificado?.transformaciones?.length ?? 0;

    function handleDownload() {
        if (!certificado) return;
        const id = String(certificado.certificado_id || "obra").slice(0, 8);
        descargarJSON(certificado, `ruido-certificado-${id}.json`);
        setDownloaded(true);
    }

    function handleReset() {
        if (
            certificado &&
            !window.confirm(
                "Start a new transmission?\n\nYou will lose sight of this work and its certificate. Make sure you have downloaded it."
            )
        ) {
            return;
        }
        onReset();
    }

    return (
        <div className="testigo-resultado" id="testigo-resultado">
            <div className="result-head">
                <span className="result-eyebrow">frozen signal</span>
                <h2
                    ref={titleRef}
                    className="result-title glitch-soft"
                    data-text="The work"
                >
                    The work
                </h2>
                <p className="result-sub">
                    It exists because you stopped it here. It is unique and immutable.
                </p>

                {/* Work metrics */}
                <div className="result-stats-bar">
                    <div className="stat-chip">
                        <span className="stat-num">{wordCount}</span>
                        <span className="stat-lbl">words</span>
                    </div>
                    <div className="stat-chip">
                        <span className="stat-num">{charCount}</span>
                        <span className="stat-lbl">characters</span>
                    </div>
                    <div className="stat-chip">
                        <span className="stat-num">~{readingTimeMin} min</span>
                        <span className="stat-lbl">reading</span>
                    </div>
                    {transformacionesCount > 0 && (
                        <div className="stat-chip highlight">
                            <span className="stat-num">{transformacionesCount}</span>
                            <span className="stat-lbl">CRT mutations</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="obra-container">
                <div className="obra-toolbar">
                    <span className="obra-tag">TRANSMITTED AND FROZEN TEXT</span>
                    <CopyButton text={obraFinal} label="Copy work" />
                </div>
                <div
                    className="output-area obra-final has-content"
                    id="testigo-obra-final"
                    dangerouslySetInnerHTML={{
                        __html: highlightOxidation(escapeHtml(obraFinal)),
                    }}
                />
            </div>

            {certificado && (
                <div className="cert-block">
                    <div className="cert-card">
                        <div className="cert-card-head">
                            <span className="cert-seal" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path
                                        d="M12 2l2.9 2.1 3.5-.4 1.1 3.4 2.9 2-1.3 3.3 1.3 3.3-2.9 2-1.1 3.4-3.5-.4L12 22l-2.9-2.1-3.5.4-1.1-3.4-2.9-2 L2.9 12 1.6 8.7l2.9-2 1.1-3.4 3.5.4z"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.3"
                                    />
                                    <path
                                        d="M8.5 12.2l2.4 2.4 4.6-4.8"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </span>
                            <div>
                                <h3 className="cert-title">
                                    Degradation Certificate
                                </h3>
                                <p className="cert-desc">
                                    Immutable record sealed with a SHA-256 hash.
                                </p>
                            </div>
                        </div>
                        <div className="certificado-preview">
                            <div className="cert-field">
                                <span className="cert-label">certificado_id</span>
                                <span className="cert-value">
                                    {certificado.certificado_id}
                                </span>
                            </div>
                            <div className="cert-field">
                                <span className="cert-label">hash_sha256</span>
                                <span className="cert-hash">
                                    {certificado.hash_sha256}
                                </span>
                            </div>
                            <div className="cert-field">
                                <span className="cert-label">modo_testigo</span>
                                <span className="cert-value">
                                    {String(certificado.modo_testigo)}
                                </span>
                            </div>
                            <div className="cert-field">
                                <span className="cert-label">momento_detencion</span>
                                <span className="cert-value">
                                    {certificado.momento_detencion || "N/A"}
                                </span>
                            </div>
                            <div className="cert-field">
                                <span className="cert-label">transformaciones</span>
                                <span className="cert-value">
                                    {certificado.transformaciones?.length ?? 0} recorded
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        className={`btn-cert${downloaded ? " done" : ""}`}
                        id="btn-cert-download"
                        onClick={handleDownload}
                    >
                        <svg
                            className="btn-ico"
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
                            aria-hidden="true"
                        >
                            <path
                                d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <span className="btn-text">
                            {downloaded
                                ? "Certificate downloaded"
                                : "Download JSON certificate"}
                        </span>
                        <span className="btn-cert-check" aria-hidden="true"></span>
                    </button>
                </div>
            )}

            <div className="result-actions">
                <button className="btn-ghost" onClick={handleReset}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor"
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    New Transmission
                </button>
            </div>
        </div>
    );
}
