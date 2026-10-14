import axios from "axios";

// ─── Axios instance ─────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const api = axios.create({ baseURL: API_BASE, timeout: 120000 });

// ─── PDF Upload & Ingestion (RAG) ───────────────────────────────────────────────
export const uploadPDF = (file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return api.post("/api/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
};

// ─── Helper for agent POST requests ─────────────────────────────────────────────
const agentPost = (
  endpoint: string,
  session_id: string,
  machine_id: string,
  extra: Record<string, any> = {}
) => api.post(endpoint, { session_id, machine_id, ...extra });

// ─── Core Models Kept ───────────────────────────────────────────────────────────
// 1. Failure Prediction and Root Cause
export const predictFailure  = (s: string, m: string) => agentPost("/api/predict-failure", s, m);
export const getRootCause    = (s: string, m: string) => agentPost("/api/root-cause", s, m);

// 2. Maintenance and Cost Planning
export const getMaintenance  = (s: string, m: string) => agentPost("/api/maintenance-plan", s, m);
export const getCostAnalysis = (s: string, m: string) => agentPost("/api/cost-analysis", s, m);

// 3. Digital Twin Simulation
export const getDigitalTwin  = (s: string, m: string, days = 30) =>
  agentPost("/api/digital-twin", s, m, { simulation_days: days });

// 4. 3D Simulation and Machine Kinematics
export const getSimulation3D = (s: string, m: string) =>
  agentPost("/api/simulation-3d", s, m);

// 5. AI RAG Chatbot
export const sendChat = (s: string, m: string, message: string, history: any[]) =>
  agentPost("/api/chat", s, m, { message, history });

// ─── Human-in-the-Loop (HITL) Refinement ───────────────────────────────────────
export const refineWithHITL = (
  session_id: string,
  machine_id: string,
  agent_type: string,
  previous_response: Record<string, any>,
  correction: string
) =>
  api.post("/api/hitl-refine", {
    session_id,
    machine_id,
    agent_type,
    previous_response,
    correction,
  });

// ─── Default export ────────────────────────────────────────────────────────────
export default api;