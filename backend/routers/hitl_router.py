"""
hitl_router.py — Human-in-the-Loop Refinement Endpoint
========================================================
POST /api/hitl-refine

Accepts:
  - session_id, machine_id
  - agent_type  : which agent to re-run  (e.g. "failure", "rootcause")
  - previous_response : the JSON the agent already produced
  - correction    : the human's correction text

Behaviour:
  1. Loads machine data from SQLite (same as every other router)
  2. Builds a correction-aware prompt that includes:
       • Original machine context
       • The agent's previous response (serialized)
       • The human's correction instruction
  3. Re-runs ONLY Gemini (bypasses DeepSeek / HuggingFace for speed)
  4. Returns the refined JSON response in the exact same schema
     as the original agent — frontend can drop it in without
     any changes to existing tab rendering code.

All 15 agent types are handled via a dispatch table.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db.database import get_machine_data
from services.gemini_service import generate_json_response
from agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Request / Response models ────────────────────────────────────────────────
class HITLRequest(BaseModel):
    session_id:         str
    machine_id:         str
    agent_type:         str          # e.g. "failure", "rootcause", "maintenance" …
    previous_response:  Dict[str, Any]
    correction:         str          # human's correction text


# ─── Agent-type → human-readable name + prompt role ──────────────────────────
AGENT_META: Dict[str, Dict[str, str]] = {
    "failure":      {"name": "Failure Prediction Agent",     "role": "predictive maintenance and failure analysis expert"},
    "rootcause":    {"name": "Root Cause Analysis Agent",    "role": "root cause analysis (RCA) engineer"},
    "maintenance":  {"name": "Maintenance Planner Agent",    "role": "maintenance planning engineer"},
    "cost":         {"name": "Cost Analysis Agent",          "role": "industrial cost analysis expert"},
    "digitaltwin":  {"name": "Digital Twin Agent",           "role": "digital twin simulation engine"},
    "overview":     {"name": "Overview Agent",               "role": "industrial machine health overview expert"},
    "chat":         {"name": "Chat Assistant Agent",         "role": "intelligent industrial AI assistant"},
    "3dview":       {"name": "Failure Prediction Agent",     "role": "predictive maintenance and failure analysis expert"},
}


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _load_machine(session_id: str, machine_id: str) -> Dict:
    return get_machine_data(session_id, machine_id)


def _format_machine_ctx(machine_data: Dict) -> str:
    """Reuse BaseAgent's format — instantiate temporarily."""
    b = BaseAgent.__new__(BaseAgent)
    b.name = "HITL"
    b.description = ""
    return b.format_machine_context(machine_data)


def _build_refinement_prompt(
    agent_type:         str,
    machine_ctx:        str,
    previous_response:  Dict,
    correction:         str,
) -> str:
    meta = AGENT_META.get(agent_type, {"name": "AI Agent", "role": "industrial AI expert"})

    prev_json = json.dumps(previous_response, indent=2)

    return f"""You are a {meta["role"]} — {meta["name"]} for Industry Verse AI.

MACHINE CONTEXT:
{machine_ctx}

YOUR PREVIOUS RESPONSE:
{prev_json}

HUMAN CORRECTION / FEEDBACK:
"{correction}"

TASK:
The human expert has reviewed your previous response and provided the correction above.
You MUST incorporate this feedback and produce an improved, corrected response.

Rules:
1. Address every point raised in the human correction.
2. Keep all fields that were already correct — do NOT discard good analysis.
3. Return the EXACT SAME JSON schema as your previous response.
4. If a field is unaffected by the correction, keep it unchanged.
5. Add a field "hitl_revision_note" (string) explaining what you changed and why.
6. Return ONLY valid JSON — no markdown, no explanation outside the JSON.

Corrected response:"""


# ─── Main endpoint ────────────────────────────────────────────────────────────
@router.post("/hitl-refine")
async def hitl_refine(req: HITLRequest):
    """
    Re-run a specific agent incorporating human correction feedback.
    Returns refined response in the same JSON schema as the original agent.
    """
    logger.info(
        f"[HITL] Refinement request: agent={req.agent_type} "
        f"machine={req.machine_id} correction='{req.correction[:80]}...'"
    )

    # 1. Load machine data
    machine_data = _load_machine(req.session_id, req.machine_id)

    # 2. Format context
    machine_ctx  = _format_machine_ctx(machine_data)

    # 3. Build correction-aware prompt
    prompt = _build_refinement_prompt(
        agent_type=        req.agent_type,
        machine_ctx=       machine_ctx,
        previous_response= req.previous_response,
        correction=        req.correction,
    )

    # 4. Call Gemini (lower temperature for more faithful correction application)
    result = generate_json_response(prompt, temperature=0.15)

    if "error" in result:
        logger.error(f"[HITL] Gemini error for {req.agent_type}: {result}")
        raise HTTPException(500, f"HITL refinement failed: {result.get('error')}")

    # 5. Ensure hitl metadata is present
    result.setdefault("hitl_revision_note", f"Response refined based on human correction: {req.correction[:120]}")
    result["hitl_iteration"] = req.previous_response.get("hitl_iteration", 0) + 1

    logger.info(f"[HITL] Refinement complete for {req.agent_type} (iteration {result['hitl_iteration']})")
    return result
