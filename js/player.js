/**
 * player.js — Randomized appearance system + chat bubbles + click-to-move
 * Appearance stored as flat fields compatible with Firebase rules
 */

import { IDLE_TIMEOUT_MS } from './config.js';

export const PLAYER_SPEED = 160;
/* ── Admin ──────────────────────────────────────────────────── */
const ADMIN_SECRET = '0910655667';
export function isAdmin(username) {
  return String(username).trim() === ADMIN_SECRET;
}

export const PLAYER_SIZE  = 32;

/* ═══════════════════════════════════════════════════════════════
   APPEARANCE SYSTEM
   สุ่มจาก pool แยกตามชาย/หญิง
   เก็บเป็น avatarIndex = index ใน AVATAR_POOL (0-99)
   ส่ง Firebase เป็น number เดียว ผ่าน rule <= 99
═══════════════════════════════════════════════════════════════ */

// Skin tones (shared)
const SKINS = [0xfde8c8, 0xf4c28a, 0xe8a870, 0xd48060, 0xc07040, 0x8d5524];
// Hair colors (shared)
const HAIRS = [0x1a1a1a, 0x3d2b1f, 0x8b5020, 0xc8a050, 0xf0e0b0, 0xe83030, 0x9b30e8, 0x30b8e8];
// Shirt colors (shared)
const SHIRTS = [0x4a9eff,0xe05555,0x55c070,0xf0a030,0xb06edd,0x40cccc,0xff6090,0xf0e040,0xff8c42,0x60d080,0xc084fc,0x7090e0,0xe8505a,0x50c8a0,0xffb347];
// Hat types: 0=none, 1=cap, 2=beanie, 3=straw, 4=beret
const HATS = [0,0,0,1,1,2,3,4]; // weighted: more no-hat
// Items: 0=none, 1=coffee, 2=phone, 3=laptop bag, 4=book, 5=flower
const ITEMS = [0,0,0,1,2,3,4,5];
// Hair styles male: 0=short, 1=side-part, 2=messy, 3=buzz
// Hair styles female: 0=long, 1=ponytail, 2=bun, 3=bob
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

export function randomAppearance(gender) {
  return {
    gender:     gender,           // 'm' | 'f'
    skinIdx:    Math.floor(Math.random() * SKINS.length),
    hairIdx:    Math.floor(Math.random() * HAIRS.length),
    shirtIdx:   Math.floor(Math.random() * SHIRTS.length),
    hairStyle:  Math.floor(Math.random() * 4),   // 0-3
    hatType:    pick(HATS),                       // 0-4
    itemType:   pick(ITEMS),                      // 0-5
    pantsIdx:   Math.floor(Math.random() * 6),    // 0-5
  };
}

// Serialize appearance → single avatarIndex number (for Firebase compat)
// We encode as JSON string in a side-channel; avatarIndex stays 0 for DB rule pass
// Better: store appearance as separate top-level fields, update DB rules
export function packAppearance(ap) {
  // pack into a number 0-9999 just for DB rule (not used for rendering)
  return 0;
}

// pants color pool
const PANTS_POOL = [0x2d3a70, 0x3a2a20, 0x2a4030, 0x4a3010, 0x3a2a60, 0x205050,
                    0x602040, 0x304060, 0x604010, 0x205030];

/* ── Resolve appearance object (accepts both old index and new ap) ── */
export function resolveAp(data) {
  // new system: gender field present
  if (data && data.gender) return data;
  // fallback for old avatarIndex
  const idx = Number(data?.avatarIndex ?? data ?? 0) % 12;
  const isFemale = idx >= 6;
  return {
    gender:    isFemale ? 'f' : 'm',
    skinIdx:   idx % SKINS.length,
    hairIdx:   idx % HAIRS.length,
    shirtIdx:  idx % SHIRTS.length,
    hairStyle: idx % 4,
    hatType:   0,
    itemType:  0,
    pantsIdx:  idx % PANTS_POOL.length,
  };
}

