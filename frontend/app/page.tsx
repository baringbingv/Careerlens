import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen radial-grid-bg bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-emerald-500/30">
      {/* Navigation Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-bold text-black text-xl shadow-lg shadow-emerald-500/10">
            CL
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            CareerLens <span className="text-emerald-400 font-semibold">AI</span>
          </span>
        </div>

        <nav className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2 rounded-lg transition-all duration-200"
          >
            Create Account
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center max-w-7xl mx-auto w-full px-6 py-20 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-7 flex flex-col items-start text-left gap-6 fade-in-up">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3.5 py-1.5 rounded-full font-medium tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              AI-Powered Resume Auditor
            </div>

            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              Audit Your CV.<br />
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500 bg-clip-text">Beat the ATS.</span>
            </h1>

            <p className="max-w-xl text-lg text-zinc-400 leading-relaxed">
              Struggling to pass resume screeners? CareerLens AI leverages advanced artificial intelligence to instantly grade your CV, identify critical skill gaps, and provide actionable development recommendations.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-4">
              <Link
                href="/register"
                className="flex items-center justify-center h-12 px-8 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold tracking-wide hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02]"
              >
                Get Started Free
              </Link>
              <Link
                href="/login"
                className="flex items-center justify-center h-12 px-8 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-850 hover:text-white transition-all hover:border-zinc-700"
              >
                Scan Your Resume
              </Link>
            </div>
          </div>

          {/* Interactive Feature Cards */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:mt-0 fade-in-up" style={{ animationDelay: "150ms" }}>
            <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                🎯
              </div>
              <h3 className="font-semibold text-lg text-white">ATS Scoring</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Get an instant readability and compatibility score matching industry standards.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                🔎
              </div>
              <h3 className="font-semibold text-lg text-white">Skill Gaps</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Automatically identify missing keywords and technical requirements for your target job role.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                💡
              </div>
              <h3 className="font-semibold text-lg text-white">Actionable Tips</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Receive personalized restructuring advice to highlight achievements and quantify impact.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
              <div className="w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 font-bold">
                📈
              </div>
              <h3 className="font-semibold text-lg text-white">Scan History</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Track your improvement over time with side-by-side history dashboard.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
        <div>
          &copy; {new Date().getFullYear()} CareerLens AI. All rights reserved.
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-zinc-400 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-zinc-400 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-zinc-400 transition-colors">Contact Support</a>
        </div>
      </footer>
    </div>
  );
}
