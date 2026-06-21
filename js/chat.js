/**
 * chat.js — Persistent right-edge chat log overlay
 *
 * - Chat log sits in a permanent semi-transparent panel on the right
 *   edge of the screen (always visible — no toggle). Newest message
 *   appears at the TOP, older ones push down, each fades out and is
 *   removed automatically ~5 minutes after it was sent.
 * - There is no permanent input box. A small floating "compose" (✏️)
 *   button reveals the input + emoji bar only while the person wants
 *   to type; it auto-hides again after sending or on blur.
 */

import { escapeHtml } from './ui.js';
import {
  sendChatMessage, listenChat,
  startTyping, stopTyping, listenTyping,
  SESSION_ID,
} from './firebase.js';

const chatMessages    = document.getElementById('chatMessages');
const chatInput       = document.getElementById('chatInput');
const chatSendBtn     = document.getElementById('chatSendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const typingText      = document.getElementById('typingText');
const emojiButtons    = document.querySelectorAll('.emoji-btn');

const chatToggleBtn   = document.getElementById('chatToggleBtn');
const chatComposeBar  = document.getElementById('chatComposeBar');

let myUsername        = '';
let renderedKeys      = new Set();
let _getLocalPlayer   = null;
let _getRemotePlayers = null;
let _isComposing      = false;

const FADE_AFTER_MS   = 5 * 60 * 1000; // 5 นาที — ข้อความในแถบขวาจางหายอัตโนมัติ

export function initChat(username, getLocalPlayer, getRemotePlayers) {
  myUsername        = username;
  _getLocalPlayer   = getLocalPlayer;
  _getRemotePlayers = getRemotePlayers;

  chatSendBtn.addEventListener('click', _send);
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _send(); }
    if (e.key === 'Escape') { _closeCompose(); }
  });
  chatInput.addEventListener('input', () => {
    if (chatInput.value.trim()) startTyping(myUsername);
    else stopTyping();
  });
  emojiButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      chatInput.value += btn.dataset.emoji;
      chatInput.focus();
    });
  });

  chatToggleBtn.addEventListener('click', _toggleCompose);

  // ปิดแถบพิมพ์เมื่อคลิกนอกพื้นที่ (แต่ไม่ปิดถ้าคลิกที่ปุ่ม emoji/ปุ่มเปิดเอง)
  document.addEventListener('click', (e) => {
    if (!_isComposing) return;
    if (chatComposeBar.contains(e.target) || chatToggleBtn.contains(e.target)) return;
    _closeCompose();
  });

  listenChat(_onMessage);
  listenTyping(_onTyping);

  // ตรวจทุก 30 วินาที หาข้อความที่อายุ > 5 นาทีแล้ว fade
  setInterval(_sweepOldMessages, 30_000);
}

function _toggleCompose() { _isComposing ? _closeCompose() : _openCompose(); }
function _openCompose() {
  _isComposing = true;
  chatComposeBar.classList.add('open');
  chatToggleBtn.classList.add('active');
  chatInput.focus();
}
function _closeCompose() {
  _isComposing = false;
  chatComposeBar.classList.remove('open');
  chatToggleBtn.classList.remove('active');
  stopTyping();
}

async function _send() {
  const text = chatInput.value.trim();
  if (!text) return;
  if (text.length > 300) { appendSystemMsg('⚠️ ข้อความยาวเกิน 300 ตัวอักษร'); return; }
  const result = await sendChatMessage(text, myUsername);
  if (result.ok) { chatInput.value = ''; stopTyping(); _closeCompose(); }
  else if (result.error) appendSystemMsg(result.error);
}

function _onMessage(data) {
  if (renderedKeys.has(data.key)) return;
  renderedKeys.add(data.key);

  const isMe  = data.senderId === SESSION_ID;
  const time  = _formatTime(data.timestamp || Date.now());
  const msgTs = data.timestamp || Date.now();

  const div = document.createElement('div');
  div.className = 'chat-msg';
  div.dataset.ts = msgTs; // เก็บ timestamp ไว้สำหรับ sweep

  div.innerHTML = `
    <div class="chat-msg-header">
      <span class="chat-sender${isMe ? ' me' : ''}">${escapeHtml(data.username)}</span>
      <span class="chat-time">${time}</span>
    </div>
    <div class="chat-text">${escapeHtml(data.text)}</div>`;

  // ข้อความใหม่ขึ้นบนสุดเสมอ (newest → oldest, top → bottom)
  chatMessages.insertBefore(div, chatMessages.firstChild);

  // ตั้ง timer fade ให้ข้อความนี้โดยตรงตาม timestamp จริง
  const age     = Date.now() - msgTs;
  const delay   = Math.max(0, FADE_AFTER_MS - age);
  setTimeout(() => _fadeMsg(div), delay);

  // chat bubble above head
  if (isMe) {
    _getLocalPlayer?.()?.showChat(data.text);
  } else {
    const rp = _getRemotePlayers?.();
    if (rp) {
      const player = Object.values(rp).find(p => p.id === data.senderId);
      player?.showChat(data.text);
    }
  }
}

function _fadeMsg(el) {
  if (!el || !el.parentNode) return;
  el.style.transition = 'opacity 1.5s ease, max-height .8s ease 1s, margin .8s ease 1s, padding .8s ease 1s';
  el.style.opacity    = '0';
  el.style.maxHeight  = el.offsetHeight + 'px';
  // หลัง fade เสร็จ ค่อย collapse แล้ว remove
  setTimeout(() => {
    el.style.maxHeight    = '0';
    el.style.marginBottom = '0';
    el.style.padding      = '0';
    setTimeout(() => el.remove(), 850);
  }, 1550);
}

// sweep ข้อความที่เก่าเกิน 5 นาที (รองรับกรณีโหลดประวัติเก่า)
function _sweepOldMessages() {
  const now = Date.now();
  chatMessages.querySelectorAll('.chat-msg[data-ts]').forEach(el => {
    const ts = Number(el.dataset.ts);
    if (ts && now - ts >= FADE_AFTER_MS && el.style.opacity !== '0') {
      _fadeMsg(el);
    }
  });
}

function _onTyping(typingMap) {
  const others = Object.entries(typingMap)
    .filter(([id]) => id !== SESSION_ID)
    .map(([, v]) => v.username);
  if (others.length === 0) {
    typingIndicator.classList.add('hidden');
  } else {
    typingText.textContent = `${others.map(escapeHtml).join(', ')} กำลังพิมพ์...`;
    typingIndicator.classList.remove('hidden');
  }
}

export function appendSystemMsg(msg) {
  const div = document.createElement('div');
  div.className   = 'chat-msg chat-msg-system';
  div.textContent = msg;
  div.dataset.ts  = Date.now();
  chatMessages.insertBefore(div, chatMessages.firstChild);
  setTimeout(() => _fadeMsg(div), FADE_AFTER_MS);
}

function _formatTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
