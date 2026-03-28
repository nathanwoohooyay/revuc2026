import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================
// BACKEND API FUNCTIONS
// ============================================

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const fetchSongs = async () => {
  const res = await fetch(`${API_BASE}/api/songs`);
  if (!res.ok) throw new Error(`Failed to fetch songs (${res.status})`);
  return await res.json();
};

// Uses folderId (the actual folder name), not numeric id
const fetchSongStems = async (folderId) => {
  const res = await fetch(`${API_BASE}/api/songs/${folderId}/stems`);
  if (!res.ok) throw new Error(`Failed to fetch stems for ${folderId} (${res.status})`);
  return await res.json();
};

const startPracticeSession = async (songId, instrument) => {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ songId, instrument }),
  });
  if (!res.ok) throw new Error(`Failed to start session (${res.status})`);
  return await res.json();
};

const stopPracticeSession = async (sessionId) => {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/stop`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to stop session ${sessionId} (${res.status})`);
  return await res.json();
};

const sendMicChunk = async (sessionId, audioChunk) => {
  const formData = new FormData();
  formData.append('audio', audioChunk);
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/audio`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`Failed to send mic chunk (${res.status})`);
  return await res.json();
};

const fetchLiveAnalysis = async (sessionId) => {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/analysis`);
  if (!res.ok) throw new Error(`Failed to fetch analysis (${res.status})`);
  return await res.json();
};

const fetchCoachFeedback = async (sessionId) => {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/coach`);
  if (!res.ok) throw new Error(`Failed to fetch coach feedback (${res.status})`);
  return await res.json();
};

const fetchSessionSummary = async (sessionId) => {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/summary`);
  if (!res.ok) throw new Error(`Failed to fetch session summary (${res.status})`);
  return await res.json();
};

// ============================================
// UI COMPONENTS
// ============================================

