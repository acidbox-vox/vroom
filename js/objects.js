/**
 * objects.js — minimal single room, 64px grid
 * World: 1024 x 768
 * Room area: x:64–960  y:64–704
 * Objects arranged neatly on a 64px grid
 */

export const ROOM_OBJECTS = [

  // ── North wall: 3 desks + computers ──────────────────────────
  {
    id: "computer01",
    name: "ระบบกำลังพล",
    description: "เปิดระบบรายงานกำลังพล",
    icon: "💻",
    x: 128, y: 96, width: 56, height: 40,
    actionType: "url",
    actionValue: "https://example.com/personnel",
  },
  {
    id: "computer02",
    name: "ระบบงบประมาณ",
    description: "ดูรายงานงบประมาณประจำปี",
    icon: "🖥️",
    x: 384, y: 96, width: 56, height: 40,
    actionType: "url",
    actionValue: "https://example.com/budget",
  },
  {
    id: "computer03",
    name: "Dashboard",
    description: "ดูสถิติและตัวเลขสำคัญ",
    icon: "📊",
    x: 640, y: 96, width: 56, height: 40,
    actionType: "url",
    actionValue: "https://example.com/dashboard",
  },

  // ── Board (east wall) ─────────────────────────────────────────
  {
    id: "board01",
    name: "กระดานประกาศ",
    description: "แจ้งข้อมูลข่าวสารประจำวัน",
    icon: "📋",
    x: 832, y: 128, width: 96, height: 64,
    actionType: "modal",
    actionValue: `<h3 style='margin-bottom:12px;color:#4ade80'>📋 ประกาศประจำวัน</h3>
<p>• ประชุมประจำสัปดาห์ วันอังคาร 09:00 น.</p>
<p style='margin-top:6px'>• ส่งรายงานประจำเดือนภายในวันที่ 25</p>
<p style='margin-top:6px'>• อบรม IT Security วันศุกร์ 13:00 น.</p>`,
  },

  // ── Center: sofa + table ──────────────────────────────────────
  {
    id: "sofa01",
    name: "โซฟา",
    description: "นั่งพักผ่อน พูดคุย",
    icon: "🛋️",
    x: 384, y: 352, width: 128, height: 52,
    actionType: "text",
    actionValue: "<p style='text-align:center;font-size:36px;margin-top:16px'>🛋️</p><p style='text-align:center;color:#a78bfa'>ผ่อนคลาย...</p>",
  },
  {
    id: "cooler01",
    name: "ตู้น้ำเย็น",
    description: "พักผ่อนและดื่มน้ำ",
    icon: "🧊",
    x: 576, y: 352, width: 48, height: 56,
    actionType: "text",
    actionValue: `<div style='text-align:center;padding:16px'>
<div style='font-size:40px;margin-bottom:8px'>🧊</div>
<p style='color:#60a5fa;font-size:15px'>ดื่มน้ำให้เพียงพอ 8 แก้วต่อวัน</p></div>`,
  },

  // ── Corner plants (4 corners) ─────────────────────────────────
  {
    id: "plant01",
    name: "ต้นไม้มุมห้อง",
    description: "ต้นไม้ประดับ",
    icon: "🪴",
    x: 72, y: 72, width: 40, height: 40,
    actionType: "text",
    actionValue: "<p style='text-align:center;font-size:40px'>🪴</p>",
  },
  {
    id: "plant02",
    name: "ต้นไม้มุมห้อง",
    description: "ต้นไม้ประดับ",
    icon: "🌿",
    x: 912, y: 72, width: 40, height: 40,
    actionType: "text",
    actionValue: "<p style='text-align:center;font-size:40px'>🌿</p>",
  },
  {
    id: "plant03",
    name: "ต้นปาล์ม",
    description: "ต้นไม้ประดับ",
    icon: "🌴",
    x: 72, y: 628, width: 40, height: 48,
    actionType: "text",
    actionValue: "<p style='text-align:center;font-size:40px'>🌴</p>",
  },
  {
    id: "plant04",
    name: "ต้นปาล์ม",
    description: "ต้นไม้ประดับ",
    icon: "🌳",
    x: 912, y: 628, width: 40, height: 48,
    actionType: "text",
    actionValue: "<p style='text-align:center;font-size:40px'>🌳</p>",
  },

  // ── South: Server + Trophy ────────────────────────────────────
  {
    id: "server01",
    name: "Server",
    description: "เซิร์ฟเวอร์หลักของระบบ",
    icon: "🖥️",
    x: 192, y: 568, width: 56, height: 68,
    actionType: "text",
    actionValue: `<div style='text-align:center;padding:16px'>
<div style='font-size:40px;margin-bottom:12px'>🖥️</div>
<h3 style='color:#22d3ee'>Server Status</h3>
<p style='color:#4ade80;margin-top:8px'>● Online — 99.9% uptime</p>
<p style='color:#7a8299;margin-top:4px'>CPU: 34% | RAM: 58%</p></div>`,
  },
  {
    id: "trophy01",
    name: "ถ้วยรางวัล",
    description: "รางวัลผลงานดีเด่น",
    icon: "🏆",
    x: 768, y: 568, width: 48, height: 52,
    actionType: "text",
    actionValue: `<div style='text-align:center;padding:20px'>
<div style='font-size:48px;margin-bottom:12px'>🏆</div>
<h3 style='color:#fbbf24'>รางวัลผลงานดีเด่น</h3>
<p style='color:#7a8299;margin-top:8px'>หน่วยงานดีเด่นประจำปี 2567</p></div>`,
  },
];

export function getObjectById(id) {
  return ROOM_OBJECTS.find(o => o.id === id);
}
