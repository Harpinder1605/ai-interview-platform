import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Evaluation {
  id: number;
  question: string;
  transcript: string;
  score: number;
  strengths: string;
  weaknesses: string;
  advice: string;
  eye_contact_score?: number;
  confidence_score?: number;
}

export default function Dashboard() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get('http://localhost:8000/api/evaluation/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvaluations(response.data);
    } catch (error: any) {
      console.error("Failed to fetch history:", error);
      if (error.response?.status === 401) {
        alert("Your session has expired or is invalid. Please log in again.");
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading dashboard...</div>;
  }

  // Prepare data for the Line Graph (oldest to newest)
  const chartData = [...evaluations].reverse().map((ev, idx) => ({
    name: `Q${idx + 1}`,
    score: ev.score,
    confidence: ev.confidence_score || 0,
    focus: ev.eye_contact_score ? Math.round(ev.eye_contact_score) : 0,
  }));

  return (
    <div className="min-h-screen text-slate-100 p-8 font-sans selection:bg-blue-500/30 relative">
      {/* Office Background Image with Overlay */}
      <div className="fixed inset-0 z-[-2] bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop')" }}></div>
      <div className="fixed inset-0 z-[-1] bg-linear-to-b from-slate-900/80 via-slate-900/95 to-slate-950 backdrop-blur-[2px]"></div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6 animate-[fadeIn_0.5s_ease-out]">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <div className="h-10 w-10 bg-linear-to-br from-slate-600 via-slate-500 to-slate-700 rounded-xl flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_10px_rgba(0,0,0,0.5)] border border-slate-400">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              Performance Dashboard
            </h1>
            <p className="text-slate-400 mt-2 font-medium">Review your mock interview analytics and AI feedback.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/interview" className="group relative px-5 py-2.5 bg-linear-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 rounded-lg font-semibold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_4px_10px_rgba(0,0,0,0.5)] transition-all flex items-center gap-2 border border-blue-400/50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Session
            </Link>
            <button onClick={handleLogout} className="px-5 py-2.5 bg-linear-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-slate-200 rounded-lg font-semibold transition-all border border-slate-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(0,0,0,0.5)] flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sign out
            </button>
          </div>
        </div>
        
        {/* Content Section */}
        {evaluations.length === 0 ? (
          <div className="bg-linear-to-b from-slate-800/80 to-slate-900/80 p-12 rounded-3xl border border-slate-600/40 backdrop-blur-xl text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center animate-[fadeIn_0.7s_ease-out]">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-700">
              <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No active records</h3>
            <p className="text-slate-400 mb-8 max-w-md">Your workspace is empty. Complete your first mock interview to generate comprehensive performance analytics.</p>
            <Link to="/interview" className="px-6 py-3 bg-linear-to-b from-slate-100 to-slate-300 text-slate-900 rounded-lg font-bold hover:from-white hover:to-slate-200 transition-colors shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_4px_10px_rgba(0,0,0,0.3)] border border-slate-400">
              Start Your First Interview
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Performance Trend Chart */}
            <div className="bg-linear-to-b from-slate-800/80 to-slate-900/80 p-6 sm:p-8 rounded-3xl border border-slate-600/40 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.5)] animate-[fadeIn_0.6s_ease-out]">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Performance Trend</h2>
              </div>
              
              <div className="h-72 sm:h-96 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} tickMargin={10} />
                    <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
                    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '0.75rem', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="score" name="Overall Score (0-10)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    <Line yAxisId="left" type="monotone" dataKey="confidence" name="Confidence (0-10)" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="focus" name="Eye Contact (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Existing Evaluation Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {evaluations.map((ev, index) => (
                <div 
                  key={ev.id} 
                  className="bg-linear-to-b from-slate-800/80 to-slate-900/80 p-6 sm:p-8 rounded-3xl border border-slate-600/40 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.5)] flex flex-col hover:border-slate-400/50 transition-all duration-300 group"
                  style={{ animation: `fadeIn 0.5s ease-out ${(index * 0.1)}s both` }}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pb-6 border-b border-slate-700/50">
                    <div className="flex-1">
                      <span className="inline-block px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider rounded-full mb-3 border border-blue-500/20">
                        Technical Prompt
                      </span>
                      <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">{ev.question}</h2>
                    </div>
                    
                    {/* Scores */}
                    <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end shrink-0">
                      <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-2 shadow-inner" title="AI Evaluation Score">
                        <span className="text-slate-400 text-sm font-semibold">Score</span>
                        <div className="flex items-baseline gap-1 text-white">
                          <span className="text-2xl font-extrabold text-blue-400">{ev.score}</span>
                          <span className="text-xs text-slate-500 font-bold">/10</span>
                        </div>
                      </div>
                      
                      {ev.eye_contact_score !== undefined && ev.eye_contact_score !== null && (
                        <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-2 shadow-inner" title="Eye Contact Metrics">
                          <span className="text-slate-400 text-sm font-semibold">Focus</span>
                          <div className="flex items-baseline gap-1 text-white">
                            <span className="text-lg font-bold text-emerald-400">{Math.round(ev.eye_contact_score)}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Feedback Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-700/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Key Strengths</h3>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">{ev.strengths}</p>
                    </div>
                    
                    <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-700/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </div>
                        <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider">Improvement Areas</h3>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">{ev.weaknesses}</p>
                    </div>
                  </div>
                  
                  {/* Actionable Advice */}
                  <div className="mt-auto bg-linear-to-r from-blue-900/20 to-indigo-900/20 p-5 rounded-2xl border border-blue-500/10">
                    <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Strategic Advice
                    </h3>
                    <p className="text-indigo-100 text-sm italic leading-relaxed">"{ev.advice}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes growUp {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}