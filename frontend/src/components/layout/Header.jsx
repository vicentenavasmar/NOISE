/* ═══════════════════════════════════════════════════════════════════
   RUIDO — Header
   Brand + navigation (Witness / Verify) + analog oscilloscope
   + telemetry signal indicator.
   ═══════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef } from "react";
import GlitchText from "../ui/GlitchText";
import { useHealthCheck } from "../../hooks/useHealthCheck";

function SignalOscilloscope() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let animationFrameId;
        let step = 0;

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.beginPath();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "rgba(77, 216, 255, 0.85)";

            const width = canvas.width;
            const height = canvas.height;
            const midY = height / 2;

            for (let x = 0; x < width; x++) {
                const freq = 0.08;
                const amp = Math.sin(step * 0.05) * 6 + 4;
                const y = midY + Math.sin(x * freq + step * 0.12) * amp;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Glow line
            ctx.shadowBlur = 8;
            ctx.shadowColor = "rgba(77, 216, 255, 0.9)";

            step++;
            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return (
        <div className="oscilloscope-wrap" title="CRT signal oscilloscope">
            <canvas ref={canvasRef} width={64} height={22} className="oscilloscope-canvas" />
            <span className="oscilloscope-tag">8000 Hz</span>
        </div>
    );
}

/**
 * @param {{ activeTab: string, onTabChange: function(string): void }} props
 */
export default function Header({ activeTab, onTabChange }) {
    const { status, message } = useHealthCheck();

    return (
        <header id="app-header">
            <a
                className="brand"
                href="#"
                onClick={(e) => { e.preventDefault(); onTabChange("testigo"); }}
                aria-label="NOISE — home"
            >
                <GlitchText text="NOISE" className="brand-mark" />
                <span className="brand-sub">creative degradation</span>
            </a>

            <SignalOscilloscope />

            <nav className="topnav" aria-label="Main navigation">
                <button
                    className={`topnav-link${activeTab === "testigo" ? " active" : ""}`}
                    onClick={() => onTabChange("testigo")}
                >
                    Witness
                </button>
                <button
                    className={`topnav-link${activeTab === "verificar" ? " active" : ""}`}
                    onClick={() => onTabChange("verificar")}
                >
                    Verify
                </button>
            </nav>

            <div
                className="signal-status"
                id="status-indicator"
                role="status"
                aria-live="polite"
                title="Signal status with the model"
            >
                <span className={`status-dot ${status}`}></span>
                <span className="status-text">{message}</span>
            </div>
        </header>
    );
}

