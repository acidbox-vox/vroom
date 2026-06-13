/**
 * objects.js — Tron Legacy Command Room (portrait layout)
 * Single room 720×960, 6 system terminals + central monitor
 *
 * Layout (room interior: x:40–680, y:40–920):
 *   Central Monitor — top, wide (admin broadcasts + marquee ticker)
 *   6 System terminals — 2 columns (left/right) × 3 rows
 *
 * actionType "system"      → SYS-01..06, editable name+link (admin always;
 *                             SYS-01..03 also editable by level2 user)
 *                             SYS-06 additionally has level2-username
 *                             setter + announcement-ticker section
 *                             visible to admin only
 * actionType "central_monitor" → admin broadcast screen + ticker
 */

export const ROOM_OBJECTS = [

  // ══════════════════════════════════════════════════════════════
  // CENTRAL MONITOR — admin broadcast display (top, wide)
  // ══════════════════════════════════════════════════════════════
  {
    id: "central_monitor",
    name: "CENTRAL MONITOR",
    description: "จอแสดงข้อความจากผู้บัญชาการ — กดเพื่ออ่าน",
    icon: "📡",
    x: 100, y: 56, width: 520, height: 200,
    actionType: "central_monitor",
    actionValue: "",          // filled by admin at runtime via Firebase
    _isCentral: true,
  },

  // ══════════════════════════════════════════════════════════════
  // SYS-01 .. 03  (left column, top → bottom) — editable by admin + level2
  // ══════════════════════════════════════════════════════════════
  {
    id: "sys_01",
    name: "SYS-01 · กำลังพล",
    description: "ระบบบริหารกำลังพล",
    icon: "👥",
    x: 56, y: 320, width: 280, height: 130,
    actionType: "system",
    actionValue: "",
    editableByLevel2: true,
  },
  {
    id: "sys_02",
    name: "SYS-02 · งบประมาณ",
    description: "ระบบบริหารงบประมาณ",
    icon: "💰",
    x: 56, y: 500, width: 280, height: 130,
    actionType: "system",
    actionValue: "",
    editableByLevel2: true,
  },
  {
    id: "sys_03",
    name: "SYS-03 · สถิติ",
    description: "ระบบ Dashboard & Analytics",
    icon: "📊",
    x: 56, y: 680, width: 280, height: 130,
    actionType: "system",
    actionValue: "",
    editableByLevel2: true,
  },

  // ══════════════════════════════════════════════════════════════
  // SYS-04 .. 06  (right column, top → bottom) — admin only
  // ══════════════════════════════════════════════════════════════
  {
    id: "sys_04",
    name: "SYS-04 · แผนงาน",
    description: "ระบบแผนงานและโครงการ",
    icon: "📋",
    x: 384, y: 320, width: 280, height: 130,
    actionType: "system",
    actionValue: "",
    editableByLevel2: false,
  },
  {
    id: "sys_05",
    name: "SYS-05 · ติดตาม",
    description: "ระบบติดตามและประเมินผล",
    icon: "🎯",
    x: 384, y: 500, width: 280, height: 130,
    actionType: "system",
    actionValue: "",
    editableByLevel2: false,
  },
  {
    id: "sys_06",
    name: "SYS-06 · รายงาน",
    description: "ระบบรายงานและเอกสาร",
    icon: "📄",
    x: 384, y: 680, width: 280, height: 130,
    actionType: "system",
    actionValue: "",
    editableByLevel2: false,
    hasLevel2AdminSection: true, // adds level2-username setter + ticker for admin
  },

];

export function getObjectById(id) {
  return ROOM_OBJECTS.find(o => o.id === id);
}
