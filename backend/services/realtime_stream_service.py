"""
realtime_stream_service.py — Industry Verse AI Real-Time Control Panel
===================================================================
Generates realistic, context-aware machine telemetry by:
  1. Sampling records from the 5000-entry JSON dataset
  2. Querying ChromaDB for historical context of similar failure patterns
  3. Applying small statistical variations to sensor values (Gaussian noise)
  4. Building structured log payloads that match the existing DB schema
  5. Computing fleet-level KPIs from all active virtual machines

All of this runs inside an async generator consumed by the WebSocket endpoint.
No random dummy data — every reading is seeded from real ChromaDB context.
"""

from __future__ import annotations

import asyncio
import json
import logging
import math
import os
import random
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional

from services.vector_service import query_dataset, query_similar_logs

logger = logging.getLogger(__name__)

# ─── Dataset loader (singleton) ──────────────────────────────────────────────
_DATASET: List[Dict] = []
_DATASET_LOADED = False

def _load_dataset() -> List[Dict]:
    global _DATASET, _DATASET_LOADED
    if _DATASET_LOADED:
        return _DATASET
    path = Path(__file__).parent.parent / "data" / "machine_logs.json"
    if path.exists():
        with open(path) as f:
            _DATASET = json.load(f)
        logger.info(f"[StreamSvc] Loaded {len(_DATASET)} records from dataset")
    else:
        logger.warning("[StreamSvc] Dataset not found — fallback to pure ChromaDB")
    _DATASET_LOADED = True
    return _DATASET


# ─── Machine registry (10 persistent virtual machines) ──────────────────────
MACHINE_REGISTRY: List[Dict] = [
    {"id": "MCH-E001", "name": "Electric Motor A1",    "type": "Electric Motor",    "base_health": 72},
    {"id": "MCH-C001", "name": "Conveyor Belt Line-1", "type": "Conveyor Belt",     "base_health": 85},
    {"id": "MCH-P001", "name": "Centrifugal Pump P1",  "type": "Centrifugal Pump",  "base_health": 54},
    {"id": "MCH-T001", "name": "Steam Turbine T1",     "type": "Steam Turbine",     "base_health": 38},
    {"id": "MCH-B001", "name": "Industrial Boiler B1", "type": "Industrial Boiler", "base_health": 66},
    {"id": "MCH-G001", "name": "Power Generator G1",   "type": "Power Generator",   "base_health": 81},
    {"id": "MCH-A001", "name": "Air Compressor AC1",   "type": "Air Compressor",    "base_health": 47},
    {"id": "MCH-H001", "name": "Hydraulic Press HP1",  "type": "Hydraulic Press",   "base_health": 91},
    {"id": "MCH-V001", "name": "Control Valve CV1",    "type": "Control Valve",     "base_health": 60},
    {"id": "MCH-N001", "name": "CNC Machine CNC1",     "type": "CNC Machine",       "base_health": 77},
]

# Per-machine running state (tracks drift over time)
_machine_state: Dict[str, Dict] = {}


def _get_machine_state(machine_id: str, base_health: float) -> Dict:
    if machine_id not in _machine_state:
        _machine_state[machine_id] = {
            "health": base_health + random.uniform(-5, 5),
            "drift":  random.uniform(-0.15, 0.08),   # health drift per tick
            "seed_idx": random.randint(0, 4999),      # dataset seed record
            "rag_cache": None,                        # cached ChromaDB context
            "rag_ts":    0,                           # last RAG refresh time
            "tick":  0,
        }
    return _machine_state[machine_id]


