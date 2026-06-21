/**
 * firebase.js — Clean rewrite, fixed multi-user sync
 * 
 * Bug fixes vs previous version:
 * 1. initializeApp wrapped in getApps() check (prevent duplicate app error)
 * 2. onValue() used correctly — no 3rd-arg error handler (not supported in v10 modular)
 * 3. sanitize() removed from username — stored raw, escaped only in UI
 * 4. joinRoom clears stale record then writes atomically
 * 5. listenPlayers: no filter that could silently drop records
 */

import { FIREBASE_CONFIG, ROOM_ID } from './config.js';

import { initializeApp, getApps } from
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getDatabase, ref, set, get, push, remove, update,
  onValue, onChildAdded, onDisconnect, off,
  query, orderByChild, limitToLast, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

/* ── Init: safe against duplicate-app error ─────────────────── */
const _app = getApps().length > 0 ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
const db   = getDatabase(_app);

/* ── Unique session per tab/page load ───────────────────────── */
export const SESSION_ID = crypto.randomUUID();

/* ── Path helpers ───────────────────────────────────────────── */
const roomPath    = `rooms/${ROOM_ID}`;
const pRef  = (id) => ref(db, `${roomPath}/players/${id}`);
const allP  = ()   => ref(db, `${roomPath}/players`);
const cRef  = ()   => ref(db, `${roomPath}/chat`);
const tRef  = ()   => ref(db, `${roomPath}/typing`);
const myT   = ()   => ref(db, `${roomPath}/typing/${SESSION_ID}`);

/* ═══════════════════════════════════════════════════════════════
   JOIN ROOM
   — write flat record compatible with DB rules
   — appearance fields stored flat (gender, skinIdx, ...)
   — username stored RAW (not HTML-escaped)
═══════════════════════════════════════════════════════════════ */
export async function joinRoom(user, worldW, worldH) {
  const spread = 200;
  const spawnX = Math.round(worldW / 2 + (Math.random() - 0.5) * spread);
  const spawnY = Math.round(worldH / 2 + (Math.random() - 0.5) * spread);

  const ap = user.appearance || {};

  const record = {
    id:          SESSION_ID,
    username:    String(user.username).slice(0, 20),  // raw, no HTML escape
    avatarIndex: 0,         // satisfies old DB rule: isNumber()
    gender:      ap.gender    ?? 'm',
    skinIdx:     ap.skinIdx   ?? 0,
    hairIdx:     ap.hairIdx   ?? 0,
    topIdx:      ap.topIdx    ?? 0,
    tieIdx:      ap.tieIdx    ?? 0,
    pantsIdx:    ap.pantsIdx  ?? 0,
    shoeIdx:     ap.shoeIdx   ?? 0,
    hairStyle:   ap.hairStyle ?? 0,
    eyeIdx:      ap.eyeIdx    ?? 0,
    glasses:     ap.glasses   ?? false,
    blush:       ap.blush     ?? false,
    accessory:   ap.accessory ?? 0,
    x:           spawnX,
    y:           spawnY,
    idle:        false,
    joinedAt:    Date.now(),
  };

  // Remove stale record first (ignore error if not exists)
  try { await remove(pRef(SESSION_ID)); } catch (_) {}

  // Write — will throw if DB rules reject, caught by caller
  await set(pRef(SESSION_ID), record);

  // Server-side cleanup on disconnect
  onDisconnect(pRef(SESSION_ID)).remove();
  onDisconnect(myT()).remove();

  console.log('[Firebase] joinRoom OK', SESSION_ID, record.username);
  return record;
}

/* ═══════════════════════════════════════════════════════════════
   LEAVE ROOM
═══════════════════════════════════════════════════════════════ */
export async function leaveRoom() {
  try { await remove(pRef(SESSION_ID)); } catch (_) {}
  try { await remove(myT()); } catch (_) {}
}

/* ═══════════════════════════════════════════════════════════════
   DUPLICATE NAME CHECK
═══════════════════════════════════════════════════════════════ */
export async function isNameTaken(username) {
  // Admin secret can always join
  if (String(username).trim() === '0910655667') return false;
  try {
    const snap = await get(allP());
    if (!snap.exists()) return false;
    const lower = username.toLowerCase();
    return Object.values(snap.val()).some(
      p => p?.username?.toLowerCase() === lower
    );
  } catch (_) { return false; }
}

/* ═══════════════════════════════════════════════════════════════
   EMIT MOVE — partial update, fire-and-forget
═══════════════════════════════════════════════════════════════ */
export function emitMove(x, y, idle = false) {
  update(pRef(SESSION_ID), {
    x:    Math.round(x),
    y:    Math.round(y),
    idle: Boolean(idle),
  }).catch(err => console.warn('[Firebase] emitMove error:', err.code));
}

