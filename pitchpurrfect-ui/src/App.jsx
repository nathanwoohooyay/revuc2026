import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================
// BACKEND API PLACEHOLDER FUNCTIONS
// ============================================

const fetchSongs = async () => {
  // TODO: replace with real backend call
  // const res = await fetch("/api/songs")
  // return await res.json()
  return [
    { id: 1, title: "Midnight Dreams", artist: "Luna Wave", duration: "3:45", cover: "🌙", bpm: 120 },
    { id: 2, title: "Cherry Blossom", artist: "Sakura Beats", duration: "4:12", cover: "🌸", bpm: 95 },
    { id: 3, title: "Neon Lights", artist: "Tokyo Pulse", duration: "3:28", cover: "✨", bpm: 128 },
    { id: 4, title: "Ocean Breeze", artist: "Coastal Vibes", duration: "3:56", cover: "🌊", bpm: 110 },
    { id: 5, title: "Starlight", artist: "Night Sky", duration: "4:05", cover: "⭐", bpm: 105 },
    { id: 6, title: "Morning Dew", artist: "Fresh Start", duration: "3:33", cover: "💧", bpm: 115 },
  ];
};

const fetchSongStems = async (songId) => {
  // TODO: replace with real backend call
  // const res = await fetch(`/api/songs/${songId}/stems`)
  // return await res.json()
  return {
    drums: { active: true, volume: 80, url: `/audio/${songId}/drums.mp3` },
    bass: { active: true, volume: 75, url: `/audio/${songId}/bass.mp3` },
    vocals: { active: true, volume: 85, url: `/audio/${songId}/vocals.mp3` },
    other: { active: true, volume: 70, url: `/audio/${songId}/other.mp3` },
  };
};

const startPracticeSession = async (songId, instrument) => {
  // TODO: replace with real backend call
  // const res = await fetch("/api/sessions", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ songId, instrument })
  // })
  // return await res.json()
  return {
    sessionId: `session_${Date.now()}`,
    songId,
    instrument,
    startedAt: new Date().toISOString(),
    status: 'active'
  };
};

const stopPracticeSession = async (sessionId) => {
  // TODO: replace with real backend call
  // const res = await fetch(`/api/sessions/${sessionId}/stop`, { method: "POST" })
  // return await res.json()
  return {
    sessionId,
    status: 'completed',
    endedAt: new Date().toISOString()
  };
};

const sendMicChunk = async (sessionId, audioChunk) => {
  // TODO: replace with real backend call
  // const formData = new FormData()
  // formData.append('audio', audioChunk)
  // const res = await fetch(`/api/sessions/${sessionId}/audio`, {
  //   method: "POST",
  //   body: formData
  // })
  // return await res.json()
  return { received: true, timestamp: Date.now() };
};

const fetchLiveAnalysis = async (sessionId) => {
  // TODO: replace with real backend call
  // const res = await fetch(`/api/sessions/${sessionId}/analysis`)
  // return await res.json()
  return {
    timing: {
      status: 'on_tempo',
      deviation: 0.02,
      confidence: 0.94
    },
    pitch: {
      status: 'correct',
      currentNote: 'C4',
      targetNote: 'C4',
      confidence: 0.91
    },
    rhythm: {
      consistency: 0.88,
      score: 92
    },
    overall: {
      score: 90,
      trend: 'improving'
    }
  };
};

const fetchCoachFeedback = async (sessionId) => {
  // TODO: replace with real backend call
  // const res = await fetch(`/api/sessions/${sessionId}/coach`)
  // return await res.json()
  return {
    message: "Great timing! You're staying right on the beat. Try adding a bit more dynamics to your playing.",
    type: 'encouragement',
    priority: 'normal',
    voiceUrl: null
  };
};

