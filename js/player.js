/**
 * player.js — Pixel-art style character (reference: sci-fi office game)
 * Top-down isometric look: big head, suit/shirt, natural walk with distance-based frames
 */

import { IDLE_TIMEOUT_MS } from './config.js';

export const PLAYER_SPEED = 130;
const ADMIN_SECRET = '0910655667';
export function isAdmin(username) { return String(username).trim() === ADMIN_SECRET; }
export const PLAYER_SIZE = 28;

/* ═══════════════════════════════════════════════════════════════
   APPEARANCE POOLS
═══════════════════════════════════════════════════════════════ */
// Skin tones
const SKINS = [
  0xffe0c0, 0xf4c28a, 0xe8a870, 0xd48060,
  0xc07040, 0x8d5524, 0xfff0e0, 0xf8d0a0,
  0xd4956a, 0xb07040, 0x7a4020, 0x5a2c10,
];
// Hair colors — dark/natural + some stylized
const HAIRS = [
  0x1a1a1a, 0x2c1810, 0x6b3a2a, 0xc8a050,
  0xf0e0b0, 0xe83030, 0x9b30e8, 0x30b8e8,
  0x208040, 0xff8000, 0xffd700, 0x204080,
  0x800040, 0x008080, 0xa0a0a0, 0x602040,
];
// Suit/shirt top colors
const TOPS = [
  0x2a3a55, 0x1e2d45, 0x3a2a40, 0x1a3a2a,  // dark suits
  0x4a5568, 0x374151, 0x2d3748, 0x1a202c,  // grey suits
  0x1e3a5f, 0x1a4a2a, 0x4a1a1a, 0x3a3a1a,  // colored suits
  0xffffff, 0xf0f0f0, 0xe8e8f0, 0xf0e8e0,  // white shirts
  0x4a9eff, 0xe05555, 0x55c070, 0xf0a030,  // bright shirts
  0xb06edd, 0x40cccc, 0xff6090, 0xf0e040,
];
// Tie/accent colors
const TIES = [
  0xe53e3e, 0x3182ce, 0x38a169, 0xd69e2e,
  0x805ad5, 0xdd6b20, 0x319795, 0x00000000, // 0=no tie
  0xe2e8f0, 0xfed7aa, 0xfbb6ce, 0xa3e635,
];
// Pants
const PANTS = [
  0x1a2035, 0x2d3748, 0x1a1a1a, 0x2a2a3a,
  0x1e3a2a, 0x3a2a1a, 0x4a3a50, 0x2a3a50,
  0x3a1a1a, 0x1a3a3a,
];
// Shoes
const SHOES = [
  0x1a1a1a, 0x2a1a0a, 0xffffff, 0xa02020,
  0x204080, 0x3a3a3a, 0x8b4513, 0xc8c8c8,
];
// Hair styles: 0-5 male, 0-5 female
// Eye colors
const EYE_COLORS = ['#1a1a2e','#1a3a6e','#1a4a1a','#5a3a10'];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// Weighted tie — 40% no tie
const TIE_POOL = [0,0,0,0,1,1,2,2,3,4,5,6,7,8,9,10,11];

export function randomAppearance(gender) {
  return {
    gender,
    skinIdx:   Math.floor(Math.random() * SKINS.length),
    hairIdx:   Math.floor(Math.random() * HAIRS.length),
    topIdx:    Math.floor(Math.random() * TOPS.length),
    tieIdx:    pick(TIE_POOL),
    pantsIdx:  Math.floor(Math.random() * PANTS.length),
    shoeIdx:   Math.floor(Math.random() * SHOES.length),
    hairStyle: Math.floor(Math.random() * 6),
    eyeIdx:    Math.floor(Math.random() * EYE_COLORS.length),
    glasses:   Math.random() < 0.25,
    blush:     Math.random() < 0.2,
    // Accessory: 0=none,1=earring,2=necklace,3=badge
    accessory: Math.floor(Math.random() * 4),
  };
}

export function packAppearance(_ap) { return 0; }