const CatMascot = ({ size = "md", animate = true, className = "" }) => {
  const sizeClasses = { sm: "w-16 h-16", md: "w-24 h-24", lg: "w-32 h-32", xl: "w-40 h-40" };
  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className={`${animate ? 'cat-float' : ''} relative`}>
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl"
          style={{ filter: "drop-shadow(0 10px 30px rgba(236, 72, 153, 0.4))" }}>
          <defs>
            <linearGradient id="catBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f9a8d4" />
              <stop offset="50%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <linearGradient id="catEarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
          </defs>
          <path d="M145 140 Q175 130 170 95 Q165 70 150 75" stroke="url(#catBodyGrad)" strokeWidth="20" fill="none" strokeLinecap="round" />
          <ellipse cx="100" cy="135" rx="60" ry="50" fill="url(#catBodyGrad)" />
          <ellipse cx="65" cy="175" rx="15" ry="10" fill="#fce7f3" />
          <ellipse cx="135" cy="175" rx="15" ry="10" fill="#fce7f3" />
          <circle cx="100" cy="70" r="45" fill="url(#catBodyGrad)" />
          <path d="M60 45 L52 15 L80 40 Z" fill="url(#catEarGrad)" />
          <path d="M140 45 L148 15 L120 40 Z" fill="url(#catEarGrad)" />
          <path d="M65 42 L60 25 L75 38 Z" fill="#fce7f3" />
          <path d="M135 42 L140 25 L125 38 Z" fill="#fce7f3" />
          <ellipse cx="82" cy="65" rx="8" ry="10" fill="#1e1b4b" />
          <ellipse cx="118" cy="65" rx="8" ry="10" fill="#1e1b4b" />
          <circle cx="85" cy="62" r="3" fill="white" />
          <circle cx="121" cy="62" r="3" fill="white" />
          <path d="M94 78 L106 78 L100 85 Z" fill="#f472b6" />
          <path d="M100 85 Q90 95 82 90" stroke="#1e1b4b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M100 85 Q110 95 118 90" stroke="#1e1b4b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <line x1="55" y1="70" x2="30" y2="65" stroke="#1e1b4b" strokeWidth="1.5" opacity="0.4" />
          <line x1="55" y1="75" x2="28" y2="75" stroke="#1e1b4b" strokeWidth="1.5" opacity="0.4" />
          <line x1="55" y1="80" x2="30" y2="85" stroke="#1e1b4b" strokeWidth="1.5" opacity="0.4" />
          <line x1="145" y1="70" x2="170" y2="65" stroke="#1e1b4b" strokeWidth="1.5" opacity="0.4" />
          <line x1="145" y1="75" x2="172" y2="75" stroke="#1e1b4b" strokeWidth="1.5" opacity="0.4" />
          <line x1="145" y1="80" x2="170" y2="85" stroke="#1e1b4b" strokeWidth="1.5" opacity="0.4" />
          <ellipse cx="70" cy="78" rx="8" ry="5" fill="#fbcfe8" opacity="0.6" />
          <ellipse cx="130" cy="78" rx="8" ry="5" fill="#fbcfe8" opacity="0.6" />
        </svg>
      </div>
      <style>{`
        .cat-float { animation: catFloat 3s ease-in-out infinite; }
        .cat-float:hover { animation: catBounce 0.5s ease; }
        @keyframes catFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-10px) rotate(2deg); }
          50% { transform: translateY(-5px) rotate(0deg); }
          75% { transform: translateY(-12px) rotate(-2deg); }
        }
        @keyframes catBounce {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.1) rotate(-8deg); }
          50% { transform: scale(1.15) rotate(8deg); }
          75% { transform: scale(1.05) rotate(-4deg); }
        }
        .slider::-webkit-slider-thumb {
          appearance: none; height: 16px; width: 16px; border-radius: 50%;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .slider::-moz-range-thumb {
          height: 16px; width: 16px; border-radius: 50%;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          cursor: pointer; border: none; box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
};

const GradientButton = ({ children, onClick, className = "", size = "md", variant = "primary", disabled = false }) => {
  const sizeClasses = { sm: "px-5 py-2 text-sm", md: "px-8 py-3 text-base", lg: "px-10 py-4 text-lg" };
  const variants = {
    primary: "bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 text-white hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]",
    secondary: "bg-white/30 text-gray-700 border border-white/50 hover:bg-white/50",
    danger: "bg-gradient-to-r from-red-400 to-pink-400 text-white hover:shadow-[0_0_30px_rgba(248,113,113,0.5)]"
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`relative overflow-hidden rounded-full font-semibold ${sizeClasses[size]} ${variants[variant]}
        transform transition-all duration-300 ease-out hover:scale-105 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed group ${className}`}>
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
      {variant === 'primary' && (
        <div className="absolute inset-0 bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
    </button>
  );
};

const GlassCard = ({ children, className = "", onClick, hover = true, padding = "normal" }) => {
  const paddingClasses = { none: "", small: "p-4", normal: "p-6", large: "p-8" };
  return (
    <div onClick={onClick}
      className={`bg-white/25 backdrop-blur-2xl rounded-3xl border border-white/40
        shadow-[0_8px_32px_rgba(236,72,153,0.12)] ${paddingClasses[padding]}
        ${hover && onClick ? 'cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(236,72,153,0.2)] hover:bg-white/30' : ''}
        ${className}`}>
      {children}
    </div>
  );
};

const StatusBadge = ({ status, text }) => {
  const styles = {
    on_tempo: "bg-emerald-100 text-emerald-700 border-emerald-200",
    early: "bg-amber-100 text-amber-700 border-amber-200",
    late: "bg-rose-100 text-rose-700 border-rose-200",
    correct: "bg-emerald-100 text-emerald-700 border-emerald-200",
    wrong_note: "bg-rose-100 text-rose-700 border-rose-200",
    wrong_chord: "bg-orange-100 text-orange-700 border-orange-200",
    active: "bg-blue-100 text-blue-700 border-blue-200",
    inactive: "bg-gray-100 text-gray-600 border-gray-200",
    recording: "bg-red-100 text-red-700 border-red-200 animate-pulse"
  };
  const dotColor = status === 'recording' ? 'bg-red-500 animate-pulse'
    : (status === 'on_tempo' || status === 'correct') ? 'bg-emerald-500'
    : status === 'early' ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border ${styles[status] || styles.inactive}`}>
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      {text}
    </span>
  );
};

