import React, { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

interface TiltCardProps {
  tool: {
    id: string;
    title: string;
    desc: string;
    category?: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  };
  onClick: () => void;
  index: number;
}

export function TiltCard({ tool, onClick, index }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const IconComponent = tool.icon;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();

    // Mouse coordinates relative to card center
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate tilt degree (max ~8 degrees for subtle, elegant feel)
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    // Spotlight glow position in percentages
    const glowX = (x / rect.width) * 100;
    const glowY = (y / rect.height) * 100;

    setRotate({ x: rotateX, y: rotateY });
    setGlowPos({ x: glowX, y: glowY });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Smooth reset
    setRotate({ x: 0, y: 0 });
  };

  return (
    <div
      style={{ perspective: "1000px" }}
      className="w-full"
    >
      <div
        ref={cardRef}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isHovered
            ? `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) translateZ(12px)`
            : "rotateX(0deg) rotateY(0deg) translateZ(0px)",
          transition: isHovered
            ? "transform 0.1s ease-out"
            : "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)",
          transformStyle: "preserve-3d",
        }}
        className="group relative flex flex-col justify-between rounded-3xl border border-[#1e2a47] bg-[#0f172a] p-7 cursor-pointer overflow-hidden shadow-xl shadow-black/40 hover:border-indigo-500/50 hover:bg-[#111a2e] transition-colors duration-300 select-none"
      >
        {/* Dynamic Specular Light Glow tracking cursor position */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(circle 240px at ${glowPos.x}% ${glowPos.y}%, rgba(99, 102, 241, 0.18), transparent 70%)`,
          }}
        />

        {/* Top edge gradient reflection */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Card Content with 3D Pop (translateZ) */}
        <div style={{ transform: "translateZ(20px)" }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 group-hover:scale-110 group-hover:border-indigo-400/40 group-hover:bg-indigo-500/20 transition-all duration-300 shadow-lg shadow-indigo-600/10">
              <IconComponent size={22} className="drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
            </div>

            <span className="rounded-full border border-slate-700/60 bg-[#070b16] px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-slate-400">
              {tool.category || "General"}
            </span>
          </div>

          <h3 className="text-lg font-bold text-white tracking-tight mb-2 group-hover:text-indigo-200 transition-colors">
            {tool.title}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            {tool.desc}
          </p>
        </div>

        {/* Footer Button with 3D Pop */}
        <div
          style={{ transform: "translateZ(15px)" }}
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 group-hover:text-indigo-300 group-hover:gap-2.5 transition-all"
        >
          <span>Open Tool</span>
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
}