/* ═══════════════════════════════════════════════════════════════════
   RUIDO — FrameSequence (GSAP ScrollTrigger Image Sequence)
   Component that loads a frame sequence and draws the corresponding frame
   into an HTML5 Canvas based on the scroll position.
   ═══════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FRAME_LIST } from "../../config/frames";

// Register the GSAP plugin
gsap.registerPlugin(ScrollTrigger);

export default function FrameSequence({
    frameList = FRAME_LIST,
    triggerRef = null,
    start = "top top",
    end = "bottom bottom",
    scrub = 0.5,
    pin = true,
    overlayOpacity = 0.4,
    invertColors = true,
    canvasFilter = null,
    className = "",
}) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [loadedCount, setLoadedCount] = useState(0);
    const imagesRef = useRef([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        let animationTrigger = null;
        let isMounted = true;

        // Load images
        const images = [];
        let loadedCounter = 0;

        const updateCanvasSize = () => {
            if (!canvas) return;
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            renderFrame(playhead.frame);
        };

        const renderFrame = (index) => {
            if (!ctx || !canvas) return;
            const frameIndex = Math.min(
                frameList.length - 1,
                Math.max(0, Math.floor(index))
            );

            const img = images[frameIndex];
            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            if (img && img.complete && img.naturalWidth !== 0) {
                // Draw image with proportional fit (cover)
                const imgRatio = img.naturalWidth / img.naturalHeight;
                const canvasRatio = width / height;
                let drawW, drawH, drawX, drawY;

                if (canvasRatio > imgRatio) {
                    drawW = width;
                    drawH = width / imgRatio;
                    drawX = 0;
                    drawY = (height - drawH) / 2;
                } else {
                    drawH = height;
                    drawW = height * imgRatio;
                    drawX = (width - drawW) / 2;
                    drawY = 0;
                }

                ctx.drawImage(img, drawX, drawY, drawW, drawH);
            } else {
                // CRT aesthetic visual fallback if the image does not yet exist in /public/frames/
                drawFallbackFrame(ctx, width, height, frameIndex, frameList.length);
            }
        };

        // Clean fallback rendering when there are no images yet in /public/frames/
        const drawFallbackFrame = (ctx, w, h, index, total) => {
            // Dark CRT background
            ctx.fillStyle = "#050608";
            ctx.fillRect(0, 0, w, h);

            // Subtle analog grid
            ctx.strokeStyle = "rgba(0, 255, 102, 0.03)";
            ctx.lineWidth = 1;
            const gridSize = 50;
            for (let x = 0; x < w; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }
            for (let y = 0; y < h; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }

            // Subtle indicator in the bottom-right corner
            ctx.fillStyle = "rgba(0, 255, 102, 0.25)";
            ctx.font = "12px monospace";
            ctx.textAlign = "right";
            ctx.fillText(`[ GSAP SCROLL: FRAME ${index + 1}/${total} ]`, w - 30, h - 30);
        };

        // Instance to animate the current frame
        const playhead = { frame: 0 };

        // Preload images
        frameList.forEach((src, i) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                if (!isMounted) return;
                loadedCounter++;
                setLoadedCount(loadedCounter);
                if (i === 0) renderFrame(0);
            };
            img.onerror = () => {
                if (!isMounted) return;
                loadedCounter++;
                setLoadedCount(loadedCounter);
            };
            images.push(img);
        });
        imagesRef.current = images;

        // Set initial resolution
        updateCanvasSize();
        window.addEventListener("resize", updateCanvasSize);

        // Trigger target (use the default container or a custom one)
        const targetElement = triggerRef?.current || containerRef.current;

        // GSAP ScrollTrigger configuration
        animationTrigger = gsap.to(playhead, {
            frame: frameList.length - 1,
            ease: "none",
            scrollTrigger: {
                trigger: targetElement,
                start: start,
                end: end,
                scrub: scrub,
                pin: pin ? canvas : false,
                anticipatePin: 1,
                onUpdate: () => {
                    renderFrame(playhead.frame);
                },
            },
        });

        return () => {
            isMounted = false;
            window.removeEventListener("resize", updateCanvasSize);
            if (animationTrigger && animationTrigger.scrollTrigger) {
                animationTrigger.scrollTrigger.kill();
            }
            if (animationTrigger) {
                animationTrigger.kill();
            }
        };
    }, [frameList, triggerRef, start, end, scrub, pin]);

    const computedFilter = canvasFilter
        ? canvasFilter
        : invertColors
        ? "invert(0.92) hue-rotate(180deg) brightness(0.65) contrast(1.25)"
        : "none";

    return (
        <div ref={containerRef} className={`frame-sequence-container ${className}`}>
            <canvas
                ref={canvasRef}
                className="frame-sequence-canvas"
                style={{ filter: computedFilter }}
            />
            {overlayOpacity > 0 && (
                <div
                    className="frame-sequence-overlay"
                    style={{ opacity: overlayOpacity }}
                />
            )}
        </div>
    );
}
