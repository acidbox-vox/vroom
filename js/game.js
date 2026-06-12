/**
 * game.js — Entry point with click-to-move, chat bubbles, accurate online count
 */

import { WORLD_W, WORLD_H, SYNC_RATE_MS } from './config.js';
import {
  initLogin, updateUserList,
  showTooltip, moveTooltip, hideTooltip,
  openObjectModal, showNotification,
  updateMinimap, drawMinimapBg,
  clickEffect, setCurrentUsername, setLevel2Username,
} from './ui.js';
import { initChat, appendSystemMsg } from './chat.js';
import { LocalPlayer, RemotePlayer, PLAYER_SPEED, preloadSprites, setLevel2Checker } from './player.js';
import { ROOM_OBJECTS } from './objects.js';
import {
  SESSION_ID, joinRoom, isNameTaken,
  emitMove, listenPlayers, startHeartbeat, listenBoardContent,
  listenSystemLinks, listenLevel2Username,
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
    _bindCentralMonitor(scene);
    _bindSystemLinks();
    _bindLevel2Username();
    initChat(user.username, () => localPlayer, () => remotePlayers);
    drawMinimapBg(WORLD_W, WORLD_H);
  }

  /* ── SYSTEM LINKS LIVE SYNC (SYS-01..06) ─────────────────── */
  function _bindSystemLinks() {
    listenSystemLinks((data) => {
      ROOM_OBJECTS.forEach(obj => {
        if (obj.actionType === 'system' && data[obj.id]) {
          obj.actionValue = data[obj.id].url || '';
          if (data[obj.id].name) {
            obj.displayName = data[obj.id].name;
            obj._labelText?.setText(obj.displayName);
          }
        }
      });
    });
  }

  /* ── LEVEL-2 USERNAME LIVE SYNC ───────────────────────────── */
  function _bindLevel2Username() {
    listenLevel2Username((name) => {
      setLevel2Username(name);
      setLevel2Checker((username) => name !== '' && username === name);
      // refresh aura on existing players
      if (localPlayer) localPlayer.refreshLevel2Aura?.();
      Object.values(remotePlayers).forEach(rp => rp.refreshLevel2Aura?.());
    });
  }

  /* ── CENTRAL MONITOR LIVE SYNC ────────────────────────────── */
  function _bindCentralMonitor(scene) {
    listenBoardContent((html) => {
      const txt = scene._centralMonitorText;
      if (!txt) return;
      if (!html) {
        txt.setText('ระบบพร้อมใช้งาน — ไม่มีข้อความ');
        return;
      }
      // strip HTML tags for the in-world screen (plain text only)
      const plain = String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      txt.setText(plain.length > 0 ? plain : 'ระบบพร้อมใช้งาน — ไม่มีข้อความ');
    });
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
              topIdx:p.topIdx||0, tieIdx:p.tieIdx||0, pantsIdx:p.pantsIdx||0,
              shoeIdx:p.shoeIdx||0, hairStyle:p.hairStyle||0, eyeIdx:p.eyeIdx||0,
              glasses:p.glasses||false, blush:p.blush||false, accessory:p.accessory||0 },
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
  const RX = 40, RY = 40, RW = WORLD_W - 80, RH = WORLD_H - 80;

  // ── Void background — pure black ───────────────────────
  g.fillStyle(0x000000, 1);
  g.fillRect(0, 0, WORLD_W, WORLD_H);

  // ── Room floor — near-black with subtle blue tint ───────
  g.fillStyle(0x04070d, 1);
  g.fillRect(RX, RY, RW, RH);

  // ── Glowing grid — Tron style cyan lines ────────────────
  const GRID = 32;
  g.lineStyle(1, 0x0a3a4a, 0.5);
  for (let xx = RX; xx <= RX + RW; xx += GRID) g.lineBetween(xx, RY, xx, RY + RH);
  for (let yy = RY; yy <= RY + RH; yy += GRID) g.lineBetween(RX, yy, RX + RW, yy);

  // ── Brighter major grid lines every 4 cells ─────────────
  g.lineStyle(1, 0x18d0ff, 0.18);
  for (let xx = RX; xx <= RX + RW; xx += GRID*4) g.lineBetween(xx, RY, xx, RY + RH);
  for (let yy = RY; yy <= RY + RH; yy += GRID*4) g.lineBetween(RX, yy, RX + RW, yy);

  // ── Outer wall — glowing cyan double-line ───────────────
  g.lineStyle(2, 0x0e1a22, 1);
  g.strokeRect(RX-2, RY-2, RW+4, RH+4);
  g.lineStyle(2, 0x22e5ff, 0.9);
  g.strokeRect(RX, RY, RW, RH);
  g.lineStyle(1, 0x22e5ff, 0.25);
  g.strokeRect(RX+4, RY+4, RW-8, RH-8);

  // ── Corner accent brackets (Tron style) ─────────────────
  const brk = 26;
  const corners = [
    [RX, RY, 1, 1], [RX+RW, RY, -1, 1], [RX, RY+RH, 1, -1], [RX+RW, RY+RH, -1, -1],
  ];
  corners.forEach(([cx, cy, sx, sy]) => {
    g.lineStyle(3, 0x4af0ff, 1);
    g.lineBetween(cx, cy, cx + brk*sx, cy);
    g.lineBetween(cx, cy, cx, cy + brk*sy);
  });

  // ── Center floor emblem — large glowing ring ────────────
  const ccx = WORLD_W/2, ccy = RY + RH*0.62;
  for (let r = 70; r >= 30; r -= 14) {
    g.lineStyle(1, 0x22e5ff, 0.10 + (70-r)/70*0.10);
    g.strokeCircle(ccx, ccy, r);
  }
  g.lineStyle(2, 0x4af0ff, 0.35);
  g.strokeCircle(ccx, ccy, 50);
  // crosshair lines through emblem
  g.lineStyle(1, 0x18d0ff, 0.18);
  g.lineBetween(ccx-90, ccy, ccx+90, ccy);
  g.lineBetween(ccx, ccy-90, ccx, ccy+90);

  // ── Side wall accent strips (under each terminal bank) ──
  g.fillStyle(0x081420, 0.8);
  g.fillRect(RX, 120, 170, 460);          // left bank backdrop
  g.fillRect(RX+RW-170, 120, 170, 460);   // right bank backdrop
  g.lineStyle(1, 0x18d0ff, 0.25);
  g.strokeRect(RX, 120, 170, 460);
  g.strokeRect(RX+RW-170, 120, 170, 460);

  // ── Floor light strips leading to central monitor ───────
  g.fillStyle(0x0a2a35, 0.5);
  g.fillRect(WORLD_W/2 - 4, RY+4, 8, 170);
  g.fillStyle(0x22e5ff, 0.25);
  g.fillRect(WORLD_W/2 - 1, RY+4, 2, 170);

  // ── ROOM label ───────────────────────────────────────────
  scene.add.text(WORLD_W/2, RY + 14, '◤ COMMAND CENTER ◢', {
    fontSize: '13px', fontFamily: 'Sarabun, sans-serif',
    color: '#4af0ff', stroke: '#000810', strokeThickness: 4,
    letterSpacing: 4,
  }).setOrigin(0.5, 0).setDepth(1).setAlpha(0.9);

  // ── Animated scanline sweep across floor (subtle) ───────
  const scan = scene.add.graphics().setDepth(0.5);
  scan.fillStyle(0x22e5ff, 0.05);
  scan.fillRect(RX, RY, RW, 3);
  scene.tweens.add({
    targets: scan, y: RH, duration: 6000, repeat: -1, ease: 'Linear',
    onUpdate: () => { scan.y = scan.y > RH ? 0 : scan.y; },
  });
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
    obj._labelText = scene.add.text(cx, obj.y + obj.height + 6, obj.displayName || obj.name, {
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

  /* ── Central Monitor — large Tron broadcast screen ──────── */
  central_monitor(g, scene, obj) {
    const cx = obj.x + obj.width/2, cy = obj.y + obj.height/2;
    const w = obj.width, h = obj.height;

    // outer glow frame
    g.fillStyle(0x06141c, 1);
    g.fillRoundedRect(obj.x - 6, obj.y - 6, w + 12, h + 12, 6);
    g.lineStyle(2, 0x4af0ff, 0.9);
    g.strokeRoundedRect(obj.x - 6, obj.y - 6, w + 12, h + 12, 6);

    // mounting struts down to floor
    g.lineStyle(2, 0x18d0ff, 0.4);
    g.lineBetween(obj.x + 14, obj.y + h + 6, obj.x + 14, obj.y + h + 30);
    g.lineBetween(obj.x + w - 14, obj.y + h + 6, obj.x + w - 14, obj.y + h + 30);

    // screen body
    g.fillStyle(0x020a10, 1);
    g.fillRect(obj.x, obj.y, w, h);

    // animated scan glow stored on object for update loop
    const glowAlpha = 0.10 + 0.06 * Math.sin(scene.time.now / 600);
    g.fillStyle(0x22e5ff, glowAlpha);
    g.fillRect(obj.x, obj.y, w, h);

    // scanlines
    g.lineStyle(1, 0x0e3a4a, 0.5);
    for (let yy = obj.y + 4; yy < obj.y + h; yy += 5) g.lineBetween(obj.x, yy, obj.x + w, yy);

    // header bar
    g.fillStyle(0x0a2a35, 1);
    g.fillRect(obj.x, obj.y, w, 18);
    g.lineStyle(1, 0x4af0ff, 0.6);
    g.lineBetween(obj.x, obj.y + 18, obj.x + w, obj.y + 18);

    scene.add.text(cx, obj.y + 9, '◤ COMMAND BROADCAST ◢', {
      fontSize: '10px', fontFamily: 'Sarabun, sans-serif',
      color: '#4af0ff', letterSpacing: 2,
    }).setOrigin(0.5, 0.5).setDepth(3);

    // message text — dynamic, updated externally via setMonitorMessage()
    const msgText = scene.add.text(cx, cy + 8, 'ระบบพร้อมใช้งาน — ไม่มีข้อความ', {
      fontSize: '12px', fontFamily: 'Sarabun, sans-serif',
      color: '#9beeff', align: 'center', wordWrap: { width: w - 24 },
    }).setOrigin(0.5, 0.5).setDepth(3);
    scene._centralMonitorText = msgText;

    // corner brackets
    const b = 12;
    g.lineStyle(2, 0x4af0ff, 1);
    [[obj.x,obj.y,1,1],[obj.x+w,obj.y,-1,1],[obj.x,obj.y+h,1,-1],[obj.x+w,obj.y+h,-1,-1]].forEach(([cx2,cy2,sx,sy])=>{
      g.lineBetween(cx2, cy2, cx2 + b*sx, cy2);
      g.lineBetween(cx2, cy2, cx2, cy2 + b*sy);
    });

    // breathing glow tween on the whole graphics border
    scene.tweens.add({
      targets: g, alpha: { from: 0.85, to: 1 }, duration: 1400,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  },

  /* ── System Terminals SYS-01..06 — Tron arcade cabinet ──── */
  sys_01(g, scene, obj) { _drawTronTerminal(g, scene, obj, 0x22e5ff, '01'); },
  sys_02(g, scene, obj) { _drawTronTerminal(g, scene, obj, 0x22e5ff, '02'); },
  sys_03(g, scene, obj) { _drawTronTerminal(g, scene, obj, 0x22e5ff, '03'); },
  sys_04(g, scene, obj) { _drawTronTerminal(g, scene, obj, 0xff8c1a, '04'); },
  sys_05(g, scene, obj) { _drawTronTerminal(g, scene, obj, 0xff8c1a, '05'); },
  sys_06(g, scene, obj) { _drawTronTerminal(g, scene, obj, 0xff8c1a, '06'); },

  /* ── Default fallback ─────────────────────────────────────── */
  _default(g, scene, obj) {
    _drawTronTerminal(g, scene, obj, 0x22e5ff, '');
  },
};

/* ═══════════════════════════════════════════════════════════════
   TRON TERMINAL DRAW — glowing cyan/orange console pillar
═══════════════════════════════════════════════════════════════ */
function _drawTronTerminal(g, scene, obj, glow, code) {
  const cx = obj.x + obj.width/2, by = obj.y + obj.height;
  const w = obj.width, h = obj.height;
  const glowHex = '#' + glow.toString(16).padStart(6,'0');

  // floor base ring
  g.lineStyle(2, glow, 0.5);
  g.strokeEllipse(cx, by, w*0.7, 10);
  g.fillStyle(glow, 0.08);
  g.fillEllipse(cx, by, w*0.7, 10);

  // pedestal column
  g.fillStyle(0x0a1018, 1);
  g.fillRect(cx - 8, by - 14, 16, 14);
  g.lineStyle(1.5, glow, 0.7);
  g.strokeRect(cx - 8, by - 14, 16, 14);

  // main console body
  const bodyH = h - 18;
  g.fillStyle(0x070d14, 1);
  g.fillRoundedRect(obj.x, obj.y, w, bodyH, 4);
  g.lineStyle(2, glow, 0.9);
  g.strokeRoundedRect(obj.x, obj.y, w, bodyH, 4);
  // inner panel line
  g.lineStyle(1, glow, 0.25);
  g.strokeRoundedRect(obj.x + 3, obj.y + 3, w - 6, bodyH - 6, 3);

  // screen area
  const sx = obj.x + 6, sy = obj.y + 16, sw = w - 12, sh = bodyH - 28;
  g.fillStyle(0x020608, 1);
  g.fillRect(sx, sy, sw, sh);
  const flicker = 0.08 + 0.05 * Math.sin(scene.time.now / 500 + obj.x);
  g.fillStyle(glow, flicker);
  g.fillRect(sx, sy, sw, sh);
  // screen scanlines
  g.lineStyle(1, glow, 0.15);
  for (let yy = sy + 3; yy < sy + sh; yy += 4) g.lineBetween(sx, yy, sx + sw, yy);
  // screen border
  g.lineStyle(1, glow, 0.6);
  g.strokeRect(sx, sy, sw, sh);

  // top header strip
  g.fillStyle(glow, 0.18);
  g.fillRect(obj.x + 3, obj.y + 3, w - 6, 10);
  g.lineStyle(1, glow, 0.7);
  g.lineBetween(obj.x + 3, obj.y + 13, obj.x + w - 3, obj.y + 13);

  // code label
  if (code) {
    scene.add.text(cx, obj.y + 8, `SYS-${code}`, {
      fontSize: '9px', fontFamily: 'Sarabun, sans-serif',
      color: glowHex, letterSpacing: 2,
    }).setOrigin(0.5, 0.5).setDepth(3);
  }

  // center icon glyph (data node)
  g.lineStyle(1.5, glow, 0.8);
  g.strokeCircle(cx, sy + sh/2, 12);
  g.fillStyle(glow, 0.25);
  g.fillCircle(cx, sy + sh/2, 12);
  g.lineStyle(1, glow, 0.6);
  g.lineBetween(cx - 16, sy + sh/2, cx + 16, sy + sh/2);
  g.lineBetween(cx, sy + sh/2 - 16, cx, sy + sh/2 + 16);
  g.fillStyle(glow, 1);
  g.fillCircle(cx, sy + sh/2, 3);

  // base footer strip
  g.fillStyle(glow, 0.15);
  g.fillRect(obj.x + 3, obj.y + bodyH - 8, w - 6, 5);

  // side accent lights
  g.fillStyle(glow, 0.9);
  g.fillCircle(obj.x + 6, obj.y + bodyH - 5, 2);
  g.fillCircle(obj.x + w - 6, obj.y + bodyH - 5, 2);

  // corner brackets on body
  const b = 8;
  g.lineStyle(2, glow, 1);
  [[obj.x,obj.y,1,1],[obj.x+w,obj.y,-1,1],[obj.x,obj.y+bodyH,1,-1],[obj.x+w,obj.y+bodyH,-1,-1]].forEach(([cx2,cy2,sx2,sy2])=>{
    g.lineBetween(cx2, cy2, cx2 + b*sx2, cy2);
    g.lineBetween(cx2, cy2, cx2, cy2 + b*sy2);
  });

  // status pulse light (top right)
  const pulse = scene.add.circle(obj.x + w - 10, obj.y + 8, 2.5, glow, 1).setDepth(4);
  scene.tweens.add({ targets: pulse, alpha: { from: 1, to: 0.2 }, duration: 1000 + Math.random()*500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  // vertical light beam rising from terminal (Tron signature)
  const beam = scene.add.graphics().setDepth(0.6);
  beam.fillStyle(glow, 0.10);
  beam.fillRect(cx - 1, obj.y - 40, 2, bodyH + 40);
  scene.tweens.add({ targets: beam, alpha: { from: 0.4, to: 1 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random()*800 });
}
