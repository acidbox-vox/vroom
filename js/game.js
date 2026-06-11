/**
 * game.js — Entry point with click-to-move, chat bubbles, accurate online count
 */

import { WORLD_W, WORLD_H, SYNC_RATE_MS } from './config.js';
import {
  initLogin, updateUserList,
  showTooltip, moveTooltip, hideTooltip,
  openObjectModal, showNotification,
  updateMinimap, drawMinimapBg,
  clickEffect, setCurrentUsername,
} from './ui.js';
import { initChat, appendSystemMsg } from './chat.js';
import { LocalPlayer, RemotePlayer, PLAYER_SPEED, preloadSprites } from './player.js';
import { ROOM_OBJECTS } from './objects.js';
import {
  SESSION_ID, joinRoom, isNameTaken,
  emitMove, listenPlayers, startHeartbeat,
} from './firebase.js';

/* ── keep ref to localPlayer for chat bubble ────────────────── */
let _localPlayerRef  = null;
let _remotePlayersRef = null;
let _sceneRef        = null;

export function getLocalPlayer()   { return _localPlayerRef; }
export function getRemotePlayers() { return _remotePlayersRef; }

/* ═══════════════════════════════════════════════════════════════
   LOGIN FLOW
═══════════════════════════════════════════════════════════════ */
initLogin(
  async (user) => {
    try {
      const me = await joinRoom(user);
      startHeartbeat();
      setCurrentUsername(user.username);
      _bootGame(user, me.x, me.y);
    } catch (err) {
      console.error('[joinRoom]', err);
      alert('เชื่อมต่อ Firebase ไม่ได้ — ตรวจสอบ config.js และ Database Rules');
    }
  },
  (username) => isNameTaken(username),
);

/* ═══════════════════════════════════════════════════════════════
   BOOT PHASER
═══════════════════════════════════════════════════════════════ */
/* ── mask admin identity in system messages ─────────────────── */
function maskName(name) {
  return String(name).trim() === '0910655667' ? 'Admin' : name;
}

