"use client";
import { motion } from "framer-motion";

interface Props {
  machines: any[];
  onSelect: (m: any) => void;
}

function healthToColor(s: number): string {
  if (s < 40) return "#ef4444";
  if (s < 65) return "#f59e0b";
  if (s < 80) return "#38bdf8";
  return "#22c55e";
}

function healthLabel(s: number): string {
  if (s < 40) return "CRITICAL ALERT";
  if (s < 65) return "HIGH RISK";
  if (s < 80) return "ATTENTION REQ";
  return "NOMINAL";
}

function getMachineIcon(type: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("motor")) return "⚡";
  if (t.includes("pump")) return "🔄";
  if (t.includes("turbine")) return "💨";
  if (t.includes("compressor")) return "⚙️";
  return "🏭";
}

export default function MachineSelector({ machines, onSelect }: Props) {
  return (
    <div style={{ minHeight: "calc(100vh - 70px)", padding: "40px 24px 80px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 36, textAlign: "left" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span className="pulse p-green" style={{ width: 8, height: 8, display: "inline-block" }} />
            <p style={{
              fontFamily: "var(--f-mono)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "#38bdf8",
              textTransform: "uppercase"
            }}>
              SCAN COMPLETE — {machines.length} INDUSTRIAL UNIT{machines.length !== 1 ? "S" : ""} IDENTIFIED
            </p>
          </div>

          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: 32,
            fontWeight: 800,
            color: "#f8fafc",
            letterSpacing: "-0.02em",
            marginBottom: 10
          }}>
            Select Machine for Deep AI Diagnostics
          </h2>

          <p style={{ color: "#94a3b8", fontSize: 14, maxWidth: 640, lineHeight: 1.6 }}>
            Each unit connects directly to 5 core intelligence models: Failure Prediction & Root Cause,
            Maintenance & Cost Planning, AI RAG Knowledge Assistant, Digital Twin, and 3D Kinematics.
          </p>
          <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.08)", marginTop: 24 }} />
        </motion.div>

        {/* Machine Cards Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 24,
        }}>
          {machines.map((m, i) => {
            const sensors = m.sensor_data || {};
            const hs = sensors.health_score ?? m.health_score ?? 75;
            const hColor = healthToColor(hs);
            const hLabel = healthLabel(hs);
            const icon = getMachineIcon(m.machine_type);

            return (
              <motion.div
                key={m.machine_id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => onSelect(m)}
                whileHover={{ y: -4, borderColor: hColor, boxShadow: `0 12px 30px -10px ${hColor}33` }}
                style={{
                  background: "rgba(15, 23, 42, 0.65)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 14,
                  padding: 24,
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  position: "relative",
                  overflow: "hidden",
                  backdropFilter: "blur(12px)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                {/* Subtle colored accent glow in top corner */}
                <div style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 140,
                  height: 140,
                  background: `radial-gradient(circle at top right, ${hColor}18, transparent 70%)`,
                  pointerEvents: "none",
                }} />

                <div>
                  {/* Top Bar: Unit ID & Status Pill */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{icon}</span>
                      <span style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: 11,
                        color: "#94a3b8",
                        letterSpacing: "0.08em",
                        fontWeight: 600
                      }}>
                        UNIT {String(i + 1).padStart(2, "0")} · {m.machine_id}
                      </span>
                    </div>

                    <span style={{
                      fontFamily: "var(--f-mono)",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      padding: "4px 10px",
                      borderRadius: 9999,
                      background: `${hColor}18`,
                      color: hColor,
                      border: `1px solid ${hColor}44`,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: hColor }} />
                      {hLabel}
                    </span>
                  </div>

                  {/* Machine Name & Type */}
                  <h3 style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#f8fafc",
                    marginBottom: 4,
                    lineHeight: 1.3
                  }}>
                    {m.machine_name}
                  </h3>
                  <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
                    {m.machine_type || "Industrial Asset"}
                  </p>

                  {/* Health Score Gauge Bar */}
                  <div style={{
                    background: "rgba(0,0,0,0.3)",
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.05)",
                    marginBottom: 20
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Health Score Index
                      </span>
                      <span style={{ fontFamily: "var(--f-mono)", fontSize: 13, fontWeight: 700, color: hColor }}>
                        {Math.round(hs)} / 100
                      </span>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${Math.min(100, Math.max(0, hs))}%`,
                        background: hColor,
                        borderRadius: 3,
                        boxShadow: `0 0 8px ${hColor}80`,
                        transition: "width 0.6s ease"
                      }} />
                    </div>
                  </div>

                  {/* Sensor Metrics 4-Pack */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                    <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <p style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>Temp</p>
                      <p style={{ fontFamily: "var(--f-mono)", fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>
                        {sensors.temperature !== undefined ? `${sensors.temperature.toFixed(1)} °C` : "72.0 °C"}
                      </p>
                    </div>

                    <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <p style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>Vibration</p>
                      <p style={{ fontFamily: "var(--f-mono)", fontSize: 13, fontWeight: 600, color: sensors.vibration > 6 ? "#f59e0b" : "#e2e8f0" }}>
                        {sensors.vibration !== undefined ? `${sensors.vibration.toFixed(1)} mm/s` : "3.2 mm/s"}
                      </p>
                    </div>

                    <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <p style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>Pressure</p>
                      <p style={{ fontFamily: "var(--f-mono)", fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>
                        {sensors.pressure !== undefined ? `${sensors.pressure.toFixed(1)} PSI` : "45.0 PSI"}
                      </p>
                    </div>

                    <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <p style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>RPM Velocity</p>
                      <p style={{ fontFamily: "var(--f-mono)", fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>
                        {sensors.rpm !== undefined ? `${Math.round(sensors.rpm)}` : "1,450"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div style={{
                  paddingTop: 16,
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span style={{
                    fontFamily: "var(--f-mono)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#38bdf8",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}>
                    Enter AI Analysis
                  </span>
                  <span style={{
                    color: "#38bdf8",
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "var(--f-mono)",
                    transition: "transform 0.2s"
                  }}>
                    →
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
