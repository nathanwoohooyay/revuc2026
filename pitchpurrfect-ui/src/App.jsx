import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────
// FONTS
// ─────────────────────────────────────────────────────────────
const FontLoader = () => {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Outfit:wght@100;200;300;400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600&display=swap';
    document.head.appendChild(link);
  }, []);
  return null;
};

// ─────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────
const API = import.meta.env?.VITE_API_BASE || 'http://localhost:8000';

const api = {
  songs:        ()              => fetch(`${API}/api/songs`).then(r => r.json()),
  stems:        (id)            => fetch(`${API}/api/songs/${id}/stems`).then(r => r.json()),
  startSession: (songId, instr) => fetch(`${API}/api/sessions`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({songId,instrument:instr}) }).then(r=>r.json()),
  postAudio:    (endpoint, fd)  => fetch(`${API}${endpoint}`, {method:'POST', body:fd}).then(r=>{ if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
  aiFeedback:   (payload)       => fetch(`${API}/api/coach/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(r => r.json()),
};

// ─────────────────────────────────────────────────────────────
// AUDIO TRIM HELPERS
// ─────────────────────────────────────────────────────────────
async function trimAudioBlob(blob, durationSeconds) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const sampleRate = audioBuffer.sampleRate;
  const trimSamples = Math.floor(Math.min(durationSeconds, audioBuffer.duration) * sampleRate);
  const trimmed = audioCtx.createBuffer(audioBuffer.numberOfChannels, trimSamples, sampleRate);
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    trimmed.getChannelData(ch).set(audioBuffer.getChannelData(ch).subarray(0, trimSamples));
  }
  return new Promise(resolve => {
    const offlineCtx = new OfflineAudioContext(trimmed.numberOfChannels, trimmed.length, sampleRate);
    const src = offlineCtx.createBufferSource();
    src.buffer = trimmed;
    src.connect(offlineCtx.destination);
    src.start();
    offlineCtx.startRendering().then(rendered => resolve(audioBufferToWav(rendered)));
  });
}

function audioBufferToWav(buffer) {
  const numCh = buffer.numberOfChannels;
  const length = buffer.length * numCh * 2;
  const ab = new ArrayBuffer(44 + length);
  const view = new DataView(ab);
  const writeStr = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF'); view.setUint32(4, 36 + length, true); writeStr(8, 'WAVE');
  writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true); view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * numCh * 2, true); view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true); writeStr(36, 'data'); view.setUint32(40, length, true);
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}

// ─────────────────────────────────────────────────────────────
// GLOBAL STYLES
// ─────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Space Grotesk', sans-serif;
      background: #04040a;
      color: #e2e2f0;
      min-height: 100vh;
      overflow-x: hidden;
    }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.4); border-radius: 2px; }

    /* ── Keyframes ── */
    @keyframes floatCat    { 0%,100%{transform:translateY(0) rotate(-2deg);}50%{transform:translateY(-18px) rotate(2deg);} }
    @keyframes tailWag     { 0%,100%{transform:rotate(-20deg);}50%{transform:rotate(20deg);} }
    @keyframes earTwitch   { 0%,90%,100%{transform:rotate(0);}95%{transform:rotate(-8deg);} }
    @keyframes blink       { 0%,90%,100%{transform:scaleY(1);}95%{transform:scaleY(0.05);} }
    @keyframes pawPat      { 0%,100%{transform:rotate(0deg);}50%{transform:rotate(-15deg) translateY(-4px);} }
    @keyframes pulseGlow   { 0%,100%{opacity:0.6;transform:scale(1);}50%{opacity:0.15;transform:scale(1.2);} }
    @keyframes fadeSlideUp { from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);} }
    @keyframes fadeSlideIn { from{opacity:0;transform:translateX(-16px);}to{opacity:1;transform:translateX(0);} }
    @keyframes spin        { to{transform:rotate(360deg);} }
    @keyframes shimmer     { 0%{background-position:200% center;}100%{background-position:-200% center;} }
    @keyframes scanline    { 0%{transform:translateY(-100%);}100%{transform:translateY(100vh);} }
    @keyframes orb1        { 0%,100%{transform:translate(0,0) scale(1);}33%{transform:translate(40px,-30px) scale(1.1);}66%{transform:translate(-20px,20px) scale(0.95);} }
    @keyframes orb2        { 0%,100%{transform:translate(0,0) scale(1);}33%{transform:translate(-50px,20px) scale(0.9);}66%{transform:translate(30px,-40px) scale(1.05);} }
    @keyframes orb3        { 0%,100%{transform:translate(0,0);}50%{transform:translate(20px,30px);} }
    @keyframes gridPulse   { 0%,100%{opacity:0.03;}50%{opacity:0.06;} }
    @keyframes waveBar     { 0%,100%{height:4px;}50%{height:20px;} }
    @keyframes recordPulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.6);}50%{box-shadow:0 0 0 8px rgba(239,68,68,0);} }
    @keyframes slideInRight{ from{opacity:0;transform:translateX(32px);}to{opacity:1;transform:translateX(0);} }
    @keyframes numberCount { from{opacity:0;transform:scale(0.5);}to{opacity:1;transform:scale(1);} }

    .cat-body     { animation: floatCat 4s ease-in-out infinite; }
    .cat-tail     { animation: tailWag 2s ease-in-out infinite; transform-origin: 0% 50%; }
    .cat-ear-l    { animation: earTwitch 4s ease-in-out infinite; transform-origin: 50% 100%; }
    .cat-ear-r    { animation: earTwitch 4s ease-in-out infinite 0.3s; transform-origin: 50% 100%; }
    .cat-eye      { animation: blink 5s ease-in-out infinite; transform-origin: 50% 50%; }
    .cat-paw      { animation: pawPat 3s ease-in-out infinite; transform-origin: 50% 0%; }
    .fade-up      { animation: fadeSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
    .fade-in      { animation: fadeSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }
    .spin         { animation: spin 0.8s linear infinite; }

    /* ── Buttons ── */
    .btn-primary {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 13px 32px; border-radius: 12px; border: none; cursor: pointer;
      font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 15px; letter-spacing: 0.02em;
      background: linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%);
      background-size: 200% 200%;
      color: white; transition: all 0.25s; position: relative; overflow: hidden;
      box-shadow: 0 0 32px rgba(168,85,247,0.35), inset 0 1px 0 rgba(255,255,255,0.15);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 0 48px rgba(168,85,247,0.55), inset 0 1px 0 rgba(255,255,255,0.2);
      background-position: right center;
    }
    .btn-primary:active { transform: scale(0.97) translateY(0); }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

    .btn-ghost {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 10px 20px; border-radius: 10px; cursor: pointer;
      font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 500;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04);
      color: rgba(255,255,255,0.55);
      transition: all 0.2s;
      backdrop-filter: blur(8px);
    }
    .btn-ghost:hover {
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.9);
      border-color: rgba(255,255,255,0.2);
      transform: translateY(-1px);
    }
    .btn-danger {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 10px 20px; border-radius: 10px; cursor: pointer;
      font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600;
      border: 1px solid rgba(239,68,68,0.3);
      background: rgba(239,68,68,0.1);
      color: #f87171;
      transition: all 0.2s;
    }
    .btn-danger:hover { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.5); }

    /* ── Cards ── */
    .card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 20px;
      backdrop-filter: blur(24px);
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%);
      pointer-events: none;
    }
    .card-ai {
      border-color: rgba(6,182,212,0.25);
      background: rgba(6,182,212,0.04);
    }
    .card-glow-purple {
      border-color: rgba(168,85,247,0.3);
      box-shadow: 0 0 40px rgba(168,85,247,0.08);
    }
    .card-glow-pink {
      border-color: rgba(236,72,153,0.3);
      box-shadow: 0 0 40px rgba(236,72,153,0.08);
    }

    /* ── Tags ── */
    .tag { display:inline-flex; align-items:center; gap:5px; padding:3px 11px; border-radius:100px; font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; font-family:'JetBrains Mono',monospace; }
    .tag-green  { background:rgba(52,211,153,.12);  color:#34d399; border:1px solid rgba(52,211,153,.2); }
    .tag-amber  { background:rgba(251,191,36,.12);  color:#fbbf24; border:1px solid rgba(251,191,36,.2); }
    .tag-red    { background:rgba(239,68,68,.12);   color:#f87171; border:1px solid rgba(239,68,68,.2); }
    .tag-blue   { background:rgba(96,165,250,.12);  color:#60a5fa; border:1px solid rgba(96,165,250,.2); }
    .tag-purple { background:rgba(168,85,247,.12);  color:#c084fc; border:1px solid rgba(168,85,247,.2); }
    .tag-cyan   { background:rgba(6,182,212,.12);   color:#22d3ee; border:1px solid rgba(6,182,212,.2); }
    .tag-gray   { background:rgba(255,255,255,.05); color:rgba(255,255,255,.35); border:1px solid rgba(255,255,255,.08); }
    .tag-orange { background:rgba(249,115,22,.12);  color:#fb923c; border:1px solid rgba(249,115,22,.2); }

    /* ── Range slider ── */
    input[type=range] { -webkit-appearance:none; appearance:none; background:transparent; cursor:pointer; width:100%; }
    input[type=range]::-webkit-slider-runnable-track { height:3px; border-radius:2px; background:rgba(255,255,255,0.08); }
    input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:linear-gradient(135deg,#a855f7,#ec4899); margin-top:-5.5px; box-shadow:0 0 8px rgba(168,85,247,0.6); }
    input[type=range]::-moz-range-track { height:3px; border-radius:2px; background:rgba(255,255,255,0.08); }
    input[type=range]::-moz-range-thumb { width:14px; height:14px; border-radius:50%; background:linear-gradient(135deg,#a855f7,#ec4899); border:none; }

    /* ── Select ── */
    select option { background:#0d0d1a; color:white; }

    /* ── Misc ── */
    .chord-segment { transition: opacity .15s; cursor: default; }
    .chord-segment:hover { opacity: 0.8 !important; }
    .shimmer-text {
      background: linear-gradient(90deg, #a855f7, #ec4899, #f97316, #22d3ee, #a855f7);
      background-size: 400% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 4s linear infinite;
    }
    .grid-bg {
      background-image:
        linear-gradient(rgba(168,85,247,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(168,85,247,0.04) 1px, transparent 1px);
      background-size: 40px 40px;
      animation: gridPulse 4s ease-in-out infinite;
    }
    .wave-bar { animation: waveBar 0.8s ease-in-out infinite; }
    .record-dot { animation: recordPulse 1.2s ease-in-out infinite; }
    .song-card { transition: all 0.3s cubic-bezier(0.16,1,0.3,1); }
    .song-card:hover { transform: translateY(-8px) scale(1.02); }
    .nav-link { transition: all 0.2s; cursor: pointer; }
    .nav-link:hover { color: white; }
  `}</style>
);

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const accuracyColor = (pct) => {
  if (pct === null || pct === undefined) return '#c084fc';
  if (pct >= 80) return '#34d399';
  if (pct >= 55) return '#fbbf24';
  return '#f87171';
};
const accuracyLabel = (pct) => {
  if (pct === null || pct === undefined) return 'N/A';
  if (pct >= 80) return 'Great';
  if (pct >= 55) return 'Fair';
  return 'Needs Work';
};

// ─────────────────────────────────────────────────────────────
// ANIMATED CAT (elaborate SVG)
// ─────────────────────────────────────────────────────────────
const Cat = ({ size = 100, float = true, showPaw = true }) => (
  <div style={{ width: size, height: size * 1.3, position: 'relative', display: 'inline-block' }}>
    <svg
      viewBox="0 0 160 200"
      width={size}
      height={size * 1.3}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="catBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc"/>
          <stop offset="50%" stopColor="#a855f7"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
        <linearGradient id="catFaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d8b4fe"/>
          <stop offset="100%" stopColor="#c084fc"/>
        </linearGradient>
        <linearGradient id="catBellyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fce7f3"/>
          <stop offset="100%" stopColor="#fbcfe8"/>
        </linearGradient>
        <linearGradient id="neonEye" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee"/>
          <stop offset="100%" stopColor="#a855f7"/>
        </linearGradient>
        <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0"/>
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      {/* Tail */}
      <g className={float ? 'cat-tail' : ''} style={{ transformOrigin: '30px 160px' }}>
        <path d="M30 160 Q10 140 15 110 Q20 90 35 95" stroke="url(#catBodyGrad)" strokeWidth="10" fill="none" strokeLinecap="round"/>
        <circle cx="35" cy="93" r="7" fill="#c084fc"/>
      </g>

      {/* Body */}
      <g className={float ? 'cat-body' : ''}>
        {/* Body shadow/depth */}
        <ellipse cx="80" cy="148" rx="45" ry="38" fill="rgba(124,58,237,0.3)"/>
        {/* Main body */}
        <ellipse cx="80" cy="143" rx="44" ry="37" fill="url(#catBodyGrad)"/>
        {/* Belly */}
        <ellipse cx="80" cy="150" rx="22" ry="24" fill="url(#catBellyGrad)" opacity="0.9"/>
        {/* Belly stripes */}
        <ellipse cx="80" cy="148" rx="11" ry="12" fill="rgba(236,72,153,0.15)" />

        {/* Back legs / feet */}
        <ellipse cx="52" cy="178" rx="13" ry="8" fill="#7c3aed"/>
        <ellipse cx="108" cy="178" rx="13" ry="8" fill="#7c3aed"/>
        <ellipse cx="52" cy="177" rx="10" ry="6" fill="#fce7f3"/>
        <ellipse cx="108" cy="177" rx="10" ry="6" fill="#fce7f3"/>
        {/* Toe beans */}
        {[[-3,0],[0,-2],[3,0]].map(([dx,dy],i)=>(
          <circle key={`lb${i}`} cx={52+dx} cy={177+dy} r="2" fill="#f9a8d4" opacity="0.8"/>
        ))}
        {[[-3,0],[0,-2],[3,0]].map(([dx,dy],i)=>(
          <circle key={`rb${i}`} cx={108+dx} cy={177+dy} r="2" fill="#f9a8d4" opacity="0.8"/>
        ))}

        {/* Front paws */}
        {showPaw && (
          <g className="cat-paw" style={{ transformOrigin: '60px 168px' }}>
            <ellipse cx="60" cy="170" rx="11" ry="7" fill="#9333ea"/>
            <ellipse cx="60" cy="169" rx="8.5" ry="5.5" fill="#fce7f3"/>
            {[[-2.5,0],[0,-2],[2.5,0]].map(([dx,dy],i)=>(
              <circle key={`fp${i}`} cx={60+dx} cy={169+dy} r="1.8" fill="#f9a8d4" opacity="0.8"/>
            ))}
          </g>
        )}
        <ellipse cx="100" cy="170" rx="11" ry="7" fill="#9333ea"/>
        <ellipse cx="100" cy="169" rx="8.5" ry="5.5" fill="#fce7f3"/>
        {[[-2.5,0],[0,-2],[2.5,0]].map(([dx,dy],i)=>(
          <circle key={`rp${i}`} cx={100+dx} cy={169+dy} r="1.8" fill="#f9a8d4" opacity="0.8"/>
        ))}

        {/* Head */}
        <circle cx="80" cy="78" r="38" fill="rgba(124,58,237,0.25)"/>
        <circle cx="80" cy="76" r="37" fill="url(#catFaceGrad)"/>

        {/* Ears */}
        <g className="cat-ear-l">
          <path d="M52 50 L42 18 L68 42 Z" fill="#a855f7"/>
          <path d="M54 48 L47 26 L65 43 Z" fill="#f9a8d4"/>
        </g>
        <g className="cat-ear-r">
          <path d="M108 50 L118 18 L92 42 Z" fill="#a855f7"/>
          <path d="M106 48 L113 26 L95 43 Z" fill="#f9a8d4"/>
        </g>

        {/* Cheek blush */}
        <ellipse cx="58" cy="86" rx="9" ry="6" fill="#f9a8d4" opacity="0.45"/>
        <ellipse cx="102" cy="86" rx="9" ry="6" fill="#f9a8d4" opacity="0.45"/>

        {/* Eyes - glow effect */}
        <circle cx="66" cy="70" r="12" fill="url(#eyeGlow)" opacity="0.4"/>
        <circle cx="94" cy="70" r="12" fill="url(#eyeGlow)" opacity="0.4"/>

        {/* Eye whites */}
        <ellipse cx="66" cy="70" rx="9" ry="11" fill="#0d0d1a" className="cat-eye"/>
        <ellipse cx="94" cy="70" rx="9" ry="11" fill="#0d0d1a" className="cat-eye"/>

        {/* Iris */}
        <ellipse cx="66" cy="70" rx="6" ry="8" fill="url(#neonEye)"/>
        <ellipse cx="94" cy="70" rx="6" ry="8" fill="url(#neonEye)"/>

        {/* Pupil */}
        <ellipse cx="66" cy="71" rx="2.5" ry="5" fill="#0d0d1a"/>
        <ellipse cx="94" cy="71" rx="2.5" ry="5" fill="#0d0d1a"/>

        {/* Eye shine */}
        <circle cx="69" cy="66" r="2.5" fill="white" opacity="0.9"/>
        <circle cx="97" cy="66" r="2.5" fill="white" opacity="0.9"/>
        <circle cx="63" cy="72" r="1" fill="white" opacity="0.5"/>
        <circle cx="91" cy="72" r="1" fill="white" opacity="0.5"/>

        {/* Nose */}
        <path d="M76 82 L80 86 L84 82 Q80 78 76 82 Z" fill="#ec4899"/>

        {/* Mouth */}
        <path d="M80 86 Q74 92 70 90" stroke="#7c3aed" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        <path d="M80 86 Q86 92 90 90" stroke="#7c3aed" strokeWidth="1.8" fill="none" strokeLinecap="round"/>

        {/* Whiskers */}
        {[[48,80,30,76],[48,84,28,84],[48,88,30,92],[112,80,130,76],[112,84,132,84],[112,88,130,92]].map(([x1,y1,x2,y2],i)=>(
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round"/>
        ))}

        {/* Forehead marking */}
        <path d="M76 48 Q80 42 84 48" stroke="rgba(236,72,153,0.4)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M74 54 Q80 49 86 54" stroke="rgba(236,72,153,0.3)" strokeWidth="1" fill="none" strokeLinecap="round"/>

        {/* Collar with neon effect */}
        <rect x="56" y="108" width="48" height="8" rx="4" fill="#1a0a2e" stroke="#a855f7" strokeWidth="1.5"/>
        <circle cx="80" cy="112" r="4" fill="#22d3ee" filter="url(#glow)"/>
        <circle cx="80" cy="112" r="2.5" fill="#67e8f9"/>
        <circle cx="80" cy="112" r="1" fill="white"/>
      </g>
    </svg>
  </div>
);

// ─────────────────────────────────────────────────────────────
// MINI CAT (for panels)
// ─────────────────────────────────────────────────────────────
const MiniCat = ({ size = 40 }) => (
  <div style={{ width: size, height: size, display: 'inline-block', flexShrink: 0 }}>
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <linearGradient id="mc1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="36" fill="url(#mc1)"/>
      <path d="M30 28 L22 10 L44 26 Z" fill="#9333ea"/>
      <path d="M70 28 L78 10 L56 26 Z" fill="#9333ea"/>
      <path d="M32 27 L26 14 L42 25 Z" fill="#f9a8d4"/>
      <path d="M68 27 L74 14 L58 25 Z" fill="#f9a8d4"/>
      <ellipse cx="38" cy="46" rx="7" ry="8" fill="#0d0d1a"/>
      <ellipse cx="62" cy="46" rx="7" ry="8" fill="#0d0d1a"/>
      <ellipse cx="38" cy="46" rx="4.5" ry="6" fill="#22d3ee"/>
      <ellipse cx="62" cy="46" rx="4.5" ry="6" fill="#22d3ee"/>
      <ellipse cx="38" cy="47" rx="1.8" ry="4" fill="#0d0d1a"/>
      <ellipse cx="62" cy="47" rx="1.8" ry="4" fill="#0d0d1a"/>
      <circle cx="40" cy="43" r="1.8" fill="white"/>
      <circle cx="64" cy="43" r="1.8" fill="white"/>
      <path d="M46 56 L50 60 L54 56 Q50 52 46 56Z" fill="#ec4899"/>
      <path d="M50 60 Q44 66 40 64" stroke="#7c3aed" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M50 60 Q56 66 60 64" stroke="#7c3aed" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <ellipse cx="34" cy="56" rx="6" ry="4" fill="#f9a8d4" opacity="0.4"/>
      <ellipse cx="66" cy="56" rx="6" ry="4" fill="#f9a8d4" opacity="0.4"/>
    </svg>
  </div>
);

// ─────────────────────────────────────────────────────────────
// UI ATOMS
// ─────────────────────────────────────────────────────────────
const Spinner = ({ size = 18, color = '#a855f7' }) => (
  <span style={{
    width: size, height: size, borderRadius: '50%',
    border: `2px solid rgba(255,255,255,0.1)`,
    borderTopColor: color, display: 'inline-block'
  }} className="spin"/>
);

const SectionLabel = ({ children }) => (
  <p style={{
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
    letterSpacing: '.12em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.25)', marginBottom: 12
  }}>{children}</p>
);

const Divider = () => (
  <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.2), transparent)', margin: '0 -24px' }}/>
);