export function resolveAp(data) {
  if (data && data.gender) {
    return {
      gender:    data.gender,
      skinIdx:   data.skinIdx   ?? 0,
      hairIdx:   data.hairIdx   ?? 0,
      topIdx:    data.topIdx    ?? 0,
      tieIdx:    data.tieIdx    ?? 0,
      pantsIdx:  data.pantsIdx  ?? 0,
      shoeIdx:   data.shoeIdx   ?? 0,
      hairStyle: data.hairStyle ?? 0,
      eyeIdx:    data.eyeIdx    ?? 0,
      glasses:   data.glasses   ?? false,
      blush:     data.blush     ?? false,
      accessory: data.accessory ?? 0,
    };
  }
  const idx = Number(data?.avatarIndex ?? data ?? 0) % 12;
  return {
    gender: idx >= 6 ? 'f' : 'm',
    skinIdx: idx % SKINS.length, hairIdx: idx % HAIRS.length,
    topIdx: idx % TOPS.length, tieIdx: 0,
    pantsIdx: idx % PANTS.length, shoeIdx: 0,
    hairStyle: idx % 6, eyeIdx: 0,
    glasses: false, blush: false, accessory: 0,
  };
}

/* ═══════════════════════════════════════════════════════════════
   PIXEL-ART CHARACTER DRAW
   Style: top-down isometric, big head (~40% of height),
   suit with tie, natural proportions like reference image
═══════════════════════════════════════════════════════════════ */
function hexCss(hex) { return '#' + ('000000' + (hex >>> 0).toString(16)).slice(-6); }
function darken(hex, a) {
  return ((Math.max(0,((hex>>16)&0xff)-Math.round(255*a))<<16)|
          (Math.max(0,((hex>>8)&0xff)-Math.round(255*a))<<8)|
          (Math.max(0,(hex&0xff)-Math.round(255*a))));
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

/**
 * walkFrame: 0=idle, 1=step-A (right foot fwd), 2=step-B (left foot fwd)
 * distanceMoved: used for distance-based frame switching externally
 */
function drawPixelChar(ctx, W, H, ap, isLocal, walkFrame) {
  const f    = walkFrame ?? 0;
  const cx   = W / 2;
  // anchor: feet at bottom-ish
  const feet = H * 0.92;

  const skin  = hexCss(SKINS[ap.skinIdx % SKINS.length]);
  const skinD = hexCss(darken(SKINS[ap.skinIdx % SKINS.length], 0.18));
  const hair  = hexCss(HAIRS[ap.hairIdx % HAIRS.length]);
  const top   = hexCss(TOPS[ap.topIdx % TOPS.length]);
  const topD  = hexCss(darken(TOPS[ap.topIdx % TOPS.length], 0.25));
  const tie   = ap.tieIdx === 0 ? null : hexCss(TIES[ap.tieIdx % TIES.length]);
  const pants = hexCss(PANTS[ap.pantsIdx % PANTS.length]);
  const pantsD= hexCss(darken(PANTS[ap.pantsIdx % PANTS.length], 0.2));
  const shoe  = hexCss(SHOES[ap.shoeIdx % SHOES.length]);
  const shoeD = hexCss(darken(SHOES[ap.shoeIdx % SHOES.length], 0.25));
  const isFem = ap.gender === 'f';

  ctx.clearRect(0, 0, W, H);

  // ── Body bob — very subtle, just 1px ──
  const bob = f === 0 ? 0 : -1;

  // ── Walk leg offsets (distance-based, smooth) ──
  // f=1: R foot forward (+x, -y lift), L foot back
  // f=2: L foot forward, R foot back
  const SWING = 4;
  const LIFT  = 3;
  let rLx=0, rLy=0, lLx=0, lLy=0;
  let rAy=0, lAy=0; // arms stay still — legs only animate
  if (f===1) { rLx= SWING; rLy=-LIFT; lLx=-SWING; lLy=0; }
  if (f===2) { rLx=-SWING; rLy=0;     lLx= SWING; lLy=-LIFT; }

  const by = feet + bob; // base Y for feet

  // ── Shadow ──
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(cx, by+1, 9, 3, 0, 0, Math.PI*2); ctx.fill();

  // ── Shoes ──
  // Left shoe
  ctx.fillStyle = shoe;
  roundRect(ctx, cx-9+lLx-1, by-4+lLy, 8, 4, 2); ctx.fill();
  ctx.fillStyle = shoeD;
  ctx.fillRect(cx-9+lLx-1, by-2+lLy, 8, 1);
  // Right shoe
  ctx.fillStyle = shoe;
  roundRect(ctx, cx+2+rLx-1, by-4+rLy, 8, 4, 2); ctx.fill();
  ctx.fillStyle = shoeD;
  ctx.fillRect(cx+2+rLx-1, by-2+rLy, 8, 1);

  // ── Legs / pants ──
  if (isFem) {
    // skirt or trousers — slim fit
    ctx.fillStyle = pants;
    ctx.fillRect(cx-7+lLx, by-12+lLy, 6, 9);
    ctx.fillRect(cx+1+rLx, by-12+rLy, 6, 9);
    // skirt flare
    ctx.fillStyle = topD;
    ctx.beginPath();
    ctx.moveTo(cx-9, by-16); ctx.lineTo(cx+9, by-16);
    ctx.lineTo(cx+11, by-8); ctx.lineTo(cx-11, by-8);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = pants;
    ctx.fillRect(cx-8+lLx, by-13+lLy, 7, 10);
    ctx.fillRect(cx+1+rLx, by-13+rLy, 7, 10);
    // crotch join
    ctx.fillRect(cx-8, by-13, 16, 5);
    // pants crease
    ctx.fillStyle = pantsD;
    ctx.fillRect(cx-5+lLx, by-12+lLy, 2, 9);
    ctx.fillRect(cx+3+rLx, by-12+rLy, 2, 9);
    // belt
    ctx.fillStyle = darken(TOPS[ap.topIdx%TOPS.length],0.4) > 0
      ? hexCss(darken(TOPS[ap.topIdx%TOPS.length],0.5)) : '#2a1a08';
    ctx.fillRect(cx-8, by-15, 16, 2.5);
    // belt buckle
    ctx.fillStyle = '#c8a820';
    ctx.fillRect(cx-2, by-15, 4, 2.5);
  }

  // ── Suit jacket / shirt body ──
  ctx.fillStyle = top;
  roundRect(ctx, cx-9, by-28, 18, 14, 2); ctx.fill();
  // jacket lapels / shadow sides
  ctx.fillStyle = topD;
  ctx.fillRect(cx-9, by-28, 3, 14);
  ctx.fillRect(cx+6, by-28, 3, 14);

  // ── Tie or collar detail ──
  if (tie) {
    ctx.fillStyle = tie;
    ctx.beginPath();
    ctx.moveTo(cx-1.5, by-28); ctx.lineTo(cx+1.5, by-28);
    ctx.lineTo(cx+2.5, by-22); ctx.lineTo(cx, by-18); ctx.lineTo(cx-2.5, by-22);
    ctx.closePath(); ctx.fill();
    // tie knot
    ctx.fillStyle = hexCss(darken(TIES[ap.tieIdx%TIES.length], 0.2));
    roundRect(ctx, cx-2, by-29, 4, 3, 1); ctx.fill();
  } else {
    // open collar / shirt
    ctx.fillStyle = hexCss(darken(TOPS[ap.topIdx%TOPS.length], 0.15));
    ctx.beginPath(); ctx.moveTo(cx-2,by-28); ctx.lineTo(cx,by-24); ctx.lineTo(cx+2,by-28); ctx.closePath(); ctx.fill();
  }

  // ── Arms ──
  // Left arm
  ctx.fillStyle = topD;
  roundRect(ctx, cx-15, by-27+lAy, 6, 12, 2); ctx.fill();
  // Right arm
  roundRect(ctx, cx+9, by-27+rAy, 6, 12, 2); ctx.fill();

  // ── Hands ──
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(cx-12, by-16+lAy, 3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+12, by-16+rAy, 3, 0, Math.PI*2); ctx.fill();

  // ── Neck ──
  ctx.fillStyle = skin;
  ctx.fillRect(cx-3, by-32, 6, 5);

  // ── Head — larger, rounder (pixel art style) ──
  ctx.fillStyle = skin;
  roundRect(ctx, cx-10, by-50, 20, 19, 6); ctx.fill();

  // ── Ear ──
  ctx.fillStyle = skinD;
  ctx.beginPath(); ctx.arc(cx-10, by-42, 3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+10, by-42, 3, 0, Math.PI*2); ctx.fill();

  // ── Hair ──
  drawPixelHair(ctx, ap.hairStyle, isFem, cx, by, hair, ap.hairIdx);

  // ── Eyes ──
  // whites
  ctx.fillStyle = '#f8f8ff';
  ctx.beginPath(); ctx.ellipse(cx-3.5, by-41, 2.5, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx+3.5, by-41, 2.5, 3, 0, 0, Math.PI*2); ctx.fill();
  // pupils
  ctx.fillStyle = EYE_COLORS[ap.eyeIdx % EYE_COLORS.length];
  ctx.beginPath(); ctx.arc(cx-3.5, by-40, 1.6, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+3.5, by-40, 1.6, 0, Math.PI*2); ctx.fill();
  // shine
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.arc(cx-2.8, by-41.5, 0.7, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+4.2, by-41.5, 0.7, 0, Math.PI*2); ctx.fill();

  // ── Glasses ──
  if (ap.glasses) {
    ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 1.2;
    roundRect(ctx, cx-7, by-44, 5, 5, 2); ctx.stroke();
    roundRect(ctx, cx+2, by-44, 5, 5, 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx-2, by-41.5); ctx.lineTo(cx+2, by-41.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx-11, by-42); ctx.lineTo(cx-7, by-42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+7, by-42); ctx.lineTo(cx+11, by-42); ctx.stroke();
  }

  // ── Eyebrows ──
  ctx.strokeStyle = hexCss(darken(HAIRS[ap.hairIdx % HAIRS.length], 0.05));
  ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx-7, by-46); ctx.lineTo(cx-2, by-45); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+7, by-46); ctx.lineTo(cx+2, by-45); ctx.stroke();

  // ── Mouth ──
  ctx.strokeStyle = isFem ? '#c06070' : '#a05060';
  ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(cx, by-36, 2, 0.15, Math.PI-0.15); ctx.stroke();

  // ── Blush ──
  if (ap.blush) {
    ctx.fillStyle = 'rgba(255,100,100,0.22)';
    ctx.beginPath(); ctx.ellipse(cx-7, by-39, 3.5, 2, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+7, by-39, 3.5, 2, 0, 0, Math.PI*2); ctx.fill();
  }

  // ── Badge (ID card on chest) ──
  if (ap.accessory === 3) {
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, cx-1, by-26, 7, 5, 1); ctx.fill();
    ctx.fillStyle = '#4a9eff';
    ctx.fillRect(cx, by-25, 5, 1.5);
    ctx.fillStyle = '#aaa';
    ctx.fillRect(cx, by-23, 4, 1);
  }

  // ── Earring (female) ──
  if (ap.accessory === 1 && isFem) {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.arc(cx-10, by-38, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+10, by-38, 2, 0, Math.PI*2); ctx.fill();
  }

  // ── Local player dot ──
  if (isLocal) {
    ctx.fillStyle = '#4ade80';
    ctx.beginPath(); ctx.arc(cx, by-56, 3.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, by-56, 1.5, 0, Math.PI*2); ctx.fill();
  }
}

