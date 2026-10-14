"""Chat Assistant Agent"""
from agents.base_agent import BaseAgent
from services.gemini_service import generate_response
from services.vector_service import query_similar_logs, query_dataset
from typing import Dict, Any, List

class ChatAgent(BaseAgent):
    def __init__(self):
        super().__init__("Chat Assistant Agent", "Intelligent chat assistant for factory operations")

    def run(self, machine_data: Dict, session_id: str, message: str = "", history: List = None) -> Dict[str, Any]:
        machine_ctx = self.format_machine_context(machine_data)
        similar = query_similar_logs(message, session_id, 3)
        dataset_ctx = query_dataset(message, 3)
        
        history_text = ""
        if history:
            for h in history[-6:]:
                history_text += f"{h['role'].upper()}: {h['content']}\n"
        
        context_docs = "\n".join([s["text"][:300] for s in similar[:2]])
        dataset_docs = "\n".join([d["text"][:300] for d in dataset_ctx[:2]])
        
        prompt = f"""You are Industry Verse AI's expert assistant for industrial factory operations, predictive maintenance, and machine intelligence. You have deep knowledge of industrial systems, failure modes, and maintenance strategies.

CURRENT MACHINE:
{machine_ctx}

RELEVANT HISTORICAL DATA:
{context_docs}

DATASET PATTERNS:
{dataset_docs}

CONVERSATION HISTORY:
{history_text}

USER QUESTION: {message}

Provide a helpful, detailed, technically accurate answer. Be specific to this machine's data. Format your response in clear paragraphs. If relevant, include specific numbers from the sensor data."""
        
        response = generate_response( # Note: plain response, not JSON
            prompt,
            provider="gemini",
            temperature=0.4
        )
        return {
            "response": response,
            "machine_context": machine_data.get("machine_name"),
            "sources_used": len(similar) + len(dataset_ctx),
        }
