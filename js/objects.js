/**
 * objects.js — Tron Legacy Command Room
 * Two layouts, picked at boot time based on device orientation:
 *
 *   PORTRAIT  720×1200  — 2 columns × 5 rows of orbs, tall room
 *   LANDSCAPE 1400×700  — 2 columns × 5 rows of orbs, wide+short room
 *
 * Both layouts share the same content/object definitions, only the
 * x/y/width/height of each object differ (room proportions adapt to
 * the screen so players get a full-width/full-height room either way).
 *
 * actionType "system"      → SYS-01..10, editable name+link.
 *                             SYS-01..03: admin OR level2 user.
 *                             SYS-04..10: admin only.
 *                             SYS-06 additionally has level2-username
 *                             setter + announcement-ticker section
 *                             visible to admin only.
 *                             Each orb also has an admin-only color
 *                             picker (10 preset colors).
 * actionType "central_monitor" → admin broadcast screen + ticker
 * actionType "music_player"    → Tron jukebox: admin sets up to 10
 *                             track URLs (.mp3/.ogg), random autoplay
 *                             on room join, everyone can mute/unmute
 *                             their own playback.
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

/* ── Orb color presets — admin can pick any of these per-orb ──────
   Stored as a hex string "#rrggbb"; default per-orb falls back to
   the original cyan/orange scheme until an admin customizes it.   */
export const ORB_COLOR_PRESETS = [
  { id: 'cyan',    label: 'ฟ้าไซแอน',  hex: '#22e5ff' },
  { id: 'orange',  label: 'ส้มอำพัน',  hex: '#ff8c1a' },
  { id: 'magenta', label: 'ม่วงแดง',   hex: '#ff2bd6' },
  { id: 'green',   label: 'เขียวมรกต', hex: '#23ff8c' },
  { id: 'yellow',  label: 'เหลืองทอง', hex: '#ffd60a' },
  { id: 'red',     label: 'แดงเพลิง',  hex: '#ff3b3b' },
  { id: 'blue',    label: 'น้ำเงิน',   hex: '#3b7bff' },
  { id: 'purple',  label: 'ม่วงไฟฟ้า', hex: '#a23bff' },
  { id: 'white',   label: 'ขาวบริสุทธิ์', hex: '#e8f4ff' },
  { id: 'pink',    label: 'ชมพูนีออน', hex: '#ff6ec7' },
];

/* ── Shared content for each system object (name/desc/icon/flags) ── */
const SYS_META = {
  sys_01: { name: "SYS-01 · กำลังพล",   description: "ระบบบริหารกำลังพล",              icon: "👥", editableByLevel2: true  },
  sys_02: { name: "SYS-02 · งบประมาณ",  description: "ระบบบริหารงบประมาณ",             icon: "💰", editableByLevel2: true  },
  sys_03: { name: "SYS-03 · สถิติ",     description: "ระบบ Dashboard & Analytics",     icon: "📊", editableByLevel2: true  },
  sys_04: { name: "SYS-04 · แผนงาน",    description: "ระบบแผนงานและโครงการ",           icon: "📋", editableByLevel2: false },
  sys_05: { name: "SYS-05 · ติดตาม",    description: "ระบบติดตามและประเมินผล",         icon: "🎯", editableByLevel2: false },
  sys_06: { name: "SYS-06 · รายงาน",    description: "ระบบรายงานและเอกสาร",            icon: "📄", editableByLevel2: false, hasLevel2AdminSection: true },
  sys_07: { name: "SYS-07 · ระบบเพิ่มเติม", description: "ระบบใหม่",                    icon: "🧩", editableByLevel2: false },
  sys_08: { name: "SYS-08 · ระบบเพิ่มเติม", description: "ระบบใหม่",                    icon: "🧩", editableByLevel2: false },
  sys_09: { name: "SYS-09 · ระบบเพิ่มเติม", description: "ระบบใหม่",                    icon: "🧩", editableByLevel2: false },
  sys_10: { name: "SYS-10 · ระบบเพิ่มเติม", description: "ระบบใหม่",                    icon: "🧩", editableByLevel2: false },
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

const MUSIC_META = {
  id: "music_player",
  name: "JUKEBOX",
  description: "เครื่องเล่นเพลงประจำห้อง — สุ่มเล่นเพลงอัตโนมัติ",
  icon: "🎵",
  actionType: "music_player",
  actionValue: "",
};

/* Build a full object list from a layout's geometry map */
function _buildLayout(WORLD_W, WORLD_H, geo) {
  const raw = [
    { ...CENTRAL_META, ...geo.central_monitor },
    { ...MUSIC_META,   ...geo.music_player },
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
   PORTRAIT — 720×1200 (mobile, tall room)
   Room interior: x:40–680, y:40–1160
   2 columns × 5 rows of orbs below the monitor, jukebox floats
   between the two columns near the bottom.
═══════════════════════════════════════════════════════════════ */
const PORTRAIT_GEO = {
  central_monitor: { x: 100, y: 56,  width: 520, height: 200 },
  sys_01: { x: 169, y: 340, width: 100, height: 100 },
  sys_02: { x: 169, y: 510, width: 100, height: 100 },
  sys_03: { x: 169, y: 680, width: 100, height: 100 },
  sys_04: { x: 169, y: 850, width: 100, height: 100 },
  sys_05: { x: 169, y: 1020,width: 100, height: 100 },
  sys_06: { x: 451, y: 340, width: 100, height: 100 },
  sys_07: { x: 451, y: 510, width: 100, height: 100 },
  sys_08: { x: 451, y: 680, width: 100, height: 100 },
  sys_09: { x: 451, y: 850, width: 100, height: 100 },
  sys_10: { x: 451, y: 1020,width: 100, height: 100 },
  music_player: { x: 285, y: 1085, width: 150, height: 90 },
};

/* ═══════════════════════════════════════════════════════════════
   LANDSCAPE — 1400×700 (desktop / landscape phone, wide room)
   Room interior: x:40–1360, y:40–660
   2 columns × 5 rows, jukebox floats between the columns.
═══════════════════════════════════════════════════════════════ */
const LANDSCAPE_GEO = {
  central_monitor: { x: 350, y: 50,  width: 700, height: 110 },
  sys_01: { x: 230, y: 196, width: 100, height: 100 },
  sys_02: { x: 230, y: 320, width: 100, height: 100 },
  sys_03: { x: 230, y: 444, width: 100, height: 100 },
  sys_04: { x: 230, y: 568, width: 100, height: 100 },
  sys_05: { x: 380, y: 568, width: 100, height: 100 },
  sys_06: { x: 1070,y: 196, width: 100, height: 100 },
  sys_07: { x: 1070,y: 320, width: 100, height: 100 },
  sys_08: { x: 1070,y: 444, width: 100, height: 100 },
  sys_09: { x: 1070,y: 568, width: 100, height: 100 },
  sys_10: { x: 920, y: 568, width: 100, height: 100 },
  music_player: { x: 605, y: 240, width: 190, height: 110 },
};

const PORTRAIT_LAYOUT  = _buildLayout(720,  1200, PORTRAIT_GEO);
const LANDSCAPE_LAYOUT = _buildLayout(1400, 700,  LANDSCAPE_GEO);

/**
 * getLayout(isLandscape) → { WORLD_W, WORLD_H, ROOM_OBJECTS }
 * Picks the room layout matching the device/window orientation.
 */
export function getLayout(isLandscape) {
  return isLandscape ? LANDSCAPE_LAYOUT : PORTRAIT_LAYOUT;
}
