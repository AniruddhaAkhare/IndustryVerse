"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TabNav from "@/components/ui/TabNav";
import OverviewTab from "@/components/tabs/OverviewTab";
import FailureTab from "@/components/tabs/FailureTab";
import RootCauseTab from "@/components/tabs/RootCauseTab";
import MaintenanceTab from "@/components/tabs/MaintenanceTab";
import CostTab from "@/components/tabs/CostTab";
import DigitalTwinTab from "@/components/tabs/DigitalTwinTab";
import View3DTab from "@/components/tabs/View3DTab";
import ChatTab from "@/components/tabs/ChatTab";

const TABS = [
  { id: "overview",    label: "Overview",             icon: "◎" },
  { id: "failure",     label: "Failure Prediction",   icon: "▲" },
  { id: "rootcause",   label: "Root Cause Analysis",  icon: "◉" },
  { id: "maintenance", label: "Maintenance Plan",     icon: "⊕" },
  { id: "cost",        label: "Cost Planning",        icon: "◈" },
  { id: "digitaltwin", label: "Digital Twin",         icon: "⬡" },
  { id: "3dview",      label: "3D Simulation",        icon: "⬢" },
  { id: "chat",        label: "AI RAG Chat",          icon: "▣" },
];

interface Props {
  sessionId: string;
  machine: any;
  allMachines: any[];
  onChangeMachine: (m: any) => void;
}

export default function MainDashboard({ sessionId, machine, allMachines, onChangeMachine }: Props) {
  const [tab, setTab] = useState("overview");
  const s = sessionId, m = machine.machine_id, n = machine.machine_name;

  const renderTab = () => {
    switch(tab) {
      case "overview":    return <OverviewTab machine={machine} />;
      case "failure":     return <FailureTab sessionId={s} machineId={m} />;
      case "rootcause":   return <RootCauseTab sessionId={s} machineId={m} />;
      case "maintenance": return <MaintenanceTab sessionId={s} machineId={m} />;
      case "cost":        return <CostTab sessionId={s} machineId={m} />;
      case "digitaltwin": return <DigitalTwinTab sessionId={s} machineId={m} />;
      case "3dview":      return <View3DTab sessionId={s} machineId={m} machineName={n} machineType={machine.machine_type} />;
      case "chat":        return <ChatTab sessionId={s} machineId={m} machineName={n} />;
      default:            return <OverviewTab machine={machine} />;
    }
  };

  return (
    <div>
      {allMachines.length > 1 && (
        <div className="mbar">
          <span style={{ fontFamily:"var(--f-mono)", fontSize:11, color:"var(--t4)", padding:"0 18px", flexShrink:0 }}>UNITS</span>
          <div style={{ width:1, height:26, background:"var(--bd-1)" }} />
          {allMachines.map(mc => (
            <button key={mc.machine_id} onClick={() => onChangeMachine(mc)}
              className={`mbar-btn ${mc.machine_id === machine.machine_id ? "active" : ""}`}>
              {mc.machine_id === machine.machine_id && <span className="pulse p-green" style={{ width:6, height:6, display:"inline-block" }} />}
              {mc.machine_name}
            </button>
          ))}
        </div>
      )}
      <div className="ibar">
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <span className="pulse p-green" style={{ width:9, height:9, display:"inline-block" }} />
          <span style={{ fontFamily:"var(--f-sans)", fontSize:17, fontWeight:600, color:"var(--t1)" }}>{machine.machine_name}</span>
          <span style={{ fontFamily:"var(--f-mono)", fontSize:12, color:"var(--t4)" }}>{machine.machine_type} · {machine.machine_id}</span>
        </div>
        <span style={{ fontFamily:"var(--f-mono)", fontSize:11, color:"var(--t4)" }}>SESSION: {sessionId.slice(0,12).toUpperCase()}···</span>
      </div>
      <TabNav tabs={TABS} activeTab={tab} onTabChange={setTab} />
      <div style={{ maxWidth:1400, margin:"0 auto", paddingBottom:80 }}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:0.22 }}>
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
