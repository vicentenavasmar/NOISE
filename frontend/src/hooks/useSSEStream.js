/* ═══════════════════════════════════════════════════════════════════
   RUIDO — Hook: useSSEStream
   Manages an SSE (Server-Sent Events) connection via fetch +
   ReadableStream, with automatic reconnection.
   ═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useCallback } from "react";

/**
 * Hook to consume an SSE stream.
 *
 * @param {Object} options
 * @param {function} options.onMessage - Callback invoked with each parsed event
 * @param {number} [options.reconnectDelay=1500] - Delay before reconnection
 * @returns {{ connect: function, abort: function, isConnected: boolean, error: string|null }}
 */
export function useSSEStream({ onMessage, reconnectDelay = 1500 }) {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const abortRef = useRef(null);
    const urlRef = useRef(null);
    const activeRef = useRef(false);

    const abort = useCallback(() => {
        activeRef.current = false;
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const connectInternal = useCallback(
        async (url) => {
            if (abortRef.current) {
                abortRef.current.abort();
            }
            const controller = new AbortController();
            abortRef.current = controller;
            activeRef.current = true;
            urlRef.current = url;

            try {
                const res = await fetch(url, { signal: controller.signal });
                if (!res.ok) {
                    setError(`Error ${res.status}`);
                    setIsConnected(false);
                    return;
                }

                setIsConnected(true);
                setError(null);

                const reader = res.body.getReader();
                const decoder = new TextDecoder("utf-8");
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const parts = buffer.split("\n\n");
                    buffer = parts.pop();

                    for (const part of parts) {
                        const line = part.trim();
                        if (!line.startsWith("data: ")) continue;

                        try {
                            const data = JSON.parse(line.slice(6));
                            onMessage(data);
                        } catch {
                            // Ignore heartbeats or malformed events
                        }
                    }
                }
            } catch (err) {
                if (err.name !== "AbortError") {
                    setError(err.message);
                    // Reconnect if still active
                    if (activeRef.current && urlRef.current === url) {
                        setTimeout(() => {
                            if (activeRef.current) connectInternal(url);
                        }, reconnectDelay);
                    }
                }
            } finally {
                setIsConnected(false);
            }
        },
        [onMessage, reconnectDelay]
    );

    const connect = useCallback(
        (url) => {
            connectInternal(url);
        },
        [connectInternal]
    );

    return { connect, abort, isConnected, error };
}
