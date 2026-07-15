/* ═══════════════════════════════════════════════════════════════════
   RUIDO — HeroSection
   Composed hero (wordmark + intro) for the live / result phases.
   The initial screen reorders these pieces in TestigoView.
   ═══════════════════════════════════════════════════════════════════ */

import React from "react";
import HeroHeader from "./HeroHeader";
import HeroIntro from "./HeroIntro";

export default function HeroSection() {
    return (
        <div className="hero" id="hero">
            <HeroHeader />
            <HeroIntro />
        </div>
    );
}
