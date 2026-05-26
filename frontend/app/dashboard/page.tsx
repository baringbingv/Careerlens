"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface AnalysisResult {
  id: number;
  filename: string;
  job_role: string;
  ats_score: number;
  suitability: string;
  keyword_analysis: {
    matching_keywords: string[];
    missing_keywords: string[];
  };
  skill_gap: {
    critical: string[];
    recommended: string[];
    matching: string[];
  };
  feedback: {
    structure: string;
    content: string;
  };
  created_at: string;
}

export default function Dashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisResult | null>(null);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // Form State
  const [jobRole, setJobRole] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState("");

  // Loading States
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auth and History Load
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!storedToken) {
      router.push("/login");
      return;
    }

    setToken(storedToken);
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    fetchHistory(storedToken);
  }, [router]);

  // Loading steps simulation
  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev));
      }, 3500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const fetchHistory = async (authToken: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/history`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        setError("");
      } else {
        setError("Only PDF files are supported!");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setError("");
      } else {
        setError("Only PDF files are supported!");
      }
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !jobRole.trim() || !token) return;

    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("cv", file);
    formData.append("jobRole", jobRole);

    try {
      const res = await fetch(`${apiUrl}/api/analyze`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed.");
      }

      setActiveAnalysis(data.analysis);
      // Reload history
      fetchHistory(token);
    } catch (err: any) {
      setError(err.message || "An error occurred during scanning.");
    } finally {
      setLoading(false);
    }
  };

  const loadHistoricalAnalysis = async (id: number) => {
    if (!token) return;
    setError("");
    try {
      const res = await fetch(`${apiUrl}/api/history/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setActiveAnalysis(data.analysis);
      } else {
        setError(data.error || "Failed to load historical scan.");
      }
    } catch (err) {
      setError("Failed to connect to the backend.");
    }
  };

  const handleNewScan = () => {
    setActiveAnalysis(null);
    setFile(null);
    setJobRole("");
    setError("");
  };

  // ATS gauge calculations
  const getScoreColor = (score: number) => {
    if (score >= 80) return "#10b981"; // Emerald
    if (score >= 50) return "#f59e0b"; // Amber
    return "#ef4444"; // Rose
  };

  const getScoreBgClass = (score: number) => {
    if (score >= 80) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (score >= 50) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  };

  const scoreColor = activeAnalysis ? getScoreColor(activeAnalysis.ats_score) : "#10b981";

  // Simulated step texts
  const steps = [
    "Extracting document structure and parsed text...",
    "Scanning compatibility constraints and ATS formatting...",
    "Orchestrating Gemini deep-recruiter evaluation model...",
    "Formulating skill gap recommendations and path..."
  ];

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex selection:bg-emerald-500/30">

      {/* SIDEBAR: Scan History */}
      <aside className="w-80 border-r border-white/5 bg-zinc-900/40 backdrop-blur-xl flex flex-col justify-between shrink-0">
        <div>
          {/* Logo & Heading */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-bold text-black text-base">
                CL
              </div>
              <span className="font-bold tracking-tight text-white text-base">
                CareerLens <span className="text-emerald-400">AI</span>
              </span>
            </div>
            {activeAnalysis && (
              <button
                onClick={handleNewScan}
                className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 px-2.5 py-1.5 rounded-lg transition-all font-medium cursor-pointer"
              >
                + New Scan
              </button>
            )}
          </div>

          {/* User Status */}
          {user && (
            <div className="px-6 py-4 border-b border-white/5 bg-zinc-900/30 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-350 uppercase">
                {user.email.substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-400 truncate">{user.email}</p>
                <span className="text-[10px] text-zinc-550 font-medium uppercase tracking-wider">Premium User</span>
              </div>
            </div>
          )}

          {/* History List */}
          <div className="p-4 flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-zinc-500 px-2 mb-2 uppercase tracking-widest">Scan History</h3>

            {history.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-550 border border-dashed border-zinc-800 rounded-xl">
                No previous scans found.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-270px)] pr-1">
                {history.map((item) => {
                  const isActive = activeAnalysis?.id === item.id;
                  const dateString = new Date(item.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric"
                  });

                  return (
                    <button
                      key={item.id}
                      onClick={() => loadHistoricalAnalysis(item.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${isActive
                          ? "bg-zinc-800 border-white/10"
                          : "border-transparent bg-zinc-900/20 hover:bg-zinc-900/60 hover:border-white/5"
                        }`}
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-semibold text-zinc-200 truncate">{item.job_role}</h4>
                        <p className="text-[10px] text-zinc-500 truncate mt-0.5">{item.filename}</p>
                        <p className="text-[10px] text-zinc-500 mt-1 font-medium">{dateString}</p>
                      </div>
                      <div className={`text-xs font-bold px-2 py-1 rounded-md shrink-0 border ${getScoreBgClass(item.ats_score)}`}>
                        {item.ats_score}%
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Logout Section */}
        <div className="p-4 border-t border-white/5 bg-zinc-900/20">
          <button
            onClick={handleLogout}
            className="w-full h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:text-white text-zinc-400 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-zinc-950 overflow-y-auto">
        <div className="max-w-5xl mx-auto w-full px-8 py-10 flex flex-col gap-8 flex-1 justify-center">

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-3 items-center">
              <span>⚠️</span>
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* STATE 1: UPLOAD FORM */}
          {!loading && !activeAnalysis && (
            <div className="fade-in-up flex flex-col gap-6 max-w-xl mx-auto w-full">
              <div className="text-center mb-4">
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                  Analyze Your Resume
                </h1>
                <p className="text-sm text-zinc-450">
                  Provide your target job role and drag in your PDF to receive an instant analysis.
                </p>
              </div>

              <form onSubmit={handleAnalyze} className="flex flex-col gap-5">
                {/* Job Role Input */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="jobRole" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Target Job / Internship Role
                  </label>
                  <input
                    type="text"
                    id="jobRole"
                    required
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    placeholder="e.g., Frontend Engineer, Product Manager, Data Analyst Intern"
                    className="w-full h-12 bg-zinc-900 border border-zinc-800 rounded-xl px-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all duration-200"
                  />
                </div>

                {/* PDF Drag-and-Drop Area */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Upload Resume (PDF only)
                  </label>
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-52 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-200 ${isDragActive
                        ? "border-emerald-500 bg-emerald-500/5"
                        : file
                          ? "border-emerald-500/40 bg-zinc-900/40"
                          : "border-zinc-800 bg-zinc-900/10 hover:bg-zinc-900/20 hover:border-zinc-700"
                      }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="application/pdf"
                      className="hidden"
                    />

                    {file ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl">
                          📄
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-200">{file.name}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{(file.size / (1024 * 1024)).toFixed(2)} MB • PDF Document</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                          }}
                          className="text-xs font-semibold text-rose-450 hover:text-rose-400 transition-colors mt-1"
                        >
                          Remove file
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400 text-xl">
                          📤
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-300">Drag & Drop your resume here</p>
                          <p className="text-xs text-zinc-550 mt-1">or click to browse from files</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!file || !jobRole.trim()}
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-cyan-500 disabled:from-zinc-800 disabled:to-zinc-800 text-black disabled:text-zinc-500 font-bold tracking-wide rounded-xl shadow-lg disabled:shadow-none shadow-emerald-500/15 transition-all duration-250 mt-3 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Analyze Resume
                </button>
              </form>
            </div>
          )}

          {/* STATE 2: LOADING ANALYZER */}
          {loading && (
            <div className="fade-in-up flex flex-col items-center justify-center text-center max-w-md mx-auto w-full gap-8 py-12">
              {/* Pulsing visual core */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-center text-3xl glowing-indicator">
                  🧠
                </div>
                <div className="absolute inset-0 w-24 h-24 rounded-full border border-emerald-400/20 animate-ping opacity-75"></div>
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-white">CareerLens AI Auditing</h2>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mt-1">Process In Progress</p>
              </div>

              {/* Progress Steps List */}
              <div className="w-full flex flex-col gap-3.5 bg-zinc-900/35 border border-white/5 p-5 rounded-2xl">
                {steps.map((stepText, idx) => {
                  const isDone = loadingStep > idx;
                  const isCurrent = loadingStep === idx;
                  return (
                    <div key={idx} className="flex items-center gap-3 text-left">
                      {isDone ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-500 text-black text-[10px] font-bold flex items-center justify-center">
                          ✓
                        </div>
                      ) : isCurrent ? (
                        <div className="w-4 h-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin"></div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-zinc-700 bg-zinc-800"></div>
                      )}
                      <span
                        className={`text-xs ${isDone
                            ? "text-zinc-400 line-through"
                            : isCurrent
                              ? "text-emerald-400 font-medium"
                              : "text-zinc-650"
                          }`}
                      >
                        {stepText}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-zinc-550 italic leading-relaxed">
                Evaluating structural margins and keyword matches. This usually takes about 10-15 seconds. Please do not close this window.
              </p>
            </div>
          )}

          {/* STATE 3: RESULTS PRESENTATION */}
          {!loading && activeAnalysis && (
            <div className="fade-in-up flex flex-col gap-8">

              {/* Back & Info Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-5 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md font-medium">
                      PDF CV
                    </span>
                    <h1 className="text-xl font-bold text-white tracking-tight">{activeAnalysis.filename}</h1>
                  </div>
                  <p className="text-xs text-zinc-450 mt-1.5 flex items-center gap-1.5">
                    <span>🎯 Target Role:</span>
                    <strong className="text-zinc-300 font-semibold">{activeAnalysis.job_role}</strong>
                    <span className="text-zinc-700">•</span>
                    <span>Scanned on:</span>
                    <span className="text-zinc-350">{new Date(activeAnalysis.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    })}</span>
                  </p>
                </div>
                <button
                  onClick={handleNewScan}
                  className="px-4 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  ↩ Scan Another Resume
                </button>
              </div>

              {/* TOP SUMMARY ROW: Gauge + Suitability Card */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">

                {/* ATS Circle Gauge */}
                <div className="md:col-span-4 glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">ATS Match Score</span>

                  <div className="relative flex items-center justify-center">
                    <svg className="w-36 h-36 transform -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        stroke="rgba(255,255,255,0.03)"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        stroke={scoreColor}
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={376.99}
                        strokeDashoffset={376.99 - (376.99 * activeAnalysis.ats_score) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-white">{activeAnalysis.ats_score}%</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mt-0.5">Grade</span>
                    </div>
                  </div>

                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full border uppercase tracking-wider ${getScoreBgClass(activeAnalysis.ats_score)}`}>
                    {activeAnalysis.ats_score >= 80 ? "High Match" : activeAnalysis.ats_score >= 50 ? "Moderate Match" : "Low Match"}
                  </span>
                </div>

                {/* Suitability Text */}
                <div className="md:col-span-8 glass-panel p-6 rounded-2xl flex flex-col gap-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Recruiter Assessment</h3>
                  <div className="flex-1 flex items-center">
                    <p className="text-sm text-zinc-350 leading-relaxed italic border-l-2 border-emerald-500/40 pl-4 py-1">
                      &ldquo;{activeAnalysis.suitability}&rdquo;
                    </p>
                  </div>
                  <div className="text-[11px] text-zinc-500 flex items-center gap-1 bg-zinc-950/40 p-2.5 rounded-lg border border-white/5">
                    <span>💡</span>
                    <span>This score represents parsed readability, experience relevance, and keyword saturation.</span>
                  </div>
                </div>

              </div>

              {/* ROW 2: KEYWORD ANALYSIS */}
              <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">ATS Keyword Analytics</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                  {/* Matching Keywords */}
                  <div className="flex flex-col gap-3 bg-zinc-900/20 p-4 rounded-xl border border-white/5">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      Matching Keywords ({activeAnalysis.keyword_analysis.matching_keywords.length})
                    </span>

                    {activeAnalysis.keyword_analysis.matching_keywords.length === 0 ? (
                      <p className="text-xs text-zinc-550">No major matching keywords detected.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {activeAnalysis.keyword_analysis.matching_keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-md font-medium"
                          >
                            ✓ {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Missing Keywords */}
                  <div className="flex flex-col gap-3 bg-zinc-900/20 p-4 rounded-xl border border-white/5">
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                      Missing Keywords ({activeAnalysis.keyword_analysis.missing_keywords.length})
                    </span>

                    {activeAnalysis.keyword_analysis.missing_keywords.length === 0 ? (
                      <p className="text-xs text-zinc-550">Great! No major keyword omissions detected.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {activeAnalysis.keyword_analysis.missing_keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2.5 py-1 rounded-md font-medium"
                          >
                            + Add {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ROW 3: SKILL GAP & DEVELOPMENT PATH */}
              <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Skill Gap & Development Path</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                  {/* Critical Gaps */}
                  <div className="flex flex-col gap-3 bg-zinc-900/30 p-4 rounded-xl border border-rose-500/15">
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      🚨 Critical Gaps
                    </span>
                    <ul className="flex flex-col gap-2 flex-1">
                      {activeAnalysis.skill_gap.critical.length === 0 ? (
                        <li className="text-xs text-zinc-500">None! You possess all primary requirements.</li>
                      ) : (
                        activeAnalysis.skill_gap.critical.map((gap, i) => (
                          <li key={i} className="text-xs text-zinc-350 leading-relaxed flex items-start gap-2">
                            <span className="text-rose-500 shrink-0 select-none">•</span>
                            <span>{gap}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>

                  {/* Recommended Skills */}
                  <div className="flex flex-col gap-3 bg-zinc-900/30 p-4 rounded-xl border border-cyan-500/15">
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                      ⚡ Recommended Additions
                    </span>
                    <ul className="flex flex-col gap-2 flex-1">
                      {activeAnalysis.skill_gap.recommended.length === 0 ? (
                        <li className="text-xs text-zinc-500">No suggestions. Your resume has an outstanding core.</li>
                      ) : (
                        activeAnalysis.skill_gap.recommended.map((rec, i) => (
                          <li key={i} className="text-xs text-zinc-350 leading-relaxed flex items-start gap-2">
                            <span className="text-cyan-400 shrink-0 select-none">•</span>
                            <span>{rec}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>

                  {/* Matching Capabilities */}
                  <div className="flex flex-col gap-3 bg-zinc-900/30 p-4 rounded-xl border border-emerald-500/15">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      ✓ Verified Matches
                    </span>
                    <ul className="flex flex-col gap-2 flex-1">
                      {activeAnalysis.skill_gap.matching.length === 0 ? (
                        <li className="text-xs text-zinc-500">No strong matches identified. Rephrase details.</li>
                      ) : (
                        activeAnalysis.skill_gap.matching.map((mat, i) => (
                          <li key={i} className="text-xs text-zinc-350 leading-relaxed flex items-start gap-2">
                            <span className="text-emerald-400 shrink-0 select-none">•</span>
                            <span>{mat}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* ROW 4: FORMAT & STRUCTURE AND CONTENT SUGGESTIONS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Structural Feedback */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Layout & Structure Audit</h3>
                  <p className="text-xs text-zinc-300 leading-relaxed mt-1">
                    {activeAnalysis.feedback.structure}
                  </p>
                </div>

                {/* Content Feedback */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Content & Accomplishment Audit</h3>
                  <p className="text-xs text-zinc-300 leading-relaxed mt-1">
                    {activeAnalysis.feedback.content}
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

    </div>
  );
}
