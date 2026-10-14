"""Base agent class for all Industry Verse AI agents"""
from services.gemini_service import generate_json_response, generate_response
from services.vector_service import query_similar_logs, query_dataset
from typing import Dict, Any, List
import json

class BaseAgent:
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description

    def get_context(self, machine_data: Dict, session_id: str, n_results: int = 3) -> str:
        query = f"{machine_data.get('machine_name', '')} {machine_data.get('machine_type', '')} failure maintenance"
        similar = query_similar_logs(query, session_id, n_results)
        dataset_context = query_dataset(query, n_results)
        
        ctx_parts = []
        if similar:
            ctx_parts.append("=== SIMILAR HISTORICAL LOGS ===")
            for s in similar[:2]:
                ctx_parts.append(s["text"][:500])
        
        if dataset_context:
            ctx_parts.append("=== DATASET PATTERNS ===")
            for d in dataset_context[:2]:
                ctx_parts.append(d["text"][:400])
        
        return "\n".join(ctx_parts)

    def format_machine_context(self, machine_data: Dict) -> str:
        sensors = machine_data.get("sensor_data", {})
        return f"""
MACHINE UNDER ANALYSIS:
- Name: {machine_data.get('machine_name', 'Unknown')}
- ID: {machine_data.get('machine_id', 'Unknown')}
- Type: {machine_data.get('machine_type', 'Unknown')}
- Health Score: {machine_data.get('health_score', sensors.get('health_score', 'N/A'))}
- Log Text: {machine_data.get('log_text', '')[:800]}

SENSOR READINGS:
- Temperature: {sensors.get('temperature', 'N/A')} °C
- Vibration: {sensors.get('vibration', 'N/A')} mm/s
- Pressure: {sensors.get('pressure', 'N/A')} PSI
- RPM: {sensors.get('rpm', 'N/A')}
- Voltage: {sensors.get('voltage', 'N/A')} V
- Current: {sensors.get('current', 'N/A')} A
        """.strip()

    def run(self, machine_data: Dict, session_id: str) -> Dict[str, Any]:
        raise NotImplementedError
