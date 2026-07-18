import { useEffect, useState } from "react";
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
  Key, // Added for Certificate Configuration Icon
} from "lucide-react";

import YamlTool from "./components/YamlTool";
import CacheGeneratorTool from "./components/CacheGeneratorTool";
import SftpUpload from "./components/SftpUpload";
import WrapperGenerator from "./modules/wrapper-generator/WrapperGenerator";
import CurlGenerator from "./modules/curl-generator/CurlGenerator";
import CertConfigPanel from "./components/CertConfigPanel"; // Added Import
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

function App() {
  const [activeTool, setActiveTool] = useState<
    "home" | "yaml" | "wrapper" | "curl" | "cache" | "sftp" | "cert"
  >("home");

  const [accessToken, setaccessToken] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [role, setRole] = useState("");

  const { theme, toggleTheme } = useTheme();

  const [mounted, setMounted] = useState(false);

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
      toast.success("Login successful!");
    } else {
      toast.error("Invalid credentials");
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setaccessToken(null);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <ToastContainer />
      {accessToken && accessToken !== "" ? (
        <>
          <aside
            className={`${
              sidebarOpen ? "w-64" : "w-20"
            } bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col fixed h-full z-20`}
          >
            <div className="p-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              {sidebarOpen && (
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xl tracking-tighter">
                  <ShieldCheck size={28} />
                  <span>DEV TOOLS</span>
                </div>
              )}

              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
              <SidebarItem
                icon={<LayoutDashboard size={20} />}
                label="Dashboard"
                active={activeTool === "home"}
                expanded={sidebarOpen}
                onClick={() => setActiveTool("home")}
              />

              <SidebarItem
                icon={<FileCode size={20} />}
                label="YAML Generator"
                active={activeTool === "yaml"}
                expanded={sidebarOpen}
                onClick={() => setActiveTool("yaml")}
              />

              {(role === "MasterAdmin" || role === "Admin") && (
                <SidebarItem
                  icon={<ShieldCheck size={20} />}
                  label="Wrapper Generator"
                  active={activeTool === "wrapper"}
                  expanded={sidebarOpen}
                  onClick={() => setActiveTool("wrapper")}
                />
              )}

              <SidebarItem
                icon={<Terminal size={20} />}
                label="CURL Generator"
                active={activeTool === "curl"}
                expanded={sidebarOpen}
                onClick={() => setActiveTool("curl")}
              />

              <SidebarItem
                icon={<DatabaseZap size={20} />}
                label="Cache Generator"
                active={activeTool === "cache"}
                expanded={sidebarOpen}
                onClick={() => setActiveTool("cache")}
              />

              {(role === "MasterAdmin" || role === "Admin") && (
                <>
                  <SidebarItem
                    icon={<Server size={20} />}
                    label="SFTP"
                    active={activeTool === "sftp"}
                    expanded={sidebarOpen}
                    onClick={() => setActiveTool("sftp")}
                  />
                </>
              )}
              <SidebarItem
                icon={<Key size={20} />}
                label="Cert Config"
                active={activeTool === "cert"}
                expanded={sidebarOpen}
                onClick={() => setActiveTool("cert")}
              />
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:ring-2 ring-indigo-500 transition-all"
              >
                {theme === "dark" ? (
                  <Sun size={20} className="text-amber-400" />
                ) : (
                  <Moon size={20} className="text-indigo-600" />
                )}

                {sidebarOpen && (
                  <span className="font-medium">
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </span>
                )}
              </button>
            </div>
          </aside>

          <div
            className={`flex-1 transition-all duration-300 ${
              sidebarOpen ? "ml-64" : "ml-20"
            }`}
          >
            <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center px-8 justify-between">
              <h2 className="font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-widest text-xs">
                {activeTool === "home"
                  ? "Overview"
                  : activeTool === "yaml"
                    ? "YAML Generator"
                    : activeTool === "wrapper"
                      ? "IBM ACE Wrapper Generator"
                      : activeTool === "curl"
                        ? "CURL Generator"
                        : activeTool === "cache"
                          ? "Cache Generator"
                          : activeTool === "sftp"
                            ? "SFTP Transfer"
                            : "Certificate & Key Configuration"}
              </h2>

              <div className="flex items-center gap-3">
                <button
                  className="bg-slate-50 dark:bg-slate-950 hover:bg-red-400 hover:text-white hover:dark:bg-red-900 cursor-pointer dark:text-white text-xs p-2 px-3 border border-slate-200 dark:border-slate-800 rounded-full transition-colors"
                  onClick={handleLogout}
                >
                  Logout
                </button>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 tracking-tighter leading-none mb-1">
                    API DEV
                  </p>

                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-none">
                    Deepraj Pagare
                  </p>
                </div>

                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg font-bold text-xs">
                  DP
                </div>
              </div>
            </header>

            <main className="p-8">
              {activeTool === "home" && (
                <div className="grid md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                  <ToolCard
                    title="YAML Generator"
                    desc="Middleware query to YAML conversion"
                    icon={<FileCode className="text-indigo-500" />}
                    onClick={() => setActiveTool("yaml")}
                  />
                  {(role === "MasterAdmin" || role === "Admin") && (
                    <ToolCard
                      title="IBM ACE Wrapper Generator"
                      desc="Generate IBM ACE Third Party Wrapper automatically"
                      icon={<ShieldCheck className="text-indigo-500" />}
                      onClick={() => setActiveTool("wrapper")}
                    />
                  )}

                  <ToolCard
                    title="CURL Generator"
                    desc="Generate signed GEN5/GEN6 CURL requests"
                    icon={<Terminal className="text-indigo-500" />}
                    onClick={() => setActiveTool("curl")}
                  />

                  <ToolCard
                    title="Cache Generator"
                    desc="Generate Third Party Cache automatically"
                    icon={<DatabaseZap className="text-indigo-500" />}
                    onClick={() => setActiveTool("cache")}
                  />

                  {(role === "MasterAdmin" || role === "Admin") && (
                    <>
                      <ToolCard
                        title="SFTP"
                        desc="Transfer files to server"
                        icon={<Server className="text-indigo-500" />}
                        onClick={() => setActiveTool("sftp")}
                      />
                    </>
                  )}

                  <ToolCard
                    title="Cert Configuration"
                    desc="Configure public certs, properties & JKS keystores"
                    icon={<Key className="text-indigo-500" />}
                    onClick={() => setActiveTool("cert")}
                  />

                  <ToolCard
                    title="Swagger Automator"
                    desc="Coming Soon"
                    icon={<Zap className="text-slate-400" />}
                    disabled
                  />
                </div>
              )}

              {activeTool === "yaml" && (
                <div className="animate-in zoom-in-95 duration-200">
                  <YamlTool onBack={() => setActiveTool("home")} />
                </div>
              )}

              {activeTool === "wrapper" && (
                <div className="animate-in zoom-in-95 duration-200">
                  <WrapperGenerator />
                </div>
              )}

              {activeTool === "curl" && (
                <div className="animate-in zoom-in-95 duration-200">
                  <CurlGenerator />
                </div>
              )}

              {activeTool === "cache" && (
                <div className="animate-in zoom-in-95 duration-200">
                  <CacheGeneratorTool onBack={() => setActiveTool("home")} />
                </div>
              )}

              {activeTool === "sftp" && (
                <div className="animate-in zoom-in-95 duration-200">
                  <SftpUpload />
                </div>
              )}

              {activeTool === "cert" && (
                <div className="animate-in zoom-in-95 duration-200">
                  <CertConfigPanel />
                </div>
              )}
            </main>
          </div>
        </>
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
      className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
        active
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      {icon}
      {expanded && <span className="font-semibold">{label}</span>}
    </button>
  );
}

function ToolCard({ title, desc, icon, onClick, disabled }: any) {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`p-8 rounded-3xl border transition-all ${
        disabled
          ? "bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60"
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-2xl hover:border-indigo-500 cursor-pointer"
      }`}
    >
      <div className="mb-6 w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 dark:text-white">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{desc}</p>
      {!disabled && (
        <span className="text-indigo-500 font-bold flex items-center gap-1">
          Open Tool <ArrowRight size={14} />
        </span>
      )}
    </div>
  );
}

export default App;
