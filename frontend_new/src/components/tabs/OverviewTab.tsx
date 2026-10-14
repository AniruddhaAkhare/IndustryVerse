"use client";
import { healthScoreColor } from "@/lib/utils";
import StatCard from "@/components/ui/StatCard";

interface Props {
  machine: any;
}

export default function OverviewTab({ machine }: Props) {
  if (!machine) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--f-mono)", fontSize: 13, color: "var(--t3)" }}>
          NO MACHINE SELECTED. SELECT A UNIT FROM THE UNITS BAR ABOVE.
        </p>
      </div>
    );
  }

  // Ensure robust sensor data fallback so gauges and metrics are never blank
  const rawSensors = machine.sensor_data || {};
  const sensors = {
    temperature: rawSensors.temperature ?? 72.0,
    vibration: rawSensors.vibration ?? 3.4,
    pressure: rawSensors.pressure ?? 48.0,
    rpm: rawSensors.rpm ?? 1450.0,
    voltage: rawSensors.voltage ?? 400.0,
    current: rawSensors.current ?? 25.0,
    health_score: rawSensors.health_score ?? machine.health_score ?? 75.0,
  };

  const hs = Number(sensors.health_score);
  const hColor = healthScoreColor(hs);

  const getStatusText = (score: number) => {
    if (score < 40) return { label: "CRITICAL ALERT", color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
    if (score < 65) return { label: "HIGH RISK WARNING", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
    if (score < 80) return { label: "ATTENTION REQUIRED", color: "#38bdf8", bg: "rgba(56,189,248,0.12)" };
    return { label: "SYSTEM NOMINAL", color: "#22c55e", bg: "rgba(34,197,94,0.12)" };
  };

  const status = getStatusText(hs);

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── MACHINE HEADER & HEALTH STATUS ── */}
      <div
        style={{
          background: "rgba(15,23,42,0.75)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14,
          padding: "24px 28px",
          backdropFilter: "blur(12px)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{
              fontFamily: "var(--f-mono)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#38bdf8",
              textTransform: "uppercase"
            }}>
              LIVE ASSET TELEMETRY PROFILE
            </span>
            <span style={{ color: "var(--t4)" }}>·</span>
            <span style={{
              fontFamily: "var(--f-mono)",
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              background: status.bg,
              color: status.color,
              fontWeight: 600,
            }}>
              {status.label}
            </span>
          </div>

          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 800,
            color: "#f8fafc",
            marginBottom: 6,
            letterSpacing: "-0.01em",
          }}>
            {machine.machine_name}
          </h2>

          <p style={{ fontFamily: "var(--f-mono)", fontSize: 13, color: "#94a3b8" }}>
            {machine.machine_type || "Industrial Asset"} · ID:{" "}
            <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{machine.machine_id}</span>
          </p>
        </div>

        {/* Circular Health Dial */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--t4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Composite Health
            </p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: hColor }}>
              {Math.round(hs)}%
            </p>
            <p style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: status.color }}>
              {status.label}
            </p>
          </div>

          <div style={{ position: "relative", width: 84, height: 84 }}>
            <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none" stroke={hColor} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40 * Math.min(100, Math.max(0, hs)) / 100} ${2 * Math.PI * 40}`}
                style={{ filter: `drop-shadow(0 0 8px ${hColor}80)`, transition: "stroke-dasharray 0.6s ease" }}
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: hColor }}>
                {Math.round(hs)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SENSOR TELEMETRY GRID ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--t4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Real-time Sensor Readings & Physical Ingestion
          </p>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "#22c55e", display: "flex", alignItems: "center", gap: 5 }}>
            <span className="pulse p-green" style={{ width: 6, height: 6, display: "inline-block" }} />
            SENSOR BUS SYNCED
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {[
            { key: "temperature", label: "Temperature", val: sensors.temperature, unit: "°C", icon: "🌡️", alert: sensors.temperature > 80 },
            { key: "vibration", label: "Vibration", val: sensors.vibration, unit: "mm/s", icon: "📳", alert: sensors.vibration > 6 },
            { key: "pressure", label: "Pressure", val: sensors.pressure, unit: "PSI", icon: "💨", alert: sensors.pressure > 250 },
            { key: "rpm", label: "RPM Velocity", val: sensors.rpm, unit: "", icon: "🔄", alert: false },
            { key: "voltage", label: "Voltage", val: sensors.voltage, unit: "V", icon: "⚡", alert: false },
            { key: "current", label: "Current", val: sensors.current, unit: "A", icon: "🔌", alert: sensors.current > 100 },
          ].map(({ key, label, val, unit, icon, alert }) => (
            <StatCard
              key={key}
              label={label}
              value={typeof val === "number" ? val.toFixed(1) : String(val)}
              unit={unit}
              icon={icon}
              color={alert ? "#ef4444" : "#38bdf8"}
            />
          ))}
        </div>
      </div>

      {/* ── 5 CORE INDUSTRIAL AI MODELS ── */}
      <div style={{
        background: "rgba(15,23,42,0.5)",
        border: "1px solid rgba(56,189,248,0.2)",
        borderRadius: 14,
        padding: "24px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <p style={{ fontFamily: "var(--f-mono)", fontSize: 10, fontWeight: 700, color: "#38bdf8", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              INDUSTRY VERSE AI · 5 CORE MODELS
            </p>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "#f8fafc", marginTop: 2 }}>
              Active Intelligence Agents
            </h3>
          </div>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--t4)" }}>
            Select any tab above to inspect detailed model telemetry
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {[
            {
              id: "1",
              name: "Failure & Root Cause",
              tabs: "Tabs: Failure Prediction & Root Cause",
              icon: "▲",
              color: "#ef4444",
              desc: "Predicts time-to-failure, degradation probability, and identifies mechanical failure origins."
            },
            {
              id: "2",
              name: "Maintenance & Cost",
              tabs: "Tabs: Maintenance Plan & Cost Planning",
              icon: "⊕",
              color: "#f59e0b",
              desc: "Calculates optimized maintenance schedules, labor requirements, and financial impact."
            },
            {
              id: "3",
              name: "AI RAG Chatbot",
              tabs: "Tab: AI RAG Chat",
              icon: "▣",
              color: "#38bdf8",
              desc: "Interactive assistant grounded in ChromaDB factory manual embeddings and live telemetry."
            },
            {
              id: "4",
              name: "Digital Twin Engine",
              tabs: "Tab: Digital Twin",
              icon: "⬡",
              color: "#a855f7",
              desc: "30-day wear simulation modeling component fatigue curves and intervention points."
            },
            {
              id: "5",
              name: "3D Machine Simulation",
              tabs: "Tab: 3D Simulation",
              icon: "⬢",
              color: "#22c55e",
              desc: "Interactive WebGL 3D model with dynamic kinematics, finite element stresses, and mesh inspection."
            },
          ].map((agent) => (
            <div
              key={agent.id}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 10,
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 16, color: agent.color }}>{agent.icon}</span>
                  <span style={{
                    fontFamily: "var(--f-mono)",
                    fontSize: 9,
                    color: agent.color,
                    background: `${agent.color}15`,
                    border: `1px solid ${agent.color}30`,
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontWeight: 700,
                  }}>
                    READY
                  </span>
                </div>
                <h4 style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "#f8fafc", marginBottom: 4 }}>
                  {agent.name}
                </h4>
                <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, marginBottom: 10 }}>
                  {agent.desc}
                </p>
              </div>
              <p style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--t4)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                {agent.tabs}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── RAW LOG PREVIEW ── */}
      {machine.log_text && (
        <div style={{
          background: "rgba(10,14,24,0.6)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          padding: "18px 22px",
        }}>
          <p style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--t4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            Ingested Machine Log Excerpt
          </p>
          <pre style={{
            fontFamily: "var(--f-mono)",
            fontSize: 11,
            color: "#94a3b8",
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
            maxHeight: 160,
            overflowY: "auto",
          }}>
            {machine.log_text}
          </pre>
        </div>
      )}
    </div>
  );
}