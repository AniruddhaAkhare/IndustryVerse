"use client";
/**
 * HumanInTheLoop.tsx
 * ═══════════════════
 * Floating dialogue panel that appears after every AI agent response.
 *
 * UX flow:
 *  1. Agent response renders  →  HITL panel slides in from the right
 *  2. "Is this response correct?"  →  YES / NO buttons
 *  3. YES → panel closes with success animation, loop ends
 *  4. NO  → correction textarea expands
 *  5. Human types correction → "Resubmit to Agent" button
 *  6. Panel enters loading state while Gemini re-runs
 *  7. NEW response replaces old one, loop restarts from step 1
 *
 * Props:
 *   sessionId       — passed to backend
 *   machineId       — passed to backend
 *   agentType       — maps to backend AGENT_META dispatch table
 *   currentResponse — the last JSON the agent produced (mutable)
 *   onRefined       — callback: receives refined response, replaces current
 *   iterationCount  — current loop count (displayed to user)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { refineWithHITL } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Props {
  sessionId:       string;
  machineId:       string;
  agentType:       string;
  currentResponse: Record<string, any>;
  onRefined:       (refined: Record<string, any>) => void;
  iterationCount:  number;
}

type PanelState = "question" | "correcting" | "refining" | "accepted" | "closed";

const AGENT_LABELS: Record<string, string> = {
  failure:     "Failure Prediction",
  rootcause:   "Root Cause Analysis",
  maintenance: "Maintenance Planner",
  cost:        "Cost Analysis",
  digitaltwin: "Digital Twin",
  overview:    "Overview",
  chat:        "Chat Assistant",
  "3dview":    "3D Blueprint",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function HumanInTheLoop({
  sessionId,
  machineId,
  agentType,
  currentResponse,
  onRefined,
  iterationCount,
}: Props) {
  const [state,      setState]      = useState<PanelState>("question");
  const [correction, setCorrection] = useState("");
  const [error,      setError]      = useState("");
  const [charCount,  setCharCount]  = useState(0);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const agentLabel   = AGENT_LABELS[agentType] || agentType;
  const isRefinement = iterationCount > 0;

  // Auto-focus textarea when correction mode opens
  useEffect(() => {
    if (state === "correcting") {
      setTimeout(() => textareaRef.current?.focus(), 120);
    }
  }, [state]);

  // Auto-close after acceptance
  useEffect(() => {
    if (state === "accepted") {
      const t = setTimeout(() => setState("closed"), 2800);
      return () => clearTimeout(t);
    }
  }, [state]);

  // Reset when a new response comes in
  useEffect(() => {
    setState("question");
    setCorrection("");
    setError("");
  }, [currentResponse]);

  const handleYes = useCallback(() => {
    setState("accepted");
  }, []);

  const handleNo = useCallback(() => {
    setState("correcting");
  }, []);

  const handleCorrectionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCorrection(e.target.value);
    setCharCount(e.target.value.length);
  };

  const handleSubmitCorrection = useCallback(async () => {
    const trimmed = correction.trim();
    if (!trimmed) {
      setError("Please describe what needs to be corrected.");
      return;
    }
    if (trimmed.length < 10) {
      setError("Please provide more detail so the agent can make accurate corrections.");
      return;
    }

    setError("");
    setState("refining");

    try {
      const { data } = await refineWithHITL(
        sessionId,
        machineId,
        agentType,
        currentResponse,
        trimmed,
      );
      onRefined(data);
      // state resets via the useEffect on currentResponse change
    } catch (e: any) {
      setState("correcting");
      setError(
        e?.response?.data?.detail ||
        "Refinement failed — check backend connection and try again."
      );
    }
  }, [correction, sessionId, machineId, agentType, currentResponse, onRefined]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSubmitCorrection();
    }
  };

  if (state === "closed") return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`hitl-${iterationCount}-${state}`}
        initial={{ opacity: 0, x: 32, scale: 0.97 }}
        animate={{ opacity: 1, x: 0,  scale: 1    }}
        exit={{    opacity: 0, x: 32, scale: 0.97  }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position:     "sticky",
          top:           80,
          alignSelf:    "flex-start",
          width:         340,
          flexShrink:    0,
          background:   "var(--bg-2)",
          border:       `1px solid ${
            state === "accepted"   ? "rgba(34,197,94,0.4)"   :
            state === "correcting" ||
            state === "refining"   ? "rgba(245,158,11,0.35)" :
            "var(--bd-2)"
          }`,
          borderRadius:  10,
          overflow:     "hidden",
          boxShadow:    "0 8px 32px rgba(0,0,0,0.35)",
          zIndex:        50,
        }}
      >
        {/* ── Header strip ── */}
        <div style={{
          padding:        "10px 16px",
          background:     state === "accepted"   ? "rgba(34,197,94,0.08)"   :
                          state === "correcting" ||
                          state === "refining"   ? "rgba(245,158,11,0.07)"  :
                          "var(--bg-3)",
          borderBottom:   "1px solid var(--bd-1)",
          display:        "flex",
          alignItems:     "center",
          gap:             10,
        }}>
          {/* Status icon */}
          <StatusIcon state={state} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily:    "var(--f-mono)",
              fontSize:       10,
              fontWeight:     600,
              letterSpacing: "0.16em",
              color:
                state === "accepted"   ? "var(--green)"  :
                state === "correcting" ||
                state === "refining"   ? "var(--amber)"  :
                "var(--blue-light)",
              textTransform: "uppercase",
              marginBottom:   1,
            }}>
              {state === "accepted"   ? "✓ Response Accepted"  :
               state === "refining"   ? "Refining with Gemini" :
               state === "correcting" ? "Provide Correction"   :
               "Human-in-the-Loop Review"}
            </p>
            <p style={{
              fontFamily: "var(--f-sans)",
              fontSize:    11,
              color:       "var(--t4)",
              overflow:   "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {agentLabel}
              {isRefinement && (
                <span style={{ marginLeft: 7, color: "var(--blue-light)", opacity: 0.7 }}>
                  · revision {iterationCount}
                </span>
              )}
            </p>
          </div>

          {/* Close — only shown when not loading */}
          {state !== "refining" && state !== "accepted" && (
            <button
              onClick={() => setState("closed")}
              title="Dismiss"
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--t5)", fontSize: 16, lineHeight: 1, padding: "2px 4px",
                flexShrink: 0,
              }}>
              ×
            </button>
          )}
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "16px" }}>

          {/* Question state */}
          {state === "question" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}>
              <p style={{
                fontFamily: "var(--f-sans)", fontSize: 15, fontWeight: 500,
                color: "var(--t1)", marginBottom: 6, lineHeight: 1.45,
              }}>
                Is this response correct?
              </p>
              <p style={{
                fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--t4)",
                marginBottom: 18, lineHeight: 1.55,
              }}>
                Review the analysis above. If anything is inaccurate or missing,
                click <strong style={{ color: "var(--amber)" }}>No</strong> to
                provide a correction.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleYes}
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: "center", fontSize: 13, padding: "9px 0" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Yes, looks correct
                </button>
                <button
                  onClick={handleNo}
                  className="btn btn-secondary"
                  style={{ flex: 1, justifyContent: "center", fontSize: 13, padding: "9px 0",
                    borderColor: "rgba(245,158,11,0.35)", color: "var(--amber)" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6"  y2="18"/>
                    <line x1="6"  y1="6" x2="18" y2="18"/>
                  </svg>
                  No, needs fix
                </button>
              </div>
            </motion.div>
          )}

          {/* Correcting state */}
          {(state === "correcting" || state === "refining") && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}>
              <p style={{
                fontFamily: "var(--f-sans)", fontSize: 14, fontWeight: 500,
                color: "var(--t1)", marginBottom: 10,
              }}>
                What needs to be corrected?
              </p>
              <p style={{
                fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--t4)",
                marginBottom: 12, lineHeight: 1.6,
              }}>
                Describe the issue clearly. The agent will revise its entire
                response incorporating your feedback.
              </p>

              <div style={{ position: "relative" }}>
                <textarea
                  ref={textareaRef}
                  value={correction}
                  onChange={handleCorrectionChange}
                  onKeyDown={handleKeyDown}
                  disabled={state === "refining"}
                  placeholder={
                    "e.g. The failure probability seems too high. The vibration sensor is within normal range for this machine type, which suggests bearing wear is unlikely..."
                  }
                  rows={5}
                  className="field"
                  style={{
                    resize:  "vertical",
                    minHeight: 100,
                    maxHeight: 260,
                    fontSize:  13,
                    lineHeight: 1.65,
                    padding:  "10px 12px",
                    opacity: state === "refining" ? 0.5 : 1,
                  }}
                />
                <span style={{
                  position: "absolute", bottom: 8, right: 10,
                  fontFamily: "var(--f-mono)", fontSize: 10,
                  color: charCount > 800 ? "var(--red)" : "var(--t5)",
                }}>
                  {charCount}/1000
                </span>
              </div>

              {/* Error */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--red)",
                    marginTop: 8, background: "var(--r-mute)",
                    border: "1px solid rgba(239,68,68,0.2)", borderRadius: 5,
                    padding: "7px 10px", lineHeight: 1.5,
                  }}>
                  {error}
                </motion.p>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                {state === "refining" ? (
                  <div style={{
                    flex: 1, display: "flex", alignItems: "center",
                    justifyContent: "center", gap: 12,
                    padding: "10px 0",
                    background: "var(--blue-muted)",
                    border: "1px solid rgba(59,130,246,0.25)",
                    borderRadius: 6,
                  }}>
                    <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}/>
                    <span style={{ fontFamily: "var(--f-mono)", fontSize: 12,
                      color: "var(--blue-light)", letterSpacing: "0.1em" }}>
                      REFINING WITH GEMINI…
                    </span>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => { setState("question"); setCorrection(""); setError(""); }}
                      className="btn btn-secondary"
                      style={{ fontSize: 13, padding: "9px 14px" }}>
                      ← Back
                    </button>
                    <button
                      onClick={handleSubmitCorrection}
                      disabled={!correction.trim() || correction.length > 1000}
                      className="btn btn-primary"
                      style={{ flex: 1, justifyContent: "center", fontSize: 13, padding: "9px 0" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="white" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="17 1 21 5 17 9"/>
                        <path d="M3 11V9a4 4 0 014-4h14"/>
                        <polyline points="7 23 3 19 7 15"/>
                        <path d="M21 13v2a4 4 0 01-4 4H3"/>
                      </svg>
                      Submit to Agent
                    </button>
                  </>
                )}
              </div>

              <p style={{
                fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--t5)",
                marginTop: 10, textAlign: "center",
              }}>
                Ctrl+Enter to submit
              </p>
            </motion.div>
          )}

          {/* Accepted state */}
          {state === "accepted" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1    }}
              transition={{ duration: 0.3 }}
              style={{ textAlign: "center", padding: "10px 0" }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 12px",
                }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </motion.div>
              <p style={{ fontFamily: "var(--f-sans)", fontSize: 15, fontWeight: 600,
                color: "var(--green)", marginBottom: 5 }}>
                Response Accepted
              </p>
              <p style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--t4)" }}>
                {isRefinement
                  ? `Finalised after ${iterationCount} correction${iterationCount > 1 ? "s" : ""}`
                  : "Analysis confirmed by human reviewer"}
              </p>
              {/* Progress bar auto-close indicator */}
              <div style={{ marginTop: 16, height: 2,
                background: "rgba(255,255,255,0.07)", borderRadius: 1, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 2.6, ease: "linear" }}
                  style={{ height: "100%", background: "var(--green)" }}/>
              </div>
            </motion.div>
          )}

        </div>

        {/* ── Iteration history badge ── */}
        {iterationCount > 0 && state !== "accepted" && (
          <div style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--bd-1)",
            display: "flex", alignItems: "center", gap: 7,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="var(--t5)" strokeWidth="2" strokeLinecap="round">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-3.62"/>
            </svg>
            <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--t5)" }}>
              {iterationCount} revision{iterationCount > 1 ? "s" : ""} applied
            </span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Status icon ─────────────────────────────────────────────────────────────
function StatusIcon({ state }: { state: PanelState }) {
  if (state === "accepted") {
    return (
      <div style={{ width: 28, height: 28, borderRadius: "50%",
        background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    );
  }
  if (state === "refining") {
    return (
      <div style={{ width: 28, height: 28, display: "flex",
        alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}/>
      </div>
    );
  }
  if (state === "correcting") {
    return (
      <div style={{ width: 28, height: 28, borderRadius: "50%",
        background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="var(--amber)" strokeWidth="2.5" strokeLinecap="round">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </div>
    );
  }
  // question state
  return (
    <motion.div
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      style={{ width: 28, height: 28, borderRadius: "50%",
        background: "var(--blue-muted)", border: "1px solid rgba(59,130,246,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="var(--blue-light)" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </motion.div>
  );
}
