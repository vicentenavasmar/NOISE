/* ═══════════════════════════════════════════════════════════════════
   RUIDO — Hook: useHealthCheck
   Periodic polling to the backend to show the signal status.
   ═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from "react";
import { API_ORIGIN } from "../api/api";

/**
 * @returns {{ status: 'online'|'offline'|'checking', message: string }}
 */
export function useHealthCheck(intervalMs = 45000) {
    const [status, setStatus] = useState("checking");
    const [message, setMessage] = useState("tuning…");

    const check = useCallback(async () => {
        try {
            const res = await fetch(`${API_ORIGIN}/`);
            if (res.ok) {
                setStatus("online");
                setMessage("signal established");
            } else {
                setStatus("offline");
                setMessage("signal error");
            }
        } catch {
            setStatus("offline");
            setMessage("no signal");
        }
    }, []);

    useEffect(() => {
        check();
        const id = setInterval(check, intervalMs);
        return () => clearInterval(id);
    }, [check, intervalMs]);

    return { status, message };
}
