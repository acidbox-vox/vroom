/**
 * objects.js — Tron Legacy Command Room
 * Single room 960×768, 6 system terminals + central monitor
 *
 * Layout (room interior: x:60–900, y:60–708):
 *   Central Monitor — top center (admin broadcasts)
 *   6 System terminals — arranged symmetrically L/R walls + bottom
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
  // SYS-01  ··  SYS-02  (left wall, top → bottom)
  // ══════════════════════════════════════════════════════════════
  {
    id: "sys_01",
    name: "SYS-01 · กำลังพล",
    description: "ระบบบริหารกำลังพล",
    icon: "👥",
    x: 68, y: 140, width: 130, height: 100,
    actionType: "url",
    actionValue: "https://example.com/sys01",
  },
  {
    id: "sys_02",
    name: "SYS-02 · งบประมาณ",
    description: "ระบบบริหารงบประมาณ",
    icon: "💰",
    x: 68, y: 300, width: 130, height: 100,
    actionType: "url",
    actionValue: "https://example.com/sys02",
  },
  {
    id: "sys_03",
    name: "SYS-03 · สถิติ",
    description: "ระบบ Dashboard & Analytics",
    icon: "📊",
    x: 68, y: 460, width: 130, height: 100,
    actionType: "url",
    actionValue: "https://example.com/sys03",
  },

  // ══════════════════════════════════════════════════════════════
  // SYS-04  ··  SYS-06  (right wall, top → bottom)
  // ══════════════════════════════════════════════════════════════
  {
    id: "sys_04",
    name: "SYS-04 · แผนงาน",
    description: "ระบบแผนงานและโครงการ",
    icon: "📋",
    x: 762, y: 140, width: 130, height: 100,
    actionType: "url",
    actionValue: "https://example.com/sys04",
  },
  {
    id: "sys_05",
    name: "SYS-05 · ติดตาม",
    description: "ระบบติดตามและประเมินผล",
    icon: "🎯",
    x: 762, y: 300, width: 130, height: 100,
    actionType: "url",
    actionValue: "https://example.com/sys05",
  },
  {
    id: "sys_06",
    name: "SYS-06 · รายงาน",
    description: "ระบบรายงานและเอกสาร",
    icon: "📄",
    x: 762, y: 460, width: 130, height: 100,
    actionType: "url",
    actionValue: "https://example.com/sys06",
  },

];

export function getObjectById(id) {
  return ROOM_OBJECTS.find(o => o.id === id);
}
