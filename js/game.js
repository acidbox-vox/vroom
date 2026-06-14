/**
 * game.js — Entry point with click-to-move, chat bubbles, accurate online count
 */

import { SYNC_RATE_MS } from './config.js';
import {
  initLogin, updateUserList,
  showTooltip, moveTooltip, hideTooltip,
  openObjectModal, showNotification,
  clickEffect, setCurrentUsername, setLevel2Usernames,
} from './ui.js';
import { initChat, appendSystemMsg } from './chat.js';
import { LocalPlayer, RemotePlayer, PLAYER_SPEED, preloadSprites, setLevel2Checker } from './player.js';
import { getLayout } from './objects.js';
import {
  SESSION_ID, joinRoom, isNameTaken,
  emitMove, listenPlayers, startHeartbeat, listenBoardContent,
  listenSystemLinks, listenLevel2Usernames, listenAnnouncement,
} from './firebase.js';

/* ── Active room layout (set once at boot, based on orientation) ── */
let WORLD_W = 720, WORLD_H = 960, ROOM_OBJECTS = [];

/* ── keep ref to localPlayer for chat bubble ────────────────── */
let _localPlayerRef  = null;
let _remotePlayersRef = null;
let _sceneRef        = null;

export function getLocalPlayer()   { return _localPlayerRef; }
export function getRemotePlayers() { return _remotePlayersRef; }

/* ═══════════════════════════════════════════════════════════════
   ORIENTATION → ROOM LAYOUT
   Landscape (width > height): wide room. Portrait: tall room.
   If the device is rotated into a different category after boot,
   reload so Phaser/the room can rebuild with the matching layout.
═══════════════════════════════════════════════════════════════ */
function _detectIsLandscape() {
  return window.innerWidth > window.innerHeight;
}

function _watchOrientationReload(bootIsLandscape) {
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (_detectIsLandscape() !== bootIsLandscape) {
        location.reload();
      }
    }, 300);
  });
}