/* ═══════════════════════════════════════════════════════════════
   LISTEN PLAYERS — fixed onValue usage (no 3rd-arg error handler)
═══════════════════════════════════════════════════════════════ */
export function listenPlayers(onPlayersChange) {
  const r = allP();

  const handler = (snap) => {
    try {
      const raw = snap.exists() ? snap.val() : {};
      // Pass ALL records — let game.js decide what to skip
      // (minimal filtering: only remove null entries)
      const clean = {};
      Object.entries(raw).forEach(([id, p]) => {
        if (p && p.username) clean[id] = p;
      });
      onPlayersChange(clean);
    } catch (err) {
      console.error('[Firebase] listenPlayers handler error:', err);
    }
  };

  // Correct v10 modular usage: onValue(ref, callback) only
  onValue(r, handler);

  return () => off(r, 'value', handler);
}

/* ═══════════════════════════════════════════════════════════════
   CHAT
═══════════════════════════════════════════════════════════════ */
let _lastChat = 0;

export async function sendChatMessage(text, username) {
  const now = Date.now();
  if (now - _lastChat < 800) return { ok: false, error: '⚠️ ส่งเร็วเกินไป' };
  const clean = String(text).trim().slice(0, 300);
  if (!clean) return { ok: false, error: '' };
  _lastChat = now;
  const displayName = String(username).trim() === '0910655667' ? 'Admin' : String(username).slice(0, 20);
  await push(cRef(), {
    senderId:  SESSION_ID,
    username:  displayName,
    text:      clean,
    timestamp: serverTimestamp(),
  });
  return { ok: true };
}

export function listenChat(onMessage) {
  const q = query(cRef(), orderByChild('timestamp'), limitToLast(50));
  const h = (snap) => {
    if (snap.exists()) onMessage({ key: snap.key, ...snap.val() });
  };
  onChildAdded(q, h);
  return () => off(q, 'child_added', h);
}

/* ═══════════════════════════════════════════════════════════════
   TYPING
═══════════════════════════════════════════════════════════════ */
let _typingTimer = null;

export function startTyping(username) {
  const tName = String(username).trim() === '0910655667' ? 'Admin' : String(username).slice(0, 20);
  set(myT(), { username: tName, ts: Date.now() })
    .catch(() => {});
  clearTimeout(_typingTimer);
  _typingTimer = setTimeout(stopTyping, 2500);
}

export function stopTyping() {
  clearTimeout(_typingTimer);
  remove(myT()).catch(() => {});
}

export function listenTyping(onChange) {
  const r = tRef();
  const h = (snap) => onChange(snap.exists() ? snap.val() : {});
  onValue(r, h);
  return () => off(r, 'value', h);
}

/* ═══════════════════════════════════════════════════════════════
   BOARD CONTENT — admin editable, stored in Firebase
═══════════════════════════════════════════════════════════════ */
export async function saveBoardContent(html, color) {
  const payload = { html, updatedAt: Date.now() };
  if (color !== undefined) payload.color = color;
  await update(ref(db, `rooms/${ROOM_ID}/board/content`), payload);
}

export async function loadBoardContent() {
  const snap = await get(ref(db, `rooms/${ROOM_ID}/board/content`));
  if (!snap.exists()) return null;
  return snap.val()?.html ?? null;
}

export async function loadBoardColor() {
  const snap = await get(ref(db, `rooms/${ROOM_ID}/board/content`));
  if (!snap.exists()) return null;
  return snap.val()?.color ?? null;
}

export function listenBoardContent(onChange) {
  const r = ref(db, `rooms/${ROOM_ID}/board/content`);
  const h = (snap) => onChange(snap.exists() ? (snap.val()?.html ?? null) : null);
  onValue(r, h);
  return () => off(r, 'value', h);
}

export async function saveBoardColor(color) {
  await update(ref(db, `rooms/${ROOM_ID}/board/content`), {
    color:     String(color || '').slice(0, 9),
    updatedAt: Date.now(),
  });
}

export function listenBoardColor(onChange) {
  const r = ref(db, `rooms/${ROOM_ID}/board/content`);
  const h = (snap) => onChange(snap.exists() ? (snap.val()?.color ?? null) : null);
  onValue(r, h);
  return () => off(r, 'value', h);
}

/* ═══════════════════════════════════════════════════════════════
   SYSTEM LINKS — SYS-01..06, admin/level2 editable
═══════════════════════════════════════════════════════════════ */
export async function saveSystemLink(sysId, url, name, color) {
  const payload = {
    url:       String(url || '').slice(0, 500),
    updatedAt: Date.now(),
  };
  if (name  !== undefined) payload.name  = String(name  || '').slice(0, 40);
  if (color !== undefined) payload.color = String(color || '').slice(0, 9);
  await update(ref(db, `rooms/${ROOM_ID}/systems/${sysId}`), payload);
}