const Dot = ({ color = '#a855f7', pulse = false }) => (
  <span style={{
    width: 7, height: 7, borderRadius: '50%', background: color,
    display: 'inline-block', flexShrink: 0,
    animation: pulse ? 'pulseGlow 1.4s ease-in-out infinite' : 'none'
  }}/>
);

const ProgressBar = ({ pct, color = 'linear-gradient(90deg,#a855f7,#ec4899,#f97316)' }) => (
  <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
    <div style={{
      height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`,
      background: color, borderRadius: 2, transition: 'width .3s',
      boxShadow: '0 0 8px rgba(168,85,247,0.5)'
    }}/>
  </div>
);

const Tag = ({ children, color = 'gray' }) => <span className={`tag tag-${color}`}>{children}</span>;

// ─────────────────────────────────────────────────────────────
// WAVE VISUALIZER (decorative)
// ─────────────────────────────────────────────────────────────
const WaveBars = ({ active = false, bars = 20, color = '#a855f7' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 24 }}>
    {Array.from({ length: bars }).map((_, i) => (
      <div key={i} style={{
        width: 2, background: color, borderRadius: 2, opacity: active ? 0.8 : 0.25,
        height: active ? undefined : '4px',
        ...(active ? { animation: `waveBar ${0.5 + (i % 5) * 0.15}s ease-in-out infinite`, animationDelay: `${i * 0.04}s` } : {}),
        minHeight: 4, maxHeight: 24,
      }}/>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────
// ACCURACY RING
// ─────────────────────────────────────────────────────────────
const AccuracyRing = ({ pct, size = 80, label, sublabel }) => {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const filled = pct != null ? (pct / 100) * circ : 0;
  const color = accuracyColor(pct);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7"
          strokeLinecap="round" strokeDasharray={`${filled} ${circ}`}
          style={{ transition: 'stroke-dasharray .8s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 8px ${color}88)` }}/>
        <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
          style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px`,
            fontFamily: "'JetBrains Mono',monospace", fontWeight: 600,
            fontSize: size > 70 ? 15 : 11, fill: color }}>
          {pct != null ? `${Math.round(pct)}%` : '—'}
        </text>
      </svg>
      {label    && <p style={{ fontSize: 11, fontWeight: 600, color: 'white', lineHeight: 1, textAlign: 'center', fontFamily: "'Space Grotesk',sans-serif" }}>{label}</p>}
      {sublabel && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1, textAlign: 'center' }}>{sublabel}</p>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CHORD ACCURACY BAR
// ─────────────────────────────────────────────────────────────
const ChordAccuracyBar = ({ pct }) => {
  const color = accuracyColor(pct);
  const label = accuracyLabel(pct);
  return (
    <div style={{ flex: 1, minWidth: 120 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: "'JetBrains Mono',monospace" }}>
          Chord Accuracy
        </p>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "'JetBrains Mono',monospace" }}>
          {pct != null ? `${Math.round(pct)}%` : '—'}
          <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.25)', marginLeft: 6 }}>{label}</span>
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${Math.min(100, Math.max(0, pct ?? 0))}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: 3, transition: 'width .8s cubic-bezier(.4,0,.2,1)',
          boxShadow: `0 0 10px ${color}55`
        }}/>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CHORD MISTAKE TIMELINE
// ─────────────────────────────────────────────────────────────
const ChordMistakeTimeline = ({ refChordSummary = [], mismatches = [] }) => {
  const [tooltip, setTooltip] = useState(null);
  const mismatchMap = {};
  mismatches.forEach(m => { mismatchMap[m.start_time] = m; });
  const totalDur = refChordSummary.length > 0 ? refChordSummary[refChordSummary.length - 1].end_time : 1;

  if (!refChordSummary.length) return (
    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '12px 0' }}>No chord data available</p>
  );

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
        {[['#34d399','Correct'],['#f87171','Wrong chord']].map(([c,l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: c }}/>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: "'JetBrains Mono',monospace" }}>{l}</span>
          </div>
        ))}
      </div>
      <div style={{ position: 'relative', height: 40, borderRadius: 10, overflow: 'visible',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {refChordSummary.filter(s => s.chord !== 'N').map((seg, i) => {
          const left  = (seg.start_time / totalDur) * 100;
          const width = Math.max(0.4, ((seg.end_time - seg.start_time) / totalDur) * 100);
          const isMismatch = mismatchMap[seg.start_time];
          const color = isMismatch ? '#f87171' : '#34d399';
          const playedChord = isMismatch ? isMismatch.played : seg.chord;
          return (
            <div key={i} className="chord-segment"
              onMouseEnter={() => setTooltip({ seg, isMismatch, playedChord, left })}
              onMouseLeave={() => setTooltip(null)}
              style={{
                position: 'absolute', top: 5, bottom: 5,
                left: `${left}%`, width: `${width}%`,
                background: isMismatch ? 'rgba(248,113,113,0.2)' : 'rgba(52,211,153,0.15)',
                borderLeft: `2px solid ${color}`,
                borderRadius: 4, minWidth: 2,
              }}>
              {width > 4 && (
                <span style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 8, fontFamily: "'JetBrains Mono',monospace", color, whiteSpace: 'nowrap',
                  overflow: 'hidden', maxWidth: '100%' }}>
                  {seg.chord}
                </span>
              )}
            </div>
          );
        })}
        {tooltip && (
          <div style={{
            position: 'absolute', top: -56, left: `clamp(0%, ${tooltip.left}%, 65%)`, zIndex: 20,
            background: 'rgba(10,8,20,0.98)', border: `1px solid ${tooltip.isMismatch ? 'rgba(248,113,113,0.4)' : 'rgba(52,211,153,0.4)'}`,
            borderRadius: 10, padding: '8px 13px', pointerEvents: 'none', whiteSpace: 'nowrap',
            backdropFilter: 'blur(16px)',
          }}>
            {tooltip.isMismatch ? (
              <>
                <p style={{ fontSize: 11, color: '#f87171', fontWeight: 700, marginBottom: 3 }}>✗ Wrong @ {tooltip.seg.start_time.toFixed(1)}s</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono',monospace" }}>
                  <span style={{color:'#fbbf24'}}>{tooltip.playedChord}</span> → <span style={{color:'#34d399'}}>{tooltip.seg.chord}</span>
                </p>
              </>
            ) : (
              <p style={{ fontSize: 11, color: '#34d399', fontWeight: 700 }}>✓ {tooltip.seg.chord} @ {tooltip.seg.start_time.toFixed(1)}s</p>
            )}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <span key={frac} style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', fontFamily: "'JetBrains Mono',monospace" }}>
            {(frac * totalDur).toFixed(0)}s
          </span>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CHORD & NOTE REVIEW CARD
// ─────────────────────────────────────────────────────────────
const ChordNoteReviewCard = ({ compareData }) => {
  const cc   = compareData?.chord_comparison;
  const ref  = compareData?.ref_chord_summary    || [];
  const mis  = (cc?.mismatches || []).filter(m => m.played !== '?');
  const notes = compareData?.player_note_summary || [];
  const uniqueNotes = [...new Set(notes.map(n => n.pitch_class).filter(Boolean))].sort();
  const pct  = cc?.accuracy_pct ?? null;

  return (
    <div className="card card-glow-purple fade-up" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,rgba(168,85,247,0.3),rgba(236,72,153,0.3))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(168,85,247,0.3)'
          }}>
            <svg width="18" height="18" fill="none" stroke="#c084fc" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
            </svg>
          </div>
          <div>
            <p style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 16, color: 'white', lineHeight: 1 }}>Chord & Note Review</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: "'JetBrains Mono',monospace" }}>vs reference audio</p>
          </div>
        </div>
        {pct != null && <Tag color={pct >= 80 ? 'green' : pct >= 55 ? 'amber' : 'red'}>{accuracyLabel(pct)}</Tag>}
      </div>

      <Divider/>

      <div style={{ display: 'flex', gap: 24, justifyContent: 'space-around', padding: '20px 0', flexWrap: 'wrap' }}>
        <AccuracyRing pct={pct} size={90} label="Chord Accuracy" sublabel={cc ? `${cc.correct}/${cc.total} correct` : 'No data'}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
          {[
            { label: 'Total Chords',   val: cc?.total   ?? '—', color: 'rgba(255,255,255,0.7)' },
            { label: 'Correct',        val: cc?.correct ?? '—', color: '#34d399' },
            { label: 'Mistakes',       val: mis.length,          color: mis.length > 0 ? '#f87171' : '#34d399' },
            { label: 'Notes Detected', val: uniqueNotes.length,  color: '#c084fc' },
          ].map(({ label, val, color: c }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 32, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: "'Space Grotesk',sans-serif" }}>{label}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 600, color: c }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      <Divider/>

      <div style={{ marginTop: 18 }}>
        <SectionLabel>Chord Timeline — hover for details</SectionLabel>
        <ChordMistakeTimeline refChordSummary={ref} mismatches={mis}/>
      </div>

      {mis.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <SectionLabel>Specific Corrections</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {mis.slice(0, 6).map((m, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                borderRadius: 12, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.12)',
                animation: `fadeSlideIn 0.4s ease both`, animationDelay: `${i * 0.06}s`
              }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)', minWidth: 36 }}>{m.start_time.toFixed(1)}s</span>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 15, color: '#f87171', minWidth: 40 }}>{m.played}</span>
                <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.15)" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 15, color: '#34d399', minWidth: 40 }}>{m.expected}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto', fontFamily: "'JetBrains Mono',monospace" }}>should be</span>
              </div>
            ))}
            {mis.length > 6 && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', paddingTop: 4 }}>+{mis.length - 6} more</p>}
          </div>
        </div>
      )}

      {uniqueNotes.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <SectionLabel>Notes Detected in Your Playing</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {uniqueNotes.map(n => (
              <span key={n} style={{
                padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                fontFamily: "'JetBrains Mono',monospace",
                background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', color: '#c084fc'
              }}>{n}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// TIMING TABLE
// ─────────────────────────────────────────────────────────────
const TimingTable = ({ rows = [] }) => {
  if (!rows.length) return null;
  const colMap = { 'on-time': 'green', ahead: 'blue', behind: 'amber' };
  return (
    <div style={{ maxHeight: 180, overflowY: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.04)', position: 'sticky', top: 0 }}>
            {['#','Onset','Beat','Offset','Status'].map(h => (
              <th key={h} style={{
                padding: '7px 10px', textAlign: h === '#' || h === 'Status' ? 'center' : 'right',
                fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '.08em',
                color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', fontWeight: 400
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '5px 10px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono',monospace" }}>{i+1}</td>
              <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", color: 'rgba(255,255,255,0.6)' }}>{r.player_onset.toFixed(3)}s</td>
              <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", color: 'rgba(255,255,255,0.3)' }}>{r.nearest_beat.toFixed(3)}s</td>
              <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: "'JetBrains Mono',monospace",
                color: r.offset_ms > 0 ? '#fbbf24' : r.offset_ms < 0 ? '#60a5fa' : '#34d399', fontWeight: 600 }}>
                {r.offset_ms > 0 ? '+' : ''}{r.offset_ms.toFixed(1)}ms
              </td>
              <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                <Tag color={colMap[r.status] || 'gray'}>{r.status}</Tag>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// BEAT TIMELINE
// ─────────────────────────────────────────────────────────────
const BeatTimeline = ({ beats = [], onsets = [] }) => {
  const max = Math.max(...beats, ...onsets, 1);
  return (
    <div>
      <SectionLabel>Beat Timeline</SectionLabel>
      <div style={{ position: 'relative', height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.04)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
        {beats.map((t, i)  => <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, width: 1, background: 'rgba(168,85,247,0.5)', left: `${(t/max)*100}%` }}/>)}
        {onsets.map((t, i) => <div key={i} style={{ position: 'absolute', bottom: 0, height: '65%', width: 2, background: 'rgba(34,211,238,0.7)', left: `${(t/max)*100}%`, borderRadius: '2px 2px 0 0' }}/>)}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
        {[['rgba(168,85,247,0.6)','Beat Grid'],['rgba(34,211,238,0.7)','Your Onsets']].map(([c,l])=>(
          <div key={l} style={{display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:8,height:8,borderRadius:2,background:c}}/>
            <span style={{fontSize:9,color:'rgba(255,255,255,0.25)',fontFamily:"'JetBrains Mono',monospace"}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// AI FEEDBACK PANEL
// ─────────────────────────────────────────────────────────────
const AIFeedbackPanel = ({ compareData, autoTrigger, onAutoHandled }) => {
  const [feedback, setFeedback] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const audioRef = useRef(null);

  const generate = useCallback(async () => {
    if (!compareData) return;
    setLoading(true); setError(null);
    try {
      const summary = compareData?.summary;
      const cc      = compareData?.chord_comparison;
      const payload = {
        average_offset_ms: summary?.average_offset_ms ?? 0,
        overall_status:    summary?.overall_status ?? 'mostly on-time',
        tempo:             compareData?.tempo ?? null,
        on_time_count:     summary?.counts?.on_time ?? null,
        ahead_count:       summary?.counts?.ahead ?? null,
        behind_count:      summary?.counts?.behind ?? null,
        chord_summary:     compareData?.ref_chord_summary ?? null,
        chord_accuracy_pct: cc?.accuracy_pct ?? null,
        chord_mismatches:  cc?.mismatches ?? null,
        include_voice:     true,
      };
      const res = await api.aiFeedback(payload);
      setFeedback(res.feedback);
      setAudioUrl(res.audio_url || null);
      if (res.audio_url) setTimeout(() => { audioRef.current?.play().catch(() => {}); }, 100);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); onAutoHandled?.(); }
  }, [compareData, onAutoHandled]);

  useEffect(() => { if (autoTrigger && compareData) generate(); }, [autoTrigger]);

  return (
    <div className="card card-ai" style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#0891b2,#0e7490)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(6,182,212,0.3)'
          }}>
            <svg width="18" height="18" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
          <div>
            <p style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, color: 'white', lineHeight: 1 }}>AI Coach</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: "'JetBrains Mono',monospace" }}>Gemini + ElevenLabs</p>
          </div>
        </div>
        <Tag color="cyan">Auto</Tag>
      </div>

      <Divider/>

      <div style={{ marginTop: 16 }}>
        {feedback ? (
          <div style={{ animation: 'fadeSlideUp 0.5s ease both' }}>
            <div style={{
              background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)',
              borderRadius: 16, padding: '16px 18px', marginBottom: 14
            }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <MiniCat size={38}/>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.8)', fontWeight: 300, fontFamily: "'Space Grotesk',sans-serif" }}>{feedback}</p>
              </div>
            </div>

            {audioUrl && <audio ref={audioRef} src={audioUrl} style={{ display: 'none' }}/>}

            {compareData?.summary && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {[
                  { label: 'Avg Offset', val: `${compareData.summary.average_offset_ms > 0 ? '+' : ''}${compareData.summary.average_offset_ms.toFixed(1)}ms` },
                  { label: 'On-Time',    val: compareData.summary.counts?.on_time ?? '—' },
                  { label: 'Early',      val: compareData.summary.counts?.ahead   ?? '—' },
                  { label: 'Late',       val: compareData.summary.counts?.behind  ?? '—' },
                  ...(compareData.chord_comparison?.accuracy_pct != null
                    ? [{ label: 'Chords', val: `${Math.round(compareData.chord_comparison.accuracy_pct)}%` }]
                    : []),
                ].map(({ label, val }) => (
                  <div key={label} style={{
                    flex: 1, minWidth: 50,
                    background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 10px', textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 600, color: 'white', lineHeight: 1 }}>{val}</p>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</p>
                  </div>
                ))}
              </div>
            )}

            <button className="btn-ghost" onClick={generate} disabled={loading} style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
              {loading ? <><Spinner size={12}/> Regenerating…</> : '↺ Regenerate Feedback'}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <Spinner size={32} color="#22d3ee"/>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: "'Space Grotesk',sans-serif" }}>Gemini is analysing your performance…</p>
                <WaveBars active bars={16} color="#22d3ee"/>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <MiniCat size={56}/>
                </div>
                <p style={{ marginTop: 14, fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, fontFamily: "'Space Grotesk',sans-serif" }}>
                  Press play and perform along.<br/>AI voice feedback generates automatically when you pause.
                </p>
                {error && <p style={{ marginTop: 8, fontSize: 12, color: '#f87171' }}>{error}</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// LANDING — full featured
// ─────────────────────────────────────────────────────────────
const Landing = ({ onStart }) => {
  const [activeSection, setActiveSection] = useState(null);

  const features = [
    {
      icon: '🎵',
      title: 'Stem Isolation',
      desc: 'Powered by Demucs AI, we split any song into individual tracks — drums, bass, vocals, melody — so you can practice each part in isolation.',
      color: '#a855f7',
    },
    {
      icon: '📊',
      title: 'Real-Time Analysis',
      desc: 'Our ML pipeline captures your microphone input and compares it note-for-note and chord-for-chord against the reference stem with millisecond precision.',
      color: '#22d3ee',
    },
    {
      icon: '🤖',
      title: 'AI Voice Coaching',
      desc: 'Google Gemini interprets your performance metrics and generates personalized coaching narrated by ElevenLabs text-to-speech — like having a real teacher.',
      color: '#ec4899',
    },
    {
      icon: '🎸',
      title: 'Chord Detection',
      desc: 'Chord.py and librosa analyze your chord progressions in real-time, flagging mismatches with an interactive timeline so you know exactly where to improve.',
      color: '#f97316',
    },
  ];

  const howItWorks = [
    { n: '01', title: 'Pick a Track', desc: 'Choose from our library. Each song is pre-processed into isolated stems.' },
    { n: '02', title: 'Select Instrument', desc: 'Tell us what you\'re playing. That stem gets muted so you fill its role.' },
    { n: '03', title: 'Play Along', desc: 'Your mic captures your performance live as the backing track plays.' },
    { n: '04', title: 'Get Coached', desc: 'AI analyses timing, pitch, and chords — then delivers spoken feedback instantly.' },
  ];

  const techStack = [
    { name: 'Demucs', label: 'Stem Separation', color: '#a855f7' },
    { name: 'librosa', label: 'Audio Analysis', color: '#22d3ee' },
    { name: 'chord.py', label: 'Chord Detection', color: '#ec4899' },
    { name: 'Gemini', label: 'AI Coaching', color: '#f97316' },
    { name: 'ElevenLabs', label: 'Voice Synthesis', color: '#34d399' },
    { name: 'FastAPI', label: 'Backend', color: '#60a5fa' },
    { name: 'React', label: 'Frontend', color: '#c084fc' },
    { name: 'WebAudio', label: 'Recording', color: '#fbbf24' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#04040a', position: 'relative', overflow: 'hidden' }}>

      {/* ── Background ── */}
      <div className="grid-bg" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}/>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', left: '-10%', top: '-10%', background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)', animation: 'orb1 12s ease-in-out infinite' }}/>
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', right: '-5%', top: '30%', background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)', animation: 'orb2 15s ease-in-out infinite' }}/>
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', left: '40%', bottom: '-10%', background: 'radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)', animation: 'orb3 10s ease-in-out infinite' }}/>
      </div>

      {/* ── Nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 40px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(4,4,10,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MiniCat size={32}/>
          <span style={{
            fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 20,
            background: 'linear-gradient(135deg,#c084fc,#ec4899,#f97316)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
          }}>PitchPurrfect</span>
        </div>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {['Features', 'How It Works', 'Tech Stack'].map(label => (
            <a key={label}
              href={`#${label.toLowerCase().replace(/\s+/g, '-')}`}
              className="nav-link"
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 500 }}>
              {label}
            </a>
          ))}
        </div>
        <button className="btn-primary" onClick={onStart} style={{ fontSize: 13, padding: '10px 24px' }}>
          Start Practicing
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12"/>
          </svg>
        </button>
      </nav>

      {/* ── Hero ── */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 64, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', maxWidth: 760, padding: '0 24px' }}>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <Cat size={130} float showPaw/>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100,
            background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', marginBottom: 28 }}>
            <Dot color="#a855f7" pulse/>
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: 'rgba(255,255,255,0.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
              AI-Powered Music Practice
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Outfit',sans-serif", fontWeight: 900,
            fontSize: 'clamp(3.5rem,10vw,7.5rem)',
            lineHeight: 0.95, letterSpacing: '-0.04em',
            marginBottom: 28,
          }}>
            <span className="shimmer-text">PitchPurrfect</span>
          </h1>

          <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.45)', fontWeight: 300, lineHeight: 1.7, marginBottom: 48, maxWidth: 540, margin: '0 auto 48px', fontFamily: "'Space Grotesk',sans-serif" }}>
            Pick a track. Choose your instrument. Play along — and get instant AI voice coaching powered by Gemini and ElevenLabs.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={onStart} style={{ fontSize: 16, padding: '15px 40px' }}>
              Start Practicing Free
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v14l11-7z"/>
              </svg>
            </button>
            <a href="#features" style={{ textDecoration: 'none' }}>
              <button className="btn-ghost" style={{ fontSize: 14, padding: '15px 32px' }}>
                See How It Works
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
            </a>
          </div>

          {/* Tech pills */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 56 }}>
            {[
              ['#a855f7','Gemini AI'],
              ['#22d3ee','ElevenLabs'],
              ['#ec4899','Demucs Stems'],
              ['#f97316','Real-Time Analysis'],
              ['#34d399','Chord Detection'],
            ].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px',
                borderRadius: 100, background: `${c}0f`, border: `1px solid ${c}25`,
                fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono',monospace" }}>
                <Dot color={c}/> {l}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '120px 40px', maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <Tag color="purple">Features</Tag>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 'clamp(2rem,4vw,3.5rem)', letterSpacing: '-0.03em', color: 'white', marginTop: 16, lineHeight: 1.1 }}>
            Everything you need to<br/><span className="shimmer-text">master your instrument</span>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20 }}>
          {features.map((f, i) => (
            <div key={i} className="card" style={{
              padding: 28,
              borderColor: `${f.color}22`,
              boxShadow: `0 0 40px ${f.color}0a`,
              animation: `fadeSlideUp 0.5s ease both`,
              animationDelay: `${i * 0.1}s`,
            }}>
              <div style={{ fontSize: 36, marginBottom: 16, filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.2))' }}>{f.icon}</div>
              <h3 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 18, color: 'white', marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, fontFamily: "'Space Grotesk',sans-serif" }}>{f.desc}</p>
              <div style={{ marginTop: 20, height: 2, borderRadius: 1, background: `linear-gradient(90deg, ${f.color}, transparent)` }}/>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" style={{ padding: '100px 40px', maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <Tag color="cyan">Process</Tag>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 'clamp(2rem,4vw,3.5rem)', letterSpacing: '-0.03em', color: 'white', marginTop: 16, lineHeight: 1.1 }}>
            How It Works
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 24, position: 'relative' }}>
          {/* Connector line */}
          <div style={{ position: 'absolute', top: 44, left: '12.5%', right: '12.5%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.3), rgba(236,72,153,0.3), transparent)',
            display: 'none' }}/>

          {howItWorks.map((step, i) => (
            <div key={i} className="card" style={{
              padding: 28, textAlign: 'center',
              animation: `fadeSlideUp 0.5s ease both`, animationDelay: `${i * 0.12}s`,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
                background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.2))',
                border: '1px solid rgba(168,85,247,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: '#c084fc',
              }}>{step.n}</div>
              <h3 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 16, color: 'white', marginBottom: 10 }}>{step.title}</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, fontFamily: "'Space Grotesk',sans-serif" }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section id="tech-stack" style={{ padding: '100px 40px', maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <Tag color="orange">Built With</Tag>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 'clamp(2rem,4vw,3.5rem)', letterSpacing: '-0.03em', color: 'white', marginTop: 16 }}>
            Tech Stack
          </h2>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
          {techStack.map((t, i) => (
            <div key={i} className="card" style={{
              padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 12,
              borderColor: `${t.color}22`,
              animation: `fadeSlideUp 0.4s ease both`, animationDelay: `${i * 0.07}s`,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, boxShadow: `0 0 8px ${t.color}` }}/>
              <div>
                <p style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14, color: 'white', lineHeight: 1 }}>{t.name}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.04em' }}>{t.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '100px 40px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div className="card" style={{ maxWidth: 640, margin: '0 auto', padding: 56, borderColor: 'rgba(168,85,247,0.25)', boxShadow: '0 0 80px rgba(168,85,247,0.1)' }}>
          <Cat size={80} float/>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 36, color: 'white', margin: '24px 0 16px', letterSpacing: '-0.02em' }}>
            Ready to practice?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, lineHeight: 1.7, marginBottom: 36, fontFamily: "'Space Grotesk',sans-serif" }}>
            Three songs ready to go. Pick one, plug in your instrument, and let the AI coach guide you.
          </p>
          <button className="btn-primary" onClick={onStart} style={{ fontSize: 16, padding: '15px 44px' }}>
            Let's Go! 🎸
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '28px 40px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <MiniCat size={22}/>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15,
            background: 'linear-gradient(135deg,#c084fc,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            PitchPurrfect
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono',monospace" }}>AI-Powered Music Practice Platform</p>
      </footer>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SONG SELECT
