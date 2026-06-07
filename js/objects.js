/**
 * objects.js — layout matching Gather.town reference
 * Rooms:
 *   ROOM1 ทีมปฏิบัติการ  x:100-480  y:80-360
 *   ROOM2 ห้องประชุม      x:520-860  y:80-300
 *   ROOM3 ห้องพักผ่อน    x:380-700  y:400-660
 *   ROOM4 ฝ่ายสนับสนุน   x:900-1200 y:80-380
 *   ROOM5 ห้องเก็บของ    x:100-340  y:600-840
 *   ROOM6 ห้อง IT        x:560-900  y:580-840
 *   ROOM7 ห้องผู้บริหาร  x:940-1200 y:460-840
 */

export const ROOM_OBJECTS = [

  // ══════════════════════════════════════════
  // ROOM 1 — ทีมปฏิบัติการ (top-left)
  // ══════════════════════════════════════════
  {
    id: "computer01",
    name: "ระบบกำลังพล",
    description: "เปิดระบบรายงานกำลังพล",
    icon: "💻",
    x: 130, y: 140, width: 60, height: 44,
    actionType: "url",
    actionValue: "https://example.com/personnel",
  },
  {
    id: "computer02",
    name: "ระบบงบประมาณ",
    description: "ดูรายงานงบประมาณประจำปี",
    icon: "🖥️",
    x: 220, y: 140, width: 60, height: 44,
    actionType: "url",
    actionValue: "https://example.com/budget",
  },
  {
    id: "computer03",
    name: "ระบบแผนงาน",
    description: "บริหารแผนงานประจำปี",
    icon: "💻",
    x: 310, y: 140, width: 60, height: 44,
    actionType: "url",
    actionValue: "https://example.com/plan",
  },
  {
    id: "computer04",
    name: "ระบบรายงาน",
    description: "สรุปรายงานผลการดำเนินงาน",
    icon: "🖥️",
    x: 130, y: 240, width: 60, height: 44,
    actionType: "url",
    actionValue: "https://example.com/report",
  },
  {
    id: "computer05",
    name: "ฐานข้อมูล",
    description: "เข้าถึงฐานข้อมูลกลาง",
    icon: "💻",
    x: 220, y: 240, width: 60, height: 44,
    actionType: "url",
    actionValue: "https://example.com/database",
  },
  {
    id: "plant01",
    name: "ต้นไม้มุมห้อง",
    description: "ต้นไม้ประดับ ช่วยให้บรรยากาศดี",
    icon: "🪴",
    x: 430, y: 100, width: 36, height: 36,
    actionType: "text",
    actionValue: "<p style='text-align:center;font-size:40px'>🪴</p><p style='text-align:center;color:#4ade80'>ต้นไม้สุขภาพดี!</p>",
  },
  {
    id: "plant02",
    name: "ต้นไม้ประดับ",
    description: "",
    icon: "🌿",
    x: 430, y: 300, width: 36, height: 36,
    actionType: "text",
    actionValue: "<p style='text-align:center;font-size:40px'>🌿</p>",
  },

  // ══════════════════════════════════════════
  // ROOM 2 — ห้องประชุม (top-center)
  // ══════════════════════════════════════════
  {
    id: "board01",
    name: "กระดานประกาศ",
    description: "แจ้งข้อมูลข่าวสารประจำวัน",
    icon: "📋",
    x: 540, y: 100, width: 100, height: 70,
    actionType: "modal",
    actionValue: `<h3 style='margin-bottom:12px;color:#4ade80'>📋 ประกาศประจำวัน</h3>
<p>• ประชุมประจำสัปดาห์ วันอังคาร 09:00 น.</p>
<p style='margin-top:6px'>• ส่งรายงานประจำเดือนภายในวันที่ 25</p>
<p style='margin-top:6px'>• อบรม IT Security วันศุกร์ 13:00 น.</p>`,
  },
  {
    id: "tv01",
    name: "TV ห้องประชุม",
    description: "เปิดดูการประชุมออนไลน์",
    icon: "📺",
    x: 680, y: 100, width: 80, height: 56,
    actionType: "url",
    actionValue: "https://meet.google.com",
  },
  {
    id: "sofa01",
    name: "โซฟา",
    description: "นั่งพักในห้องประชุม",
    icon: "🛋️",
    x: 560, y: 210, width: 120, height: 50,
    actionType: "text",
    actionValue: "<p style='text-align:center;font-size:36px;margin-top:16px'>🛋️</p><p style='text-align:center;color:#a78bfa'>ผ่อนคลายสักครู่...</p>",
  },
  {
    id: "plant03",
    name: "ต้นปาล์ม",
    description: "",
    icon: "🌴",
    x: 820, y: 100, width: 36, height: 48,
    actionType: "text",
    actionValue: "<p style='text-align:center;font-size:40px'>🌴</p>",
  },

  // ══════════════════════════════════════════
  // ROOM 3 — ห้องพักผ่อน (center)
  // ══════════════════════════════════════════
  {
    id: "sofa02",
    name: "โซฟากลาง",
    description: "นั่งพักผ่อน พูดคุย",
    icon: "🛋️",
    x: 400, y: 490, width: 130, height: 55,
    actionType: "text",
    actionValue: "<p style='text-align:center;font-size:36px;margin-top:16px'>🛋️</p><p style='text-align:center;color:#a78bfa'>ผ่อนคลาย...</p>",
  },
  {
    id: "cooler01",
    name: "ตู้น้ำเย็น",
    description: "พักผ่อนและดื่มน้ำ",
    icon: "🧊",
    x: 650, y: 420, width: 44, height: 60,
    actionType: "text",
    actionValue: `<div style='text-align:center;padding:16px'>
<div style='font-size:40px;margin-bottom:8px'>🧊</div>
<p style='color:#60a5fa;font-size:15px'>ดื่มน้ำให้เพียงพอ 8 แก้วต่อวัน</p></div>`,
  },
  {
    id: "plant04",
    name: "ต้นไม้ใหญ่",
    description: "",
    icon: "🌳",
    x: 395, y: 410, width: 40, height: 48,
    actionType: "text",
    actionValue: "<p style='text-align:center;font-size:40px'>🌳</p>",
  },
  {
    id: "plant05",
    name: "ต้นไม้ประดับ",
    description: "",
    icon: "🪴",
    x: 655, y: 610, width: 36, height: 40,
    actionType: "text",
    actionValue: "<p style='text-align:center;font-size:40px'>🪴</p>",
  },

  // ══════════════════════════════════════════
  // ROOM 4 — ฝ่ายสนับสนุน (top-right)
  // ══════════════════════════════════════════
  {
    id: "dashboard01",
    name: "Dashboard สถิติ",
    description: "ดูสถิติและตัวเลขสำคัญ",
    icon: "📊",
    x: 920, y: 140, width: 72, height: 52,
    actionType: "url",
    actionValue: "https://example.com/dashboard",
  },
  {
    id: "computer06",
    name: "CRM ระบบลูกค้า",
    description: "จัดการข้อมูลลูกค้า",
    icon: "🖥️",
    x: 1020, y: 140, width: 60, height: 44,
    actionType: "url",
    actionValue: "https://example.com/crm",
  },
  {
    id: "computer07",
    name: "ระบบ Helpdesk",
    description: "รับเรื่องและติดตามปัญหา",
    icon: "💻",
    x: 1110, y: 140, width: 60, height: 44,
    actionType: "url",
    actionValue: "https://example.com/helpdesk",
  },
  {
    id: "printer01",
    name: "เครื่องพิมพ์",
    description: "ส่งงานพิมพ์",
    icon: "🖨️",
    x: 920, y: 250, width: 54, height: 46,
    actionType: "text",
    actionValue: `<div style='text-align:center;padding:16px'>
<div style='font-size:40px;margin-bottom:12px'>🖨️</div>
<h3 style='color:#fbbf24;margin-bottom:8px'>HP LaserJet Pro</h3>
<p>สถานะ: <span style='color:#4ade80'>พร้อมใช้งาน</span></p>
<p style='margin-top:6px;color:#7a8299'>กระดาษคงเหลือ: 250 แผ่น</p></div>`,
  },
  {
    id: "plant06",
    name: "ต้นปาล์ม",
    description: "",
    icon: "🌴",
    x: 1155, y: 310, width: 36, height: 48,
    actionType: "text",
    actionValue: "<p style='text-align:center;font-size:40px'>🌴</p>",
  },

  // ══════════════════════════════════════════
  // ROOM 5 — ห้องเก็บของ (bottom-left)
  // ══════════════════════════════════════════
  {
    id: "doc01",
    name: "คู่มือปฏิบัติงาน",
    description: "คู่มือการปฏิบัติงานประจำปี",
    icon: "📄",
    x: 120, y: 640, width: 56, height: 60,
    actionType: "text",
    actionValue: `<h3 style='margin-bottom:12px;color:#60a5fa'>📄 คู่มือการปฏิบัติงาน</h3>
<p><strong>บทที่ 1</strong> — ขั้นตอนการรับงาน</p>
<p style='margin:6px 0 0 12px;color:#7a8299'>รับคำสั่งงานจากผู้บังคับบัญชา ตรวจสอบความถูกต้องก่อนดำเนินการ</p>
<p style='margin-top:10px'><strong>บทที่ 2</strong> — การรายงานผล</p>
<p style='margin:6px 0 0 12px;color:#7a8299'>รายงานความก้าวหน้าทุกวันศุกร์ก่อน 16:00 น.</p>`,
  },
  {
    id: "image01",
    name: "แผนที่สำนักงาน",
    description: "ดูแผนที่และผังพื้นที่ทำงาน",
    icon: "🗺️",
    x: 210, y: 640, width: 76, height: 56,
    actionType: "image",
    actionValue: "https://placehold.co/800x500/1c2030/4ade80?text=Office+Map",
  },

  // ══════════════════════════════════════════
  // ROOM 6 — ห้อง IT (bottom-center)
  // ══════════════════════════════════════════
  {
    id: "server01",
    name: "Server Rack",
    description: "เซิร์ฟเวอร์หลักของระบบ",
    icon: "🖥️",
    x: 580, y: 610, width: 56, height: 70,
    actionType: "text",
    actionValue: `<div style='text-align:center;padding:16px'>
<div style='font-size:40px;margin-bottom:12px'>🖥️</div>
<h3 style='color:#22d3ee'>Server Status</h3>
<p style='color:#4ade80;margin-top:8px'>● Online — 99.9% uptime</p>
<p style='color:#7a8299;margin-top:4px'>CPU: 34% | RAM: 58% | Disk: 72%</p></div>`,
  },
  {
    id: "server02",
    name: "Backup Server",
    description: "เซิร์ฟเวอร์สำรอง",
    icon: "💾",
    x: 660, y: 610, width: 56, height: 70,
    actionType: "text",
    actionValue: `<div style='text-align:center;padding:16px'>
<div style='font-size:40px;margin-bottom:12px'>💾</div>
<h3 style='color:#22d3ee'>Backup Server</h3>
<p style='color:#4ade80;margin-top:8px'>● Syncing — Last backup 02:00</p></div>`,
  },
  {
    id: "network01",
    name: "Network Switch",
    description: "อุปกรณ์เครือข่าย",
    icon: "🔌",
    x: 750, y: 620, width: 60, height: 48,
    actionType: "text",
    actionValue: `<div style='text-align:center;padding:16px'>
<div style='font-size:40px;margin-bottom:12px'>🔌</div>
<h3 style='color:#fbbf24'>Network Switch</h3>
<p style='color:#4ade80;margin-top:8px'>48-port Gigabit — Active</p></div>`,
  },
  {
    id: "plant07",
    name: "ต้นไม้ IT",
    description: "",
    icon: "🌿",
    x: 860, y: 620, width: 32, height: 40,
    actionType: "text",
    actionValue: "<p style='text-align:center;font-size:40px'>🌿</p>",
  },

  // ══════════════════════════════════════════
  // ROOM 7 — ห้องผู้บริหาร (bottom-right)
  // ══════════════════════════════════════════
  {
    id: "computer08",
    name: "คอมผู้บริหาร",
    description: "ระบบงานผู้บริหาร",
    icon: "💻",
    x: 960, y: 510, width: 70, height: 52,
    actionType: "url",
    actionValue: "https://example.com/executive",
  },
  {
    id: "sofa03",
    name: "โซฟาผู้บริหาร",
    description: "นั่งประชุมแบบไม่เป็นทางการ",
    icon: "🛋️",
    x: 960, y: 640, width: 130, height: 55,
    actionType: "text",
    actionValue: "<p style='text-align:center;font-size:36px;margin-top:16px'>🛋️</p><p style='text-align:center;color:#fbbf24'>ห้องผู้บริหาร</p>",
  },
  {
    id: "trophy01",
    name: "ถ้วยรางวัล",
    description: "รางวัลผลงานดีเด่น",
    icon: "🏆",
    x: 1140, y: 510, width: 48, height: 52,
    actionType: "text",
    actionValue: `<div style='text-align:center;padding:20px'>
<div style='font-size:48px;margin-bottom:12px'>🏆</div>
<h3 style='color:#fbbf24'>รางวัลผลงานดีเด่น</h3>
<p style='color:#7a8299;margin-top:8px'>หน่วยงานดีเด่นประจำปี 2567</p></div>`,
  },
  {
    id: "plant08",
    name: "ต้นไม้ผู้บริหาร",
    description: "",
    icon: "🌳",
    x: 1155, y: 760, width: 40, height: 50,
    actionType: "text",
    actionValue: "<p style='text-align:center;font-size:40px'>🌳</p>",
  },

];

export function getObjectById(id) {
  return ROOM_OBJECTS.find(o => o.id === id);
}