export async function saveOrbColor(sysId, color) {
  await update(ref(db, `rooms/${ROOM_ID}/systems/${sysId}`), {
    color:     String(color || '').slice(0, 9),
    updatedAt: Date.now(),
  });
}

export async function loadSystemLinks() {
  const snap = await get(ref(db, `rooms/${ROOM_ID}/systems`));
  return snap.exists() ? snap.val() : {};
}

export function listenSystemLinks(onChange) {
  const r = ref(db, `rooms/${ROOM_ID}/systems`);
  const h = (snap) => onChange(snap.exists() ? snap.val() : {});
  onValue(r, h);
  return () => off(r, 'value', h);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL-2 ADMINS — list of usernames, admin-only write
═══════════════════════════════════════════════════════════════ */
export async function addLevel2Username(username) {
  const name = String(username || '').trim().slice(0, 20);
  if (!name) return;
  const snap = await get(ref(db, `rooms/${ROOM_ID}/level2/users`));
  const list = snap.exists() ? snap.val() : [];
  if (!list.includes(name)) list.push(name);
  await set(ref(db, `rooms/${ROOM_ID}/level2/users`), list);
}

export async function removeLevel2Username(username) {
  const snap = await get(ref(db, `rooms/${ROOM_ID}/level2/users`));
  const list = snap.exists() ? snap.val() : [];
  const filtered = list.filter(n => n !== username);
  await set(ref(db, `rooms/${ROOM_ID}/level2/users`), filtered);
}

export async function loadLevel2Usernames() {
  const snap = await get(ref(db, `rooms/${ROOM_ID}/level2/users`));
  return snap.exists() ? snap.val() : [];
}

export function listenLevel2Usernames(onChange) {
  const r = ref(db, `rooms/${ROOM_ID}/level2/users`);
  const h = (snap) => onChange(snap.exists() ? snap.val() : []);
  onValue(r, h);
  return () => off(r, 'value', h);
}

/* ═══════════════════════════════════════════════════════════════
   ANNOUNCEMENT TICKER — central monitor marquee, admin-only write
═══════════════════════════════════════════════════════════════ */
export async function saveAnnouncement(text) {
  await set(ref(db, `rooms/${ROOM_ID}/announcement`), {
    text:      String(text || '').slice(0, 300),
    updatedAt: Date.now(),
  });
}

export async function loadAnnouncement() {
  const snap = await get(ref(db, `rooms/${ROOM_ID}/announcement`));
  return snap.exists() ? (snap.val()?.text ?? '') : '';
}

export function listenAnnouncement(onChange) {
  const r = ref(db, `rooms/${ROOM_ID}/announcement`);
  const h = (snap) => onChange(snap.exists() ? (snap.val()?.text ?? '') : '');
  onValue(r, h);
  return () => off(r, 'value', h);
}

/* ═══════════════════════════════════════════════════════════════
   JUKEBOX — up to 10 track URLs, admin-only write.
   Mute state is per-device/local-only (NOT synced) — each person's
   mute button only affects their own playback, as requested.
═══════════════════════════════════════════════════════════════ */
export async function saveJukeboxTracks(tracks) {
  // tracks: array of { url, title } — up to 10 entries
  const clean = (tracks || [])
    .filter(t => t && t.url)
    .slice(0, 10)
    .map(t => ({
      url:   String(t.url).slice(0, 500),
      title: String(t.title || '').slice(0, 80),
    }));
  await set(ref(db, `rooms/${ROOM_ID}/jukebox/tracks`), clean);
}

export async function loadJukeboxTracks() {
  const snap = await get(ref(db, `rooms/${ROOM_ID}/jukebox/tracks`));
  return snap.exists() ? snap.val() : [];
}

export function listenJukeboxTracks(onChange) {
  const r = ref(db, `rooms/${ROOM_ID}/jukebox/tracks`);
  const h = (snap) => onChange(snap.exists() ? snap.val() : []);
  onValue(r, h);
  return () => off(r, 'value', h);
}

/* ═══════════════════════════════════════════════════════════════
   HEARTBEAT + CLEANUP
═══════════════════════════════════════════════════════════════ */
export function startHeartbeat() {
  const iv = setInterval(() => {
    update(pRef(SESSION_ID), { joinedAt: Date.now() }).catch(() => {});
  }, 20000);

  const cleanup = () => {
    clearInterval(iv);
    remove(pRef(SESSION_ID)).catch(() => {});
    remove(myT()).catch(() => {});
  };

  window.addEventListener('beforeunload', cleanup);
  window.addEventListener('pagehide', cleanup);
  return iv;
}
