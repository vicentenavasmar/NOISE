/* ═══════════════════════════════════════════════════════════════════
   RUIDO — TestigoView
   State machine: idle → live → result → verify.
   ═══════════════════════════════════════════════════════════════════ */

import React, { useState, useCallback, useRef } from "react";
import { API_BASE, apiPost } from "../../api/api";
import { useSSEStream } from "../../hooks/useSSEStream";
import HeroSection from "./HeroSection";
import HeroHeader from "./HeroHeader";
import HeroIntro from "./HeroIntro";
import SetupPanel from "./SetupPanel";
import LivePanel from "./LivePanel";
import ResultPanel from "./ResultPanel";
import VerificarPanel from "./VerificarPanel";
import { highlightOxidation, escapeHtml } from "../../utils/utils";

export default function TestigoView() {
    // State: "idle" | "live" | "result" | "verify"
    const [phase, setPhase] = useState("idle");
    const [sesionId, setSesionId] = useState(null);
    const [streamData, setStreamData] = useState(null);
    const [obraFinal, setObraFinal] = useState("");
    const [certificado, setCertificado] = useState(null);

    const onMessageRef = useRef(null);
    onMessageRef.current = (data) => { setStreamData({ ...data }); };

    const stableOnMessage = useCallback((data) => {
        onMessageRef.current?.(data);
    }, []);

    const { connect, abort } = useSSEStream({ onMessage: stableOnMessage });

    const handleStart = useCallback(
        async ({ prompt, contexto, velocidad }) => {
            const res = await apiPost(`${API_BASE}/testigo/iniciar`, { prompt, contexto, velocidad });
            const data = await res.json();
            setSesionId(data.sesion_id);
            setStreamData(null);
            setObraFinal("");
            setCertificado(null);
            setPhase("live");
            connect(`${API_BASE}/testigo/${data.sesion_id}/stream`);
        },
        [connect]
    );

    const handleStop = useCallback(async () => {
        if (!sesionId) return;
        abort();
        const res = await apiPost(`${API_BASE}/testigo/${sesionId}/detener`, {});
        const data = await res.json();
        setObraFinal(data.obra_final);
        setCertificado(data.certificado);
        setPhase("result");
    }, [sesionId, abort]);

    // Navigate to the verification panel (preloads the current cert)
    const handleVerify = useCallback(() => {
        setPhase("verify");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    // Back to the result from verification
    const handleBackToResult = useCallback(() => {
        setPhase("result");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    const handleReset = useCallback(() => {
        abort();
        setSesionId(null);
        setStreamData(null);
        setObraFinal("");
        setCertificado(null);
        setPhase("idle");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [abort]);

    const isEngaged = phase !== "idle";

    return (
        <section
            className={`view active${isEngaged ? " view-testigo--engaged" : ""}`}
            id="view-testigo"
            data-view="testigo"
        >
            {phase === "idle" && (
                <div className="testigo-intro">
                    <div className="intro-header">
                        <HeroHeader wordmarkClassName="intro-wordmark" />
                    </div>
                    <div className="testigo-intro-body">
                        <div className="testigo-intro-text">
                            <HeroIntro />
                        </div>
                        <div className="testigo-intro-config">
                            <SetupPanel onStart={handleStart} />
                        </div>
                    </div>
                </div>
            )}

            {(phase === "live" || phase === "result") && (
                <>
                    <HeroSection />
                    <div className="stage" id="stage">
                        {phase === "live" && (
                            <LivePanel
                                sesionId={sesionId}
                                streamData={streamData}
                                isGenerating={streamData?.generando ?? false}
                                onStop={handleStop}
                            />
                        )}
                        {phase === "result" && (
                            <ResultPanel
                                obraFinal={obraFinal}
                                certificado={certificado}
                                onReset={handleReset}
                            />
                        )}
                    </div>
                </>
            )}

            {phase === "verify" && (
                <div className="stage" id="stage">
                    <VerificarPanel
                        certificado={certificado}
                        onBack={handleBackToResult}
                    />
                </div>
            )}
        </section>
    );
}