/* ═══════════════════════════════════════════════════════════════
   CANVAS DRAW — full character with hat + item
═══════════════════════════════════════════════════════════════ */
function hexCss(hex) { return '#' + ('000000'+(hex>>>0).toString(16)).slice(-6); }
function darken(hex, a) {
  return ((Math.max(0,((hex>>16)&0xff)-Math.round(255*a))<<16)|
          (Math.max(0,((hex>>8) &0xff)-Math.round(255*a))<<8)|
          (Math.max(0,(hex      &0xff)-Math.round(255*a))));
}

function drawCharCanvas(ctx, W, H, ap, isLocal) {
  const cx = W / 2, cy = H * 0.72;
  const skin    = hexCss(SKINS[ap.skinIdx  % SKINS.length]);
  const skinD   = hexCss(darken(SKINS[ap.skinIdx % SKINS.length], 0.15));
  const hair    = hexCss(HAIRS[ap.hairIdx  % HAIRS.length]);
  const shirt   = hexCss(SHIRTS[ap.shirtIdx % SHIRTS.length]);
  const shirtD  = hexCss(darken(SHIRTS[ap.shirtIdx % SHIRTS.length], 0.22));
  const pants   = hexCss(PANTS_POOL[ap.pantsIdx % PANTS_POOL.length]);
  const shoe    = '#2a1a0a';
  const isFem   = ap.gender === 'f';

  ctx.clearRect(0, 0, W, H);

  // ── shadow ──
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(cx, cy+13, 10, 3.5, 0, 0, Math.PI*2); ctx.fill();

  // ── shoes ──
  ctx.fillStyle = shoe;
  roundRect(ctx, cx-9, cy+10, 7, 4, 2); ctx.fill();
  roundRect(ctx, cx+2, cy+10, 7, 4, 2); ctx.fill();

  // ── bottom (pants / skirt) ──
  if (isFem) {
    ctx.fillStyle = shirtD;
    ctx.beginPath();
    ctx.moveTo(cx-9, cy+1); ctx.lineTo(cx+9, cy+1);
    ctx.lineTo(cx+12, cy+11); ctx.lineTo(cx-12, cy+11);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = pants;
    ctx.fillRect(cx-9, cy+1, 7, 10);
    ctx.fillRect(cx+2, cy+1, 7, 10);
    ctx.fillRect(cx-9, cy+1, 18, 6);
    ctx.fillStyle = '#5a3a10'; ctx.fillRect(cx-9, cy, 18, 2.5);
  }

  // ── shirt ──
  ctx.fillStyle = shirt;
  roundRect(ctx, cx-9, cy-10, 18, 13, 2); ctx.fill();
  ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
  ctx.fillRect(cx-9, cy-10, 3, 13); ctx.fillRect(cx+6, cy-10, 3, 13);
  ctx.globalAlpha = 1;

  // ── collar ──
  ctx.fillStyle = hexCss(darken(SHIRTS[ap.shirtIdx % SHIRTS.length], 0.35));
  ctx.beginPath(); ctx.moveTo(cx-3, cy-10); ctx.lineTo(cx, cy-6); ctx.lineTo(cx+3, cy-10); ctx.closePath(); ctx.fill();

  // ── arms ──
  ctx.fillStyle = shirtD;
  roundRect(ctx, cx-15, cy-9, 6, 10, 2); ctx.fill();
  roundRect(ctx, cx+9, cy-9, 6, 10, 2); ctx.fill();

  // ── item in hand ──
  drawItem(ctx, ap.itemType, cx, cy, skin, isFem);

  // ── hands ──
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(cx-12, cy+2, 3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+12, cy+2, 3, 0, Math.PI*2); ctx.fill();

  // ── neck ──
  ctx.fillStyle = skin; ctx.fillRect(cx-3, cy-13, 6, 5);

  // ── head ──
  ctx.fillStyle = skin;
  roundRect(ctx, cx-9, cy-26, 18, 16, 5); ctx.fill();

  // ── ears ──
  ctx.fillStyle = skinD;
  ctx.beginPath(); ctx.arc(cx-9, cy-19, 3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+9, cy-19, 3, 0, Math.PI*2); ctx.fill();

  // ── hair (style varies) ──
  drawHair(ctx, ap.hairStyle, ap.hairIdx, isFem, cx, cy, hair);

  // ── hat ──
  drawHat(ctx, ap.hatType, cx, cy, hair);

  // ── eyes ──
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(cx-3.5, cy-18, 2.2, 2.8, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx+3.5, cy-18, 2.2, 2.8, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#222233';
  ctx.beginPath(); ctx.arc(cx-3.5, cy-17, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+3.5, cy-17, 1.4, 0, Math.PI*2); ctx.fill();
  // eye shine
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx-3, cy-18, 0.6, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+4, cy-18, 0.6, 0, Math.PI*2); ctx.fill();
  // eyebrows
  ctx.strokeStyle = hexCss(darken(HAIRS[ap.hairIdx % HAIRS.length], 0.1));
  ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx-6, cy-22); ctx.lineTo(cx-1.5, cy-21); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+6, cy-22); ctx.lineTo(cx+1.5, cy-21); ctx.stroke();

  // ── mouth ──
  ctx.strokeStyle = isFem ? '#d4607a' : '#b05060';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy-14, 2.5, 0.1, Math.PI-0.1); ctx.stroke();

  // ── local dot ──
  if (isLocal) {
    ctx.fillStyle = '#4ade80';
    ctx.beginPath(); ctx.arc(cx, cy-32, 3.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy-32, 1.5, 0, Math.PI*2); ctx.fill();
  }
}

