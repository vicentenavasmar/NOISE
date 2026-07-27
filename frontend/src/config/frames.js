/* ═══════════════════════════════════════════════════════════════════
   RUIDO — Frame configuration and detection for GSAP ScrollTrigger
   ═══════════════════════════════════════════════════════════════════ */

/**
 * 1. Automatic build-time detection with Vite (src/assets/frames/)
 * If you place your images in src/assets/frames/, Vite automatically counts and imports
 * all images (.jpg, .png, .webp, .svg) without needing to write numbers or names.
 */
const assetFrames = import.meta.glob("/src/assets/frames/*.{jpg,jpeg,png,webp,svg}", {
    eager: true,
    import: "default",
});

export const AUTO_ASSET_FRAMES = Object.keys(assetFrames)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
    .map((key) => assetFrames[key]);

/**
 * 2. Sequential generator for /public/frames/
 * @param {number} count - Total number of images in public/frames/
 * @param {string} prefix - Name prefix (e.g. 'ezgif-frame-', 'frame_')
 * @param {string} ext - Image extension (e.g. '.jpg', '.png', '.webp')
 * @param {number} digits - Zero-padded digits (e.g. 3 for 001, 002...)
 * @returns {string[]}
 */
export function generateFrameList(count = 26, prefix = "ezgif-frame-", ext = ".jpg", digits = 3) {
    const frames = [];
    for (let i = 1; i <= count; i++) {
        const numStr = String(i).padStart(digits, "0");
        frames.push(`/frames/${prefix}${numStr}${ext}`);
    }
    return frames;
}

/**
 * Default list used in the application.
 * Uses the automatic list from src/assets/frames if images exist there,
 * or the generated list from /public/frames/ by default.
 */
export const FRAME_LIST = AUTO_ASSET_FRAMES.length > 0
    ? AUTO_ASSET_FRAMES
    : generateFrameList(26, "ezgif-frame-", ".jpg", 3);
