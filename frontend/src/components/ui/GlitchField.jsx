/* ═══════════════════════════════════════════════════════════════════
   RUIDO — GlitchField
   Interactive signal background on canvas. Adaptation of the "glitch
   cursor" to the "Analog Signal" art direction: cyan/red RGB
   aberration over the void (not the cyan/magenta rainbow of the original).

   · The cursor leaves trails of signal blocks.
   · Each click fractures the image into displaced scanlines.
   · It lives with a faint ambient pulse even without interaction.

   Purely decorative: pointer-events none, aria-hidden, and it turns off
   completely with prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef } from "react";

const REDUCED =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/* RUIDO palette (var --split-c / --electric / --split-r) — the signal
   glitches between electric cyan and red, never in random hues. */
const CYAN = [0, 234, 255]; // --split-c
const ELECTRIC = [77, 216, 255]; // --electric
const RED = [255, 0, 64]; // --split-r

export default function GlitchField({ className = "" }) {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);

    useEffect(() => {
        if (REDUCED) return; // no motion: the CRT aesthetic already holds the background

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const glitchBlocks = [];
        const scanlines = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();

        // ── Signal block: chromatic trail that follows the cursor ──
        class GlitchBlock {
            constructor(x, y) {
                this.x = x + (Math.random() - 0.5) * 50;
                this.y = y + (Math.random() - 0.5) * 50;
                this.width = Math.random() * 46 + 8;
                this.height = Math.random() * 24 + 4;
                this.life = 100;
                // Bias toward electric cyan; red appears as a signal
                // "burn", rarer (RUIDO personality).
                const base =
                    Math.random() < 0.24
                        ? RED
                        : Math.random() < 0.5
                          ? CYAN
                          : ELECTRIC;
                const a = Math.random() * 0.32 + 0.12;
                this.color = `rgba(${base[0]},${base[1]},${base[2]},${a})`;
            }
            draw() {
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }
            update() {
                this.life -= 1;
                this.x += (Math.random() - 0.5) * 4;
                this.y += (Math.random() - 0.5) * 4;
            }
        }

        // ── Scanline: displaces a strip of the image (fracture on click) ──
        class Scanline {
            constructor(y, height, speed) {
                this.y = Math.max(0, Math.min(canvas.height - 1, Math.floor(y)));
                this.height = Math.max(1, Math.min(Math.floor(height), canvas.height - this.y));
                this.speed = speed;
                this.life = 15;
                this.offsetX = (Math.random() - 0.5) * 90;
            }
            draw() {
                if (this.height <= 0 || this.y >= canvas.height) return;
                const strip = ctx.getImageData(0, this.y, canvas.width, this.height);
                ctx.putImageData(strip, this.offsetX, this.y);
                // Sweep tint: only cyan or red, very faint
                const t = Math.random() < 0.3 ? RED : CYAN;
                ctx.fillStyle = `rgba(${t[0]},${t[1]},${t[2]},0.045)`;
                ctx.fillRect(0, this.y, canvas.width, this.height);
            }
            update() {
                this.life -= 1;
                this.y = Math.max(0, Math.min(canvas.height - 1, this.y + this.speed));
            }
        }

        const animate = () => {
            // Fade toward the void: the trails die out like a
            // signal losing intensity (the near-black color adds no
            // light with mix-blend screen, so the body gradient survives).
            ctx.fillStyle = "rgba(5, 6, 8, 0.14)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Ambient pulse: the signal is never completely still
            if (Math.random() < 0.05) {
                glitchBlocks.push(
                    new GlitchBlock(
                        Math.random() * canvas.width,
                        Math.random() * canvas.height
                    )
                );
            }

            for (let i = glitchBlocks.length - 1; i >= 0; i--) {
                const b = glitchBlocks[i];
                b.update();
                b.draw();
                if (b.life <= 0) glitchBlocks.splice(i, 1);
            }

            for (let i = scanlines.length - 1; i >= 0; i--) {
                const s = scanlines[i];
                s.update();
                s.draw();
                if (s.life <= 0) scanlines.splice(i, 1);
            }

            rafRef.current = requestAnimationFrame(animate);
        };
        animate();

        // ── Global interaction (the canvas does not capture pointers) ──
        const onMove = (e) => {
            if (Math.random() > 0.5) {
                glitchBlocks.push(new GlitchBlock(e.clientX, e.clientY));
            }
        };
        const onClick = () => {
            const n = 16;
            for (let i = 0; i < n; i++) {
                scanlines.push(
                    new Scanline(
                        Math.random() * canvas.height,
                        Math.random() * 9 + 1,
                        (Math.random() - 0.5) * 4
                    )
                );
            }
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("click", onClick);
        window.addEventListener("resize", resize);

        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("click", onClick);
            window.removeEventListener("resize", resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={`glitch-field ${className}`.trim()}
            aria-hidden="true"
        />
    );
}
