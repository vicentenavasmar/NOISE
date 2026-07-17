/* ═══════════════════════════════════════════════════════════════════
   RUIDO — LivePanel (CRT Control Room)
   LIVE panel: Transmission with real-time data corrosion, sensory
   telemetry, audit console and irreversible shutdown.
   ═══════════════════════════════════════════════════════════════════ */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { escapeHtml, highlightOxidation } from "../../utils/utils";
import { useCRTAudio } from "../../hooks/useCRTAudio";

// Integrity per degradation level (0–10): irregular, non-linear descent,
// so the percentage does not always drop by 10 each step.
const INTEGRIDAD_POR_NIVEL = [100, 96, 89, 81, 68, 57, 43, 34, 22, 11, 0];

/**
 * @param {{
 *   sesionId: string,
 *   streamData: object|null,
 *   isGenerating: boolean,
 *   onStop: function(): Promise<void>
 * }} props
 */
export default function LivePanel({ sesionId, streamData, isGenerating, onStop }) {
    const [armed, setArmed] = useState(false);
    const [stopping, setStopping] = useState(false);
    const [logs, setLogs] = useState([]);
    const armedTimer = useRef(null);
    const streamRef = useRef(null);
    const renderedCount = useRef(0);
    const lastDegradacion = useRef(-1);

    const {
        setAudioMode,
        updateHumIntegrity,
        playDataClick,
        playShutdown
    } = useCRTAudio({ autoStartHum: true });

    // Switch to the analog CRT sound on entering witness mode and back to the normal sound on leaving
    useEffect(() => {
        setAudioMode("testigo");
        return () => {
            setAudioMode("ambient");
        };
    }, [setAudioMode]);

    // Sensory degradation & integrity
    const degradacion = streamData?.degradacion_actual ?? 0;
    const fragmentCount = streamData?.fragmentos?.length ?? 0;
    const integridadPct =
        INTEGRIDAD_POR_NIVEL[Math.min(degradacion, INTEGRIDAD_POR_NIVEL.length - 1)] ?? 0;
    const temperatura = 36 + (degradacion * 5) + (fragmentCount % 3);

    // Add an audit log line
    const addLog = useCallback((msg, type = "info") => {
        const time = new Date().toTimeString().split(" ")[0];
        setLogs((prev) => [...prev.slice(-15), { time, msg, type }]);
    }, []);

    // Update the audio hum according to integrity
    useEffect(() => {
        updateHumIntegrity(integridadPct);
    }, [integridadPct, updateHumIntegrity]);

    // Record degradation changes in the audit logs
    useEffect(() => {
        if (degradacion !== lastDegradacion.current) {
            if (degradacion > 0) {
                addLog(
                    `CORROSION ALERT: Signal integrity ${integridadPct}%`,
                    degradacion >= 6 ? "danger" : "alert"
                );
            } else {
                addLog("TRANSMISSION STARTED. Tuning Granite-3.1 channel...", "info");
            }
            lastDegradacion.current = degradacion;
        }
    }, [degradacion, integridadPct, addLog]);

    // Render fragments incrementally + synthetic clicks
    useEffect(() => {
        const stream = streamRef.current;
        if (!stream || !streamData) return;

        const frags = streamData.fragmentos || [];
        let newlyAdded = false;

        while (renderedCount.current < frags.length) {
            if (renderedCount.current > 0) {
                stream.appendChild(document.createTextNode(" "));
            }
            const span = document.createElement("span");
            span.className = "fragment fragment-new";
            span.textContent = frags[renderedCount.current];
            stream.appendChild(span);
            renderedCount.current++;
            newlyAdded = true;
        }

        if (newlyAdded) {
            playDataClick();
            const countStr = String(renderedCount.current).padStart(2, "0");
            addLog(`Frame ${countStr} processed and integrated into CRT signal.`, "info");
        }

        // Update already-rendered fragments if they underwent oxidation
        const fragmentSpans = stream.querySelectorAll(
            ".fragment:not(.fragment-in-progress)"
        );
        frags.forEach((frag, i) => {
            if (i < fragmentSpans.length) {
                fragmentSpans[i].innerHTML = highlightOxidation(escapeHtml(frag));
            }
        });

        // In-progress fragment + cursor
        let progSpan = stream.querySelector(".fragment-in-progress");
        let cursor = stream.querySelector(".stream-cursor");

        if (streamData.fragmento_en_progreso) {
            if (!progSpan) {
                if (frags.length > 0) {
                    stream.appendChild(document.createTextNode(" "));
                }
                progSpan = document.createElement("span");
                progSpan.className = "fragment fragment-in-progress";
                stream.appendChild(progSpan);
            }
            progSpan.textContent = streamData.fragmento_en_progreso;

            if (!cursor) {
                cursor = document.createElement("span");
                cursor.className = "stream-cursor";
                stream.appendChild(cursor);
            }
            playDataClick();
        } else {
            progSpan?.remove();
            cursor?.remove();
        }

        stream.scrollTop = stream.scrollHeight;
    }, [streamData, playDataClick, addLog]);

    // Reset the counter when the session changes
    useEffect(() => {
        renderedCount.current = 0;
        lastDegradacion.current = -1;
        setLogs([]);
        if (streamRef.current) streamRef.current.innerHTML = "";
    }, [sesionId]);

    // Arming / disarming the stop button
    const resetArm = useCallback(() => {
        setArmed(false);
        clearTimeout(armedTimer.current);
    }, []);

    const handleStop = useCallback(async () => {
        if (!armed) {
            setArmed(true);
            clearTimeout(armedTimer.current);
            armedTimer.current = setTimeout(resetArm, 4000);
            return;
        }
        clearTimeout(armedTimer.current);
        setStopping(true);
        addLog("EMERGENCY SHUTDOWN CONFIRMED. Freezing signal...", "danger");
        playShutdown();
        try {
            await onStop();
        } finally {
            setStopping(false);
            resetArm();
        }
    }, [armed, onStop, resetArm, playShutdown, addLog]);

    useEffect(() => {
        return () => clearTimeout(armedTimer.current);
    }, []);

    // Signal color classification
    let signalStatusClass = "sig-stable";
    if (degradacion > 6) signalStatusClass = "sig-critical";
    else if (degradacion > 2) signalStatusClass = "sig-unstable";

    return (
        <div className={`testigo-live ${signalStatusClass}`} id="testigo-live">

            {/* Telemetry HUD Bar */}
            <div className="live-bar crt-telemetry-hud">
                <div className="live-indicator">
                    <span className="live-dot pulse-danger" aria-hidden="true"></span>
                    <span className="live-word">🔴 LIVE TRANSMISSION</span>
                    <span className={`live-thinking-label${(isGenerating || streamData?.generando) ? " active" : ""}`}>
                        DECODING WITH GRANITE-3.1
                    </span>
                </div>

                <div className="telemetry-readouts">
                    <div className="readout-item">
                        <span className="readout-label">INTEGRITY</span>
                        <div className="signal-bar-wrap">
                            <div
                                className="signal-bar-fill"
                                style={{
                                    width: `${integridadPct}%`,
                                    background:
                                        integridadPct < 35
                                            ? "var(--signal-red)"
                                            : integridadPct < 70
                                            ? "var(--cert-yellow)"
                                            : "var(--valid)"
                                }}
                            />
                        </div>
                        <strong className="readout-val">{integridadPct}%</strong>
                    </div>

                    <div className="readout-item">
                        <span className="readout-label">NOISE TEMP.</span>
                        <strong className={`readout-val ${temperatura >= 70 ? "temp-critical" : ""}`}>
                            {temperatura}°C
                        </strong>
                    </div>

                    <div className="readout-item">
                        <span className="readout-label">FRAMES</span>
                        <strong className="readout-val">{fragmentCount}</strong>
                    </div>
                </div>
            </div>


            {/* Monitor CRT Container Frame */}
            <div className="crt-monitor-frame">
                <div className="crt-scanlines" aria-hidden="true" />
                <div className="crt-glow-overlay" aria-hidden="true" />

                <div
                    ref={streamRef}
                    className="output-area testigo-stream crt-screen-content"
                    id="testigo-stream"
                    role="log"
                    aria-live="polite"
                    aria-label="Live CRT transmission"
                />
            </div>

            {/* Realtime Telemetry & Corrosion Audit Log */}
            <div className="crt-log-console">
                <div className="log-header">REAL-TIME TELEMETRY & CORROSION LOG:</div>
                <div className="log-body">
                    {logs.length === 0 ? (
                        <div className="log-line text-muted">[00:00:00] Tuning transmission frequency...</div>
                    ) : (
                        logs.map((item, idx) => (
                            <div key={idx} className={`log-line ${item.type}`}>
                                [{item.time}] {item.msg}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Emergency Shutdown Button Zone */}
            <div className="stop-zone shutdown-control-area">
                <p className="stop-caption">
                    The decision is yours. Once stopped, the signal will freeze and the immutable SHA-256 signature will be generated.
                </p>
                <button
                    className={`btn-danger crt-shutdown-btn${armed ? " armed" : ""}${stopping ? " loading" : ""}`}
                    id="btn-testigo-detener"
                    onClick={handleStop}
                    disabled={stopping}
                >
                    <span className="shutdown-icon" aria-hidden="true">🔴</span>
                    <span className="btn-text">
                        {armed
                            ? "⚠ CONFIRM SHUTDOWN · IRREVERSIBLE"
                            : "SHUT DOWN SYSTEM (IRREVERSIBLE)"}
                    </span>
                    <span className="btn-loader" aria-hidden="true"></span>
                </button>
                <p className="stop-note">
                    When you shut down the system, the session will close permanently and the certificate will be archived.
                </p>
            </div>
        </div>
    );
}