const ProgressBar = ({ progress, className = "" }) => (
  <div className={`h-2 bg-white/40 rounded-full overflow-hidden ${className}`}>
    <div className="h-full bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 rounded-full transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
  </div>
);

// ============================================
// PAGES
// ============================================

const LandingPage = ({ onStart }) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute top-10 left-10 w-96 h-96 bg-pink-300/40 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-purple-300/40 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-indigo-300/30 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-20 right-1/4 w-64 h-64 bg-blue-300/30 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '0.5s' }} />
    </div>
    <div className="absolute top-20 right-12 md:right-24 opacity-90">
      <CatMascot size="lg" />
    </div>
    <div className="text-center z-10 max-w-3xl">
      <div className="mb-8 inline-flex items-center gap-3 px-5 py-2.5 bg-white/30 backdrop-blur-xl rounded-full border border-white/50 shadow-lg">
        <span className="w-2.5 h-2.5 bg-pink-500 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-gray-700 tracking-wide">AI-Powered Music Practice</span>
      </div>
      <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-purple-500 via-indigo-500 to-blue-500 bg-clip-text text-transparent leading-tight tracking-tight">
        PitchPurrfect
      </h1>
      <p className="text-2xl md:text-3xl text-gray-600 mb-4 font-light">Master your instruments with intelligent feedback</p>
      <p className="text-lg text-gray-500 mb-12 max-w-xl mx-auto leading-relaxed">
        Isolate stems, practice with precision, and receive real-time AI coaching. Your personal music companion that listens, analyzes, and guides.
      </p>
      <GradientButton onClick={onStart} size="lg">
        <span>Start Your Session</span>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </GradientButton>
    </div>
    <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex gap-8 text-gray-400">
      {[["pink", "Real-time Analysis"], ["purple", "AI Coaching"], ["indigo", "Voice Feedback"]].map(([color, label]) => (
        <div key={label} className="flex items-center gap-2">
          <div className={`w-2 h-2 bg-${color}-400 rounded-full`} />
          <span className="text-sm">{label}</span>
        </div>
      ))}
    </div>
  </div>
);

