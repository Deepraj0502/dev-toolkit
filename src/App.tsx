import { useEffect, useState, useMemo } from "react";
import "./App.css";

import {
  ArrowRight,
  FileCode,
  LayoutDashboard,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  Terminal,
  X,
  Zap,
  DatabaseZap,
  Server,
  Key,
  Coffee,
  FileText,
  Network,
  GitCompare,
  Search,
  Layers,
  Sparkles,
  Activity,
  Cpu,
} from "lucide-react";

import YamlTool from "./components/YamlTool";
import CacheGeneratorTool from "./components/CacheGeneratorTool";
import SolutionDocumentWizard from "./components/SolutionDocumentWizard";
import SftpUpload from "./components/SftpUpload";
import WrapperGenerator from "./modules/wrapper-generator/WrapperGenerator";
import CurlGenerator from "./modules/curl-generator/CurlGenerator";
import CertConfigPanel from "./components/CertConfigPanel";
import { useTheme } from "./hooks/useTheme";
import LoginPage from "./components/LoginPage";
import {
  getAccessToken,
  getUsername,
  setAccessToken,
  setUsername,
} from "./utils/common-functions";
import { toast, ToastContainer } from "react-toastify";
import { loginCred } from "./utils/loginCred";
import JavaDecompilerTool from "./components/Javadecompilertool";
import SwaggerAutomator from "./modules/swagger/SwaggerAutomator";
import SwaggerGenerator from "./modules/swagger/SwaggerGenerator";
import NetcatTesterPanel from "./components/NetcatTesterPanel";
import SwaggerEditor from "./components/SwaggerEditor";
import TextDiffViewer from "./components/TextDiffViewer";
import { TiltCard } from "./components/TiltCard";
import { CacheManager } from "./components/CacheManager";

// ─── TOOL CONFIGURATION DEFINITION ──────────────────────────────────────
const TOOLS_CONFIG = [
  {
    id: "yaml",
    title: "YAML Generator",
    desc: "Middleware query to YAML conversion",
    headerTitle: "YAML Generator",
    icon: FileCode,
    category: "Middleware",
    roles: ["*"],
    render: (onBack: () => void) => <YamlTool onBack={onBack} />,
  },
  {
    id: "wrapper",
    title: "Wrapper Generator",
    desc: "Generate Third Party Wrapper automatically",
    headerTitle: "Wrapper Generator",
    icon: ShieldCheck,
    category: "Middleware",
    roles: ["MasterAdmin", "Admin"],
    render: () => <WrapperGenerator />,
  },
  {
    id: "curl",
    title: "CURL Generator",
    desc: "Generate signed GEN5/GEN6 CURL requests",
    headerTitle: "CURL Generator",
    icon: Terminal,
    category: "APIs & Specs",
    roles: ["*"],
    render: () => <CurlGenerator />,
  },
  {
    id: "cache",
    title: "Cache Generator",
    desc: "Generate Third Party Cache automatically",
    headerTitle: "Cache Generator",
    icon: DatabaseZap,
    category: "Middleware",
    roles: ["*"],
    render: (onBack: () => void) => <CacheGeneratorTool onBack={onBack} />,
  },
  {
    id: "cache-loader",
    title: "Load Cache",
    desc: "Broadcast cache load/fetch across multi-server IP ranges",
    headerTitle: "Cache Server Manager",
    icon: Layers,
    category: "Middleware",
    roles: ["*"],
    render: () => <CacheManager />,
  },
  {
    id: "sftp",
    title: "SFTP",
    desc: "Transfer files to server",
    headerTitle: "SFTP Transfer",
    icon: Server,
    category: "Middleware",
    roles: ["MasterAdmin"],
    render: () => <SftpUpload />,
  },
  {
    id: "cert",
    title: "Cert Configuration",
    desc: "Configure public certs, properties & JKS keystores",
    headerTitle: "Certificate & Key Configuration",
    icon: Key,
    category: "Security",
    roles: ["*"],
    render: () => <CertConfigPanel />,
  },
  {
    id: "jdec",
    title: "Java Decompiler",
    desc: "Decompile your java jar file",
    headerTitle: "Java Decompiler",
    icon: Coffee,
    category: "Diagnostics",
    roles: ["*"],
    render: (onBack: () => void) => <JavaDecompilerTool onBack={onBack} />,
  },
  {
    id: "soldoc",
    title: "SolDoc Generator",
    desc: "Generate solution document",
    headerTitle: "SolDoc Generator",
    icon: FileText,
    category: "APIs & Specs",
    roles: ["*"],
    render: (onBack: () => void) => <SolutionDocumentWizard onBack={onBack} />,
  },
  {
    id: "swaggervalid",
    title: "Swagger Validator",
    desc: "Validate swaggers automatically",
    headerTitle: "Swagger Validator",
    icon: Zap,
    category: "APIs & Specs",
    roles: ["*"],
    render: () => <SwaggerAutomator />,
  },
  {
    id: "swaggergen",
    title: "Swagger Generator",
    desc: "Generate swaggers",
    headerTitle: "Swagger Generator",
    icon: Zap,
    category: "APIs & Specs",
    roles: ["*"],
    render: () => <SwaggerGenerator />,
  },
  {
    id: "netcat",
    title: "Netcat Tester",
    desc: "TCP Ping & Payload execution via SSH",
    headerTitle: "Netcat (TCP) Server Tester",
    icon: Network,
    category: "Diagnostics",
    roles: ["*"],
    render: () => <NetcatTesterPanel />,
  },
  {
    id: "swaggeredit",
    title: "Swagger Editor",
    desc: "Edit swaggers",
    headerTitle: "Swagger Editor",
    icon: Zap,
    category: "APIs & Specs",
    roles: ["*"],
    render: () => <SwaggerEditor />,
  },
  {
    id: "textdiff",
    title: "Text Difference",
    desc: "View differences between text files",
    headerTitle: "Text Difference Viewer",
    icon: GitCompare,
    category: "Diagnostics",
    roles: ["*"],
    render: () => <TextDiffViewer />,
  },
];