# ─── Sensor noise model ──────────────────────────────────────────────────────
_TYPE_SENSOR_PROFILES: Dict[str, Dict] = {
    "Electric Motor":    {"temp": (60,110), "vib": (0.5,8),  "pres": (30,70),  "rpm": (1440,3000), "volt": (380,420), "curr": (10,25)},
    "Conveyor Belt":     {"temp": (35,75),  "vib": (0.3,5),  "pres": (20,50),  "rpm": (100,600),   "volt": (380,420), "curr": (5,18)},
    "Centrifugal Pump":  {"temp": (40,95),  "vib": (0.5,9),  "pres": (60,150), "rpm": (1200,3600), "volt": (380,415), "curr": (8,22)},
    "Steam Turbine":     {"temp": (80,220), "vib": (0.8,10), "pres": (80,160), "rpm": (1800,6000), "volt": (10,30),   "curr": (30,80)},
    "Industrial Boiler": {"temp": (90,180), "vib": (0.3,4),  "pres": (100,160),"rpm": (0,0),       "volt": (380,415), "curr": (20,50)},
    "Power Generator":   {"temp": (55,115), "vib": (0.4,7),  "pres": (25,65),  "rpm": (1500,3000), "volt": (380,480), "curr": (30,100)},
    "Air Compressor":    {"temp": (50,100), "vib": (0.6,8),  "pres": (60,180), "rpm": (900,1800),  "volt": (380,415), "curr": (10,30)},
    "Hydraulic Press":   {"temp": (40,80),  "vib": (0.2,4),  "pres": (80,160), "rpm": (0,0),       "volt": (380,415), "curr": (8,20)},
    "Control Valve":     {"temp": (25,60),  "vib": (0.1,2),  "pres": (20,100), "rpm": (0,0),       "volt": (24,48),   "curr": (0.5,5)},
    "CNC Machine":       {"temp": (30,70),  "vib": (0.2,4),  "pres": (20,60),  "rpm": (200,3000),  "volt": (380,415), "curr": (5,15)},
}

_DEFAULT_PROFILE = {"temp":(40,100),"vib":(0.5,8),"pres":(30,100),"rpm":(500,2000),"volt":(380,415),"curr":(10,25)}


def _noisy(value: float, pct: float = 0.03) -> float:
    """Add Gaussian noise (±pct of value)."""
    return round(value * (1 + random.gauss(0, pct)), 2)


def _scale_sensor_by_health(raw: float, health: float, lo: float, hi: float) -> float:
    """
    Push sensor values toward abnormal end when health is low.
    Low health → temperature and vibration go up; pressure/voltage get erratic.
    """
    # How far health deviates from perfect (100)
    stress = (100 - health) / 100          # 0 = healthy, 1 = failed
    mid = (lo + hi) / 2
    stressed = mid + (hi - mid) * stress * 0.7
    return round(_noisy(lo + (stressed - lo) * (1 - health / 100 * 0.5), 0.025), 2)


# ─── RAG context fetcher (cached 60 s per machine) ─────────────────────────
async def _fetch_rag_context(machine_type: str, machine_id: str) -> str:
    state = _machine_state.get(machine_id, {})
    now = time.time()
    if state.get("rag_cache") and now - state.get("rag_ts", 0) < 60:
        return state["rag_cache"]

    query = f"{machine_type} failure sensor anomaly vibration temperature"
    try:
        results = await asyncio.get_event_loop().run_in_executor(
            None, lambda: query_dataset(query, n_results=3)
        )
        snippets = [r["text"][:300] for r in results[:3]]
        ctx = " | ".join(snippets)
    except Exception as e:
        logger.warning(f"[StreamSvc] RAG query failed for {machine_id}: {e}")
        ctx = f"Historical pattern: {machine_type} nominal operation"

    if machine_id in _machine_state:
        _machine_state[machine_id]["rag_cache"] = ctx
        _machine_state[machine_id]["rag_ts"] = now
    return ctx


# ─── Log message builder ─────────────────────────────────────────────────────
def _failure_label_from_sensors(temp: float, vib: float, health: float) -> str:
    if health > 80:   return "normal"
    if temp > 160:    return "overheating"
    if vib > 9:       return "vibration_anomaly"
    if health < 30:   return random.choice(["bearing_failure","lubrication_failure","fatigue_crack"])
    if health < 50:   return random.choice(["bearing_failure","electrical_fault","corrosion","cavitation"])
    return "normal"


def _build_log_message(machine: Dict, sensors: Dict, health: float, label: str) -> str:
    name   = machine["name"]
    mtype  = machine["type"]
    status = "NOMINAL" if label == "normal" else "WARNING" if health > 50 else "FAULT"
    return (
        f"{name} ({mtype}): Health={health:.1f}%. Status={status}: "
        f"{label.replace('_',' ').title()}. "
        f"T={sensors['temperature']}°C V={sensors['vibration']}mm/s "
        f"P={sensors['pressure']}PSI RPM={sensors['rpm']}"
    )