/* ═══════════════════════════════════════════════════════════════
   LOGIN FLOW
═══════════════════════════════════════════════════════════════ */
initLogin(
  async (user) => {
    try {
      const isLandscape = _detectIsLandscape();
      ({ WORLD_W, WORLD_H, ROOM_OBJECTS } = getLayout(isLandscape));

      const me = await joinRoom(user, WORLD_W, WORLD_H);
      startHeartbeat();
      setCurrentUsername(user.username);
      _watchOrientationReload(isLandscape);
      _bootGame(user, me.x, me.y);
    } catch (err) {
      console.error('[joinRoom]', err);
      alert(
        'เชื่อมต่อ Firebase ไม่ได้\n\n' +
        'รายละเอียด: ' + (err.code || '') + ' ' + (err.message || err) + '\n\n' +
        'สาเหตุที่พบบ่อย: Database Rules ยังไม่ได้อัปเดต — ' +
        'ไปที่ Firebase Console → Realtime Database → Rules แล้ว publish ' +
        'ไฟล์ database.rules.json เวอร์ชันล่าสุด'
      );
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
  let localPlayer   = null;
  let remotePlayers = {};
  let cursors       = null;
  let lastSync      = 0;
  let hoveredObj    = null;

  new Phaser.Game({
    type:            Phaser.AUTO,
    width:           WORLD_W,
    height:          WORLD_H,
    backgroundColor: '#0d1117',
    parent:          'gameContainer',
    scale: {
      mode:       Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width:      WORLD_W,
      height:     WORLD_H,
    },
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
    _drawObjects(scene);

    localPlayer   = new LocalPlayer(scene, spawnX, spawnY, user.username, user.appearance || {});
    _localPlayerRef  = localPlayer;
    _remotePlayersRef = remotePlayers;

    scene.cameras.main
      .setBounds(0, 0, WORLD_W, WORLD_H)
      .startFollow(localPlayer.container, true, 0.1, 0.1);

    cursors = scene.input.keyboard.createCursorKeys();
    // ป้องกัน Phaser ดักจับปุ่ม Space/Enter ไว้ทั้งหน้า (ทำให้พิมพ์เว้นวรรค/ขึ้นบรรทัดใหม่ใน
    // ช่อง contenteditable เช่น Central Monitor editor ไม่ได้)
    scene.input.keyboard.removeCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.ENTER,
    ]);
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
    _bindLevel2Usernames();
    initChat(user.username, () => localPlayer, () => remotePlayers);
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

  let _lastPlayersMap = null;
  function _bindLevel2Usernames() {
    listenLevel2Usernames((list) => {
      setLevel2Usernames(list);
      setLevel2Checker((username) => list.includes(username));
      // refresh aura + name tag on existing players
      if (localPlayer) localPlayer.refreshLevel2Aura?.();
      Object.values(remotePlayers).forEach(rp => rp.refreshLevel2Aura?.());
      if (_lastPlayersMap) updateUserList(_lastPlayersMap, SESSION_ID);
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

    listenAnnouncement((text) => {
      const t = scene._tickerText;
      if (!t) return;
      const clean = String(text || '').trim();
      scene._tickerMessage = clean;
      if (!clean) { t.setVisible(false); return; }
      // pad with separators so the loop feels continuous
      t.setText(`${clean}　★　${clean}　★　`);
      t.x = scene._tickerStartX;
      t.setVisible(true);
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

    // ── Marquee ticker scroll (central monitor announcement) ──
    _updateTicker(this, delta);
  }

  const TICKER_SPEED = 60; // px/sec
  function _updateTicker(scene, delta) {
    const t = scene._tickerText;
    if (!t) return;
    if (!scene._tickerMessage) {
      t.setVisible(false);
      return;
    }
    t.setVisible(true);
    t.x -= TICKER_SPEED * (delta / 1000);
    // loop: once fully scrolled past the left edge, restart from the right edge
    if (t.x + t.width < scene._tickerClipX) {
      t.x = scene._tickerStartX;
    }
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
      _lastPlayersMap = allPlayers;
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

  // ── Center floor emblem — large glowing ring (below monitor, above terminals) ──
  // Position/size derive from the central monitor + first orb row so the
  // emblem fits proportionally in both portrait and landscape layouts.
  const monitor   = ROOM_OBJECTS.find(o => o._isCentral);
  const orbs      = ROOM_OBJECTS.filter(o => o.actionType === 'system');
  const monCx     = monitor.x + monitor.width / 2;
  const monBottom = monitor.y + monitor.height;
  const firstOrbY = Math.min(...orbs.map(o => o.y));
  const ccx = monCx, ccy = monBottom + 40;
  const gapAvail  = Math.max(20, firstOrbY - monBottom);
  const maxR      = Math.min(70, Math.max(28, gapAvail * 1.15));
  for (let r = maxR; r >= maxR * 0.42; r -= maxR * 0.2) {
    g.lineStyle(1, 0x22e5ff, 0.10 + (maxR - r) / maxR * 0.10);
    g.strokeCircle(ccx, ccy, r);
  }
  g.lineStyle(2, 0x4af0ff, 0.35);
  g.strokeCircle(ccx, ccy, maxR * 0.72);
  // crosshair lines through emblem
  g.lineStyle(1, 0x18d0ff, 0.18);
  g.lineBetween(ccx - maxR*1.3, ccy, ccx + maxR*1.3, ccy);
  g.lineBetween(ccx, ccy - maxR*1.3, ccx, ccy + maxR*1.3);

  // ── Terminal bank backdrops removed — orbs float freely on the
  //    open grid floor, giving more walkable space ─────────────

  // ── Floor light strip leading to central monitor ────────
  const stripH = Math.max(0, monBottom - RY - 4);
  g.fillStyle(0x0a2a35, 0.5);
  g.fillRect(ccx - 4, RY+4, 8, stripH);
  g.fillStyle(0x22e5ff, 0.25);
  g.fillRect(ccx - 1, RY+4, 2, stripH);

  // ── ROOM label ───────────────────────────────────────────
  scene.add.text(ccx, RY + 14, '◤ COMMAND CENTER ◢', {
    fontSize: '16px', fontFamily: 'Sarabun, sans-serif',
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


/* ═══════════════════════════════════════════════════════════════
   3D ISOMETRIC OBJECT RENDERER
   แต่ละ id มี draw function เฉพาะ วาดด้วย Phaser Graphics ล้วน
   isometric: top face / left face / right face
═══════════════════════════════════════════════════════════════ */
function _drawObjects(scene) {
  ROOM_OBJECTS.forEach(obj => {
    const g = scene.add.graphics().setDepth(2);
    const fn = OBJ_DRAW[obj.id] || OBJ_DRAW['_default'];
    const vis = fn(g, scene, obj); // { vx, vy, vw, vh, by } for terminals, undefined for central monitor

    // name label — placed under the visual console (or hitbox if no visual returned)
    const labelCx = vis ? (vis.vx + vis.vw / 2) : (obj.x + obj.width / 2);
    const labelY  = vis ? (vis.by + 6) : (obj.y + obj.height + 6);
    const labelW  = vis ? (vis.vw + 60) : (obj.width + 40);
    obj._labelText = scene.add.text(labelCx, labelY, obj.displayName || obj.name, {
      fontSize: '13px', fontFamily: 'Sarabun, sans-serif',
      color: '#cdd6f0', align: 'center',
      stroke: '#0a0e17', strokeThickness: 4,
      wordWrap: { width: labelW },
    }).setOrigin(0.5, 0).setDepth(3);

    // pulsing active dot — top-right of visual console (or hitbox)
    const dotX = vis ? (vis.vx + vis.vw - 4) : (obj.x + obj.width - 6);
    const dotY = vis ? (vis.vy + 4) : (obj.y + 6);
    const dot = scene.add.circle(dotX, dotY, 2.5, 0x4ade80, 0.9).setDepth(4);
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
    const cx = obj.x + obj.width/2;
    const w = obj.width, h = obj.height;
    const tickerH = 28;          // bottom marquee strip height
    const screenH = h - tickerH; // main message area height
    const screenCy = obj.y + screenH/2;

    // outer glow frame
    g.fillStyle(0x06141c, 1);
    g.fillRoundedRect(obj.x - 6, obj.y - 6, w + 12, h + 12, 6);
    g.lineStyle(2, 0x4af0ff, 0.9);
    g.strokeRoundedRect(obj.x - 6, obj.y - 6, w + 12, h + 12, 6);

    // mounting struts down to floor
    g.lineStyle(2, 0x18d0ff, 0.4);
    g.lineBetween(obj.x + 14, obj.y + h + 6, obj.x + 14, obj.y + h + 30);
    g.lineBetween(obj.x + w - 14, obj.y + h + 6, obj.x + w - 14, obj.y + h + 30);

    // screen body (main message area)
    g.fillStyle(0x020a10, 1);
    g.fillRect(obj.x, obj.y, w, screenH);

    // animated scan glow
    const glowAlpha = 0.10 + 0.06 * Math.sin(scene.time.now / 600);
    g.fillStyle(0x22e5ff, glowAlpha);
    g.fillRect(obj.x, obj.y, w, screenH);

    // scanlines
    g.lineStyle(1, 0x0e3a4a, 0.5);
    for (let yy = obj.y + 4; yy < obj.y + screenH; yy += 5) g.lineBetween(obj.x, yy, obj.x + w, yy);

    // header bar
    g.fillStyle(0x0a2a35, 1);
    g.fillRect(obj.x, obj.y, w, 18);
    g.lineStyle(1, 0x4af0ff, 0.6);
    g.lineBetween(obj.x, obj.y + 18, obj.x + w, obj.y + 18);

    scene.add.text(cx, obj.y + 9, '◤ COMMAND BROADCAST ◢', {
      fontSize: '13px', fontFamily: 'Sarabun, sans-serif',
      color: '#4af0ff', letterSpacing: 2,
    }).setOrigin(0.5, 0.5).setDepth(3);

    // message text — dynamic, updated externally
    const msgText = scene.add.text(cx, screenCy + 8, 'ระบบพร้อมใช้งาน — ไม่มีข้อความ', {
      fontSize: '15px', fontFamily: 'Sarabun, sans-serif',
      color: '#9beeff', align: 'center', wordWrap: { width: w - 24 },
    }).setOrigin(0.5, 0.5).setDepth(3);
    scene._centralMonitorText = msgText;

    // ── Bottom marquee/ticker strip (admin announcement, Tron style) ──
    const tY = obj.y + screenH;
    g.fillStyle(0x05161e, 1);
    g.fillRect(obj.x, tY, w, tickerH);
    g.lineStyle(1, 0xffb000, 0.7);
    g.lineBetween(obj.x, tY, obj.x + w, tY);
    g.fillStyle(0xffb000, 0.06);
    g.fillRect(obj.x, tY, w, tickerH);

    // ticker label chip "LIVE"
    g.fillStyle(0xffb000, 0.18);
    g.fillRoundedRect(obj.x + 4, tY + 4, 46, tickerH - 8, 3);
    g.lineStyle(1, 0xffb000, 0.8);
    g.strokeRoundedRect(obj.x + 4, tY + 4, 46, tickerH - 8, 3);
    scene.add.text(obj.x + 27, tY + tickerH/2, 'LIVE', {
      fontSize: '11px', fontFamily: 'Sarabun, sans-serif',
      color: '#ffb000', letterSpacing: 2, fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(3);
    const liveDot = scene.add.circle(obj.x + 12, tY + tickerH/2, 3, 0xffb000, 1).setDepth(4);
    scene.tweens.add({ targets: liveDot, alpha: { from:1, to:0.2 }, duration: 700, yoyo:true, repeat:-1 });

    // ticker text container — clipped to strip area
    const tickerClipX = obj.x + 58;
    const tickerClipW = w - 58 - 6;
    const tickerMask = scene.add.graphics().setVisible(false);
    tickerMask.fillRect(tickerClipX, tY, tickerClipW, tickerH);
    const maskGeom = tickerMask.createGeometryMask();

    const tickerText = scene.add.text(tickerClipX + tickerClipW, tY + tickerH/2, '', {
      fontSize: '13px', fontFamily: 'Sarabun, sans-serif',
      color: '#ffd166', letterSpacing: 1,
    }).setOrigin(0, 0.5).setDepth(3).setMask(maskGeom);

    scene._tickerText  = tickerText;
    scene._tickerClipX = tickerClipX;
    scene._tickerClipW = tickerClipW;
    scene._tickerStartX = tickerClipX + tickerClipW;

    // corner brackets (around full panel)
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

  /* ── System Terminals SYS-01..06 — glowing orbs ─────────── */
  sys_01(g, scene, obj) { return _drawOrbTerminal(g, scene, obj, 0x22e5ff, '01'); },
  sys_02(g, scene, obj) { return _drawOrbTerminal(g, scene, obj, 0x22e5ff, '02'); },
  sys_03(g, scene, obj) { return _drawOrbTerminal(g, scene, obj, 0x22e5ff, '03'); },
  sys_04(g, scene, obj) { return _drawOrbTerminal(g, scene, obj, 0xff8c1a, '04'); },
  sys_05(g, scene, obj) { return _drawOrbTerminal(g, scene, obj, 0xff8c1a, '05'); },
  sys_06(g, scene, obj) { return _drawOrbTerminal(g, scene, obj, 0xff8c1a, '06'); },

  /* ── Default fallback ─────────────────────────────────────── */
  _default(g, scene, obj) {
    return _drawOrbTerminal(g, scene, obj, 0x22e5ff, '');
  },
};

/* ═══════════════════════════════════════════════════════════════
   ORB TERMINAL DRAW — small glowing crystal orb with blue floor aura
═══════════════════════════════════════════════════════════════ */
const AURA_COLOR = 0x22e5ff; // blue/cyan aura under every orb

function _drawOrbTerminal(g, scene, obj, glow, code) {
  const cx = obj.x + obj.width / 2;
  const r  = Math.min(obj.width, obj.height) * 0.22; // orb radius
  const oy = obj.y + obj.height * 0.40;               // orb center y
  const auraW = obj.width * 0.74;
  const auraH = obj.height * 0.16;
  const auraY = oy + r + auraH * 0.7;

  const glowHex = '#' + glow.toString(16).padStart(6, '0');

  // ── floor aura — concentric glow rings (blue) ───────────────
  for (let i = 3; i >= 1; i--) {
    g.fillStyle(AURA_COLOR, 0.05 * i);
    g.fillEllipse(cx, auraY, auraW * (0.55 + 0.15 * i), auraH * (0.55 + 0.15 * i));
  }
  g.lineStyle(1.5, AURA_COLOR, 0.55);
  g.strokeEllipse(cx, auraY, auraW, auraH);

  // pulsing outer aura ring (animated)
  const auraRing = scene.add.ellipse(cx, auraY, auraW * 1.15, auraH * 1.15, AURA_COLOR, 0.18).setDepth(1.5);
  scene.tweens.add({
    targets: auraRing,
    scaleX: { from: 0.85, to: 1.15 }, scaleY: { from: 0.85, to: 1.15 },
    alpha: { from: 0.28, to: 0.05 },
    duration: 1600 + Math.random() * 400, repeat: -1, ease: 'Sine.easeInOut',
  });

  // ── glowing orb (sphere) — floats above the aura ────────────
  const orbContainer = scene.add.container(cx, oy).setDepth(3);

  // outer halo
  const halo = scene.add.circle(0, 0, r * 1.7, glow, 0.10);
  // sphere base (dark glass)
  const base = scene.add.circle(0, 0, r, 0x0a1018, 0.92);
  // colored core glow
  const core = scene.add.circle(0, 0, r * 0.8, glow, 0.30);
  // rim outline
  const rim = scene.add.circle(0, 0, r, 0x000000, 0).setStrokeStyle(1.5, glow, 0.9);
  // glass highlight (top-left)
  const highlight = scene.add.circle(-r * 0.32, -r * 0.32, r * 0.32, 0xffffff, 0.35);
  // bright center dot
  const center = scene.add.circle(0, 0, Math.max(1.5, r * 0.12), glow, 1);

  orbContainer.add([halo, base, core, rim, highlight, center]);

  // gentle floating bob
  scene.tweens.add({
    targets: orbContainer, y: { from: oy - 3, to: oy + 3 },
    duration: 1800 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    delay: Math.random() * 500,
  });
  // slow shimmer on halo
  scene.tweens.add({
    targets: halo, alpha: { from: 0.06, to: 0.16 },
    duration: 1400 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });

  // ── small SYS code label above the orb ──────────────────────
  if (code) {
    scene.add.text(cx, oy - r - 12, code, {
      fontSize: '10px', fontFamily: 'Sarabun, sans-serif',
      color: glowHex, letterSpacing: 2,
    }).setOrigin(0.5, 0.5).setDepth(3);
  }

  // ── status pulse light (top-right of orb) ───────────────────
  const pulse = scene.add.circle(cx + r * 0.85, oy - r * 0.85, 1.8, glow, 1).setDepth(4);
  scene.tweens.add({ targets: pulse, alpha: { from: 1, to: 0.2 }, duration: 1000 + Math.random() * 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  // visual bounds for label/dot positioning in _drawObjects
  return {
    vx: cx - auraW / 2,
    vy: oy - r - 14,
    vw: auraW,
    vh: (auraY + auraH / 2) - (oy - r - 14),
    by: auraY + auraH / 2,
  };
}
