/**
 * ui.js — Gender picker + randomize appearance
 */
import { ROOM_OBJECTS } from './objects.js';
import { saveBoardContent, loadBoardContent } from './firebase.js';
import { randomAppearance, drawAvatarToCanvas, resolveAp } from './player.js';

const $ = id => document.getElementById(id);
const loginOverlay=$('loginOverlay'),app=$('app'),avatarGrid=$('avatarGrid'),
  usernameInput=$('usernameInput'),usernameHint=$('usernameHint'),
  loginBtn=$('loginBtn'),loginSpinner=$('loginSpinner'),loginError=$('loginError'),
  logoutBtn=$('logoutBtn'),userList=$('userList'),userCount=$('userCount'),
  onlineCount=$('onlineCount'),tooltip=$('tooltip'),tooltipIcon=$('tooltipIcon'),
  tooltipName=$('tooltipName'),tooltipDesc=$('tooltipDesc'),
  contentOverlay=$('contentOverlay'),contentModalTitle=$('contentModalTitle'),
  contentModalBody=$('contentModalBody'),contentModalClose=$('contentModalClose'),
  notifications=$('notifications'),minimap=$('minimap'),
  minimapToggleBtn=$('minimapToggleBtn');

let currentAppearance = randomAppearance('m');
let currentUser = null;

/* ═══════════════════════════════════════════════════════════════
   GENDER PICKER UI  (inject into existing avatarGrid element)
═══════════════════════════════════════════════════════════════ */
function buildGenderPicker() {
  // Replace avatarGrid with new gender-picker layout
  const section = avatarGrid.parentElement; // .avatar-section

  // Rebuild section content
  section.innerHTML = `
    <label class="section-label">เลือกตัวละคร</label>

    <div id="genderRow" style="display:flex;gap:10px;margin-bottom:14px">
      <button id="btnMale" class="gender-btn selected" data-gender="m">
        👨 ชาย
      </button>
      <button id="btnFemale" class="gender-btn" data-gender="f">
        👩 หญิง
      </button>
    </div>

    <div id="avatarPreviewWrap" style="
      display:flex;align-items:center;gap:16px;
      background:#1c2535;border:1px solid #2a3a55;border-radius:10px;
      padding:14px 18px;margin-bottom:4px">

      <canvas id="avatarPreviewCanvas" width="72" height="92"
        style="image-rendering:pixelated;border-radius:8px;
               background:#0d1117;border:2px solid #3b82f6;flex-shrink:0"></canvas>

      <div style="flex:1;min-width:0">
        <div id="apTraits" style="font-size:11px;color:#6b7fa3;line-height:1.9;margin-bottom:10px"></div>
        <button id="rerollBtn" style="
          background:#1e3a5f;border:1px solid #3b82f6;color:#60a5fa;
          font-size:12px;font-family:Sarabun,sans-serif;font-weight:600;
          padding:6px 14px;border-radius:6px;cursor:pointer;width:100%;
          transition:.15s ease">
          🎲 สุ่มใหม่
        </button>
      </div>
    </div>
  `;

  // inject gender-btn styles once
  if (!document.getElementById('genderBtnStyle')) {
    const s = document.createElement('style');
    s.id = 'genderBtnStyle';
    s.textContent = `
      .gender-btn {
        flex:1; padding:10px 0; font-size:14px; font-family:Sarabun,sans-serif;
        font-weight:700; border-radius:8px; cursor:pointer; transition:.15s ease;
        background:#1c2535; border:2px solid #2a3a55; color:#7a8299;
      }
      .gender-btn.selected {
        border-color:#4ade80; background:rgba(74,222,128,.08); color:#4ade80;
        box-shadow:0 0 12px rgba(74,222,128,.25);
      }
      .gender-btn:hover:not(.selected) { border-color:#3b82f6; color:#60a5fa; background:#1e2d45; }
      #rerollBtn:hover { background:#1a4a7a; box-shadow:0 0 10px rgba(59,130,246,.3); }
    `;
    document.head.appendChild(s);
  }

  const btnM = $('btnMale'), btnF = $('btnFemale');
  const canvas = $('avatarPreviewCanvas');

  function selectGender(g) {
    currentAppearance = randomAppearance(g);
    btnM.classList.toggle('selected', g==='m');
    btnF.classList.toggle('selected', g==='f');
    renderPreview();
  }

  function renderPreview() {
    drawAvatarToCanvas(canvas, currentAppearance);
    const ap = currentAppearance;
    const HAIR_NAMES   = ['ดำ','น้ำตาลเข้ม','น้ำตาล','ทอง','บลอนด์','แดง','ม่วง','ฟ้า','เขียว','ส้ม','ทองสด','น้ำเงิน','ม่วงเข้ม','เทอร์ควอยซ์','เงิน','แดงเข้ม'];
    const HAT_NAMES    = ['ไม่มี','หมวกแก๊ป','หมวกไหมพรม','หมวกฟาง','หมวกเบเร่ต์','หมวกเฟดอร่า','ที่คาดผม'];
    const ITEM_NAMES   = ['ไม่มี','กาแฟ','โทรศัพท์','กระเป๋า','หนังสือ','ดอกไม้','ร่ม','กล้อง','หูฟัง'];
    const HAIR_STYLE_M = ['สั้น','แสกข้าง','ยุ่ง','ซอย','กลาง','หวีขึ้น'];
    const HAIR_STYLE_F = ['ยาว','หางม้า','มวย','บ็อบ','ทวินเทล','ลอน'];
    const SKIN_NAMES   = ['ขาวมาก','ขาว','ขาวอมชมพู','แทน','น้ำตาลอ่อน','น้ำตาล','เข้ม','เข้มมาก','ขาวนวล','แทนทอง','น้ำตาลแดง','เข้มพิเศษ'];
    const EYE_NAMES    = ['น้ำตาล','ฟ้า','เขียว','น้ำผึ้ง'];
    const isFem = ap.gender==='f';
    const blushText = ap.blush ? '✓' : '—';
    $('apTraits').innerHTML = `
      🧴 ผิว: ${SKIN_NAMES[ap.skinIdx % SKIN_NAMES.length]}<br>
      💇 ผม: ${HAIR_NAMES[ap.hairIdx % HAIR_NAMES.length]} / ${isFem?HAIR_STYLE_F[ap.hairStyle%6]:HAIR_STYLE_M[ap.hairStyle%6]}<br>
      👁️ ตา: ${EYE_NAMES[(ap.eyeColor??0) % EYE_NAMES.length]}<br>
      🎩 หมวก: ${HAT_NAMES[(ap.hatType??0) % HAT_NAMES.length]}<br>
      🎒 ของ: ${ITEM_NAMES[(ap.itemType??0) % ITEM_NAMES.length]}<br>
      🌸 แก้ม: ${blushText}
    `;
  }

  btnM.addEventListener('click', () => selectGender('m'));
  btnF.addEventListener('click', () => selectGender('f'));
  $('rerollBtn').addEventListener('click', () => {
    currentAppearance = randomAppearance(currentAppearance.gender);
    renderPreview();
  });

  renderPreview();
}

