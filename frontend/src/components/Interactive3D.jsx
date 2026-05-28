import React, { useRef, useState } from "react";
import { Database, Cpu, MessageSquare, Sparkles } from "lucide-react";

export const Interactive3D = () => {
  const containerRef = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5
    setCoords({ x, y });
  };

  const handleMouseLeave = () => {
    setCoords({ x: 0, y: 0 });
  };

  // Compute 3D rotations based on normalized cursor position
  const rotateX = 58 - coords.y * 22; // Natural tilt + cursor reaction
  const rotateZ = -40 + coords.x * 22;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full h-full min-h-[480px] flex items-center justify-center relative overflow-visible bg-transparent select-none"
      style={{
        perspective: "1200px",
      }}
    >
      {/* 3D Scene Wrapper */}
      <div
        className="relative w-[420px] h-[400px] flex items-center justify-center"
        style={{
          transform: `rotateX(${rotateX}deg) rotateZ(${rotateZ}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 0.18s ease-out",
        }}
      >
        {/* ==========================================
            VERTICAL CONNECTING LASER LINES (Z-AXIS)
            Card Width: 420px (210px offsets)
            Card Height: 252px (126px offsets)
            Z Span: -160px to 160px (320px tall ray)
           ========================================== */}
        {/* Top-Left Corner Ray */}
        <div
          className="absolute w-[1px] h-[320px] bg-gradient-to-t from-neutral-800/10 via-neutral-400/30 to-neutral-800/10 origin-bottom"
          style={{
            transform: "rotateX(-90deg) translate3d(-210px, -160px, 126px)",
            transformStyle: "preserve-3d",
            bottom: 0,
          }}
        >
          {/* Flowing Data Pulse */}
          <div className="absolute w-[6px] h-[6px] rounded-full bg-white shadow-[0_0_8px_#ffffff] left-[-2.5px] origin-center animate-data-flow" />
        </div>

        {/* Top-Right Corner Ray */}
        <div
          className="absolute w-[1px] h-[320px] bg-gradient-to-t from-neutral-800/10 via-neutral-400/30 to-neutral-800/10 origin-bottom"
          style={{
            transform: "rotateX(-90deg) translate3d(210px, -160px, 126px)",
            transformStyle: "preserve-3d",
            bottom: 0,
          }}
        >
          <div className="absolute w-[6px] h-[6px] rounded-full bg-neutral-300 shadow-[0_0_8px_rgba(255,255,255,0.7)] left-[-2.5px] origin-center animate-data-flow" style={{ animationDelay: "1s" }} />
        </div>

        {/* Bottom-Left Corner Ray */}
        <div
          className="absolute w-[1px] h-[320px] bg-gradient-to-t from-neutral-800/10 via-neutral-400/30 to-neutral-800/10 origin-bottom"
          style={{
            transform: "rotateX(-90deg) translate3d(-210px, -160px, -126px)",
            transformStyle: "preserve-3d",
            bottom: 0,
          }}
        >
          <div className="absolute w-[6px] h-[6px] rounded-full bg-neutral-300 shadow-[0_0_8px_rgba(255,255,255,0.7)] left-[-2.5px] origin-center animate-data-flow" style={{ animationDelay: "1.8s" }} />
        </div>

        {/* Bottom-Right Corner Ray */}
        <div
          className="absolute w-[1px] h-[320px] bg-gradient-to-t from-neutral-800/10 via-neutral-400/30 to-neutral-800/10 origin-bottom"
          style={{
            transform: "rotateX(-90deg) translate3d(210px, -160px, -126px)",
            transformStyle: "preserve-3d",
            bottom: 0,
          }}
        >
          <div className="absolute w-[6px] h-[6px] rounded-full bg-white shadow-[0_0_8px_#ffffff] left-[-2.5px] origin-center animate-data-flow" style={{ animationDelay: "0.5s" }} />
        </div>

        {/* ==========================================
            LAYER 1: VECTOR STORAGE (BOTTOM)
           ========================================== */}
        <div
          className="absolute w-[420px] h-[252px] p-4 flex flex-col justify-between"
          style={{
            transform: "translateZ(-160px)",
            transformStyle: "preserve-3d",
          }}
        >
          <div className="flex items-center justify-between border-b border-dashed border-neutral-800/40 pb-2">
            <div className="flex items-center gap-2">
              <Database className="w-4.5 h-4.5 text-neutral-400" />
              <span className="text-[11px] font-semibold text-neutral-300 tracking-wider">VECTOR STORAGE</span>
            </div>
            <span className="text-[9px] text-neutral-500 font-mono">DB_CONNECTED</span>
          </div>

          {/* Glowing Vector Grid */}
          <div className="grid grid-cols-8 gap-3 my-2 flex-grow justify-items-center items-center px-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-800/50 relative"
              >
                {/* Randomly pulse nodes */}
                {i % 4 === 0 && (
                  <div className="absolute inset-0 rounded-full bg-white/30 animate-ping opacity-60" />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center text-[9px] text-neutral-500 font-mono">
            <span>INDEX: cosine_similarity</span>
            <span>SHARDS: 3/3</span>
          </div>
        </div>

        {/* ==========================================
            LAYER 2: GEMINI RAG CORE (MIDDLE)
           ========================================== */}
        <div
          className="absolute w-[420px] h-[252px] p-4 flex flex-col justify-between animate-float-slow"
          style={{
            transform: "translateZ(0px)",
            transformStyle: "preserve-3d",
          }}
        >
          <div className="flex items-center justify-between border-b border-dashed border-neutral-800/40 pb-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4.5 h-4.5 text-neutral-400" />
              <span className="text-[11px] font-semibold text-neutral-300 tracking-wider">GEMINI RAG CORE</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse" />
              <span className="text-[9px] text-neutral-400 font-mono">ACTIVE</span>
            </div>
          </div>

          {/* Schematic SVG Nodes */}
          <div className="relative w-full h-24 flex items-center justify-center">
            <svg className="absolute w-full h-full" viewBox="0 0 320 80">
              <path
                d="M 30,40 L 110,20 L 210,20 L 290,40 M 30,40 L 110,60 L 210,60 L 290,40 M 110,20 L 110,60 M 210,20 L 210,60"
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="1"
              />
              <path
                d="M 30,40 L 110,20 L 210,20 L 290,40"
                fill="none"
                stroke="url(#gray-grad)"
                strokeWidth="1.5"
                strokeDasharray="40 180"
                strokeDashoffset="0"
                className="animate-dash"
              />
              <path
                d="M 290,40 L 210,60 L 110,60 L 30,40"
                fill="none"
                stroke="url(#gray-grad-reverse)"
                strokeWidth="1.5"
                strokeDasharray="50 190"
                strokeDashoffset="90"
                className="animate-dash"
              />
              <defs>
                <linearGradient id="gray-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#52525b" stopOpacity="0.1" />
                </linearGradient>
                <linearGradient id="gray-grad-reverse" x1="100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#d4d4d8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#27272a" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <circle cx="30" cy="40" r="3.5" fill="#ffffff" className="animate-pulse" />
              <circle cx="110" cy="20" r="3" fill="#a3a3a3" />
              <circle cx="110" cy="60" r="3" fill="#52525b" />
              <circle cx="210" cy="20" r="3" fill="#52525b" />
              <circle cx="210" cy="60" r="3" fill="#a3a3a3" />
              <circle cx="290" cy="40" r="3.5" fill="#ffffff" className="animate-pulse" />
            </svg>
          </div>

          <div className="flex justify-between items-center text-[9px] text-neutral-500 font-mono">
            <span>RAG_LOOKUP: <span className="text-neutral-300">PASSED</span></span>
            <span>LATENCY: 12ms</span>
          </div>
        </div>

        {/* ==========================================
            LAYER 3: INTERACTIVE CHAT (TOP)
           ========================================== */}
        <div
          className="absolute w-[420px] h-[252px] p-4 flex flex-col justify-between"
          style={{
            transform: "translateZ(160px)",
            transformStyle: "preserve-3d",
          }}
        >
          <div className="flex items-center justify-between border-b border-dashed border-neutral-800/40 pb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4.5 h-4.5 text-neutral-400" />
              <span className="text-[11px] font-semibold text-neutral-300 tracking-wider">AI INTERACTIVE</span>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-neutral-400 animate-spin-slow" />
          </div>

          {/* Mini Interactive Chat Bubble */}
          <div className="flex flex-col gap-3 my-2 flex-grow justify-center px-4">
            {/* User message */}
            <div
              className="bg-neutral-950 border border-neutral-850 rounded-xl px-4 py-2 text-[10px] text-neutral-200 self-start max-w-[80%]"
              style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}
            >
              How do I view my grades?
            </div>
            {/* Bot message */}
            <div
              className="bg-neutral-900/60 border border-neutral-800/40 rounded-xl px-4 py-2 text-[10px] text-neutral-300 self-end max-w-[80%] text-right relative overflow-hidden"
              style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" style={{ backgroundSize: "200% 100%" }} />
              Log in to the pupil portal.
            </div>
          </div>

          <div className="flex justify-between items-center text-[9px] text-neutral-500 font-mono">
            <span>MODEL: Gemini-1.5-Pro</span>
            <span className="text-neutral-400 font-semibold">ONLINE</span>
          </div>
        </div>
      </div>

      {/* Global CSS Inject for animations */}
      <style>{`
        @keyframes data-flow {
          0% { top: 0px; opacity: 0; transform: scale(0.6); }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 320px; opacity: 0; transform: scale(1); }
        }
        .animate-data-flow {
          position: absolute;
          animation: data-flow 2.8s infinite linear;
        }
        @keyframes dash {
          to {
            stroke-dashoffset: -220;
          }
        }
        .animate-dash {
          animation: dash 5.5s linear infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
        @keyframes float-slow {
          0%, 100% { transform: translateZ(0px) translateY(0px); }
          50% { transform: translateZ(0px) translateY(-8px); }
        }
        .animate-float-slow {
          animation: float-slow 4.2s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 2.5s infinite linear;
        }
      `}</style>
    </div>
  );
};
