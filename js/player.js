/**
 * player.js — Enhanced appearance + natural walking legs
 */

import { IDLE_TIMEOUT_MS } from './config.js';

export const PLAYER_SPEED = 140;
const ADMIN_SECRET = '0910655667';
export function isAdmin(username) { return String(username).trim() === ADMIN_SECRET; }
export const PLAYER_SIZE = 32;

/* ═══════════════════════════════════════════════════════════════
   APPEARANCE POOLS — เพิ่มตัวเลือกเยอะๆ สำหรับแรนดอม
═══════════════════════════════════════════════════════════════ */
const SKINS   = [0xfde8c8, 0xf4c28a, 0xe8a870, 0xd48060, 0xc07040, 0x8d5524,
                 0xfff0e0, 0xf8d0a0, 0xd4956a, 0xb07040, 0x7a4020, 0x5a2c10];
const HAIRS   = [0x1a1a1a, 0x3d2b1f, 0x8b5020, 0xc8a050, 0xf0e0b0, 0xe83030,
                 0x9b30e8, 0x30b8e8, 0x208040, 0xff8000, 0xffd700, 0x204080,
                 0x800040, 0x008080, 0xa0a0a0, 0x602040];
const SHIRTS  = [0x4a9eff,0xe05555,0x55c070,0xf0a030,0xb06edd,0x40cccc,0xff6090,
                 0xf0e040,0xff8c42,0x60d080,0xc084fc,0x7090e0,0xe8505a,0x50c8a0,
                 0xffb347,0x20b0a0,0xd040d0,0x4060d0,0xa0c020,0xe06020,
                 0x30a0ff,0xff3060,0x60ff80,0xffc000,0x8040ff,0x00cccc,
                 0xff80a0,0xffe060,0xffa060,0x80e0a0];
const PANTS_POOL = [0x2d3a70,0x3a2a20,0x2a4030,0x4a3010,0x3a2a60,0x205050,
                    0x602040,0x304060,0x604010,0x205030,0x1a2a50,0x3a3030,
                    0x2a5040,0x503020,0x402060,0x106060,0x500030,0x204050];
const HATS    = [0,0,0,0,1,1,2,2,3,4,5,6]; // weighted no-hat
// hat 5=fedora, 6=headband
const ITEMS   = [0,0,0,0,1,1,2,2,3,4,5,6,7,8];
// item 6=umbrella, 7=camera, 8=headphones
// Hair styles: male 0-5, female 0-5
const SHOES   = [0x2a1a0a, 0x1a1a1a, 0xffffff, 0xa02020, 0x204080, 0x806020,
                 0x3a3a3a, 0x8b4513, 0xc8c8c8, 0x4a2a0a];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

export function randomAppearance(gender) {
  return {
    gender,
    skinIdx:   Math.floor(Math.random() * SKINS.length),
    hairIdx:   Math.floor(Math.random() * HAIRS.length),
    shirtIdx:  Math.floor(Math.random() * SHIRTS.length),
    hairStyle: Math.floor(Math.random() * 6),
    hatType:   pick(HATS),
    itemType:  pick(ITEMS),
    pantsIdx:  Math.floor(Math.random() * PANTS_POOL.length),
    shoeIdx:   Math.floor(Math.random() * SHOES.length),
    eyeColor:  Math.floor(Math.random() * 4), // 0=dark, 1=blue, 2=green, 3=hazel
    blush:     Math.random() < 0.3,           // บางคนมีแก้มสีชมพู
  };
}

export function packAppearance(_ap) { return 0; }

export function resolveAp(data) {
  if (data && data.gender) return data;
  const idx = Number(data?.avatarIndex ?? data ?? 0) % 12;
  const isFemale = idx >= 6;
  return {
    gender: isFemale ? 'f' : 'm',
    skinIdx: idx % SKINS.length,
    hairIdx: idx % HAIRS.length,
    shirtIdx: idx % SHIRTS.length,
    hairStyle: idx % 6,
    hatType: 0, itemType: 0,
    pantsIdx: idx % PANTS_POOL.length,
    shoeIdx: 0, eyeColor: 0, blush: false,
  };
}