/* ═══════════════════════════════════════════════════════════════
   LOGIN
═══════════════════════════════════════════════════════════════ */
export function initLogin(onLogin, checkDuplicate) {
  buildGenderPicker();

  // clear stale session so avatar always applies
  clearSession();

  usernameInput.addEventListener('input', () => {
    const len = usernameInput.value.trim().length;
    loginBtn.disabled = len < 3;
    loginError.textContent = '';
    usernameHint.textContent = len>0 ? (len<3?`ต้องการอีก ${3-len} ตัว`:`${len}/20`) : '';
  });
  usernameInput.addEventListener('keydown', e => {
    if (e.key==='Enter' && !loginBtn.disabled) loginBtn.click();
  });

  loginBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    if (username.length<3||username.length>20) return;
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner"></span> กำลังเข้า...';
    try {
      const taken = await checkDuplicate(username);
      if (taken) { loginError.textContent='❌ ชื่อนี้ถูกใช้แล้ว'; return; }
      currentUser = { username, appearance: currentAppearance };
      saveSession(currentUser);
      _showApp();
      onLogin(currentUser);
    } catch(err) {
      loginError.textContent = '❌ เชื่อมต่อ Firebase ไม่ได้ ตรวจสอบ config.js';
      console.error('[Login]', err);
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'เข้าห้อง →';
    }
  });
}

function _showApp() {
  loginOverlay.classList.remove('active'); loginOverlay.classList.add('hidden');
  app.classList.remove('hidden');
}

logoutBtn.addEventListener('click', async () => {
  const { leaveRoom } = await import('./firebase.js');
  await leaveRoom(); clearSession(); location.reload();
});

/* ── Session ─────────────────────────────────────────────────── */
const SK = 'vr_session_v4';
function saveSession(u)  { localStorage.setItem(SK, JSON.stringify(u)); }
function clearSession()  { localStorage.removeItem(SK); }

