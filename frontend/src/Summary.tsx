import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function Summary() {
  const location = useLocation();
  const navigate = useNavigate();
  const evaluations = location.state?.evaluations || [];

  useEffect(() => {
    // If the user navigates directly here without completing an interview, redirect them
    if (evaluations.length === 0) {
      navigate('/dashboard');
    }
  }, [evaluations, navigate]);

  const averageScore = evaluations.length > 0 
    ? (evaluations.reduce((acc: number, curr: any) => acc + curr.score, 0) / evaluations.length).toFixed(1)
    : 0;

  const averageConfidence = evaluations.length > 0
    ? (evaluations.reduce((acc: number, curr: any) => acc + (curr.confidence_score || 0), 0) / evaluations.length).toFixed(1)
    : 0;

  if (evaluations.length === 0) return null;

  return (
    <div className="min-h-screen text-slate-100 p-8 font-sans selection:bg-blue-500/30 relative">
      {/* Office Background Image with Overlay */}
      <div className="fixed inset-0 z-[-2] bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop')" }}></div>
      <div className="fixed inset-0 z-[-1] bg-linear-to-b from-slate-900/80 via-slate-900/95 to-slate-950 backdrop-blur-[2px]"></div>
      
      <div className="max-w-4xl mx-auto relative z-10 animate-[fadeIn_0.5s_ease-out]">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-6">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <div className="h-10 w-10 bg-linear-to-br from-purple-600 via-purple-500 to-pink-700 rounded-xl flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_10px_rgba(0,0,0,0.5)] border border-purple-400">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            Session Summary
          </h1>
          <Link to="/dashboard" className="px-5 py-2.5 bg-linear-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-slate-200 rounded-lg font-semibold transition-all border border-slate-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(0,0,0,0.5)] flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-linear-to-b from-slate-800/80 to-slate-900/80 p-8 rounded-3xl border border-slate-600/40 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.5)] mb-8 flex flex-col md:flex-row items-center gap-8">
          <div className="flex gap-4 shrink-0">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-linear-to-br from-slate-800 to-slate-900 border-4 border-blue-600/50 flex items-center justify-center flex-col shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)]">
              <span className="text-4xl md:text-5xl font-extrabold text-blue-400">{averageScore}</span>
              <span className="text-xs md:text-sm font-bold text-slate-500 mt-1">Overall Avg</span>
            </div>
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-linear-to-br from-slate-800 to-slate-900 border-4 border-purple-600/50 flex items-center justify-center flex-col shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)]">
              <span className="text-4xl md:text-5xl font-extrabold text-purple-400">{averageConfidence}</span>
              <span className="text-xs md:text-sm font-bold text-slate-500 mt-1">Confidence Avg</span>
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold text-white mb-2">Great work!</h2>
            <p className="text-slate-400">You've completed {evaluations.length} question{evaluations.length > 1 ? 's' : ''} in this mock session. Review your overall feedback below to see where you excelled and what you can improve before your real interview.</p>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-200 ml-2">Question Breakdown</h3>
          {evaluations.map((ev: any, index: number) => (
            <div key={index} className="bg-linear-to-b from-slate-800/60 to-slate-900/60 p-6 rounded-2xl border border-slate-600/30 backdrop-blur-md shadow-lg">
              <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-slate-700/50">
                <div>
                  <span className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1 block">Question {index + 1}</span>
                  <h4 className="text-lg font-semibold text-white">{ev.question}</h4>
                </div>
                <div className="flex gap-2">
                  <div className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700 shadow-inner shrink-0 text-center flex flex-col">
                    <span className="text-xs text-slate-500 font-bold mb-0.5">Score</span>
                    <span className="text-lg font-bold text-blue-400">{ev.score}<span className="text-xs text-slate-500">/10</span></span>
                  </div>
                  {ev.confidence_score && (
                    <div className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700 shadow-inner shrink-0 text-center flex flex-col">
                      <span className="text-xs text-slate-500 font-bold mb-0.5">Confidence</span>
                      <span className="text-lg font-bold text-purple-400">{ev.confidence_score}<span className="text-xs text-slate-500">/10</span></span>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-900/40 p-4 rounded-xl border-l-4 border-emerald-500 shadow-inner">
                  <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Strengths</h5>
                  <p className="text-slate-300 text-sm leading-relaxed">{ev.strengths}</p>
                </div>
                <div className="bg-slate-900/40 p-4 rounded-xl border-l-4 border-rose-500 shadow-inner">
                  <h5 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">Areas for Growth</h5>
                  <p className="text-slate-300 text-sm leading-relaxed">{ev.weaknesses}</p>
                </div>
              </div>
              <div className="mt-4 bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 block">Actionable Advice</h5>
                <p className="text-blue-100 text-sm italic leading-relaxed">"{ev.advice}"</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}