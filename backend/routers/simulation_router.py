"""3D Simulation and Machine Kinematics Router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from agents.simulation_agent import Simulation3DAgent
from db.database import get_machine_data
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
agent = Simulation3DAgent()

class AgentRequest(BaseModel):
    session_id: str
    machine_id: str

@router.post("/simulation-3d")
async def simulation_3d(req: AgentRequest):
    """Run 3D finite element, kinematic, and component risk simulation for the selected machine."""
    machine_data = get_machine_data(req.session_id, req.machine_id)
    return agent.run(machine_data, req.session_id)

@router.post("/simulation")
async def simulation_alias(req: AgentRequest):
    """Alias for /simulation-3d"""
    machine_data = get_machine_data(req.session_id, req.machine_id)
    return agent.run(machine_data, req.session_id)