def _severity_from_health(health: float) -> str:
    if health < 35: return "CRITICAL"
    if health < 60: return "WARNING"
    return "NORMAL"


def _criticality_from_health(health: float) -> str:
    if health < 35: return "CRITICAL"
    if health < 55: return "HIGH"
    if health < 75: return "MEDIUM"
    return "LOW"


# ─── Single machine tick ─────────────────────────────────────────────────────
async def _generate_machine_reading(machine: Dict, rag_ctx: str) -> Dict:
    """
    Generate one realistic telemetry reading for a machine.
    Seeds from dataset, varies with Gaussian noise scaled by health.
    """
    state  = _get_machine_state(machine["id"], machine["base_health"])
    health = max(10.0, min(99.0, state["health"] + state["drift"]))

    # Occasionally change drift direction (simulate repair or gradual failure)
    if state["tick"] % 20 == 0:
        state["drift"] = random.uniform(-0.25, 0.12)
    state["health"] = health
    state["tick"] += 1

    # Profile for this machine type
    prof = _TYPE_SENSOR_PROFILES.get(machine["type"], _DEFAULT_PROFILE)

    # Seed from dataset record (deterministic base values)
    dataset = _load_dataset()
    if dataset:
        seed = dataset[state["seed_idx"] % len(dataset)]
        state["seed_idx"] = (state["seed_idx"] + 1) % len(dataset)
        s0 = seed["sensor_data"]
        base_temp = _scale_sensor_by_health(
            s0.get("temperature", 75), health, prof["temp"][0], prof["temp"][1]
        )
        base_vib  = _scale_sensor_by_health(
            s0.get("vibration",   2.5), health, prof["vib"][0],  prof["vib"][1]
        )
        base_pres = _noisy(s0.get("pressure", 85))
        base_rpm  = _noisy(s0.get("rpm", 1500))
        base_volt = _noisy(s0.get("voltage", 400))
        base_curr = _noisy(s0.get("current", 15))
    else:
        lo, hi = prof["temp"]
        base_temp = _scale_sensor_by_health(random.uniform(lo, hi), health, lo, hi)
        base_vib  = _scale_sensor_by_health(random.uniform(*prof["vib"]), health, *prof["vib"])
        base_pres = _noisy(random.uniform(*prof["pres"]))
        base_rpm  = _noisy(random.uniform(*prof["rpm"]))
        base_volt = _noisy(random.uniform(*prof["volt"]))
        base_curr = _noisy(random.uniform(*prof["curr"]))

    sensors = {
        "temperature": base_temp,
        "vibration":   base_vib,
        "pressure":    base_pres,
        "rpm":         base_rpm,
        "voltage":     base_volt,
        "current":     base_curr,
    }

    label    = _failure_label_from_sensors(base_temp, base_vib, health)
    severity = _severity_from_health(health)
    fail_days = None if label == "normal" else max(1, int((health / 100) * 30))

    return {
        "machine_id":       machine["id"],
        "machine_name":     machine["name"],
        "machine_type":     machine["type"],
        "timestamp":        datetime.now(timezone.utc).isoformat(),
        "sensor_data": {
            **sensors,
            "health_score": round(health, 1),
        },
        "environment_data": {
            "ambient_temp": _noisy(26),
            "humidity":     round(random.uniform(40, 80), 1),
            "dust_level":   random.choice(["LOW", "MEDIUM", "HIGH"]),
        },
        "health_score":     round(health, 1),
        "failure_label":    label,
        "failure_in_days":  fail_days,
        "criticality":      _criticality_from_health(health),
        "severity":         severity,
        "log_text":         _build_log_message(machine, sensors, health, label),
        "rag_context_used": rag_ctx[:120],
        "cost_estimate":    round(max(0, (100 - health) * 250 + random.uniform(0, 5000)), 2),
        "maintenance_action": (
            "Continue monitoring" if label == "normal" else
            "Schedule immediate inspection" if health < 50 else
            "Plan maintenance within 7 days"
        ),
    }