/* ═══════════════════════════════════════════════════════════════
   USER LIST
═══════════════════════════════════════════════════════════════ */
export function updateUserList(players, myId) {
  userList.innerHTML = '';
  const list = Object.values(players).filter(p => p?.username);
  userCount.textContent = onlineCount.textContent = list.length;
  list.sort((a,b) => (b.id===myId?1:0)-(a.id===myId?1:0));
  list.forEach(p => {
    const isMe = p.id===myId;
    const li = document.createElement('li');
    if (isMe) li.classList.add('user-me');
    if (p.idle) li.classList.add('user-idle');

    const cv = document.createElement('canvas');
    cv.width=28; cv.height=36; cv.className='user-avatar-sm';
    drawAvatarToCanvas(cv, p);

    const ns = document.createElement('span'); ns.className='user-name';
    const isAdminUser = p.username === '0910655667';
    ns.innerHTML = isAdminUser
      ? '👑 <span style="color:#ffd700;font-weight:700;text-shadow:0 0 8px #ffd700aa">ADMIN</span>' + (isMe?' <span class="me-tag">(ฉัน)</span>':'')
      : escapeHtml(p.username)+(isMe?' <span class="me-tag">(ฉัน)</span>':'');
    const dot = document.createElement('span'); dot.className='user-status-dot';
    li.append(cv, ns, dot); userList.appendChild(li);
  });
}

/* ═══════════════════════════════════════════════════════════════
   TOOLTIP
═══════════════════════════════════════════════════════════════ */
export function showTooltip(obj, sx, sy) {
  tooltipIcon.textContent=obj.icon; tooltipName.textContent=obj.name; tooltipDesc.textContent=obj.description;
  tooltip.classList.remove('hidden'); _posTooltip(sx,sy);
}
export function moveTooltip(sx,sy) { _posTooltip(sx,sy); }
export function hideTooltip() { tooltip.classList.add('hidden'); }
function _posTooltip(x,y) {
  const r=$('gameWrapper').getBoundingClientRect();
  tooltip.style.left=Math.min(x-r.left+16, r.width-224)+'px';
  tooltip.style.top=Math.max(y-r.top-10, 4)+'px';
}

/* ═══════════════════════════════════════════════════════════════
   CONTENT MODAL
═══════════════════════════════════════════════════════════════ */
export function openObjectModal(obj) {
  contentModalTitle.textContent=`${obj.icon} ${obj.name}`;
  contentModalBody.innerHTML='';
  if (obj.actionType==='url') { window.open(obj.actionValue,'_blank','noopener'); return; }

  // ── กระดานประกาศ: load จาก Firebase + admin editor ──
  if (obj.id === 'board01') {
    _openBoard(obj);
    return;
  }

  if (obj.actionType==='image') contentModalBody.innerHTML=`<img src="${_ea(obj.actionValue)}" />`;
  else if (obj.actionType==='pdf') contentModalBody.innerHTML=`<iframe src="${_ea(obj.actionValue)}"></iframe>`;
  else contentModalBody.innerHTML=obj.actionValue;
  contentOverlay.classList.remove('hidden'); contentOverlay.classList.add('active');
}

/* ── Board modal ────────────────────────────────────────────── */
let _currentUsername = '';
export function setCurrentUsername(name) { _currentUsername = name; }