const fetchSessionSummary = async (sessionId) => {
  // TODO: replace with real backend call
  // const res = await fetch(`/api/sessions/${sessionId}/summary`)
  // return await res.json()
  return {
    sessionId,
    duration: 185,
    overallScore: 87,
    timingAccuracy: {
      onTempo: 78,
      early: 15,
      late: 7
    },
    noteAccuracy: {
      correct: 82,
      wrongNote: 12,
      wrongChord: 6
    },
    rhythmConsistency: 0.85,
    coachingPoints: [
      "Excellent rhythm on the chorus section",
      "Watch your timing during bridge transitions",
      "Great dynamic control throughout"
    ],
    improvementAreas: [
      "Practice chord transitions at 0:45-1:15",
      "Focus on maintaining tempo during solos"
    ]
  };
};

const playVoiceFeedback = async (audioUrl) => {
  // TODO: implement actual audio playback
  // const audio = new Audio(audioUrl)
  // await audio.play()
  return { playing: true };
};

// ============================================
// UI COMPONENTS
// ============================================

const CatMascot = ({ size = "md", animate = true, className = "" }) => {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
    xl: "w-40 h-40"
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className={`${animate ? 'cat-float' : ''} relative`}>
        <svg 
          viewBox="0 0 200 200" 
          className="w-full h-full drop-shadow-xl"
          style={{ filter: "drop-shadow(0 10px 30px rgba(236, 72, 153, 0.4))" }}
        >
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
          
          <path d="M145 140 Q175 130 170 95 Q165 70 150 75" 
                stroke="url(#catBodyGrad)" strokeWidth="20" fill="none" strokeLinecap="round" />
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
        .cat-float {
          animation: catFloat 3s ease-in-out infinite;
        }
        .cat-float:hover {
          animation: catBounce 0.5s ease;
        }
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
      `}</style>
    </div>
  );
};

const GradientButton = ({ children, onClick, className = "", size = "md", variant = "primary", disabled = false }) => {
  const sizeClasses = {
    sm: "px-5 py-2 text-sm",
    md: "px-8 py-3 text-base",
    lg: "px-10 py-4 text-lg",
  };
  
  const variants = {
    primary: "bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 text-white hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]",
    secondary: "bg-white/30 text-gray-700 border border-white/50 hover:bg-white/50",
    danger: "bg-gradient-to-r from-red-400 to-pink-400 text-white hover:shadow-[0_0_30px_rgba(248,113,113,0.5)]"
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative overflow-hidden rounded-full font-semibold
        ${sizeClasses[size]}
        ${variants[variant]}
        transform transition-all duration-300 ease-out
        hover:scale-105 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        group
        ${className}
      `}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
      {variant === 'primary' && (
        <div className="absolute inset-0 bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
    </button>
  );
};

