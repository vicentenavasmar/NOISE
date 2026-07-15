/* ═══════════════════════════════════════════════════════════════════
   RUIDO — HeroWordmark
   The "RUIDO" wordmark with periodic glitch. Used as the central heading
   of the initial screen and inside the live/result hero.
   ═══════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export default function HeroWordmark({ className = "" }) {
    const wordmarkRef = useRef(null);

    // Periodic micro-glitches over the wordmark
    useEffect(() => {
        const prefersReduced =
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (prefersReduced) return;

        const el = wordmarkRef.current;
        if (!el) return;

        let timeout;
        function loop() {
            el.classList.remove("is-glitching");
            void el.offsetWidth;
            el.classList.add("is-glitching");
            setTimeout(() => el.classList.remove("is-glitching"), 460);
            timeout = setTimeout(loop, 2600 + Math.random() * 5200);
        }
        loop();

        return () => clearTimeout(timeout);
    }, []);

    return (
        <motion.h1
            ref={wordmarkRef}
            className={`hero-wordmark glitch ${className}`.trim()}
            data-text="NOISE"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
            NOISE
        </motion.h1>
    );
}
