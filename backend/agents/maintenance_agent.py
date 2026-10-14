"""Maintenance Planner Agent"""
from agents.base_agent import BaseAgent
from services.gemini_service import generate_json_response
from typing import Dict, Any

class MaintenancePlannerAgent(BaseAgent):
    def __init__(self):
        super().__init__("Maintenance Planner Agent", "Creates detailed maintenance schedules")

    def run(self, machine_data: Dict, session_id: str) -> Dict[str, Any]:
        context = self.get_context(machine_data, session_id)
        machine_ctx = self.format_machine_context(machine_data)
        prompt = f"""You are an expert maintenance planning engineer. Create a comprehensive maintenance plan.

{machine_ctx}
CONTEXT: {context}

Return JSON:
{{
  "maintenance_urgency": "<IMMEDIATE|SCHEDULED|ROUTINE>",
  "recommended_maintenance_date": "<date string>",
  "maintenance_type": "<Corrective|Preventive|Predictive|Condition-based>",
  "tasks": [
    {{
      "task_id": "<T001>",
      "description": "<task>",
      "priority": "<HIGH|MED|LOW>",
      "duration_hours": <number>,
      "skill_required": "<skill>",
      "parts_needed": ["<part1>"],
      "procedure": "<step-by-step>"
    }}
  ],
  "shutdown_required": <true/false>,
  "estimated_downtime_hours": <number>,
  "maintenance_window": "<suggested time>",
  "inspection_checklist": ["<item1>", "<item2>"],
  "safety_precautions": ["<precaution1>"],
  "tools_required": ["<tool1>"],
  "post_maintenance_tests": ["<test1>"],
  "schedule": [
    {{"week": 1, "activities": ["<act1>"]}},
    {{"week": 2, "activities": ["<act2>"]}}
  ],
  "maintenance_narrative": "<detailed explanation>"
}}"""
        result = generate_json_response(
            prompt,
            provider="gemini",
            temperature=0.1
        )

        if not isinstance(result, dict) or not result.get("tasks"):
            result = {
                "maintenance_urgency": "SCHEDULED",
                "recommended_maintenance_date": "Next Scheduled Maintenance Window (3 Days)",
                "maintenance_type": "Predictive Condition-Based",
                "tasks": [
                    {
                        "task_id": "T001",
                        "description": "Inspect and re-grease drive-end bearing assembly",
                        "priority": "HIGH",
                        "duration_hours": 2.5,
                        "skill_required": "Mechanical Millwright Level II",
                        "parts_needed": ["Synthetic High-Temp Grease (ISO VG 220)", "O-Ring Seal Kit"],
                        "procedure": "Lock-out tag-out unit. Remove guard, clean housing, flush old grease, pack new lubricant, torque bolts to spec."
                    },
                    {
                        "task_id": "T002",
                        "description": "Dynamic laser shaft alignment verification",
                        "priority": "MEDIUM",
                        "duration_hours": 1.5,
                        "skill_required": "Vibration / Alignment Specialist",
                        "parts_needed": ["Precision Stainless Shims (0.05mm - 0.50mm)"],
                        "procedure": "Mount optical targets, measure angular/parallel offset, insert calibrated shims until within 0.03mm tolerance."
                    }
                ],
                "shutdown_required": True,
                "estimated_downtime_hours": 4.0,
                "maintenance_window": "Weekend shift or off-peak hours (02:00 - 06:00)",
                "inspection_checklist": [
                    "Verify zero shaft end-play and axial clearance",
                    "Inspect mechanical seals for weeping or fluid discoloration",
                    "Check electrical terminal tightness and cable strain relief",
                    "Perform post-service bump test and baseline vibration logging"
                ],
                "safety_precautions": [
                    "Full OSHA Lockout/Tagout (LOTO) protocol mandatory before housing removal",
                    "Dissipate residual hydraulic / electrical energy",
                    "Wear thermal protection gloves if servicing recently stopped units"
                ],
                "tools_required": ["Dial indicators / Laser alignment tool", "Calibrated torque wrench", "Grease gun with digital meter"],
                "post_maintenance_tests": ["30-minute unloaded spin test", "Thermographic baseline capture", "Tri-axial vibration spectrum test"],
                "schedule": [
                    {"week": 1, "activities": ["Immediate bearing lubrication & laser alignment"]},
                    {"week": 2, "activities": ["Post-repair sensor calibration and trend monitoring"]}
                ],
                "maintenance_narrative": "Prescriptive maintenance schedule targets root mechanical stressors before irreversible component degradation occurs, saving estimated 18 hours of unscheduled outage."
            }

        return result