const GlassCard = ({ children, className = "", onClick, hover = true, padding = "normal" }) => {
  const paddingClasses = {
    none: "",
    small: "p-4",
    normal: "p-6",
    large: "p-8"
  };
  
  return (
    <div
      onClick={onClick}
      className={`
        bg-white/25 backdrop-blur-2xl rounded-3xl border border-white/40
        shadow-[0_8px_32px_rgba(236,72,153,0.12)]
        ${paddingClasses[padding]}
        ${hover && onClick ? 'cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(236,72,153,0.2)] hover:bg-white/30' : ''}
        ${className}
      `}
    >
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
  
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border ${styles[status] || styles.inactive}`}>
      <span className={`w-2 h-2 rounded-full ${status === 'recording' ? 'bg-red-500 animate-pulse' : status.includes('on') || status === 'correct' ? 'bg-emerald-500' : status.includes('early') ? 'bg-amber-500' : 'bg-rose-500'}`} />
      {text}
    </span>
  );
};

const ProgressBar = ({ progress, className = "" }) => (
  <div className={`h-2 bg-white/40 rounded-full overflow-hidden ${className}`}>
    <div 
      className="h-full bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 rounded-full transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
    />
  </div>
);

// ============================================
// PAGES
// ============================================

const LandingPage = ({ onStart }) => {
  return (
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
        
        <p className="text-2xl md:text-3xl text-gray-600 mb-4 font-light">
          Master your instruments with intelligent feedback
        </p>
        
        <p className="text-lg text-gray-500 mb-12 max-w-xl mx-auto leading-relaxed">
          Isolate stems, practice with precision, and receive real-time AI coaching. 
          Your personal music companion that listens, analyzes, and guides.
        </p>
        
        <GradientButton onClick={onStart} size="lg">
          <span>Start Your Session</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </GradientButton>
      </div>
      
      <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex gap-8 text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-pink-400 rounded-full" />
          <span className="text-sm">Real-time Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-400 rounded-full" />
          <span className="text-sm">AI Coaching</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-indigo-400 rounded-full" />
          <span className="text-sm">Voice Feedback</span>
        </div>
      </div>
    </div>
  );
};

const SongSelectPage = ({ onSelectSong, onBack }) => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSongs = async () => {
      const data = await fetchSongs();
      setSongs(data);
      setLoading(false);
    };
    loadSongs();
  }, []);

  return (
    <div className="min-h-screen px-6 py-8 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 -z-10" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-pink-200/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-200/30 rounded-full blur-[120px]" />
      
      <div className="flex items-center justify-between mb-12 max-w-7xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-pink-600 transition-colors px-5 py-2.5 rounded-full hover:bg-white/40 backdrop-blur-sm font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>
        
        <div className="flex items-center gap-4">
          <CatMascot size="sm" animate={false} />
          <span className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            PitchPurrfect
          </span>
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {songs.map((song) => (
              <GlassCard 
                key={song.id} 
                onClick={() => onSelectSong(song)}
                className="group"
                padding="large"
              >
                <div className="relative mb-6">
                  <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 flex items-center justify-center text-7xl shadow-inner group-hover:scale-105 transition-transform duration-500">
                    {song.cover}
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-2xl transition-all flex items-center justify-center">
                    <div className="w-16 h-16 bg-white/95 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300 shadow-xl">
                      <svg className="w-7 h-7 text-pink-500 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <h3 className="font-bold text-xl text-gray-800 mb-2 group-hover:text-pink-600 transition-colors">
                  {song.title}
                </h3>
                <p className="text-gray-500 mb-4">{song.artist}</p>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 font-medium">{song.duration}</span>
                  <span className="px-3 py-1 bg-white/50 rounded-full text-gray-500 font-medium">{song.bpm} BPM</span>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const PracticePage = ({ 
  selectedSong, 
  onBack, 
  onEndSession,
  sessionState,
  setSessionState
}) => {
  const [stems, setStems] = useState({ drums: true, bass: true, vocals: true, other: true });
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedInstrument, setSelectedInstrument] = useState('guitar');
  const [micPermission, setMicPermission] = useState('prompt');
  const [isRecording, setIsRecording] = useState(false);
  const [liveAnalysis, setLiveAnalysis] = useState(null);
  const [coachFeedback, setCoachFeedback] = useState(null);
  const [voiceStatus, setVoiceStatus] = useState('idle');
  const [showSummary, setShowSummary] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  
  const progressInterval = useRef(null);
  const analysisInterval = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    const loadStems = async () => {
      const data = await fetchSongStems(selectedSong.id);
      setStems({
        drums: data.drums.active,
        bass: data.bass.active,
        vocals: data.vocals.active,
        other: data.other.active,
      });
    };
    loadStems();
  }, [selectedSong]);

  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 0.3;
        });
      }, 100);
    } else {
      clearInterval(progressInterval.current);
    }
    return () => clearInterval(progressInterval.current);
  }, [isPlaying]);

  useEffect(() => {
    if (isRecording && sessionState.sessionId) {
      analysisInterval.current = setInterval(async () => {
        const analysis = await fetchLiveAnalysis(sessionState.sessionId);
        setLiveAnalysis(analysis);
        
        if (Math.random() > 0.7) {
          const feedback = await fetchCoachFeedback(sessionState.sessionId);
          setCoachFeedback(feedback);
        }
      }, 2000);
    } else {
      clearInterval(analysisInterval.current);
    }
    return () => clearInterval(analysisInterval.current);
  }, [isRecording, sessionState.sessionId]);

  const toggleStem = (stem) => {
    setStems(prev => ({ ...prev, [stem]: !prev[stem] }));
  };

  const requestMicAccess = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    setMicPermission('granted');
  } catch (error) {
    console.error('Microphone access denied:', error);
    setMicPermission('denied');
  }
};

const startRecording = () => {
  if (!mediaStreamRef.current) return;

  const mediaRecorder = new MediaRecorder(mediaStreamRef.current);
  mediaRecorderRef.current = mediaRecorder;

  mediaRecorder.ondataavailable = async (event) => {
    if (event.data.size > 0 && sessionState.sessionId) {
      // send chunk to backend
      await sendMicChunk(sessionState.sessionId, event.data);
    }
  };

  mediaRecorder.start(1000); // send chunk every 1 second
};

  const startSession = async () => {
    const session = await startPracticeSession(selectedSong.id, selectedInstrument);
    setSessionState({ sessionId: session.sessionId, status: 'active' });
    setIsRecording(true);
    setIsPlaying(true);
    startRecording();
    
    const analysis = await fetchLiveAnalysis(session.sessionId);
    setLiveAnalysis(analysis);
  };

  const stopSession = async () => {
  try {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (sessionState.sessionId) {
      await stopPracticeSession(sessionState.sessionId);
      const summary = await fetchSessionSummary(sessionState.sessionId);
      setSessionSummary(summary);
      setShowSummary(true);
    }
  } catch (error) {
    console.error("Error stopping session:", error);
  } finally {
    setIsRecording(false);
    setIsPlaying(false);
    setSessionState({ sessionId: null, status: "idle" });
  }
};

  const formatTime = (percent) => {
    const totalSeconds = 225;
    const currentSeconds = Math.floor((percent / 100) * totalSeconds);
    const mins = Math.floor(currentSeconds / 60);
    const secs = currentSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const instruments = [
    { key: 'guitar', icon: '🎸', label: 'Guitar' },
    { key: 'piano', icon: '🎹', label: 'Piano' },
    { key: 'drums', icon: '🥁', label: 'Drums' },
    { key: 'vocals', icon: '🎤', label: 'Vocals' },
  ];

  const stemControls = [
    { key: 'drums', icon: '🥁', label: 'Drums', color: 'from-pink-400 to-rose-400' },
    { key: 'bass', icon: '🎸', label: 'Bass', color: 'from-purple-400 to-violet-400' },
    { key: 'vocals', icon: '🎤', label: 'Vocals', color: 'from-indigo-400 to-blue-400' },
    { key: 'other', icon: '🎹', label: 'Other', color: 'from-cyan-400 to-teal-400' },
  ];

  return (
    <div className="min-h-screen px-6 py-6 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 -z-10" />
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-pink-200/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-200/30 rounded-full blur-[120px]" />
      
      <div className="flex items-center justify-between mb-8 max-w-7xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-pink-600 transition-colors px-5 py-2.5 rounded-full hover:bg-white/40 backdrop-blur-sm font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Songs</span>
        </button>
        
        <div className="flex items-center gap-4">
          <CatMascot size="sm" animate={false} />
          <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            PitchPurrfect
          </span>
        </div>
        
        <GradientButton onClick={stopSession} size="sm" variant="danger">
          End Session
        </GradientButton>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <GlassCard className="lg:col-span-2" hover={false} padding="large">
            <div className="flex items-center gap-6">
              <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-5xl shadow-lg flex-shrink-0">
                {selectedSong?.cover || "🎵"}
              </div>
              
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-gray-800 mb-1 truncate">{selectedSong?.title}</h2>
                <p className="text-gray-500 mb-4">{selectedSong?.artist}</p>
                
                <ProgressBar progress={progress} className="mb-3" />
                
                <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                  <span>{formatTime(progress)}</span>
                  <span>{selectedSong?.duration}</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setProgress(Math.max(0, progress - 10))}
                    className="w-10 h-10 rounded-full bg-white/50 hover:bg-white/80 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
                    </svg>
                  </button>
                  
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center"
                  >
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
                  
                  <button 
                    onClick={() => setProgress(Math.min(100, progress + 10))}
                    className="w-10 h-10 rounded-full bg-white/50 hover:bg-white/80 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard hover={false} padding="large">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Your Instrument</h3>
            <div className="grid grid-cols-2 gap-3">
              {instruments.map(({ key, icon, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedInstrument(key)}
                  disabled={isRecording}
                  className={`
                    p-4 rounded-2xl border-2 transition-all duration-300 text-center
                    ${selectedInstrument === key 
                      ? 'bg-gradient-to-br from-pink-100 to-purple-100 border-pink-400 shadow-md' 
                      : 'bg-white/30 border-transparent hover:bg-white/50'
                    }
                    ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="text-3xl mb-2">{icon}</div>
                  <div className={`font-medium text-sm ${selectedInstrument === key ? 'text-gray-800' : 'text-gray-600'}`}>
                    {label}
                  </div>
                </button>
              ))}
            </div>
          </GlassCard>
        </div>

        <GlassCard className="mb-6" hover={false} padding="large">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            Mix Stems
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stemControls.map(({ key, icon, label, color }) => (
              <button
                key={key}
                onClick={() => toggleStem(key)}
                className={`
                  p-4 rounded-2xl border-2 transition-all duration-300
                  ${stems[key] 
                    ? `bg-gradient-to-br ${color} bg-opacity-10 border-white/50 shadow-md` 
                    : 'bg-white/20 border-transparent opacity-40 grayscale'
                  }
                `}
              >
                <div className="text-3xl mb-2">{icon}</div>
                <div className={`font-medium ${stems[key] ? 'text-gray-800' : 'text-gray-500'}`}>
                  {label}
                </div>
              </button>
            ))}
          </div>
        </GlassCard>

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
              <GradientButton onClick={startSession} size="lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Practice Session
              </GradientButton>
            ) : (
              <div className="text-center">
                <p className="text-red-500 mb-2">Microphone access denied</p>
                <GradientButton onClick={requestMicAccess} variant="secondary">
                  Try Again
                </GradientButton>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <GlassCard hover={false}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">Live Analysis</h3>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              
              {liveAnalysis ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Timing</div>
                    <StatusBadge 
                      status={liveAnalysis.timing.status} 
                      text={liveAnalysis.timing.status === 'on_tempo' ? 'On Tempo' : 
                            liveAnalysis.timing.status === 'early' ? 'Slightly Early' : 'Slightly Late'}
                    />
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Pitch</div>
                    <StatusBadge 
                      status={liveAnalysis.pitch.status}
                      text={liveAnalysis.pitch.status === 'correct' ? 'Correct' :
                            liveAnalysis.pitch.status === 'wrong_note' ? 'Wrong Note' : 'Wrong Chord'}
                    />
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
                  Analyzing...
                </div>
              )}
            </GlassCard>

            <GlassCard hover={false}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">AI Coach</h3>
                <CatMascot size="sm" animate={false} />
              </div>
              
              {coachFeedback ? (
                <div>
                  <div className={`p-4 rounded-2xl mb-4 ${
                    coachFeedback.type === 'encouragement' ? 'bg-emerald-50 border border-emerald-100' :
                    coachFeedback.type === 'correction' ? 'bg-amber-50 border border-amber-100' :
                    'bg-blue-50 border border-blue-100'
                  }`}>
                    <p className="text-gray-700 leading-relaxed">{coachFeedback.message}</p>
                  </div>
                  
                  {coachFeedback.voiceUrl && (
                    <button 
                      onClick={() => playVoiceFeedback(coachFeedback.voiceUrl)}
                      className="w-full py-2 bg-white/50 rounded-xl flex items-center justify-center gap-2 text-gray-600 hover:bg-white/80 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                      Play Voice Feedback
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>Listening to your performance...</p>
                </div>
              )}
            </GlassCard>

            <GlassCard hover={false}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">Voice Assistant</h3>
                <div className={`w-2 h-2 rounded-full ${voiceStatus === 'playing' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-white/30 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">ElevenLabs</div>
                    <div className="text-sm text-gray-500">{voiceStatus === 'idle' ? 'Ready' : voiceStatus === 'loading' ? 'Generating...' : 'Speaking'}</div>
                  </div>
                </div>
                
                <div className="p-4 bg-white/30 rounded-xl">
                  <div className="text-sm text-gray-500 mb-2">Session Status</div>
                  <StatusBadge status="recording" text="Recording Active" />
                </div>
                
                <div className="p-4 bg-white/30 rounded-xl">
                  <div className="text-sm text-gray-500 mb-2">Audio Input</div>
                  <div className="flex items-end gap-1 h-8">
                    {[...Array(8)].map((_, i) => (
                      <div 
                        key={i}
                        className="flex-1 bg-gradient-to-t from-pink-400 to-purple-400 rounded-full transition-all duration-150"
                        style={{ 
                          height: `${Math.max(20, Math.random() * 100)}%`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      {showSummary && sessionSummary && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 animate-[fadeIn_0.3s_ease-out]">
            <div className="text-center mb-8">
              <CatMascot size="md" className="mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Session Complete!</h2>
              <p className="text-gray-500">Here's how you performed</p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl">
                <div className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent mb-1">
                  {sessionSummary.overallScore}%
                </div>
                <div className="text-sm text-gray-500">Overall</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl">
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent mb-1">
                  {sessionSummary.timingAccuracy.onTempo}%
                </div>
                <div className="text-sm text-gray-500">On Tempo</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl">
                <div className="text-4xl font-bold bg-gradient-to-r from-indigo-500 to-blue-500 bg-clip-text text-transparent mb-1">
                  {sessionSummary.noteAccuracy.correct}%
                </div>
                <div className="text-sm text-gray-500">Notes Correct</div>
              </div>
            </div>
            
            <div className="space-y-4 mb-8">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Highlights</h3>
                <ul className="space-y-2">
                  {sessionSummary.coachingPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-600">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Focus Areas</h3>
                <ul className="space-y-2">
                  {sessionSummary.improvementAreas.map((area, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-600">
                      <span className="text-amber-500 mt-0.5">→</span>
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="flex gap-4">
              <GradientButton onClick={() => { setShowSummary(false); onEndSession(); }} className="flex-1">
                Back to Home
              </GradientButton>
              <GradientButton onClick={() => setShowSummary(false)} variant="secondary" className="flex-1">
                Continue Practicing
              </GradientButton>
            </div>
          </div>
        </div>
      )}
      
            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
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

  const navigateTo = (page) => {
    setCurrentPage(page);
  };

  const handleSelectSong = (song) => {
    setSelectedSong(song);
    navigateTo('practice');
  };

  const handleEndSession = () => {
    setSelectedSong(null);
    setSessionState({ sessionId: null, status: 'idle' });
    navigateTo('landing');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 font-sans">
      {currentPage === 'landing' && (
        <LandingPage onStart={() => navigateTo('songSelect')} />
      )}
      
      {currentPage === 'songSelect' && (
        <SongSelectPage 
          onSelectSong={handleSelectSong}
          onBack={() => navigateTo('landing')}
        />
      )}
      
      {currentPage === 'practice' && selectedSong && (
        <PracticePage 
          selectedSong={selectedSong}
          onBack={() => navigateTo('songSelect')}
          onEndSession={handleEndSession}
          sessionState={sessionState}
          setSessionState={setSessionState}
        />
      )}
    </div>
  );
}