function drawHair(ctx, style, hairIdx, isFem, cx, cy, hair) {
  ctx.fillStyle = hair;
  if (isFem) {
    switch (style % 4) {
      case 0: // long
        roundRect(ctx, cx-10, cy-28, 20, 12, 5); ctx.fill();
        ctx.fillRect(cx-10, cy-22, 3, 16); ctx.fillRect(cx+7, cy-22, 3, 16);
        break;
      case 1: // ponytail
        roundRect(ctx, cx-10, cy-28, 20, 12, 5); ctx.fill();
        ctx.fillRect(cx-10, cy-22, 3, 10);
        roundRect(ctx, cx+7, cy-24, 5, 20, 3); ctx.fill();
        break;
      case 2: // bun
        roundRect(ctx, cx-10, cy-28, 20, 10, 5); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+7, cy-28, 5, 0, Math.PI*2); ctx.fill();
        break;
      case 3: // bob
        roundRect(ctx, cx-11, cy-28, 22, 14, 5); ctx.fill();
        ctx.fillRect(cx-11, cy-22, 4, 8); ctx.fillRect(cx+7, cy-22, 4, 8);
        break;
    }
  } else {
    switch (style % 4) {
      case 0: // short
        roundRect(ctx, cx-10, cy-28, 20, 10, 5); ctx.fill();
        ctx.fillRect(cx-10, cy-22, 3, 6); ctx.fillRect(cx+7, cy-22, 3, 6);
        break;
      case 1: // side-part
        roundRect(ctx, cx-11, cy-28, 21, 11, 5); ctx.fill();
        ctx.fillRect(cx-11, cy-22, 4, 8);
        break;
      case 2: // messy
        roundRect(ctx, cx-10, cy-28, 20, 10, 5); ctx.fill();
        ctx.fillRect(cx-4, cy-30, 3, 5); ctx.fillRect(cx, cy-31, 3, 5); ctx.fillRect(cx+3, cy-29, 3, 4);
        break;
      case 3: // buzz
        roundRect(ctx, cx-10, cy-27, 20, 7, 4); ctx.fill();
        break;
    }
  }
}

