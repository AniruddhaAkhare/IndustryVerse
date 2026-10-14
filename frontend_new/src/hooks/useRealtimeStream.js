/**
 * useRealtimeStream.js
 * --------------------
 * Custom hook that manages the WebSocket connection and
 * maintains per-machine state for the entire dashboard.
 */

import { useEffect, useRef, useCallback, useReducer } from "react";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/stream";

const MAX_HISTORY = 60; // data-points kept per machine

// ── Reducer ──────────────────────────────────────────────────────────
function machineReducer(state, action) {
  switch (action.type) {
    case "TICK": {
      const entries = action.payload; // array of log objects
      const next = { ...state };

      entries.forEach((entry) => {
        const mid = entry.machine_id;
        const prev = next[mid] || {
          id: mid,
          logs: [],
          tempHistory: [],
          vibHistory: [],
          latestReading: null,
          alertCount: 0,
        };

        const newLog = {
          ...entry,
          receivedAt: Date.now(),
        };

        const logs = [newLog, ...prev.logs].slice(0, 200);
        const tempHistory = [
          ...prev.tempHistory,
          { t: newLog.timestamp, v: entry.temperature },
        ].slice(-MAX_HISTORY);
        const vibHistory = [
          ...prev.vibHistory,
          { t: newLog.timestamp, v: entry.vibration },
        ].slice(-MAX_HISTORY);

        next[mid] = {
          ...prev,
          logs,
          tempHistory,
          vibHistory,
          latestReading: newLog,
          alertCount:
            prev.alertCount +
            (entry.status === "CRITICAL" || entry.status === "WARNING" ? 1 : 0),
        };
      });

      return next;
    }

    case "RESET":
      return {};

    default:
      return state;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────
export function useRealtimeStream() {
  const [machines, dispatch] = useReducer(machineReducer, {});
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const mountedRef = useRef(true);

  // All raw log entries (for the terminal panel)
  const allLogsRef = useRef([]);
  const [allLogs, setAllLogs] = useReducer(
    (state, entry) => [entry, ...state].slice(0, 400),
    []
  );

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[IndustryVerseAI] WebSocket connected");
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "stream_tick" || msg.type === "initial_snapshot") {
          dispatch({ type: "TICK", payload: msg.data });
          msg.data.forEach((entry) => setAllLogs(entry));
        }
      } catch (e) {
        console.error("WS parse error", e);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onclose = () => {
      if (mountedRef.current) {
        reconnectTimer.current = setTimeout(connect, 3000);
      }
    };

    // keepalive ping every 20s
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send("ping");
    }, 20_000);

    return () => clearInterval(pingInterval);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // ── Derived aggregates ──────────────────────────────────────────
  const machineList = Object.values(machines);

  const aggregates = {
    avgHealth:
      machineList.length > 0
        ? machineList.reduce(
            (s, m) => s + (m.latestReading?.health_score ?? 0),
            0
          ) / machineList.length
        : 0,
    totalAlerts: machineList.reduce((s, m) => s + m.alertCount, 0),
    criticalMachines: machineList
      .filter((m) => m.latestReading?.status === "CRITICAL")
      .map((m) => m.id),
    warningMachines: machineList
      .filter((m) => m.latestReading?.status === "WARNING")
      .map((m) => m.id),
    topRiskMachines: [...machineList]
      .filter((m) => m.latestReading)
      .sort(
        (a, b) =>
          (b.latestReading?.failure_probability ?? 0) -
          (a.latestReading?.failure_probability ?? 0)
      )
      .slice(0, 5),
  };

  return { machines, allLogs, aggregates };
}