async function _openBoard(obj) {
  // Show loading state first
  contentModalBody.innerHTML = `<div style="color:#6b7fa3;padding:20px;text-align:center">⏳ กำลังโหลด...</div>`;
  contentOverlay.classList.remove('hidden'); contentOverlay.classList.add('active');

  // Load from Firebase (fallback to default if not saved yet)
  let savedHtml = null;
  try { savedHtml = await loadBoardContent(); } catch (_) {}
  const displayHtml = savedHtml ?? obj.actionValue;

  const isAdminUser = _currentUsername === '0910655667';

  if (isAdminUser) {
    // Admin: show rich editor
    contentModalBody.innerHTML = `
      <div style="margin-bottom:10px">
        <div style="font-size:11px;color:#4ade80;margin-bottom:6px">✏️ โหมดแก้ไข (Admin)</div>
        <div id="boardEditor" contenteditable="true" style="
          min-height:140px; background:#0d1117; border:1.5px solid #3b82f6;
          border-radius:8px; padding:14px; color:#e8ecf4; font-size:14px;
          font-family:Sarabun,sans-serif; line-height:1.8; outline:none;
          white-space:pre-wrap;
        ">${displayHtml}</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button id="boardSaveBtn" style="
          flex:1; background:#166534; border:1px solid #4ade80; color:#4ade80;
          padding:9px; border-radius:7px; cursor:pointer; font-size:13px;
          font-family:Sarabun,sans-serif; font-weight:700; transition:.15s
        ">💾 บันทึก</button>
        <button id="boardCancelBtn" style="
          flex:1; background:#1c2535; border:1px solid #3b82f6; color:#60a5fa;
          padding:9px; border-radius:7px; cursor:pointer; font-size:13px;
          font-family:Sarabun,sans-serif; transition:.15s
        ">✕ ยกเลิก</button>
      </div>
      <div id="boardSaveMsg" style="margin-top:8px;font-size:12px;color:#4ade80;text-align:center;min-height:18px"></div>
      <div style="margin-top:10px;font-size:11px;color:#4a5568;border-top:1px solid #1e2535;padding-top:8px">
        💡 พิมพ์ข้อความได้เลย รองรับ HTML เช่น &lt;b&gt;ตัวหนา&lt;/b&gt; &lt;br&gt; ขึ้นบรรทัดใหม่
      </div>
    `;

    $('boardSaveBtn').addEventListener('click', async () => {
      const btn = $('boardSaveBtn');
      const msg = $('boardSaveMsg');
      btn.textContent = '⏳ กำลังบันทึก...';
      btn.disabled = true;
      try {
        const html = $('boardEditor').innerHTML;
        await saveBoardContent(html);
        // Update in-memory object so others see it on next open (before refresh)
        obj.actionValue = html;
        msg.textContent = '✅ บันทึกสำเร็จ! ทุกคนจะเห็นข้อความใหม่เมื่อเปิดกระดาน';
        btn.textContent = '💾 บันทึก';
        btn.disabled = false;
      } catch (err) {
        msg.style.color = '#ff5555';
        msg.textContent = '❌ บันทึกไม่สำเร็จ: ' + (err.message || err);
        btn.textContent = '💾 บันทึก';
        btn.disabled = false;
      }
    });

    $('boardCancelBtn').addEventListener('click', _closeModal);

  } else {
    // Normal user: read-only view
    contentModalBody.innerHTML = displayHtml;
  }
}
contentModalClose.addEventListener('click',_closeModal);
contentOverlay.addEventListener('click',e=>{ if(e.target===contentOverlay)_closeModal(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape')_closeModal(); });
function _closeModal() {
  contentOverlay.classList.remove('active'); contentOverlay.classList.add('hidden');
  contentModalBody.innerHTML='';
}

/* ═══════════════════════════════════════════════════════════════
   NOTIFICATIONS
═══════════════════════════════════════════════════════════════ */
export function showNotification(msg, type='info') {
  const el=document.createElement('div'); el.className=`notification ${type}`; el.textContent=msg;
  notifications.appendChild(el);
  setTimeout(()=>{ el.classList.add('removing'); setTimeout(()=>el.remove(),350); },3500);
}

/* ═══════════════════════════════════════════════════════════════
   MINIMAP
═══════════════════════════════════════════════════════════════ */
minimapToggleBtn.addEventListener('click',()=>minimap.classList.toggle('hidden'));
export function updateMinimap(px,py,wW,wH) {
  const cv=$('minimapCanvas'), dot=$('minimapPlayer');
  dot.style.left=(px/wW)*cv.width+'px'; dot.style.top=(py/wH)*cv.height+'px';
}
export function drawMinimapBg(wW,wH) {
  const cv=$('minimapCanvas'), ctx=cv.getContext('2d');
  ctx.fillStyle='#0d0f14'; ctx.fillRect(0,0,cv.width,cv.height);
  const sx=cv.width/wW, sy=cv.height/wH;
  ROOM_OBJECTS.forEach(o=>{ ctx.fillStyle='#2a2f42'; ctx.fillRect(o.x*sx,o.y*sy,o.width*sx,o.height*sy); });
}

/* ═══════════════════════════════════════════════════════════════
   CLICK EFFECT
═══════════════════════════════════════════════════════════════ */
export function clickEffect(cx,cy) {
  const r=$('gameWrapper').getBoundingClientRect();
  const el=document.createElement('div'); el.className='click-ripple';
  el.style.left=(cx-r.left)+'px'; el.style.top=(cy-r.top)+'px';
  $('clickEffects').appendChild(el); setTimeout(()=>el.remove(),600);
}

/* ── helpers ─────────────────────────────────────────────────── */
export function escapeHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function _ea(s) { return String(s).replace(/"/g,'%22'); }
