/* ═══════════════════════════════════════════════════════════════════
   RUIDO — HeroHeader
   Header: "RUIDO" wordmark + "Creative Degradation" subtitle.
   ═══════════════════════════════════════════════════════════════════ */

import React from "react";
import { motion } from "framer-motion";
import HeroWordmark from "./HeroWordmark";

export default function HeroHeader({ wordmarkClassName = "" }) {
    return (
        <>
            <HeroWordmark className={wordmarkClassName} />
            <motion.p
                className="hero-subtitle"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.21, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
                Creative Degradation
            </motion.p>
        </>
    );
}
