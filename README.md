<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-success.svg" alt="Status Active" />
  <img src="https://img.shields.io/badge/Python-3.10+-blue.svg" alt="Python 3.10+" />
  <img src="https://img.shields.io/badge/Next.js-14-black.svg?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/AI-Gemini%202.5%20Flash-orange" alt="Gemini" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License MIT" />

  <h1>🏭 Industry Verse AI</h1>
  <p><strong>Autonomous Industrial AI Brain for Predictive Maintenance, Digital Twin & 3D Simulation</strong></p>
  <p>Production-grade industrial AI platform powered by Gemini 2.5 Flash, ChromaDB RAG, and Three.js 3D machine blueprints.</p>
</div>

---

## 📖 Table of Contents
- [✨ Core Models](#-core-models)
- [🚀 Tech Stack](#-tech-stack)
- [📁 Project Structure](#-project-structure)
- [⚡ Setup & Installation](#-setup--installation)
- [🔌 API Endpoints](#-api-endpoints)
- [☁️ Deployment](#️-deployment)
- [📄 License](#-license)

---

## ✨ Core Models

Industry Verse AI is focused on **5 specialized industrial AI models**:

1. **Failure Prediction and Root Cause**:
   - Predicts real-time failure probability, failure risk levels, degradation indicators, and health scores.
   - Deep Root Cause Analysis (RCA) with causal chains, fault trees, and corrective action protocols.

2. **Maintenance and Cost Planning**:
   - Comprehensive condition-based maintenance plans with prioritized procedures, required skills, and downtime estimation.
   - Detailed financial impact analysis, repair vs. replacement comparisons, and preventive maintenance ROI.

3. **AI RAG Chatbot**:
   - Context-aware industrial assistant powered by Google Gemini and ChromaDB vector retrieval over real-time and historical machine records.

4. **Digital Twin**:
   - Simulates machine behavior up to 90 days ahead, tracking component wear curves, remaining useful life (RUL), and optimal intervention milestones.

5. **3D Simulation & 3D Machine Models**:
   - High-fidelity interactive Three.js 3D blueprints for industrial pumps, electric motors, steam turbines, and rotary machinery with real-time heatmaps, annotations, and vibration telemetry.

---

## 🚀 Tech Stack

| Layer | Technology | Description |
|-------|-----------|-------------|
| **AI Reasoning** | **Gemini 2.5 Flash** | Sub-second inference and structured reasoning |
| **Backend** | **FastAPI + Python 3.10** | High-concurrency async REST & WebSocket server |
| **Vector DB (RAG)** | **ChromaDB + LangChain** | Machine log semantic retrieval |
| **Relational DB** | **SQLite + SQLAlchemy** | Telemetry and session persistence |
| **Frontend** | **Next.js 14 + TypeScript** | React Server Components & App Router |
| **3D Engine** | **Three.js & React Three Fiber** | 3D machine digital twin rendering |
| **Styling** | **Tailwind CSS & CSS Variables** | Industrial dark-mode control room aesthetic |
| **Animations** | **Framer Motion** | Micro-interactions and tab transitions |

---

## 📁 Project Structure

```text
IndustryVerse/
├── backend/                     # FastAPI Backend
│   ├── main.py                  # API entry point & router registration
│   ├── agents/                  # 5 Core Agent Models & Base Agent
│   │   ├── base_agent.py
│   │   ├── failure_agent.py
│   │   ├── rootcause_agent.py
│   │   ├── maintenance_agent.py
│   │   ├── cost_agent.py
│   │   ├── digitaltwin_agent.py
│   │   ├── simulation_agent.py
│   │   └── chat_agent.py
│   ├── routers/                 # Clean REST & WebSocket API endpoints
│   │   ├── upload_router.py
│   │   ├── failure_router.py
│   │   ├── rootcause_router.py
│   │   ├── maintenance_router.py
│   │   ├── cost_router.py
│   │   ├── digitaltwin_router.py
│   │   ├── simulation_router.py
│   │   ├── chat_router.py
│   │   ├── hitl_router.py
│   │   └── websocket_router.py
│   ├── services/                # Gemini LLM, Vector RAG & Real-Time Stream
│   ├── db/                      # SQLite models and ChromaDB store
│   └── requirements.txt         # Python dependencies
└── frontend_new/                # Next.js 14 Frontend
    ├── src/
    │   ├── app/                 # Next.js App Router (Dashboard & Control Room)
    │   ├── components/
    │   │   ├── 3d/              # 3D Three.js machine visualizer
    │   │   ├── tabs/            # 5 Core model dashboard views
    │   │   └── realtime/        # Live streaming telemetry panels
    │   └── lib/                 # API client and WebSocket hooks
    └── package.json             # Frontend dependencies
```

---

## ⚡ Setup & Installation

### Prerequisites
- Python 3.10 or 3.11
- Node.js 18+ & npm
- Git

### 0. Clone Repository
```bash
git clone https://github.com/AniruddhaAkhare/IndustryVerse.git
cd IndustryVerse
```

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Activate Virtual Environment:
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Windows (Command Prompt):
.\venv\Scripts\activate.bat
# On Linux / macOS:
source venv/bin/activate

# Install dependencies:
pip install -r requirements.txt
```

Create `backend/.env` (or copy from `.env.example`):
```bash
cp .env.example .env
```
Ensure your Gemini API Key is configured in `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
SQLITE_DB_PATH=./db/machina.db
CHROMA_PERSIST_DIR=./db/chroma
DATASET_PATH=./data/machine_logs.json
```

Start the FastAPI backend:
```bash
python main.py
# Server runs on http://localhost:8000 (Swagger docs at http://localhost:8000/docs)
```

### 2. Frontend Setup
In a new terminal window:
```bash
cd frontend_new
npm install
npm run dev
# Application opens at http://localhost:3000
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Model |
|--------|----------|-------------|-------|
| `POST` | `/api/upload` | Upload PDF and extract machine telemetry into ChromaDB | RAG Ingestion |
| `POST` | `/api/predict-failure` | Predict failure probability & health score | Model 1 |
| `POST` | `/api/root-cause` | Generate deep RCA, fault trees & causal chains | Model 1 |
| `POST` | `/api/maintenance-plan` | Generate prescriptive maintenance schedules | Model 2 |
| `POST` | `/api/cost-analysis` | Calculate repair margins and downtime impact | Model 2 |
| `POST` | `/api/digital-twin` | Run projected day-by-day machine simulation | Model 4 |
| `POST` | `/api/simulation-3d` | Run 3D finite element, kinematic, & stress simulation | Model 5 |
| `POST` | `/api/chat` | Conversational RAG assistance | Model 3 |
| `POST` | `/api/hitl-refine` | Human-in-the-Loop refinement of AI predictions | All Models |
| `WS`   | `/ws/stream` | Real-time WebSocket sensor telemetry stream | Model 5 |

---

<div align="center">
  <p><i>Built for the future of industrial automation — Industry Verse AI</i></p>
</div>
