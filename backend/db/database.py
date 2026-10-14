"""SQLite database setup with SQLAlchemy"""
from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "./db/machina.db")
engine = create_engine(f"sqlite:///{SQLITE_DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class MachineLog(Base):
    __tablename__ = "machine_logs"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    machine_id = Column(String, index=True)
    machine_name = Column(String)
    machine_type = Column(String)
    timestamp = Column(String)
    temperature = Column(Float, nullable=True)
    vibration = Column(Float, nullable=True)
    pressure = Column(Float, nullable=True)
    rpm = Column(Float, nullable=True)
    voltage = Column(Float, nullable=True)
    current = Column(Float, nullable=True)
    health_score = Column(Float, nullable=True)
    failure_label = Column(String, nullable=True)
    failure_in_days = Column(Float, nullable=True)
    log_text = Column(Text)
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)
    filename = Column(String)
    machines_detected = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

def seed_default_machines(db):
    """Seed sample machine data if the database is empty so endpoints never fail with 404."""
    sample_pdf_path = os.getenv("SAMPLE_PDF_PATH", "./data/sample_machine_logs.pdf")
    machines = []

    if os.path.exists(sample_pdf_path):
        try:
            from services.pdf_service import extract_text_from_pdf, detect_machines
            with open(sample_pdf_path, "rb") as f:
                pdf_bytes = f.read()
            text = extract_text_from_pdf(pdf_bytes)
            machines = detect_machines(text)
        except Exception as e:
            logger.warning(f"Failed to extract sample PDF for seeding: {e}")

    if not machines:
        machines = [{
            "machine_id": "MCH_DEFAULT_1",
            "machine_name": "Hydraulic Pump Unit HP-01",
            "machine_type": "Hydraulic Pump",
            "log_text": "High vibration detected on bearing #2. Fluid temperature running above normal 82 C. Pressure fluctuation observed between 120-145 bar.",
            "sensor_data": {
                "temperature": 82.5,
                "vibration": 7.8,
                "pressure": 138.0,
                "rpm": 1780.0,
                "voltage": 398.0,
                "current": 24.2,
                "health_score": 48.0
            }
        }]

    default_session_id = "default_session"
    existing_ids = {row[0] for row in db.query(MachineLog.machine_id).filter_by(session_id=default_session_id).all()}

    new_count = 0
    for m in machines:
        if m["machine_id"] in existing_ids:
            continue
        sensors = m.get("sensor_data", {})
        log = MachineLog(
            session_id=default_session_id,
            machine_id=m["machine_id"],
            machine_name=m.get("machine_name", "Primary Machine"),
            machine_type=m.get("machine_type", "Unknown"),
            timestamp=datetime.utcnow().isoformat(),
            temperature=sensors.get("temperature"),
            vibration=sensors.get("vibration"),
            pressure=sensors.get("pressure"),
            rpm=sensors.get("rpm"),
            voltage=sensors.get("voltage"),
            current=sensors.get("current"),
            health_score=sensors.get("health_score"),
            log_text=m.get("log_text", ""),
            raw_data=m,
        )
        db.add(log)
        new_count += 1
    db.commit()
    logger.info(f"Database verified/seeded with {len(machines)} default machines ({new_count} new added).")

def init_db():
    os.makedirs(os.path.dirname(SQLITE_DB_PATH) if os.path.dirname(SQLITE_DB_PATH) else ".", exist_ok=True)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_default_machines(db)
    except Exception as e:
        logger.warning(f"Error checking/seeding DB on init: {e}")
    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_machine_data(session_id: str = None, machine_id: str = None) -> dict:
    """
    Resilient lookup for machine data:
    1. Exact match by session_id AND machine_id
    2. Match by machine_id across any session
    3. Match by session_id across any machine
    4. Fallback to latest machine recorded
    5. Auto-seed if database is empty
    """
    db = SessionLocal()
    try:
        # 1. Exact match
        if session_id and machine_id:
            m = db.query(MachineLog).filter(
                MachineLog.session_id == session_id,
                MachineLog.machine_id == machine_id
            ).first()
            if m and m.raw_data:
                return m.raw_data

        # 2. Match by machine_id
        if machine_id:
            m = db.query(MachineLog).filter(
                MachineLog.machine_id == machine_id
            ).order_by(MachineLog.id.desc()).first()
            if m and m.raw_data:
                return m.raw_data

        # 3. Match by session_id
        if session_id:
            m = db.query(MachineLog).filter(
                MachineLog.session_id == session_id
            ).order_by(MachineLog.id.desc()).first()
            if m and m.raw_data:
                return m.raw_data

        # 4. Fallback to latest machine in DB
        m = db.query(MachineLog).order_by(MachineLog.id.desc()).first()
        if m and m.raw_data:
            return m.raw_data

        # 5. DB is empty, auto-seed and return
        seed_default_machines(db)
        m = db.query(MachineLog).order_by(MachineLog.id.desc()).first()
        if m and m.raw_data:
            return m.raw_data

        raise HTTPException(status_code=404, detail="Machine not found")
    finally:
        db.close()
