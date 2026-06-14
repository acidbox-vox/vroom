/**
 * objects.js — Tron Legacy Command Room
 * Two layouts, picked at boot time based on device orientation:
 *
 *   PORTRAIT  720×960  — 2 columns × 3 rows of orbs, tall room
 *   LANDSCAPE 1200×700 — 2 columns × 3 rows of orbs, wide+short room
 *
 * Both layouts share the same content/object definitions, only the
 * x/y/width/height of each object differ (room proportions adapt to
 * the screen so players get a full-width/full-height room either way).
 *
 * actionType "system"      → SYS-01..06, editable name+link (admin always;
 *                             SYS-01..03 also editable by level2 user)
 *                             SYS-06 additionally has level2-username
 *                             setter + announcement-ticker section
 *                             visible to admin only
 * actionType "central_monitor" → admin broadcast screen + ticker
 *
 * Each "system" object is drawn as a small glowing orb (see game.js
 * _drawOrbTerminal) with a 100×100 tap target — much smaller than the
 * visual, leaving large open floor for walking. The visible orb+aura
 * is centered within the tap target, and the collision box is a
 * further-reduced box (TERMINAL_VIS_SCALE) so players can brush past.
 */

// Collision-box scale relative to the hitbox — orb terminals are small,
// so the collidable area is slightly smaller than the tap target,
// letting players brush past without bumping into invisible edges.
export const TERMINAL_VIS_SCALE = 0.65;

function _collideBox(x, y, width, height, scale = TERMINAL_VIS_SCALE) {
  const w = width * scale, h = height * scale;
  return { x: x + (width - w) / 2, y: y + (height - h) / 2, width: w, height: h };
}

/* ── Shared content for each system object (name/desc/icon/flags) ── */
const SYS_META = {
  sys_01: { name: "SYS-01 · กำลังพล",   description: "ระบบบริหารกำลังพล",              icon: "👥", editableByLevel2: true  },
  sys_02: { name: "SYS-02 · งบประมาณ",  description: "ระบบบริหารงบประมาณ",             icon: "💰", editableByLevel2: true  },
  sys_03: { name: "SYS-03 · สถิติ",     description: "ระบบ Dashboard & Analytics",     icon: "📊", editableByLevel2: true  },
  sys_04: { name: "SYS-04 · แผนงาน",    description: "ระบบแผนงานและโครงการ",           icon: "📋", editableByLevel2: false },
  sys_05: { name: "SYS-05 · ติดตาม",    description: "ระบบติดตามและประเมินผล",         icon: "🎯", editableByLevel2: false },
  sys_06: { name: "SYS-06 · รายงาน",    description: "ระบบรายงานและเอกสาร",            icon: "📄", editableByLevel2: false, hasLevel2AdminSection: true },
};

const CENTRAL_META = {
  id: "central_monitor",
  name: "CENTRAL MONITOR",
  description: "จอแสดงข้อความจากผู้บัญชาการ — กดเพื่ออ่าน",
  icon: "📡",
  actionType: "central_monitor",
  actionValue: "",
  _isCentral: true,
};

/* Build a full object list from a layout's geometry map */
function _buildLayout(WORLD_W, WORLD_H, geo) {
  const raw = [
    { ...CENTRAL_META, ...geo.central_monitor },
    ...Object.keys(SYS_META).map(id => ({
      id,
      ...SYS_META[id],
      actionType: "system",
      actionValue: "",
      ...geo[id],
    })),
  ];
  const ROOM_OBJECTS = raw.map(obj => {
    if (obj.actionType === 'system') {
      return { ...obj, collideBox: _collideBox(obj.x, obj.y, obj.width, obj.height) };
    }
    return obj;
  });
  return { WORLD_W, WORLD_H, ROOM_OBJECTS };
}

/* ═══════════════════════════════════════════════════════════════
   PORTRAIT — 720×960 (mobile, tall room)
   Room interior: x:40–680, y:40–920
═══════════════════════════════════════════════════════════════ */
const PORTRAIT_GEO = {
  central_monitor: { x: 100, y: 56,  width: 520, height: 200 },
  sys_01: { x: 169, y: 370, width: 100, height: 100 },
  sys_02: { x: 169, y: 570, width: 100, height: 100 },
  sys_03: { x: 169, y: 770, width: 100, height: 100 },
  sys_04: { x: 451, y: 370, width: 100, height: 100 },
  sys_05: { x: 451, y: 570, width: 100, height: 100 },
  sys_06: { x: 451, y: 770, width: 100, height: 100 },
};

/* ═══════════════════════════════════════════════════════════════
   LANDSCAPE — 1200×700 (desktop / landscape phone, wide room)
   Room interior: x:40–1160, y:40–660
═══════════════════════════════════════════════════════════════ */
const LANDSCAPE_GEO = {
  central_monitor: { x: 250, y: 56,  width: 700, height: 130 },
  sys_01: { x: 270, y: 215, width: 100, height: 100 },
  sys_02: { x: 270, y: 373, width: 100, height: 100 },
  sys_03: { x: 270, y: 531, width: 100, height: 100 },
  sys_04: { x: 830, y: 215, width: 100, height: 100 },
  sys_05: { x: 830, y: 373, width: 100, height: 100 },
  sys_06: { x: 830, y: 531, width: 100, height: 100 },
};

const PORTRAIT_LAYOUT  = _buildLayout(720,  960, PORTRAIT_GEO);
const LANDSCAPE_LAYOUT = _buildLayout(1200, 700, LANDSCAPE_GEO);

/**
 * getLayout(isLandscape) → { WORLD_W, WORLD_H, ROOM_OBJECTS }
 * Picks the room layout matching the device/window orientation.
 */
export function getLayout(isLandscape) {
  return isLandscape ? LANDSCAPE_LAYOUT : PORTRAIT_LAYOUT;
}
