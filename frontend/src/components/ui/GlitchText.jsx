/* ═══════════════════════════════════════════════════════════════════
   RUIDO — GlitchText
   Text with RGB chromatic aberration effect (::before/::after).
   ═══════════════════════════════════════════════════════════════════ */

import React from "react";

/**
 * @param {{ text: string, soft?: boolean, Tag?: string, className?: string }} props
 */
export default function GlitchText({ text, soft = false, Tag = "span", className = "" }) {
    const glitchClass = soft ? "glitch-soft" : "glitch";
    return (
        <Tag
            className={`${glitchClass} ${className}`.trim()}
            data-text={text}
        >
            {text}
        </Tag>
    );
}