function drawHat(ctx, hatType, cx, cy, hair) {
  switch (hatType) {
    case 1: // cap
      ctx.fillStyle = '#cc2222';
      roundRect(ctx, cx-11, cy-30, 22, 7, 3); ctx.fill();
      ctx.fillRect(cx-3, cy-28, 14, 3); // visor
      ctx.fillStyle = '#aa0000';
      roundRect(ctx, cx+7, cy-28, 8, 3, 1); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 5px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('CAP', cx, cy-25);
      break;
    case 2: // beanie
      ctx.fillStyle = '#4455cc';
      roundRect(ctx, cx-11, cy-32, 22, 13, 6); ctx.fill();
      ctx.fillStyle = '#3344bb';
      for (let i = 0; i < 3; i++) ctx.fillRect(cx-10, cy-27+i*3, 20, 1.5);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy-33, 3, 0, Math.PI*2); ctx.fill();
      break;
    case 3: // straw
      ctx.fillStyle = '#d4a830';
      ctx.beginPath(); ctx.ellipse(cx, cy-29, 14, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#c49020';
      roundRect(ctx, cx-7, cy-33, 14, 8, 3); ctx.fill();
      ctx.strokeStyle = '#b07818'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, cy-29, 14, 4, 0, 0, Math.PI*2); ctx.stroke();
      break;
    case 4: // beret
      ctx.fillStyle = '#882244';
      ctx.beginPath(); ctx.ellipse(cx+2, cy-30, 11, 7, -0.2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#771133';
      ctx.beginPath(); ctx.ellipse(cx-4, cy-28, 4, 2, 0, 0, Math.PI*2); ctx.fill();
      break;
  }
}

function drawItem(ctx, itemType, cx, cy, skin, isFem) {
  switch (itemType) {
    case 1: // coffee cup
      ctx.fillStyle = '#8B4513';
      roundRect(ctx, cx+10, cy-4, 8, 10, 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, cx+11, cy-3, 6, 3, 1); ctx.fill();
      ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx+18, cy+1, 3, -0.5, 0.5); ctx.stroke();
      // steam
      ctx.strokeStyle = 'rgba(200,200,200,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx+13, cy-5); ctx.quadraticCurveTo(cx+11, cy-9, cx+13, cy-13); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+16, cy-5); ctx.quadraticCurveTo(cx+18, cy-9, cx+16, cy-13); ctx.stroke();
      break;
    case 2: // phone
      ctx.fillStyle = '#222233';
      roundRect(ctx, cx+9, cy-7, 6, 10, 2); ctx.fill();
      ctx.fillStyle = '#4488ff';
      roundRect(ctx, cx+10, cy-6, 4, 7, 1); ctx.fill();
      break;
    case 3: // bag strap
      ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx-10, cy-8); ctx.lineTo(cx-14, cy+4); ctx.stroke();
      ctx.fillStyle = '#a07820';
      roundRect(ctx, cx-18, cy+1, 10, 8, 2); ctx.fill();
      ctx.fillStyle = '#c09030'; ctx.fillRect(cx-16, cy+4, 6, 2);
      break;
    case 4: // book
      ctx.fillStyle = '#1565c0';
      roundRect(ctx, cx-18, cy-5, 8, 11, 1); ctx.fill();
      ctx.fillStyle = '#e8eaf6'; ctx.fillRect(cx-17, cy-4, 6, 9);
      ctx.fillStyle = '#9fa8da';
      for (let i = 0; i < 3; i++) ctx.fillRect(cx-16, cy-2+i*3, 4, 1);
      break;
    case 5: // flower (female preferred)
      ctx.fillStyle = '#ff80ab';
      for (let a = 0; a < 5; a++) {
        const ang = (a/5)*Math.PI*2;
        ctx.beginPath(); ctx.ellipse(cx-14+Math.cos(ang)*4, cy-8+Math.sin(ang)*4, 2.5, 2.5, ang, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(cx-14, cy-8, 2.5, 0, Math.PI*2); ctx.fill();
      break;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y); ctx.closePath();
}