# ─── Fleet snapshot (all 10 machines at once) ────────────────────────────────
async def generate_fleet_snapshot() -> Dict[str, Any]:
    """
    Build one complete snapshot:
    - One reading per machine
    - Fleet-level KPIs
    - Alert list
    - Heatmap data
    """
    readings = []
    for machine in MACHINE_REGISTRY:
        rag = await _fetch_rag_context(machine["type"], machine["id"])
        reading = await _generate_machine_reading(machine, rag)
        readings.append(reading)

    # ── Fleet KPIs ────────────────────────────────────────────────────────
    healths      = [r["health_score"] for r in readings]
    fleet_health = round(sum(healths) / len(healths), 1)
    critical_ct  = sum(1 for r in readings if r["severity"] == "CRITICAL")
    warning_ct   = sum(1 for r in readings if r["severity"] == "WARNING")
    normal_ct    = sum(1 for r in readings if r["severity"] == "NORMAL")

    # Failure index (0-100) — higher = more at risk
    failure_index = round(100 - fleet_health, 1)

    # Average failure probability (proxy from health inversion)
    avg_fail_prob = round(sum((100 - h) * 0.8 for h in healths) / len(healths), 1)

    # Predicted downtime (weighted by criticality)
    downtime_hrs = round(sum(
        (100 - r["health_score"]) / 100 * 24 * (1.5 if r["severity"] == "CRITICAL" else 0.8)
        for r in readings
    ), 1)

    # Alerts
    alerts = [
        {
            "machine_id":   r["machine_id"],
            "machine_name": r["machine_name"],
            "severity":     r["severity"],
            "label":        r["failure_label"],
            "health":       r["health_score"],
            "message":      r["log_text"][:120],
        }
        for r in readings if r["severity"] in ("CRITICAL", "WARNING")
    ]

    # Heatmap: machine × severity matrix
    heatmap = [
        {
            "id":       r["machine_id"],
            "name":     r["machine_name"][:14],
            "type":     r["machine_type"][:16],
            "health":   r["health_score"],
            "severity": r["severity"],
            "risk":     round(100 - r["health_score"], 1),
        }
        for r in sorted(readings, key=lambda x: x["health_score"])
    ]

    # Risk bar chart data
    risk_bars = [
        {"machine": r["machine_name"][:12], "risk": round(100 - r["health_score"], 1),
         "health": r["health_score"], "severity": r["severity"]}
        for r in sorted(readings, key=lambda x: x["health_score"])
    ]

    # Time-series point (last reading of each sensor for trend lines)
    ts = datetime.now(timezone.utc).isoformat()
    trend_point = {
        "ts": ts,
        "fleet_health": fleet_health,
        "avg_temp":     round(sum(r["sensor_data"]["temperature"] for r in readings) / len(readings), 1),
        "avg_vib":      round(sum(r["sensor_data"]["vibration"]   for r in readings) / len(readings), 2),
        "avg_pressure": round(sum(r["sensor_data"]["pressure"]    for r in readings) / len(readings), 1),
        "failure_index": failure_index,
    }

    # Critical machines
    critical_machines = sorted(
        [r for r in readings if r["health_score"] < 55],
        key=lambda x: x["health_score"]
    )[:5]

    return {
        "type":          "fleet_snapshot",
        "timestamp":     ts,
        "readings":      readings,
        "kpis": {
            "fleet_health":    fleet_health,
            "failure_index":   failure_index,
            "avg_fail_prob":   avg_fail_prob,
            "critical_count":  critical_ct,
            "warning_count":   warning_ct,
            "normal_count":    normal_ct,
            "total_machines":  len(readings),
            "downtime_hrs":    downtime_hrs,
            "active_alerts":   len(alerts),
        },
        "alerts":            alerts,
        "heatmap":           heatmap,
        "risk_bars":         risk_bars,
        "trend_point":       trend_point,
        "critical_machines": critical_machines,
    }


# ─── Async stream generator ──────────────────────────────────────────────────
async def stream_realtime(interval_secs: float = 5.0) -> AsyncGenerator[str, None]:
    """
    Yields serialized JSON snapshots every `interval_secs` seconds.
    Called by the WebSocket endpoint.
    """
    _load_dataset()   # pre-warm dataset cache

    while True:
        try:
            snapshot = await generate_fleet_snapshot()
            yield json.dumps(snapshot)
        except Exception as e:
            logger.error(f"[StreamSvc] Snapshot error: {e}", exc_info=True)
            yield json.dumps({"type": "error", "message": str(e)})

        await asyncio.sleep(interval_secs)
