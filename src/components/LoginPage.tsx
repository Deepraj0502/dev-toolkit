import { useState } from "react";
import {
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

interface LoginPageProps {
  onLogin?: (username: string, password: string) => void;
  onRequestProvisioning?: () => void;
  onForgotPassword?: () => void;
}

function LoginPage({
  onLogin
}: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = () => {
    onLogin?.(username, password);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-10 text-indigo-300 font-black text-2xl tracking-tighter">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-400/20">
            <ShieldCheck size={26} className="text-indigo-300" />
          </div>
          <span>DEV TOOLS</span>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-8 shadow-2xl shadow-black/30">

          <h1 className="text-2xl font-bold text-white mb-2">
            System Access
          </h1>
          <p className="text-sm text-slate-400 mb-8 leading-relaxed">
            Enter your developer credentials to initialize session.
          </p>

          {/* Username */}
          <div className="mb-5">
            <label className="block text-[11px] font-semibold tracking-widest text-slate-400 uppercase mb-2">
              Username
            </label>
            <div className="relative">
              <User
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. dev_admin"
                className="w-full bg-slate-950/60 border border-slate-700 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="block text-[11px] font-semibold tracking-widest text-slate-400 uppercase mb-2">
              Password
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                className="w-full bg-slate-950/60 border border-slate-700 rounded-2xl py-3.5 pl-11 pr-11 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute cursor-pointer right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full flex cursor-pointer items-center justify-center gap-2 py-3.5 rounded-2xl bg-indigo-200 hover:bg-indigo-100 text-indigo-900 font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
          >
            Initialize Login
            <ArrowRight size={18} />
          </button>

          {/* Divider */}
          {/* <div className="my-7 border-t border-slate-800" /> */}

          {/* Provisioning */}
          {/* <div className="text-center">
            <p className="text-sm text-slate-400 mb-4">
              New to the environment?
            </p>
            <button
              type="button"
              onClick={onRequestProvisioning}
              className="w-full py-3 rounded-2xl border border-slate-700 text-indigo-300 font-mono text-sm tracking-wide hover:bg-slate-800/60 hover:border-slate-600 transition-all"
            >
              Request Provisioning
            </button>
          </div> */}
        </div>

        {/* Footer */}
        {/* <div className="mt-8 text-center space-y-1">
          <p className="text-[10px] font-mono tracking-widest text-slate-600 uppercase">
            EIS Engine v2.4.0-stable
          </p>
          <p className="text-[10px] font-mono tracking-widest text-slate-600 uppercase">
            Secure channel: AES-256-GCM
          </p>
        </div> */}
      </div>
    </div>
  );
}

export default LoginPage;