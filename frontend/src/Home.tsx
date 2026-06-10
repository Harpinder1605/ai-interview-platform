import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'));
  }, []);

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans selection:bg-blue-500/30 relative">
      {/* Office Background Image with Overlay */}
      <div className="fixed inset-0 z-[-2] bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop')" }}></div>
      <div className="fixed inset-0 z-[-1] bg-linear-to-b from-slate-900/80 via-slate-900/95 to-slate-950 backdrop-blur-[2px]"></div>

      {/* Navigation Bar */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto w-full border-b border-slate-600/30 bg-slate-900/40 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-linear-to-br from-slate-600 via-slate-500 to-slate-700 rounded-xl flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_10px_rgba(0,0,0,0.5)] border border-slate-400">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-slate-200 to-slate-400 drop-shadow-sm">
            Nexus Interview
          </span>
        </div>
        <div>
          {isLoggedIn ? (
            <Link to="/dashboard" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
              Go to Dashboard &rarr;
            </Link>
          ) : (
            <div className="flex gap-4">
              <Link to="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors flex items-center">
                Log in
              </Link>
              <Link to="/register" className="text-sm font-semibold bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 px-4 py-2 rounded-lg transition-all border border-blue-500/20">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-150 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="z-10 max-w-4xl space-y-8 animate-[fadeIn_1s_ease-out]">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-linear-to-r from-slate-800/80 to-slate-900/80 border border-slate-600/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] text-xs font-medium text-slate-200 mb-4 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            AI-Powered Mock Interviews
          </div>
        
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6">
            Master your next <br />
            <span className="bg-clip-text text-transparent bg-linear-to-r from-slate-300 via-slate-100 to-slate-400 drop-shadow-sm">
              corporate interview.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Experience real-time behavioral analysis, professional communication metrics, and deep technical feedback in a simulated office environment.
          </p>
        
          <div className="flex flex-col sm:flex-row justify-center gap-5 pt-8">
            {isLoggedIn ? (
              <>
                <Link to="/interview" className="group relative px-8 py-4 bg-linear-to-r from-blue-600 to-indigo-600 rounded-xl font-bold text-white shadow-xl shadow-blue-900/50 hover:shadow-blue-900/80 transition-all hover:-translate-y-1 overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                  <span className="relative flex items-center gap-2">
                    Start Mock Session
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </span>
                </Link>
                <Link to="/dashboard" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-200 transition-all border border-slate-700 hover:border-slate-600 shadow-lg shadow-slate-900/50 flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  View Performance
                </Link>
              </>
            ) : (
              <Link to="/login" className="group relative px-8 py-4 bg-linear-to-r from-blue-600 to-indigo-600 rounded-xl font-bold text-white shadow-xl shadow-blue-900/50 hover:shadow-blue-900/80 transition-all hover:-translate-y-1 overflow-hidden inline-flex justify-center">
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                <span className="relative flex items-center gap-2">
                  Enter Platform
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </span>
              </Link>
            )}
          </div>
        </div>
        
        {/* Features grid */}
        <div className="z-10 grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-5xl w-full text-left">
          <div className="bg-linear-to-b from-slate-800/80 to-slate-900/80 p-6 rounded-2xl border border-slate-600/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.4)] backdrop-blur-xl hover:border-slate-400/50 transition-colors group">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4 text-blue-400 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Live Vision Analysis</h3>
            <p className="text-sm text-slate-400">Advanced eye-tracking and behavioral metrics simulate standard corporate evaluation protocols.</p>
          </div>
          <div className="bg-linear-to-b from-slate-800/80 to-slate-900/80 p-6 rounded-2xl border border-slate-600/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.4)] backdrop-blur-xl hover:border-slate-400/50 transition-colors group">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-4 text-indigo-400 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Speech-to-Text Analytics</h3>
            <p className="text-sm text-slate-400">Crystal clear transcription pipelines ensure every technical detail you speak is accurately reviewed.</p>
          </div>
          <div className="bg-linear-to-b from-slate-800/80 to-slate-900/80 p-6 rounded-2xl border border-slate-600/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.4)] backdrop-blur-xl hover:border-slate-400/50 transition-colors group">
            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4 text-purple-400 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Enterprise-grade Feedback</h3>
            <p className="text-sm text-slate-400">Receive constructive, actionable feedback modeled after top-tier technology firm rubrics.</p>
          </div>
        </div>
      </main>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}