const CATEGORIES = [
  "ALL",
  "Middleware",
  "APIs & Specs",
  "Security",
  "Diagnostics",
];

function App() {
  const [activeTool, setActiveTool] = useState<string>("home");
  const [accessToken, setaccessToken] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [role, setRole] = useState("");
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Dashboard state
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [dashboardCategory, setDashboardCategory] = useState("ALL");

  useEffect(() => {
    setMounted(true);
    const loadToken = async () => {
      const key =
        loginCred.find((u) => u.username === getUsername())?.key || "";
      const token = await getAccessToken(key);
      if (Date.now() > Number(token) || !token) {
        setaccessToken(null);
        handleLogout();
      } else {
        setaccessToken(token);
        setRole(
          loginCred.find((u) => u.username === getUsername())?.role || "",
        );
      }
    };
    loadToken();
  }, []);

  if (!mounted) return null;

  const onLogin = async (username: string, password: string) => {
    const user = loginCred.find(
      (u) => u.username === username && u.password === password,
    );

    if (user) {
      await setAccessToken(String(Date.now() + 15 * 60 * 1000), user.key);
      const token = await getAccessToken(user.key);
      setaccessToken(token);
      setUsername(username);
      setRole(user.role);
      toast.success("Login successful!");
    } else {
      toast.error("Invalid credentials");
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setaccessToken(null);
    setRole("");
    setActiveTool("home");
  };

  const allowedTools = TOOLS_CONFIG.filter(
    (tool) => tool.roles.includes("*") || tool.roles.includes(role),
  );

  const filteredDashboardTools = allowedTools.filter((tool) => {
    const matchesCat =
      dashboardCategory === "ALL" || tool.category === dashboardCategory;
    const matchesSearch =
      tool.title.toLowerCase().includes(dashboardSearch.toLowerCase()) ||
      tool.desc.toLowerCase().includes(dashboardSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const activeToolConfig = allowedTools.find((tool) => tool.id === activeTool);

  return (
    <div className="relative min-h-screen bg-[#070b16] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden">
      <ToastContainer />

      {/* ── Background Moving Animations ───────────────────────────── */}
      <style>{`
        @keyframes driftOrbOne {
          0%, 100% { transform: translate(0px, 0px) scale(1); opacity: 0.22; }
          33% { transform: translate(80px, 45px) scale(1.12); opacity: 0.35; }
          66% { transform: translate(-50px, 70px) scale(0.95); opacity: 0.25; }
        }
        @keyframes driftOrbTwo {
          0%, 100% { transform: translate(0px, 0px) scale(1); opacity: 0.20; }
          33% { transform: translate(-70px, -50px) scale(1.18); opacity: 0.32; }
          66% { transform: translate(40px, -30px) scale(0.92); opacity: 0.24; }
        }
        @keyframes driftOrbThree {
          0%, 100% { transform: translate(0px, 0px) scale(1); opacity: 0.14; }
          50% { transform: translate(60px, -60px) scale(1.15); opacity: 0.26; }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(1000%); }
        }
        .animate-orb-1 { animation: driftOrbOne 22s ease-in-out infinite; }
        .animate-orb-2 { animation: driftOrbTwo 26s ease-in-out infinite; }
        .animate-orb-3 { animation: driftOrbThree 20s ease-in-out infinite; }
      `}</style>

      {/* Moving Ambient Glowing Orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 blur-[150px] animate-orb-1" />
        <div className="absolute top-1/3 -right-40 h-[650px] w-[650px] rounded-full bg-gradient-to-bl from-blue-700 via-indigo-900 to-indigo-950 blur-[160px] animate-orb-2" />
        <div className="absolute -bottom-40 left-1/4 h-[550px] w-[550px] rounded-full bg-cyan-600/20 blur-[140px] animate-orb-3" />

        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#070b16]">
          {/* Dynamic Mouse Spotlight */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px] transition-transform duration-75 ease-out"
            style={{
              left: `${mousePos.x}px`,
              top: `${mousePos.y}px`,
              width: "550px",
              height: "550px",
              background:
                "radial-gradient(circle, rgba(99, 102, 241, 0.16) 0%, rgba(59, 130, 246, 0.06) 45%, transparent 70%)",
            }}
          />

          {/* Soft Ambient Anchor */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[450px] w-[800px] rounded-full bg-indigo-600/15 blur-[160px]" />
        </div>

        {/* Floating Twinkle Particles */}
        <div className="absolute top-[20%] left-[15%] h-1 w-1 rounded-full bg-indigo-400/60 animate-ping" />
        <div className="absolute top-[45%] right-[22%] h-1.5 w-1.5 rounded-full bg-cyan-400/50 animate-pulse" />
        <div className="absolute bottom-[28%] left-[35%] h-1 w-1 rounded-full bg-blue-300/40 animate-pulse" />
        <div className="absolute bottom-[15%] right-[10%] h-1 w-1 rounded-full bg-indigo-300/50 animate-ping" />
      </div>

      {accessToken && accessToken !== "" ? (
        <div className="relative z-10 flex min-h-screen">
          {/* ── Sidebar ── */}
          <aside
            className={`${
              sidebarOpen ? "w-64" : "w-20"
            } bg-[#0c1222]/90 backdrop-blur-xl border-r border-[#1e2a47] transition-all duration-300 flex flex-col fixed h-full z-30 shadow-2xl`}
          >
            <div className="p-5 flex items-center justify-between border-b border-[#1e2a47]">
              {sidebarOpen && (
                <div className="flex items-center gap-2 text-indigo-400 font-black text-xl tracking-tighter">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-400/20 shadow-md shadow-indigo-600/20">
                    <ShieldCheck size={20} className="text-indigo-400" />
                  </div>
                  <span>DEV TOOLS</span>
                </div>
              )}

              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-[#111a2e] rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>

            <nav className="flex-1 px-3 space-y-1.5 mt-4 overflow-y-auto no-scrollbar">
              <SidebarItem
                icon={<LayoutDashboard size={19} />}
                label="Dashboard"
                active={activeTool === "home"}
                expanded={sidebarOpen}
                onClick={() => setActiveTool("home")}
              />

              {allowedTools.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <SidebarItem
                    key={tool.id}
                    icon={<IconComponent size={19} />}
                    label={tool.title}
                    active={activeTool === tool.id}
                    expanded={sidebarOpen}
                    onClick={() => setActiveTool(tool.id)}
                  />
                );
              })}
            </nav>

            <div className="p-3 border-t border-[#1e2a47]">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-center gap-3 p-2.5 rounded-xl bg-[#070b16]/70 border border-[#1e2a47] text-slate-300 hover:border-indigo-500/50 hover:text-white transition-all cursor-pointer"
              >
                {theme === "dark" ? (
                  <Sun size={18} className="text-amber-400" />
                ) : (
                  <Moon size={18} className="text-indigo-400" />
                )}

                {sidebarOpen && (
                  <span className="text-xs font-semibold">
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </span>
                )}
              </button>
            </div>
          </aside>

          {/* ── Main View Area ── */}
          <div
            className={`flex-1 flex flex-col transition-all duration-300 ${
              sidebarOpen ? "ml-64" : "ml-20"
            }`}
          >
            {/* Header */}
            <header className="h-16 shrink-0 border-b border-[#1e2a47] bg-[#0c1222]/80 backdrop-blur-xl sticky top-0 z-20 flex items-center px-8 justify-between shadow-lg shadow-black/20">
              <h2 className="font-bold text-slate-200 uppercase tracking-widest text-xs flex items-center gap-2">
                <span>
                  {activeTool === "home"
                    ? "OVERVIEW"
                    : activeToolConfig?.headerTitle || "TOOL"}
                </span>
              </h2>

              <div className="flex items-center gap-4">
                <button
                  className="bg-[#070b16]/80 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 text-slate-400 text-xs px-3.5 py-1.5 border border-[#1e2a47] rounded-full transition-all cursor-pointer font-medium"
                  onClick={handleLogout}
                >
                  Logout
                </button>

                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-indigo-400 tracking-tight leading-none mb-1">
                    API DEV
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 leading-none">
                    Deepraj Pagare
                  </p>
                </div>

                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 font-bold text-xs">
                  DP
                </div>
              </div>
            </header>

            {/* Content Container */}
            <main className="flex-1 p-8">
              {activeTool === "home" ? (
                /* ── Home Dashboard View ── */
                <div className="space-y-8 animate-in fade-in duration-300">
                  {/* Hero Telemetry Card */}
                  <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0c1427]/75 backdrop-blur-2xl p-7 shadow-2xl transition-all duration-300 hover:border-indigo-500/30">
                    <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                            EIS Engine Core Active
                          </span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                          Welcome,{" "}
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-indigo-200 to-blue-200">
                            Deepraj Pagare
                          </span>
                        </h1>
                        <p className="text-xs text-slate-300/80 max-w-xl leading-relaxed">
                          Enterprise developer suite for query execution, YAML
                          generation, and API contract operations.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#070b16]/70 px-4 py-3 backdrop-blur-md">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                            <Layers size={18} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Active Modules
                            </p>
                            <p className="text-lg font-black text-white">
                              {allowedTools.length}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#070b16]/70 px-4 py-3 backdrop-blur-md">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                            <ShieldCheck size={18} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Permission
                            </p>
                            <p className="text-xs font-mono font-bold text-emerald-300">
                              {role || "Developer"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setDashboardCategory(cat)}
                          className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                            dashboardCategory === cat
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                              : "border border-white/10 bg-[#0c1222]/80 backdrop-blur-md text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={dashboardSearch}
                        onChange={(e) => setDashboardSearch(e.target.value)}
                        placeholder="Search toolkit..."
                        className="w-full rounded-xl border border-white/10 bg-[#0c1222]/80 backdrop-blur-md py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Tool Cards Grid with Cursor Tilt */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDashboardTools.map((tool, idx) => (
                      <TiltCard
                        key={tool.id}
                        tool={tool}
                        index={idx}
                        onClick={() => setActiveTool(tool.id)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="animate-in zoom-in-95 duration-200">
                  {activeToolConfig?.render(() => setActiveTool("home"))}
                </div>
              )}
            </main>
          </div>
        </div>
      ) : (
        <LoginPage onLogin={onLogin} />
      )}
    </div>
  );
}

function SidebarItem({ icon, label, active, expanded, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
        active
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
          : "text-slate-400 hover:bg-[#111a2e] hover:text-slate-200"
      }`}
    >
      <div className="shrink-0">{icon}</div>
      {expanded && (
        <span className="font-semibold text-xs tracking-wide truncate">
          {label}
        </span>
      )}
    </button>
  );
}

export default App;