/* ── Export for ui.js preview ───────────────────────────────── */
export function drawAvatarToCanvas(canvas, ap) {
  drawCharCanvas(canvas.getContext('2d'), canvas.width, canvas.height, resolveAp(ap), false);
}

/* ═══════════════════════════════════════════════════════════════
   PHASER TEXTURE GENERATION
═══════════════════════════════════════════════════════════════ */
function generateTextures(scene, ap, isLocal) {
  const key = `chr_${ap.gender}${ap.skinIdx}${ap.hairIdx}${ap.shirtIdx}${ap.hairStyle}${ap.hatType}${ap.itemType}${ap.pantsIdx}_${isLocal?'l':'r'}`;
  const dirs = ['down','left','right','up'];

  dirs.forEach(dir => {
    [0,1,2].forEach(frame => {
      const tkey = `${key}_${dir}_${frame}`;
      if (scene.textures.exists(tkey)) return;
      const offscreen = document.createElement('canvas');
      offscreen.width = 56; offscreen.height = 72;
      const ctx = offscreen.getContext('2d');
      // apply walk offset
      const walkOff = frame === 0 ? 0 : frame === 1 ? -2 : 2;
      if (frame !== 0) { ctx.save(); ctx.translate(0, walkOff); }
      drawCharCanvas(ctx, 56, 72, ap, isLocal);
      if (frame !== 0) ctx.restore();
      // direction flip
      if (dir === 'left') {
        const tmp = document.createElement('canvas');
        tmp.width = 56; tmp.height = 72;
        const tc = tmp.getContext('2d');
        tc.save(); tc.scale(-1,1); tc.drawImage(offscreen, -56, 0); tc.restore();
        scene.textures.addCanvas(tkey, tmp);
      } else {
        scene.textures.addCanvas(tkey, offscreen);
      }
    });
  });
  return key;
}

/* ── Name tag ────────────────────────────────────────────────── */
function makeNameTag(scene, name, isLocal) {
  // Admin: hide name completely
  if (isAdmin(name)) {
    return scene.add.text(0, -42, '', {
      fontSize: '11px', fontFamily: 'Sarabun, sans-serif',
      color: '#00000000',
    }).setOrigin(0.5, 1).setDepth(10);
  }
  return scene.add.text(0, -42, name, {
    fontSize: '11px', fontFamily: 'Sarabun, sans-serif',
    color: isLocal ? '#4ade80' : '#e8ecf4',
    stroke: '#000', strokeThickness: 3,
    padding: { x:3, y:2 },
  }).setOrigin(0.5, 1).setDepth(10);
}

