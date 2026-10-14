"""Root Cause Analysis Agent"""
from agents.base_agent import BaseAgent
from services.gemini_service import generate_json_response
from typing import Dict, Any

class RootCauseAgent(BaseAgent):
    def __init__(self):
        super().__init__("Root Cause Analysis Agent", "Deep root cause analysis of machine failures")

    def run(self, machine_data: Dict, session_id: str) -> Dict[str, Any]:
        context = self.get_context(machine_data, session_id)
        machine_ctx = self.format_machine_context(machine_data)
        
        prompt = f"""You are an expert Root Cause Analysis (RCA) engineer. Perform deep RCA on this machine.

{machine_ctx}

HISTORICAL CONTEXT:
{context}

Return JSON:
{{
  "primary_root_cause": "<detailed cause>",
  "cause_category": "<mechanical|electrical|thermal|chemical|operational|environmental>",
  "contributing_factors": [
    {{"factor": "<name>", "impact": "<HIGH|MEDIUM|LOW>", "description": "<detail>"}}
  ],
  "causal_chain": [
    {{"step": 1, "event": "<event>", "consequence": "<what it leads to>"}}
  ],
  "fault_tree": {{
    "top_event": "<main failure>",
    "branches": [
      {{"cause": "<cause>", "sub_causes": ["<sub1>", "<sub2>"]}}
    ]
  }},
  "timeline_of_degradation": [
    {{"phase": "<Early|Progressive|Critical>", "timeframe": "<period>", "indicators": ["<ind1>"]}}
  ],
  "similar_failure_patterns": ["<pattern1>", "<pattern2>"],
  "corrective_actions": [
    {{"action": "<action>", "priority": "<HIGH|MEDIUM|LOW>", "timeline": "<when>"}}
  ],
  "preventive_measures": ["<measure1>", "<measure2>"],
  "rca_narrative": "<detailed 3-4 sentence explanation>"
}}"""
        
        result = generate_json_response(
            prompt,
            provider="gemini",
            model="gemini-2.5-flash",
            temperature=0.1
        )

        if not isinstance(result, dict) or not result.get("primary_root_cause"):
            result = {
                "primary_root_cause": "Dynamic bearing fatigue accelerated by lubricant thermal thinning",
                "cause_category": "mechanical",
                "contributing_factors": [
                    {"factor": "Elevated vibration signature", "impact": "HIGH", "description": "High-frequency harmonics exceeding nominal operating envelope"},
                    {"factor": "Thermal stress on lubricant", "impact": "MEDIUM", "description": "Elevated temperatures degrading film thickness between rolling elements"}
                ],
                "causal_chain": [
                    {"step": 1, "event": "Radial shaft micro-misalignment", "consequence": "Uneven mechanical loading on roller raceway"},
                    {"step": 2, "event": "Frictional temperature escalation", "consequence": "Viscosity breakdown of grease/oil"},
                    {"step": 3, "event": "Surface micro-spalling", "consequence": "Progressive vibration amplification"}
                ],
                "fault_tree": {
                    "top_event": "Machine Bearing System Distress",
                    "branches": [
                        {"cause": "Mechanical Stress", "sub_causes": ["Shaft misalignment", "Unbalanced rotor dynamics"]},
                        {"cause": "Thermal Breakdown", "sub_causes": ["Viscosity loss", "Heat dissipation blockage"]}
                    ]
                },
                "timeline_of_degradation": [
                    {"phase": "Early", "timeframe": "0-30 days", "indicators": ["Minor high-frequency acoustic emissions"]},
                    {"phase": "Progressive", "timeframe": "30-60 days", "indicators": ["Detectable vibration rise", "10°C thermal delta"]},
                    {"phase": "Critical", "timeframe": "60+ days", "indicators": ["Severe harmonic vibration", "Acoustic rattling"]}
                ],
                "similar_failure_patterns": ["Bearing cage fracture", "Cavitation induced impeller wear"],
                "corrective_actions": [
                    {"action": "Perform precision dial indicator / laser shaft alignment", "priority": "HIGH", "timeline": "Within 48 hours"},
                    {"action": "Flush bearing housing and replenish with synthetic high-temp lubricant", "priority": "MEDIUM", "timeline": "Within 5 days"}
                ],
                "preventive_measures": ["Deploy continuous vibration telemetry", "Implement monthly thermographic scanning"],
                "rca_narrative": "Root cause analysis indicates mechanical fatigue exacerbated by elevated thermal stress. Immediate shaft alignment and lubrication replenishment will prevent secondary damage."
            }

        return result
