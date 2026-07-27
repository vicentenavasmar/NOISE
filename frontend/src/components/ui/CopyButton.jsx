/* ═══════════════════════════════════════════════════════════════════
   RUIDO — CopyButton
   Copy button with temporary "Copied" feedback.
   ═══════════════════════════════════════════════════════════════════ */

import React, { useState, useCallback } from "react";

/**
 * @param {{ getText: function(): string }} props
 */
export default function CopyButton({ getText }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        const text = getText();
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        });
    }, [getText]);

    return (
        <button
            type="button"
            className={`btn-copy${copied ? " copied" : ""}`}
            onClick={handleCopy}
        >
            {copied ? "Copied" : "Copy"}
        </button>
    );
}