/* ── Pixel hair styles 0-5 per gender ── */
function drawPixelHair(ctx, style, isFem, cx, by, hair, hairIdx) {
  ctx.fillStyle = hair;
  if (isFem) {
    switch (style % 6) {
      case 0: // long straight
        roundRect(ctx, cx-11, by-52, 22, 13, 5); ctx.fill();
        ctx.fillRect(cx-11, by-44, 3, 14); ctx.fillRect(cx+8, by-44, 3, 14); break;
      case 1: // ponytail
        roundRect(ctx, cx-11, by-52, 22, 13, 5); ctx.fill();
        ctx.fillRect(cx-11, by-44, 3, 8);
        roundRect(ctx, cx+8, by-47, 5, 22, 3); ctx.fill(); break;
      case 2: // bun
        roundRect(ctx, cx-11, by-52, 22, 11, 5); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+8, by-51, 6, 0, Math.PI*2); ctx.fill(); break;
      case 3: // bob
        roundRect(ctx, cx-12, by-52, 24, 15, 5); ctx.fill();
        ctx.fillRect(cx-12, by-44, 4, 10); ctx.fillRect(cx+8, by-44, 4, 10); break;
      case 4: // twin tails
        roundRect(ctx, cx-11, by-52, 22, 11, 5); ctx.fill();
        roundRect(ctx, cx-15, by-49, 5, 20, 3); ctx.fill();
        roundRect(ctx, cx+10, by-49, 5, 20, 3); ctx.fill(); break;
      case 5: // pixie short
        roundRect(ctx, cx-11, by-52, 22, 10, 5); ctx.fill();
        ctx.fillRect(cx-11, by-45, 3, 5); break;
    }
  } else {
    switch (style % 6) {
      case 0: // short neat
        roundRect(ctx, cx-11, by-52, 22, 11, 5); ctx.fill();
        ctx.fillRect(cx-11, by-45, 3, 6); ctx.fillRect(cx+8, by-45, 3, 6); break;
      case 1: // side part
        roundRect(ctx, cx-12, by-52, 23, 12, 5); ctx.fill();
        ctx.fillRect(cx-12, by-45, 5, 8); break;
      case 2: // messy
        roundRect(ctx, cx-11, by-52, 22, 11, 5); ctx.fill();
        ctx.fillRect(cx-3, by-54, 3, 5); ctx.fillRect(cx+1, by-55, 3, 6); ctx.fillRect(cx+4, by-53, 3, 4); break;
      case 3: // buzz cut
        roundRect(ctx, cx-11, by-51, 22, 8, 4); ctx.fill(); break;
      case 4: // slick back
        roundRect(ctx, cx-11, by-52, 22, 10, 5); ctx.fill();
        ctx.fillRect(cx-11, by-45, 22, 2); break;
      case 5: // medium wavy
        roundRect(ctx, cx-11, by-52, 22, 13, 5); ctx.fill();
        ctx.fillRect(cx-11, by-44, 3, 10); ctx.fillRect(cx+8, by-44, 3, 10);
        ctx.fillRect(cx-13, by-38, 4, 6); ctx.fillRect(cx+9, by-38, 4, 6); break;
    }
  }
}

