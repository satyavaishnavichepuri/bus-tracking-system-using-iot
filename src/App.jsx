import { useState, useEffect, useRef, useCallback } from "react";

// ── Inject Leaflet ───────────────────────────────────
const leafletCss = document.createElement("link");
leafletCss.rel = "stylesheet";
leafletCss.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
document.head.appendChild(leafletCss);
const leafletScript = document.createElement("script");
leafletScript.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
document.head.appendChild(leafletScript);

// ── Global Styles ────────────────────────────────────
const gStyle = document.createElement("style");
gStyle.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  :root {
    --bg:#080c14; --surface:#0d1420; --surface2:#111926;
    --border:rgba(255,255,255,0.07); --accent:#00e5ff; --accent2:#7b61ff;
    --gold:#ffc94a; --green:#00e676; --red:#ff4444; --orange:#ff7043;
    --text:#e8edf5; --muted:#6b7a96; --card:rgba(255,255,255,0.04);
  }
  *{margin:0;padding:0;box-sizing:border-box;}
  body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;overflow-x:hidden;}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px;}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}
  @keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes busFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
  @keyframes ringAlarm{0%,100%{transform:scale(1)}10%,30%,50%,70%,90%{transform:scale(1.04) rotate(-2deg)}20%,40%,60%,80%{transform:scale(1.04) rotate(2deg)}}
  @keyframes urgentPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,68,68,0.5)}70%{box-shadow:0 0 0 16px rgba(255,68,68,0)}}
  @keyframes countdownBlink{0%,100%{opacity:1}50%{opacity:0.35}}
  @keyframes trailPulse{0%{transform:scale(1);opacity:.5}100%{transform:scale(2.8);opacity:0}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes slideInRight{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}
  .live-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 1.5s infinite;display:inline-block;}
  .leaflet-container{background:#0a1220!important;}
  .leaflet-tile{filter:brightness(0.35) saturate(0.25) hue-rotate(190deg)!important;}
  .leaflet-control-attribution{display:none!important;}
  .leaflet-control-zoom a{background:var(--surface)!important;color:var(--text)!important;border-color:var(--border)!important;}
  .leaflet-popup-content-wrapper{background:#0d1420!important;color:#e8edf5!important;border:1px solid rgba(255,255,255,0.08)!important;border-radius:12px!important;box-shadow:0 20px 40px rgba(0,0,0,0.6)!important;}
  .leaflet-popup-tip{background:#0d1420!important;}
  .leaflet-popup-content{font-family:'DM Sans',sans-serif!important;font-size:13px!important;margin:10px 14px!important;}
`;
document.head.appendChild(gStyle);

// ── Constants ────────────────────────────────────────
const VCE_COORDS = [17.3386, 78.5372];
const WALK_SPEED_KMH = 4.5;

// ── Bus Data ─────────────────────────────────────────
const BUS_DATA = [
  {
    num:"1", name:"Mehdipatnam Express", status:"online", capacity:72, driver:"Raju Kumar", speed:38,
    route:"Mehdipatnam → Tolichowki → Film Nagar → VCE", assignedBranch:["732"],
    stops:[
      {name:"Mehdipatnam X Rd",     coords:[17.3999,78.4380], time:"7:15 AM"},
      {name:"Tolichowki",           coords:[17.3820,78.4510], time:"7:22 AM"},
      {name:"Film Nagar",           coords:[17.4131,78.4502], time:"7:30 AM"},
      {name:"Jubilee Hills CkPost", coords:[17.4199,78.4520], time:"7:38 AM"},
      {name:"Road No.36",           coords:[17.3950,78.4690], time:"7:45 AM"},
      {name:"VCE Main Gate",        coords:VCE_COORDS,        time:"8:00 AM"},
    ]
  },
  {
    num:"1A", name:"Dilsukhnagar Link", status:"online", capacity:58, driver:"Venkat Rao", speed:42,
    route:"Dilsukhnagar → LB Nagar → Attapur → VCE", assignedBranch:["733"],
    stops:[
      {name:"Dilsukhnagar",        coords:[17.3692,78.5264], time:"7:10 AM"},
      {name:"Moosarambagh",        coords:[17.3493,78.5492], time:"7:18 AM"},
      {name:"LB Nagar",            coords:[17.3647,78.5470], time:"7:26 AM"},
      {name:"Attapur",             coords:[17.3612,78.5268], time:"7:34 AM"},
      {name:"Rajendra Nagar",      coords:[17.3586,78.5070], time:"7:44 AM"},
      {name:"VCE Main Gate",       coords:VCE_COORDS,        time:"8:00 AM"},
    ]
  },
  {
    num:"2", name:"Secunderabad Shuttle", status:"delayed", capacity:85, driver:"Prasad M", speed:22,
    route:"Secunderabad → Begumpet → Punjagutta → VCE", assignedBranch:["734"],
    stops:[
      {name:"Secunderabad Stn",    coords:[17.4399,78.4983], time:"7:05 AM"},
      {name:"Begumpet",            coords:[17.4343,78.4678], time:"7:15 AM"},
      {name:"Punjagutta",          coords:[17.4260,78.4560], time:"7:25 AM"},
      {name:"Somajiguda",          coords:[17.4180,78.4550], time:"7:33 AM"},
      {name:"Khairatabad",         coords:[17.4110,78.4640], time:"7:42 AM"},
      {name:"VCE Main Gate",       coords:VCE_COORDS,        time:"8:00 AM"},
    ]
  },
  {
    num:"7", name:"Rythu Bazar VSPR", status:"online", capacity:78, driver:"Srinivas R", speed:40,
    route:"Rythu Bazar → Huda Park → BN Reddy → VCE", assignedBranch:["735"],
    stops:[
      {name:"Rythu Bazar (VSPR)",  coords:[17.3620,78.5580], time:"7:20 AM"},
      {name:"Huda Park (VSPR)",    coords:[17.3595,78.5561], time:"7:25 AM"},
      {name:"Shiva Sindhu",        coords:[17.3572,78.5540], time:"7:30 AM"},
      {name:"BN Reddy",            coords:[17.3545,78.5510], time:"7:36 AM"},
      {name:"TKR Kaman",           coords:[17.3500,78.5475], time:"7:42 AM"},
      {name:"Gayatri Nagar",       coords:[17.3468,78.5445], time:"7:47 AM"},
      {name:"Owaisi Hospital",     coords:[17.3430,78.5410], time:"7:52 AM"},
      {name:"VCE Main Gate",       coords:VCE_COORDS,        time:"8:00 AM"},
    ]
  },
  {
    num:"9", name:"Nagole Express", status:"online", capacity:69, driver:"Harish N", speed:48,
    route:"Gachibowli → Kondapur → Madhapur → VCE", assignedBranch:["736"],
    stops:[
      {name:"Gachibowli IT Park",  coords:[17.4401,78.3489], time:"7:00 AM"},
      {name:"Kondapur",            coords:[17.4602,78.3742], time:"7:12 AM"},
      {name:"Madhapur",            coords:[17.4486,78.3944], time:"7:22 AM"},
      {name:"Jubilee Hills",       coords:[17.4332,78.4073], time:"7:33 AM"},
      {name:"Banjara Hills",       coords:[17.4060,78.4390], time:"7:45 AM"},
      {name:"VCE Main Gate",       coords:VCE_COORDS,        time:"8:00 AM"},
    ]
  },
  {
    num:"12", name:"LB Nagar Local", status:"online", capacity:90, driver:"Prakash Y", speed:52,
    route:"LB Nagar → Saroor Nagar → Santosh Nagar → VCE", assignedBranch:["737"],
    stops:[
      {name:"LB Nagar",            coords:[17.3493,78.5492], time:"7:15 AM"},
      {name:"Saroor Nagar",        coords:[17.3330,78.5342], time:"7:22 AM"},
      {name:"Santosh Nagar",       coords:[17.3428,78.5203], time:"7:30 AM"},
      {name:"Kothapet",            coords:[17.3516,78.5113], time:"7:37 AM"},
      {name:"Malakpet X Rd",       coords:[17.3600,78.5050], time:"7:46 AM"},
      {name:"VCE Main Gate",       coords:VCE_COORDS,        time:"8:00 AM"},
    ]
  },
];

// ── Helpers ──────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, dL = (lat2-lat1)*Math.PI/180, dN = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dL/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dN/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
const walkMins = distKm => Math.ceil((distKm / WALK_SPEED_KMH) * 60);

function getBusFromRoll(roll) {
  const branch = roll.split("-")[2];
  return BUS_DATA.find(b => b.assignedBranch.includes(branch)) || BUS_DATA[0];
}

function getNearestStop(bus, lat, lng) {
  let min = Infinity, stop = null, idx = 0;
  bus.stops.forEach((s, i) => {
    const d = haversineKm(lat, lng, s.coords[0], s.coords[1]);
    if (d < min) { min = d; stop = s; idx = i; }
  });
  return { stop, idx, distKm: min };
}

function getBusPositionAtT(bus, t) {
  const stops = bus.stops, total = stops.length - 1;
  const seg = Math.min(Math.floor(t * total), total - 1);
  const sT = (t * total) - seg;
  return [
    stops[seg].coords[0] + (stops[seg+1].coords[0] - stops[seg].coords[0]) * sT,
    stops[seg].coords[1] + (stops[seg+1].coords[1] - stops[seg].coords[1]) * sT,
  ];
}

function getAlternates(missed, sLat, sLng) {
  return BUS_DATA
    .filter(b => b.num !== missed.num && b.status !== "offline")
    .map(bus => {
      const { stop, distKm, idx } = getNearestStop(bus, sLat, sLng);
      const wm = walkMins(distKm);
      const busEta = Math.floor(Math.random() * 8) + 4;
      return { bus, stop, distKm, walkMins: wm, busEta, canCatch: wm <= busEta + 3, idx };
    })
    .filter(a => a.walkMins <= 20 && a.idx < a.bus.stops.length - 1)
    .sort((a, b) => a.walkMins - b.walkMins)
    .slice(0, 3);
}

// ── Alarm Sound ──────────────────────────────────────
function playAlarm() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[0,.3],[.2,.25],[.4,.3],[.7,.25],[.9,.3],[1.1,.25]].forEach(([t,v]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = t % 0.4 < 0.1 ? 880 : 660; o.type = "square";
      g.gain.setValueAtTime(v, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + t + .15);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + .15);
    });
  } catch(e) {}
}

// ══════════════════════════════════════════════════════
// PARTICLES
// ══════════════════════════════════════════════════════
function Particles() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current, ctx = c.getContext("2d"); let raf;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const pts = Array.from({length:45},()=>({x:Math.random()*c.width,y:Math.random()*c.height,vx:(Math.random()-.5)*.22,vy:(Math.random()-.5)*.22,r:Math.random()*1.5+.3,a:Math.random()*.18+.03}));
    const draw = () => {
      ctx.clearRect(0,0,c.width,c.height);
      pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(0,229,255,${p.a})`;ctx.fill();p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>c.width)p.vx*=-1;if(p.y<0||p.y>c.height)p.vy*=-1;});
      for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<100){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.strokeStyle=`rgba(0,229,255,${.04*(1-d/100)})`;ctx.stroke();}}
      raf=requestAnimationFrame(draw);
    };
    draw();
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}/>;
}

