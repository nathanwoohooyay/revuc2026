import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────
// FONTS
// ─────────────────────────────────────────────────────────────
const FontLoader = () => {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap';
    document.head.appendChild(link);
  }, []);
  return null;
};

// ─────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

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
    body { font-family: 'DM Sans', sans-serif; background: #0a0a0f; color: #e8e8f0; min-height: 100vh; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(120,80,200,0.4); border-radius: 2px; }
    @keyframes floatY    { 0%,100% { transform: translateY(0); }     50% { transform: translateY(-10px); } }
    @keyframes pulseRing { 0%,100% { opacity:.6; transform:scale(1);} 50%{ opacity:.2; transform:scale(1.15);} }
    @keyframes fadeUp    { from { opacity:0; transform:translateY(16px);} to { opacity:1; transform:translateY(0);} }
    @keyframes spin      { to { transform: rotate(360deg); } }
    @keyframes strokeIn  { from { stroke-dashoffset: var(--dash); } to { stroke-dashoffset: 0; } }
    .cat-float { animation: floatY 3s ease-in-out infinite; }
    .fade-up   { animation: fadeUp .4s ease both; }
    .spin      { animation: spin .7s linear infinite; }
    input[type=range] { -webkit-appearance:none; appearance:none; background:transparent; cursor:pointer; width:100%; }
    input[type=range]::-webkit-slider-runnable-track { height:4px; border-radius:2px; background:rgba(255,255,255,0.12); }
    input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:linear-gradient(135deg,#ec4899,#8b5cf6); margin-top:-5px; }
    input[type=range]::-moz-range-track { height:4px; border-radius:2px; background:rgba(255,255,255,0.12); }
    input[type=range]::-moz-range-thumb { width:14px; height:14px; border-radius:50%; background:linear-gradient(135deg,#ec4899,#8b5cf6); border:none; }
    .btn-primary {
      display:inline-flex; align-items:center; gap:8px; padding:12px 28px; border-radius:100px; border:none; cursor:pointer;
      font-family:'Syne',sans-serif; font-weight:700; font-size:14px; letter-spacing:.03em;
      background:linear-gradient(135deg,#ec4899 0%,#8b5cf6 50%,#06b6d4 100%);
      color:white; transition:all .2s; position:relative; overflow:hidden;
    }
    .btn-primary::after { content:''; position:absolute; inset:0; background:white; opacity:0; transition:.2s; }
    .btn-primary:hover::after { opacity:.1; }
    .btn-primary:active { transform:scale(.97); }
    .btn-primary:disabled { opacity:.4; cursor:not-allowed; }
    .btn-ghost {
      display:inline-flex; align-items:center; gap:6px; padding:9px 18px; border-radius:100px; cursor:pointer;
      font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500;
      border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.6); transition:all .2s;
    }
    .btn-ghost:hover { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.9); }
    .card { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:20px; backdrop-filter:blur(20px); }
    .card-ai { border-color:rgba(6,182,212,0.3); background:rgba(6,182,212,0.05); }
    .tag { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:100px; font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; }
    .tag-green  { background:rgba(52,211,153,.15);  color:#34d399; border:1px solid rgba(52,211,153,.25); }
    .tag-amber  { background:rgba(251,191,36,.15);  color:#fbbf24; border:1px solid rgba(251,191,36,.25); }
    .tag-red    { background:rgba(248,113,113,.15); color:#f87171; border:1px solid rgba(248,113,113,.25); }
    .tag-blue   { background:rgba(96,165,250,.15);  color:#60a5fa; border:1px solid rgba(96,165,250,.25); }
    .tag-purple { background:rgba(167,139,250,.15); color:#a78bfa; border:1px solid rgba(167,139,250,.25); }
    .tag-cyan   { background:rgba(6,182,212,.15);   color:#22d3ee; border:1px solid rgba(6,182,212,.25); }
    .tag-gray   { background:rgba(255,255,255,.06); color:rgba(255,255,255,.4); border:1px solid rgba(255,255,255,.1); }
    select option { background:#1a1a2e; color:white; }
    .chord-segment { transition: opacity .15s; }
    .chord-segment:hover { opacity: .85 !important; }
  `}</style>
);

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const accuracyColor = (pct) => {
  if (pct === null || pct === undefined) return '#a78bfa';
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
// CAT
// ─────────────────────────────────────────────────────────────
const Cat = ({ size = 80, float = true }) => (
  <div style={{ width: size, height: size }} className={float ? 'cat-float' : ''}>
    <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="cg1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#f472b6" />
          <stop offset="50%"  stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#67e8f9" />
        </linearGradient>
      </defs>
      <path d="M145 140 Q175 130 170 95 Q165 70 150 75" stroke="url(#cg1)" strokeWidth="18" fill="none" strokeLinecap="round"/>
      <ellipse cx="100" cy="135" rx="60" ry="50" fill="url(#cg1)"/>
      <ellipse cx="65"  cy="175" rx="14" ry="9"  fill="#fce7f3"/>
      <ellipse cx="135" cy="175" rx="14" ry="9"  fill="#fce7f3"/>
      <circle  cx="100" cy="70"  r="44" fill="url(#cg1)"/>
      <path d="M60 45 L52 15 L80 40 Z" fill="#f472b6"/>
      <path d="M140 45 L148 15 L120 40 Z" fill="#f472b6"/>
      <path d="M65 42 L60 25 L75 38 Z" fill="#fce7f3"/>
      <path d="M135 42 L140 25 L125 38 Z" fill="#fce7f3"/>
      <ellipse cx="82"  cy="65" rx="7" ry="9" fill="#0f0a1a"/>
      <ellipse cx="118" cy="65" rx="7" ry="9" fill="#0f0a1a"/>
      <circle cx="84"  cy="62" r="2.5" fill="white"/>
      <circle cx="120" cy="62" r="2.5" fill="white"/>
      <path d="M94 78 L106 78 L100 85 Z" fill="#f472b6"/>
      <path d="M100 85 Q90 94 82 90"  stroke="#0f0a1a" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M100 85 Q110 94 118 90" stroke="#0f0a1a" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {[[55,70,30,65],[55,75,28,75],[55,80,30,85],[145,70,170,65],[145,75,172,75],[145,80,170,85]].map(([x1,y1,x2,y2],i)=>(
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0f0a1a" strokeWidth="1.2" opacity=".3"/>
      ))}
      <ellipse cx="70"  cy="78" rx="7" ry="4" fill="#fbcfe8" opacity=".5"/>
      <ellipse cx="130" cy="78" rx="7" ry="4" fill="#fbcfe8" opacity=".5"/>
    </svg>
  </div>
);

// ─────────────────────────────────────────────────────────────
// UI ATOMS
// ─────────────────────────────────────────────────────────────
const Dot = ({ color = '#a78bfa', pulse = false }) => (
  <span style={{ width:8, height:8, borderRadius:'50%', background:color, display:'inline-block', flexShrink:0,
    animation: pulse ? 'pulseRing 1.5s ease-in-out infinite' : 'none' }} />
);

const Spinner = ({ size = 16 }) => (
  <span style={{ width:size, height:size, borderRadius:'50%', border:`2px solid rgba(255,255,255,.15)`,
    borderTopColor:'#a78bfa', display:'inline-block' }} className="spin" />
);

const ProgressBar = ({ pct, color = 'linear-gradient(90deg,#ec4899,#a78bfa,#22d3ee)' }) => (
  <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,.1)', overflow:'hidden' }}>
    <div style={{ height:'100%', width:`${Math.min(100,Math.max(0,pct))}%`, background:color, borderRadius:2, transition:'width .3s' }} />
  </div>
);

const Tag = ({ children, color = 'gray' }) => <span className={`tag tag-${color}`}>{children}</span>;

const SectionLabel = ({ children }) => (
  <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:'.12em', textTransform:'uppercase',
    color:'rgba(255,255,255,.3)', marginBottom:12 }}>{children}</p>
);

const Divider = () => <div style={{ height:1, background:'rgba(255,255,255,.07)', margin:'0 -24px' }} />;

// ─────────────────────────────────────────────────────────────
// ACCURACY RING
// ─────────────────────────────────────────────────────────────
const AccuracyRing = ({ pct, size = 80, label, sublabel }) => {
  const r   = (size / 2) - 7;
  const circ = 2 * Math.PI * r;
  const filled = pct != null ? (pct / 100) * circ : 0;
  const color = accuracyColor(pct);
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={`${filled} ${circ}`}
          style={{ transition:'stroke-dasharray .6s cubic-bezier(.4,0,.2,1)', filter:`drop-shadow(0 0 6px ${color}88)` }}/>
        <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
          style={{ transform:'rotate(90deg)', transformOrigin:`${size/2}px ${size/2}px`,
            fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize: size > 70 ? 16 : 12,
            fill: color, filter:'none' }}>
          {pct != null ? `${Math.round(pct)}%` : '—'}
        </text>
      </svg>
      {label    && <p style={{ fontSize:12, fontWeight:600, color:'white',              lineHeight:1, textAlign:'center' }}>{label}</p>}
      {sublabel && <p style={{ fontSize:10, color:'rgba(255,255,255,.35)', lineHeight:1, textAlign:'center' }}>{sublabel}</p>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CHORD ACCURACY BAR  (inline in Performance Analysis)
// ─────────────────────────────────────────────────────────────
const ChordAccuracyBar = ({ pct }) => {
  const color = accuracyColor(pct);
  const label = accuracyLabel(pct);
  return (
    <div style={{ flex:1, minWidth:120 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
        <p style={{ fontSize:10, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.06em', fontFamily:"'DM Mono',monospace" }}>
          Chord Accuracy
        </p>
        <span style={{ fontSize:12, fontWeight:700, color, fontFamily:"'Syne',sans-serif" }}>
          {pct != null ? `${Math.round(pct)}%` : '—'} <span style={{ fontSize:10, fontWeight:400, color:'rgba(255,255,255,.3)' }}>{label}</span>
        </span>
      </div>
      <div style={{ height:6, borderRadius:3, background:'rgba(255,255,255,.08)', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${Math.min(100, Math.max(0, pct ?? 0))}%`,
          background: `linear-gradient(90deg, ${color}aa, ${color})`,
          borderRadius:3, transition:'width .6s cubic-bezier(.4,0,.2,1)',
          boxShadow:`0 0 8px ${color}66` }} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CHORD MISTAKE TIMELINE
// ─────────────────────────────────────────────────────────────
const ChordMistakeTimeline = ({ refChordSummary = [], playerChordSummary = [], mismatches = [] }) => {
  const [tooltip, setTooltip] = useState(null);

  // Build a map of mismatch start times for quick lookup
  const mismatchMap = {};
  mismatches.forEach(m => { mismatchMap[m.start_time] = m; });

  // Find total duration from ref chord summary
  const totalDur = refChordSummary.length > 0
    ? refChordSummary[refChordSummary.length - 1].end_time
    : 1;

  if (!refChordSummary.length) {
    return (
      <p style={{ fontSize:12, color:'rgba(255,255,255,.3)', textAlign:'center', padding:'12px 0' }}>
        No chord data available
      </p>
    );
  }

  return (
    <div style={{ position:'relative' }}>
      {/* Legend */}
      <div style={{ display:'flex', gap:16, marginBottom:10 }}>
        {[['#34d399','Correct'],['#f87171','Wrong chord'],['rgba(255,255,255,.12)','No signal']].map(([c,l]) => (
          <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:10, height:10, borderRadius:3, background:c }} />
            <span style={{ fontSize:10, color:'rgba(255,255,255,.4)' }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Timeline bar */}
      <div style={{ position:'relative', height:36, borderRadius:8, overflow:'visible',
        background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)' }}>

        {refChordSummary.filter(s => s.chord !== 'N').map((seg, i) => {
          const left  = (seg.start_time / totalDur) * 100;
          const width = Math.max(0.4, ((seg.end_time - seg.start_time) / totalDur) * 100);
          const isMismatch = mismatchMap[seg.start_time];
          const color = isMismatch ? '#f87171' : '#34d399';
          const playedChord = isMismatch ? isMismatch.played : seg.chord;

          return (
            <div key={i}
              className="chord-segment"
              onMouseEnter={() => setTooltip({ seg, isMismatch, playedChord, left, width })}
              onMouseLeave={() => setTooltip(null)}
              style={{
                position:'absolute', top:4, bottom:4,
                left:`${left}%`, width:`${width}%`,
                background: isMismatch
                  ? 'rgba(248,113,113,.25)'
                  : 'rgba(52,211,153,.2)',
                borderLeft:`2px solid ${color}`,
                borderRadius:4,
                cursor:'default',
                minWidth:2,
              }}
            >
              {width > 4 && (
                <span style={{ position:'absolute', left:4, top:'50%', transform:'translateY(-50%)',
                  fontSize:9, fontFamily:"'DM Mono',monospace", color, whiteSpace:'nowrap',
                  overflow:'hidden', maxWidth:'100%', lineHeight:1 }}>
                  {seg.chord}
                </span>
              )}
            </div>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position:'absolute',
            top: -52,
            left: `clamp(0%, ${tooltip.left}%, 70%)`,
            zIndex: 10,
            background:'rgba(15,10,26,.95)',
            border:`1px solid ${tooltip.isMismatch ? 'rgba(248,113,113,.4)' : 'rgba(52,211,153,.4)'}`,
            borderRadius:8, padding:'7px 11px',
            pointerEvents:'none', whiteSpace:'nowrap',
          }}>
            {tooltip.isMismatch ? (
              <>
                <p style={{ fontSize:11, color:'#f87171', fontWeight:600, marginBottom:2 }}>
                  ✗ Wrong chord @ {tooltip.seg.start_time.toFixed(1)}s
                </p>
                <p style={{ fontSize:10, color:'rgba(255,255,255,.6)' }}>
                  Played: <b style={{color:'#fbbf24'}}>{tooltip.playedChord}</b>
                  {'  →  '}Expected: <b style={{color:'#34d399'}}>{tooltip.seg.chord}</b>
                </p>
              </>
            ) : (
              <p style={{ fontSize:11, color:'#34d399', fontWeight:600 }}>
                ✓ {tooltip.seg.chord} @ {tooltip.seg.start_time.toFixed(1)}s
              </p>
            )}
          </div>
        )}
      </div>

      {/* Time axis labels */}
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <span key={frac} style={{ fontSize:9, color:'rgba(255,255,255,.2)', fontFamily:"'DM Mono',monospace" }}>
            {(frac * totalDur).toFixed(0)}s
          </span>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CHORD & NOTE REVIEW CARD  (new detail card)
// ─────────────────────────────────────────────────────────────
const ChordNoteReviewCard = ({ compareData }) => {
  const cc  = compareData?.chord_comparison;
  const ref = compareData?.ref_chord_summary    || [];
  const ply = compareData?.player_chord_summary || [];
  const mis = (cc?.mismatches || []).filter(m => m.played !== '?');
  const notes = compareData?.player_note_summary || [];

  // Unique note pitch classes detected
  const uniqueNotes = [...new Set(notes.map(n => n.pitch_class).filter(Boolean))].sort();

  const pct = cc?.accuracy_pct ?? null;
  const color = accuracyColor(pct);

  return (
    <div className="card fade-up" style={{ padding:24 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8,
            background:'linear-gradient(135deg,rgba(167,139,250,.3),rgba(236,72,153,.3))',
            display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(167,139,250,.3)' }}>
            <svg width="16" height="16" fill="none" stroke="#a78bfa" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
            </svg>
          </div>
          <div>
            <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:'white', lineHeight:1 }}>Chord & Note Review</p>
            <p style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:2 }}>vs reference audio</p>
          </div>
        </div>
        {pct != null && (
          <Tag color={pct >= 80 ? 'green' : pct >= 55 ? 'amber' : 'red'}>
            {accuracyLabel(pct)}
          </Tag>
        )}
      </div>

      <Divider />

      {/* Accuracy rings row */}
      <div style={{ display:'flex', gap:20, justifyContent:'space-around', padding:'20px 0', flexWrap:'wrap' }}>
        <AccuracyRing
          pct={pct}
          size={88}
          label="Chord Accuracy"
          sublabel={cc ? `${cc.correct}/${cc.total} correct` : 'No data'}
        />
        <div style={{ display:'flex', flexDirection:'column', gap:6, justifyContent:'center' }}>
          {[
            { label:'Total Chords',   val: cc?.total   ?? '—', color:'rgba(255,255,255,.7)' },
            { label:'Correct',        val: cc?.correct ?? '—', color:'#34d399' },
            { label:'Mistakes',       val: mis.length,         color: mis.length > 0 ? '#f87171' : '#34d399' },
            { label:'Notes Detected', val: uniqueNotes.length, color:'#a78bfa' },
          ].map(({ label, val, color: c }) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', gap:32, alignItems:'center' }}>
              <span style={{ fontSize:12, color:'rgba(255,255,255,.35)' }}>{label}</span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:500, color: c }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      <Divider />

      {/* Mistake timeline */}
      <div style={{ marginTop:18, marginBottom:4 }}>
        <SectionLabel>Chord Timeline — hover for details</SectionLabel>
        <ChordMistakeTimeline
          refChordSummary={ref}
          playerChordSummary={ply}
          mismatches={mis}
        />
      </div>

      {/* Mismatch list */}
      {mis.length > 0 && (
        <div style={{ marginTop:16 }}>
          <SectionLabel>Specific Corrections</SectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {mis.slice(0, 6).map((m, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                borderRadius:10, background:'rgba(248,113,113,.07)', border:'1px solid rgba(248,113,113,.15)' }}>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(255,255,255,.25)', minWidth:32 }}>
                  {m.start_time.toFixed(1)}s
                </span>
                <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:'#f87171', minWidth:36 }}>{m.played}</span>
                <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,.2)" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
                <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:'#34d399', minWidth:36 }}>{m.expected}</span>
                <span style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginLeft:'auto' }}>should be</span>
              </div>
            ))}
            {mis.length > 6 && (
              <p style={{ fontSize:11, color:'rgba(255,255,255,.3)', textAlign:'center', paddingTop:4 }}>
                +{mis.length - 6} more mistakes
              </p>
            )}
          </div>
        </div>
      )}

      {/* Notes detected */}
      {uniqueNotes.length > 0 && (
        <div style={{ marginTop:16 }}>
          <SectionLabel>Notes Detected in Your Playing</SectionLabel>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {uniqueNotes.map(n => (
              <span key={n} style={{ padding:'4px 10px', borderRadius:100, fontSize:12, fontWeight:600,
                fontFamily:"'DM Mono',monospace", background:'rgba(167,139,250,.12)',
                border:'1px solid rgba(167,139,250,.25)', color:'#a78bfa' }}>
                {n}
              </span>
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
  const colMap = { 'on-time':'green', ahead:'blue', behind:'amber' };
  return (
    <div style={{ maxHeight:160, overflowY:'auto', borderRadius:12, border:'1px solid rgba(255,255,255,.08)' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead>
          <tr style={{ background:'rgba(255,255,255,.05)' }}>
            {['#','Onset','Beat','Offset','Status'].map(h => (
              <th key={h} style={{ padding:'6px 10px', textAlign:h==='#'||h==='Status'?'center':'right',
                fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:'.06em',
                color:'rgba(255,255,255,.3)', textTransform:'uppercase', fontWeight:400 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i) => (
            <tr key={i} style={{ borderTop:'1px solid rgba(255,255,255,.05)' }}>
              <td style={{ padding:'5px 10px', textAlign:'center', color:'rgba(255,255,255,.25)', fontFamily:"'DM Mono',monospace" }}>{i+1}</td>
              <td style={{ padding:'5px 10px', textAlign:'right', fontFamily:"'DM Mono',monospace", color:'rgba(255,255,255,.7)' }}>{r.player_onset.toFixed(3)}s</td>
              <td style={{ padding:'5px 10px', textAlign:'right', fontFamily:"'DM Mono',monospace", color:'rgba(255,255,255,.4)' }}>{r.nearest_beat.toFixed(3)}s</td>
              <td style={{ padding:'5px 10px', textAlign:'right', fontFamily:"'DM Mono',monospace",
                color: r.offset_ms > 0 ? '#fbbf24' : r.offset_ms < 0 ? '#60a5fa' : '#34d399', fontWeight:500 }}>
                {r.offset_ms > 0 ? '+' : ''}{r.offset_ms.toFixed(1)}ms
              </td>
              <td style={{ padding:'5px 10px', textAlign:'center' }}>
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
    <div style={{ position:'relative', height:24, borderRadius:12, background:'rgba(255,255,255,.06)', overflow:'hidden' }}>
      {beats.map((t,i)  => <div key={i} style={{ position:'absolute', top:0, bottom:0, width:1,  background:'rgba(236,72,153,.5)',  left:`${(t/max)*100}%` }} />)}
      {onsets.map((t,i) => <div key={i} style={{ position:'absolute', bottom:0, height:'65%', width:2, background:'rgba(34,211,238,.7)', left:`${(t/max)*100}%` }} />)}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// AI FEEDBACK PANEL  — now chord-aware
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
        average_offset_ms:  summary?.average_offset_ms   ?? 0,
        overall_status:     summary?.overall_status       ?? 'mostly on-time',
        tempo:              compareData?.tempo            ?? null,
        on_time_count:      summary?.counts?.on_time      ?? null,
        ahead_count:        summary?.counts?.ahead        ?? null,
        behind_count:       summary?.counts?.behind       ?? null,
        chord_summary:      compareData?.ref_chord_summary ?? null,
        // ── NEW chord correction fields ──
        chord_accuracy_pct: cc?.accuracy_pct              ?? null,
        chord_mismatches:   cc?.mismatches                ?? null,
        include_voice:      true,
      };
      const res = await api.aiFeedback(payload);
      setFeedback(res.feedback);
      setAudioUrl(res.audio_url || null);
      if (res.audio_url) {
        setTimeout(() => { audioRef.current?.play().catch(() => {}); }, 100);
      }
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
      onAutoHandled && onAutoHandled();
    }
  }, [compareData, onAutoHandled]);

  useEffect(() => {
    if (autoTrigger && compareData) generate();
  }, [autoTrigger]);

  return (
    <div className="card card-ai fade-up" style={{ padding:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#0891b2,#0e7490)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
          <div>
            <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:'white', lineHeight:1 }}>AI Coach</p>
            <p style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginTop:2 }}>Gemini + ElevenLabs</p>
          </div>
        </div>
        <Tag color="cyan">Auto</Tag>
      </div>

      <Divider />

      <div style={{ marginTop:16 }}>
        {feedback ? (
          <div style={{ animation:'fadeUp .4s ease both' }}>
            <div style={{ background:'rgba(6,182,212,.08)', border:'1px solid rgba(6,182,212,.2)',
              borderRadius:16, padding:'16px 20px', marginBottom:12 }}>
              <div style={{ display:'flex', gap:10 }}>
                <Cat size={36} float={false} />
                <p style={{ fontSize:15, lineHeight:1.65, color:'rgba(255,255,255,.85)', fontWeight:300 }}>{feedback}</p>
              </div>
            </div>

            {audioUrl && <audio ref={audioRef} src={audioUrl} style={{ display:'none' }} />}

            {compareData?.summary && (
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:12 }}>
                {[
                  { label:'Avg Offset', val:`${compareData.summary.average_offset_ms > 0 ? '+' : ''}${compareData.summary.average_offset_ms.toFixed(1)}ms` },
                  { label:'On-Time',    val: compareData.summary.counts?.on_time ?? '—' },
                  { label:'Early',      val: compareData.summary.counts?.ahead   ?? '—' },
                  { label:'Late',       val: compareData.summary.counts?.behind  ?? '—' },
                  ...(compareData.chord_comparison?.accuracy_pct != null
                    ? [{ label:'Chords', val:`${Math.round(compareData.chord_comparison.accuracy_pct)}%` }]
                    : []),
                ].map(({ label, val }) => (
                  <div key={label} style={{ flex:1, minWidth:55, background:'rgba(255,255,255,.05)',
                    borderRadius:10, padding:'8px 10px', textAlign:'center' }}>
                    <p style={{ fontFamily:"'DM Mono',monospace", fontSize:15, fontWeight:500, color:'white', lineHeight:1 }}>{val}</p>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,.35)', marginTop:4, textTransform:'uppercase', letterSpacing:'.05em' }}>{label}</p>
                  </div>
                ))}
              </div>
            )}

            <button className="btn-ghost" onClick={generate} disabled={loading}
              style={{ width:'100%', justifyContent:'center', fontSize:12 }}>
              {loading ? <><Spinner size={12}/> Regenerating…</> : 'Regenerate feedback'}
            </button>
          </div>
        ) : (
          <div style={{ textAlign:'center', padding:'24px 0' }}>
            {loading ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                <Spinner size={28} />
                <p style={{ fontSize:13, color:'rgba(255,255,255,.4)' }}>Gemini is analysing your performance…</p>
              </div>
            ) : (
              <>
                <Cat size={56} float={false} />
                <p style={{ marginTop:12, fontSize:14, color:'rgba(255,255,255,.5)', lineHeight:1.6 }}>
                  Press play and perform. AI voice feedback will generate automatically when you pause or finish.
                </p>
                {error && <p style={{ marginTop:8, fontSize:12, color:'#f87171' }}>{error}</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// LANDING
// ─────────────────────────────────────────────────────────────
const Landing = ({ onStart }) => (
  <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', padding:'40px 24px', position:'relative', overflow:'hidden' }}>
    {[['#ec4899','20%','10%',400],['#8b5cf6','70%','60%',500],['#06b6d4','10%','70%',350]].map(([c,l,t,s],i)=>(
      <div key={i} style={{ position:'absolute', left:l, top:t, width:s, height:s, borderRadius:'50%',
        background:c, opacity:.07, filter:'blur(80px)', pointerEvents:'none',
        animation:`floatY ${3+i}s ease-in-out infinite`, animationDelay:`${i*1.2}s` }} />
    ))}
    <Cat size={100} float />
    <div style={{ textAlign:'center', zIndex:1, maxWidth:560, marginTop:24 }}>
      <p style={{ fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:'.16em', textTransform:'uppercase', color:'rgba(255,255,255,.3)', marginBottom:16 }}>
        AI-Powered Music Practice
      </p>
      <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'clamp(3rem,8vw,6rem)',
        lineHeight:1, letterSpacing:'-.03em', marginBottom:20,
        background:'linear-gradient(135deg,#f472b6 0%,#a78bfa 40%,#22d3ee 100%)',
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
        PitchPurrfect
      </h1>
      <p style={{ fontSize:18, color:'rgba(255,255,255,.5)', fontWeight:300, lineHeight:1.7, marginBottom:40 }}>
        Pick a track, choose your instrument, play along — get instant AI voice coaching.
      </p>
      <button className="btn-primary" onClick={onStart} style={{ fontSize:16, padding:'14px 36px' }}>
        Start Practicing
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
        </svg>
      </button>
    </div>
    <div style={{ position:'absolute', bottom:32, display:'flex', gap:32 }}>
      {[['#ec4899','Auto Recording'],['#a78bfa','Gemini AI Coaching'],['#22d3ee','ElevenLabs Voice']].map(([c,l])=>(
        <div key={l} style={{ display:'flex', alignItems:'center', gap:8, color:'rgba(255,255,255,.3)', fontSize:13 }}>
          <Dot color={c}/> {l}
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// SONG SELECT
// ─────────────────────────────────────────────────────────────
const SongSelect = ({ onSelect, onBack }) => {
  const [songs,   setSongs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    api.songs().then(d => { setSongs(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  return (
    <div style={{ minHeight:'100vh', padding:'32px 24px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'fixed', inset:0, background:'radial-gradient(ellipse at 20% 20%,rgba(236,72,153,.07) 0%,transparent 60%),radial-gradient(ellipse at 80% 80%,rgba(139,92,246,.07) 0%,transparent 60%)', pointerEvents:'none' }} />
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:48 }}>
          <button className="btn-ghost" onClick={onBack}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <Cat size={32} float={false}/>
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18,
              background:'linear-gradient(135deg,#f472b6,#a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>PitchPurrfect</span>
          </div>
          <div style={{ width:80 }}/>
        </div>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'clamp(2rem,4vw,3rem)', letterSpacing:'-.02em', color:'white', marginBottom:10 }}>Choose a Track</h2>
          <p style={{ color:'rgba(255,255,255,.35)', fontSize:15 }}>Select a song to begin your practice session</p>
        </div>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:80 }}><Spinner size={36}/></div>
        ) : error ? (
          <div style={{ textAlign:'center', padding:80, color:'#f87171' }}>
            <p style={{ fontSize:16, marginBottom:8 }}>Failed to load songs</p>
            <p style={{ fontSize:13, opacity:.6 }}>{error}</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:20 }}>
            {songs.map(song => (
              <div key={song.id} onClick={() => onSelect(song)} className="card"
                style={{ cursor:'pointer', overflow:'hidden', transition:'all .25s' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.borderColor='rgba(139,92,246,.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.borderColor='rgba(255,255,255,.08)'; }}>
                <div style={{ aspectRatio:'1', background:'linear-gradient(135deg,#1a0a2e,#0a1a2e)', position:'relative', overflow:'hidden' }}>
                  {song.coverUrl
                    ? <img src={song.coverUrl} alt={song.title} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <svg width="48" height="48" fill="rgba(255,255,255,.15)" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
                      </div>
                  }
                  <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'.2s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity=1}
                    onMouseLeave={e => e.currentTarget.style.opacity=0}>
                    <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(255,255,255,.9)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg width="20" height="20" fill="#ec4899" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                </div>
                <div style={{ padding:'16px 18px' }}>
                  <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:'white', marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{song.title}</p>
                  <p style={{ fontSize:13, color:'rgba(255,255,255,.4)' }}>{song.artist}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PRACTICE PAGE
// ─────────────────────────────────────────────────────────────
const INSTRUMENTS = [
  { k:'guitar', i:'🎸', l:'Guitar' },
  { k:'piano',  i:'🎹', l:'Piano'  },
  { k:'drums',  i:'🥁', l:'Drums'  },
  { k:'bass',   i:'🎸', l:'Bass'   },
  { k:'vocals', i:'🎤', l:'Vocals' },
];

const STEM_META = {
  drums:  { i:'🥁', c:'#ec4899' },
  bass:   { i:'🎸', c:'#a78bfa' },
  vocals: { i:'🎤', c:'#22d3ee' },
  other:  { i:'🎹', c:'#34d399' },
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
          if (p >= 99.5) {
            setIsPlaying(false);
            setProgress(0);
            stopAndCompare(null);
          }
        }
      }, 200);
    } else {
      Object.values(aRefs.current).forEach(a => { try { a.pause(); } catch(_) {} });
    }
    return () => clearInterval(progRef.current);
  }, [isPlaying]);

  const stopAndCompare = useCallback((trimSeconds) => {
    if (mrRef.current && mrRef.current.state !== 'inactive') {
      mrRef.current.stop();
    }
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
      const refStemKey = Object.keys(stemsRef.current).find(k => k !== currentInstrument)
        || Object.keys(stemsRef.current)[0];
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
    } catch(e) {
      console.error('Comparison failed:', e);
    } finally {
      setAnalysing(false);
    }
  }, []);

  const seek = (pct) => {
    setProgress(pct);
    Object.values(aRefs.current).forEach(a => { if (a.duration > 0) a.currentTime = (pct / 100) * a.duration; });
  };

  const fmtT = (pct) => {
    const l = Object.values(aRefs.current).find(a => a?.duration > 0);
    const s = Math.floor((pct / 100) * (l?.duration || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const fmtD = () => {
    const l = Object.values(aRefs.current).find(a => a?.duration > 0);
    if (!l) return '--:--';
    const s = Math.floor(l.duration);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
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
    <div style={{ minHeight:'100vh', padding:'28px 20px', position:'relative' }}>
      <div style={{ position:'fixed', inset:0, background:'radial-gradient(ellipse at 80% 10%,rgba(236,72,153,.06) 0%,transparent 50%),radial-gradient(ellipse at 20% 90%,rgba(139,92,246,.06) 0%,transparent 50%)', pointerEvents:'none' }} />

      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        {/* Nav */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
          <button className="btn-ghost" onClick={onBack}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            Songs
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Cat size={28} float={false}/>
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16,
              background:'linear-gradient(135deg,#f472b6,#a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              PitchPurrfect
            </span>
          </div>
          <button className="btn-primary" onClick={onEnd}
            style={{ fontSize:13, padding:'9px 20px', background:'linear-gradient(135deg,#f43f5e,#ec4899)' }}>
            Exit
          </button>
        </div>

        {audioError && (
          <div style={{ marginBottom:16, padding:'12px 16px', borderRadius:12, background:'rgba(248,113,113,.1)',
            border:'1px solid rgba(248,113,113,.25)', color:'#f87171', fontSize:13 }}>⚠️ {audioError}</div>
        )}

        {analysing && (
          <div style={{ marginBottom:16, padding:'12px 16px', borderRadius:12, background:'rgba(139,92,246,.1)',
            border:'1px solid rgba(139,92,246,.25)', color:'#a78bfa', fontSize:13, display:'flex', alignItems:'center', gap:10 }}>
            <Spinner size={14}/> Analysing chords, pitch & timing — AI voice feedback incoming…
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 340px', gap:16, alignItems:'start' }}>

          {/* ── Left: player + stems + results ── */}
          <div style={{ gridColumn:'1/3', display:'flex', flexDirection:'column', gap:16 }}>

            {/* Player */}
            <div className="card" style={{ padding:24 }}>
              <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>
                <div style={{ width:100, height:100, borderRadius:14, overflow:'hidden', flexShrink:0, background:'linear-gradient(135deg,#1a0a2e,#0a1a2e)' }}>
                  {song.coverUrl
                    ? <img src={song.coverUrl} alt={song.title} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <svg width="32" height="32" fill="rgba(255,255,255,.2)" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
                      </div>
                  }
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, color:'white', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{song.title}</h2>
                  <p style={{ color:'rgba(255,255,255,.4)', marginBottom:16 }}>{song.artist}</p>

                  <div style={{ marginBottom:8, cursor:'pointer' }} onClick={e => {
                    const r = e.currentTarget.getBoundingClientRect();
                    seek(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)));
                  }}>
                    <ProgressBar pct={progress}/>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'rgba(255,255,255,.3)', fontFamily:"'DM Mono',monospace", marginBottom:16 }}>
                    <span>{fmtT(progress)}</span>
                    <span>{!stemsLoaded ? 'loading…' : fmtD()}</span>
                  </div>

                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <button onClick={() => seek(Math.max(0, progress - 10))}
                      style={{ width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,.07)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,.6)' }}>
                      <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>
                    </button>

                    <button onClick={handlePlayPause} disabled={!stemsLoaded}
                      style={{ width:52,height:52,borderRadius:'50%',border:'none',cursor:'pointer',
                        background:'linear-gradient(135deg,#ec4899,#a78bfa)',display:'flex',alignItems:'center',
                        justifyContent:'center',boxShadow:'0 0 24px rgba(236,72,153,.35)',transition:'.2s',
                        opacity:stemsLoaded?1:.4 }}>
                      {isPlaying
                        ? <svg width="22" height="22" fill="white" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        : <svg width="22" height="22" fill="white" viewBox="0 0 24 24" style={{ marginLeft:3 }}><path d="M8 5v14l11-7z"/></svg>
                      }
                    </button>

                    <button onClick={() => seek(Math.min(100, progress + 10))}
                      style={{ width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,.07)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,.6)' }}>
                      <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
                    </button>

                    <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
                      <Dot color={recording ? '#f87171' : micReady ? '#34d399' : '#fbbf24'} pulse={recording}/>
                      <span style={{ fontSize:11, color:'rgba(255,255,255,.3)', fontFamily:"'DM Mono',monospace" }}>
                        {recording ? 'REC' : micReady ? 'MIC READY' : 'NO MIC'}
                      </span>
                    </div>

                    {!stemsLoaded && <span style={{ fontSize:12, color:'rgba(255,255,255,.3)' }}>Loading…</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Stems */}
            <div className="card" style={{ padding:20 }}>
              <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:'white', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                <svg width="16" height="16" fill="none" stroke="#ec4899" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                </svg>
                Stem Mixer
              </p>
              {Object.keys(stems).length === 0 && stemsLoaded ? (
                <p style={{ color:'rgba(255,255,255,.3)', fontSize:13 }}>No stems found.</p>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:12 }}>
                  {Object.keys(stems).map(k => {
                    const m = STEM_META[k] || { i:'🎵', c:'#a78bfa' };
                    const isMuted = k === instrument;
                    return (
                      <div key={k}>
                        <button onClick={() => !isMuted && toggleStem(k)}
                          style={{ width:'100%', padding:'12px 8px', borderRadius:14,
                            border:`1px solid ${isMuted ? 'rgba(248,113,113,.3)' : stems[k]?.active ? (m.c+'44') : 'rgba(255,255,255,.07)'}`,
                            background: isMuted ? 'rgba(248,113,113,.08)' : stems[k]?.active ? `${m.c}18` : 'rgba(255,255,255,.03)',
                            cursor: isMuted ? 'default' : 'pointer', textAlign:'center', transition:'.2s',
                            opacity: isMuted ? 0.45 : stems[k]?.active ? 1 : 0.35 }}>
                          <div style={{ fontSize:22, marginBottom:6 }}>{m.i}</div>
                          <div style={{ fontSize:12, fontWeight:600, color: isMuted ? '#f87171' : stems[k]?.active ? 'white' : 'rgba(255,255,255,.4)' }}>
                            {k.charAt(0).toUpperCase()+k.slice(1)}
                            {isMuted && <div style={{ fontSize:9, marginTop:2, color:'#f87171' }}>YOU PLAY</div>}
                          </div>
                        </button>
                        <input type="range" min="0" max="100" value={stems[k]?.volume ?? 80}
                          onChange={e => setStems(p => ({ ...p, [k]: { ...p[k], volume: +e.target.value } }))}
                          disabled={isMuted}
                          style={{ width:'100%', marginTop:8, opacity: isMuted ? .3 : 1 }}/>
                        <p style={{ textAlign:'center', fontSize:10, color:'rgba(255,255,255,.25)', fontFamily:"'DM Mono',monospace" }}>{stems[k]?.volume ?? 80}%</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Performance Analysis (with chord accuracy bar) ── */}
            {compareData && (
              <div className="card" style={{ padding:20 }}>
                <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:'white', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                  <svg width="16" height="16" fill="none" stroke="#a78bfa" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                  </svg>
                  Performance Analysis
                </p>

                {/* Top row: timing stats */}
                <div style={{ display:'flex', gap:16, flexWrap:'wrap', alignItems:'center', marginBottom:14 }}>
                  {[
                    { v: compareData.tempo?.toFixed(1), l:'BPM' },
                    { v: (compareData.summary?.average_offset_ms >= 0 ? '+' : '') + compareData.summary?.average_offset_ms?.toFixed(1) + 'ms', l:'Avg Offset' },
                  ].map(({v,l}) => (
                    <div key={l} style={{ textAlign:'center' }}>
                      <p style={{ fontFamily:"'DM Mono',monospace", fontSize:16, fontWeight:500, color:'white', lineHeight:1 }}>{v}</p>
                      <p style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:3, textTransform:'uppercase', letterSpacing:'.06em' }}>{l}</p>
                    </div>
                  ))}
                  <div style={{ textAlign:'center' }}>
                    <p style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:'white', lineHeight:1 }}>{compareData.summary?.overall_status}</p>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:3, textTransform:'uppercase', letterSpacing:'.06em' }}>Overall</p>
                  </div>
                  <div style={{ display:'flex', gap:14, marginLeft:'auto' }}>
                    {[{v:compareData.summary?.counts?.on_time,l:'on-time',c:'#34d399'},{v:compareData.summary?.counts?.ahead,l:'early',c:'#60a5fa'},{v:compareData.summary?.counts?.behind,l:'late',c:'#fbbf24'}].map(({v,l,c})=>(
                      <div key={l} style={{ textAlign:'center' }}>
                        <p style={{ fontFamily:"'DM Mono',monospace", fontSize:20, fontWeight:500, color:c, lineHeight:1 }}>{v??0}</p>
                        <p style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:3 }}>{l}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chord accuracy bar — only if data exists */}
                {chordPct != null && (
                  <div style={{ marginBottom:14 }}>
                    <ChordAccuracyBar pct={chordPct} />
                  </div>
                )}

                {Array.isArray(compareData.comparison) && <TimingTable rows={compareData.comparison}/>}
                {compareData.beat_times?.length > 0 && (
                  <div style={{ marginTop:12 }}>
                    <BeatTimeline beats={compareData.beat_times} onsets={compareData.player_onsets || []}/>
                  </div>
                )}
              </div>
            )}

            {/* ── Chord & Note Review card (detail) ── */}
            {compareData && (
              <ChordNoteReviewCard compareData={compareData} />
            )}
          </div>

          {/* ── Right col ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            <AIFeedbackPanel
              compareData={compareData}
              autoTrigger={autoTrigger}
              onAutoHandled={() => setAutoTrigger(false)}
            />

            {/* Instrument selector */}
            <div className="card" style={{ padding:18 }}>
              <SectionLabel>Your Instrument</SectionLabel>
              <p style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginBottom:10, lineHeight:1.5 }}>
                This stem will be muted so you can play along.
              </p>
              <select
                value={instrument}
                onChange={e => { if (!recording) setInstrument(e.target.value); }}
                disabled={recording}
                style={{ width:'100%', padding:'10px 14px', borderRadius:12,
                  border:'1px solid rgba(139,92,246,.4)', background:'rgba(139,92,246,.1)',
                  color:'white', fontSize:14, fontFamily:"'DM Sans',sans-serif",
                  cursor: recording ? 'not-allowed' : 'pointer', outline:'none',
                  opacity: recording ? .5 : 1 }}>
                {INSTRUMENTS.map(({ k, i, l }) => (
                  <option key={k} value={k}>{i} {l}</option>
                ))}
              </select>
            </div>

            {!micReady && (
              <div className="card" style={{ padding:14, borderColor:'rgba(251,191,36,.25)', background:'rgba(251,191,36,.05)' }}>
                <p style={{ fontSize:12, color:'#fbbf24', lineHeight:1.6 }}>
                  ⚠️ Microphone access required. Please allow mic access and reload the page.
                </p>
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