function _bootGame(user, spawnX, spawnY) {
  const container = document.getElementById('gameContainer');
  const W = container.offsetWidth  || window.innerWidth  - 284;
  const H = container.offsetHeight || window.innerHeight - 48;

  let localPlayer   = null;
  let remotePlayers = {};
  let cursors       = null;
  let lastSync      = 0;
  let hoveredObj    = null;

  new Phaser.Game({
    type:            Phaser.AUTO,
    width:           W,
    height:          H,
    backgroundColor: '#0d1117',
    parent:          'gameContainer',
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    banner: false,
    scene: { preload, create, update },
  });

  /* ── PRELOAD ─────────────────────────────────────────────────── */
  function preload() { preloadSprites(this); }

  /* ── CREATE ─────────────────────────────────────────────────── */
  function create() {
    const scene = this;
    _sceneRef   = scene;

    _drawFloor(scene);
    _drawBorder(scene);
    _drawObjects(scene);

    localPlayer   = new LocalPlayer(scene, spawnX, spawnY, user.username, user.appearance || {});
    _localPlayerRef  = localPlayer;
    _remotePlayersRef = remotePlayers;

    scene.cameras.main
      .setBounds(0, 0, WORLD_W, WORLD_H)
      .startFollow(localPlayer.container, true, 0.1, 0.1);

    cursors = scene.input.keyboard.createCursorKeys();
    // no WASD — arrow keys only

    // Pointer move: tooltip
    scene.input.on('pointermove', (ptr) => {
      const hit = _hitTest(ptr.worldX, ptr.worldY);
      if (hit) {
        if (hoveredObj?.id !== hit.id) {
          hoveredObj = hit;
          showTooltip(hit, ptr.x, ptr.y);
          scene.game.canvas.style.cursor = 'pointer';
        } else {
          moveTooltip(ptr.x, ptr.y);
        }
      } else if (hoveredObj) {
        hoveredObj = null;
        hideTooltip();
        scene.game.canvas.style.cursor = 'default';
      }
    });

    // Pointer down: object click OR move destination
    scene.input.on('pointerdown', (ptr) => {
      clickEffect(ptr.x, ptr.y);
      const hit = _hitTest(ptr.worldX, ptr.worldY);
      if (hit) {
        openObjectModal(hit);
      } else {
        // click-to-move
        localPlayer.setClickTarget(ptr.worldX, ptr.worldY);
      }
    });

    scene.input.on('pointerout', () => { hideTooltip(); hoveredObj = null; });

    _bindFirebase(scene);
    initChat(user.username, () => localPlayer, () => remotePlayers);
    drawMinimapBg(WORLD_W, WORLD_H);
  }

  /* ── UPDATE ─────────────────────────────────────────────────── */
  function update(time, delta) {
    if (!localPlayer) return;

    localPlayer.update(
      delta, cursors, null,
      { x: 0, y: 0, width: WORLD_W, height: WORLD_H },
      ROOM_OBJECTS,
    );

    if (time - lastSync > SYNC_RATE_MS) {
      lastSync = time;
      emitMove(localPlayer.x, localPlayer.y, localPlayer.idle);
    }

    Object.values(remotePlayers).forEach(rp => rp.update(delta));
    updateMinimap(localPlayer.x, localPlayer.y, WORLD_W, WORLD_H);
  }

  /* ── FIREBASE LISTENER ─────────────────────────────────────── */
  function _bindFirebase(scene) {
    let prevIds       = new Set();
    let isFirstSnapshot = true;

    listenPlayers((playersMap) => {
      const currentIds = new Set(Object.keys(playersMap));
      currentIds.delete(SESSION_ID);

      // New / existing remote players
      currentIds.forEach(id => {
        const p = playersMap[id];
        if (!p || !p.username) return; // skip invalid entries
        if (!remotePlayers[id]) {
          remotePlayers[id] = new RemotePlayer(
            scene, id,
            p.x ?? WORLD_W / 2, p.y ?? WORLD_H / 2,
            p.username,
            { gender:p.gender||'m', skinIdx:p.skinIdx||0, hairIdx:p.hairIdx||0,
              shirtIdx:p.shirtIdx||0, hairStyle:p.hairStyle||0,
              hatType:p.hatType||0, itemType:p.itemType||0, pantsIdx:p.pantsIdx||0 },
          );
          if (!isFirstSnapshot) {
            showNotification(`${maskName(p.username)} เข้าห้อง`, 'join');
            appendSystemMsg(`[ SYSTEM ] ${maskName(p.username)} เข้าห้อง`);
          }
        } else {
          remotePlayers[id].setTarget(p.x, p.y, p.idle);
        }
      });

      // Departed players
      prevIds.forEach(id => {
        if (!currentIds.has(id)) {
          const name = maskName(remotePlayers[id]?.username ?? id);
          remotePlayers[id]?.destroy();
          delete remotePlayers[id];
          showNotification(`${name} ออกจากห้อง`, 'leave');
          appendSystemMsg(`[ SYSTEM ] ${name} ออกจากห้อง`);
        }
      });

      prevIds        = new Set(currentIds);
      isFirstSnapshot = false;

      // Build full player list including self — filter invalid
      const validRemote = {};
      Object.entries(playersMap).forEach(([id, p]) => {
        if (p && p.username) validRemote[id] = p;
      });

      const allPlayers = {
        [SESSION_ID]: {
          id:          SESSION_ID,
          username:    user.username,
          ...(user.appearance||{}),
          idle:        localPlayer?.idle ?? false,
        },
        ...validRemote,
      };
      updateUserList(allPlayers, SESSION_ID);
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   HIT TEST
═══════════════════════════════════════════════════════════════ */
function _hitTest(wx, wy) {
  return ROOM_OBJECTS.find(o =>
    wx >= o.x && wx <= o.x + o.width &&
    wy >= o.y && wy <= o.y + o.height
  ) ?? null;
}

/* ═══════════════════════════════════════════════════════════════
   PHASER DRAW HELPERS
═══════════════════════════════════════════════════════════════ */
function _drawFloor(scene) {
  const g = scene.add.graphics().setDepth(0);

  // ── Background — dark charcoal ────────────────────────
  g.fillStyle(0x12161e, 1);
  g.fillRect(0, 0, WORLD_W, WORLD_H);

  // Room definitions matching objects.js layout
  const rooms = [
    { x:300, y:40,  w:420, h:280, color:0x1a2235, border:0x2a4060, label:'Central Command', lx:510, ly:48 },
    { x:760, y:40,  w:380, h:280, color:0x1a2030, border:0x243850, label:'Data Bay',         lx:950, ly:48 },
    { x:40,  y:360, w:340, h:260, color:0x1c2030, border:0x2a3a55, label:'Macro Station',    lx:210, ly:368 },
    { x:420, y:360, w:340, h:260, color:0x1e2235, border:0x2a3a55, label:'Risk Desk',        lx:590, ly:368 },
    { x:40,  y:660, w:340, h:260, color:0x181e2c, border:0x243048, label:'Sim Lab',          lx:210, ly:668 },
    { x:420, y:660, w:380, h:260, color:0x1a2030, border:0x2a3858, label:'Quant Corner',     lx:610, ly:668 },
  ];

  rooms.forEach(r => {
    // Floor fill
    g.fillStyle(r.color, 1);
    g.fillRect(r.x, r.y, r.w, r.h);

    // Subtle tile grid 32px
    g.lineStyle(1, 0x1e2a3a, 0.35);
    for (let xx = r.x; xx <= r.x+r.w; xx += 32) g.lineBetween(xx, r.y, xx, r.y+r.h);
    for (let yy = r.y; yy <= r.y+r.h; yy += 32) g.lineBetween(r.x, yy, r.x+r.w, yy);

    // Wall border — thick outer
    g.lineStyle(4, r.border, 1);
    g.strokeRect(r.x, r.y, r.w, r.h);
    // Inner highlight line
    g.lineStyle(1.5, 0x3a5070, 0.5);
    g.strokeRect(r.x+3, r.y+3, r.w-6, r.h-6);

    // Corner rivets
    [[r.x,r.y],[r.x+r.w,r.y],[r.x,r.y+r.h],[r.x+r.w,r.y+r.h]].forEach(([cx,cy]) => {
      g.fillStyle(r.border, 1); g.fillCircle(cx, cy, 5);
      g.fillStyle(0x60a5fa, 0.5); g.fillCircle(cx, cy, 2.5);
    });
  });

  // ── Corridors connecting rooms ─────────────────────────
  // Vertical: Central Command ↔ below
  g.fillStyle(0x141824, 1);
  g.fillRect(460, 320, 100, 40);   // CC → mid row
  g.fillRect(460, 620, 100, 40);   // mid row → bottom row
  // Horizontal: mid row L ↔ R
  g.fillRect(380, 400, 40, 180);
  // Horizontal: bottom row L ↔ R
  g.fillRect(380, 700, 40, 180);
  // Corridor grid lines
  g.lineStyle(1, 0x1e2a3a, 0.3);
  g.lineBetween(460,320, 460,360); g.lineBetween(560,320, 560,360);
  g.lineBetween(460,620, 460,660); g.lineBetween(560,620, 560,660);

  // ── Corridor arrows (decorative) ──────────────────────
  _drawArrow(g, 510, 335, 'down', 0x3a5070);
  _drawArrow(g, 510, 635, 'down', 0x3a5070);
  _drawArrow(g, 395, 490, 'right', 0x3a5070);
  _drawArrow(g, 395, 790, 'right', 0x3a5070);
  _drawArrow(g, 410, 490, 'left', 0x3a5070);
  _drawArrow(g, 410, 790, 'left', 0x3a5070);

  // ── Room labels ───────────────────────────────────────
  const labelStyle = { fontSize:'11px', fontFamily:'Sarabun,sans-serif', alpha:0.85 };
  rooms.forEach(r => {
    scene.add.text(r.lx, r.ly, r.label, {
      ...labelStyle,
      color:'#' + (r.border).toString(16).padStart(6,'0').replace(/^.{0}/,''),
    }).setOrigin(0.5, 0).setDepth(1).setColor('#5a8ab0').setAlpha(0.9);
  });

  // ── Outer edge dark vignette bars ────────────────────
  g.fillStyle(0x0a0d14, 1);
  g.fillRect(0,0,WORLD_W,40);          // top
  g.fillRect(0,WORLD_H-40,WORLD_W,40); // bottom
  g.fillRect(0,0,40,WORLD_H);          // left
  g.fillRect(WORLD_W-40,0,40,WORLD_H); // right
}

function _drawArrow(g, x, y, dir, color) {
  g.fillStyle(color, 0.6);
  g.lineStyle(1, color, 0.4);
  const s = 6;
  if (dir === 'down') {
    g.fillTriangle(x, y+s, x-s, y-s, x+s, y-s);
  } else if (dir === 'up') {
    g.fillTriangle(x, y-s, x-s, y+s, x+s, y+s);
  } else if (dir === 'right') {
    g.fillTriangle(x+s, y, x-s, y-s, x-s, y+s);
  } else {
    g.fillTriangle(x-s, y, x+s, y-s, x+s, y+s);
  }
}

// _roomBorder removed (minimal single room)

// _drawTree removed

function _drawBorder(_scene) { /* handled in _drawFloor */ }

/* ═══════════════════════════════════════════════════════════════
   3D ISOMETRIC OBJECT RENDERER
   แต่ละ id มี draw function เฉพาะ วาดด้วย Phaser Graphics ล้วน
   isometric: top face / left face / right face
═══════════════════════════════════════════════════════════════ */
function _drawObjects(scene) {
  ROOM_OBJECTS.forEach(obj => {
    const g = scene.add.graphics().setDepth(2);
    const fn = OBJ_DRAW[obj.id] || OBJ_DRAW['_default'];
    fn(g, scene, obj);

    // name label under object
    const cx = obj.x + obj.width / 2;
    scene.add.text(cx, obj.y + obj.height + 6, obj.name, {
      fontSize: '9px', fontFamily: 'Sarabun, sans-serif',
      color: '#8899bb', align: 'center',
      stroke: '#0a0e17', strokeThickness: 3,
      wordWrap: { width: obj.width + 16 },
    }).setOrigin(0.5, 0).setDepth(3);

    // pulsing active dot
    const dot = scene.add.circle(obj.x + obj.width - 6, obj.y + 6, 3, 0x4ade80, 0.9).setDepth(4);
    scene.tweens.add({ targets: dot, alpha: { from:0.9, to:0.15 }, duration:1200+Math.random()*600, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
  });
}

/* ── iso helpers ────────────────────────────────────────────── */
// draw iso box: cx,cy = center-bottom of box, w/h/d in px
function isoBox(g, cx, cy, w, h, d, cTop, cLeft, cRight) {
  const hw = w / 2, hd = d / 4;
  // top face
  g.fillStyle(cTop, 1);
  g.fillPoints([
    { x: cx,      y: cy - h - hd*2 },
    { x: cx + hw, y: cy - h - hd   },
    { x: cx,      y: cy - h        },
    { x: cx - hw, y: cy - h - hd   },
  ], true);
  // left face
  g.fillStyle(cLeft, 1);
  g.fillPoints([
    { x: cx - hw, y: cy - h - hd   },
    { x: cx,      y: cy - h        },
    { x: cx,      y: cy            },
    { x: cx - hw, y: cy - hd       },
  ], true);
  // right face
  g.fillStyle(cRight, 1);
  g.fillPoints([
    { x: cx,      y: cy - h        },
    { x: cx + hw, y: cy - h - hd   },
    { x: cx + hw, y: cy - hd       },
    { x: cx,      y: cy            },
  ], true);
}

function isoEdges(g, cx, cy, w, h, d, col, alpha) {
  const hw = w / 2, hd = d / 4;
  g.lineStyle(1, col, alpha);
  // top face outline
  g.strokePoints([
    { x: cx,      y: cy - h - hd*2 },
    { x: cx + hw, y: cy - h - hd   },
    { x: cx,      y: cy - h        },
    { x: cx - hw, y: cy - h - hd   },
  ], true);
  // verticals
  g.lineBetween(cx - hw, cy - h - hd,   cx - hw, cy - hd);
  g.lineBetween(cx,      cy - h,        cx,      cy);
  g.lineBetween(cx + hw, cy - h - hd,   cx + hw, cy - hd);
  // bottom edge
  g.lineBetween(cx - hw, cy - hd,       cx,      cy);
  g.lineBetween(cx + hw, cy - hd,       cx,      cy);
}

// shade helpers
function lighten(hex, a) {
  const r=Math.min(255,((hex>>16)&0xff)+Math.round(255*a));
  const g=Math.min(255,((hex>>8) &0xff)+Math.round(255*a));
  const b=Math.min(255,(hex      &0xff)+Math.round(255*a));
  return (r<<16)|(g<<8)|b;
}
function darkenC(hex, a) {
  const r=Math.max(0,((hex>>16)&0xff)-Math.round(255*a));
  const g=Math.max(0,((hex>>8) &0xff)-Math.round(255*a));
  const b=Math.max(0,(hex      &0xff)-Math.round(255*a));
  return (r<<16)|(g<<8)|b;
}

/* ═══════════════════════════════════════════════════════════════
   PER-OBJECT DRAW FUNCTIONS
═══════════════════════════════════════════════════════════════ */
const OBJ_DRAW = {

  /* ── Computer (laptop-style) ────────────────────────────── */
  computer01(g, scene, obj) { _drawLaptop(g, scene, obj, 0x4a9eff); },
  computer02(g, scene, obj) { _drawDesktop(g, scene, obj, 0x60a5fa); },

  /* ── Bulletin Board ─────────────────────────────────────── */
  board01(g, scene, obj) {
    const cx = obj.x + obj.width/2, by = obj.y + obj.height;
    // wall mount post
    g.fillStyle(0x5a4a30, 1);
    g.fillRect(cx-3, obj.y + obj.height - 10, 6, 18);
    // board body iso box
    isoBox(g, cx, by - 10, obj.width - 4, obj.height - 14, 10, 0xc8a050, 0x8a6a20, 0xa07830);
    isoEdges(g, cx, by - 10, obj.width - 4, obj.height - 14, 10, 0xf0d080, 0.5);
    // board surface (front = right face of thin box)
    const hw = (obj.width-4)/2, hd2 = 10/4;
    // cork texture lines
    g.lineStyle(1, 0xb8903a, 0.4);
    for (let i = 1; i < 4; i++) {
      const yy = (obj.y + 8) + i * ((obj.height - 22) / 4);
      g.lineBetween(obj.x + 4, yy, obj.x + obj.width - 4, yy);
    }
    // pinned notes
    _drawNote(g, cx - 12, obj.y + 16, 0xfffde7, -0.08);
    _drawNote(g, cx + 4,  obj.y + 20, 0xe8f5e9,  0.06);
    _drawNote(g, cx - 6,  obj.y + 36, 0xfce4ec,  -0.04);
    // pins
    g.fillStyle(0xe53935, 1); g.fillCircle(cx - 9, obj.y + 14, 2.5);
    g.fillStyle(0x1e88e5, 1); g.fillCircle(cx + 7, obj.y + 18, 2.5);
    g.fillStyle(0x43a047, 1); g.fillCircle(cx - 3, obj.y + 34, 2.5);
  },

  /* ── TV / Display ───────────────────────────────────────── */
  tv01(g, scene, obj) {
    const cx = obj.x + obj.width/2, by = obj.y + obj.height;
    // stand
    isoBox(g, cx, by, 14, 6, 14, 0x2a2a3a, 0x1a1a28, 0x222235);
    isoBox(g, cx, by - 6, 4, 16, 4, 0x3a3a4e, 0x252535, 0x2e2e42);
    // screen frame
    isoBox(g, cx, by - 22, obj.width - 6, obj.height - 30, 5, 0x1a1a2a, 0x111120, 0x151525);
    isoEdges(g, cx, by - 22, obj.width - 6, obj.height - 30, 5, 0x4455aa, 0.6);
    // screen glow (right face = screen surface visible)
    const sw = obj.width - 14, sh = obj.height - 36;
    g.fillStyle(0x0d2a6e, 1);
    g.fillRect(obj.x + 7, obj.y + 4, sw, sh);
    // scanlines
    g.lineStyle(1, 0x1040a0, 0.3);
    for (let yy = obj.y + 8; yy < obj.y + 4 + sh; yy += 4) {
      g.lineBetween(obj.x + 7, yy, obj.x + 7 + sw, yy);
    }
    // "on" glow
    g.fillStyle(0x1a4fff, 0.15);
    g.fillRect(obj.x + 7, obj.y + 4, sw, sh);
    // power LED
    g.fillStyle(0x00ff88, 1); g.fillCircle(obj.x + obj.width - 10, by - 24, 2);
  },

  /* ── Door ───────────────────────────────────────────────── */
  door01(g, scene, obj) {
    const cx = obj.x + obj.width/2, by = obj.y + obj.height;
    // door frame (wall section)
    isoBox(g, cx, by, obj.width + 6, 4, 14, 0x1a1a28, 0x111120, 0x151525);
    // door body
    isoBox(g, cx, by - 4, obj.width - 2, obj.height - 10, 8, 0x6b4c2a, 0x4a3018, 0x5a3c20);
    isoEdges(g, cx, by - 4, obj.width - 2, obj.height - 10, 8, 0xaa7744, 0.7);
    // door panels (decorative recesses)
    const dw = obj.width - 14;
    g.fillStyle(0x3d2610, 0.6);
    g.fillRect(obj.x + 7, obj.y + 6,  dw, (obj.height - 20)/2 - 2);
    g.fillRect(obj.x + 7, obj.y + (obj.height - 20)/2 + 10, dw, (obj.height - 20)/2 - 2);
    // door handle (knob)
    isoBox(g, obj.x + obj.width - 10, by - 4 - (obj.height - 10)/2, 5, 4, 5, 0xd4a820, 0xa07818, 0xb88c20);
    // top frame
    g.fillStyle(0x1a1a28, 1);
    g.fillRect(obj.x, obj.y, obj.width, 5);
  },

  /* ── Document / Manual ──────────────────────────────────── */
  doc01(g, scene, obj) {
    const cx = obj.x + obj.width/2, by = obj.y + obj.height;
    // book stack
    isoBox(g, cx, by,      obj.width - 4, 6,  8, 0x1565c0, 0x0d47a1, 0x1155b0);
    isoBox(g, cx, by - 6,  obj.width - 4, 6,  8, 0x1976d2, 0x1250a0, 0x1560c0);
    isoBox(g, cx, by - 12, obj.width - 2, obj.height - 18, 8, 0xe8eaf6, 0xb0b8d8, 0xc8d0e8);
    isoEdges(g, cx, by - 12, obj.width - 2, obj.height - 18, 8, 0x9fa8da, 0.8);
    // page lines on cover face
    g.lineStyle(1, 0x9fa8da, 0.5);
    for (let i = 1; i <= 4; i++) {
      const yy = obj.y + 8 + i * ((obj.height - 22) / 5);
      g.lineBetween(obj.x + 6, yy, obj.x + obj.width - 6, yy);
    }
    // spine color band
    const hw2 = (obj.width - 2) / 2, hd3 = 8 / 4;
    g.fillStyle(0x3f51b5, 1);
    g.fillPoints([
      { x: cx - hw2, y: by - 12 - hd3*2 + 8 },
      { x: cx - hw2, y: by - hd3 },
      { x: cx - hw2 + 5, y: by },
      { x: cx - hw2 + 5, y: by - 12 - hd3*2 + 8 - 3 },
    ], true);
    // bookmark ribbon
    g.fillStyle(0xe53935, 1);
    g.fillTriangle(obj.x + obj.width - 10, obj.y + 4, obj.x + obj.width - 6, obj.y + 4, obj.x + obj.width - 8, obj.y + 16);
  },

  /* ── Dashboard Monitor ──────────────────────────────────── */
  dashboard01(g, scene, obj) {
    const cx = obj.x + obj.width/2, by = obj.y + obj.height;
    _drawDesktop(g, scene, obj, 0x4ade80);
    // override screen content with chart bars
    const sw = obj.width - 18, sh = obj.height - 36, sx = obj.x + 9, sy = obj.y + 8;
    g.fillStyle(0x0a1a10, 1); g.fillRect(sx, sy, sw, sh);
    const bars = [0.4, 0.75, 0.55, 0.9, 0.65];
    const bw = (sw - 6) / bars.length - 2;
    bars.forEach((h2, i) => {
      const bh = sh * h2 * 0.85;
      const bx = sx + 3 + i * (bw + 2);
      const col = [0x4ade80, 0x22d3ee, 0xfbbf24, 0x60a5fa, 0xa78bfa][i];
      g.fillStyle(col, 0.85);
      g.fillRect(bx, sy + sh - bh - 2, bw, bh);
      g.fillStyle(lighten(col, 0.3), 0.5);
      g.fillRect(bx, sy + sh - bh - 2, bw, 2);
    });
  },

  /* ── Office Map ─────────────────────────────────────────── */
  image01(g, scene, obj) {
    const cx = obj.x + obj.width/2, by = obj.y + obj.height;
    // frame
    isoBox(g, cx, by, obj.width, 8, 10, 0x5a4a30, 0x3a2e18, 0x4a3a22);
    isoBox(g, cx, by - 8, obj.width - 2, obj.height - 14, 6, 0x2a3a50, 0x1a2838, 0x223040);
    isoEdges(g, cx, by - 8, obj.width - 2, obj.height - 14, 6, 0x60a5fa, 0.5);
    // map surface
    const mx = obj.x + 4, my = obj.y + 4, mw = obj.width - 8, mh = obj.height - 18;
    g.fillStyle(0x1a3a5c, 1); g.fillRect(mx, my, mw, mh);
    // rooms on map
    g.fillStyle(0x2a5080, 1); g.fillRect(mx+2, my+2, mw*0.4, mh*0.45);
    g.fillStyle(0x1e4060, 1); g.fillRect(mx+2, my+mh*0.5, mw*0.4, mh*0.45);
    g.fillStyle(0x2a4870, 1); g.fillRect(mx+mw*0.45, my+2, mw*0.5, mh*0.95);
    // grid lines
    g.lineStyle(1, 0x60a5fa, 0.3);
    g.lineBetween(mx+mw*0.42, my, mx+mw*0.42, my+mh);
    g.lineBetween(mx, my+mh*0.48, mx+mw*0.42, my+mh*0.48);
    // location pin
    g.fillStyle(0xff4444, 1); g.fillCircle(mx+mw*0.6, my+mh*0.4, 3);
    g.fillStyle(0xff8888, 1); g.fillCircle(mx+mw*0.6, my+mh*0.4, 1.5);
  },

  /* ── Printer ────────────────────────────────────────────── */
  printer01(g, scene, obj) {
    const cx = obj.x + obj.width/2, by = obj.y + obj.height;
    // base unit
    isoBox(g, cx, by, obj.width, obj.height * 0.55, 12, 0xdde0e8, 0xa0a4b0, 0xb8bcc8);
    isoEdges(g, cx, by, obj.width, obj.height * 0.55, 12, 0x9090a8, 0.7);
    const bh = obj.height * 0.55;
    // top lid
    isoBox(g, cx, by - bh, obj.width - 2, obj.height * 0.2, 12, 0xf0f2f8, 0xb0b4c4, 0xc8ccd8);
    isoEdges(g, cx, by - bh, obj.width - 2, obj.height * 0.2, 12, 0xffffff, 0.3);
    // paper tray slot
    g.fillStyle(0x303048, 1);
    g.fillRect(obj.x + 6, by - bh * 0.7, obj.width - 12, 4);
    // paper coming out
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(obj.x + 10, by - bh * 0.7 - 6, obj.width - 20, 8);
    g.lineStyle(1, 0xcccccc, 0.8);
    g.lineBetween(obj.x + 10, by - bh*0.7 - 3, obj.x + obj.width - 10, by - bh*0.7 - 3);
    // status light
    g.fillStyle(0x00e676, 1); g.fillCircle(obj.x + obj.width - 9, by - bh - 5, 2.5);
    // control button
    g.fillStyle(0x3a3a58, 1); g.fillCircle(obj.x + 10, by - bh - 5, 3);
  },

  /* ── Water Cooler ───────────────────────────────────────── */
  cooler01(g, scene, obj) {
    const cx = obj.x + obj.width/2, by = obj.y + obj.height;
    // base cabinet
    isoBox(g, cx, by, obj.width, obj.height * 0.45, 12, 0xdde0e8, 0xa0a4b0, 0xb8bcc8);
    isoEdges(g, cx, by, obj.width, obj.height * 0.45, 12, 0x9090a8, 0.6);
    const cbh = obj.height * 0.45;
    // water bottle (cylindrical = series of iso ellipses)
    const bcy = by - cbh;
    const bottleH = obj.height * 0.5;
    // bottle body
    g.fillStyle(0x7dd3fc, 0.7);
    g.fillEllipse(cx, bcy - bottleH * 0.5, obj.width * 0.6, obj.height * 0.12);
    g.fillStyle(0x38bdf8, 0.5);
    g.fillRect(cx - obj.width*0.3, bcy - bottleH, obj.width*0.6, bottleH * 0.95);
    // bottle highlight
    g.fillStyle(0xffffff, 0.25);
    g.fillRect(cx - obj.width*0.15, bcy - bottleH + 4, obj.width*0.12, bottleH * 0.7);
    // bottle cap
    g.fillStyle(0x0369a1, 1);
    g.fillEllipse(cx, bcy - bottleH, obj.width * 0.38, obj.height * 0.07);
    // water level inside
    g.fillStyle(0x0ea5e9, 0.4);
    g.fillRect(cx - obj.width*0.29, bcy - bottleH * 0.55, obj.width*0.58, bottleH * 0.4);
    // dispenser tap
    g.fillStyle(0x3a3a58, 1);
    g.fillRect(cx - 8, by - cbh - 8, 6, 8);
    g.fillStyle(0x22d3ee, 1);
    g.fillRect(cx - 8, by - cbh - 3, 6, 3);
    // cold light indicator
    g.fillStyle(0x38bdf8, 1); g.fillCircle(cx + obj.width*0.2, by - cbh * 0.5, 2.5);
  },

  /* ── Plant / greenery ──────────────────────────────────── */
  plant01(g, s, o) { _drawPlant(g, s, o, 0x4aaa4a); },
  plant02(g, s, o) { _drawPlant(g, s, o, 0x3a9a3a); },
  plant03(g, s, o) { _drawPlantTall(g, s, o); },
  plant04(g, s, o) { _drawPlantTall(g, s, o); },
  plant05(g, s, o) { _drawPlant(g, s, o, 0x4aaa4a); },
  plant06(g, s, o) { _drawPlantTall(g, s, o); },
  plant07(g, s, o) { _drawPlant(g, s, o, 0x3a9a3a); },
  plant08(g, s, o) { _drawPlantTall(g, s, o); },

  /* ── Sofa ───────────────────────────────────────────────── */
  sofa01(g, s, o) { _drawSofa(g, o, 0xf97316); },
  sofa02(g, s, o) { _drawSofa(g, o, 0xa78bfa); },
  sofa03(g, s, o) { _drawSofa(g, o, 0xfbbf24); },

  /* ── Server rack ────────────────────────────────────────── */
  server01(g, s, o) { _drawServer(g, o, 0x22d3ee); },
  server02(g, s, o) { _drawServer(g, o, 0x4ade80); },

  /* ── Network switch ─────────────────────────────────────── */
  network01(g, s, o) {
    const cx=o.x+o.width/2, by=o.y+o.height;
    isoBox(g,cx,by,o.width-4,o.height*0.5,10,0x2a3060,0x181830,0x222248);
    isoEdges(g,cx,by,o.width-4,o.height*0.5,10,0x4466ff,0.7);
    // LED strip
    for(let i=0;i<6;i++){
      const lx=o.x+6+i*8;
      g.fillStyle(i%2===0?0x4ade80:0xfbbf24,1);
      g.fillRect(lx,by-o.height*0.3,4,3);
    }
  },

  /* ── Trophy ─────────────────────────────────────────────── */
  trophy01(g, s, o) {
    const cx=o.x+o.width/2, by=o.y+o.height;
    // base
    isoBox(g,cx,by,o.width-6,8,8,0xb8860b,0x8a6208,0xa07010);
    // stem
    isoBox(g,cx,by-8,8,10,6,0xd4a820,0xa07818,0xb88c20);
    // cup body
    isoBox(g,cx,by-18,o.width-8,o.height-28,8,0xffd700,0xc8a000,0xe0b800);
    isoEdges(g,cx,by-18,o.width-8,o.height-28,8,0xffec6e,0.7);
    // handles
    g.fillStyle(0xffd700,1);
    g.fillEllipse(o.x+2,by-22,8,14);
    g.fillEllipse(o.x+o.width-2,by-22,8,14);
    g.fillStyle(0xd4a820,0.6);
    g.fillEllipse(o.x+2,by-22,4,10);
    g.fillEllipse(o.x+o.width-2,by-22,4,10);
    // star on top
    g.fillStyle(0xffec6e,1); g.fillCircle(cx,by-o.height+2,5);
  },

  /* ── Extra computers ─────────────────────────────────────── */
  computer03(g, s, o) { _drawLaptop(g, s, o, 0x4a9eff); },
  computer04(g, s, o) { _drawDesktop(g, s, o, 0x60a5fa); },
  computer05(g, s, o) { _drawLaptop(g, s, o, 0xa78bfa); },
  computer06(g, s, o) { _drawDesktop(g, s, o, 0x4ade80); },
  computer07(g, s, o) { _drawLaptop(g, s, o, 0xfbbf24); },
  computer08(g, s, o) { _drawDesktop(g, s, o, 0xffd700); },

  /* ── Default fallback ───────────────────────────────────── */
  _default(g, scene, obj) {
    const cx = obj.x + obj.width/2, by = obj.y + obj.height;
    isoBox(g, cx, by, obj.width - 4, obj.height - 4, 10, 0x2a3a55, 0x1a2638, 0x223040);
    isoEdges(g, cx, by, obj.width - 4, obj.height - 4, 10, 0x4a7fc0, 0.6);
  },
};

/* ── Shared sub-draws ───────────────────────────────────────── */

function _drawPlant(g, scene, obj, col) {
  const cx=obj.x+obj.width/2, by=obj.y+obj.height;
  // pot
  isoBox(g,cx,by,obj.width-8,obj.height*0.45,8,0xc87050,0x985030,0xb06040);
  // soil
  g.fillStyle(0x5a3a20,1); g.fillEllipse(cx,by-obj.height*0.45,obj.width-10,6);
  // stem
  g.fillStyle(0x4a7a20,1); g.fillRect(cx-2,by-obj.height,4,obj.height*0.55);
  // leaves
  g.fillStyle(col,1); g.fillCircle(cx,by-obj.height,obj.width*0.38);
  g.fillStyle(lighten(col,0.2),0.6); g.fillCircle(cx-5,by-obj.height-4,obj.width*0.22);
  g.fillStyle(lighten(col,0.2),0.6); g.fillCircle(cx+5,by-obj.height-4,obj.width*0.22);
}

function _drawPlantTall(g, scene, obj) {
  const cx=obj.x+obj.width/2, by=obj.y+obj.height;
  isoBox(g,cx,by,20,obj.height*0.35,10,0xc87050,0x985030,0xb06040);
  g.fillStyle(0x4a7a20,1); g.fillRect(cx-2,obj.y+4,4,obj.height*0.65);
  // fronds
  for(let i=0;i<5;i++){
    const a=(i/5)*Math.PI*2;
    g.fillStyle(0x4aaa4a,1);
    g.fillEllipse(cx+Math.cos(a)*14,obj.y+8+Math.sin(a)*6,18,8);
  }
  g.fillStyle(0x6acc6a,0.6); g.fillCircle(cx,obj.y+6,8);
}

function _drawSofa(g, obj, col) {
  const cx=obj.x+obj.width/2, by=obj.y+obj.height;
  const colD=darkenC(col,0.25), colL=lighten(col,0.15);
  // legs
  g.fillStyle(0x6b4c2a,1);
  g.fillRect(obj.x+4,by-6,6,6); g.fillRect(obj.x+obj.width-10,by-6,6,6);
  // seat cushion
  isoBox(g,cx,by-6,obj.width-4,obj.height*0.35,12,colL,colD,col);
  // back rest
  isoBox(g,cx,by-6-obj.height*0.35,obj.width-4,obj.height*0.45,7,col,colD,darkenC(col,0.1));
  isoEdges(g,cx,by-6,obj.width-4,obj.height*0.35+obj.height*0.45,12,colL,0.5);
  // arm rests
  isoBox(g,obj.x+obj.width/2-obj.width/2+6,by-6,10,obj.height*0.55,7,colL,colD,col);
  isoBox(g,obj.x+obj.width/2+obj.width/2-6,by-6,10,obj.height*0.55,7,colL,colD,col);
  // seat line
  g.lineStyle(1,colD,0.4); g.lineBetween(obj.x+10,by-6-obj.height*0.35+1,obj.x+obj.width-10,by-6-obj.height*0.35+1);
}

function _drawServer(g, obj, col) {
  const cx=obj.x+obj.width/2, by=obj.y+obj.height;
  // rack body
  isoBox(g,cx,by,obj.width-4,obj.height,8,0x2a2a3a,0x181820,0x222232);
  isoEdges(g,cx,by,obj.width-4,obj.height,8,col,0.5);
  // unit slots
  const slots=Math.floor(obj.height/12);
  for(let i=0;i<slots;i++){
    const uy=obj.y+6+i*11;
    g.fillStyle(0x1a1a28,1); g.fillRect(obj.x+4,uy,obj.width-12,8);
    g.fillStyle(i%3===0?col:0x334466,0.8); g.fillRect(obj.x+obj.width-12,uy+2,4,4);
    g.lineStyle(1,0x3a3a50,0.5); g.lineBetween(obj.x+4,uy+8,obj.x+obj.width-8,uy+8);
  }
  // power LED
  g.fillStyle(col,1); g.fillCircle(obj.x+obj.width-8,obj.y+6,2.5);
}

function _drawLaptop(g, scene, obj, screenCol) {
  const cx = obj.x + obj.width/2, by = obj.y + obj.height;
  // base / keyboard
  isoBox(g, cx, by, obj.width - 4, 7, 14, 0xc8ccd8, 0x888c9a, 0xa0a4b2);
  isoEdges(g, cx, by, obj.width - 4, 7, 14, 0xddddee, 0.5);
  // keyboard surface
  g.fillStyle(0x9a9eb0, 0.7);
  for (let row = 0; row < 3; row++) {
    for (let col2 = 0; col2 < 7; col2++) {
      g.fillRect(obj.x + 5 + col2*7, by - 4 - row*3, 5, 2);
    }
  }
  // trackpad
  g.fillStyle(0x8890a8, 0.6);
  g.fillRect(cx - 8, by - 6, 16, 5);
  // screen lid (angled back slightly = iso box)
  isoBox(g, cx, by - 7, obj.width - 6, obj.height - 18, 5, 0x303848, 0x1e2530, 0x282e3a);
  isoEdges(g, cx, by - 7, obj.width - 6, obj.height - 18, 5, 0x5566aa, 0.6);
  // screen
  const sw = obj.width - 16, sh = obj.height - 24;
  g.fillStyle(0x0a1428, 1);
  g.fillRect(obj.x + 8, obj.y + 5, sw, sh);
  g.fillStyle(screenCol, 0.15); g.fillRect(obj.x + 8, obj.y + 5, sw, sh);
  // screen content lines
  g.lineStyle(1, screenCol, 0.5);
  g.lineBetween(obj.x + 10, obj.y + 10, obj.x + 8 + sw - 2, obj.y + 10);
  g.lineStyle(1, screenCol, 0.2);
  g.lineBetween(obj.x + 10, obj.y + 14, obj.x + 8 + sw*0.7, obj.y + 14);
  g.lineBetween(obj.x + 10, obj.y + 17, obj.x + 8 + sw*0.5, obj.y + 17);
  // power light
  g.fillStyle(screenCol, 0.9); g.fillCircle(cx, by - 7, 1.5);
}

function _drawDesktop(g, scene, obj, screenCol) {
  const cx = obj.x + obj.width/2, by = obj.y + obj.height;
  // monitor stand base
  isoBox(g, cx, by, 18, 4, 14, 0xb0b4c0, 0x787c88, 0x909498);
  // stand pole
  isoBox(g, cx, by - 4, 5, 10, 5, 0xc0c4d0, 0x888c98, 0xa0a4b0);
  // monitor body
  isoBox(g, cx, by - 14, obj.width - 4, obj.height - 24, 6, 0x2a2a3c, 0x1a1a28, 0x222234);
  isoEdges(g, cx, by - 14, obj.width - 4, obj.height - 24, 6, 0x5566cc, 0.6);
  // screen face
  const sw = obj.width - 14, sh = obj.height - 32;
  g.fillStyle(0x060e20, 1); g.fillRect(obj.x + 7, obj.y + 4, sw, sh);
  g.fillStyle(screenCol, 0.1); g.fillRect(obj.x + 7, obj.y + 4, sw, sh);
  // screen glow lines
  g.lineStyle(1, screenCol, 0.5);
  g.lineBetween(obj.x + 9, obj.y + 8, obj.x + 7 + sw - 2, obj.y + 8);
  g.lineStyle(1, screenCol, 0.2);
  g.lineBetween(obj.x + 9, obj.y + 12, obj.x + 7 + sw*0.8, obj.y + 12);
  g.lineBetween(obj.x + 9, obj.y + 15, obj.x + 7 + sw*0.6, obj.y + 15);
  // power button
  g.fillStyle(screenCol, 0.8); g.fillCircle(obj.x + obj.width - 9, by - 16, 2);
}

function _drawNote(g, nx, ny, col, angle) {
  g.fillStyle(col, 0.92);
  // simple rotated-ish rect via polygon
  const w = 14, h = 10;
  const s = Math.sin(angle), c2 = Math.cos(angle);
  const pts = [[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([x,y]) => ({
    x: nx + x*c2 - y*s, y: ny + x*s + y*c2,
  }));
  g.fillPoints(pts, true);
  // text lines
  g.lineStyle(1, darkenC(col === 0xfffde7 ? 0xf9a825 : col === 0xe8f5e9 ? 0x2e7d32 : 0xc62828, 0), 0.4);
  g.lineBetween(pts[0].x + 3, pts[0].y + 3, pts[1].x - 3, pts[1].y + 3);
  g.lineBetween(pts[0].x + 3, pts[0].y + 6, pts[1].x - 5, pts[1].y + 6);
}