/* ── Admin FX: floating crown + blue aura ───────────────────── */
function addAdminFX(scene, container) {
  // ── Aura: หลายวงแสงสีฟ้าใต้เท้า ──
  const auraColors = [0x00d4ff, 0x0088ff, 0x44eeff, 0x0055cc];
  for (let i = 0; i < 4; i++) {
    const aura = scene.add.graphics().setDepth(4);
    const col  = auraColors[i];
    aura.fillStyle(col, 0.18 - i * 0.03);
    aura.fillEllipse(0, 14, 52 + i * 14, 12 + i * 4);
    // outer glow ring
    aura.lineStyle(1, col, 0.5 - i * 0.1);
    aura.strokeEllipse(0, 14, 52 + i * 14, 12 + i * 4);
    container.add(aura);
    // pulse each ring with offset phase
    scene.tweens.add({
      targets: aura, alpha: { from: 0.9, to: 0.2 },
      duration: 900 + i * 200, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut', delay: i * 150,
    });
    scene.tweens.add({
      targets: aura, scaleX: { from: 1.0, to: 1.15 },
      duration: 1100 + i * 180, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut', delay: i * 100,
    });
  }

  // ── Particle sparks orbiting feet ──
  for (let i = 0; i < 8; i++) {
    const spark = scene.add.graphics().setDepth(5);
    spark.fillStyle(0x44eeff, 0.9);
    spark.fillCircle(0, 0, 1.5);
    container.add(spark);
    const radius = 22 + Math.random() * 6;
    const speed  = 2200 + Math.random() * 800;
    const startA = (i / 8) * Math.PI * 2;
    scene.tweens.add({
      targets: { t: 0 }, t: 1,
      duration: speed, repeat: -1,
      ease: 'Linear',
      onUpdate: (tw) => {
        const angle = startA + tw.progress * Math.PI * 2;
        spark.x = Math.cos(angle) * radius;
        spark.y = 14 + Math.sin(angle) * 5;
        spark.alpha = 0.4 + 0.6 * Math.abs(Math.sin(angle));
      },
    });
  }

  // ── Crown: วาดด้วย graphics ──
  const crown = scene.add.graphics().setDepth(15);
  _drawCrown(crown);
  crown.y = -54;
  container.add(crown);

  // ── Crown float animation ──
  scene.tweens.add({
    targets: crown,
    y: { from: -54, to: -62 },
    duration: 1000, yoyo: true, repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // ── Crown rotate shimmer ──
  scene.tweens.add({
    targets: crown,
    angle: { from: -3, to: 3 },
    duration: 2000, yoyo: true, repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // ── Crown glow (halo behind crown) ──
  const halo = scene.add.graphics().setDepth(14);
  halo.fillStyle(0xffd700, 0.12);
  halo.fillEllipse(0, -54, 36, 10);
  halo.lineStyle(1, 0xffd700, 0.4);
  halo.strokeEllipse(0, -54, 36, 10);
  container.add(halo);
  scene.tweens.add({
    targets: halo, alpha: { from: 0.8, to: 0.2 },
    duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
}

function _drawCrown(g) {
  // Base band
  g.fillStyle(0xffd700, 1);
  g.fillRect(-12, -2, 24, 6);
  // 5 points of crown
  const pts = [
    [-12, -2], [-12, -12],
    [-6,  -7],
    [0,   -16],
    [6,   -7],
    [12,  -12],
    [12,  -2],
  ];
  g.fillPoints(pts.map(([x, y]) => ({ x, y })), true);
  // Gold shading
  g.fillStyle(0xffec6e, 0.6);
  g.fillTriangle(0, -16, -4, -8, 4, -8);
  g.fillTriangle(-12, -12, -9, -6, -6, -7);
  g.fillTriangle(12, -12, 9, -6, 6, -7);
  // Gems
  g.fillStyle(0xff2244, 1); g.fillCircle(0, -8, 2.5);   // center ruby
  g.fillStyle(0x44aaff, 1); g.fillCircle(-8, -1, 2);    // left sapphire
  g.fillStyle(0x44aaff, 1); g.fillCircle(8, -1, 2);     // right sapphire
  g.fillStyle(0x88ffcc, 1); g.fillCircle(-4, -1, 1.5);  // emeralds
  g.fillStyle(0x88ffcc, 1); g.fillCircle(4, -1, 1.5);
  // Outline
  g.lineStyle(1, 0xaa8800, 0.8);
  g.strokePoints(pts.map(([x, y]) => ({ x, y })), true);
}

/* ── Chat Bubble ─────────────────────────────────────────────── */
function showChatBubble(scene, container, text) {
  if (container._bubble) { container._bubble.destroy(); container._bubbleBg?.destroy(); clearTimeout(container._bubbleTimer); }
  const txt = scene.add.text(0, -62, text, {
    fontSize:'11px', fontFamily:'Sarabun,sans-serif', color:'#ffffff',
    wordWrap:{width:150}, align:'center', stroke:'#000', strokeThickness:2,
  }).setOrigin(0.5,1).setDepth(20);
  const b = txt.getBounds();
  const bw = b.width+16, bh = b.height+12;
  const bg = scene.add.graphics().setDepth(19);
  bg.fillStyle(0x1c2535, 0.93); bg.fillRoundedRect(-bw/2, -62-bh+4, bw, bh, 7);
  bg.lineStyle(1.5, 0x60a5fa, 0.8); bg.strokeRoundedRect(-bw/2, -62-bh+4, bw, bh, 7);
  bg.fillStyle(0x1c2535, 0.93);
  bg.fillTriangle(-5,-57, 5,-57, 0,-51);
  container.add([bg, txt]);
  container._bubble = txt; container._bubbleBg = bg;
  container._bubbleTimer = setTimeout(() => {
    scene.tweens.add({ targets:[txt,bg], alpha:0, duration:400, onComplete:()=>{ txt.destroy(); bg.destroy(); }});
    container._bubble = null;
  }, 4000);
}

/* ═══════════════════════════════════════════════════════════════
   LOCAL PLAYER
═══════════════════════════════════════════════════════════════ */
export class LocalPlayer {
  constructor(scene, x, y, username, ap) {
    this.scene    = scene;
    this.username = username;
    this.ap       = resolveAp(ap);
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.idle      = false;
    this.direction = 'down';
    this._frame    = 0; this._frameTimer = 0;
    this._idleTimer = null;
    this._targetX = x; this._targetY = y; this._clicking = false;
    this._build();
    this._resetIdle();
  }
  _build() {
    const prefix  = generateTextures(this.scene, this.ap, true);
    this._prefix  = prefix;
    this.container = this.scene.add.container(this.x, this.y).setDepth(5);
    this.sprite    = this.scene.add.image(0, 0, `${prefix}_down_0`).setOrigin(0.5, 0.75);
    this.nameTag   = makeNameTag(this.scene, this.username, true);
    this.container.add([this.sprite, this.nameTag]);
    if (isAdmin(this.username)) addAdminFX(this.scene, this.container);
  }
  showChat(text) { showChatBubble(this.scene, this.container, text); }
  setClickTarget(wx, wy) { this._targetX = wx; this._targetY = wy; this._clicking = true; }
  update(dt, cursors, _wasd, bounds, collidables) {
    const sec = dt/1000;
    this.vx = 0; this.vy = 0;
    let moved = false, dir = this.direction;
    if (cursors.left.isDown)  { this.vx=-PLAYER_SPEED; dir='left';  moved=true; this._clicking=false; }
    if (cursors.right.isDown) { this.vx= PLAYER_SPEED; dir='right'; moved=true; this._clicking=false; }
    if (cursors.up.isDown)    { this.vy=-PLAYER_SPEED; dir='up';    moved=true; this._clicking=false; }
    if (cursors.down.isDown)  { this.vy= PLAYER_SPEED; dir='down';  moved=true; this._clicking=false; }
    if (!moved && this._clicking) {
      const dx=this._targetX-this.x, dy=this._targetY-this.y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if (dist>4) {
        this.vx=(dx/dist)*PLAYER_SPEED; this.vy=(dy/dist)*PLAYER_SPEED; moved=true;
        if (Math.abs(dx)>Math.abs(dy)) dir=dx>0?'right':'left'; else dir=dy>0?'down':'up';
      } else this._clicking=false;
    }
    if (this.vx!==0&&this.vy!==0) { this.vx*=0.707; this.vy*=0.707; }
    let nx=this.x+this.vx*sec, ny=this.y+this.vy*sec;
    const r=PLAYER_SIZE/2;
    nx=Math.max(bounds.x+r,Math.min(bounds.x+bounds.width-r,nx));
    ny=Math.max(bounds.y+r,Math.min(bounds.y+bounds.height-r,ny));
    for (const obj of collidables) { const res=_resolveAABB(nx,ny,r,obj); nx=res.x; ny=res.y; }
    this.x=nx; this.y=ny; this.container.setPosition(nx,ny); this.direction=dir;
    if (moved) {
      this._frameTimer+=dt;
      if (this._frameTimer>130) { this._frameTimer=0; this._frame=(this._frame+1)%3; }
      this._resetIdle();
    } else { this._frame=0; this._frameTimer=0; }
    const tkey=`${this._prefix}_${this.direction}_${this._frame}`;
    if (this.scene.textures.exists(tkey)) this.sprite.setTexture(tkey);
    this.sprite.setAlpha(this.idle?0.55:1);
  }
  _resetIdle() {
    clearTimeout(this._idleTimer); this.idle=false;
    this._idleTimer=setTimeout(()=>{this.idle=true;},IDLE_TIMEOUT_MS);
  }
  destroy() { clearTimeout(this._idleTimer); this.container?.destroy(); }
}

/* ═══════════════════════════════════════════════════════════════
   REMOTE PLAYER
═══════════════════════════════════════════════════════════════ */
export class RemotePlayer {
  constructor(scene, id, x, y, username, ap) {
    this.scene    = scene;
    this.id       = id;
    this.username = username;
    this.ap       = resolveAp(ap);
    this.x=x; this.y=y; this.tx=x; this.ty=y;
    this.idle=false; this.direction='down';
    this._frame=0; this._frameTimer=0; this._moving=false;
    this._build();
  }
  _build() {
    const prefix  = generateTextures(this.scene, this.ap, false);
    this._prefix  = prefix;
    this.container = this.scene.add.container(this.x, this.y).setDepth(5);
    this.sprite    = this.scene.add.image(0, 0, `${prefix}_down_0`).setOrigin(0.5, 0.75);
    this.nameTag   = makeNameTag(this.scene, this.username, false);
    this.container.add([this.sprite, this.nameTag]);
    if (isAdmin(this.username)) addAdminFX(this.scene, this.container);
  }
  showChat(text) { showChatBubble(this.scene, this.container, text); }
  setTarget(x, y, idle=false) {
    const dx=x-this.x, dy=y-this.y, dist=Math.sqrt(dx*dx+dy*dy);
    if (dist>3) {
      if (Math.abs(dx)>Math.abs(dy)) this.direction=dx>0?'right':'left'; else this.direction=dy>0?'down':'up';
      this._moving=true;
    } else { this._moving=false; this._frame=0; }
    this.tx=x; this.ty=y; this.idle=idle; this.container.setAlpha(idle?0.6:1);
  }
  update(dt) {
    const t=Math.min(1,(dt/1000)*14);
    this.x+=(this.tx-this.x)*t; this.y+=(this.ty-this.y)*t;
    this.container.setPosition(this.x,this.y);
    if (this._moving) {
      this._frameTimer+=dt;
      if (this._frameTimer>140) { this._frameTimer=0; this._frame=(this._frame+1)%3; }
    }
    const tkey=`${this._prefix}_${this.direction}_${this._frame}`;
    if (this.scene.textures.exists(tkey)) this.sprite.setTexture(tkey);
  }
  destroy() { this.container?.destroy(); }
}

function _resolveAABB(px,py,pr,rect) {
  const eL=rect.x-pr,eR=rect.x+rect.width+pr,eT=rect.y-pr,eB=rect.y+rect.height+pr;
  if (px>eL&&px<eR&&py>eT&&py<eB) {
    const dL=px-eL,dR=eR-px,dT=py-eT,dB=eB-py,m=Math.min(dL,dR,dT,dB);
    if(m===dL)px=eL; else if(m===dR)px=eR; else if(m===dT)py=eT; else py=eB;
  }
  return {x:px,y:py};
}
export function preloadSprites(_s) {}
