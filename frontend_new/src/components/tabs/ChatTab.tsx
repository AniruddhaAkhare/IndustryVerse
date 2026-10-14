"use client";
import { useState, useRef, useEffect } from "react";
import { sendChat } from "@/lib/api";

interface Props { sessionId: string; machineId: string; machineName: string; }

interface Message { role: "user" | "assistant"; content: string; }

const SUGGESTED = [
  "What is the current health status of this machine?",
  "When should I schedule the next maintenance?",
  "What are the main failure risks?",
  "How can I reduce downtime costs?",
  "What spare parts should I stock?",
];

export default function ChatTab({ sessionId, machineId, machineName }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: `Hello! I am Industry Verse AI's assistant specialized in industrial machinery analysis. I have full context on **${machineName}** — ask me anything about its health, failures, maintenance, costs, or digital twin simulation.` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (msg: string) => {
    if (!msg.trim() || loading) return;
    const userMsg: Message = { role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const { data } = await sendChat(sessionId, machineId, msg, messages);
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠ Connection error. Please ensure the backend is running." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
              msg.role === "user"
                ? "bg-cyan-500/15 border border-cyan-500/30 text-white"
                : "glass-panel text-metal-100"
            }`}>
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                  <span className="text-xs font-mono text-cyan-400/70">INDUSTRY VERSE AI</span>
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="glass-panel rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                <span className="text-xs font-mono text-cyan-400/70">THINKING...</span>
              </div>
              <div className="flex gap-1 mt-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 bg-cyan-400/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length <= 2 && (
        <div className="px-6 pb-3">
          <p className="text-xs font-mono text-metal-300 mb-2">SUGGESTED QUESTIONS:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((s, i) => (
              <button key={i} onClick={() => send(s)} className="text-xs font-mono text-cyan-400/70 border border-cyan-500/20 bg-cyan-500/5 px-3 py-1.5 rounded-lg hover:bg-cyan-500/15 hover:text-cyan-400 transition-all">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-cyan-500/10 bg-forge-900/50">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send(input)}
            placeholder={`Ask anything about ${machineName}...`}
            className="flex-1 bg-forge-700/50 border border-metal-700/50 text-metal-100 text-sm px-4 py-3 rounded-xl font-mono placeholder-metal-500 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="px-5 py-3 bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 font-mono text-sm rounded-xl hover:bg-cyan-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            SEND →
          </button>
        </div>
      </div>
    </div>
  );
}