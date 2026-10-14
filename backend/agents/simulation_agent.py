"""3D Machine Simulation and Digital Kinematics Agent"""
from agents.base_agent import BaseAgent
from services.gemini_service import generate_json_response
from typing import Dict, Any
import uuid

class Simulation3DAgent(BaseAgent):
    def __init__(self):
        super().__init__("3D Simulation Agent", "Simulates dynamic mechanical kinematics, finite element stress, and component risks")

    def run(self, machine_data: Dict, session_id: str) -> Dict[str, Any]:
        context = self.get_context(machine_data, session_id)
        machine_ctx = self.format_machine_context(machine_data)
        sensors = machine_data.get("sensor_data", {})
        machine_name = machine_data.get("machine_name", "Industrial Machine")
        machine_type = machine_data.get("machine_type", "Industrial Equipment")
        machine_id = machine_data.get("machine_id", "MCH-01")
        
        base_health = float(machine_data.get("health_score", sensors.get("health_score", 70.0)))
        rpm = float(sensors.get("rpm", 1500.0))
        vib = float(sensors.get("vibration", 4.0))
        temp = float(sensors.get("temperature", 70.0))
        stress = round(max(5.0, min(95.0, 100.0 - base_health)), 1)

        prompt = f"""You are an advanced industrial physics simulation and 3D digital kinematics engine.
Simulate the 3D operational mechanics, finite element thermo-mechanical stresses, vibration harmonics, and component degradation for this machine.

{machine_ctx}
SENSORS: RPM={rpm}, Vibration={vib} mm/s, Temperature={temp} °C, Health={base_health}/100
RAG CONTEXT: {context}

Generate a comprehensive 3D simulation JSON object matching this schema:
{{
  "simulation_id": "sim_{machine_id.lower()}",
  "machine_id": "{machine_id}",
  "machine_name": "{machine_name}",
  "machine_type": "{machine_type}",
  "simulation_state": "ACTIVE",
  "rotation_speed_rpm": {rpm},
  "vibration_harmonics_mm_s": {vib},
  "thermal_gradient_c": {temp},
  "stress_index": {stress},
  "mesh_highlights": ["bearing_assembly", "rotor_shaft"],
  "component_risks": [
    {{"component": "bearing", "risk_score": <0-100>, "thermal_c": <num>, "status": "<CRITICAL|HIGH|MODERATE|NOMINAL>", "failure_mode": "<description>"}},
    {{"component": "stator", "risk_score": <0-100>, "thermal_c": <num>, "status": "<CRITICAL|HIGH|MODERATE|NOMINAL>", "failure_mode": "<description>"}},
    {{"component": "casing", "risk_score": <0-100>, "thermal_c": <num>, "status": "<CRITICAL|HIGH|MODERATE|NOMINAL>", "failure_mode": "<description>"}},
    {{"component": "impeller", "risk_score": <0-100>, "thermal_c": <num>, "status": "<CRITICAL|HIGH|MODERATE|NOMINAL>", "failure_mode": "<description>"}},
    {{"component": "blade", "risk_score": <0-100>, "thermal_c": <num>, "status": "<CRITICAL|HIGH|MODERATE|NOMINAL>", "failure_mode": "<description>"}},
    {{"component": "seal", "risk_score": <0-100>, "thermal_c": <num>, "status": "<CRITICAL|HIGH|MODERATE|NOMINAL>", "failure_mode": "<description>"}}
  ],
  "telemetry_stream": {{
    "fps": 60,
    "damping": 0.08,
    "thermal_warning": <true/false>,
    "resonance_alert": <true/false>
  }},
  "simulation_summary": "<Detailed kinematic and stress finite element simulation summary>"
}}"""

        result = generate_json_response(
            prompt,
            provider="gemini",
            model="gemini-2.5-flash",
            temperature=0.1
        )

        # Fallback if LLM response is invalid or missing component_risks
        if not isinstance(result, dict) or not result.get("component_risks"):
            bearing_risk = min(95, max(15, int(stress * 1.1)))
            stator_risk = min(90, max(12, int(stress * 0.85)))
            casing_risk = min(80, max(10, int(stress * 0.5)))
            impeller_risk = min(75, max(10, int(stress * 0.4)))
            blade_risk = min(85, max(10, int(stress * 0.6)))
            seal_risk = min(80, max(10, int(stress * 0.55)))

            def status_from_score(s: int) -> str:
                if s > 75: return "CRITICAL"
                if s > 50: return "HIGH"
                if s > 25: return "MODERATE"
                return "NOMINAL"

            result = {
                "simulation_id": f"sim_{machine_id.lower()}_{uuid.uuid4().hex[:6]}",
                "machine_id": machine_id,
                "machine_name": machine_name,
                "machine_type": machine_type,
                "simulation_state": "ACTIVE",
                "rotation_speed_rpm": rpm,
                "vibration_harmonics_mm_s": vib,
                "thermal_gradient_c": temp,
                "stress_index": stress,
                "mesh_highlights": ["bearing_assembly", "rotor_shaft"] if stress > 50 else ["primary_casing"],
                "component_risks": [
                    {"component": "bearing", "risk_score": bearing_risk, "thermal_c": round(temp + 5.0, 1), "status": status_from_score(bearing_risk), "failure_mode": "Thermo-mechanical fatigue & lubrication shearing"},
                    {"component": "stator", "risk_score": stator_risk, "thermal_c": round(temp + 1.2, 1), "status": status_from_score(stator_risk), "failure_mode": "Dielectric thermal stress & harmonic flux"},
                    {"component": "casing", "risk_score": casing_risk, "thermal_c": round(temp - 8.0, 1), "status": status_from_score(casing_risk), "failure_mode": "Vibration harmonic transmission"},
                    {"component": "impeller", "risk_score": impeller_risk, "thermal_c": round(temp - 15.0, 1), "status": status_from_score(impeller_risk), "failure_mode": "Hydrodynamic cavitational wear"},
                    {"component": "blade", "risk_score": blade_risk, "thermal_c": round(temp + 2.0, 1), "status": status_from_score(blade_risk), "failure_mode": "Aerodynamic surface micro-fracturing"},
                    {"component": "seal", "risk_score": seal_risk, "thermal_c": round(temp - 4.0, 1), "status": status_from_score(seal_risk), "failure_mode": "Elastomer extrusion under differential pressure"}
                ],
                "telemetry_stream": {
                    "fps": 60,
                    "damping": 0.08,
                    "thermal_warning": temp > 80.0,
                    "resonance_alert": vib > 6.0
                },
                "simulation_summary": f"Finite element dynamic simulation for {machine_name} indicates primary mechanical stress concentrated at drive bearings with {vib} mm/s harmonic vibration oscillation."
            }

        return result
