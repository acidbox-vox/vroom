/**
 * objects.js — Tron Legacy Command Room
 * Single room 960×768, 6 system terminals + central monitor
 *
 * Layout (room interior: x:60–900, y:60–708):
 *   Central Monitor — top center (admin broadcasts)
 *   6 System terminals — arranged symmetrically L/R walls
 *
 * actionType "system"      → SYS-01..06, editable name+link (admin always;
 *                             SYS-01..03 also editable by level2 user)
 *                             SYS-06 additionally has level2-username
 *                             setter section visible to admin only
 * actionType "central_monitor" → admin broadcast screen
 */

export const ROOM_OBJECTS = [

  // ══════════════════════════════════════════════════════════════
  // CENTRAL MONITOR — admin broadcast display (top center)
  // ══════════════════════════════════════════════════════════════
  {
    id: "central_monitor",
    name: "CENTRAL MONITOR",
    description: "จอแสดงข้อความจากผู้บัญชาการ — กดเพื่ออ่าน",
    icon: "📡",
    x: 360, y: 68, width: 240, height: 110,
    actionType: "central_monitor",
    actionValue: "",          // filled by admin at runtime via Firebase
    _isCentral: true,
  },

  // ══════════════════════════════════════════════════════════════
  // SYS-01 .. 03  (left wall, top → bottom) — editable by admin + level2
  // ══════════════════════════════════════════════════════════════
  {
    id: "sys_01",
    name: "SYS-01 · กำลังพล",
    description: "ระบบบริหารกำลังพล",
    icon: "👥",
    x: 68, y: 140, width: 130, height: 100,
    actionType: "system",
    actionValue: "",
    editableByLevel2: true,
  },
  {
    id: "sys_02",
    name: "SYS-02 · งบประมาณ",
    description: "ระบบบริหารงบประมาณ",
    icon: "💰",
    x: 68, y: 300, width: 130, height: 100,
    actionType: "system",
    actionValue: "",
    editableByLevel2: true,
  },
  {
    id: "sys_03",
    name: "SYS-03 · สถิติ",
    description: "ระบบ Dashboard & Analytics",
    icon: "📊",
    x: 68, y: 460, width: 130, height: 100,
    actionType: "system",
    actionValue: "",
    editableByLevel2: true,
  },

  // ══════════════════════════════════════════════════════════════
  // SYS-04 .. 06  (right wall, top → bottom) — admin only
  // ══════════════════════════════════════════════════════════════
  {
    id: "sys_04",
    name: "SYS-04 · แผนงาน",
    description: "ระบบแผนงานและโครงการ",
    icon: "📋",
    x: 762, y: 140, width: 130, height: 100,
    actionType: "system",
    actionValue: "",
    editableByLevel2: false,
  },
  {
    id: "sys_05",
    name: "SYS-05 · ติดตาม",
    description: "ระบบติดตามและประเมินผล",
    icon: "🎯",
    x: 762, y: 300, width: 130, height: 100,
    actionType: "system",
    actionValue: "",
    editableByLevel2: false,
  },
  {
    id: "sys_06",
    name: "SYS-06 · รายงาน",
    description: "ระบบรายงานและเอกสาร",
    icon: "📄",
    x: 762, y: 460, width: 130, height: 100,
    actionType: "system",
    actionValue: "",
    editableByLevel2: false,
    hasLevel2AdminSection: true, // adds level2-username setter for admin
  },

];

export function getObjectById(id) {
  return ROOM_OBJECTS.find(o => o.id === id);
}
