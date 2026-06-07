/**
 * chat.js — Chat + bubble + auto-fade messages every 5 min
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

let myUsername        = '';
let renderedKeys      = new Set();
let _getLocalPlayer   = null;
let _getRemotePlayers = null;

const FADE_AFTER_MS = 5 * 60 * 1000; // 5 นาที

export function initChat(username, getLocalPlayer, getRemotePlayers) {
  myUsername        = username;
  _getLocalPlayer   = getLocalPlayer;
  _getRemotePlayers = getRemotePlayers;

  chatSendBtn.addEventListener('click', _send);
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _send(); }
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

  listenChat(_onMessage);
  listenTyping(_onTyping);

  // ตรวจทุก 30 วินาที หาข้อความที่อายุ > 5 นาทีแล้ว fade
  setInterval(_sweepOldMessages, 30_000);
}

async function _send() {
  const text = chatInput.value.trim();
  if (!text) return;
  if (text.length > 300) { appendSystemMsg('⚠️ ข้อความยาวเกิน 300 ตัวอักษร'); return; }
  const result = await sendChatMessage(text, myUsername);
  if (result.ok) { chatInput.value = ''; stopTyping(); }
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

  chatMessages.appendChild(div);
  _scrollToBottom();

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
  el.style.transition = 'opacity 2s ease, max-height 1s ease 1.5s';
  el.style.opacity    = '0';
  el.style.maxHeight  = el.offsetHeight + 'px';
  // หลัง fade เสร็จ ค่อย collapse แล้ว remove
  setTimeout(() => {
    el.style.maxHeight  = '0';
    el.style.marginBottom = '0';
    el.style.padding    = '0';
    setTimeout(() => el.remove(), 1100);
  }, 2100);
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
  chatMessages.appendChild(div);
  _scrollToBottom();
  setTimeout(() => _fadeMsg(div), FADE_AFTER_MS);
}

function _scrollToBottom() { chatMessages.scrollTop = chatMessages.scrollHeight; }
function _formatTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
