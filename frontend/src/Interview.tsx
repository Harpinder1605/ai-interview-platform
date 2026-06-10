import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || API_BASE_URL.replace(/^http/, 'ws');

const INTRO_QUESTION = "Welcome to your mock interview. Could you tell me about yourself?";

export default function Interview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const totalFramesRef = useRef(0);
  const eyeContactFramesRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const isRecordingRef = useRef(false);
  const isListeningForAudioRef = useRef(false);
  
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(INTRO_QUESTION);
  const [aiFeedback, setAiFeedback] = useState<string>("Ready");
  const [transcript, setTranscript] = useState<string>("");
  const transcriptRef = useRef<string>("");
  const [evaluation, setEvaluation] = useState<any>(null);
  const [sessionEvaluations, setSessionEvaluations] = useState<any[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [topic, setTopic] = useState("");
  const [isLoadingTopic, setIsLoadingTopic] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Immediately redirect to login if there is no token present
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }

    connectWebSocket();

    // Cleanup function when the component unmounts
    return () => {
      if (wsRef.current) wsRef.current.close();
      stopCamera();
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const connectWebSocket = () => {
    const token = localStorage.getItem('token');
    const ws = new WebSocket(`${WS_BASE_URL}/api/vision/ws?token=${token}`);
    ws.onopen = () => console.log('WebSocket Connected');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setAiFeedback(data.message);
      
      // Track Analytics dynamically
      totalFramesRef.current += 1;
      if (data.message === "Eye Contact Active 👁️") {
        eyeContactFramesRef.current += 1;
      }
      
      // Request the next frame ONLY after the server has successfully processed this one!
      if (isRecordingRef.current) {
        setTimeout(captureFrame, 100);
      }
    };
    ws.onclose = () => console.log('WebSocket Disconnected');
    wsRef.current = ws;
  };

  const speakText = (text: string, onEndCallback?: () => void) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.onend = () => {
        setIsSpeaking(false);
        if (onEndCallback) onEndCallback();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        if (onEndCallback) onEndCallback();
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Text-to-speech not supported in this browser.");
      if (onEndCallback) onEndCallback();
    }
  };

  useEffect(() => {
    isRecordingRef.current = isRecording;

    if (isRecording) {
      // Reset stats for a new session
      totalFramesRef.current = 0;
      eyeContactFramesRef.current = 0;
      setTranscript("");
      transcriptRef.current = "";
      setEvaluation(null);
      setSessionEvaluations([]);
      
      // Kick off the first frame
      setTimeout(captureFrame, 100);
      
      // Speak the question and THEN start continuous audio recording loop
      speakText(currentQuestion, () => {
        if (isRecordingRef.current) {
          startAudioRecordingLoop();
        }
      });
    } else {
      setAiFeedback("Paused");
      stopAudioRecordingLoop();
      window.speechSynthesis.cancel(); // Stop AI if speaking
      setIsSpeaking(false);
      
      if (transcriptRef.current.trim().length > 0) {
        evaluateTranscript(transcriptRef.current);
      }
    }
  }, [isRecording]);

  const startAudioRecordingLoop = () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    isListeningForAudioRef.current = true;
    
    // CRITICAL FIX: Extract ONLY the audio track!
    // Passing the video stream to an audio MediaRecorder can cause silent failures or massive video uploads.
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      console.error("No audio track found in stream!");
      return;
    }
    const audioStream = new MediaStream([audioTrack]);

    const recordChunk = () => {
      if (!isListeningForAudioRef.current) return;

      try {
        // Dynamically determine a supported audio MIME type
        let mimeType = '';
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4'; // Safari fallback
        }

        const options = mimeType ? { mimeType } : undefined;
        const recorder = new MediaRecorder(audioStream, options);
        mediaRecorderRef.current = recorder;
        const chunks: BlobPart[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const audioBlob = new Blob(chunks, { type: mimeType || 'audio/webm' });
          if (audioBlob.size > 0) {
            sendAudioToWhisper(audioBlob);
          }
          // Start next chunk only if we intentionally want to be recording
          if (isListeningForAudioRef.current) {
            recordChunk();
          }
        };

        recorder.start();
        
        // Record for 5 seconds per chunk
        setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }, 5000);
      } catch (err) {
        console.error("Failed to start MediaRecorder:", err);
      }
    };

    recordChunk();
  };

  const stopAudioRecordingLoop = () => {
    isListeningForAudioRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const sendAudioToWhisper = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("file", audioBlob, "chunk.webm");
    
    console.log(`Sending ${audioBlob.size} bytes of audio to Whisper...`);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/speech/transcribe`, formData);
      console.log("Transcription result:", response.data.text);
      
      if (response.data.text && response.data.text.trim().length > 0) {
        const newText = response.data.text.trim();
        setTranscript(prev => prev + (prev ? " " : "") + newText);
        // Update ref for immediate access when interview ends
        transcriptRef.current = transcriptRef.current + (transcriptRef.current ? " " : "") + newText;
      }
    } catch (error) {
      console.error("Transcription error:", error);
    }
  };

  const submitAnswer = async () => {
    if (transcriptRef.current.trim().length === 0) {
      alert("Please provide an answer before submitting.");
      return;
    }
    
    stopAudioRecordingLoop();
    
    const currentTranscript = transcriptRef.current;
    setTranscript("");
    transcriptRef.current = "";
    setIsEvaluating(true);
    
    const token = localStorage.getItem('token');
    
    const total = totalFramesRef.current;
    const eyeContact = eyeContactFramesRef.current;
    const eyeScore = total > 0 ? (eyeContact / total) * 100 : 0;
    totalFramesRef.current = 0;
    eyeContactFramesRef.current = 0;

    try {
      const response = await axios.post(`${API_BASE_URL}/api/evaluation/analyze`, {
        transcript: currentTranscript,
        question: currentQuestion,
        eye_contact_score: eyeScore,
        total_frames: total
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newEvaluation = { ...response.data, question: currentQuestion };
      setEvaluation(newEvaluation);
      setSessionEvaluations(prev => [...prev, newEvaluation]);
      
      if (response.data.next_question) {
        setCurrentQuestion(response.data.next_question);
        speakText(response.data.next_question, () => {
          if (isRecordingRef.current) startAudioRecordingLoop();
        });
      } else {
        if (isRecordingRef.current) startAudioRecordingLoop();
      }
    } catch (error: any) {
      console.error("Evaluation error:", error);
      
      if (error.response?.status === 401) {
        alert("Your session has expired. Please log in again.");
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      alert("There was an error generating your evaluation.");
      if (isRecordingRef.current) startAudioRecordingLoop();
    } finally {
      setIsEvaluating(false);
    }
  };

  const evaluateTranscript = async (finalTranscript: string) => {
    setIsEvaluating(true);
    const token = localStorage.getItem('token');
    
    const total = totalFramesRef.current;
    const eyeContact = eyeContactFramesRef.current;
    const eyeScore = total > 0 ? (eyeContact / total) * 100 : 0;

    try {
      const response = await axios.post(`${API_BASE_URL}/api/evaluation/analyze`, {
        transcript: finalTranscript,
        question: currentQuestion,
        eye_contact_score: eyeScore,
        total_frames: total
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newEvaluation = { ...response.data, question: currentQuestion };
      setEvaluation(newEvaluation);
      setSessionEvaluations(prev => [...prev, newEvaluation]);
    } catch (error: any) {
      console.error("Evaluation error:", error);
      
      if (error.response?.status === 401) {
        alert("Your session has expired. Please log in again.");
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      alert("There was an error generating your evaluation.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current || !wsRef.current) return;
    
    if (wsRef.current.readyState !== WebSocket.OPEN) {
      // Retry shortly if the socket is still connecting, preventing a permanent lock
      if (isRecordingRef.current) setTimeout(captureFrame, 200);
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (context && videoRef.current.videoWidth) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Compress to JPEG at 50% quality to save bandwidth
      const base64Frame = canvas.toDataURL('image/jpeg', 0.5);
      wsRef.current.send(base64Frame);
    }
  };

  const startCamera = async () => {
    try {
      // Request 720p video for a good balance of quality and performance
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
      return stream;
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Please allow camera and microphone access to continue.");
      return null;
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop()); // Stop all video/audio tracks
      videoRef.current.srcObject = null;
    }
    setHasPermission(false);
  };

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans selection:bg-blue-500/30 relative">
      {/* Office Background Image with Overlay */}
      <div className="fixed inset-0 z-[-2] bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop')" }}></div>
      <div className="fixed inset-0 z-[-1] bg-linear-to-b from-slate-900/80 via-slate-900/95 to-slate-950 backdrop-blur-[2px]"></div>

      {/* Navigation Header */}
      <header className="flex items-center justify-between p-4 md:px-8 bg-slate-900/60 backdrop-blur-xl border-b border-slate-600/30 shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-linear-to-br from-slate-600 via-slate-500 to-slate-700 rounded-lg flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_10px_rgba(0,0,0,0.5)] border border-slate-400">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white drop-shadow-sm">Live Interview Workspace</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-linear-to-b from-slate-800 to-slate-900 rounded-full border border-slate-600/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] text-xs font-medium mr-2">
            {hasPermission ? (
              <><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Camera Active</>
            ) : (
              <><span className="w-2 h-2 rounded-full bg-rose-500"></span> Camera Inactive</>
            )}
          </div>
          <Link to="/dashboard" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors px-3 py-1.5">Dashboard</Link>
          <button onClick={handleLogout} className="text-sm font-semibold bg-linear-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-slate-200 px-4 py-1.5 rounded-lg transition-colors border border-slate-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">Sign out</button>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center p-4 sm:p-8 max-w-6xl mx-auto w-full animate-[fadeIn_0.5s_ease-out]">
        
        {!isRecording && (
          <div className="w-full mb-8 bg-linear-to-b from-slate-800/80 to-slate-900/80 p-6 sm:p-8 rounded-3xl border border-slate-600/40 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.5)] flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 text-blue-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Configure Your Session</h2>
            <p className="text-slate-400 mb-6 max-w-md text-sm">Specify a technical domain or soft-skill area to dynamically tailor the AI evaluation matrix.</p>
            
            <div className="w-full max-w-xl relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <input 
                type="text" 
                placeholder="e.g. React Frontend, System Design, Leadership..." 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-900/60 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner font-medium text-lg"
              />
            </div>
          </div>
        )}

        {/* Main Video Interface */}
        <div className="w-full flex flex-col gap-6 relative">
          
          {(isEvaluating || isLoadingTopic) && (
            <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center z-40 backdrop-blur-md transition-all duration-300 rounded-3xl">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-slate-700 rounded-full"></div>
                <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
              </div>
              <p className="mt-6 text-xl font-bold text-white tracking-wide animate-pulse">
                {isLoadingTopic ? 'Initializing Interview Protocol...' : 'Analyzing Candidate Response...'}
              </p>
              <p className="mt-2 text-sm text-slate-400 font-medium max-w-xs text-center">Processing behavioral and technical metrics via enterprise AI models.</p>
            </div>
          )}

          <div className="relative w-full max-w-5xl mx-auto z-10 rounded-3xl overflow-hidden aspect-video border border-slate-600/50 bg-linear-to-b from-slate-800 to-slate-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-500 flex items-center justify-center">
            
            {/* AI Interviewer (Main View) */}
            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${isSpeaking ? 'bg-blue-900/10' : ''}`}>
              
              <div className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-600/50 text-sm font-bold text-slate-200 shadow-lg">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                AI Interviewer
              </div>
              
              {isSpeaking && (
                <div className="absolute top-6 right-6 z-20 flex items-center gap-2 px-4 py-2 bg-blue-600/80 backdrop-blur-md rounded-xl border border-blue-400/30 text-sm font-bold uppercase tracking-widest text-white shadow-lg animate-pulse">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                  Speaking
                </div>
              )}

              <div className="relative flex items-center justify-center">
                {/* Metallic AI Avatar Base */}
                <div className={`w-40 h-40 md:w-48 md:h-48 rounded-full flex items-center justify-center bg-linear-to-br from-slate-700 via-slate-600 to-slate-900 border-4 border-slate-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_10px_20px_rgba(0,0,0,0.5)] z-10 transition-transform duration-300 ${isSpeaking ? 'scale-105' : 'scale-100'}`}>
                  <svg className="w-20 h-20 md:w-24 md:h-24 text-slate-200 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                {/* Audio rings */}
                {isSpeaking && (
                   <>
                    <div className="absolute w-52 h-52 md:w-64 md:h-64 rounded-full border border-blue-400/30 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                    <div className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full border border-blue-500/20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                   </>
              )}
              </div>
            </div>

            {/* Candidate / User View (PiP) */}
            <div className={`absolute bottom-6 right-6 w-1/3 sm:w-1/4 max-w-75 min-w-40 rounded-2xl overflow-hidden aspect-video border-[3px] ${isRecording ? 'border-emerald-500/80 shadow-[0_8px_30px_rgba(16,185,129,0.3)]' : 'border-slate-500/50 shadow-2xl'} bg-slate-950 transition-all duration-700 ease-in-out z-30`}>
              
              <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 px-2 py-1 bg-slate-900/80 backdrop-blur-md rounded-md border border-slate-600/50 text-[10px] font-bold text-slate-200 shadow-lg">
                <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                You
              </div>

              {isRecording && (
                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  Rec
                </div>
              )}

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-700 ${!isRecording ? 'opacity-20 grayscale' : 'opacity-100'}`}
              />
            
              <canvas ref={canvasRef} className="hidden" />

              {!isRecording && !isLoadingTopic && !isEvaluating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-linear-to-br from-slate-700 to-slate-800 border border-slate-500 flex items-center justify-center mb-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(0,0,0,0.5)]">
                    <svg className="w-5 h-5 text-slate-400 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </div>
                  <p className="text-slate-300 font-bold tracking-wider uppercase text-[9px] md:text-[10px] drop-shadow-md">Standby</p>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-2">
            {isRecording && (
              <button 
                onClick={submitAnswer}
                disabled={isSpeaking || isEvaluating}
                className="group relative px-8 py-4 bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 rounded-2xl font-bold text-white shadow-xl shadow-emerald-900/40 transition-all disabled:opacity-50 disabled:grayscale overflow-hidden flex-1 sm:flex-none"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                <span className="relative flex items-center justify-center gap-2">
                  {isEvaluating ? 'Evaluating...' : 'Submit Answer & Continue'}
                  {!isEvaluating && <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
                </span>
              </button>
            )}
            
            <button 
              onClick={async () => {
                if (isRecording) {
                  setIsRecording(false);
                  stopCamera();
                } else {
                  setIsLoadingTopic(true);
                  let introQ = INTRO_QUESTION;
                  
                  if (topic.trim()) {
                    try {
                      const token = localStorage.getItem('token');
                      const response = await axios.post(`${API_BASE_URL}/api/evaluation/start`, { topic: topic.trim() }, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      if (response.data.question) {
                        introQ = response.data.question;
                      }
                    } catch (e: any) {
                      console.error("Failed to generate topic question", e);
                      
                      if (e.response?.status === 401) {
                        alert("Your session has expired. Please log in again.");
                        localStorage.removeItem('token');
                        navigate('/login');
                        return;
                      }

                      introQ = `Welcome to your mock interview on ${topic.trim()}. Let's get started. Could you tell me about your experience with this?`;
                    }
                  }
                  
                  setCurrentQuestion(introQ);
                  const stream = await startCamera();
                  if (stream) {
                    setIsRecording(true);
                  }
                  setIsLoadingTopic(false);
                }
              }}
              disabled={isLoadingTopic}
              className={`group relative px-10 py-4 rounded-2xl font-bold text-white shadow-xl transition-all disabled:opacity-50 overflow-hidden flex-1 sm:flex-none ${isRecording ? 'bg-slate-800 hover:bg-rose-600 border border-slate-700 hover:border-rose-500 hover:shadow-rose-900/50' : 'bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/50 hover:shadow-blue-900/80'}`}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
              <span className="relative flex items-center justify-center gap-2">
                {isLoadingTopic ? 'Preparing Workspace...' : isRecording ? 'End Session' : 'Initiate Session'}
              </span>
            </button>

            {!isRecording && sessionEvaluations.length > 0 && (
              <button 
                onClick={() => navigate('/summary', { state: { evaluations: sessionEvaluations } })}
                className="group relative px-10 py-4 rounded-2xl font-bold text-white shadow-xl transition-all disabled:opacity-50 overflow-hidden flex-1 sm:flex-none bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-purple-900/50 hover:shadow-purple-900/80"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                <span className="relative flex items-center justify-center gap-2">
                  View Session Summary
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </span>
              </button>
            )}
          </div>

          {/* Feedback & Transcript Panels */}
          {(isRecording || transcript || evaluation) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
              
              {/* Left Column: Context & Transcript */}
              <div className="flex flex-col gap-6">
                <div className="bg-linear-to-b from-slate-800/80 to-slate-900/80 p-6 rounded-3xl border border-slate-600/40 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    Active Prompt
                  </h3>
                  <p className="text-white font-medium text-lg leading-relaxed">{currentQuestion}</p>
                </div>

                <div className="bg-linear-to-b from-slate-800/80 to-slate-900/80 p-6 rounded-3xl border border-slate-600/40 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.5)] flex-1 min-h-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                      Live Transcription
                    </h3>
                    {isRecording && <span className="flex items-center gap-2 text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>Listening</span>}
                  </div>
                  <p className={`text-slate-200 font-medium leading-relaxed whitespace-pre-wrap ${!transcript && isRecording ? 'italic text-slate-500' : ''}`}>
                    {transcript || (isRecording ? "Begin speaking to transcribe..." : "Awaiting session start.")}
                  </p>
                </div>
              </div>

              {/* Right Column: Real-time Feedback / Results */}
              <div className="flex flex-col gap-6">
                <div className="bg-linear-to-b from-slate-800/80 to-slate-900/80 p-6 rounded-3xl border border-slate-600/40 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vision Metrics</h3>
                  <div className="px-4 py-2 bg-linear-to-b from-slate-900 to-slate-950 rounded-xl border border-slate-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-300">Status</span>
                    <span className={`text-sm font-bold ${aiFeedback.includes('Active') ? 'text-emerald-400' : aiFeedback.includes('Paused') ? 'text-slate-400' : 'text-amber-400'}`}>
                      {aiFeedback}
                    </span>
                  </div>
                </div>

                {evaluation && !isEvaluating && (
                  <div className="bg-linear-to-b from-slate-800/80 to-slate-900/80 p-6 rounded-3xl border border-slate-600/40 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.5)] flex-1 animate-[fadeIn_0.6s_ease-out]">
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Evaluation Report
                    </h3>
                    
                    <div className="flex items-center gap-6 mb-6">
                      <div className="flex gap-4 shrink-0">
                        <div className="w-20 h-20 rounded-full bg-linear-to-br from-slate-800 to-slate-900 border-4 border-slate-700 flex items-center justify-center flex-col shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)]" title="Overall Score">
                          <span className="text-2xl font-extrabold text-white">{evaluation.score}</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Overall</span>
                        </div>
                        <div className="w-20 h-20 rounded-full bg-linear-to-br from-slate-800 to-slate-900 border-4 border-purple-700/50 flex items-center justify-center flex-col shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)]" title="Confidence Score">
                          <span className="text-2xl font-extrabold text-purple-400">{evaluation.confidence_score || '-'}</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Conf.</span>
                        </div>
                      </div>
                      <div className="flex-1 bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20">
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-1">Executive Summary</span>
                        <p className="text-blue-100 text-sm italic">"{evaluation.advice}"</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-slate-900/40 p-4 rounded-2xl border-l-4 border-emerald-500 shadow-inner">
                        <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Strengths</h4>
                        <p className="text-slate-300 text-sm">{evaluation.strengths}</p>
                      </div>
                      <div className="bg-slate-900/40 p-4 rounded-2xl border-l-4 border-rose-500 shadow-inner">
                        <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">Areas for Growth</h4>
                        <p className="text-slate-300 text-sm">{evaluation.weaknesses}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
            </div>
          )}
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