/* ── Export for ui.js preview ── */
export function drawAvatarToCanvas(canvas, ap) {
  drawPixelChar(canvas.getContext('2d'), canvas.width, canvas.height, resolveAp(ap), false, 0);
}

/* ═══════════════════════════════════════════════════════════════
   PHASER TEXTURE GENERATION
   All 12 frames pre-generated at build time
═══════════════════════════════════════════════════════════════ */
function generateTextures(scene, ap, isLocal) {
  const key = `px_${ap.gender}${ap.skinIdx}${ap.hairIdx}${ap.topIdx}${ap.tieIdx}${ap.pantsIdx}${ap.shoeIdx}${ap.hairStyle}${ap.eyeIdx}${ap.glasses?1:0}${ap.blush?1:0}${ap.accessory}_${isLocal?'l':'r'}`;
  const dirs = ['down','left','right','up'];
  dirs.forEach(dir => {
    [0,1,2].forEach(frame => {
      const tkey = `${key}_${dir}_${frame}`;
      if (scene.textures.exists(tkey)) return;
      const off = document.createElement('canvas');
      off.width = 48; off.height = 64;
      const ctx = off.getContext('2d');
      drawPixelChar(ctx, 48, 64, ap, isLocal, frame);
      if (dir === 'left') {
        const tmp = document.createElement('canvas');
        tmp.width = 48; tmp.height = 64;
        const tc = tmp.getContext('2d');
        tc.save(); tc.scale(-1,1); tc.drawImage(off, -48, 0); tc.restore();
        scene.textures.addCanvas(tkey, tmp);
      } else {
        scene.textures.addCanvas(tkey, off);
      }
    });
  });
  return key;
}