/* ═══════════════════════════════════════════════════════════════
   DRAW HELPERS
═══════════════════════════════════════════════════════════════ */
function hexCss(hex) { return '#' + ('000000' + (hex >>> 0).toString(16)).slice(-6); }
function darken(hex, a) {
  return ((Math.max(0, ((hex >> 16) & 0xff) - Math.round(255 * a)) << 16) |
          (Math.max(0, ((hex >>  8) & 0xff) - Math.round(255 * a)) <<  8) |
          (Math.max(0,  (hex        & 0xff) - Math.round(255 * a))));
}
function lightenHex(hex, a) {
  return ((Math.min(255, ((hex >> 16) & 0xff) + Math.round(255 * a)) << 16) |
          (Math.min(255, ((hex >>  8) & 0xff) + Math.round(255 * a)) <<  8) |
          (Math.min(255,  (hex        & 0xff) + Math.round(255 * a))));
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

/* ── Eye colors ── */
const EYE_PUPIL = ['#222233', '#2244aa', '#226622', '#7a5520'];

/* ─── Main draw — walkFrame 0=idle,1=step-right,2=step-left ─── */
function drawCharCanvas(ctx, W, H, ap, isLocal, walkFrame) {
  const frame  = walkFrame ?? 0;
  const cx     = W / 2;
  // base torso center Y
  const baseY  = H * 0.70;

  // Walking: bob body slightly, swing legs
  const bobY   = frame === 0 ? 0 : (frame === 1 ? -1.5 : -1.5);
  const cy     = baseY + bobY;

  const skin   = hexCss(SKINS[ap.skinIdx  % SKINS.length]);
  const skinD  = hexCss(darken(SKINS[ap.skinIdx % SKINS.length], 0.15));
  const hair   = hexCss(HAIRS[ap.hairIdx  % HAIRS.length]);
  const shirt  = hexCss(SHIRTS[ap.shirtIdx % SHIRTS.length]);
  const shirtD = hexCss(darken(SHIRTS[ap.shirtIdx % SHIRTS.length], 0.22));
  const pants  = hexCss(PANTS_POOL[ap.pantsIdx % PANTS_POOL.length]);
  const shoe   = hexCss(SHOES[(ap.shoeIdx ?? 0) % SHOES.length]);
  const isFem  = ap.gender === 'f';

  ctx.clearRect(0, 0, W, H);

  // ── shadow ──
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(cx, baseY + 15, 11, 4, 0, 0, Math.PI * 2); ctx.fill();

  // ── LEGS with walk animation ──
  // leg offsets: frame 0=neutral, 1=right-forward/left-back, 2=left-forward/right-back
  const legSwing = 5; // pixels of forward/back swing
  const legLift  = 3; // pixels of up lift on forward leg
  let rightLegOffY = 0, leftLegOffY = 0;
  let rightLegOffX = 0, leftLegOffX = 0;
  if (frame === 1) {
    // right foot forward, left foot back
    rightLegOffX =  legSwing * 0.5; rightLegOffY = -legLift;
    leftLegOffX  = -legSwing * 0.5; leftLegOffY  =  0;
  } else if (frame === 2) {
    // left foot forward, right foot back
    rightLegOffX = -legSwing * 0.5; rightLegOffY =  0;
    leftLegOffX  =  legSwing * 0.5; leftLegOffY  = -legLift;
  }

  if (isFem) {
    // skirt
    ctx.fillStyle = shirtD;
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy + 1); ctx.lineTo(cx + 9, cy + 1);
    ctx.lineTo(cx + 13, cy + 12); ctx.lineTo(cx - 13, cy + 12);
    ctx.closePath(); ctx.fill();
    // legs visible below skirt
    ctx.fillStyle = skin;
    ctx.fillRect(cx - 5 + leftLegOffX,  cy + 10 + leftLegOffY,  5, 6);
    ctx.fillRect(cx + 1 + rightLegOffX, cy + 10 + rightLegOffY, 5, 6);
  } else {
    // pants legs — right leg
    ctx.fillStyle = pants;
    ctx.fillRect(cx - 9, cy + 1, 18, 5); // crotch area
    ctx.fillStyle = hexCss(darken(PANTS_POOL[ap.pantsIdx % PANTS_POOL.length], 0.15));
    // left leg
    ctx.fillRect(cx - 9 + leftLegOffX,  cy + 5 + leftLegOffY,  7, 8);
    // right leg
    ctx.fillRect(cx + 2 + rightLegOffX, cy + 5 + rightLegOffY, 7, 8);
    // belt
    ctx.fillStyle = '#5a3a10'; ctx.fillRect(cx - 9, cy, 18, 2.5);
  }

  // ── shoes ──
  ctx.fillStyle = shoe;
  // left shoe
  roundRect(ctx, cx - 9 + leftLegOffX - 1,  cy + 12 + leftLegOffY,  8, 4, 2); ctx.fill();
  // right shoe
  roundRect(ctx, cx + 2 + rightLegOffX - 1, cy + 12 + rightLegOffY, 8, 4, 2); ctx.fill();

  // ── shirt ──
  ctx.fillStyle = shirt;
  roundRect(ctx, cx - 9, cy - 11, 18, 13, 2); ctx.fill();
  ctx.globalAlpha = 0.2; ctx.fillStyle = '#000';
  ctx.fillRect(cx - 9, cy - 11, 3, 13); ctx.fillRect(cx + 6, cy - 11, 3, 13);
  ctx.globalAlpha = 1;

  // ── collar ──
  ctx.fillStyle = hexCss(darken(SHIRTS[ap.shirtIdx % SHIRTS.length], 0.35));
  ctx.beginPath(); ctx.moveTo(cx - 3, cy - 11); ctx.lineTo(cx, cy - 7); ctx.lineTo(cx + 3, cy - 11); ctx.closePath(); ctx.fill();

  // ── arms — swing opposite to legs ──
  let rightArmOffY = 0, leftArmOffY = 0;
  if (frame === 1) { rightArmOffY = -2; leftArmOffY  =  2; }
  else if (frame === 2) { rightArmOffY =  2; leftArmOffY  = -2; }

  ctx.fillStyle = shirtD;
  roundRect(ctx, cx - 16, cy - 10 + leftArmOffY,  6, 11, 2); ctx.fill();
  roundRect(ctx, cx + 10, cy - 10 + rightArmOffY, 6, 11, 2); ctx.fill();

  // ── item in hand ──
  drawItem(ctx, ap.itemType ?? 0, cx, cy, skin, isFem, rightArmOffY);

  // ── hands ──
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(cx - 13, cy + 2 + leftArmOffY,  3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 13, cy + 2 + rightArmOffY, 3, 0, Math.PI * 2); ctx.fill();

  // ── neck ──
  ctx.fillStyle = skin; ctx.fillRect(cx - 3, cy - 14, 6, 5);

  // ── head ──
  ctx.fillStyle = skin;
  roundRect(ctx, cx - 9, cy - 27, 18, 16, 5); ctx.fill();

  // ── blush ──
  if (ap.blush) {
    ctx.fillStyle = 'rgba(255,120,120,0.25)';
    ctx.beginPath(); ctx.ellipse(cx - 7, cy - 18, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 7, cy - 18, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
  }

  // ── ears ──
  ctx.fillStyle = skinD;
  ctx.beginPath(); ctx.arc(cx - 9, cy - 20, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 9, cy - 20, 3, 0, Math.PI * 2); ctx.fill();

  // ── hair ──
  drawHair(ctx, ap.hairStyle ?? 0, ap.hairIdx, isFem, cx, cy, hair);

  // ── hat ──
  drawHat(ctx, ap.hatType ?? 0, cx, cy, hair);

  // ── eyes ──
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(cx - 3.5, cy - 19, 2.2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 3.5, cy - 19, 2.2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = EYE_PUPIL[(ap.eyeColor ?? 0) % EYE_PUPIL.length];
  ctx.beginPath(); ctx.arc(cx - 3.5, cy - 18, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 3.5, cy - 18, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx - 3,   cy - 19, 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 4,   cy - 19, 0.6, 0, Math.PI * 2); ctx.fill();
  // eyebrows
  ctx.strokeStyle = hexCss(darken(HAIRS[ap.hairIdx % HAIRS.length], 0.1));
  ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - 6, cy - 23); ctx.lineTo(cx - 1.5, cy - 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 6, cy - 23); ctx.lineTo(cx + 1.5, cy - 22); ctx.stroke();

  // ── mouth ──
  ctx.strokeStyle = isFem ? '#d4607a' : '#b05060';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy - 15, 2.5, 0.1, Math.PI - 0.1); ctx.stroke();

  // ── local dot ──
  if (isLocal) {
    ctx.fillStyle = '#4ade80';
    ctx.beginPath(); ctx.arc(cx, cy - 33, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy - 33, 1.5, 0, Math.PI * 2); ctx.fill();
  }
}

