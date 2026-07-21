/* ═══════════════════════════════════════════════════════════════════
   RUIDO — VerificarView
   Full certificate verification page.

   Structure:
   ┌─────────────────────────────────────┐
   │  HERO — GSAP ScrollTrigger Sequence │
   │  "Every work generates a certificate…" │
   │  ↓  scroll hint                     │
   ├─────────────────────────────────────┤
   │  PANEL — Verify JSON                │
   └─────────────────────────────────────┘
   ═══════════════════════════════════════════════════════════════════ */

import React, { useCallback, useRef } from "react";
import VerificarPanel from "./VerificarPanel";
import FrameSequence from "../common/FrameSequence";

export default function VerificarView() {
    const rootRef = useRef(null);
    const panelRef = useRef(null);

    const scrollToPanel = useCallback(() => {
        panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    return (
        <div ref={rootRef} className="vcert-root">

            {/* Sharp frame-sequence background throughout the scroll */}
            <FrameSequence
                triggerRef={rootRef}
                start="top top"
                end="bottom bottom"
                scrub={0.5}
                pin={false}
                overlayOpacity={0}
                className="vcert-scroll-bg"
            />

            {/* ── SECTION 1: Hero ── */}
            <section className="vcert-hero" aria-label="NOISE certificates presentation">

                {/* Centered text content */}
                <div className="vcert-hero-content">
                    <p className="vcert-hero-eyebrow">
                        <span className="vcert-eyebrow-dot" aria-hidden="true" />
                        Degradation certificates · SHA-256
                    </p>

                    <h1 className="vcert-hero-title">
                        Every work carries<br />
                        <span className="vcert-title-accent">its unique signature</span>
                    </h1>

                    <p className="vcert-hero-body">
                        When you stop a NOISE transmission, the system generates an
                        immutable cryptographic certificate — like an identity card
                        for the work. It contains the SHA-256 hash of the text, the
                        recorded mutations and the exact instant when a human hand decided to stop.
                    </p>

                    <ul className="vcert-hero-pills" aria-label="What the certificate contains">
                        <li className="vcert-pill">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M12 2l2.9 2.1 3.5-.4 1.1 3.4 2.9 2-1.3 3.3 1.3 3.3-2.9 2-1.1 3.4-3.5-.4L12 22l-2.9-2.1-3.5.4-1.1-3.4-2.9-2 1.3-3.3-1.3-3.3 2.9-2 1.1-3.4 3.5.4z"
                                    stroke="currentColor" strokeWidth="1.5" fill="none"/>
                            </svg>
                            SHA-256 hash of the final text
                        </li>
                        <li className="vcert-pill">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <circle cx="12" cy="12" r="3" fill="currentColor"/>
                                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"
                                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            Exact moment of stopping
                        </li>
                        <li className="vcert-pill">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Recorded CRT mutations
                        </li>
                        <li className="vcert-pill">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            Cryptographic verification
                        </li>
                    </ul>

                    {/* Scroll hint */}
                    <button
                        className="vcert-scroll-hint"
                        onClick={scrollToPanel}
                        aria-label="Go to the verifier"
                    >
                        <span className="vcert-scroll-label">Verify a certificate</span>
                        <span className="vcert-scroll-arrow" aria-hidden="true">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M12 5v14M5 12l7 7 7-7"
                                    stroke="currentColor" strokeWidth="2"
                                    strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </span>
                    </button>
                </div>
            </section>

            {/* ── SECTION 2: Verifier ── */}
            <section
                ref={panelRef}
                className="vcert-verify-section"
                id="verificar"
                aria-label="Verify certificate"
            >
                <div className="stage">
                    <VerificarPanel
                        certificado={null}
                        onBack={null}
                    />
                </div>
            </section>

        </div>
    );
}