/* ── Name tag ── */
function makeNameTag(scene, name, isLocal) {
  if (isAdmin(name)) return scene.add.text(0,-38,'',{fontSize:'10px',fontFamily:'Sarabun,sans-serif',color:'#0000'}).setOrigin(0.5,1).setDepth(10);
  return scene.add.text(0,-38, name, {
    fontSize:'10px', fontFamily:'Sarabun,sans-serif',
    color: isLocal ? '#4ade80' : '#d1d5db',
    stroke:'#000', strokeThickness:3, padding:{x:3,y:2},
  }).setOrigin(0.5,1).setDepth(10);
}

/* ── Level-2 admin check (set externally by game.js) ── */
let _isLevel2Username = (_username) => false;
export function setLevel2Checker(fn) { _isLevel2Username = fn; }

/* ── Level-2 yellow ring aura (simple, no crown) ── */
function addLevel2FX(scene, container) {
  const ring = scene.add.graphics().setDepth(4);
  ring.lineStyle(2, 0xffd700, 0.8);
  ring.strokeEllipse(0, 14, 40, 11);
  ring.fillStyle(0xffd700, 0.12);
  ring.fillEllipse(0, 14, 40, 11);
  container.add(ring);
  scene.tweens.add({ targets: ring, alpha: { from: 1, to: 0.35 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.tweens.add({ targets: ring, scaleX: { from: 1.0, to: 1.08 }, scaleY: { from: 1.0, to: 1.08 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return ring;
}

/* ── Admin FX ── */
function addAdminFX(scene, container) {
  const auraColors = [0x00d4ff,0x0088ff,0x44eeff,0x0055cc];
  for (let i=0;i<4;i++){
    const aura=scene.add.graphics().setDepth(4);
    const col=auraColors[i];
    aura.fillStyle(col,0.18-i*0.03); aura.fillEllipse(0,14,52+i*14,12+i*4);
    aura.lineStyle(1,col,0.5-i*0.1); aura.strokeEllipse(0,14,52+i*14,12+i*4);
    container.add(aura);
    scene.tweens.add({targets:aura,alpha:{from:0.9,to:0.2},duration:900+i*200,yoyo:true,repeat:-1,ease:'Sine.easeInOut',delay:i*150});
    scene.tweens.add({targets:aura,scaleX:{from:1.0,to:1.15},duration:1100+i*180,yoyo:true,repeat:-1,ease:'Sine.easeInOut',delay:i*100});
  }
  for (let i=0;i<8;i++){
    const spark=scene.add.graphics().setDepth(5);
    spark.fillStyle(0x44eeff,0.9); spark.fillCircle(0,0,1.5); container.add(spark);
    const radius=22+Math.random()*6, speed=2200+Math.random()*800, startA=(i/8)*Math.PI*2;
    scene.tweens.add({targets:{t:0},t:1,duration:speed,repeat:-1,ease:'Linear',
      onUpdate:(tw)=>{const angle=startA+tw.progress*Math.PI*2; spark.x=Math.cos(angle)*radius; spark.y=14+Math.sin(angle)*5; spark.alpha=0.4+0.6*Math.abs(Math.sin(angle));}});
  }
  const crown=scene.add.graphics().setDepth(15);
  _drawCrown(crown); crown.y=-54; container.add(crown);
  scene.tweens.add({targets:crown,y:{from:-54,to:-62},duration:1000,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  scene.tweens.add({targets:crown,angle:{from:-3,to:3},duration:2000,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  const halo=scene.add.graphics().setDepth(14);
  halo.fillStyle(0xffd700,0.12); halo.fillEllipse(0,-54,36,10);
  halo.lineStyle(1,0xffd700,0.4); halo.strokeEllipse(0,-54,36,10);
  container.add(halo);
  scene.tweens.add({targets:halo,alpha:{from:0.8,to:0.2},duration:800,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
}
function _drawCrown(g){
  g.fillStyle(0xffd700,1); g.fillRect(-12,-2,24,6);
  const pts=[[-12,-2],[-12,-12],[-6,-7],[0,-16],[6,-7],[12,-12],[12,-2]];
  g.fillPoints(pts.map(([x,y])=>({x,y})),true);
  g.fillStyle(0xffec6e,0.6); g.fillTriangle(0,-16,-4,-8,4,-8); g.fillTriangle(-12,-12,-9,-6,-6,-7); g.fillTriangle(12,-12,9,-6,6,-7);
  g.fillStyle(0xff2244,1); g.fillCircle(0,-8,2.5);
  g.fillStyle(0x44aaff,1); g.fillCircle(-8,-1,2); g.fillCircle(8,-1,2);
  g.fillStyle(0x88ffcc,1); g.fillCircle(-4,-1,1.5); g.fillCircle(4,-1,1.5);
  g.lineStyle(1,0xaa8800,0.8); g.strokePoints(pts.map(([x,y])=>({x,y})),true);
}

/* ── Chat bubble ── */
function showChatBubble(scene, container, text) {
  if (container._bubble){ container._bubble.destroy(); container._bubbleBg?.destroy(); clearTimeout(container._bubbleTimer); }
  const txt=scene.add.text(0,-58,text,{fontSize:'11px',fontFamily:'Sarabun,sans-serif',color:'#fff',wordWrap:{width:150},align:'center',stroke:'#000',strokeThickness:2}).setOrigin(0.5,1).setDepth(20);
  const b=txt.getBounds(), bw=b.width+16, bh=b.height+12;
  const bg=scene.add.graphics().setDepth(19);
  bg.fillStyle(0x1c2535,0.93); bg.fillRoundedRect(-bw/2,-58-bh+4,bw,bh,7);
  bg.lineStyle(1.5,0x60a5fa,0.8); bg.strokeRoundedRect(-bw/2,-58-bh+4,bw,bh,7);
  bg.fillStyle(0x1c2535,0.93); bg.fillTriangle(-5,-53,5,-53,0,-47);
  container.add([bg,txt]);
  container._bubble=txt; container._bubbleBg=bg;
  container._bubbleTimer=setTimeout(()=>{scene.tweens.add({targets:[txt,bg],alpha:0,duration:400,onComplete:()=>{txt.destroy();bg.destroy();}});container._bubble=null;},4000);
}

/* ═══════════════════════════════════════════════════════════════
   LOCAL PLAYER — distance-based walk frames
═══════════════════════════════════════════════════════════════ */
const STEP_DIST = 20; // pixels per frame switch

export class LocalPlayer {
  constructor(scene, x, y, username, ap) {
    this.scene=scene; this.username=username; this.ap=resolveAp(ap);
    this.x=x; this.y=y; this.vx=0; this.vy=0;
    this.idle=false; this.direction='down';
    this._frame=0;
    this._distAccum=0; // distance accumulator for frame switching
    this._idleTimer=null;
    this._targetX=x; this._targetY=y; this._clicking=false;
    this._build(); this._resetIdle();
  }
  _build(){
    const prefix=generateTextures(this.scene,this.ap,true);
    this._prefix=prefix;
    this.container=this.scene.add.container(this.x,this.y).setDepth(5);
    this.sprite=this.scene.add.image(0,0,`${prefix}_down_0`).setOrigin(0.5,0.78);
    this.nameTag=makeNameTag(this.scene,this.username,true);
    this.container.add([this.sprite,this.nameTag]);
    if(isAdmin(this.username)) addAdminFX(this.scene,this.container);
    this._level2Ring=null;
    this.refreshLevel2Aura();
  }
  refreshLevel2Aura(){
    const should=_isLevel2Username(this.username) && !isAdmin(this.username);
    if(should && !this._level2Ring) this._level2Ring=addLevel2FX(this.scene,this.container);
    if(!should && this._level2Ring){ this._level2Ring.destroy(); this._level2Ring=null; }
  }
  showChat(text){ showChatBubble(this.scene,this.container,text); }
  setClickTarget(wx,wy){ this._targetX=wx; this._targetY=wy; this._clicking=true; }
  update(dt, cursors, _wasd, bounds, collidables){
    const sec=dt/1000;
    this.vx=0; this.vy=0;
    let moved=false, dir=this.direction;
    if(cursors.left.isDown) { this.vx=-PLAYER_SPEED; dir='left';  moved=true; this._clicking=false; }
    if(cursors.right.isDown){ this.vx= PLAYER_SPEED; dir='right'; moved=true; this._clicking=false; }
    if(cursors.up.isDown)   { this.vy=-PLAYER_SPEED; dir='up';    moved=true; this._clicking=false; }
    if(cursors.down.isDown) { this.vy= PLAYER_SPEED; dir='down';  moved=true; this._clicking=false; }
    if(!moved && this._clicking){
      const dx=this._targetX-this.x, dy=this._targetY-this.y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist>4){ this.vx=(dx/dist)*PLAYER_SPEED; this.vy=(dy/dist)*PLAYER_SPEED; moved=true;
        if(Math.abs(dx)>Math.abs(dy)) dir=dx>0?'right':'left'; else dir=dy>0?'down':'up';
      } else this._clicking=false;
    }
    if(this.vx!==0&&this.vy!==0){ this.vx*=0.707; this.vy*=0.707; }
    let nx=this.x+this.vx*sec, ny=this.y+this.vy*sec;
    const r=PLAYER_SIZE/2;
    nx=Math.max(bounds.x+r,Math.min(bounds.x+bounds.width-r,nx));
    ny=Math.max(bounds.y+r,Math.min(bounds.y+bounds.height-r,ny));
    for(const obj of collidables){ const res=_resolveAABB(nx,ny,r,obj); nx=res.x; ny=res.y; }
    // Distance-based frame switching
    if(moved){
      const dx=nx-this.x, dy=ny-this.y;
      const stepDist=Math.sqrt(dx*dx+dy*dy);
      this._distAccum+=stepDist;
      if(this._distAccum>=STEP_DIST){
        this._distAccum=0;
        this._frame=this._frame===0?1:(this._frame===1?2:1);
      }
      this._resetIdle();
    } else {
      this._frame=0; this._distAccum=0;
    }
    this.x=nx; this.y=ny; this.container.setPosition(nx,ny); this.direction=dir;
    const tkey=`${this._prefix}_${this.direction}_${this._frame}`;
    if(this.scene.textures.exists(tkey)) this.sprite.setTexture(tkey);
    this.sprite.setAlpha(this.idle?0.55:1);
  }
  _resetIdle(){ clearTimeout(this._idleTimer); this.idle=false; this._idleTimer=setTimeout(()=>{this.idle=true;},IDLE_TIMEOUT_MS); }
  destroy(){ clearTimeout(this._idleTimer); this.container?.destroy(); }
}

/* ═══════════════════════════════════════════════════════════════
   REMOTE PLAYER — distance-based walk frames
═══════════════════════════════════════════════════════════════ */
export class RemotePlayer {
  constructor(scene, id, x, y, username, ap){
    this.scene=scene; this.id=id; this.username=username; this.ap=resolveAp(ap);
    this.x=x; this.y=y; this.tx=x; this.ty=y;
    this.idle=false; this.direction='down';
    this._frame=0; this._distAccum=0; this._moving=false;
    this._build();
  }
  _build(){
    const prefix=generateTextures(this.scene,this.ap,false);
    this._prefix=prefix;
    this.container=this.scene.add.container(this.x,this.y).setDepth(5);
    this.sprite=this.scene.add.image(0,0,`${prefix}_down_0`).setOrigin(0.5,0.78);
    this.nameTag=makeNameTag(this.scene,this.username,false);
    this.container.add([this.sprite,this.nameTag]);
    if(isAdmin(this.username)) addAdminFX(this.scene,this.container);
    this._level2Ring=null;
    this.refreshLevel2Aura();
  }
  refreshLevel2Aura(){
    const should=_isLevel2Username(this.username) && !isAdmin(this.username);
    if(should && !this._level2Ring) this._level2Ring=addLevel2FX(this.scene,this.container);
    if(!should && this._level2Ring){ this._level2Ring.destroy(); this._level2Ring=null; }
  }
  showChat(text){ showChatBubble(this.scene,this.container,text); }
  setTarget(x,y,idle=false){
    const dx=x-this.x, dy=y-this.y, dist=Math.sqrt(dx*dx+dy*dy);
    if(dist>3){ if(Math.abs(dx)>Math.abs(dy)) this.direction=dx>0?'right':'left'; else this.direction=dy>0?'down':'up'; this._moving=true; }
    else { this._moving=false; this._frame=0; }
    this.tx=x; this.ty=y; this.idle=idle; this.container.setAlpha(idle?0.6:1);
  }
  update(dt){
    const t=Math.min(1,(dt/1000)*14);
    const prevX=this.x, prevY=this.y;
    this.x+=(this.tx-this.x)*t; this.y+=(this.ty-this.y)*t;
    this.container.setPosition(this.x,this.y);
    if(this._moving){
      const dx=this.x-prevX, dy=this.y-prevY;
      this._distAccum+=Math.sqrt(dx*dx+dy*dy);
      if(this._distAccum>=STEP_DIST){
        this._distAccum=0;
        this._frame=this._frame===0?1:(this._frame===1?2:1);
      }
      // stop moving when close enough
      if(Math.abs(this.tx-this.x)<1&&Math.abs(this.ty-this.y)<1){ this._moving=false; this._frame=0; this._distAccum=0; }
    } else { this._frame=0; this._distAccum=0; }
    const tkey=`${this._prefix}_${this.direction}_${this._frame}`;
    if(this.scene.textures.exists(tkey)) this.sprite.setTexture(tkey);
  }
  destroy(){ this.container?.destroy(); }
}

function _resolveAABB(px,py,pr,rect){
  const eL=rect.x-pr,eR=rect.x+rect.width+pr,eT=rect.y-pr,eB=rect.y+rect.height+pr;
  if(px>eL&&px<eR&&py>eT&&py<eB){
    const dL=px-eL,dR=eR-px,dT=py-eT,dB=eB-py,m=Math.min(dL,dR,dT,dB);
    if(m===dL)px=eL; else if(m===dR)px=eR; else if(m===dT)py=eT; else py=eB;
  }
  return{x:px,y:py};
}
export function preloadSprites(_s){}
