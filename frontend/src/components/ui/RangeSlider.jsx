/* ═══════════════════════════════════════════════════════════════════
   RUIDO — RangeSlider
   Range input with visual fill + dynamic output.
   ═══════════════════════════════════════════════════════════════════ */

import React, { useCallback, useEffect, useRef } from "react";

/**
 * @param {{ label: string, id: string, min: number, max: number, value: number, onChange: function, suffix?: string, helpText?: string, helpId?: string }} props
 */
export default function RangeSlider({
    label,
    id,
    min,
    max,
    value,
    onChange,
    suffix = "",
    helpText,
    helpId,
}) {
    const sliderRef = useRef(null);

    const updateFill = useCallback(() => {
        if (!sliderRef.current) return;
        const pct = ((value - min) / (max - min)) * 100;
        sliderRef.current.style.setProperty("--fill", pct + "%");
    }, [value, min, max]);

    useEffect(() => {
        updateFill();
    }, [updateFill]);

    return (
        <div className="tempo">
            <label htmlFor={id}>{label}</label>
            <input
                ref={sliderRef}
                type="range"
                id={id}
                min={min}
                max={max}
                value={value}
                className="filled"
                aria-describedby={helpId}
                onChange={(e) => onChange(parseInt(e.target.value))}
            />
            <output className="tempo-val">
                <span>{value}</span>
                {suffix}
            </output>
        </div>
    );
}
