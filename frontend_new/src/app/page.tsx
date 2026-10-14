"use client";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import UploadZone from "@/components/ui/UploadZone";
import MachineSelector from "@/components/ui/MachineSelector";
import MainDashboard from "@/components/MainDashboard";
import { uploadPDF } from "@/lib/api";

type AppState = "upload" | "select" | "dashboard";

export default function Home() {
  const [state, setState] = useState<AppState>("upload");
  const [sessionId, setSessionId] = useState("");
  const [machines, setMachines] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");


  // ✅ Automatically load stashed machine data from Control Room
  useEffect(() => {
    const cached = sessionStorage.getItem("pendingMachineData");
    if (cached) {
      try {
        const data = JSON.parse(cached);
        console.log("✅ Caught data from Control Room:", data); // Helpful for debugging
        
        setSessionId(data.session_id || "demo-session");
        
        // Handle variations in how the backend might nest the machines array
        const machinesArray = data.machines_detected || data.machines || [];
        setMachines(machinesArray);
        
        setState("select"); // Skip upload, go straight to selector
        
        // Clean up
        sessionStorage.removeItem("pendingMachineData"); 
      } catch (e) {
        console.error("Failed to parse cached machine data", e);
      }
    }
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true); setError("");
    try {
      const { data } = await uploadPDF(file);
      setSessionId(data.session_id);
      setMachines(data.machines_detected || []);
      setState("select");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Upload failed — verify backend is running on port 8000");
    } finally { setUploading(false); }
  }, []);

  const handleSelect = useCallback((m: any) => { setSelected(m); setState("dashboard"); }, []);
  const handleReset = () => { setState("upload"); setSessionId(""); setMachines([]); setSelected(null); };

  return (
    <main className="min-h-screen">
      {/* ── TOP NAVIGATION BAR ── */}
      <header className="app-header">
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          {/* Logo */}
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
            <rect x="1.5" y="1.5" width="31" height="31" rx="4" stroke="#3B82F6" strokeWidth="1.4"/>
            <rect x="7" y="7" width="20" height="20" rx="2" stroke="#3B82F6" strokeWidth="0.7" strokeOpacity="0.4"/>
            <circle cx="17" cy="17" r="5" fill="none" stroke="#3B82F6" strokeWidth="1.5"/>
            <circle cx="17" cy="17" r="2" fill="#3B82F6"/>
            <line x1="17" y1="1.5" x2="17" y2="7"  stroke="#3B82F6" strokeWidth="1.3"/>
            <line x1="17" y1="27" x2="17" y2="32.5" stroke="#3B82F6" strokeWidth="1.3"/>
            <line x1="1.5" y1="17" x2="7"  y2="17"  stroke="#3B82F6" strokeWidth="1.3"/>
            <line x1="27" y1="17" x2="32.5" y2="17" stroke="#3B82F6" strokeWidth="1.3"/>
          </svg>
          <div>
            <div style={{ fontFamily:"var(--f-cond)", fontSize:18, fontWeight:800, letterSpacing:"0.1em", color:"var(--t1)", lineHeight:1 }}>
              INDUSTRY<span style={{ color:"var(--blue)" }}>VERSE AI</span>
            </div>
            <div style={{ fontFamily:"var(--f-mono)", fontSize:10, color:"var(--t4)", letterSpacing:"0.13em", marginTop:2 }}>
              INDUSTRIAL INTELLIGENCE PLATFORM
            </div>
          </div>
          <div style={{ width:1, height:30, background:"var(--bd-1)", margin:"0 4px" }} />
          <span style={{ fontFamily:"var(--f-mono)", fontSize:11, color:"var(--t4)" }}>Gemini 2.5 Flash · 5 Core AI Models</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span className="pulse p-green" style={{ width:8, height:8, display:"inline-block" }} />
            <span style={{ fontFamily:"var(--f-mono)", fontSize:12, color:"var(--green)", letterSpacing:"0.1em" }}>SYSTEM NOMINAL</span>
          </div>
          <a href="/control-room" style={{ textDecoration:"none" }}>
            <button className="btn btn-primary" style={{ fontSize:13, padding:"7px 16px", gap:7 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
              </svg>
              Control Room
            </button>
          </a>
          {state !== "upload" && (
            <button onClick={handleReset} className="btn btn-secondary" style={{ fontSize:13, padding:"7px 14px" }}>
              ← New Scan
            </button>
          )}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {state === "upload" && (
          <motion.div key="upload" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.3 }}>
            <UploadZone onUpload={handleUpload} uploading={uploading} error={error} />
          </motion.div>
        )}
        {state === "select" && (
          <motion.div key="select" initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:0.35, ease:[0.16,1,0.3,1] }}>
            <MachineSelector machines={machines} onSelect={handleSelect} />
          </motion.div>
        )}
        {state === "dashboard" && selected && (
          <motion.div key="dash" initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.3 }}>
            <MainDashboard sessionId={sessionId} machine={selected} allMachines={machines} onChangeMachine={handleSelect} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}