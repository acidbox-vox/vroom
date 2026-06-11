/**
 * objects.js — 6-room layout matching the reference image
 *
 * Room layout (world 1200×960):
 *   CENTRAL COMMAND  x:300  y:40   w:420  h:280  (top-center, largest)
 *   DATA BAY         x:760  y:40   w:380  h:280  (top-right)
 *   MACRO STATION    x:40   y:360  w:340  h:260  (mid-left)
 *   RISK DESK        x:420  y:360  w:340  h:260  (mid-right)
 *   SIM LAB          x:40   y:660  w:340  h:260  (bot-left)
 *   QUANT CORNER     x:420  y:660  w:380  h:260  (bot-right)
 *
 * Corridors connect rooms with arrows (decorative only)
 */

export const ROOM_OBJECTS = [

  // ══════════════════════════════════════════════════════
  // CENTRAL COMMAND — top center, multi-monitor command desk
  // ══════════════════════════════════════════════════════
  {
    id: "cc_monitor_main",
    name: "Main Display",
    description: "จอแสดงสถานการณ์หลัก",
    icon: "🖥️",
    x: 420, y: 70, width: 180, height: 90,
    actionType: "modal",
    actionValue: `<h3 style='color:#4ade80;margin-bottom:12px'>📡 Central Command</h3>
<p>● System Status: <span style='color:#4ade80'>ONLINE</span></p>
<p style='margin-top:6px'>● Active Operators: 4</p>
<p style='margin-top:6px'>● Last Update: 09:42</p>`,
  },
  {
    id: "cc_desk",
    name: "Command Desk",
    description: "โต๊ะควบคุมกลาง",
    icon: "💻",
    x: 440, y: 200, width: 140, height: 60,
    actionType: "url",
    actionValue: "https://example.com/command",
  },
  {
    id: "cc_side_left",
    name: "Workstation A",
    description: "สถานีงานฝั่งซ้าย",
    icon: "🖥️",
    x: 320, y: 120, width: 80, height: 60,
    actionType: "url",
    actionValue: "https://example.com/ws-a",
  },
  {
    id: "cc_plant",
    name: "ต้นไม้",
    description: "",
    icon: "🌿",
    x: 308, y: 68, width: 30, height: 36,
    actionType: "text",
    actionValue: "<p style='text-align:center;font-size:36px'>🌿</p>",
  },

  // ══════════════════════════════════════════════════════
  // DATA BAY — top right, server racks
  // ══════════════════════════════════════════════════════
  {
    id: "db_rack1",
    name: "Server Rack A",
    description: "Primary server cluster",
    icon: "🖥️",
    x: 790, y: 70, width: 56, height: 100,
    actionType: "text",
    actionValue: `<div style='text-align:center;padding:16px'>
<div style='font-size:36px;margin-bottom:8px'>🖥️</div>
<h3 style='color:#22d3ee'>Rack A — Online</h3>
<p style='color:#4ade80;margin-top:8px'>CPU 34% | RAM 58%</p></div>`,
  },
  {
    id: "db_rack2",
    name: "Server Rack B",
    description: "Backup cluster",
    icon: "💾",
    x: 860, y: 70, width: 56, height: 100,
    actionType: "text",
    actionValue: `<div style='text-align:center;padding:16px'>
<div style='font-size:36px;margin-bottom:8px'>💾</div>
<h3 style='color:#22d3ee'>Rack B — Syncing</h3>
<p style='color:#fbbf24;margin-top:8px'>Last backup 02:00</p></div>`,
  },
  {
    id: "db_rack3",
    name: "Server Rack C",
    description: "Storage array",
    icon: "🖥️",
    x: 930, y: 70, width: 56, height: 100,
    actionType: "text",
    actionValue: `<div style='text-align:center;padding:16px'>
<div style='font-size:36px;margin-bottom:8px'>🖥️</div>
<h3 style='color:#22d3ee'>Rack C — Storage</h3>
<p style='color:#4ade80;margin-top:8px'>Disk 72% used</p></div>`,
  },
  {
    id: "db_workstation",
    name: "Operator Terminal",
    description: "จุดควบคุม Data Bay",
    icon: "💻",
    x: 1010, y: 160, width: 70, height: 50,
    actionType: "url",
    actionValue: "https://example.com/databay",
  },

  // ══════════════════════════════════════════════════════
  // MACRO STATION — mid left, 3 large monitors
  // ══════════════════════════════════════════════════════
  {
    id: "ms_monitors",
    name: "Macro Monitors",
    description: "จอภาพ macro ทั้ง 3 จอ",
    icon: "📊",
    x: 60, y: 385, width: 270, height: 80,
    actionType: "url",
    actionValue: "https://example.com/macro",
  },
  {
    id: "ms_desk",
    name: "Macro Desk",
    description: "โต๊ะ Macro Station",
    icon: "💻",
    x: 100, y: 490, width: 180, height: 55,
    actionType: "url",
    actionValue: "https://example.com/macro-desk",
  },

  // ══════════════════════════════════════════════════════
  // RISK DESK — mid right, shield monitors + desk
  // ══════════════════════════════════════════════════════
  {
    id: "rd_monitors",
    name: "Risk Monitors",
    description: "จอภาพ Risk Management",
    icon: "🛡️",
    x: 440, y: 385, width: 270, height: 80,
    actionType: "modal",
    actionValue: `<h3 style='color:#f87171;margin-bottom:12px'>🛡️ Risk Dashboard</h3>
<p>● VaR (1d): <span style='color:#4ade80'>-1.2%</span></p>
<p style='margin-top:6px'>● Exposure: <span style='color:#fbbf24'>Moderate</span></p>
<p style='margin-top:6px'>● Alerts: <span style='color:#4ade80'>None</span></p>`,
  },
  {
    id: "rd_desk",
    name: "Risk Desk",
    description: "โต๊ะ Risk Analyst",
    icon: "🖥️",
    x: 480, y: 490, width: 180, height: 55,
    actionType: "url",
    actionValue: "https://example.com/risk",
  },

  // ══════════════════════════════════════════════════════
  // SIM LAB — bottom left, server racks wall
  // ══════════════════════════════════════════════════════
  {
    id: "sl_rack_row1a",
    name: "Sim Rack 1",
    description: "Simulation cluster",
    icon: "🖥️",
    x: 60, y: 685, width: 48, height: 80,
    actionType: "text",
    actionValue: "<div style='text-align:center;padding:16px'><div style='font-size:36px'>🖥️</div><h3 style='color:#22d3ee;margin-top:8px'>Sim Rack 1</h3><p style='color:#4ade80'>Running</p></div>",
  },
  {
    id: "sl_rack_row1b",
    name: "Sim Rack 2",
    description: "Simulation cluster",
    icon: "🖥️",
    x: 118, y: 685, width: 48, height: 80,
    actionType: "text",
    actionValue: "<div style='text-align:center;padding:16px'><div style='font-size:36px'>🖥️</div><h3 style='color:#22d3ee;margin-top:8px'>Sim Rack 2</h3><p style='color:#4ade80'>Running</p></div>",
  },
  {
    id: "sl_rack_row1c",
    name: "Sim Rack 3",
    description: "Simulation cluster",
    icon: "🖥️",
    x: 176, y: 685, width: 48, height: 80,
    actionType: "text",
    actionValue: "<div style='text-align:center;padding:16px'><div style='font-size:36px'>🖥️</div><h3 style='color:#22d3ee;margin-top:8px'>Sim Rack 3</h3><p style='color:#fbbf24'>Warm standby</p></div>",
  },
  {
    id: "sl_desk",
    name: "Sim Operator",
    description: "โต๊ะควบคุม Simulation",
    icon: "💻",
    x: 80, y: 810, width: 160, height: 55,
    actionType: "url",
    actionValue: "https://example.com/simlab",
  },

  // ══════════════════════════════════════════════════════
  // QUANT CORNER — bottom right, charts + desk
  // ══════════════════════════════════════════════════════
  {
    id: "qc_chart_board",
    name: "Chart Board",
    description: "กระดานกราฟและสูตร",
    icon: "📈",
    x: 440, y: 685, width: 300, height: 80,
    actionType: "modal",
    actionValue: `<h3 style='color:#a78bfa;margin-bottom:12px'>📈 Quant Models</h3>
<p>● Alpha: <span style='color:#4ade80'>+0.34</span></p>
<p style='margin-top:6px'>● Sharpe: <span style='color:#4ade80'>1.82</span></p>
<p style='margin-top:6px'>● Drawdown: <span style='color:#f87171'>-4.1%</span></p>`,
  },
  {
    id: "qc_desk",
    name: "Quant Desk",
    description: "โต๊ะ Quantitative Analyst",
    icon: "💻",
    x: 520, y: 800, width: 160, height: 55,
    actionType: "url",
    actionValue: "https://example.com/quant",
  },

];

export function getObjectById(id) {
  return ROOM_OBJECTS.find(o => o.id === id);
}
