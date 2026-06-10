import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // FastAPI OAuth2 expects form data, not JSON
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, formData);
      // Save the JWT token to local storage
      localStorage.setItem('token', response.data.access_token);
      // Redirect to the interview interface
      navigate('/interview');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    }
  };

  return (
    <div className="min-h-screen text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Office Background Image with Overlay */}
      <div className="fixed inset-0 z-[-2] bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop')" }}></div>
      <div className="fixed inset-0 z-[-1] bg-linear-to-b from-slate-900/80 via-slate-900/95 to-slate-950 backdrop-blur-[2px]"></div>

      <div className="bg-linear-to-b from-slate-800/80 to-slate-900/90 p-8 rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_20px_40px_rgba(0,0,0,0.5)] max-w-md w-full border border-slate-500/30 backdrop-blur-xl z-10 animate-[fadeIn_0.5s_ease-out]">
        <div className="flex justify-center mb-6">
          <div className="h-12 w-12 bg-linear-to-br from-slate-600 via-slate-500 to-slate-700 rounded-xl flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_10px_rgba(0,0,0,0.5)] border border-slate-400">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-white mb-2 text-center tracking-tight">Welcome Back</h2>
        <p className="text-slate-400 text-center mb-8 text-sm">Sign in to continue your interview prep.</p>
        
        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm flex items-center gap-2"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{error}</div>}
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Corporate Email</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
              placeholder="you@company.com"
              value={email} onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
              placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} 
            />
          </div>
          <button type="submit" className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/50 hover:shadow-blue-900/80 active:scale-[0.98]">
            Access Workspace
          </button>
        </form>
        
        <p className="mt-8 text-center text-sm text-slate-400">
          New to the platform? <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">Create an account</Link>
        </p>
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