/* ── Hair styles 0-5 ── */
function drawHair(ctx, style, hairIdx, isFem, cx, cy, hair) {
  ctx.fillStyle = hair;
  if (isFem) {
    switch (style % 6) {
      case 0: // long
        roundRect(ctx, cx-10, cy-29, 20, 12, 5); ctx.fill();
        ctx.fillRect(cx-10, cy-23, 3, 16); ctx.fillRect(cx+7, cy-23, 3, 16); break;
      case 1: // ponytail
        roundRect(ctx, cx-10, cy-29, 20, 12, 5); ctx.fill();
        ctx.fillRect(cx-10, cy-23, 3, 10);
        roundRect(ctx, cx+7, cy-25, 5, 22, 3); ctx.fill(); break;
      case 2: // bun
        roundRect(ctx, cx-10, cy-29, 20, 10, 5); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+7, cy-29, 6, 0, Math.PI*2); ctx.fill(); break;
      case 3: // bob
        roundRect(ctx, cx-11, cy-29, 22, 14, 5); ctx.fill();
        ctx.fillRect(cx-11, cy-23, 4, 8); ctx.fillRect(cx+7, cy-23, 4, 8); break;
      case 4: // twin-tails
        roundRect(ctx, cx-10, cy-29, 20, 10, 5); ctx.fill();
        roundRect(ctx, cx-14, cy-26, 5, 18, 3); ctx.fill();
        roundRect(ctx, cx+9,  cy-26, 5, 18, 3); ctx.fill(); break;
      case 5: // wavy long
        roundRect(ctx, cx-11, cy-29, 22, 13, 5); ctx.fill();
        ctx.fillRect(cx-11, cy-23, 3, 18); ctx.fillRect(cx+8, cy-23, 3, 18);
        ctx.fillRect(cx-13, cy-12, 4, 8); ctx.fillRect(cx+9, cy-12, 4, 8); break;
    }
  } else {
    switch (style % 6) {
      case 0: // short
        roundRect(ctx, cx-10, cy-29, 20, 10, 5); ctx.fill();
        ctx.fillRect(cx-10, cy-23, 3, 6); ctx.fillRect(cx+7, cy-23, 3, 6); break;
      case 1: // side-part
        roundRect(ctx, cx-11, cy-29, 21, 11, 5); ctx.fill();
        ctx.fillRect(cx-11, cy-23, 4, 8); break;
      case 2: // messy
        roundRect(ctx, cx-10, cy-29, 20, 10, 5); ctx.fill();
        ctx.fillRect(cx-4, cy-31, 3, 5); ctx.fillRect(cx, cy-32, 3, 5); ctx.fillRect(cx+3, cy-30, 3, 4); break;
      case 3: // buzz
        roundRect(ctx, cx-10, cy-28, 20, 7, 4); ctx.fill(); break;
      case 4: // medium
        roundRect(ctx, cx-10, cy-29, 20, 12, 5); ctx.fill();
        ctx.fillRect(cx-10, cy-23, 3, 10); ctx.fillRect(cx+7, cy-23, 3, 10); break;
      case 5: // slick back
        roundRect(ctx, cx-10, cy-29, 20, 9, 5); ctx.fill();
        ctx.fillRect(cx-10, cy-23, 20, 3); break;
    }
  }
}

