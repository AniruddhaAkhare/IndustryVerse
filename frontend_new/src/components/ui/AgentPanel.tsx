"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import HumanInTheLoop from "@/components/ui/HumanInTheLoop";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  agentName: string;
  fetchFn: () => Promise<any>;
  children: (data: any) => React.ReactNode;
  cacheKey?: string;

  // HITL integration
  agentType?: string;    // maps to HITL backend dispatch, defaults to "overview"
  sessionId?: string;    // needed for HITL refine call
  machineId?: string;    // needed for HITL refine call
}

// ─── Module-level in-memory cache and in-flight promise map ────────────────────
const CACHE: Record<string, any> = {};
const IN_FLIGHT: Record<string, Promise<any>> = {};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AgentPanel({
  agentName,
  fetchFn,
  children,
  cacheKey,
  agentType = "overview",
  sessionId = "",
  machineId = "",
}: Props) {
  const [data, setData] = useState<any>(cacheKey ? CACHE[cacheKey] : null);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState("");
  const [iteration, setIteration] = useState(0); // HITL iteration count

  // ── Initial fetch with in-flight deduplication ──────────────────────────────
  const load = useCallback(async () => {
    if (cacheKey && CACHE[cacheKey]) {
      setData(CACHE[cacheKey]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      let promise: Promise<any>;
      if (cacheKey && IN_FLIGHT[cacheKey]) {
        // Reuse ongoing in-flight request to prevent duplicate OPTIONS/POST calls
        promise = IN_FLIGHT[cacheKey];
      } else {
        promise = fetchFn();
        if (cacheKey) {
          IN_FLIGHT[cacheKey] = promise;
        }
      }

      const r = await promise;
      if (cacheKey) {
        CACHE[cacheKey] = r.data;
        delete IN_FLIGHT[cacheKey];
      }
      setData(r.data);
    } catch (e: any) {
      if (cacheKey) {
        delete IN_FLIGHT[cacheKey];
      }
      setError(e?.response?.data?.detail || "Agent failed — check backend connection.");
    } finally {
      setLoading(false);
    }
  }, [fetchFn, cacheKey]);

  useEffect(() => {
    if (!data) load();
  }, [data, load]);

  // ── HITL refinement handler ───────────────────────────────────────────────────
  const handleRefined = useCallback((refined: Record<string, any>) => {
    if (cacheKey) CACHE[cacheKey] = refined;
    setData(refined);
    setIteration((prev) => prev + 1);
  }, [cacheKey]);

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "90px 32px", gap: 20,
      }}>
        <div className="spinner" />
        <div style={{ textAlign: "center" }}>
          <p style={{
            fontFamily: "var(--f-sans)", fontSize: 16, fontWeight: 600,
            color: "var(--t2)", marginBottom: 6,
          }}>
            {agentName}
          </p>
          <p style={{
            fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--t4)"
          }}>
            Querying Gemini 2.5 Flash with ChromaDB context...
          </p>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{
          background: "var(--r-mute)",
          border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 8,
          padding: "20px 24px",
        }}>
          <p style={{
            fontFamily: "var(--f-sans)", fontSize: 15, fontWeight: 600,
            color: "var(--red)", marginBottom: 8,
          }}>
            Agent Error
          </p>
          <p style={{
            fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--t3)", marginBottom: 14
          }}>
            {error}
          </p>
          <button onClick={load} className="btn btn-secondary" style={{ fontSize: 13 }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // ── Determine if HITL panel should be shown ────────────────────────────────────
  const showHITL = sessionId && machineId && agentType;

  // ── Success state with optional HITL panel ───────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="fade-up"
      style={{
        display: showHITL ? "flex" : "block",
        gap: showHITL ? 20 : undefined,
        alignItems: "flex-start",
        padding: showHITL ? "0" : undefined,
      }}
    >
      {/* LEFT: agent output */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {children(data)}
      </div>

      {/* RIGHT: HITL panel */}
      {showHITL && (
        <HumanInTheLoop
          sessionId={sessionId}
          machineId={machineId}
          agentType={agentType}
          currentResponse={data}
          onRefined={handleRefined}
          iterationCount={iteration}
        />
      )}
    </motion.div>
  );
}