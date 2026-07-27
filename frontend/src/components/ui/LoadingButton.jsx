/* ═══════════════════════════════════════════════════════════════════
   RUIDO — LoadingButton
   Button with loading state, animated loader and disabled state.
   ═══════════════════════════════════════════════════════════════════ */

import React from "react";

/**
 * @param {{ loading?: boolean, children: React.ReactNode, className?: string, icon?: React.ReactNode, [key: string]: any }} props
 */
export default function LoadingButton({
    loading = false,
    children,
    className = "btn-primary",
    icon = null,
    ...rest
}) {
    return (
        <button className={`${className}${loading ? " loading" : ""}`} disabled={loading} {...rest}>
            <span className="btn-text">{children}</span>
            <span className="btn-loader" aria-hidden="true"></span>
            {icon}
        </button>
    );
}
