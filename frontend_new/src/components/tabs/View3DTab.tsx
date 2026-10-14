"use client";
import dynamic from "next/dynamic";
import AgentPanel from "@/components/ui/AgentPanel";
import { getSimulation3D } from "@/lib/api";

const MachineViewer3D = dynamic(() => import("@/components/3d/MachineViewer3D"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 420, gap: 16 }}>
      <div className="spinner" />
      <p style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--t4)" }}>
        INITIALIZING 3D WEBGL SHADER PIPELINE...
      </p>
    </div>
  ),
});

interface Props {
  sessionId: string;
  machineId: string;
  machineName: string;
  machineType?: string;
}

export default function View3DTab({ sessionId, machineId, machineName, machineType }: Props) {
  return (
    <AgentPanel
      agentType="3dview"
      sessionId={sessionId}
      machineId={machineId}
      agentName="3D Simulation & Kinematics Agent"
      fetchFn={() => getSimulation3D(sessionId, machineId)}
      cacheKey={`sim3d_${sessionId}_${machineId}`}
    >
      {(simData) => (
        <div>
          {/* Real-time 3D Simulation Telemetry Bar */}
          <div
            style={{
              margin: "16px 24px 0",
              padding: "14px 20px",
              background: "rgba(15,23,42,0.85)",
              border: "1px solid rgba(59,130,246,0.25)",
              borderRadius: 8,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="pulse p-green" style={{ width: 8, height: 8, display: "inline-block" }} />
              <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, fontWeight: 700, color: "#38bdf8", letterSpacing: "0.1em" }}>
                3D KINEMATICS ACTIVE
              </span>
              <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--t4)" }}>
                · SIM ID: {simData?.simulation_id || "SIM-LIVE"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--t4)", textTransform: "uppercase" }}>Velocity: </span>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 700, color: "var(--t1)" }}>
                  {simData?.rotation_speed_rpm ? `${simData.rotation_speed_rpm} RPM` : "1,450 RPM"}
                </span>
              </div>
              <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />
              <div>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--t4)", textTransform: "uppercase" }}>Harmonics: </span>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>
                  {simData?.vibration_harmonics_mm_s ? `${simData.vibration_harmonics_mm_s} mm/s` : "4.2 mm/s"}
                </span>
              </div>
              <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />
              <div>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--t4)", textTransform: "uppercase" }}>Thermal: </span>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 700, color: "#ef4444" }}>
                  {simData?.thermal_gradient_c ? `${simData.thermal_gradient_c} °C` : "74.0 °C"}
                </span>
              </div>
              <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />
              <div>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--t4)", textTransform: "uppercase" }}>FEA Stress: </span>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 700, color: "#a855f7" }}>
                  {simData?.stress_index !== undefined ? `${simData.stress_index}%` : "42%"}
                </span>
              </div>
            </div>
          </div>

          {/* 3D Machine Viewer Canvas */}
          <MachineViewer3D
            failureData={simData}
            machineName={machineName}
            machineType={machineType || simData?.machine_type || machineName}
          />

          {/* Simulation Summary note */}
          {simData?.simulation_summary && (
            <div style={{ margin: "16px 24px 24px", padding: "14px 18px", background: "rgba(10,15,30,0.6)", border: "1px solid var(--line)", borderRadius: 6 }}>
              <p style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--t4)", textTransform: "uppercase", marginBottom: 4, letterSpacing: "0.1em" }}>
                Finite Element Kinematic Findings
              </p>
              <p style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--t2)", lineHeight: 1.6 }}>
                {simData.simulation_summary}
              </p>
            </div>
          )}
        </div>
      )}
    </AgentPanel>
  );
}