// ══════════════════════════════════════════════════════
// ONBOARDING
// ══════════════════════════════════════════════════════
function Onboarding({ onLogin }) {
  const [college, setCollege] = useState("");
  const [roll, setRoll] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = () => {
    if (college !== "vasavi") { setError("Access restricted to Vasavi College of Engineering only."); return; }
    if (!/^1602-(\d{2})-(73[2-7])-(\d{1,3})$/.test(roll)) { setError("Invalid roll. Use: 1602-YY-BRANCH(732–737)-ROLLNO"); return; }
    if (parseInt(roll.split("-")[3]) > 320) { setError("Roll number must be 0–320."); return; }
    setError(""); setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(roll); }, 1100);
  };

  const inp = {width:"100%",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 16px",color:"var(--text)",fontFamily:"DM Sans,sans-serif",fontSize:15,outline:"none"};

  return (
    <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"radial-gradient(ellipse at 30% 20%,rgba(0,229,255,.08),transparent 60%),radial-gradient(ellipse at 70% 80%,rgba(123,97,255,.08),transparent 60%),var(--bg)"}}>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:24,padding:"48px 44px",width:"min(480px,92vw)",boxShadow:"0 32px 80px rgba(0,0,0,.6)",position:"relative",overflow:"hidden",animation:"slideUp .4s ease"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,var(--accent2),var(--accent),var(--gold))"}}/>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:32}}>
          <div style={{width:48,height:48,background:"linear-gradient(135deg,var(--accent2),var(--accent))",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🚌</div>
          <div style={{fontFamily:"Syne,sans-serif"}}>
            <strong style={{display:"block",fontSize:20,fontWeight:800,letterSpacing:"-.5px"}}>VCE BusTrack</strong>
            <span style={{fontSize:12,color:"var(--muted)",letterSpacing:2,textTransform:"uppercase"}}>Personal Transit Assistant</span>
          </div>
        </div>
        <h2 style={{fontFamily:"Syne,sans-serif",fontSize:26,fontWeight:800,marginBottom:8}}>Your Bus. Your Time. 🎯</h2>
        <p style={{color:"var(--muted)",fontSize:14,marginBottom:32,lineHeight:1.6}}>Sign in and we'll auto-assign your route, track your location, and alarm you exactly when to leave.</p>

        <div style={{marginBottom:18}}>
          <label style={{display:"block",fontSize:12,letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--muted)",marginBottom:8,fontWeight:500}}>College</label>
          <select value={college} onChange={e=>setCollege(e.target.value)} style={{...inp,WebkitAppearance:"none",color:college?"var(--text)":"var(--muted)"}}>
            <option value="">Select your college</option>
            <option value="vasavi">Vasavi College of Engineering</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div style={{marginBottom:8}}>
          <label style={{display:"block",fontSize:12,letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--muted)",marginBottom:8,fontWeight:500}}>Roll Number</label>
          <input value={roll} onChange={e=>setRoll(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder="e.g. 1602-21-735-042" style={inp}/>
          <div style={{fontSize:11,color:"var(--muted)",marginTop:6,opacity:.7}}>Branch → Bus: 732→B1 · 733→B1A · 734→B2 · 735→B7 · 736→B9 · 737→B12</div>
        </div>

        <button onClick={login} disabled={loading} style={{width:"100%",padding:15,background:loading?"rgba(255,255,255,.06)":"linear-gradient(135deg,var(--accent2),var(--accent))",border:"none",borderRadius:12,color:"#fff",fontFamily:"Syne,sans-serif",fontSize:15,fontWeight:700,cursor:loading?"default":"pointer",letterSpacing:".5px",marginTop:20,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          {loading ? <><span style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 1s linear infinite",display:"inline-block"}}/> Locating your bus...</> : "Access My Dashboard →"}
        </button>
        {error && <div style={{color:"var(--red)",fontSize:13,marginTop:12,lineHeight:1.5}}>⚠️ {error}</div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// COUNTDOWN RING
// ══════════════════════════════════════════════════════
function CountdownRing({ minutes, label, color, max=30, size=110 }) {
  const r=44, circ=2*Math.PI*r;
  const pct = Math.min(1, Math.max(0, minutes/max));
  const dash = circ * (1-pct);
  const urgent = minutes <= 5 && minutes >= 0;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
      <div style={{position:"relative",width:size,height:size}}>
        <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={7}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
            strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
            style={{transition:"stroke-dashoffset .6s ease",filter:`drop-shadow(0 0 5px ${color}90)`}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontFamily:"Syne,sans-serif",fontSize:22,fontWeight:800,color,lineHeight:1,animation:urgent?"countdownBlink 1s infinite":undefined}}>{Math.max(0,minutes)}</span>
          <span style={{fontSize:9,color:"var(--muted)",letterSpacing:1,marginTop:2}}>MIN</span>
        </div>
      </div>
      <div style={{fontSize:10,color:"var(--muted)",letterSpacing:"1px",textTransform:"uppercase",textAlign:"center",maxWidth:80}}>{label}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// ALARM MODAL
// ══════════════════════════════════════════════════════
function AlarmModal({ bus, stop, leaveIn, onDismiss }) {
  const [snoozed, setSnoozed] = useState(false);
  useEffect(() => { playAlarm(); }, []);
  return (
    <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.92)",backdropFilter:"blur(16px)"}}>
      <div style={{background:"var(--surface)",border:"2px solid var(--red)",borderRadius:24,padding:"40px 36px",width:"min(400px,92vw)",textAlign:"center",animation:"ringAlarm .6s ease",boxShadow:"0 0 60px rgba(255,68,68,.35), 0 32px 80px rgba(0,0,0,.8)"}}>
        <div style={{fontSize:58,marginBottom:12,animation:"busFloat 1s ease-in-out infinite"}}>⏰</div>
        <h2 style={{fontFamily:"Syne,sans-serif",fontSize:26,fontWeight:800,color:"var(--red)",marginBottom:10,animation:"urgentPulse 2s infinite",borderRadius:8}}>TIME TO LEAVE!</h2>
        <p style={{color:"var(--muted)",fontSize:14,lineHeight:1.7,marginBottom:20}}>
          Bus <strong style={{color:"var(--accent)"}}>B{bus.num} · {bus.name}</strong><br/>
          arrives at <strong style={{color:"var(--gold)",fontSize:16}}>{stop.name}</strong><br/>
          in <strong style={{color:"var(--red)",fontSize:20}}>{leaveIn} min</strong>. Head out now!
        </p>
        <div style={{background:"rgba(255,68,68,.08)",border:"1px solid rgba(255,68,68,.2)",borderRadius:12,padding:"10px 16px",marginBottom:20,fontSize:13,color:"var(--text)"}}>
          🚶 Walk to your stop immediately to board on time
        </div>
        <div style={{display:"flex",gap:10}}>
          {!snoozed && (
            <button onClick={()=>{setSnoozed(true);setTimeout(()=>{playAlarm();},120000);}} style={{flex:1,padding:"12px",background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,color:"var(--muted)",fontFamily:"Syne,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer"}}>
              😴 +2 min
            </button>
          )}
          <button onClick={onDismiss} style={{flex:2,padding:"12px",background:"linear-gradient(135deg,#c0392b,var(--red))",border:"none",borderRadius:12,color:"#fff",fontFamily:"Syne,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer"}}>
            ✅ I'm On My Way!
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// MISSED BUS MODAL
// ══════════════════════════════════════════════════════
function MissedBusModal({ bus, sLat, sLng, onDismiss }) {
  const alts = getAlternates(bus, sLat, sLng);
  return (
    <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.90)",backdropFilter:"blur(16px)",padding:16}}>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:24,width:"min(520px,96vw)",maxHeight:"90vh",overflow:"auto",boxShadow:"0 40px 100px rgba(0,0,0,.8)",animation:"slideUp .35s ease"}}>
        <div style={{padding:"28px 28px 0",textAlign:"center"}}>
          <div style={{fontSize:52,marginBottom:10}}>😬</div>
          <h2 style={{fontFamily:"Syne,sans-serif",fontSize:24,fontWeight:800,marginBottom:8}}>Missed Bus B{bus.num}?</h2>
          <p style={{color:"var(--muted)",fontSize:14,lineHeight:1.7,marginBottom:6}}>
            The bus has passed your stop — but don't stress. Here are your options right now.
          </p>
        </div>
        <div style={{padding:"20px 24px 28px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{fontSize:11,letterSpacing:"2px",textTransform:"uppercase",color:"var(--muted)",marginBottom:2}}>🔄 Alternate Buses Near You</div>

          {alts.length === 0 ? (
            <div style={{background:"rgba(255,201,74,.07)",border:"1px solid rgba(255,201,74,.2)",borderRadius:12,padding:16,fontSize:14,color:"var(--gold)",textAlign:"center"}}>
              No buses within walking distance right now. Call transport: <strong>+91-40-2351-0177</strong>
            </div>
          ) : alts.map((alt, i) => (
            <div key={i} style={{background:alt.canCatch?"rgba(0,230,118,.05)":"var(--card)",border:`1px solid ${alt.canCatch?"rgba(0,230,118,.3)":"var(--border)"}`,borderRadius:16,padding:"16px 18px",position:"relative",overflow:"hidden",animation:`slideInRight .3s ease ${i*0.1}s both`}}>
              {alt.canCatch && <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,var(--green),var(--accent))"}}/>}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{background:"linear-gradient(135deg,var(--accent2),var(--accent))",borderRadius:10,padding:"5px 12px",fontFamily:"Syne,sans-serif",fontSize:16,fontWeight:800}}>B{alt.bus.num}</div>
                  <div>
                    <div style={{fontFamily:"Syne,sans-serif",fontSize:14,fontWeight:700}}>{alt.bus.name}</div>
                    <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{alt.bus.route}</div>
                  </div>
                </div>
                <span style={{background:alt.canCatch?"rgba(0,230,118,.15)":"rgba(255,201,74,.1)",border:`1px solid ${alt.canCatch?"rgba(0,230,118,.4)":"rgba(255,201,74,.3)"}`,borderRadius:20,padding:"3px 10px",fontSize:11,color:alt.canCatch?"var(--green)":"var(--gold)",fontWeight:700}}>
                  {alt.canCatch ? "✓ CATCHABLE" : "⚡ TIGHT"}
                </span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:alt.canCatch?10:0}}>
                {[
                  {icon:"📍",l:"Board at",v:alt.stop.name},
                  {icon:"🚶",l:"Walk time",v:`${alt.walkMins} min`},
                  {icon:"🚌",l:"Bus arrives",v:`~${alt.busEta} min`},
                ].map(({icon,l,v},j)=>(
                  <div key={j} style={{background:"rgba(255,255,255,.03)",borderRadius:10,padding:"8px 10px"}}>
                    <div style={{fontSize:10,color:"var(--muted)",marginBottom:3}}>{icon} {l}</div>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{v}</div>
                  </div>
                ))}
              </div>
              {alt.canCatch && (
                <div style={{fontSize:12,color:"var(--green)",background:"rgba(0,230,118,.06)",borderRadius:8,padding:"8px 12px"}}>
                  ✅ Leave right now → walk to <strong>{alt.stop.name}</strong> — you'll make it!
                </div>
              )}
            </div>
          ))}

          <div style={{background:"rgba(123,97,255,.07)",border:"1px solid rgba(123,97,255,.2)",borderRadius:12,padding:"14px 16px",fontSize:13,lineHeight:1.8}}>
            <div style={{fontWeight:600,color:"var(--accent2)",marginBottom:6}}>💡 More Options</div>
            <div style={{color:"var(--muted)"}}>• Share a cab with batchmates heading to VCE</div>
            <div style={{color:"var(--muted)"}}>• Transport office: <strong style={{color:"var(--accent)"}}>+91-40-2351-0177</strong></div>
            <div style={{color:"var(--muted)"}}>• Enable alarms next time to get notified 5 min early</div>
          </div>

          <button onClick={onDismiss} style={{padding:"13px",background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,color:"var(--text)",fontFamily:"Syne,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer"}}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// LEAFLET MAP
// ══════════════════════════════════════════════════════
function LiveMap({ bus, sLat, sLng, busT, nearestStop }) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const busMarker = useRef(null);
  const stuMarker = useRef(null);

  useEffect(() => {
    if (!window.L || !mapRef.current) return;
    const L = window.L;
    if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }

    const center = bus.stops[Math.floor(bus.stops.length/2)].coords;
    const map = L.map(mapRef.current, { center, zoom:13, attributionControl:false });
    mapInst.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom:19}).addTo(map);

    // Route polyline
    const line = L.polyline(bus.stops.map(s=>s.coords), {color:"#00e5ff",weight:3,opacity:.7,dashArray:"8,6"}).addTo(map);
    map.fitBounds(line.getBounds(), {padding:[50,50]});

    // Stop markers
    bus.stops.forEach((stop, i) => {
      const isMine = stop.name === nearestStop?.name, isLast = i === bus.stops.length-1;
      const ic = L.divIcon({
        html:`<div style="width:${isLast||isMine?18:9}px;height:${isLast||isMine?18:9}px;background:${isLast?"#ffc94a":isMine?"#00e5ff":"rgba(255,255,255,0.35)"};border-radius:50%;border:2px solid ${isLast?"#ffc94a":isMine?"#00e5ff":"rgba(255,255,255,0.2)"};box-shadow:${isMine?"0 0 12px rgba(0,229,255,0.7)":"none"}"></div>`,
        className:"", iconSize:[isLast||isMine?18:9, isLast||isMine?18:9], iconAnchor:[isLast||isMine?9:4.5, isLast||isMine?9:4.5]
      });
      L.marker(stop.coords, {icon:ic}).addTo(map)
        .bindPopup(`<strong>${stop.name}</strong><br><span style="color:#6b7a96;font-size:11px">${stop.time}${isMine?" · <span style='color:#00e5ff'>📍 Your Stop</span>":""}</span>`);
    });

    // Student marker
    if (sLat && sLng) {
      const ic = L.divIcon({
        html:`<div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center">
          <div style="position:absolute;inset:0;background:rgba(123,97,255,.2);border-radius:50%;animation:trailPulse 2s ease-out infinite"></div>
          <div style="width:26px;height:26px;background:linear-gradient(135deg,#7b61ff,#a78bff);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 0 0 3px rgba(123,97,255,.35),0 4px 12px rgba(0,0,0,.4);z-index:1">🧑</div>
        </div>`,
        className:"", iconSize:[36,36], iconAnchor:[18,18]
      });
      stuMarker.current = L.marker([sLat,sLng],{icon:ic}).addTo(map)
        .bindPopup(`<strong>You</strong><br><span style="color:#6b7a96;font-size:11px">Live Location</span>`);
    }

    // Bus marker
    const bPos = getBusPositionAtT(bus, busT);
    const bic = L.divIcon({
      html:`<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center">
        <div style="position:absolute;inset:0;background:rgba(0,229,255,.15);border-radius:50%;animation:trailPulse 2s ease-out infinite"></div>
        <div style="width:38px;height:38px;background:linear-gradient(135deg,#7b61ff,#00e5ff);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 0 0 3px rgba(0,229,255,.3),0 6px 16px rgba(0,229,255,.25);z-index:1;animation:busFloat 2s ease-in-out infinite">🚌</div>
      </div>`,
      className:"", iconSize:[44,44], iconAnchor:[22,22]
    });
    busMarker.current = L.marker(bPos, {icon:bic}).addTo(map)
      .bindPopup(`<strong>Bus B${bus.num}</strong><br><span style="color:#6b7a96">${bus.name}</span>`);

    return () => { if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; } };
  }, [bus, sLat, sLng, nearestStop]);

  useEffect(() => { if (busMarker.current) busMarker.current.setLatLng(getBusPositionAtT(bus, busT)); }, [busT, bus]);
  useEffect(() => { if (stuMarker.current && sLat && sLng) stuMarker.current.setLatLng([sLat, sLng]); }, [sLat, sLng]);

  return <div ref={mapRef} style={{width:"100%",height:"100%",background:"#0a1220"}}/>;
}

// ══════════════════════════════════════════════════════
// STUDENT DASHBOARD
// ══════════════════════════════════════════════════════
function StudentDashboard({ roll, onAdmin }) {
  const bus = getBusFromRoll(roll);
  const [sLat, setSLat] = useState(null);
  const [sLng, setSLng] = useState(null);
  const [locGranted, setLocGranted] = useState(false);
  const [locError, setLocError] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [busT, setBusT] = useState(0.08);
  const [speed, setSpeed] = useState(bus.speed);
  const [showAlarm, setShowAlarm] = useState(false);
  const [showMissed, setShowMissed] = useState(false);
  const [alarmDone, setAlarmDone] = useState(false);
  const [leafletOk, setLeafletOk] = useState(false);
  const [tab, setTab] = useState("home");
  const animRef = useRef(null);
  const alarmFired = useRef(false);
  const missedFired = useRef(false);

  useEffect(() => { const c=()=>{ if(window.L) setLeafletOk(true); else setTimeout(c,200);}; c(); },[]);

  const requestLoc = () => {
    if (!navigator.geolocation) { useDemoLoc(); return; }
    navigator.geolocation.watchPosition(
      p => { setSLat(p.coords.latitude); setSLng(p.coords.longitude); setLocGranted(true); setLocError(false); },
      () => useDemoLoc(),
      { enableHighAccuracy:true, maximumAge:5000 }
    );
  };

  const useDemoLoc = () => {
    setSLat(bus.stops[0].coords[0] + 0.004);
    setSLng(bus.stops[0].coords[1] + 0.004);
    setLocGranted(true); setLocError(true);
  };

  const requestNotif = () => {
    if ("Notification" in window) Notification.requestPermission().then(p => setNotifGranted(p==="granted"));
  };

  // Animate bus
  useEffect(() => {
    const go = () => {
      setBusT(t => { const n=t+0.0018; return n>1?0.05:n; });
      setSpeed(s => Math.max(15, s + Math.floor(Math.random()*6-3)));
      animRef.current = requestAnimationFrame(go);
    };
    animRef.current = requestAnimationFrame(go);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Derived state
  const busPos = getBusPositionAtT(bus, busT);
  const { stop: myStop, idx: myStopIdx, distKm: distToStop } = sLat
    ? getNearestStop(bus, sLat, sLng)
    : { stop: bus.stops[0], idx: 0, distKm: 0 };

  const busDistToMyStop = haversineKm(busPos[0], busPos[1], myStop.coords[0], myStop.coords[1]);
  const busEta = Math.max(1, Math.round((busDistToMyStop / Math.max(speed, 10)) * 60));
  const walkTime = walkMins(distToStop);
  const leaveIn = Math.max(0, busEta - walkTime - 2);
  const leaveSoon = leaveIn <= 5;
  const leaveNow = leaveIn === 0;
  const busPassedMyStop = busT * (bus.stops.length-1) > myStopIdx + 0.85;

  // Alarm
  useEffect(() => {
    if (leaveIn <= 5 && leaveIn > 0 && !alarmFired.current && !alarmDone && locGranted) {
      alarmFired.current = true; setShowAlarm(true);
      if (notifGranted) new Notification(`🚌 Bus B${bus.num}`, { body: `Leave in ${leaveIn} min for ${myStop.name}!` });
    }
    if (leaveIn > 5) alarmFired.current = false;
  }, [leaveIn, locGranted]);

  // Missed bus
  useEffect(() => {
    if (busPassedMyStop && !missedFired.current && locGranted) { missedFired.current = true; setShowMissed(true); }
    if (!busPassedMyStop) missedFired.current = false;
  }, [busPassedMyStop, locGranted]);

  const statusCol = {online:"var(--green)",delayed:"var(--gold)",offline:"var(--muted)"}[bus.status];
  const urgentBg = leaveNow ? "rgba(255,68,68,.07)" : leaveSoon ? "rgba(255,201,74,.05)" : "var(--surface)";
  const urgentBorder = leaveNow ? "rgba(255,68,68,.4)" : leaveSoon ? "rgba(255,201,74,.3)" : "var(--border)";
  const leaveColor = leaveNow ? "var(--red)" : leaveSoon ? "var(--gold)" : "var(--green)";

  const TABS = [{k:"home",i:"🏠",l:"Home"},{k:"map",i:"🗺",l:"Map"},{k:"stops",i:"📍",l:"Stops"}];

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",paddingBottom:76}}>
      {/* Topbar */}
      <div style={{position:"sticky",top:0,zIndex:50,background:"rgba(8,12,20,.96)",backdropFilter:"blur(20px)",borderBottom:"1px solid var(--border)",padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between",height:58}}>
        <div style={{fontFamily:"Syne,sans-serif",fontSize:16,fontWeight:800}}>VCE <span style={{color:"var(--accent)"}}>BusTrack</span></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(0,230,118,.1)",border:"1px solid rgba(0,230,118,.3)",borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:700,color:"var(--green)",letterSpacing:1}}><span className="live-dot"/> LIVE</div>
          <button onClick={onAdmin} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:9,padding:"5px 11px",color:"var(--muted)",fontSize:11,cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>Fleet →</button>
        </div>
      </div>

      <div style={{padding:"18px 18px 0"}}>

        {/* ═══ HOME TAB ═══ */}
        {tab === "home" && (
          <div style={{display:"flex",flexDirection:"column",gap:14,animation:"fadeIn .3s ease"}}>

            {/* Bus chip */}
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:20,padding:"18px 20px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,var(--accent2),var(--accent))"}}/>
              <div style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>👤 {roll}</div>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <div style={{background:"linear-gradient(135deg,var(--accent2),var(--accent))",borderRadius:10,padding:"6px 14px",fontFamily:"Syne,sans-serif",fontSize:18,fontWeight:800}}>B{bus.num}</div>
                <div>
                  <div style={{fontFamily:"Syne,sans-serif",fontSize:16,fontWeight:700}}>{bus.name}</div>
                  <div style={{fontSize:12,color:"var(--muted)",marginTop:1}}>{bus.route}</div>
                </div>
                <span style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5,fontSize:11,color:statusCol,background:`${statusCol}18`,border:`1px solid ${statusCol}35`,borderRadius:20,padding:"3px 10px",fontWeight:700}}>
                  <span style={{width:5,height:5,borderRadius:"50%",background:statusCol,display:"inline-block",animation:bus.status==="online"?"pulse 1.5s infinite":undefined}}/>{bus.status}
                </span>
              </div>
            </div>

            {/* Location request */}
            {!locGranted && (
              <div style={{background:"rgba(123,97,255,.08)",border:"1px solid rgba(123,97,255,.25)",borderRadius:16,padding:"18px 20px"}}>
                <div style={{fontFamily:"Syne,sans-serif",fontSize:16,fontWeight:700,marginBottom:6}}>📍 Enable Your Location</div>
                <div style={{fontSize:13,color:"var(--muted)",marginBottom:14,lineHeight:1.6}}>Required to calculate walk time, detect if you miss your bus, and trigger the leave alarm at the right moment.</div>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={requestLoc} style={{padding:"11px 20px",background:"linear-gradient(135deg,var(--accent2),var(--accent))",border:"none",borderRadius:10,color:"#fff",fontFamily:"Syne,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer"}}>Share Location →</button>
                  <button onClick={requestNotif} style={{padding:"11px 16px",background:"var(--card)",border:"1px solid var(--border)",borderRadius:10,color:"var(--muted)",fontFamily:"DM Sans,sans-serif",fontSize:13,cursor:"pointer"}}>🔔 Enable Alerts</button>
                </div>
              </div>
            )}

            {locError && (
              <div style={{background:"rgba(255,201,74,.06)",border:"1px solid rgba(255,201,74,.2)",borderRadius:10,padding:"10px 14px",fontSize:12,color:"var(--gold)"}}>
                ⚠️ Using demo location (near stop 1) — real GPS unavailable in this environment
              </div>
            )}

            {locGranted && !notifGranted && (
              <div style={{background:"rgba(0,229,255,.05)",border:"1px solid rgba(0,229,255,.18)",borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                <div style={{fontSize:12,color:"var(--muted)"}}>🔔 Enable notifications to receive the alarm even when app is in background</div>
                <button onClick={requestNotif} style={{flexShrink:0,padding:"7px 13px",background:"rgba(0,229,255,.1)",border:"1px solid rgba(0,229,255,.3)",borderRadius:9,color:"var(--accent)",fontFamily:"Syne,sans-serif",fontSize:11,fontWeight:700,cursor:"pointer"}}>Enable</button>
              </div>
            )}

            {/* ETA PANEL */}
            {locGranted && (
              <>
                <div style={{background:urgentBg,border:`1px solid ${urgentBorder}`,borderRadius:20,padding:"22px 20px",transition:"all .4s"}}>
                  <div style={{textAlign:"center",marginBottom:18}}>
                    <div style={{fontSize:10,letterSpacing:"2px",textTransform:"uppercase",color:"var(--muted)",marginBottom:4}}>
                      {leaveNow ? "⚡ LEAVE IMMEDIATELY" : leaveSoon ? "⚠️ LEAVING SOON" : "⏱ JOURNEY TIMELINE"}
                    </div>
                    {leaveNow && <div style={{fontFamily:"Syne,sans-serif",fontSize:18,fontWeight:800,color:"var(--red)",animation:"countdownBlink 1s infinite"}}>Head to {myStop.name} NOW!</div>}
                  </div>
                  <div style={{display:"flex",justifyContent:"center",gap:24,flexWrap:"wrap"}}>
                    <CountdownRing minutes={leaveIn} label="Leave In" color={leaveColor} max={30}/>
                    <CountdownRing minutes={busEta} label="Bus Arrives" color="var(--accent)" max={40}/>
                    <CountdownRing minutes={walkTime} label="Walk Time" color="var(--accent2)" max={20}/>
                  </div>
                </div>

                {/* Your stop */}
                <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:16,padding:"16px 18px"}}>
                  <div style={{fontSize:10,letterSpacing:"2px",textTransform:"uppercase",color:"var(--muted)",marginBottom:10}}>📍 Your Boarding Stop</div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                    <div>
                      <div style={{fontFamily:"Syne,sans-serif",fontSize:17,fontWeight:700}}>{myStop.name}</div>
                      <div style={{fontSize:12,color:"var(--muted)",marginTop:3}}>Scheduled {myStop.time} · {(distToStop*1000).toFixed(0)}m from you</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontFamily:"Syne,sans-serif",fontSize:30,fontWeight:800,color:"var(--accent)"}}>{busEta}<span style={{fontSize:13,fontWeight:400,color:"var(--muted)"}}> min</span></div>
                      <div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",letterSpacing:1}}>Bus ETA</div>
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[
                    {i:"🏎",l:"Speed",v:`${speed} km/h`,c:"var(--accent)"},
                    {i:"👥",l:"Occupancy",v:`${bus.capacity}%`,c:"var(--gold)"},
                    {i:"🧑‍✈️",l:"Driver",v:bus.driver,c:"var(--green)"},
                    {i:"📏",l:"Bus Away",v:`${busDistToMyStop.toFixed(1)} km`,c:"var(--accent2)"},
                  ].map(({i,l,v,c},idx)=>(
                    <div key={idx} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,padding:"13px 15px"}}>
                      <div style={{fontSize:10,color:"var(--muted)",marginBottom:4}}>{i} {l}</div>
                      <div style={{fontFamily:"Syne,sans-serif",fontSize:15,fontWeight:700,color:c}}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Test buttons */}
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>{alarmFired.current=false;setAlarmDone(false);setShowAlarm(true);playAlarm();}} style={{flex:1,padding:"10px",background:"rgba(255,68,68,.07)",border:"1px solid rgba(255,68,68,.2)",borderRadius:11,color:"var(--red)",fontFamily:"DM Sans,sans-serif",fontSize:12,cursor:"pointer",fontWeight:500}}>
                    🧪 Test Alarm
                  </button>
                  <button onClick={()=>{missedFired.current=false;setShowMissed(true);}} style={{flex:1,padding:"10px",background:"rgba(255,201,74,.07)",border:"1px solid rgba(255,201,74,.2)",borderRadius:11,color:"var(--gold)",fontFamily:"DM Sans,sans-serif",fontSize:12,cursor:"pointer",fontWeight:500}}>
                    🧪 Missed Bus
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ MAP TAB ═══ */}
        {tab === "map" && (
          <div style={{animation:"fadeIn .3s ease"}}>
            <div style={{borderRadius:20,overflow:"hidden",border:"1px solid var(--border)",height:"68vh",position:"relative"}}>
              {leafletOk ? (
                <LiveMap bus={bus} sLat={sLat} sLng={sLng} busT={busT} nearestStop={myStop}/>
              ) : (
                <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:"var(--muted)"}}>
                  <div style={{width:30,height:30,border:"3px solid var(--border)",borderTopColor:"var(--accent)",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
                  Loading map...
                </div>
              )}
              {/* Map legend */}
              <div style={{position:"absolute",bottom:14,left:14,zIndex:999,background:"rgba(8,12,20,.93)",backdropFilter:"blur(10px)",border:"1px solid var(--border)",borderRadius:12,padding:"10px 14px",fontSize:11,display:"flex",flexDirection:"column",gap:5,pointerEvents:"none"}}>
                {[{e:"🚌",t:`Bus B${bus.num}`},{e:"🧑",t:"You"},{e:"⚡",t:`Your stop: ${myStop.name}`}].map(({e,t},i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:7,color:"var(--muted)"}}><span>{e}</span><span>{t}</span></div>
                ))}
              </div>
            </div>
            {!locGranted && (
              <div style={{marginTop:12,background:"rgba(123,97,255,.07)",border:"1px solid rgba(123,97,255,.2)",borderRadius:12,padding:"12px 16px",fontSize:13,color:"var(--muted)",textAlign:"center"}}>
                <button onClick={requestLoc} style={{background:"none",border:"none",color:"var(--accent)",cursor:"pointer",fontWeight:600,fontSize:13}}>Enable location</button> to see yourself on the map
              </div>
            )}
          </div>
        )}

        {/* ═══ STOPS TAB ═══ */}
        {tab === "stops" && (
          <div style={{animation:"fadeIn .3s ease"}}>
            <div style={{fontFamily:"Syne,sans-serif",fontSize:18,fontWeight:800,marginBottom:16}}>B{bus.num} Route — {bus.stops.length} Stops</div>
            {bus.stops.map((stop, i) => {
              const isMine = stop.name === myStop.name;
              const prog = busT * (bus.stops.length-1);
              const passed = prog > i + 0.7;
              const current = Math.round(prog) === i;
              const etaMins = Math.max(0, Math.round((i - prog) * 8));
              return (
                <div key={i} style={{display:"flex",gap:14,padding:"13px 0",borderBottom:i<bus.stops.length-1?"1px solid rgba(255,255,255,.04)":"none"}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                    <div style={{width:26,height:26,borderRadius:"50%",flexShrink:0,background:passed?"var(--green)":current?"var(--accent)":isMine?"rgba(123,97,255,.25)":"rgba(255,255,255,.07)",border:isMine&&!passed&&!current?"2px solid var(--accent2)":"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:passed||current?"#000":"var(--muted)",boxShadow:current?"0 0 0 4px rgba(0,229,255,.15)":isMine?"0 0 0 3px rgba(123,97,255,.2)":"none",animation:current?"pulse 1.5s infinite":undefined,zIndex:1}}>
                      {passed ? "✓" : i+1}
                    </div>
                    {i < bus.stops.length-1 && <div style={{width:2,flex:1,background:passed?"rgba(0,230,118,.3)":"rgba(255,255,255,.05)",minHeight:20,marginTop:3}}/>}
                  </div>
                  <div style={{flex:1,paddingBottom:i<bus.stops.length-1?10:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
                      <span style={{fontFamily:"Syne,sans-serif",fontSize:14,fontWeight:700,color:current?"var(--accent)":passed?"var(--muted)":"var(--text)"}}>{stop.name}</span>
                      {isMine && <span style={{background:"rgba(123,97,255,.15)",border:"1px solid rgba(123,97,255,.3)",borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700,color:"var(--accent2)",letterSpacing:1}}>YOUR STOP</span>}
                      {current && <span style={{background:"rgba(0,229,255,.1)",border:"1px solid rgba(0,229,255,.25)",borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700,color:"var(--accent)",letterSpacing:1}}>BUS HERE</span>}
                    </div>
                    <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,color:"var(--muted)"}}>🕐 {stop.time}</span>
                      {!passed && !current && <span style={{fontSize:11,color:"var(--gold)"}}>~{etaMins} min</span>}
                      {passed && <span style={{fontSize:11,color:"var(--green)"}}>✓ Passed</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:50,background:"rgba(8,12,20,.97)",backdropFilter:"blur(20px)",borderTop:"1px solid var(--border)",display:"flex"}}>
        {TABS.map(({k,i,l})=>(
          <button key={k} onClick={()=>setTab(k)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"10px 0"}}>
            <span style={{fontSize:20,filter:tab===k?"drop-shadow(0 0 6px var(--accent))":"none",transition:"filter .2s"}}>{i}</span>
            <span style={{fontSize:9,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:tab===k?"var(--accent)":"var(--muted)",transition:"color .2s"}}>{l}</span>
          </button>
        ))}
      </div>

      {showAlarm && !alarmDone && (
        <AlarmModal bus={bus} stop={myStop} leaveIn={leaveIn} onDismiss={()=>{setShowAlarm(false);setAlarmDone(true);}}/>
      )}
      {showMissed && (
        <MissedBusModal bus={bus} sLat={sLat||bus.stops[0].coords[0]} sLng={sLng||bus.stops[0].coords[1]} onDismiss={()=>{setShowMissed(false);missedFired.current=false;}}/>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// ADMIN / FLEET VIEW
// ══════════════════════════════════════════════════════
function AdminDashboard({ onBack }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const SC = {online:"var(--green)",delayed:"var(--gold)",offline:"var(--muted)"};
  const filtered = BUS_DATA.filter(b => (filter==="all"||b.status===filter) && (!search||b.num.includes(search)||b.name.toLowerCase().includes(search)));

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",paddingBottom:32}}>
      <div style={{position:"sticky",top:0,zIndex:50,background:"rgba(8,12,20,.96)",backdropFilter:"blur(20px)",borderBottom:"1px solid var(--border)",padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between",height:58}}>
        <div style={{fontFamily:"Syne,sans-serif",fontSize:16,fontWeight:800}}>Fleet <span style={{color:"var(--accent)"}}>Overview</span></div>
        <button onClick={onBack} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:9,padding:"5px 13px",color:"var(--muted)",fontSize:11,cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>← My Bus</button>
      </div>
      <div style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {[{n:BUS_DATA.filter(b=>b.status==="online").length,l:"Online",c:"var(--green)"},{n:BUS_DATA.length,l:"Total",c:"var(--accent)"},{n:BUS_DATA.filter(b=>b.status==="delayed").length,l:"Delayed",c:"var(--gold)"}].map(({n,l,c},i)=>(
            <div key={i} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:"14px 10px",textAlign:"center"}}>
              <div style={{fontFamily:"Syne,sans-serif",fontSize:26,fontWeight:800,color:c}}>{n}</div>
              <div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",letterSpacing:1,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:160,background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
            <span style={{color:"var(--muted)"}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value.toLowerCase())} placeholder="Search..." style={{background:"none",border:"none",outline:"none",color:"var(--text)",fontSize:13,width:"100%",fontFamily:"DM Sans,sans-serif"}}/>
          </div>
          {["all","online","delayed","offline"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:"10px 13px",background:"var(--card)",border:`1px solid ${filter===f?"var(--accent)":"var(--border)"}`,borderRadius:11,color:filter===f?"var(--accent)":"var(--muted)",fontSize:11,cursor:"pointer",fontFamily:"DM Sans,sans-serif",textTransform:"capitalize"}}>{f}</button>
          ))}
        </div>
        {filtered.map(bus=>(
          <div key={bus.num} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:16,padding:"15px 16px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{background:"linear-gradient(135deg,var(--accent2),var(--accent))",borderRadius:9,padding:"5px 12px",fontFamily:"Syne,sans-serif",fontSize:15,fontWeight:800}}>B{bus.num}</div>
                <div>
                  <div style={{fontFamily:"Syne,sans-serif",fontSize:14,fontWeight:700}}>{bus.name}</div>
                  <div style={{fontSize:11,color:"var(--muted)",marginTop:1}}>Branch: {bus.assignedBranch.join(",")} · {bus.driver}</div>
                </div>
              </div>
              <span style={{fontSize:11,color:SC[bus.status],background:`${SC[bus.status]}15`,border:`1px solid ${SC[bus.status]}30`,borderRadius:20,padding:"3px 10px",fontWeight:700}}>{bus.status}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {[{l:"Stops",v:bus.stops.length},{l:"Speed",v:bus.status!=="offline"?bus.speed+" km/h":"—"},{l:"Load",v:bus.status!=="offline"?bus.capacity+"%":"N/A"}].map(({l,v},i)=>(
                <div key={i} style={{background:"rgba(255,255,255,.03)",borderRadius:8,padding:"7px 10px",fontSize:10,color:"var(--muted)"}}>
                  {l}<strong style={{display:"block",fontSize:13,color:"var(--text)",marginTop:1}}>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("student");
  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",color:"var(--text)"}}>
      <Particles/>
      {!user && <Onboarding onLogin={u => setUser(u)}/>}
      {user && view==="student" && <StudentDashboard roll={user} onAdmin={()=>setView("admin")}/>}
      {user && view==="admin"   && <AdminDashboard onBack={()=>setView("student")}/>}
    </div>
  );
}
