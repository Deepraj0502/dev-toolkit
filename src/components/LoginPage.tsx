import React, { useState } from "react";
import {
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Terminal,
  Cpu,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface LoginPageProps {
  onLogin?: (username: string, password: string) => void;
  onRequestProvisioning?: () => void;
  onForgotPassword?: () => void;
}

export function LoginPage({
  onLogin,
  onRequestProvisioning,
}: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!username.trim() || !password) return;

    setIsLoading(true);
    setTimeout(() => {
      onLogin?.(username, password);
      setIsLoading(false);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-[#070b16] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden px-4 py-8">
      
      {/* ── CSS Keyframe Animations for Glassmorphism & Background ── */}
      <style>{`
        @keyframes pulseSlow {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.28; }
          50% { transform: translate(35px, -30px) scale(1.12); opacity: 0.42; }
        }
        @keyframes floatReverse {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.22; }
          50% { transform: translate(-40px, 35px) scale(1.15); opacity: 0.35; }
        }
        @keyframes floatCyan {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; }
          50% { transform: translate(30px, 40px) scale(1.08); opacity: 0.28; }
        }
        @keyframes shimmerBorder {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-orb-indigo {
          animation: pulseSlow 14s ease-in-out infinite;
        }
        .animate-orb-blue {
          animation: floatReverse 18s ease-in-out infinite;
        }
        .animate-orb-cyan {
          animation: floatCyan 16s ease-in-out infinite;
        }
      `}</style>

      {/* ── Dynamic Ambient Background ─────────────────────────────── */}
      {/* Interactive Floating Gradient Orbs */}
      <div className="pointer-events-none absolute -top-24 -left-20 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-400 blur-[140px] animate-orb-indigo" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-[550px] w-[550px] rounded-full bg-gradient-to-br from-blue-700 via-indigo-800 to-indigo-950 blur-[150px] animate-orb-blue" />
      <div className="pointer-events-none absolute top-1/2 left-1/4 -translate-y-1/2 h-[380px] w-[380px] rounded-full bg-cyan-600/20 blur-[130px] animate-orb-cyan" />

      {/* High-Tech Grid Overlay with Vignette */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: "36px 36px"
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-radial-vignette opacity-70" />

      {/* Ambient Floating Micro-Particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[18%] left-[22%] h-1 w-1 rounded-full bg-indigo-400/50 animate-ping" />
        <div className="absolute top-[32%] right-[28%] h-1.5 w-1.5 rounded-full bg-cyan-400/40 animate-pulse" />
        <div className="absolute bottom-[24%] left-[30%] h-1 w-1 rounded-full bg-indigo-300/40 animate-pulse" />
        <div className="absolute bottom-[35%] right-[20%] h-1 w-1 rounded-full bg-blue-400/50 animate-ping" />
      </div>

      <div className="relative z-10 w-full max-w-[430px] flex flex-col items-center">

        {/* ── Brand Logo Header ─────────────────────────────────────── */}
        <div className="flex items-center gap-3.5 mb-8 group cursor-default">
          <div className="relative flex h-13 w-13 items-center justify-center rounded-2xl p-[1px] shadow-2xl shadow-indigo-500/30 transition-transform duration-300 group-hover:scale-105">
            {/* Animated Gradient Edge */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 animate-pulse opacity-80" />
            <div className="relative flex h-full w-full items-center justify-center rounded-[15px] bg-[#0c1222]/90 backdrop-blur-md">
              <ShieldCheck className="h-6 w-6 text-indigo-300 drop-shadow-[0_0_10px_rgba(165,180,252,0.8)]" />
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-wider text-white">
                DEV TOOLS
              </span>
              <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-2.5 py-0.5 text-[9px] font-bold tracking-widest text-indigo-300 uppercase shadow-sm">
                v2.6
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-400 tracking-wide">
              API &amp; Middleware Operations Suite
            </span>
          </div>
        </div>

        {/* ── Frosted Glassmorphism Card Container ──────────────────── */}
        <div className="relative w-full rounded-3xl p-[1px] shadow-2xl shadow-black/80 transition-all duration-300 group/card">
          
          {/* Animated Glass Glow Border Outline */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-indigo-500/40 via-[#1e2a47]/60 to-indigo-900/20 pointer-events-none group-hover/card:from-indigo-400/60 transition-colors" />

          {/* Actual Card Body with Ultra-Blur Backdrop */}
          <div className="relative w-full rounded-3xl bg-[#0c1427]/75 backdrop-blur-2xl p-8 sm:p-9 overflow-hidden">
            
            {/* Glass Specular Reflection Highlight */}
            <div className="absolute -top-28 -right-28 h-60 w-60 rounded-full bg-white/[0.04] blur-2xl pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />

            {/* Header section inside card */}
            <div className="mb-7">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>System Access</span>
                  <Sparkles className="h-4 w-4 text-indigo-400/80 animate-pulse" />
                </h1>
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 shadow-sm shadow-emerald-950/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Gateway Online
                </div>
              </div>
              <p className="text-xs text-slate-300/80 leading-relaxed">
                Enter your developer credentials to initialize an authenticated workspace session.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Username Input */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2 ml-1">
                  Username
                </label>
                <div className="group/input relative">
                  <User
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors"
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. dev_admin"
                    autoComplete="username"
                    className="w-full rounded-2xl border border-white/10 bg-[#070b16]/70 py-3.5 pl-11 pr-4 text-xs font-mono text-slate-100 placeholder:text-slate-600 outline-none backdrop-blur-md transition-all duration-200 focus:border-indigo-500/80 focus:bg-[#070b16]/90 focus:ring-2 focus:ring-indigo-500/30 shadow-inner"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-2 ml-1">
                  <label className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Password
                  </label>
                </div>
                <div className="group/input relative">
                  <Lock
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-white/10 bg-[#070b16]/70 py-3.5 pl-11 pr-11 text-xs font-mono text-slate-100 placeholder:text-slate-600 outline-none backdrop-blur-md transition-all duration-200 focus:border-indigo-500/80 focus:bg-[#070b16]/90 focus:ring-2 focus:ring-indigo-500/30 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-all cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !username || !password}
                  className="group relative w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 text-white font-semibold text-xs tracking-wide shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-all duration-200 cursor-pointer overflow-hidden border border-white/20"
                >
                  {/* Sheen sweep animation */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform ease-out pointer-events-none" />

                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Authorizing Session...</span>
                    </div>
                  ) : (
                    <>
                      <span>Initialize Login</span>
                      <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Optional Provisioning Link */}
            {onRequestProvisioning && (
              <div className="mt-6 pt-5 border-t border-white/[0.08] text-center">
                <button
                  type="button"
                  onClick={onRequestProvisioning}
                  className="text-xs text-slate-400 hover:text-indigo-300 transition-colors font-medium cursor-pointer"
                >
                  Need environment access?{" "}
                  <span className="text-indigo-400 font-semibold underline underline-offset-4 decoration-indigo-500/40 hover:decoration-indigo-400">
                    Request Provisioning
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── System Telemetry Footer ───────────────────────────────── */}
        <div className="mt-8 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Cpu size={12} className="text-indigo-400" />
              EIS Engine Core
            </span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-1.5">
              <Terminal size={12} className="text-indigo-400" />
              AES Gateway
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
            <CheckCircle2 size={11} className="text-emerald-500/80" />
            <span>Multi-Env Gateway Nodes Online (DEV • SIT • UAT)</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default LoginPage;