// ─────────────────────────────────────────────────────────────
const SongSelect = ({ onSelect, onBack }) => {
  const [songs,   setSongs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [uploadHover, setUploadHover] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);

  useEffect(() => {
    api.songs()
      .then(d => { setSongs(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const handleUpload = () => {
    setUploadMsg('🚀 Song upload coming soon — stay tuned!');
    setTimeout(() => setUploadMsg(null), 3500);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#04040a', position: 'relative', overflow: 'hidden' }}>
      <div className="grid-bg" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}/>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', left: '-5%', top: '10%', background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)', animation: 'orb1 14s ease-in-out infinite' }}/>
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', right: '0%', bottom: '10%', background: 'radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)', animation: 'orb2 11s ease-in-out infinite' }}/>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px', position: 'relative', zIndex: 1 }}>
        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 60 }}>
          <button className="btn-ghost" onClick={onBack}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            Home
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MiniCat size={30}/>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 18,
              background: 'linear-gradient(135deg,#c084fc,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              PitchPurrfect
            </span>
          </div>
          <div style={{ width: 100 }}/>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <Tag color="purple">Song Library</Tag>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 'clamp(2rem,5vw,3.5rem)', letterSpacing: '-0.03em', color: 'white', margin: '16px 0 12px' }}>
            Choose Your Track
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 15, fontFamily: "'Space Grotesk',sans-serif" }}>
            Select a song to begin your practice session
          </p>
        </div>

        {uploadMsg && (
          <div style={{
            marginBottom: 24, padding: '14px 20px', borderRadius: 14,
            background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)',
            color: '#c084fc', fontSize: 14, textAlign: 'center', fontFamily: "'Space Grotesk',sans-serif",
            animation: 'fadeSlideUp 0.3s ease both',
          }}>
            {uploadMsg}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: 100 }}>
            <Spinner size={40} color="#a855f7"/>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>Loading tracks…</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>😿</div>
            <p style={{ color: '#f87171', fontSize: 16, fontFamily: "'Space Grotesk',sans-serif", marginBottom: 8 }}>Failed to load songs</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }}>{error}</p>
          </div>
        ) : (
          <>
            {/* Songs grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 24, marginBottom: 32 }}>
              {songs.map((song, idx) => (
                <div key={song.id}
                  className="card song-card"
                  onClick={() => onSelect(song)}
                  style={{
                    cursor: 'pointer', overflow: 'hidden',
                    borderColor: 'rgba(168,85,247,0.15)',
                    animation: `fadeSlideUp 0.4s ease both`, animationDelay: `${idx * 0.1}s`,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(168,85,247,0.5)';
                    e.currentTarget.style.boxShadow = '0 0 40px rgba(168,85,247,0.15)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(168,85,247,0.15)';
                    e.currentTarget.style.boxShadow = '';
                  }}>

                  {/* Album art */}
                  <div style={{ aspectRatio: '1', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#1a0a2e,#0a0a1e)' }}>
                    {song.coverUrl ? (
                      <img src={song.coverUrl} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                        onMouseEnter={e => e.target.style.transform = 'scale(1.08)'}
                        onMouseLeave={e => e.target.style.transform = 'scale(1)'}/>
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 48, marginBottom: 8 }}>🎵</div>
                          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }}>No Cover</p>
                        </div>
                      </div>
                    )}
                    {/* Overlay */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(4,4,10,0.9) 0%, transparent 60%)',
                    }}/>
                    {/* Play button overlay */}
                    <div style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.25s', background: 'rgba(4,4,10,0.5)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                      <div style={{
                        width: 60, height: 60, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#a855f7,#ec4899)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 32px rgba(168,85,247,0.6)',
                        transform: 'scale(1)', transition: 'transform 0.2s',
                      }}>
                        <svg width="24" height="24" fill="white" viewBox="0 0 24 24" style={{ marginLeft: 3 }}>
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                    {/* Song number badge */}
                    <div style={{
                      position: 'absolute', top: 12, left: 12,
                      width: 28, height: 28, borderRadius: 8,
                      background: 'rgba(4,4,10,0.8)', backdropFilter: 'blur(8px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600,
                    }}>{String(idx + 1).padStart(2,'0')}</div>
                  </div>

                  {/* Info */}
                  <div style={{ padding: '18px 20px' }}>
                    <p style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 16, color: 'white', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>{song.artist}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <WaveBars bars={14} color="#a855f7"/>
                      <Tag color="purple">Practice</Tag>
                    </div>
                  </div>
                </div>
              ))}

              {/* Upload Card */}
              <div
                className="card song-card"
                onClick={handleUpload}
                onMouseEnter={() => setUploadHover(true)}
                onMouseLeave={() => setUploadHover(false)}
                style={{
                  cursor: 'pointer', overflow: 'hidden', minHeight: 320,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 16, padding: 32,
                  borderStyle: 'dashed',
                  borderColor: uploadHover ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.1)',
                  background: uploadHover ? 'rgba(34,211,238,0.04)' : 'rgba(255,255,255,0.01)',
                  boxShadow: uploadHover ? '0 0 40px rgba(34,211,238,0.08)' : '',
                  animation: 'fadeSlideUp 0.4s ease both', animationDelay: `${songs.length * 0.1}s`,
                }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: uploadHover ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${uploadHover ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.25s',
                }}>
                  <svg width="28" height="28" fill="none" stroke={uploadHover ? '#22d3ee' : 'rgba(255,255,255,0.3)'} viewBox="0 0 24 24" style={{ transition: 'all 0.25s' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, color: uploadHover ? '#22d3ee' : 'rgba(255,255,255,0.5)', transition: 'all 0.25s', marginBottom: 6 }}>Upload Your Song</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6, fontFamily: "'Space Grotesk',sans-serif" }}>
                    MP3, WAV, FLAC supported<br/>
                    <span style={{ color: 'rgba(255,255,255,0.15)' }}>Coming soon</span>
                  </p>
                </div>
                <Tag color="cyan">Future Feature</Tag>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PRACTICE PAGE
