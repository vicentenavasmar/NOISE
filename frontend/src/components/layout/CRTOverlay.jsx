/* ═══════════════════════════════════════════════════════════════════
   RUIDO — CRTOverlay
   Global decorative CRT layer (scanlines, grain, vignette, flicker, sweep).
   Purely visual, no interactivity.
   ═══════════════════════════════════════════════════════════════════ */

import React from "react";

export default function CRTOverlay() {
    return (
        <div className="crt" aria-hidden="true">
            <div className="crt-vignette"></div>
            <div className="crt-scanlines"></div>
            <div className="crt-grain"></div>
            <div className="crt-flicker"></div>
            <div className="crt-sweep"></div>
        </div>
    );
}