/* ── Hat styles 0-6 ── */
function drawHat(ctx, hatType, cx, cy, hair) {
  switch (hatType) {
    case 1: // cap
      ctx.fillStyle = '#cc2222';
      roundRect(ctx, cx-11, cy-31, 22, 7, 3); ctx.fill();
      ctx.fillStyle = '#aa0000';
      roundRect(ctx, cx+7, cy-29, 8, 3, 1); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 5px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('CAP', cx, cy-26); break;
    case 2: // beanie
      ctx.fillStyle = '#4455cc';
      roundRect(ctx, cx-11, cy-33, 22, 13, 6); ctx.fill();
      ctx.fillStyle = '#3344bb';
      for (let i = 0; i < 3; i++) ctx.fillRect(cx-10, cy-28+i*3, 20, 1.5);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy-34, 3, 0, Math.PI*2); ctx.fill(); break;
    case 3: // straw
      ctx.fillStyle = '#d4a830';
      ctx.beginPath(); ctx.ellipse(cx, cy-30, 14, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#c49020';
      roundRect(ctx, cx-7, cy-34, 14, 8, 3); ctx.fill();
      ctx.strokeStyle = '#b07818'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, cy-30, 14, 4, 0, 0, Math.PI*2); ctx.stroke(); break;
    case 4: // beret
      ctx.fillStyle = '#882244';
      ctx.beginPath(); ctx.ellipse(cx+2, cy-31, 11, 7, -0.2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#771133';
      ctx.beginPath(); ctx.ellipse(cx-4, cy-29, 4, 2, 0, 0, Math.PI*2); ctx.fill(); break;
    case 5: // fedora
      ctx.fillStyle = '#4a3010';
      ctx.beginPath(); ctx.ellipse(cx, cy-30, 15, 4.5, 0, 0, Math.PI*2); ctx.fill();
      roundRect(ctx, cx-9, cy-35, 18, 9, 4); ctx.fill();
      ctx.fillStyle = '#2a1a08';
      ctx.fillRect(cx-9, cy-30, 18, 2); break;
    case 6: // headband
      ctx.fillStyle = '#dd3377';
      ctx.fillRect(cx-11, cy-26, 22, 4);
      ctx.beginPath(); ctx.arc(cx+9, cy-24, 5, 0, Math.PI*2);
      ctx.fillStyle = '#ff4488'; ctx.fill(); break;
  }
}

