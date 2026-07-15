/* ═══════════════════════════════════════════════════════════════════
   RUIDO — HeroIntro
   Introductory text on the left: the question (highlighted) and the
   concept that develops it.
   ═══════════════════════════════════════════════════════════════════ */

import React from "react";
import { motion } from "framer-motion";
import GlitchText from "../ui/GlitchText";

const revealVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: 0.12 + i * 0.1,
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
        },
    }),
};

export default function HeroIntro() {
    return (
        <>
            <motion.p
                className="hero-question"
                custom={0}
                initial="hidden"
                animate="visible"
                variants={revealVariants}
            >
                How much of art is{" "}
                <span className="q-human">human</span> and how much is machine{" "}
                <GlitchText text="noise" soft className="q-noise" />?
            </motion.p>

            <motion.p
                className="hero-concept"
                custom={1}
                initial="hidden"
                animate="visible"
                variants={revealVariants}
            >
                A machine writes. Time corrupts it. You decide when to stop.
                The work does not live in what the AI generates, but in the exact
                instant when a human hand <em>stops the noise</em>.
            </motion.p>
        </>
    );
}
