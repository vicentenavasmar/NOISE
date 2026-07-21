/* ═══════════════════════════════════════════════════════════════════
   RUIDO — useCRTAudio (Dual Ambient / Witness Mode Audio System)
   Native sound synthesis with the Web Audio API (no MP3, no dependencies).
   - General page: Soft, clean and harmonic ambient pad ("normal sound").
   - Witness Mode: Transition to the CRT tension hum and signal corrosion.
   ═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useCallback, useEffect } from "react";

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export function useCRTAudio({ autoStartHum = true, masterVolume = 0.4 } = {}) {
    const ctxRef = useRef(null);
    const masterRef = useRef(null);
    
    // References for the page's "normal" ambient pad
    const ambientPadRef = useRef(null);

    // References for Witness Mode's CRT tension hum
    const crtHumRef = useRef(null);

    const modeRef = useRef("ambient"); // "ambient" | "testigo"

    /**
     * Ensures and resumes the AudioContext on the first interaction.
     */
    const ensureContext = useCallback(() => {
        if (typeof window === "undefined") return null;
        if (!ctxRef.current) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            const ctx = new AC();
            const master = ctx.createGain();
            master.gain.value = masterVolume;
            master.connect(ctx.destination);
            ctxRef.current = ctx;
            masterRef.current = master;
        }
        if (ctxRef.current.state === "suspended") {
            ctxRef.current.resume().catch(() => {});
        }
        return ctxRef.current;
    }, [masterVolume]);

    // ── 1. PAGE'S NORMAL SOUND (Harmonic Ambient Pad) ──────────────────
    const startAmbientPad = useCallback(() => {
        const ctx = ensureContext();
        if (!ctx || ambientPadRef.current) return;
        const now = ctx.currentTime;

        // Two soft sine oscillators forming a perfect-fifth chord (A2 = 110Hz, E3 = 164.8Hz)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = "sine";
        osc2.type = "sine";
        osc1.frequency.setValueAtTime(110, now);
        osc2.frequency.setValueAtTime(164.81, now);

        // Warm lowpass filter
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(320, now);

        // Soft, pleasant volume for the whole page
        const gain = ctx.createGain();
        const level = 0.012;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(level, now + 0.6);

        // Sine LFO for ambient breathing
        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.setValueAtTime(0.2, now); // slow breathing
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(level * 0.35, now);
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        if (masterRef.current) gain.connect(masterRef.current);

        osc1.start(now);
        osc2.start(now);
        lfo.start(now);

        ambientPadRef.current = { osc1, osc2, filter, gain, lfo, lfoGain };
    }, [ensureContext]);

    const stopAmbientPad = useCallback(() => {
        const ctx = ctxRef.current;
        const pad = ambientPadRef.current;
        if (!ctx || !pad) return;
        ambientPadRef.current = null;

        const now = ctx.currentTime;
        pad.gain.gain.cancelScheduledValues(now);
        pad.gain.gain.setValueAtTime(pad.gain.gain.value, now);
        pad.gain.gain.linearRampToValueAtTime(0.0001, now + 0.6);

        setTimeout(() => {
            try {
                pad.osc1.stop();
                pad.osc2.stop();
                pad.lfo.stop();
            } catch {}
        }, 650);
    }, []);

    // ── 2. WITNESS MODE CRT SOUND (Subtle, faint and harmonic hum) ──
    const startCRTHum = useCallback(
        (intensityPct = 100) => {
            const ctx = ensureContext();
            if (!ctx || crtHumRef.current) return;
            const now = ctx.currentTime;
            const intensity = clamp(intensityPct, 0, 100) / 100;

            // Soft, faint sine oscillator (52Hz relaxing CRT hum)
            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(52, now);

            const filter = ctx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(140 + intensity * 80, now);
            filter.Q.value = 0.5;

            const gain = ctx.createGain();
            // Subtle, very faint volume so as not to bother the user when starting a transmission
            const level = 0.0025 * intensity;
            // Softer start: the first second rises to a low peak before
            // settling at the usual background level, so the initial "kick"
            // when pressing Start transmission is less noticeable.
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(level * 0.3, now + 1.0);
            gain.gain.linearRampToValueAtTime(level, now + 2.0);

            const lfo = ctx.createOscillator();
            lfo.type = "sine";
            lfo.frequency.setValueAtTime(2.0, now);
            const lfoGain = ctx.createGain();
            lfoGain.gain.setValueAtTime(level * 0.15, now);
            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);

            osc.connect(filter);
            filter.connect(gain);
            if (masterRef.current) gain.connect(masterRef.current);

            osc.start(now);
            lfo.start(now);

            crtHumRef.current = { osc, gain, filter, lfo, lfoGain };
        },
        [ensureContext]
    );

    const stopCRTHum = useCallback(() => {
        const ctx = ctxRef.current;
        const hum = crtHumRef.current;
        if (!ctx || !hum) return;
        crtHumRef.current = null;

        const now = ctx.currentTime;
        hum.gain.gain.cancelScheduledValues(now);
        hum.gain.gain.setValueAtTime(hum.gain.gain.value, now);
        hum.gain.gain.linearRampToValueAtTime(0.0001, now + 0.5);

        setTimeout(() => {
            try {
                hum.osc.stop();
                hum.lfo.stop();
            } catch {}
        }, 550);
    }, []);

    // ── Transition between Normal Sound and Witness Mode ───────────────
    const setAudioMode = useCallback(
        (mode, integridadPct = 100) => {
            modeRef.current = mode;
            if (mode === "testigo") {
                stopAmbientPad();
                startCRTHum(integridadPct);
            } else {
                stopCRTHum();
                startAmbientPad();
            }
        },
        [stopAmbientPad, startCRTHum, stopCRTHum, startAmbientPad]
    );

    /** Modulates the pitch in Witness Mode */
    const updateHumIntegrity = useCallback((pct) => {
        const ctx = ctxRef.current;
        const hum = crtHumRef.current;
        if (!ctx || !hum) return;
        const p = clamp(pct, 0, 100) / 100;
        const now = ctx.currentTime;

        const targetFreq = 48 + (1 - p) * 20;
        hum.osc.frequency.setTargetAtTime(targetFreq, now, 0.2);

        const targetCutoff = 130 + (1 - p) * 100;
        hum.filter.frequency.setTargetAtTime(targetCutoff, now, 0.2);
    }, []);

    /** Subtle typing/frame-reception click (soft sine wave) */
    const playDataClick = useCallback(() => {
        const ctx = ensureContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(550 + Math.random() * 150, now);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.004, now + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

        osc.connect(g);
        if (masterRef.current) g.connect(masterRef.current);
        osc.start(now);
        osc.stop(now + 0.035);
    }, [ensureContext]);

    /** Emergency shutdown sound */
    const playShutdown = useCallback(() => {
        const ctx = ensureContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const dur = 0.65;

        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + dur);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1800, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + dur);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + dur + 0.02);

        osc.connect(filter);
        filter.connect(g);
        if (masterRef.current) g.connect(masterRef.current);
        osc.start(now);
        osc.stop(now + dur + 0.05);

        // After the shutdown we return to the page's normal sound
        setTimeout(() => {
            setAudioMode("ambient");
        }, 700);
    }, [ensureContext, setAudioMode]);

    // Listen for user interaction to start the normal background sound immediately
    useEffect(() => {
        if (!autoStartHum) return;

        const events = [
            "pointerdown",
            "pointermove",
            "keydown",
            "click",
            "touchstart",
            "mousemove",
            "scroll"
        ];

        const handleUserGesture = () => {
            const ctx = ensureContext();
            if (ctx && ctx.state === "suspended") {
                ctx.resume().catch(() => {});
            }
            if (modeRef.current === "ambient") {
                startAmbientPad();
            } else {
                startCRTHum();
            }
            events.forEach((evt) => window.removeEventListener(evt, handleUserGesture));
        };

        // If the autoplay policy allows starting immediately (or a previous context is active)
        const ctx = ensureContext();
        if (ctx && ctx.state === "running") {
            if (modeRef.current === "ambient") startAmbientPad();
            else startCRTHum();
        } else {
            events.forEach((evt) => window.addEventListener(evt, handleUserGesture, { passive: true }));
        }

        return () => {
            events.forEach((evt) => window.removeEventListener(evt, handleUserGesture));
        };
    }, [autoStartHum, ensureContext, startAmbientPad, startCRTHum]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopAmbientPad();
            stopCRTHum();
            if (ctxRef.current && ctxRef.current.state !== "closed") {
                ctxRef.current.close().catch(() => {});
            }
            ctxRef.current = null;
            masterRef.current = null;
        };
    }, [stopAmbientPad, stopCRTHum]);

    return {
        audioEnabled: true,
        setAudioMode,
        startAmbientPad,
        startCRTHum,
        updateHumIntegrity,
        playDataClick,
        playShutdown,
    };
}

export default useCRTAudio;