// ─────────────────────────────────────────────────────────────
const INSTRUMENTS = [
  { k: 'guitar', i: '🎸', l: 'Guitar' },
  { k: 'piano',  i: '🎹', l: 'Piano'  },
  { k: 'drums',  i: '🥁', l: 'Drums'  },
  { k: 'bass',   i: '🎸', l: 'Bass'   },
  { k: 'vocals', i: '🎤', l: 'Vocals' },
];

const STEM_META = {
  drums:  { i: '🥁', c: '#ec4899', label: 'Drums'  },
  bass:   { i: '🎸', c: '#a855f7', label: 'Bass'   },
  vocals: { i: '🎤', c: '#22d3ee', label: 'Vocals' },
  other:  { i: '🎹', c: '#34d399', label: 'Other'  },
};

const Practice = ({ song, onBack, onEnd }) => {
  const [stems,       setStems]       = useState({});
  const [stemsLoaded, setStemsLoaded] = useState(false);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [instrument,  setInstrument]  = useState('guitar');
  const [micReady,    setMicReady]    = useState(false);
  const [recording,   setRecording]   = useState(false);
  const [audioError,  setAudioError]  = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [autoTrigger, setAutoTrigger] = useState(false);
  const [analysing,   setAnalysing]   = useState(false);
  const [sessionId,   setSessionId]   = useState(null);

  const progRef     = useRef(null);
  const msRef       = useRef(null);
  const mrRef       = useRef(null);
  const chunksRef   = useRef([]);
  const aRefs       = useRef({});
  const stemsRef    = useRef({});
  const instrumentRef = useRef(instrument);

  useEffect(() => { stemsRef.current = stems; }, [stems]);
  useEffect(() => { instrumentRef.current = instrument; }, [instrument]);

  useEffect(() => {
    if (!song?.folderId) return;
    setStemsLoaded(false); setAudioError(null);
    api.stems(song.folderId).then(data => {
      setStems(data);
      const newA = {};
      Object.entries(data).forEach(([k, s]) => {
        if (!s.url) return;
        const a = new Audio();
        a.crossOrigin = 'anonymous'; a.preload = 'auto';
        a.addEventListener('error', () => setAudioError(`Failed to load ${k}`));
        a.src = s.url; a.volume = (s.volume ?? 80) / 100; a.muted = !s.active; a.load();
        newA[k] = a;
      });
      aRefs.current = newA; setStemsLoaded(true);
    }).catch(e => setAudioError(e.message));
    return () => { Object.values(aRefs.current).forEach(a => { a.pause(); a.src = ''; }); aRefs.current = {}; };
  }, [song?.folderId]);

  useEffect(() => {
    Object.entries(stems).forEach(([k, s]) => {
      if (aRefs.current[k]) aRefs.current[k].volume = (s.volume ?? 80) / 100;
    });
  }, [stems]);

  useEffect(() => {
    Object.keys(aRefs.current).forEach(k => {
      aRefs.current[k].muted = k === instrument ? true : !stemsRef.current[k]?.active;
    });
  }, [instrument]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => { msRef.current = stream; setMicReady(true); })
      .catch(() => setMicReady(false));
    return () => { msRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  useEffect(() => {
    clearInterval(progRef.current);
    if (isPlaying) {
      const playAll = async () => {
        for (const [k, a] of Object.entries(aRefs.current)) {
          try {
            if (a.readyState < 3) await new Promise((res, rej) => {
              a.addEventListener('canplaythrough', res, { once: true });
              a.addEventListener('error', rej, { once: true });
            });
            a.muted = k === instrumentRef.current ? true : !stemsRef.current[k]?.active;
            const leader = Object.values(aRefs.current).find(x => x.duration > 0);
            if (leader && leader !== a) a.currentTime = leader.currentTime;
            await a.play();
          } catch(e) { console.warn(`play ${k}:`, e.message); }
        }
      };
      playAll();
      if (msRef.current) {
        chunksRef.current = [];
        const mr = new MediaRecorder(msRef.current);
        mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mr.start(500);
        mrRef.current = mr;
        setRecording(true);
      }
      progRef.current = setInterval(() => {
        const leader = Object.values(aRefs.current).find(a => a && a.duration > 0 && !a.paused);
        if (leader) {
          const p = (leader.currentTime / leader.duration) * 100;
          setProgress(p);
          if (p >= 99.5) { setIsPlaying(false); setProgress(0); stopAndCompare(null); }
        }
      }, 200);
    } else {
      Object.values(aRefs.current).forEach(a => { try { a.pause(); } catch(_) {} });
    }
    return () => clearInterval(progRef.current);
  }, [isPlaying]);

  const stopAndCompare = useCallback((trimSeconds) => {
    if (mrRef.current && mrRef.current.state !== 'inactive') mrRef.current.stop();
    setRecording(false);
    setTimeout(() => runComparison(trimSeconds), 700);
  }, []);

  const runComparison = useCallback(async (trimSeconds) => {
    if (chunksRef.current.length === 0) return;
    setAnalysing(true);
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const playerFile = new File([blob], 'recording.webm', { type: 'audio/webm' });
      const currentInstrument = instrumentRef.current;
      const refStemKey = Object.keys(stemsRef.current).find(k => k !== currentInstrument) || Object.keys(stemsRef.current)[0];
      const refUrl = stemsRef.current[refStemKey]?.url;
      if (!refUrl) { setAnalysing(false); return; }
      const refBlob = await fetch(refUrl).then(r => r.blob());
      let refFile;
      if (trimSeconds != null) {
        const trimmedBlob = await trimAudioBlob(refBlob, trimSeconds);
        refFile = new File([trimmedBlob], 'reference.wav', { type: 'audio/wav' });
      } else {
        refFile = new File([refBlob], 'reference.mp3', { type: refBlob.type || 'audio/mpeg' });
      }
      const fd = new FormData();
      fd.append('reference_file', refFile);
      fd.append('player_file', playerFile);
      const cmp = await api.postAudio('/compare-performance', fd);
      setCompareData(cmp);
      setAutoTrigger(true);
    } catch(e) { console.error('Comparison failed:', e); }
    finally { setAnalysing(false); }
  }, []);

  const seek = (pct) => {
    setProgress(pct);
    Object.values(aRefs.current).forEach(a => { if (a.duration > 0) a.currentTime = (pct / 100) * a.duration; });
  };

  const fmtT = (pct) => {
    const l = Object.values(aRefs.current).find(a => a?.duration > 0);
    const s = Math.floor((pct / 100) * (l?.duration || 0));
    return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  };

  const fmtD = () => {
    const l = Object.values(aRefs.current).find(a => a?.duration > 0);
    if (!l) return '--:--';
    const s = Math.floor(l.duration);
    return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  };

  const toggleStem = (k) => setStems(p => {
    const na = !p[k]?.active;
    if (aRefs.current[k] && k !== instrument) aRefs.current[k].muted = !na;
    return { ...p, [k]: { ...p[k], active: na } };
  });

  const handlePlayPause = async () => {
    if (!stemsLoaded) return;
    if (isPlaying) {
      const leader = Object.values(aRefs.current).find(a => a && a.duration > 0);
      const currentTime = leader ? leader.currentTime : null;
      setIsPlaying(false);
      stopAndCompare(currentTime);
    } else {
      if (!sessionId) {
        try {
          const sess = await api.startSession(song.folderId, instrument);
          setSessionId(sess.sessionId);
        } catch(e) { console.warn('Session start failed:', e); }
      }
      setIsPlaying(true);
    }
  };

  const chordPct = compareData?.chord_comparison?.accuracy_pct ?? null;

  return (
    <div style={{ minHeight: '100vh', background: '#04040a', position: 'relative', overflow: 'hidden' }}>
      <div className="grid-bg" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}/>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', right: '-10%', top: '-10%', background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)', animation: 'orb1 12s ease-in-out infinite' }}/>
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', left: '-5%', bottom: '10%', background: 'radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 70%)', animation: 'orb2 15s ease-in-out infinite' }}/>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px', position: 'relative', zIndex: 1 }}>

        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24,
          padding: '12px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>
          <button className="btn-ghost" onClick={onBack}>
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            Songs
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <MiniCat size={28}/>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 17,
              background: 'linear-gradient(135deg,#c084fc,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              PitchPurrfect
            </span>
          </div>
          <button className="btn-danger" onClick={onEnd}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
            Exit
          </button>
        </div>

        {/* Alerts */}
        {audioError && (
          <div style={{ marginBottom: 16, padding: '13px 18px', borderRadius: 12,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#f87171', fontSize: 13, fontFamily: "'Space Grotesk',sans-serif",
            animation: 'fadeSlideUp 0.3s ease both' }}>
            ⚠️ {audioError}
          </div>
        )}

        {analysing && (
          <div style={{ marginBottom: 16, padding: '13px 18px', borderRadius: 12,
            background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
            color: '#c084fc', fontSize: 13, display: 'flex', alignItems: 'center', gap: 12,
            fontFamily: "'Space Grotesk',sans-serif", animation: 'fadeSlideUp 0.3s ease both' }}>
            <Spinner size={15} color="#c084fc"/>
            Analysing chords, pitch & timing — AI voice feedback incoming…
            <WaveBars active bars={12} color="#c084fc"/>
          </div>
        )}

        {/* Main layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 340px', gap: 18, alignItems: 'start' }}>

          {/* ── Left+Center: Player, Stems, Results ── */}
          <div style={{ gridColumn: '1/3', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Player card */}
            <div className="card card-glow-purple" style={{ padding: 28, animation: 'fadeSlideUp 0.4s ease both' }}>
              <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
                {/* Album art */}
                <div style={{ width: 110, height: 110, borderRadius: 16, overflow: 'hidden', flexShrink: 0,
                  background: 'linear-gradient(135deg,#1a0a2e,#0a0a1e)',
                  boxShadow: '0 8px 32px rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.2)' }}>
                  {song.coverUrl
                    ? <img src={song.coverUrl} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🎵</div>
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Song info */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div>
                      <h2 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 24, color: 'white', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>{song.title}</h2>
                      <p style={{ color: 'rgba(255,255,255,0.35)', marginTop: 4, fontSize: 14 }}>{song.artist}</p>
                    </div>
                    {isPlaying && <WaveBars active bars={10} color="#a855f7"/>}
                  </div>

                  {/* Progress bar */}
                  <div style={{ margin: '16px 0 6px', cursor: 'pointer' }} onClick={e => {
                    const r = e.currentTarget.getBoundingClientRect();
                    seek(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)));
                  }}>
                    <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', cursor: 'pointer' }}>
                      <div style={{
                        height: '100%', width: `${Math.min(100, Math.max(0, progress))}%`,
                        background: 'linear-gradient(90deg,#a855f7,#ec4899)',
                        borderRadius: 3, transition: 'width 0.2s',
                        boxShadow: '0 0 10px rgba(168,85,247,0.5)'
                      }}/>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono',monospace", marginBottom: 16 }}>
                    <span>{fmtT(progress)}</span>
                    <span>{!stemsLoaded ? 'loading…' : fmtD()}</span>
                  </div>

                  {/* Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => seek(Math.max(0, progress - 10))} style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s',
                    }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}
                       onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.06)'}>
                      <svg width="17" height="17" fill="currentColor" viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>
                    </button>

                    {/* Main play/pause */}
                    <button onClick={handlePlayPause} disabled={!stemsLoaded} style={{
                      width: 56, height: 56, borderRadius: 16, border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg,#a855f7,#ec4899)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isPlaying ? '0 0 32px rgba(236,72,153,0.5)' : '0 0 24px rgba(168,85,247,0.35)',
                      transition: 'all 0.25s', opacity: stemsLoaded ? 1 : 0.4,
                      transform: isPlaying ? 'scale(1.05)' : 'scale(1)',
                    }}>
                      {isPlaying
                        ? <svg width="22" height="22" fill="white" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        : <svg width="22" height="22" fill="white" viewBox="0 0 24 24" style={{ marginLeft: 3 }}><path d="M8 5v14l11-7z"/></svg>
                      }
                    </button>

                    <button onClick={() => seek(Math.min(100, progress + 10))} style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s',
                    }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}
                       onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.06)'}>
                      <svg width="17" height="17" fill="currentColor" viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
                    </button>

                    {/* Mic status */}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {recording ? (
                        <div className="record-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}/>
                      ) : (
                        <Dot color={micReady ? '#34d399' : '#fbbf24'}/>
                      )}
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.05em' }}>
                        {recording ? 'REC' : micReady ? 'MIC READY' : 'NO MIC'}
                      </span>
                    </div>

                    {!stemsLoaded && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono',monospace" }}>Loading stems…</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Stem Mixer */}
            <div className="card" style={{ padding: 22, animation: 'fadeSlideUp 0.4s ease both 0.05s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="15" height="15" fill="none" stroke="#ec4899" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, color: 'white', lineHeight: 1 }}>Stem Mixer</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2, fontFamily: "'JetBrains Mono',monospace" }}>Toggle & adjust individual tracks</p>
                </div>
              </div>

              {Object.keys(stems).length === 0 && stemsLoaded ? (
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No stems found for this song.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 14 }}>
                  {Object.keys(stems).map(k => {
                    const m = STEM_META[k] || { i: '🎵', c: '#a855f7', label: k };
                    const isMuted = k === instrument;
                    const active = stems[k]?.active;
                    return (
                      <div key={k}>
                        <button onClick={() => !isMuted && toggleStem(k)} style={{
                          width: '100%', padding: '14px 10px', borderRadius: 14,
                          border: `1px solid ${isMuted ? 'rgba(239,68,68,0.3)' : active ? `${m.c}33` : 'rgba(255,255,255,0.07)'}`,
                          background: isMuted ? 'rgba(239,68,68,0.07)' : active ? `${m.c}10` : 'rgba(255,255,255,0.02)',
                          cursor: isMuted ? 'default' : 'pointer', textAlign: 'center',
                          transition: 'all 0.2s',
                          opacity: isMuted ? 0.5 : active ? 1 : 0.35,
                        }}
                        onMouseEnter={e => { if (!isMuted) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; }}>
                          <div style={{ fontSize: 26, marginBottom: 8 }}>{m.i}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: isMuted ? '#f87171' : active ? 'white' : 'rgba(255,255,255,0.35)', fontFamily: "'Space Grotesk',sans-serif" }}>
                            {m.label || (k.charAt(0).toUpperCase() + k.slice(1))}
                          </div>
                          {isMuted && (
                            <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '2px 7px', borderRadius: 100, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
                              <Dot color="#ef4444"/>
                              <span style={{ fontSize: 8, color: '#f87171', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.06em' }}>YOU PLAY</span>
                            </div>
                          )}
                        </button>
                        <div style={{ marginTop: 8 }}>
                          <input type="range" min="0" max="100" value={stems[k]?.volume ?? 80}
                            onChange={e => setStems(p => ({ ...p, [k]: { ...p[k], volume: +e.target.value } }))}
                            disabled={isMuted}
                            style={{ width: '100%', opacity: isMuted ? 0.2 : 0.7 }}/>
                          <p style={{ textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>{stems[k]?.volume ?? 80}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Performance Analysis */}
            {compareData && (
              <div className="card" style={{ padding: 24, animation: 'slideInRight 0.5s ease both' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="15" height="15" fill="none" stroke="#c084fc" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, color: 'white', lineHeight: 1 }}>Performance Analysis</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2, fontFamily: "'JetBrains Mono',monospace" }}>Timing, pitch & chord accuracy</p>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
                  {[
                    { v: compareData.tempo?.toFixed(1),  l: 'BPM',       c: '#c084fc' },
                    { v: `${compareData.summary?.average_offset_ms >= 0 ? '+' : ''}${compareData.summary?.average_offset_ms?.toFixed(1)}ms`, l: 'Avg Offset', c: '#60a5fa' },
                  ].filter(x => x.v).map(({ v, l, c }) => (
                    <div key={l} style={{ padding: '10px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
                      <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 600, color: c, lineHeight: 1 }}>{v}</p>
                      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.08em' }}>{l}</p>
                    </div>
                  ))}
                  <div style={{ padding: '10px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: 'white', lineHeight: 1 }}>{compareData.summary?.overall_status}</p>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.08em' }}>Overall</p>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
                    {[
                      { v: compareData.summary?.counts?.on_time, l: 'on-time', c: '#34d399' },
                      { v: compareData.summary?.counts?.ahead,   l: 'early',   c: '#60a5fa' },
                      { v: compareData.summary?.counts?.behind,  l: 'late',    c: '#fbbf24' },
                    ].map(({ v, l, c }) => (
                      <div key={l} style={{ textAlign: 'center' }}>
                        <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700, color: c, lineHeight: 1 }}>{v ?? 0}</p>
                        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>{l}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {chordPct != null && (
                  <div style={{ marginBottom: 16 }}>
                    <ChordAccuracyBar pct={chordPct}/>
                  </div>
                )}

                {Array.isArray(compareData.comparison) && <TimingTable rows={compareData.comparison}/>}
                {compareData.beat_times?.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <BeatTimeline beats={compareData.beat_times} onsets={compareData.player_onsets || []}/>
                  </div>
                )}
              </div>
            )}

            {/* Chord & Note Review */}
            {compareData && <ChordNoteReviewCard compareData={compareData}/>}
          </div>

          {/* ── Right column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <AIFeedbackPanel
              compareData={compareData}
              autoTrigger={autoTrigger}
              onAutoHandled={() => setAutoTrigger(false)}
            />

            {/* Instrument Selector */}
            <div className="card card-glow-purple" style={{ padding: 20, animation: 'fadeSlideUp 0.4s ease both 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 6px #a855f7' }}/>
                <SectionLabel>Your Instrument</SectionLabel>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginBottom: 14, lineHeight: 1.6, fontFamily: "'Space Grotesk',sans-serif" }}>
                This stem will be muted — you fill its role.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {INSTRUMENTS.map(({ k, i, l }) => (
                  <button key={k} onClick={() => { if (!recording) setInstrument(k); }}
                    disabled={recording}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: `1px solid ${instrument === k ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.07)'}`,
                      background: instrument === k ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.02)',
                      color: instrument === k ? '#c084fc' : 'rgba(255,255,255,0.45)',
                      cursor: recording ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: instrument === k ? 600 : 400,
                      transition: 'all 0.2s',
                      opacity: recording ? 0.5 : 1,
                    }}>
                    <span>{i}</span>
                    <span>{l}</span>
                    {instrument === k && (
                      <span style={{ marginLeft: 'auto' }}>
                        <Tag color="purple">Active</Tag>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Mic warning */}
            {!micReady && (
              <div className="card" style={{ padding: 16, borderColor: 'rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.04)', animation: 'fadeSlideUp 0.4s ease both' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 18 }}>⚠️</span>
                  <p style={{ fontSize: 12, color: '#fbbf24', lineHeight: 1.6, fontFamily: "'Space Grotesk',sans-serif" }}>
                    Microphone access required. Please allow mic access and reload.
                  </p>
                </div>
              </div>
            )}

            {/* Quick stats during analysis */}
            {compareData && chordPct != null && (
              <div className="card" style={{ padding: 20, borderColor: `${accuracyColor(chordPct)}22`, animation: 'slideInRight 0.5s ease both' }}>
                <SectionLabel>Session Score</SectionLabel>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                  <AccuracyRing pct={chordPct} size={96} label="Chord Score" sublabel={accuracyLabel(chordPct)}/>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('landing');
  const [song, setSong] = useState(null);

  return (
    <>
      <FontLoader/>
      <GlobalStyles/>
      {page === 'landing'  && <Landing onStart={() => setPage('songs')}/>}
      {page === 'songs'    && <SongSelect onSelect={s => { setSong(s); setPage('practice'); }} onBack={() => setPage('landing')}/>}
      {page === 'practice' && song && (
        <Practice song={song} onBack={() => setPage('songs')} onEnd={() => { setSong(null); setPage('landing'); }}/>
      )}
    </>
  );
}
