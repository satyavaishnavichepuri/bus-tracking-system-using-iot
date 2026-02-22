import { useState, useEffect, useRef, useCallback } from "react";

// ── Inject Leaflet ───────────────────────────────────
const leafletCss = document.createElement("link");
leafletCss.rel = "stylesheet";
leafletCss.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
document.head.appendChild(leafletCss);
const leafletScript = document.createElement("script");
leafletScript.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
document.head.appendChild(leafletScript);

// ── Inject ZXing (barcode scanner) ──────────────────
const zxingScript = document.createElement("script");
zxingScript.src = "https://cdnjs.cloudflare.com/ajax/libs/zxing-js/0.20.0/zxing.min.js";
document.head.appendChild(zxingScript);

// ── Global Styles ────────────────────────────────────
const gStyle = document.createElement("style");
gStyle.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap');
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
  @keyframes scanLine{0%{top:8%}100%{top:88%}}
  @keyframes cornerPulse{0%,100%{opacity:.6}50%{opacity:1}}
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
const VCE_COORDS = [17.3967, 78.4828]; // Ibrahimbagh, VCE actual location
const WALK_SPEED_KMH = 4.5;

// ── REAL BUS DATA from VCE Transport Circular 2025-26 ──
const BUS_DATA = [
  {
    num: "1", name: "ECIL Express A", status: "online", capacity: 68, driver: "Raju Kumar", tariff: 33000,
    route: "ECIL X Rds → A.S.Rao Nagar → Malkajigiri → VCE",
    stops: [
      { name: "ECIL X Roads",         coords: [17.4638, 78.5591], time: "7:00 AM" },
      { name: "Radhika Theatre",       coords: [17.4600, 78.5520], time: "7:05 AM" },
      { name: "A.S.Rao Nagar",         coords: [17.4558, 78.5460], time: "7:10 AM" },
      { name: "Naredmet X Roads",      coords: [17.4480, 78.5380], time: "7:17 AM" },
      { name: "Vinayak Nagar",         coords: [17.4390, 78.5300], time: "7:23 AM" },
      { name: "Anandbagh",             coords: [17.4310, 78.5220], time: "7:28 AM" },
      { name: "Malkajigiri",           coords: [17.4430, 78.5150], time: "7:33 AM" },
      { name: "Mettiguda",             coords: [17.4160, 78.5000], time: "7:38 AM" },
      { name: "Chilkalguda X Roads",   coords: [17.4100, 78.4960], time: "7:42 AM" },
      { name: "Kawadiguda",            coords: [17.4050, 78.4900], time: "7:46 AM" },
      { name: "Lower Tankbund",        coords: [17.4010, 78.4850], time: "7:51 AM" },
      { name: "VCE Main Gate",         coords: VCE_COORDS,          time: "8:00 AM" },
    ]
  },
  {
    num: "1B", name: "ECIL Express B", status: "online", capacity: 72, driver: "Venkatesh P", tariff: 33000,
    route: "ECIL X Rds → Naredmet → Lower Tankbund → VCE",
    stops: [
      { name: "ECIL X Roads",         coords: [17.4638, 78.5591], time: "7:05 AM" },
      { name: "A.S.Rao Nagar",         coords: [17.4558, 78.5460], time: "7:12 AM" },
      { name: "Naredmet X Roads",      coords: [17.4480, 78.5380], time: "7:19 AM" },
      { name: "Malkajigiri",           coords: [17.4430, 78.5150], time: "7:26 AM" },
      { name: "Chilkalguda X Roads",   coords: [17.4100, 78.4960], time: "7:34 AM" },
      { name: "Kawadiguda",            coords: [17.4050, 78.4900], time: "7:40 AM" },
      { name: "Lower Tankbund",        coords: [17.4010, 78.4850], time: "7:50 AM" },
      { name: "VCE Main Gate",         coords: VCE_COORDS,          time: "8:00 AM" },
    ]
  },
  {
    num: "2", name: "Chinthalakunta CkPost", status: "online", capacity: 65, driver: "Suresh Babu", tariff: 33000,
    route: "Chinthalakunta → LB Nagar → Abids → Mehdipatnam → VCE",
    stops: [
      { name: "Chinthalakunta CkPost", coords: [17.3450, 78.5490], time: "6:55 AM" },
      { name: "LB Nagar",              coords: [17.3493, 78.5492], time: "7:02 AM" },
      { name: "Kothapet X Roads",      coords: [17.3516, 78.5113], time: "7:10 AM" },
      { name: "Chaitanyapuri",         coords: [17.3580, 78.5050], time: "7:16 AM" },
      { name: "Dilsukhnagar",          coords: [17.3692, 78.5264], time: "7:22 AM" },
      { name: "Malakpet",              coords: [17.3760, 78.5020], time: "7:28 AM" },
      { name: "Chaderghat",            coords: [17.3800, 78.4940], time: "7:33 AM" },
      { name: "Moinja Market",         coords: [17.3840, 78.4890], time: "7:37 AM" },
      { name: "Abids",                 coords: [17.3870, 78.4800], time: "7:41 AM" },
      { name: "Nampally",              coords: [17.3890, 78.4720], time: "7:45 AM" },
      { name: "Public Gardens",        coords: [17.4000, 78.4710], time: "7:49 AM" },
      { name: "Lakadikapool",          coords: [17.4050, 78.4680], time: "7:53 AM" },
      { name: "Mehdipatnam",           coords: [17.3999, 78.4380], time: "7:57 AM" },
      { name: "VCE Main Gate",         coords: VCE_COORDS,          time: "8:00 AM" },
    ]
  },
  {
    num: "3", name: "Nagole Express", status: "online", capacity: 70, driver: "Prasad M", tariff: 33000,
    route: "Nagole X Rds → Amberpet → VST → Mehdipatnam → VCE",
    stops: [
      { name: "Nagole X Roads",        coords: [17.3840, 78.5620], time: "6:50 AM" },
      { name: "Ramanthapur HPS",       coords: [17.3890, 78.5490], time: "6:57 AM" },
      { name: "Amberpet X Roads",      coords: [17.3950, 78.5280], time: "7:05 AM" },
      { name: "6 No. Shivam Road",     coords: [17.4000, 78.5100], time: "7:12 AM" },
      { name: "Vidyanagar X Roads",    coords: [17.4060, 78.5000], time: "7:18 AM" },
      { name: "VST RTC X Roads",       coords: [17.4090, 78.4900], time: "7:24 AM" },
      { name: "Indira Park",           coords: [17.4110, 78.4860], time: "7:28 AM" },
      { name: "Telugutalli Flyover",   coords: [17.4050, 78.4760], time: "7:33 AM" },
      { name: "Lakadikapool",          coords: [17.4050, 78.4680], time: "7:38 AM" },
      { name: "Mehdipatnam",           coords: [17.3999, 78.4380], time: "7:47 AM" },
      { name: "VCE Main Gate",         coords: VCE_COORDS,          time: "8:00 AM" },
    ]
  },
  {
    num: "4", name: "Uppal Depot", status: "delayed", capacity: 80, driver: "Naresh R", tariff: 33000,
    route: "Uppal Depot → Peerzadiguda → Habsiguda → VST → VCE",
    stops: [
      { name: "Uppal Bus Stop",        coords: [17.4058, 78.5592], time: "6:55 AM" },
      { name: "Peerzadiguda Kaman",    coords: [17.4020, 78.5520], time: "7:01 AM" },
      { name: "Uppal X Roads",         coords: [17.4058, 78.5500], time: "7:06 AM" },
      { name: "Survey of India",       coords: [17.4100, 78.5400], time: "7:12 AM" },
      { name: "Street No.8 Main Rd",   coords: [17.4050, 78.5300], time: "7:17 AM" },
      { name: "Habsiguda X Roads",     coords: [17.4020, 78.5200], time: "7:22 AM" },
      { name: "Tarnaka",               coords: [17.4080, 78.5100], time: "7:28 AM" },
      { name: "Adikmet",               coords: [17.4050, 78.5000], time: "7:33 AM" },
      { name: "Vidyanagar",            coords: [17.4060, 78.5000], time: "7:37 AM" },
      { name: "VST Mehdipatnam",       coords: [17.3999, 78.4380], time: "7:49 AM" },
      { name: "VCE Main Gate",         coords: VCE_COORDS,          time: "8:00 AM" },
    ]
  },
  {
    num: "5", name: "Moula Ali Express", status: "online", capacity: 75, driver: "Srinivas R", tariff: 33000,
    route: "Moula Ali → Tarnaka → Habsiguda → Barkathpura → VCE",
    stops: [
      { name: "Moula Ali",             coords: [17.4470, 78.5500], time: "6:55 AM" },
      { name: "Housing Board",         coords: [17.4420, 78.5430], time: "7:01 AM" },
      { name: "Noma Function Hall",    coords: [17.4380, 78.5380], time: "7:06 AM" },
      { name: "Mallapur",              coords: [17.4330, 78.5320], time: "7:11 AM" },
      { name: "Nacharam",              coords: [17.4280, 78.5250], time: "7:16 AM" },
      { name: "HMT Bus Stop",          coords: [17.4200, 78.5180], time: "7:21 AM" },
      { name: "Habsiguda X Roads",     coords: [17.4020, 78.5200], time: "7:28 AM" },
      { name: "Tarnaka",               coords: [17.4080, 78.5100], time: "7:32 AM" },
      { name: "Adikmet",               coords: [17.4050, 78.5000], time: "7:36 AM" },
      { name: "Vidyanagar",            coords: [17.4060, 78.5000], time: "7:40 AM" },
      { name: "Shankermutt",           coords: [17.4010, 78.4920], time: "7:44 AM" },
      { name: "Nallakunta",            coords: [17.4000, 78.4880], time: "7:47 AM" },
      { name: "Barkathpura X Roads",   coords: [17.4030, 78.4820], time: "7:51 AM" },
      { name: "Narayanguda",           coords: [17.3980, 78.4790], time: "7:54 AM" },
      { name: "Himayathnagar",         coords: [17.4050, 78.4730], time: "7:57 AM" },
      { name: "VCE Main Gate",         coords: VCE_COORDS,          time: "8:00 AM" },
    ]
  },
  {
    num: "6", name: "KPHB Express", status: "online", capacity: 82, driver: "Harish N", tariff: 33000,
    route: "KPHB → Erragadda → Punjagutta → NMDC → VCE",
    stops: [
      { name: "KPHB Colony",           coords: [17.4900, 78.3910], time: "6:55 AM" },
      { name: "Moosapet X Roads",      coords: [17.4700, 78.4000], time: "7:04 AM" },
      { name: "Erragadda",             coords: [17.4620, 78.4150], time: "7:10 AM" },
      { name: "ESI",                   coords: [17.4540, 78.4230], time: "7:15 AM" },
      { name: "S.R.Nagar",             coords: [17.4470, 78.4280], time: "7:20 AM" },
      { name: "Ameerpet",              coords: [17.4374, 78.4487], time: "7:26 AM" },
      { name: "Punjagutta",            coords: [17.4260, 78.4560], time: "7:31 AM" },
      { name: "Nagarjuna Circle",      coords: [17.4200, 78.4530], time: "7:36 AM" },
      { name: "Masab Tank",            coords: [17.4080, 78.4620], time: "7:41 AM" },
      { name: "NMDC",                  coords: [17.4020, 78.4710], time: "7:46 AM" },
      { name: "Mehdipatnam",           coords: [17.3999, 78.4380], time: "7:52 AM" },
      { name: "VCE Main Gate",         coords: VCE_COORDS,          time: "8:00 AM" },
    ]
  },
  {
    num: "7", name: "Bheeramguda Express", status: "online", capacity: 78, driver: "Prakash Y", tariff: 33000,
    route: "Bheeramguda → Lingampally → Kondapur → Gachibowli → VCE",
    stops: [
      { name: "Bheeramguda",           coords: [17.5200, 78.3120], time: "6:45 AM" },
      { name: "Ashok Nagar",           coords: [17.5100, 78.3200], time: "6:51 AM" },
      { name: "Lingampally X Roads",   coords: [17.4950, 78.3310], time: "6:58 AM" },
      { name: "Chandanagar",           coords: [17.4850, 78.3400], time: "7:05 AM" },
      { name: "Gangaram",              coords: [17.4780, 78.3490], time: "7:11 AM" },
      { name: "Madinaguda",            coords: [17.4700, 78.3560], time: "7:16 AM" },
      { name: "Alwyn X Roads",         coords: [17.4640, 78.3650], time: "7:21 AM" },
      { name: "Hafeezpet",             coords: [17.4870, 78.3640], time: "7:27 AM" },
      { name: "Kondapur",              coords: [17.4602, 78.3742], time: "7:33 AM" },
      { name: "Kothaguda X Roads",     coords: [17.4520, 78.3820], time: "7:38 AM" },
      { name: "Gachibowli",            coords: [17.4401, 78.3489], time: "7:45 AM" },
      { name: "ORR Junction",          coords: [17.4250, 78.3900], time: "7:51 AM" },
      { name: "VCE Main Gate",         coords: VCE_COORDS,          time: "8:00 AM" },
    ]
  },
  {
    num: "8", name: "Patancheru Shuttle", status: "online", capacity: 60, driver: "Ramesh K", tariff: 33000,
    route: "Patancheru → Bheeramguda → Gachibowli → ORR → VCE",
    stops: [
      { name: "Patancheru",            coords: [17.5370, 78.2630], time: "6:35 AM" },
      { name: "R.C. Puram",            coords: [17.5300, 78.2850], time: "6:43 AM" },
      { name: "Bheeramguda",           coords: [17.5200, 78.3120], time: "6:52 AM" },
      { name: "Ashok Nagar",           coords: [17.5100, 78.3200], time: "6:59 AM" },
      { name: "Lingampally X Roads",   coords: [17.4950, 78.3310], time: "7:08 AM" },
      { name: "Nallagandla Rythu Bazar",coords:[17.4600, 78.3270], time: "7:17 AM" },
      { name: "Seri Lingampally",      coords: [17.4680, 78.3350], time: "7:22 AM" },
      { name: "HCU Bus Depot",         coords: [17.4540, 78.3500], time: "7:29 AM" },
      { name: "Gachibowli",            coords: [17.4401, 78.3489], time: "7:38 AM" },
      { name: "ORR Junction",          coords: [17.4250, 78.3900], time: "7:48 AM" },
      { name: "VCE Main Gate",         coords: VCE_COORDS,          time: "8:00 AM" },
    ]
  },
  {
    num: "9", name: "Miyapur Express", status: "online", capacity: 85, driver: "Gopal D", tariff: 33000,
    route: "Miyapur → JNTUH → Madhapur → Gachibowli → VCE",
    stops: [
      { name: "Miyapur (Pillar 600)",  coords: [17.4964, 78.3580], time: "6:45 AM" },
      { name: "Hyderanagar",           coords: [17.4900, 78.3700], time: "6:51 AM" },
      { name: "Nizampet X Roads",      coords: [17.4840, 78.3790], time: "6:56 AM" },
      { name: "JNTUH",                 coords: [17.4935, 78.3996], time: "7:03 AM" },
      { name: "Malaysian Town Ship",   coords: [17.4820, 78.4000], time: "7:09 AM" },
      { name: "Hitech City",           coords: [17.4486, 78.3944], time: "7:18 AM" },
      { name: "Mindspace",             coords: [17.4400, 78.3800], time: "7:24 AM" },
      { name: "Gachibowli",            coords: [17.4401, 78.3489], time: "7:33 AM" },
      { name: "Outer Ring Road",       coords: [17.4250, 78.3900], time: "7:41 AM" },
      { name: "Narsingi",              coords: [17.4050, 78.3930], time: "7:50 AM" },
      { name: "VCE Main Gate",         coords: VCE_COORDS,          time: "8:00 AM" },
    ]
  },
  {
    num: "10", name: "Alwal IGS", status: "online", capacity: 77, driver: "Ramana V", tariff: 33000,
    route: "Alwal → Lothukunta → JBS → Punjagutta → Mehdipatnam → VCE",
    stops: [
      { name: "Alwal (IGS)",           coords: [17.5050, 78.5000], time: "6:50 AM" },
      { name: "Lothukunta",            coords: [17.4970, 78.4980], time: "6:56 AM" },
      { name: "Lal Bazar",             coords: [17.4880, 78.4940], time: "7:02 AM" },
      { name: "Tirumalagiri",          coords: [17.4820, 78.4880], time: "7:07 AM" },
      { name: "Kharkhana",             coords: [17.4750, 78.4820], time: "7:12 AM" },
      { name: "JBS",                   coords: [17.4680, 78.4760], time: "7:17 AM" },
      { name: "Patny",                 coords: [17.4600, 78.4700], time: "7:22 AM" },
      { name: "Paradise",              coords: [17.4540, 78.4640], time: "7:26 AM" },
      { name: "Begumpet",              coords: [17.4343, 78.4678], time: "7:31 AM" },
      { name: "Punjagutta Nagarjuna Circle", coords:[17.4260, 78.4560], time: "7:36 AM" },
      { name: "Banjara Hills",         coords: [17.4060, 78.4390], time: "7:42 AM" },
      { name: "Pension House",         coords: [17.4100, 78.4580], time: "7:46 AM" },
      { name: "Mehdipatnam Pillar 68", coords: [17.3999, 78.4380], time: "7:52 AM" },
      { name: "Rethibowli",            coords: [17.3980, 78.4430], time: "7:56 AM" },
      { name: "VCE Main Gate",         coords: VCE_COORDS,          time: "8:00 AM" },
    ]
  },
  {
    num: "11", name: "Suchitra Express", status: "online", capacity: 73, driver: "Kishore T", tariff: 33000,
    route: "Suchitra X Rds → Bowenpally → Kukatpally → Gachibowli → VCE",
    stops: [
      { name: "Suchitra X Roads",      coords: [17.5120, 78.4450], time: "6:50 AM" },
      { name: "Bowenpally X Road",     coords: [17.5010, 78.4360], time: "6:57 AM" },
      { name: "Balnagar",              coords: [17.4930, 78.4290], time: "7:03 AM" },
      { name: "Moosapet X Roads",      coords: [17.4700, 78.4000], time: "7:10 AM" },
      { name: "Kukatpally Metro",      coords: [17.4851, 78.4137], time: "7:17 AM" },
      { name: "Kukatpally",            coords: [17.4851, 78.4137], time: "7:21 AM" },
      { name: "Vivekanandanagar Colony",coords:[17.4770, 78.4050], time: "7:26 AM" },
      { name: "JNTUH",                 coords: [17.4935, 78.3996], time: "7:33 AM" },
      { name: "Hitech City",           coords: [17.4486, 78.3944], time: "7:41 AM" },
      { name: "Gachibowli",            coords: [17.4401, 78.3489], time: "7:49 AM" },
      { name: "VCE Main Gate",         coords: VCE_COORDS,          time: "8:00 AM" },
    ]
  },
  {
    num: "12", name: "Vanasthalipuram ST", status: "online", capacity: 90, driver: "Anil Rao", tariff: 33000,
    route: "Vanasthalipuram → Chintalkunta → Santhoshnagar → VCE",
    stops: [
      { name: "Vanasthalipuram Sushma Theatre", coords: [17.3280, 78.5620], time: "6:50 AM" },
      { name: "Panama",                coords: [17.3340, 78.5560], time: "6:55 AM" },
      { name: "Chintalkunta Raghavendra Hotel", coords:[17.3390, 78.5470], time: "7:01 AM" },
      { name: "Sagar Ring Road",       coords: [17.3450, 78.5360], time: "7:07 AM" },
      { name: "Bairamalguda",          coords: [17.3500, 78.5280], time: "7:12 AM" },
      { name: "Karmanghat",            coords: [17.3560, 78.5180], time: "7:17 AM" },
      { name: "Chempapet",             coords: [17.3620, 78.5080], time: "7:22 AM" },
      { name: "Santhoshnagar I.S. Sadan", coords:[17.3690, 78.4970], time: "7:28 AM" },
      { name: "VCE Main Gate",         coords: VCE_COORDS,          time: "8:00 AM" },
    ]
  },
  {
    num: "13", name: "Vanasthalipuram RB", status: "online", capacity: 85, driver: "Suresh M", tariff: 33000,
    route: "Vanasthalipuram Rythu Bazar → Gayatrinagar → VCE",
    stops: [
      { name: "Vanasthalipuram Rythu Bazar", coords:[17.3280, 78.5620], time: "6:52 AM" },
      { name: "Vydehi Nagar Circle",   coords: [17.3350, 78.5540], time: "6:58 AM" },
      { name: "B.N. Reddy Signal",     coords: [17.3410, 78.5460], time: "7:04 AM" },
      { name: "Hasthinapuram",         coords: [17.3360, 78.5380], time: "7:09 AM" },
      { name: "Omkarnagar",            coords: [17.3430, 78.5310], time: "7:14 AM" },
      { name: "Sagar Ring Road",       coords: [17.3450, 78.5360], time: "7:18 AM" },
      { name: "TKR Kaman",             coords: [17.3500, 78.5475], time: "7:24 AM" },
      { name: "Gayatrinagar",          coords: [17.3468, 78.5445], time: "7:29 AM" },
      { name: "Manda Mallamma",        coords: [17.3600, 78.5200], time: "7:35 AM" },
      { name: "Rajendra Nagar",        coords: [17.3586, 78.5070], time: "7:42 AM" },
      { name: "Attapur",               coords: [17.3612, 78.5268], time: "7:49 AM" },
      { name: "VCE Main Gate",         coords: VCE_COORDS,          time: "8:00 AM" },
    ]
  },
  {
    num: "14", name: "Saroornagar Local", status: "online", capacity: 80, driver: "Mahesh G", tariff: 33000,
    route: "Saroornagar → Saidabad → Chandrayanagutta → Attapur → VCE",
    stops: [
      { name: "Saroornagar",           coords: [17.3420, 78.5570], time: "6:55 AM" },
      { name: "Saidabad Colony",       coords: [17.3490, 78.5500], time: "7:01 AM" },
      { name: "Maadannapet Market",    coords: [17.3560, 78.5420], time: "7:07 AM" },
      { name: "Santhoshnagar I.S. Sadan", coords:[17.3690, 78.4970], time: "7:14 AM" },
      { name: "Owaisi Hospital",       coords: [17.3560, 78.5220], time: "7:20 AM" },
      { name: "Midhani X Roads",       coords: [17.3620, 78.5120], time: "7:25 AM" },
      { name: "DRDO",                  coords: [17.3640, 78.5020], time: "7:30 AM" },
      { name: "Chandrayanagutta",      coords: [17.3700, 78.4900], time: "7:36 AM" },
      { name: "Aramghar X Roads",      coords: [17.3750, 78.4830], time: "7:41 AM" },
      { name: "Rajendra Nagar",        coords: [17.3586, 78.5070], time: "7:46 AM" },
      { name: "Attapur",               coords: [17.3612, 78.5268], time: "7:52 AM" },
      { name: "VCE Main Gate",         coords: VCE_COORDS,          time: "8:00 AM" },
    ]
  },
  {
    num: "15", name: "Kalimandir Local", status: "online", capacity: 55, driver: "Ravi S", tariff: 18500,
    route: "Kalimandir → Bandlaguda → Hydershakote → VCE",
    stops: [
      { name: "Kalimandir",            coords: [17.3700, 78.4290], time: "7:10 AM" },
      { name: "Kismathpura Vivekananda Statue", coords:[17.3750, 78.4250], time: "7:15 AM" },
      { name: "Bandlaguda Jagir",      coords: [17.3810, 78.4200], time: "7:22 AM" },
      { name: "Hydershakote Village Road", coords:[17.3870, 78.4300], time: "7:29 AM" },
      { name: "SMP School",            coords: [17.3920, 78.4400], time: "7:36 AM" },
      { name: "VCE Main Gate",         coords: VCE_COORDS,          time: "8:00 AM" },
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

// Branch to bus mapping based on roll number pattern
function getBusFromRoll(roll) {
  // Roll format: 1602-YY-ROUTE-NUM where ROUTE hints at area
  // For this system we'll use the last 2 digits of branch code
  const parts = roll.split("-");
  if (parts.length < 3) return BUS_DATA[0];
  const branchCode = parseInt(parts[2]);
  // Map branch codes to bus numbers
  const mapping = {
    732: 0, 733: 2, 734: 3, 735: 6, 736: 9, 737: 11,
    738: 12, 739: 13, 740: 14, 741: 7, 742: 8, 743: 10,
    744: 4, 745: 5, 746: 1
  };
  return BUS_DATA[mapping[branchCode] ?? (branchCode % BUS_DATA.length)] || BUS_DATA[0];
}

function getNearestStop(bus, lat, lng) {
  let min = Infinity, stop = null, idx = 0;
  bus.stops.forEach((s, i) => {
    const d = haversineKm(lat, lng, s.coords[0], s.coords[1]);
    if (d < min) { min = d; stop = s; idx = i; }
  });
  return { stop, idx, distKm: min };
}

// Realistic bus position with slight jitter (traffic simulation)
function getBusPositionAtT(bus, t) {
  const stops = bus.stops, total = stops.length - 1;
  const rawSeg = t * total;
  const seg = Math.min(Math.floor(rawSeg), total - 1);
  const sT = rawSeg - seg;
  // Ease in/out per segment to simulate deceleration near stops
  const easedT = sT < 0.5 ? 2*sT*sT : -1+(4-2*sT)*sT;
  return [
    stops[seg].coords[0] + (stops[seg+1].coords[0] - stops[seg].coords[0]) * easedT,
    stops[seg].coords[1] + (stops[seg+1].coords[1] - stops[seg].coords[1]) * easedT,
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
    const pts = Array.from({length:35},()=>({x:Math.random()*c.width,y:Math.random()*c.height,vx:(Math.random()-.5)*.18,vy:(Math.random()-.5)*.18,r:Math.random()*1.5+.3,a:Math.random()*.14+.03}));
    const draw = () => {
      ctx.clearRect(0,0,c.width,c.height);
      pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(0,229,255,${p.a})`;ctx.fill();p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>c.width)p.vx*=-1;if(p.y<0||p.y>c.height)p.vy*=-1;});
      for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<90){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.strokeStyle=`rgba(0,229,255,${.035*(1-d/90)})`;ctx.stroke();}}
      raf=requestAnimationFrame(draw);
    };
    draw();
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}/>;
}

// ══════════════════════════════════════════════════════
// BARCODE SCANNER COMPONENT
// ══════════════════════════════════════════════════════
function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const readerRef = useRef(null);
  const [status, setStatus] = useState("Initializing camera...");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState("");

  useEffect(() => {
    let active = true;
    async function startScanner() {
      // Try to get camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("Point camera at your college ID barcode");
        setScanning(true);

        // Try ZXing if available
        const tryZXing = () => {
          if (window.ZXing) {
            const ZXing = window.ZXing;
            const hints = new Map();
            const formats = [
              ZXing.BarcodeFormat.CODE_128,
              ZXing.BarcodeFormat.CODE_39,
              ZXing.BarcodeFormat.EAN_13,
              ZXing.BarcodeFormat.QR_CODE,
            ];
            hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
            const reader = new ZXing.BrowserMultiFormatReader(hints);
            readerRef.current = reader;
            reader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
              if (!active) return;
              if (result) {
                const text = result.getText();
                const rollMatch = text.match(/1602[-–]\d{2}[-–]\d{3}[-–]\d{1,3}/);
                if (rollMatch) {
                  onScan(rollMatch[0].replace(/–/g, "-"));
                } else {
                  setStatus(`Scanned: "${text}" — not a valid roll format`);
                }
              }
            });
          } else {
            // Fallback: canvas frame grabbing every 200ms to try native
            setStatus("Camera active — use manual input below or try again");
          }
        };

        // Give ZXing script a moment to load
        if (window.ZXing) {
          tryZXing();
        } else {
          setTimeout(tryZXing, 2000);
        }
      } catch (err) {
        if (!active) return;
        setError("Camera access denied. Please enter your roll number manually below.");
        setScanning(false);
        setStatus("");
      }
    }
    startScanner();
    return () => {
      active = false;
      if (readerRef.current) { try { readerRef.current.reset(); } catch(e){} }
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); }
    };
  }, []);

  const submitManual = () => {
    const clean = manualInput.trim();
    if (/^1602[-]\d{2}[-]\d{3}[-]\d{1,3}$/.test(clean)) {
      onScan(clean);
    } else {
      setError("Invalid format. Use: 1602-YY-BRANCH-ROLLNO");
    }
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:700,background:"rgba(0,0,0,.97)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"min(420px,94vw)",display:"flex",flexDirection:"column",gap:16,animation:"slideUp .35s ease"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:"Syne,sans-serif",fontSize:20,fontWeight:800}}>Scan ID Card</div>
            <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>Point camera at barcode on your VCE ID</div>
          </div>
          <button onClick={onClose} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:10,padding:"8px 14px",color:"var(--muted)",fontSize:12,cursor:"pointer"}}>✕ Close</button>
        </div>

        {/* Camera viewfinder */}
        <div style={{position:"relative",background:"#000",borderRadius:18,overflow:"hidden",border:"1px solid var(--border)",aspectRatio:"4/3"}}>
          <video ref={videoRef} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} muted playsInline/>

          {/* Scan overlay */}
          {scanning && (
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {/* Corner markers */}
              {[["top","left"],["top","right"],["bottom","left"],["bottom","right"]].map(([v,h],i) => (
                <div key={i} style={{position:"absolute",[v]:20,[h]:20,width:28,height:28,borderTop:v==="top"?"2px solid var(--accent)":"none",borderBottom:v==="bottom"?"2px solid var(--accent)":"none",borderLeft:h==="left"?"2px solid var(--accent)":"none",borderRight:h==="right"?"2px solid var(--accent)":"none",animation:"cornerPulse 1.5s ease-in-out infinite",animationDelay:`${i*0.2}s`}}/>
              ))}
              {/* Scan line */}
              <div style={{position:"absolute",left:20,right:20,height:2,background:"linear-gradient(90deg,transparent,var(--accent),transparent)",animation:"scanLine 2s ease-in-out infinite alternate",boxShadow:"0 0 10px rgba(0,229,255,0.8)"}}/>
              {/* Center reticle */}
              <div style={{width:"60%",height:60,border:"1px solid rgba(0,229,255,0.3)",borderRadius:6,background:"rgba(0,229,255,0.03)"}}/>
            </div>
          )}

          {/* Status overlay */}
          <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(0,0,0,0.85))",padding:"20px 16px 14px",textAlign:"center"}}>
            {scanning && <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:4}}><span className="live-dot"/><span style={{fontSize:10,color:"var(--green)",fontWeight:700,letterSpacing:1}}>SCANNING</span></div>}
            <div style={{fontSize:12,color:"var(--muted)"}}>{status}</div>
          </div>

          {/* No camera error */}
          {!scanning && !error && (
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10}}>
              <div style={{fontSize:40}}>📷</div>
              <div style={{fontSize:13,color:"var(--muted)",textAlign:"center",padding:"0 20px"}}>Initializing camera...</div>
            </div>
          )}
        </div>

        {error && (
          <div style={{background:"rgba(255,68,68,.07)",border:"1px solid rgba(255,68,68,.25)",borderRadius:12,padding:"12px 16px",fontSize:13,color:"var(--red)"}}>
            ⚠️ {error}
          </div>
        )}

        {/* Manual fallback */}
        <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:16,padding:"16px 18px"}}>
          <div style={{fontSize:11,letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--muted)",marginBottom:10}}>Or enter manually</div>
          <div style={{display:"flex",gap:8}}>
            <input
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitManual()}
              placeholder="1602-24-735-042"
              style={{flex:1,background:"var(--bg)",border:"1px solid var(--border)",borderRadius:10,padding:"11px 14px",color:"var(--text)",fontFamily:"DM Sans,sans-serif",fontSize:14,outline:"none"}}
            />
            <button onClick={submitManual} style={{padding:"11px 16px",background:"linear-gradient(135deg,var(--accent2),var(--accent))",border:"none",borderRadius:10,color:"#fff",fontFamily:"Syne,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
              Go →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// ONBOARDING
// ══════════════════════════════════════════════════════
function Onboarding({ onLogin }) {
  const [college, setCollege] = useState("");
  const [roll, setRoll] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const validate = (r) => {
    if (college !== "vasavi") { setError("Access restricted to Vasavi College of Engineering only."); return false; }
    if (!/^1602-\d{2}-\d{3}-\d{1,3}$/.test(r)) { setError("Invalid roll. Use: 1602-YY-BRANCH-ROLLNO"); return false; }
    return true;
  };

  const login = () => {
    if (!validate(roll)) return;
    setError(""); setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(roll); }, 1000);
  };

  const handleScan = (scanned) => {
    setShowScanner(false);
    setRoll(scanned);
    setError("");
    if (college === "vasavi") {
      setLoading(true);
      setTimeout(() => { setLoading(false); onLogin(scanned); }, 900);
    }
  };

  const inp = {width:"100%",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 16px",color:"var(--text)",fontFamily:"DM Sans,sans-serif",fontSize:15,outline:"none"};

  return (
    <>
      {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
      <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"radial-gradient(ellipse at 30% 20%,rgba(0,229,255,.08),transparent 60%),radial-gradient(ellipse at 70% 80%,rgba(123,97,255,.08),transparent 60%),var(--bg)"}}>
        <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:24,padding:"48px 44px",width:"min(500px,94vw)",boxShadow:"0 32px 80px rgba(0,0,0,.6)",position:"relative",overflow:"hidden",animation:"slideUp .4s ease"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,var(--accent2),var(--accent),var(--gold))"}}/>

          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:32}}>
            <div style={{width:50,height:50,background:"linear-gradient(135deg,var(--accent2),var(--accent))",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🚌</div>
            <div style={{fontFamily:"Syne,sans-serif"}}>
              <strong style={{display:"block",fontSize:21,fontWeight:800,letterSpacing:"-.5px"}}>VCE BusTrack</strong>
              <span style={{fontSize:11,color:"var(--muted)",letterSpacing:2,textTransform:"uppercase"}}>Vasavi College of Engineering</span>
            </div>
          </div>

          <h2 style={{fontFamily:"Syne,sans-serif",fontSize:26,fontWeight:800,marginBottom:8}}>Your Bus. Your Time. 🎯</h2>
          <p style={{color:"var(--muted)",fontSize:14,marginBottom:32,lineHeight:1.6}}>Sign in with your roll number or scan your college ID barcode to get live tracking and smart departure alarms.</p>

          <div style={{marginBottom:18}}>
            <label style={{display:"block",fontSize:11,letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--muted)",marginBottom:8,fontWeight:500}}>College</label>
            <select value={college} onChange={e=>setCollege(e.target.value)} style={{...inp,WebkitAppearance:"none",color:college?"var(--text)":"var(--muted)"}}>
              <option value="">Select your college</option>
              <option value="vasavi">Vasavi College of Engineering</option>
              <option value="other">Other (Restricted)</option>
            </select>
          </div>

          <div style={{marginBottom:8}}>
            <label style={{display:"block",fontSize:11,letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--muted)",marginBottom:8,fontWeight:500}}>Roll Number</label>
            <div style={{display:"flex",gap:8}}>
              <input value={roll} onChange={e=>setRoll(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder="1602-24-735-042" style={{...inp,flex:1}}/>
              <button
                onClick={() => { if (college !== "vasavi") { setError("Please select your college first."); return; } setShowScanner(true); }}
                title="Scan barcode on ID card"
                style={{flexShrink:0,padding:"0 14px",background:"rgba(0,229,255,.08)",border:"1px solid rgba(0,229,255,.25)",borderRadius:12,color:"var(--accent)",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 5h2M3 5v2M3 5h2m16 0h-2m2 0v2m0-2h-2M3 19h2m-2 0v-2m0 2h2m16 0h-2m2 0v-2m0 2h-2"/>
                  <rect x="7" y="7" width="3" height="10" rx="1"/>
                  <rect x="14" y="7" width="3" height="10" rx="1"/>
                </svg>
              </button>
            </div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:6,opacity:.7,lineHeight:1.6}}>
              Route → Bus: ECIL→B1/B1B · Chnth.CkPost→B2 · Nagole→B3 · Uppal→B4 · MoulaAli→B5 · KPHB→B6 · Bheermgd→B7 · Ptanchru→B8 · Miyapur→B9 · Alwal→B10 · Suchitra→B11 · Vanasth.ST→B12 · Vanasth.RB→B13 · Saroor→B14 · Kalimandir→B15
            </div>
          </div>

          {/* Scan ID CTA banner */}
          <button
            onClick={() => { if (college !== "vasavi") { setError("Please select your college first."); return; } setShowScanner(true); }}
            style={{width:"100%",marginTop:16,padding:"13px",background:"rgba(0,229,255,.05)",border:"1px dashed rgba(0,229,255,.3)",borderRadius:12,color:"var(--accent)",fontFamily:"DM Sans,sans-serif",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}
          >
            <span style={{fontSize:18}}>📷</span>
            <span>Scan your college ID barcode to login instantly</span>
          </button>

          <button onClick={login} disabled={loading} style={{width:"100%",padding:15,background:loading?"rgba(255,255,255,.06)":"linear-gradient(135deg,var(--accent2),var(--accent))",border:"none",borderRadius:12,color:"#fff",fontFamily:"Syne,sans-serif",fontSize:15,fontWeight:700,cursor:loading?"default":"pointer",letterSpacing:".5px",marginTop:12,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            {loading ? <><span style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 1s linear infinite",display:"inline-block"}}/> Locating your bus...</> : "Access My Dashboard →"}
          </button>
          {error && <div style={{color:"var(--red)",fontSize:13,marginTop:12,lineHeight:1.5}}>⚠️ {error}</div>}
        </div>
      </div>
    </>
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
        <h2 style={{fontFamily:"Syne,sans-serif",fontSize:26,fontWeight:800,color:"var(--red)",marginBottom:10}}>TIME TO LEAVE!</h2>
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
              No buses within walking distance. Call transport: <strong>+91-40-2351-0177</strong>
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
                {[{icon:"📍",l:"Board at",v:alt.stop.name},{icon:"🚶",l:"Walk",v:`${alt.walkMins} min`},{icon:"🚌",l:"Bus ETA",v:`~${alt.busEta} min`}].map(({icon,l,v},j)=>(
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
          <button onClick={onDismiss} style={{padding:"13px",background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,color:"var(--text)",fontFamily:"Syne,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer"}}>Close</button>
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

    const mid = bus.stops[Math.floor(bus.stops.length/2)].coords;
    const map = L.map(mapRef.current, { center: mid, zoom:12, attributionControl:false });
    mapInst.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom:19}).addTo(map);

    const line = L.polyline(bus.stops.map(s=>s.coords), {color:"#00e5ff",weight:3,opacity:.7,dashArray:"8,6"}).addTo(map);
    map.fitBounds(line.getBounds(), {padding:[50,50]});

    bus.stops.forEach((stop, i) => {
      const isMine = stop.name === nearestStop?.name, isLast = i === bus.stops.length-1;
      const sz = isLast||isMine?18:9;
      const ic = L.divIcon({
        html:`<div style="width:${sz}px;height:${sz}px;background:${isLast?"#ffc94a":isMine?"#00e5ff":"rgba(255,255,255,0.35)"};border-radius:50%;border:2px solid ${isLast?"#ffc94a":isMine?"#00e5ff":"rgba(255,255,255,0.2)"};box-shadow:${isMine?"0 0 12px rgba(0,229,255,0.7)":"none"}"></div>`,
        className:"", iconSize:[sz,sz], iconAnchor:[sz/2,sz/2]
      });
      L.marker(stop.coords, {icon:ic}).addTo(map)
        .bindPopup(`<strong>${stop.name}</strong><br><span style="color:#6b7a96;font-size:11px">${stop.time}${isMine?" · <span style='color:#00e5ff'>📍 Your Stop</span>":""}</span>`);
    });

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
  const [busT, setBusT] = useState(0.05);
  const [speed, setSpeed] = useState(bus.speed || 38);
  const [showAlarm, setShowAlarm] = useState(false);
  const [showMissed, setShowMissed] = useState(false);
  const [alarmDone, setAlarmDone] = useState(false);
  const [leafletOk, setLeafletOk] = useState(false);
  const [tab, setTab] = useState("home");
  const animRef = useRef(null);
  const alarmFired = useRef(false);
  const missedFired = useRef(false);
  const speedJitter = useRef(0);

  useEffect(() => { const c=()=>{ if(window.L) setLeafletOk(true); else setTimeout(c,300);}; c(); },[]);

  const requestLoc = () => {
    if (!navigator.geolocation) { useDemoLoc(); return; }
    navigator.geolocation.watchPosition(
      p => { setSLat(p.coords.latitude); setSLng(p.coords.longitude); setLocGranted(true); setLocError(false); },
      () => useDemoLoc(),
      { enableHighAccuracy:true, maximumAge:5000 }
    );
  };

  const useDemoLoc = () => {
    // Place student near the 2nd stop of their bus
    const anchorStop = bus.stops[Math.min(2, bus.stops.length-2)];
    setSLat(anchorStop.coords[0] + 0.003);
    setSLng(anchorStop.coords[1] + 0.003);
    setLocGranted(true); setLocError(true);
  };

  const requestNotif = () => {
    if ("Notification" in window) Notification.requestPermission().then(p => setNotifGranted(p==="granted"));
  };

  // ── Realistic simulation: 12-minute full cycle, variable speed ──
  useEffect(() => {
    // 12 min cycle → ~720 seconds → each frame ~16ms
    // We want busT to go 0→1 in ~720 * 60fps = 43200 frames
    // Increment per frame: 1/43200 ≈ 0.0000231
    // But we also simulate stops (bus pauses ~3-5s at each stop)
    const CYCLE_FRAMES = 43200; // 12 min at 60fps
    const BASE_INC = 1 / CYCLE_FRAMES;
    const stops = bus.stops.length - 1;

    let frame = 0;
    const go = () => {
      setBusT(t => {
        const seg = t * stops;
        const nearStop = Math.abs(seg - Math.round(seg)) < 0.015; // near a stop
        if (nearStop) return t; // pause at stop
        // Traffic jitter: random speed variation ±30%
        const jitter = 0.7 + Math.random() * 0.6;
        const inc = BASE_INC * jitter * (bus.status === "delayed" ? 0.65 : 1);
        const n = t + inc;
        return n >= 1 ? 0.02 : n;
      });
      // Speed display: vary realistically
      speedJitter.current = (speedJitter.current + 1) % 90;
      if (speedJitter.current === 0) {
        const baseSpeed = bus.status === "delayed" ? 22 : 38;
        setSpeed(Math.max(0, baseSpeed + Math.floor(Math.random() * 20 - 8)));
      }
      animRef.current = requestAnimationFrame(go);
    };
    animRef.current = requestAnimationFrame(go);
    return () => cancelAnimationFrame(animRef.current);
  }, [bus]);

  const busPos = getBusPositionAtT(bus, busT);
  const { stop: myStop, idx: myStopIdx, distKm: distToStop } = sLat
    ? getNearestStop(bus, sLat, sLng)
    : { stop: bus.stops[1] || bus.stops[0], idx: 1, distKm: 0.3 };

  const busDistToMyStop = haversineKm(busPos[0], busPos[1], myStop.coords[0], myStop.coords[1]);
  const busEta = Math.max(1, Math.round((busDistToMyStop / Math.max(speed, 10)) * 60));
  const walkTime = walkMins(distToStop);
  const leaveIn = Math.max(0, busEta - walkTime - 2);
  const leaveSoon = leaveIn <= 5;
  const leaveNow = leaveIn === 0;
  const busPassedMyStop = busT * (bus.stops.length-1) > myStopIdx + 0.85;

  useEffect(() => {
    if (leaveIn <= 5 && leaveIn > 0 && !alarmFired.current && !alarmDone && locGranted) {
      alarmFired.current = true; setShowAlarm(true);
      if (notifGranted) new Notification(`🚌 Bus B${bus.num}`, { body: `Leave in ${leaveIn} min for ${myStop.name}!` });
    }
    if (leaveIn > 5) alarmFired.current = false;
  }, [leaveIn, locGranted]);

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
        {/* HOME TAB */}
        {tab === "home" && (
          <div style={{display:"flex",flexDirection:"column",gap:14,animation:"fadeIn .3s ease"}}>
            {/* Bus chip */}
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:20,padding:"18px 20px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,var(--accent2),var(--accent))"}}/>
              <div style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>👤 {roll}</div>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <div style={{background:"linear-gradient(135deg,var(--accent2),var(--accent))",borderRadius:10,padding:"6px 14px",fontFamily:"Syne,sans-serif",fontSize:18,fontWeight:800}}>B{bus.num}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"Syne,sans-serif",fontSize:15,fontWeight:700}}>{bus.name}</div>
                  <div style={{fontSize:11,color:"var(--muted)",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{bus.route}</div>
                </div>
                <span style={{flexShrink:0,display:"flex",alignItems:"center",gap:5,fontSize:11,color:statusCol,background:`${statusCol}18`,border:`1px solid ${statusCol}35`,borderRadius:20,padding:"3px 10px",fontWeight:700}}>
                  <span style={{width:5,height:5,borderRadius:"50%",background:statusCol,display:"inline-block",animation:bus.status==="online"?"pulse 1.5s infinite":undefined}}/>{bus.status}
                </span>
              </div>
              <div style={{marginTop:10,fontSize:11,color:"var(--muted)"}}>
                🎫 ₹{bus.tariff?.toLocaleString()}/yr · {bus.stops.length} stops · 🧑‍✈️ {bus.driver}
              </div>
            </div>

            {!locGranted && (
              <div style={{background:"rgba(123,97,255,.08)",border:"1px solid rgba(123,97,255,.25)",borderRadius:16,padding:"18px 20px"}}>
                <div style={{fontFamily:"Syne,sans-serif",fontSize:16,fontWeight:700,marginBottom:6}}>📍 Enable Your Location</div>
                <div style={{fontSize:13,color:"var(--muted)",marginBottom:14,lineHeight:1.6}}>Required to calculate walk time, detect if you miss your bus, and trigger the leave alarm at the right moment.</div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <button onClick={requestLoc} style={{padding:"11px 20px",background:"linear-gradient(135deg,var(--accent2),var(--accent))",border:"none",borderRadius:10,color:"#fff",fontFamily:"Syne,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer"}}>Share Location →</button>
                  <button onClick={requestNotif} style={{padding:"11px 16px",background:"var(--card)",border:"1px solid var(--border)",borderRadius:10,color:"var(--muted)",fontFamily:"DM Sans,sans-serif",fontSize:13,cursor:"pointer"}}>🔔 Enable Alerts</button>
                </div>
              </div>
            )}

            {locError && (
              <div style={{background:"rgba(255,201,74,.06)",border:"1px solid rgba(255,201,74,.2)",borderRadius:10,padding:"10px 14px",fontSize:12,color:"var(--gold)"}}>
                ⚠️ Using demo location (near your route's stop 3) — real GPS unavailable in this environment
              </div>
            )}

            {locGranted && !notifGranted && (
              <div style={{background:"rgba(0,229,255,.05)",border:"1px solid rgba(0,229,255,.18)",borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                <div style={{fontSize:12,color:"var(--muted)"}}>🔔 Enable notifications to receive the alarm when app is in background</div>
                <button onClick={requestNotif} style={{flexShrink:0,padding:"7px 13px",background:"rgba(0,229,255,.1)",border:"1px solid rgba(0,229,255,.3)",borderRadius:9,color:"var(--accent)",fontFamily:"Syne,sans-serif",fontSize:11,fontWeight:700,cursor:"pointer"}}>Enable</button>
              </div>
            )}

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

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[
                    {i:"🏎",l:"Speed",v:`${speed} km/h`,c:"var(--accent)"},
                    {i:"👥",l:"Capacity",v:`${bus.capacity}%`,c:"var(--gold)"},
                    {i:"🧑‍✈️",l:"Driver",v:bus.driver,c:"var(--green)"},
                    {i:"📏",l:"Bus Away",v:`${busDistToMyStop.toFixed(1)} km`,c:"var(--accent2)"},
                  ].map(({i,l,v,c},idx)=>(
                    <div key={idx} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,padding:"13px 15px"}}>
                      <div style={{fontSize:10,color:"var(--muted)",marginBottom:4}}>{i} {l}</div>
                      <div style={{fontFamily:"Syne,sans-serif",fontSize:15,fontWeight:700,color:c,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{v}</div>
                    </div>
                  ))}
                </div>

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

        {/* MAP TAB */}
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
              <div style={{position:"absolute",bottom:14,left:14,zIndex:999,background:"rgba(8,12,20,.93)",backdropFilter:"blur(10px)",border:"1px solid var(--border)",borderRadius:12,padding:"10px 14px",fontSize:11,display:"flex",flexDirection:"column",gap:5,pointerEvents:"none"}}>
                {[{e:"🚌",t:`Bus B${bus.num}`},{e:"🧑",t:"You"},{e:"⚡",t:`Your stop`}].map(({e,t},i)=>(
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

        {/* STOPS TAB */}
        {tab === "stops" && (
          <div style={{animation:"fadeIn .3s ease"}}>
            <div style={{fontFamily:"Syne,sans-serif",fontSize:18,fontWeight:800,marginBottom:4}}>B{bus.num} — {bus.name}</div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:16}}>{bus.stops.length} stops · {bus.route}</div>
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
                      {!passed && !current && <span style={{fontSize:11,color:"var(--gold)"}}>~{etaMins} min away</span>}
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
  const filtered = BUS_DATA.filter(b => (filter==="all"||b.status===filter) && (!search||b.num.toLowerCase().includes(search)||b.name.toLowerCase().includes(search)||b.route.toLowerCase().includes(search)));

  const totalBuses = BUS_DATA.length;
  const onlineBuses = BUS_DATA.filter(b=>b.status==="online").length;
  const delayedBuses = BUS_DATA.filter(b=>b.status==="delayed").length;
  const totalStudents = BUS_DATA.reduce((a,b)=>a+b.capacity,0);

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",paddingBottom:32}}>
      <div style={{position:"sticky",top:0,zIndex:50,background:"rgba(8,12,20,.96)",backdropFilter:"blur(20px)",borderBottom:"1px solid var(--border)",padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between",height:58}}>
        <div style={{fontFamily:"Syne,sans-serif",fontSize:16,fontWeight:800}}>Fleet <span style={{color:"var(--accent)"}}>Overview</span></div>
        <button onClick={onBack} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:9,padding:"5px 13px",color:"var(--muted)",fontSize:11,cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>← My Bus</button>
      </div>
      <div style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {[
            {n:onlineBuses,l:"Online",c:"var(--green)"},
            {n:delayedBuses,l:"Delayed",c:"var(--gold)"},
            {n:totalBuses,l:"Total",c:"var(--accent)"},
            {n:totalStudents,l:"Seats",c:"var(--accent2)"},
          ].map(({n,l,c},i)=>(
            <div key={i} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:"14px 10px",textAlign:"center"}}>
              <div style={{fontFamily:"Syne,sans-serif",fontSize:22,fontWeight:800,color:c}}>{n}</div>
              <div style={{fontSize:9,color:"var(--muted)",textTransform:"uppercase",letterSpacing:1,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:140,background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
            <span style={{color:"var(--muted)"}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value.toLowerCase())} placeholder="Search buses..." style={{background:"none",border:"none",outline:"none",color:"var(--text)",fontSize:13,width:"100%",fontFamily:"DM Sans,sans-serif"}}/>
          </div>
          {["all","online","delayed"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:"10px 13px",background:"var(--card)",border:`1px solid ${filter===f?"var(--accent)":"var(--border)"}`,borderRadius:11,color:filter===f?"var(--accent)":"var(--muted)",fontSize:11,cursor:"pointer",fontFamily:"DM Sans,sans-serif",textTransform:"capitalize"}}>{f}</button>
          ))}
        </div>

        {filtered.map(bus=>(
          <div key={bus.num} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:16,padding:"15px 16px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{background:"linear-gradient(135deg,var(--accent2),var(--accent))",borderRadius:9,padding:"5px 12px",fontFamily:"Syne,sans-serif",fontSize:15,fontWeight:800,flexShrink:0}}>B{bus.num}</div>
                <div style={{minWidth:0}}>
                  <div style={{fontFamily:"Syne,sans-serif",fontSize:14,fontWeight:700}}>{bus.name}</div>
                  <div style={{fontSize:11,color:"var(--muted)",marginTop:1}}>🧑‍✈️ {bus.driver} · ₹{bus.tariff?.toLocaleString()}/yr</div>
                </div>
              </div>
              <span style={{fontSize:11,color:SC[bus.status],background:`${SC[bus.status]}15`,border:`1px solid ${SC[bus.status]}30`,borderRadius:20,padding:"3px 10px",fontWeight:700,flexShrink:0}}>{bus.status}</span>
            </div>
            <div style={{fontSize:11,color:"var(--muted)",marginBottom:10,lineHeight:1.5}}>{bus.route}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {[{l:"Stops",v:bus.stops.length},{l:"Speed",v:bus.status!=="offline"?bus.speed+" km/h":"—"},{l:"Seats",v:bus.capacity}].map(({l,v},i)=>(
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