const SongSelectPage = ({ onSelectSong, onBack }) => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSongs()
      .then(data => { setSongs(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen px-6 py-8 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 -z-10" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-pink-200/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-200/30 rounded-full blur-[120px]" />
      <div className="flex items-center justify-between mb-12 max-w-7xl mx-auto">
        <button onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-pink-600 transition-colors px-5 py-2.5 rounded-full hover:bg-white/40 backdrop-blur-sm font-medium">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-4">
          <CatMascot size="sm" animate={false} />
          <span className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">PitchPurrfect</span>
        </div>
        <div className="w-24" />
      </div>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">Choose Your Track</h2>
          <p className="text-gray-500 text-lg">Select a song to begin your practice session</p>
        </div>
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-16 h-16 border-4 border-pink-300 border-t-pink-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">
            <p className="text-lg font-medium">Failed to load songs</p>
            <p className="text-sm mt-2">{error}</p>
            <p className="text-sm mt-1 text-gray-400">Make sure the backend is running on port 8000</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {songs.map((song) => (
              <GlassCard key={song.id} onClick={() => onSelectSong(song)} className="group" padding="large">
                <div className="relative mb-6 w-full aspect-square rounded-2xl overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-500">
                  {song.coverUrl ? (
                    <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 flex items-center justify-center">
                      <svg className="w-16 h-16 text-pink-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-2xl transition-all flex items-center justify-center">
                    <div className="w-16 h-16 bg-white/95 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300 shadow-xl">
                      <svg className="w-7 h-7 text-pink-500 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <h3 className="font-bold text-xl text-gray-800 mb-1 group-hover:text-pink-600 transition-colors">{song.title}</h3>
                <p className="text-gray-500">{song.artist}</p>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// PRACTICE PAGE — all audio + timer fixes here
// ============================================

const PracticePage = ({ selectedSong, onBack, onEndSession, sessionState, setSessionState }) => {
  const [stems, setStems] = useState({});
  const [stemsLoaded, setStemsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedInstrument, setSelectedInstrument] = useState('guitar');
  const [micPermission, setMicPermission] = useState('prompt');
  const [isRecording, setIsRecording] = useState(false);
  const [liveAnalysis, setLiveAnalysis] = useState(null);
  const [coachFeedback, setCoachFeedback] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [audioError, setAudioError] = useState(null);

  const progressInterval = useRef(null);
  const analysisInterval = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioRefs = useRef({});       // key -> HTMLAudioElement
  const stemsRef = useRef({});        // mirror of stems state for use inside intervals

  // Keep stemsRef in sync
  useEffect(() => { stemsRef.current = stems; }, [stems]);

  // ── Load stems on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!selectedSong?.folderId) return;

    setStemsLoaded(false);
    setAudioError(null);

    fetchSongStems(selectedSong.folderId)
      .then(data => {
        setStems(data);

        // Create one Audio element per stem
        const newAudios = {};
        Object.entries(data).forEach(([key, stem]) => {
          if (!stem.url) return;
          const audio = new Audio();
          audio.crossOrigin = "anonymous";
          audio.preload = "auto";

          audio.addEventListener('error', (e) => {
            console.error(`Audio error [${key}]:`, audio.error?.message, stem.url);
            setAudioError(`Failed to load ${key}: ${audio.error?.message || 'unknown error'}`);
          });

          audio.src = stem.url;
          audio.volume = (stem.volume ?? 80) / 100;
          audio.muted = !stem.active;  // respect initial active state
          audio.load();
          newAudios[key] = audio;
        });

        audioRefs.current = newAudios;
        setStemsLoaded(true);
      })
      .catch(err => {
        console.error('Failed to load stems:', err);
        setAudioError(err.message);
      });

    // Cleanup audio on unmount / song change
    return () => {
      Object.values(audioRefs.current).forEach(a => { a.pause(); a.src = ''; });
      audioRefs.current = {};
    };
  }, [selectedSong?.folderId]);

  // ── Volume sync ──────────────────────────────────────────────────────
  useEffect(() => {
    Object.entries(stems).forEach(([key, stem]) => {
      if (audioRefs.current[key]) {
        audioRefs.current[key].volume = (stem.volume ?? 80) / 100;
      }
    });
  }, [stems]);

  // ── Play / Pause logic ───────────────────────────────────────────────
  useEffect(() => {
    clearInterval(progressInterval.current);

    if (isPlaying) {
      // Play all active stems
      const playAll = async () => {
        for (const [key, audio] of Object.entries(audioRefs.current)) {
          try {
            if (audio.readyState < 3) {
              await new Promise((resolve, reject) => {
                const onCanPlay = () => { audio.removeEventListener('canplaythrough', onCanPlay); resolve(); };
                const onError  = () => { audio.removeEventListener('error', onError); reject(new Error('load error')); };
                audio.addEventListener('canplaythrough', onCanPlay);
                audio.addEventListener('error', onError);
              });
            }
            // Mute inactive stems but keep them playing so all tracks stay in sync
            audio.muted = !stemsRef.current[key]?.active;
            const leader = Object.values(audioRefs.current).find(a => a.duration > 0);
            if (leader && leader !== audio) {
              audio.currentTime = leader.currentTime;
            }
            await audio.play();
          } catch (err) {
            console.warn(`Could not play ${key}:`, err.message);
          }
        }
      };
      playAll();

      // Progress ticker
      progressInterval.current = setInterval(() => {
        // Find first audio with a real duration as the clock source
        const leader = Object.values(audioRefs.current).find(a => a && a.duration > 0 && !a.paused);
        if (leader) {
          const pct = (leader.currentTime / leader.duration) * 100;
          setProgress(pct);
          if (pct >= 99.5) {
            setIsPlaying(false);
            setProgress(0);
          }
        }
      }, 200);
    } else {
      // Pause all — mute state is preserved so toggles still work correctly
      Object.values(audioRefs.current).forEach(a => { try { a.pause(); } catch (_) {} });
    }

    return () => clearInterval(progressInterval.current);
  }, [isPlaying]);

  // ── Live analysis polling ────────────────────────────────────────────
  useEffect(() => {
    if (isRecording && sessionState.sessionId) {
      analysisInterval.current = setInterval(async () => {
        try {
          const analysis = await fetchLiveAnalysis(sessionState.sessionId);
          setLiveAnalysis(analysis);
          if (Math.random() > 0.65) {
            const feedback = await fetchCoachFeedback(sessionState.sessionId);
            setCoachFeedback(feedback);
          }
        } catch (err) { console.warn('Analysis poll error:', err.message); }
      }, 2500);
    } else {
      clearInterval(analysisInterval.current);
    }
    return () => clearInterval(analysisInterval.current);
  }, [isRecording, sessionState.sessionId]);

  // ── Stem toggle ──────────────────────────────────────────────────────
  const toggleStem = (key) => {
    setStems(prev => {
      const nowActive = !prev[key]?.active;
      const audio = audioRefs.current[key];
      if (audio) {
        audio.muted = !nowActive;
      }
      return { ...prev, [key]: { ...prev[key], active: nowActive } };
    });
  };

  // ── Seek on progress bar click ───────────────────────────────────────
  const handleSeek = (pct) => {
    setProgress(pct);
    Object.values(audioRefs.current).forEach(audio => {
      if (audio.duration > 0) audio.currentTime = (pct / 100) * audio.duration;
    });
  };

  // ── Microphone ───────────────────────────────────────────────────────
  const requestMicAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setMicPermission('granted');
    } catch {
      setMicPermission('denied');
    }
  };

  const startRecording = () => {
    if (!mediaStreamRef.current) return;
    const recorder = new MediaRecorder(mediaStreamRef.current);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = async (e) => {
      if (e.data.size > 0 && sessionState.sessionId) {
        await sendMicChunk(sessionState.sessionId, e.data).catch(console.warn);
      }
    };
    recorder.start(1000);
  };

  // ── Session controls ─────────────────────────────────────────────────
  const startSession = async () => {
    const session = await startPracticeSession(selectedSong.folderId, selectedInstrument);
    setSessionState({ sessionId: session.sessionId, status: 'active' });
    setIsRecording(true);
    setIsPlaying(true);
    startRecording();
    fetchLiveAnalysis(session.sessionId).then(setLiveAnalysis).catch(console.warn);
  };

  const stopSession = async () => {
    clearInterval(progressInterval.current);
    clearInterval(analysisInterval.current);

    Object.values(audioRefs.current).forEach(a => { try { a.pause(); a.currentTime = 0; } catch (_) {} });
    setProgress(0);
    setIsPlaying(false);
    setIsRecording(false);

    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    if (sessionState.sessionId) {
      try {
        await stopPracticeSession(sessionState.sessionId);
        const summary = await fetchSessionSummary(sessionState.sessionId);
        setSessionSummary(summary);
        setShowSummary(true);
      } catch (err) { console.error('Stop session error:', err); }
    }

    setSessionState({ sessionId: null, status: 'idle' });
  };

  // ── Helpers ──────────────────────────────────────────────────────────
  const formatTime = (pct) => {
    const leader = Object.values(audioRefs.current).find(a => a?.duration > 0);
    const total = leader?.duration || 0;
    const secs = Math.floor((pct / 100) * total);
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  };

  const formatDuration = () => {
    const leader = Object.values(audioRefs.current).find(a => a?.duration > 0);
    if (!leader) return '--:--';
    const secs = Math.floor(leader.duration);
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  };

  const instruments = [
    { key: 'guitar', icon: '🎸', label: 'Guitar' },
    { key: 'piano',  icon: '🎹', label: 'Piano'  },
    { key: 'drums',  icon: '🥁', label: 'Drums'  },
    { key: 'vocals', icon: '🎤', label: 'Vocals' },
  ];

  const stemMeta = {
    drums:  { icon: '🥁', color: 'from-pink-400 to-rose-400'    },
    bass:   { icon: '🎸', color: 'from-purple-400 to-violet-400' },
    vocals: { icon: '🎤', color: 'from-indigo-400 to-blue-400'  },
    other:  { icon: '🎹', color: 'from-cyan-400 to-teal-400'    },
  };

  return (
    <div className="min-h-screen px-6 py-6 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 -z-10" />
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-pink-200/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-200/30 rounded-full blur-[120px]" />

      {/* Nav */}
      <div className="flex items-center justify-between mb-8 max-w-7xl mx-auto">
        <button onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-pink-600 transition-colors px-5 py-2.5 rounded-full hover:bg-white/40 backdrop-blur-sm font-medium">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Songs
        </button>
        <div className="flex items-center gap-4">
          <CatMascot size="sm" animate={false} />
          <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">PitchPurrfect</span>
        </div>
        <GradientButton onClick={stopSession} size="sm" variant="danger">End Session</GradientButton>
      </div>

      <div className="max-w-6xl mx-auto">

        {/* Audio error banner */}
        {audioError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
            ⚠️ {audioError}
          </div>
        )}

        {/* Player + Instrument row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <GlassCard className="lg:col-span-2" hover={false} padding="large">
            <div className="flex items-center gap-6">
              <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
                  {selectedSong?.coverUrl ? (
                    <img src={selectedSong.coverUrl} alt={selectedSong.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center">
                      <svg className="w-12 h-12 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                      </svg>
                    </div>
                  )}
                </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-gray-800 mb-1 truncate">{selectedSong?.title}</h2>
                <p className="text-gray-500 mb-4">{selectedSong?.artist}</p>

                {/* Clickable progress bar for seeking */}
                <div className="mb-1 cursor-pointer" onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = ((e.clientX - rect.left) / rect.width) * 100;
                  handleSeek(Math.max(0, Math.min(100, pct)));
                }}>
                  <ProgressBar progress={progress} />
                </div>

                <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                  <span>{formatTime(progress)}</span>
                  <span>{!stemsLoaded ? 'Loading…' : formatDuration()}</span>
                </div>

                <div className="flex items-center gap-4">
                  <button onClick={() => handleSeek(Math.max(0, progress - 10))}
                    className="w-10 h-10 rounded-full bg-white/50 hover:bg-white/80 flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
                    </svg>
                  </button>

                  <button onClick={() => stemsLoaded && setIsPlaying(p => !p)}
                    disabled={!stemsLoaded}
                    className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center disabled:opacity-50">
                    {isPlaying ? (
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  <button onClick={() => handleSeek(Math.min(100, progress + 10))}
                    className="w-10 h-10 rounded-full bg-white/50 hover:bg-white/80 flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                    </svg>
                  </button>

                  {!stemsLoaded && (
                    <span className="text-sm text-gray-400 ml-2">Loading audio…</span>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard hover={false} padding="large">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Your Instrument</h3>
            <div className="grid grid-cols-2 gap-3">
              {instruments.map(({ key, icon, label }) => (
                <button key={key} onClick={() => setSelectedInstrument(key)} disabled={isRecording}
                  className={`p-4 rounded-2xl border-2 transition-all duration-300 text-center
                    ${selectedInstrument === key ? 'bg-gradient-to-br from-pink-100 to-purple-100 border-pink-400 shadow-md' : 'bg-white/30 border-transparent hover:bg-white/50'}
                    ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <div className="text-3xl mb-2">{icon}</div>
                  <div className={`font-medium text-sm ${selectedInstrument === key ? 'text-gray-800' : 'text-gray-600'}`}>{label}</div>
                </button>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Stem mixer */}
        <GlassCard className="mb-6" hover={false} padding="large">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            Mix Stems
            {!stemsLoaded && <span className="text-sm font-normal text-gray-400 ml-2">— loading…</span>}
          </h3>
          {Object.keys(stems).length === 0 && stemsLoaded ? (
            <p className="text-gray-400 text-sm">No stems found for this song.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.keys(stems).map((key) => {
                const meta = stemMeta[key] || { icon: '🎵', color: 'from-gray-400 to-gray-500' };
                return (
                  <div key={key} className="flex flex-col items-center">
                    <button onClick={() => toggleStem(key)}
                      className={`p-4 rounded-2xl border-2 transition-all duration-300 w-full
                        ${stems[key]?.active ? `bg-gradient-to-br ${meta.color} bg-opacity-10 border-white/50 shadow-md` : 'bg-white/20 border-transparent opacity-40 grayscale'}`}>
                      <div className="text-3xl mb-2">{meta.icon}</div>
                      <div className={`font-medium text-sm ${stems[key]?.active ? 'text-gray-800' : 'text-gray-500'}`}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </div>
                    </button>
                    <div className="mt-2 w-full px-2">
                      <input type="range" min="0" max="100" value={stems[key]?.volume ?? 80}
                        onChange={(e) => setStems(prev => ({ ...prev, [key]: { ...prev[key], volume: +e.target.value } }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
                      <div className="text-xs text-center text-gray-500 mt-1">{stems[key]?.volume ?? 80}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Session controls / live panels */}
        {!isRecording ? (
          <div className="flex justify-center mb-8">
            {micPermission === 'prompt' ? (
              <GradientButton onClick={requestMicAccess} size="lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Enable Microphone
              </GradientButton>
            ) : micPermission === 'granted' ? (
              <GradientButton onClick={startSession} size="lg" disabled={!stemsLoaded}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {stemsLoaded ? 'Start Practice Session' : 'Loading Audio…'}
              </GradientButton>
            ) : (
              <div className="text-center">
                <p className="text-red-500 mb-2">Microphone access denied</p>
                <GradientButton onClick={requestMicAccess} variant="secondary">Try Again</GradientButton>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Live Analysis */}
            <GlassCard hover={false}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">Live Analysis</h3>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              {liveAnalysis ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Timing</div>
                    <StatusBadge status={liveAnalysis.timing.status}
                      text={liveAnalysis.timing.status === 'on_tempo' ? 'On Tempo' : liveAnalysis.timing.status === 'early' ? 'Slightly Early' : 'Slightly Late'} />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Pitch</div>
                    <StatusBadge status={liveAnalysis.pitch.status}
                      text={liveAnalysis.pitch.status === 'correct' ? 'Correct' : liveAnalysis.pitch.status === 'wrong_note' ? 'Wrong Note' : 'Wrong Chord'} />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Score</div>
                    <div className="text-3xl font-bold text-gray-800">{liveAnalysis.overall.score}%</div>
                    <ProgressBar progress={liveAnalysis.overall.score} className="mt-2" />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="w-8 h-8 border-2 border-pink-300 border-t-pink-500 rounded-full animate-spin mx-auto mb-2" />
                  Analyzing…
                </div>
              )}
            </GlassCard>

            {/* AI Coach */}
            <GlassCard hover={false}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">AI Coach</h3>
                <CatMascot size="sm" animate={false} />
              </div>
              {coachFeedback ? (
                <div className={`p-4 rounded-2xl ${
                  coachFeedback.type === 'encouragement' ? 'bg-emerald-50 border border-emerald-100' :
                  coachFeedback.type === 'correction' ? 'bg-amber-50 border border-amber-100' :
                  'bg-blue-50 border border-blue-100'}`}>
                  <p className="text-gray-700 leading-relaxed">{coachFeedback.message}</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>Listening to your performance…</p>
                </div>
              )}
            </GlassCard>

            {/* Voice / status */}
            <GlassCard hover={false}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">Session Status</h3>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-white/30 rounded-xl">
                  <div className="text-sm text-gray-500 mb-2">Recording</div>
                  <StatusBadge status="recording" text="Active" />
                </div>
                <div className="p-4 bg-white/30 rounded-xl">
                  <div className="text-sm text-gray-500 mb-2">Audio Input</div>
                  <div className="flex items-end gap-1 h-8">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-pink-400 to-purple-400 rounded-full"
                        style={{ height: `${20 + Math.random() * 80}%`, transition: 'height 0.2s' }} />
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      {/* Summary modal */}
      {showSummary && sessionSummary && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8"
            style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div className="text-center mb-8">
              <CatMascot size="md" className="mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Session Complete!</h2>
              <p className="text-gray-500">Here's how you performed</p>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { value: `${sessionSummary.overallScore}%`, label: 'Overall', gradient: 'from-pink-500 to-purple-500', bg: 'from-pink-50 to-purple-50' },
                { value: `${sessionSummary.timingAccuracy.onTempo}%`, label: 'On Tempo', gradient: 'from-purple-500 to-indigo-500', bg: 'from-purple-50 to-indigo-50' },
                { value: `${sessionSummary.noteAccuracy.correct}%`, label: 'Notes Correct', gradient: 'from-indigo-500 to-blue-500', bg: 'from-indigo-50 to-blue-50' },
              ].map(({ value, label, gradient, bg }) => (
                <div key={label} className={`text-center p-4 bg-gradient-to-br ${bg} rounded-2xl`}>
                  <div className={`text-4xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent mb-1`}>{value}</div>
                  <div className="text-sm text-gray-500">{label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-4 mb-8">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Highlights</h3>
                <ul className="space-y-2">
                  {sessionSummary.coachingPoints.map((p, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-600">
                      <span className="text-emerald-500 mt-0.5">✓</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Focus Areas</h3>
                <ul className="space-y-2">
                  {sessionSummary.improvementAreas.map((a, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-600">
                      <span className="text-amber-500 mt-0.5">→</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex gap-4">
              <GradientButton onClick={() => { setShowSummary(false); onEndSession(); }} className="flex-1">Back to Home</GradientButton>
              <GradientButton onClick={() => setShowSummary(false)} variant="secondary" className="flex-1">Continue Practicing</GradientButton>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1);    }
        }
      `}</style>
    </div>
  );
};

// ============================================
// MAIN APP
// ============================================

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [selectedSong, setSelectedSong] = useState(null);
  const [sessionState, setSessionState] = useState({ sessionId: null, status: 'idle' });

  const handleSelectSong = (song) => { setSelectedSong(song); setCurrentPage('practice'); };
  const handleEndSession = () => { setSelectedSong(null); setSessionState({ sessionId: null, status: 'idle' }); setCurrentPage('landing'); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 font-sans">
      {currentPage === 'landing'     && <LandingPage onStart={() => setCurrentPage('songSelect')} />}
      {currentPage === 'songSelect'  && <SongSelectPage onSelectSong={handleSelectSong} onBack={() => setCurrentPage('landing')} />}
      {currentPage === 'practice' && selectedSong && (
        <PracticePage
          selectedSong={selectedSong}
          onBack={() => setCurrentPage('songSelect')}
          onEndSession={handleEndSession}
          sessionState={sessionState}
          setSessionState={setSessionState}
        />
      )}
    </div>
  );
}