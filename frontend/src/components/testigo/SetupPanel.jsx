/* ═══════════════════════════════════════════════════════════════════
   RUIDO — SetupPanel
   Setup before starting the transmission: prompt + speed.
   ═══════════════════════════════════════════════════════════════════ */

import React, { useState } from "react";
import LoadingButton from "../ui/LoadingButton";
import RangeSlider from "../ui/RangeSlider";

/**
 * @param {{ onStart: function({ prompt: string, contexto: string, velocidad: number }): Promise<void> }} props
 */
export default function SetupPanel({ onStart }) {
    const [prompt, setPrompt] = useState("");
    const [contexto, setContexto] = useState("");
    const [velocidad, setVelocidad] = useState(15);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function handleStart() {
        if (!contexto.trim()) {
            setError("You must indicate what you want the story to be about in the theme/context box (required).");
            return;
        }
        setError(null);
        setLoading(true);
        try {
            await onStart({
                prompt: prompt.trim(),
                contexto: contexto.trim(),
                velocidad
            });
        } catch (err) {
            setError("Failed to start: " + err.message);
        } finally {
            setLoading(false);
        }
    }

    function handleKeyDown(e) {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            handleStart();
        }
    }

    return (
        <div className="testigo-setup" id="testigo-setup">
            <div className="prompt-shell">
                <div className="prompt-fields-grid">
                    {/* Field 1: Theme or context (Required) */}
                    <div className="prompt-field-group">
                        <div className="prompt-shell-head">
                            <span className="prompt-label">
                                1. General theme or context
                                <span className="prompt-badge obligatorio">Required</span>
                            </span>
                            <span className="prompt-hint">
                                What you actually want the story to be about
                            </span>
                        </div>
                        <label className="sr-only" htmlFor="testigo-contexto">
                            Main theme or context of the story (Required)
                        </label>
                        <textarea
                            id="testigo-contexto"
                            rows="2"
                            spellCheck="false"
                            placeholder="Write the main theme, idea or setting of the story..."
                            value={contexto}
                            onChange={(e) => setContexto(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    {/* Field 2: Initial sentence (Optional) */}
                    <div className="prompt-field-group">
                        <div className="prompt-shell-head">
                            <span className="prompt-label">
                                2. First sentence
                                <span className="prompt-badge opcional">Optional</span>
                            </span>
                            <span className="prompt-hint">
                                If you fill it in, the story will start with these words
                            </span>
                        </div>
                        <label className="sr-only" htmlFor="testigo-prompt">
                            First sentence of the story (Optional)
                        </label>
                        <textarea
                            id="testigo-prompt"
                            rows="2"
                            spellCheck="false"
                            placeholder="Write the exact sentence you want it to start with..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                </div>

                <div className="prompt-shell-foot">
                    <RangeSlider
                        label="Pause between sentences"
                        id="testigo-velocidad"
                        min={5}
                        max={60}
                        value={velocidad}
                        onChange={setVelocidad}
                        suffix="s"
                        helpId="testigo-vel-help"
                    />
                    <LoadingButton
                        loading={loading}
                        className="btn-ignite"
                        onClick={handleStart}
                        id="btn-testigo-iniciar"
                        icon={
                            <svg
                                className="btn-ico"
                                viewBox="0 0 24 24"
                                width="18"
                                height="18"
                                aria-hidden="true"
                            >
                                <path d="M8 5v14l11-7z" fill="currentColor" />
                            </svg>
                        }
                    >
                        Start transmission
                    </LoadingButton>
                </div>
                <p className="tempo-help" id="testigo-vel-help">
                    The real cadence depends on this pause plus the model's processing
                    time (≈4-8 s per sentence).
                </p>
            </div>
            {error && (
                <div className="setup-error" role="alert">
                    ⚠️ {error}
                </div>
            )}
        </div>
    );
}