/* ── Items 0-8 ── */
function drawItem(ctx, itemType, cx, cy, skin, isFem, armOffY) {
  const ry = armOffY ?? 0;
  switch (itemType) {
    case 1: // coffee
      ctx.fillStyle = '#8B4513';
      roundRect(ctx, cx+10, cy-5+ry, 8, 10, 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; roundRect(ctx, cx+11, cy-4+ry, 6, 3, 1); ctx.fill();
      ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx+18, cy+1+ry, 3, -0.5, 0.5); ctx.stroke();
      ctx.strokeStyle = 'rgba(200,200,200,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx+13, cy-6+ry); ctx.quadraticCurveTo(cx+11, cy-10+ry, cx+13, cy-14+ry); ctx.stroke(); break;
    case 2: // phone
      ctx.fillStyle = '#222233'; roundRect(ctx, cx+9, cy-7+ry, 6, 10, 2); ctx.fill();
      ctx.fillStyle = '#4488ff'; roundRect(ctx, cx+10, cy-6+ry, 4, 7, 1); ctx.fill(); break;
    case 3: // bag
      ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx-10, cy-8+ry); ctx.lineTo(cx-14, cy+4+ry); ctx.stroke();
      ctx.fillStyle = '#a07820'; roundRect(ctx, cx-18, cy+1+ry, 10, 8, 2); ctx.fill();
      ctx.fillStyle = '#c09030'; ctx.fillRect(cx-16, cy+4+ry, 6, 2); break;
    case 4: // book
      ctx.fillStyle = '#1565c0'; roundRect(ctx, cx-18, cy-5+ry, 8, 11, 1); ctx.fill();
      ctx.fillStyle = '#e8eaf6'; ctx.fillRect(cx-17, cy-4+ry, 6, 9);
      ctx.fillStyle = '#9fa8da';
      for (let i = 0; i < 3; i++) ctx.fillRect(cx-16, cy-2+ry+i*3, 4, 1); break;
    case 5: // flower
      ctx.fillStyle = '#ff80ab';
      for (let a = 0; a < 5; a++) {
        const ang = (a/5)*Math.PI*2;
        ctx.beginPath(); ctx.ellipse(cx-14+Math.cos(ang)*4, cy-8+ry+Math.sin(ang)*4, 2.5, 2.5, ang, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(cx-14, cy-8+ry, 2.5, 0, Math.PI*2); ctx.fill(); break;
    case 6: // umbrella (folded)
      ctx.fillStyle = '#e040fb';
      roundRect(ctx, cx+9, cy-12+ry, 5, 18, 3); ctx.fill();
      ctx.fillStyle = '#880e4f';
      ctx.beginPath(); ctx.arc(cx+11.5, cy-12+ry, 5, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#4a148c'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx+11.5, cy+6+ry); ctx.quadraticCurveTo(cx+14, cy+8+ry, cx+13, cy+10+ry); ctx.stroke(); break;
    case 7: // camera
      ctx.fillStyle = '#222'; roundRect(ctx, cx-20, cy-8+ry, 14, 10, 2); ctx.fill();
      ctx.fillStyle = '#444'; roundRect(ctx, cx-18, cy-10+ry, 6, 3, 1); ctx.fill();
      ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(cx-13, cy-3+ry, 3.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#aaa'; ctx.beginPath(); ctx.arc(cx-13, cy-3+ry, 2, 0, Math.PI*2); ctx.fill(); break;
    case 8: // headphones (around neck)
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(cx, cy-11+ry, 8, 0.2, Math.PI-0.2); ctx.stroke();
      ctx.fillStyle = '#555';
      ctx.beginPath(); ctx.arc(cx-8, cy-11+ry, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx+8, cy-11+ry, 3, 0, Math.PI*2); ctx.fill(); break;
  }
}

/* ── Export for ui.js ── */
export function drawAvatarToCanvas(canvas, ap) {
  drawCharCanvas(canvas.getContext('2d'), canvas.width, canvas.height, resolveAp(ap), false, 0);
}

/* ═══════════════════════════════════════════════════════════════
   PHASER TEXTURE GENERATION — 3 walk frames per direction
═══════════════════════════════════════════════════════════════ */
function generateTextures(scene, ap, isLocal) {
  const key = `chr_${ap.gender}${ap.skinIdx}${ap.hairIdx}${ap.shirtIdx}${ap.hairStyle}${ap.hatType}${ap.itemType}${ap.pantsIdx}${ap.shoeIdx??0}${ap.eyeColor??0}${ap.blush?1:0}_${isLocal?'l':'r'}`;
  const dirs = ['down','left','right','up'];

  dirs.forEach(dir => {
    [0,1,2].forEach(frame => {
      const tkey = `${key}_${dir}_${frame}`;
      if (scene.textures.exists(tkey)) return;
      const offscreen = document.createElement('canvas');
      offscreen.width = 56; offscreen.height = 72;
      const ctx = offscreen.getContext('2d');
      drawCharCanvas(ctx, 56, 72, ap, isLocal, frame);
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

/* ── Name tag ── */
function makeNameTag(scene, name, isLocal) {
  if (isAdmin(name)) {
    return scene.add.text(0, -42, '', { fontSize:'11px', fontFamily:'Sarabun,sans-serif', color:'#00000000' }).setOrigin(0.5,1).setDepth(10);
  }
  return scene.add.text(0, -42, name, {
    fontSize:'11px', fontFamily:'Sarabun,sans-serif',
    color: isLocal ? '#4ade80' : '#e8ecf4',
    stroke:'#000', strokeThickness:3, padding:{x:3,y:2},
  }).setOrigin(0.5,1).setDepth(10);
}

/* ── Admin FX ── */
function addAdminFX(scene, container) {
  const auraColors = [0x00d4ff, 0x0088ff, 0x44eeff, 0x0055cc];
  for (let i = 0; i < 4; i++) {
    const aura = scene.add.graphics().setDepth(4);
    const col  = auraColors[i];
    aura.fillStyle(col, 0.18 - i*0.03); aura.fillEllipse(0, 14, 52+i*14, 12+i*4);
    aura.lineStyle(1, col, 0.5-i*0.1);  aura.strokeEllipse(0, 14, 52+i*14, 12+i*4);
    container.add(aura);
    scene.tweens.add({ targets:aura, alpha:{from:0.9,to:0.2}, duration:900+i*200, yoyo:true, repeat:-1, ease:'Sine.easeInOut', delay:i*150 });
    scene.tweens.add({ targets:aura, scaleX:{from:1.0,to:1.15}, duration:1100+i*180, yoyo:true, repeat:-1, ease:'Sine.easeInOut', delay:i*100 });
  }
  for (let i = 0; i < 8; i++) {
    const spark = scene.add.graphics().setDepth(5);
    spark.fillStyle(0x44eeff, 0.9); spark.fillCircle(0,0,1.5);
    container.add(spark);
    const radius = 22+Math.random()*6, speed = 2200+Math.random()*800, startA = (i/8)*Math.PI*2;
    scene.tweens.add({ targets:{t:0}, t:1, duration:speed, repeat:-1, ease:'Linear',
      onUpdate:(tw) => { const angle=startA+tw.progress*Math.PI*2; spark.x=Math.cos(angle)*radius; spark.y=14+Math.sin(angle)*5; spark.alpha=0.4+0.6*Math.abs(Math.sin(angle)); } });
  }
  const crown = scene.add.graphics().setDepth(15);
  _drawCrown(crown); crown.y = -54; container.add(crown);
  scene.tweens.add({ targets:crown, y:{from:-54,to:-62}, duration:1000, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
  scene.tweens.add({ targets:crown, angle:{from:-3,to:3}, duration:2000, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
  const halo = scene.add.graphics().setDepth(14);
  halo.fillStyle(0xffd700,0.12); halo.fillEllipse(0,-54,36,10);
  halo.lineStyle(1,0xffd700,0.4); halo.strokeEllipse(0,-54,36,10);
  container.add(halo);
  scene.tweens.add({ targets:halo, alpha:{from:0.8,to:0.2}, duration:800, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
}

function _drawCrown(g) {
  g.fillStyle(0xffd700,1); g.fillRect(-12,-2,24,6);
  const pts = [[-12,-2],[-12,-12],[-6,-7],[0,-16],[6,-7],[12,-12],[12,-2]];
  g.fillPoints(pts.map(([x,y])=>({x,y})),true);
  g.fillStyle(0xffec6e,0.6);
  g.fillTriangle(0,-16,-4,-8,4,-8); g.fillTriangle(-12,-12,-9,-6,-6,-7); g.fillTriangle(12,-12,9,-6,6,-7);
  g.fillStyle(0xff2244,1); g.fillCircle(0,-8,2.5);
  g.fillStyle(0x44aaff,1); g.fillCircle(-8,-1,2); g.fillCircle(8,-1,2);
  g.fillStyle(0x88ffcc,1); g.fillCircle(-4,-1,1.5); g.fillCircle(4,-1,1.5);
  g.lineStyle(1,0xaa8800,0.8); g.strokePoints(pts.map(([x,y])=>({x,y})),true);
}

/* ── Chat Bubble ── */
function showChatBubble(scene, container, text) {
  if (container._bubble) { container._bubble.destroy(); container._bubbleBg?.destroy(); clearTimeout(container._bubbleTimer); }
  const txt = scene.add.text(0,-62,text,{ fontSize:'11px',fontFamily:'Sarabun,sans-serif',color:'#ffffff', wordWrap:{width:150},align:'center',stroke:'#000',strokeThickness:2 }).setOrigin(0.5,1).setDepth(20);
  const b=txt.getBounds(), bw=b.width+16, bh=b.height+12;
  const bg=scene.add.graphics().setDepth(19);
  bg.fillStyle(0x1c2535,0.93); bg.fillRoundedRect(-bw/2,-62-bh+4,bw,bh,7);
  bg.lineStyle(1.5,0x60a5fa,0.8); bg.strokeRoundedRect(-bw/2,-62-bh+4,bw,bh,7);
  bg.fillStyle(0x1c2535,0.93); bg.fillTriangle(-5,-57,5,-57,0,-51);
  container.add([bg,txt]);
  container._bubble=txt; container._bubbleBg=bg;
  container._bubbleTimer=setTimeout(()=>{ scene.tweens.add({targets:[txt,bg],alpha:0,duration:400,onComplete:()=>{txt.destroy();bg.destroy();}}); container._bubble=null; },4000);
}

/* ═══════════════════════════════════════════════════════════════
   LOCAL PLAYER
═══════════════════════════════════════════════════════════════ */
export class LocalPlayer {
  constructor(scene, x, y, username, ap) {
    this.scene=scene; this.username=username; this.ap=resolveAp(ap);
    this.x=x; this.y=y; this.vx=0; this.vy=0;
    this.idle=false; this.direction='down';
    this._frame=0; this._frameTimer=0; this._idleTimer=null;
    this._targetX=x; this._targetY=y; this._clicking=false;
    this._build(); this._resetIdle();
  }
  _build() {
    const prefix=generateTextures(this.scene,this.ap,true);
    this._prefix=prefix;
    this.container=this.scene.add.container(this.x,this.y).setDepth(5);
    this.sprite=this.scene.add.image(0,0,`${prefix}_down_0`).setOrigin(0.5,0.75);
    this.nameTag=makeNameTag(this.scene,this.username,true);
    this.container.add([this.sprite,this.nameTag]);
    if (isAdmin(this.username)) addAdminFX(this.scene,this.container);
  }
  showChat(text) { showChatBubble(this.scene,this.container,text); }
  setClickTarget(wx,wy) { this._targetX=wx; this._targetY=wy; this._clicking=true; }
  update(dt, cursors, _wasd, bounds, collidables) {
    const sec=dt/1000;
    this.vx=0; this.vy=0;
    let moved=false, dir=this.direction;
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
      if (this._frameTimer>120) { this._frameTimer=0; this._frame=(this._frame+1)%3; }
      this._resetIdle();
    } else { this._frame=0; this._frameTimer=0; }
    const tkey=`${this._prefix}_${this.direction}_${this._frame}`;
    if (this.scene.textures.exists(tkey)) this.sprite.setTexture(tkey);
    this.sprite.setAlpha(this.idle?0.55:1);
  }
  _resetIdle() { clearTimeout(this._idleTimer); this.idle=false; this._idleTimer=setTimeout(()=>{this.idle=true;},IDLE_TIMEOUT_MS); }
  destroy() { clearTimeout(this._idleTimer); this.container?.destroy(); }
}

/* ═══════════════════════════════════════════════════════════════
   REMOTE PLAYER
═══════════════════════════════════════════════════════════════ */
export class RemotePlayer {
  constructor(scene, id, x, y, username, ap) {
    this.scene=scene; this.id=id; this.username=username; this.ap=resolveAp(ap);
    this.x=x; this.y=y; this.tx=x; this.ty=y;
    this.idle=false; this.direction='down';
    this._frame=0; this._frameTimer=0; this._moving=false;
    this._build();
  }
  _build() {
    const prefix=generateTextures(this.scene,this.ap,false);
    this._prefix=prefix;
    this.container=this.scene.add.container(this.x,this.y).setDepth(5);
    this.sprite=this.scene.add.image(0,0,`${prefix}_down_0`).setOrigin(0.5,0.75);
    this.nameTag=makeNameTag(this.scene,this.username,false);
    this.container.add([this.sprite,this.nameTag]);
    if (isAdmin(this.username)) addAdminFX(this.scene,this.container);
  }
  showChat(text) { showChatBubble(this.scene,this.container,text); }
  setTarget(x,y,idle=false) {
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
      if (this._frameTimer>130) { this._frameTimer=0; this._frame=(this._frame+1)%3; }
    } else { this._frame=0; this._frameTimer=0; }
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
