/**
 * chat.js — Floating chat overlay
 *
 * - Floating chat box (bottom-right) toggled by a FAB button — full
 *   history inside fades each message after 5 minutes (unchanged).
 * - A separate lightweight "floating bubble feed" sits over the game
 *   canvas: every new message pops in near the bottom-right and
 *   auto-fades after ~5 seconds, similar to the reference game's
 *   transient chat toast style. This shows even while the chat box
 *   is closed, so people don't miss messages.
 * - Unread dot on the FAB button while the chat box is closed.
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
const floatingChatBox = document.getElementById('floatingChatBox');
const chatCloseBtn    = document.getElementById('chatCloseBtn');
const chatUnreadDot   = document.getElementById('chatUnreadDot');
const floatingChatLog = document.getElementById('floatingChatLog');

let myUsername        = '';
let renderedKeys      = new Set();
let _getLocalPlayer   = null;
let _getRemotePlayers = null;
let _isFirstSnapshot  = true; // skip floating-bubble spam for chat history on join
let _isBoxOpen        = false;

const FADE_AFTER_MS   = 5 * 60 * 1000; // 5 นาที — full chat log entry
const BUBBLE_FADE_MS  = 5000;          // 5 วินาที — floating toast bubble

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

  chatToggleBtn.addEventListener('click', _toggleBox);
  chatCloseBtn.addEventListener('click', _closeBox);

  listenChat(_onMessage);
  listenTyping(_onTyping);

  // ตรวจทุก 30 วินาที หาข้อความที่อายุ > 5 นาทีแล้ว fade
  setInterval(_sweepOldMessages, 30_000);
}

function _toggleBox() { _isBoxOpen ? _closeBox() : _openBox(); }
function _openBox() {
  _isBoxOpen = true;
  floatingChatBox.classList.add('open');
  chatUnreadDot.classList.add('hidden');
  _scrollToBottom();
  chatInput.focus();
}
function _closeBox() {
  _isBoxOpen = false;
  floatingChatBox.classList.remove('open');
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
  if (_isBoxOpen) _scrollToBottom();

  // ตั้ง timer fade ให้ข้อความนี้โดยตรงตาม timestamp จริง
  const age     = Date.now() - msgTs;
  const delay   = Math.max(0, FADE_AFTER_MS - age);
  setTimeout(() => _fadeMsg(div), delay);

  // floating toast bubble over the game canvas (skip on initial history load)
  if (!_isFirstSnapshot) {
    _showFloatingBubble(data.username, data.text, isMe);
    if (!_isBoxOpen) chatUnreadDot.classList.remove('hidden');
  }

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

/* ── Floating toast bubble feed (auto-fade ~5s) ──────────────── */
function _showFloatingBubble(username, text, isMe) {
  const bubble = document.createElement('div');
  bubble.className = 'floating-chat-bubble' + (isMe ? ' me' : '');
  bubble.innerHTML = `<span class="fcb-name">${escapeHtml(username)}</span><span class="fcb-text">${escapeHtml(text)}</span>`;
  floatingChatLog.appendChild(bubble);

  // cap visible bubbles so the feed doesn't pile up forever
  while (floatingChatLog.children.length > 5) {
    floatingChatLog.removeChild(floatingChatLog.firstChild);
  }

  requestAnimationFrame(() => bubble.classList.add('show'));

  setTimeout(() => {
    bubble.classList.remove('show');
    bubble.classList.add('fade-out');
    setTimeout(() => bubble.remove(), 400);
  }, BUBBLE_FADE_MS);
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
  if (_isBoxOpen) _scrollToBottom();
  setTimeout(() => _fadeMsg(div), FADE_AFTER_MS);
}

function _scrollToBottom() { chatMessages.scrollTop = chatMessages.scrollHeight; }
function _formatTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// After the initial Firebase snapshot of existing messages has been
// processed, flip this off so only genuinely NEW messages trigger the
// floating toast bubble (avoids a wall of toasts on every page load).
setTimeout(() => { _isFirstSnapshot = false; }, 1200);
