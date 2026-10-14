// src/app/dashboard/page.tsx
"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useWebSocket } from "@/lib/useWebSocket";
import type { LogEntry } from "@/components/realtime/LiveLogPanel";
import LiveLogPanel from "@/components/realtime/LiveLogPanel";
import AnalyticsDashboard from "@/components/realtime/AnalyticsDashboard";
import { uploadPDF } from "@/lib/api";

const rawWs = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
const WS_URL = rawWs.endsWith("/ws/stream") ? rawWs : `${rawWs.replace(/\/$/, "")}/ws/stream`;

const MAX_TREND = 60;
const MAX_LOGS = 300;

let _logIdCounter = 0;
function nextLogId() {
  return `log-${++_logIdCounter}-${Date.now()}`;
}

export default function ControlRoom() {
  const router = useRouter();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [trend, setTrend] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [riskBars, setRiskBars] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [criticalMachines, setCriticalMachines] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [tickCount, setTickCount] = useState(0);
  const [wsStatus, setWsStatus] = useState("connecting");

  const handleMessage = useCallback((data: any) => {
    if (data.type !== "fleet_snapshot") return;

    const readings: any[] = data.readings || [];

    const newLogs: LogEntry[] = readings.map((r: any) => ({
      id: nextLogId(),
      machine_name: r.machine_name,
      machine_type: r.machine_type,
      machine_id: r.machine_id,
      timestamp: r.timestamp,
      severity: r.severity,
      failure_label: r.failure_label,
      health_score: r.health_score,
      log_text: r.log_text,
      sensor_data: r.sensor_data,
    }));

    setLogs((prev) => [...prev, ...newLogs].slice(-MAX_LOGS));

    if (data.kpis) setKpis(data.kpis);
    if (data.alerts) setAlerts(data.alerts);
    if (data.heatmap) setHeatmap(data.heatmap);
    if (data.risk_bars) setRiskBars(data.risk_bars);
    if (data.critical_machines) setCriticalMachines(data.critical_machines);
    if (data.timestamp)
      setLastUpdate(new Date(data.timestamp).toLocaleTimeString());

    setTickCount((n) => n + 1);

    if (data.trend_point) {
      setTrend((prev) => [...prev, data.trend_point].slice(-MAX_TREND));
    }
  }, []);

  const { status } = useWebSocket({
    url: WS_URL,
    onMessage: handleMessage,
    onStatusChange: setWsStatus,
  });

  const statusColor =
    status === "connected"
      ? "#22C55E"
      : status === "connecting"
      ? "#F59E0B"
      : "#EF4444";

  const statusLabel =
    status === "connected"
      ? "LIVE"
      : status === "connecting"
      ? "CONNECTING"
      : "DISCONNECTED";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      
      {/* ── HEADER ── */}
      <header
        style={{
          height: 56,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 20px",
          background: "#0A0D14",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* LEFT */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          
          {/* Logo */}
          <span
            style={{
              fontFamily: "var(--f-cond)",
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: "0.12em",
              color: "#E2E8F0",
            }}
          >
            INDUSTRY<span style={{ color: "#3B82F6" }}>VERSE AI</span>
          </span>

          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />

          {/* Status */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: status === "connected" ? Infinity : 0, duration: 1.2 }}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: statusColor,
              }}
            />
            <span
              style={{
                fontFamily: "var(--f-mono)",
                fontSize: 11,
                color: statusColor,
                letterSpacing: "0.12em",
              }}
            >
              {statusLabel}
            </span>
          </div>

          {tickCount > 0 && (
            <span
              style={{
                fontFamily: "var(--f-mono)",
                fontSize: 11,
                color: "#64748B",
              }}
            >
              {tickCount} snapshots · {lastUpdate}
            </span>
          )}
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>

          {/* 🔥 PREMIUM BUTTON */}
          <button
            onClick={async () => {
              try {
                const response = await fetch("/sample_machine_logs.pdf");
                const blob = await response.blob();
                const sampleFile = new File([blob], "sample_machine_logs.pdf", { type: "application/pdf" });

                const uploadResp = await uploadPDF(sampleFile);
                console.log("Upload response:", uploadResp.data);

                // Stash the data in session storage before routing
                sessionStorage.setItem("pendingMachineData", JSON.stringify(uploadResp.data));

                // ✅ FIX: Force a hard navigation so Next.js doesn't use the cached page
                window.location.href = "/"; 
                
              } catch (err: any) {
                console.error("Upload failed:", err.response?.data || err.message);
              }
            }}
            
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              fontFamily: "var(--f-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "#3B82F6",
              background: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.25)",
              borderRadius: 6,
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(59,130,246,0.15)";
              e.currentTarget.style.boxShadow = "0 0 12px rgba(59,130,246,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(59,130,246,0.08)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M12 3l9 9-9 9"/>
            </svg>
            VIEW AI AGENTS
          </button>
        </div>
      </header>

      {/* ── MAIN ── */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "30% 70%",
          height: "calc(100vh - 56px)",
        }}
      >
        <div style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}>
          <LiveLogPanel logs={logs} />
        </div>

        <div style={{ padding: 14 }}>
          <AnalyticsDashboard
            kpis={kpis}
            trend={trend}
            heatmap={heatmap}
            riskBars={riskBars}
            alerts={alerts}
            criticalMachines={criticalMachines}
          />
        </div>
      </div>
    </div>
  );
}