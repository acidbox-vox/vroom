/**
 * ui.js — Gender picker + randomize appearance
 */
import { saveBoardContent, loadBoardContent, saveSystemLink, listenSystemLinks, addLevel2Username, removeLevel2Username, listenLevel2Usernames, saveAnnouncement, loadAnnouncement } from './firebase.js';
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
  notifications=$('notifications'),
  onlineUsersBtn=$('onlineUsersBtn'),onlineUsersPopup=$('onlineUsersPopup');

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
    const HAIR_STYLE_M = ['สั้นเรียบ','แสกข้าง','ยุ่ง','ซอยสั้น','หวีขึ้น','หน้ายาว'];
    const HAIR_STYLE_F = ['ยาวตรง','หางม้า','มวย','บ็อบ','ทวินเทล','พิกซี่'];
    const SKIN_NAMES   = ['ขาวมาก','ขาว','ขาวอมชมพู','แทน','น้ำตาลอ่อน','น้ำตาล','เข้ม','เข้มมาก','ขาวนวล','แทนทอง','น้ำตาลแดง','เข้มพิเศษ'];
    const EYE_NAMES    = ['น้ำตาล','ฟ้า','เขียว','น้ำผึ้ง'];
    const TIE_NAMES    = ['ไม่มี','แดง','น้ำเงิน','เขียว','เหลือง','ม่วง','ส้ม','ฟิโรส','ขาว','แซลมอน','ชมพู','เขียวสด'];
    const ACCESS_NAMES = ['ไม่มี','ต่างหู','สร้อย','บัตรพนักงาน'];
    const isFem = ap.gender==='f';
    $('apTraits').innerHTML = `
      🧴 ผิว: ${SKIN_NAMES[ap.skinIdx % SKIN_NAMES.length]}<br>
      💇 ผม: ${HAIR_NAMES[ap.hairIdx % HAIR_NAMES.length]} / ${isFem?HAIR_STYLE_F[(ap.hairStyle??0)%6]:HAIR_STYLE_M[(ap.hairStyle??0)%6]}<br>
      👁️ ตา: ${EYE_NAMES[(ap.eyeIdx??0) % EYE_NAMES.length]}${ap.glasses?' 👓':''}<br>
      👔 เนคไท: ${TIE_NAMES[(ap.tieIdx??0) % TIE_NAMES.length]}<br>
      📎 ของ: ${ACCESS_NAMES[(ap.accessory??0) % ACCESS_NAMES.length]}<br>
      🌸 แก้ม: ${ap.blush?'✓':'—'}
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
    cv.width=24; cv.height=32; cv.className='user-avatar-sm';
    drawAvatarToCanvas(cv, p);

    const ns = document.createElement('span'); ns.className='user-name';
    const isAdminUser = p.username === '0910655667';
    const isLevel2User = _level2Usernames.includes(p.username);
    ns.innerHTML = isAdminUser
      ? '👑 <span style="color:#ffd700;font-weight:700;text-shadow:0 0 8px #ffd700aa">ADMIN</span>' + (isMe?' <span class="me-tag">(ฉัน)</span>':'')
      : (isLevel2User ? '⭐ ' : '') + escapeHtml(p.username) + (isMe?' <span class="me-tag">(ฉัน)</span>':'');
    const dot = document.createElement('span'); dot.className='user-status-dot';
    li.append(cv, ns, dot); userList.appendChild(li);
  });
}

/* ═══════════════════════════════════════════════════════════════
   TOOLTIP
═══════════════════════════════════════════════════════════════ */
export function showTooltip(obj, sx, sy) {
  tooltipIcon.textContent=obj.icon; tooltipName.textContent=obj.displayName || obj.name; tooltipDesc.textContent=obj.description;
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
  contentModalTitle.textContent=`${obj.icon} ${obj.displayName || obj.name}`;
  contentModalBody.innerHTML='';
  if (obj.actionType==='url') { window.open(obj.actionValue,'_blank','noopener'); return; }

  // ── จอกลาง (Central Monitor): load จาก Firebase + admin editor ──
  if (obj.id === 'central_monitor') {
    _openBoard(obj);
    return;
  }

  // ── ระบบ SYS-01..06: ชื่อ+link ที่แอดมิน/level2 แก้ไขได้ ──
  if (obj.actionType === 'system') {
    _openSystem(obj);
    return;
  }

  if (obj.actionType==='image') contentModalBody.innerHTML=`<img src="${_ea(obj.actionValue)}" />`;
  else if (obj.actionType==='pdf') contentModalBody.innerHTML=`<iframe src="${_ea(obj.actionValue)}"></iframe>`;
  else contentModalBody.innerHTML=obj.actionValue;
  contentOverlay.classList.remove('hidden'); contentOverlay.classList.add('active');
}

/* ── Permission helpers ──────────────────────────────────────── */
let _level2Usernames = [];
export function setLevel2Usernames(list) { _level2Usernames = Array.isArray(list) ? list : []; }
export function getLevel2Usernames() { return _level2Usernames; }
function _isAdminUser() { return _currentUsername === '0910655667'; }
function _isLevel2User() {
  return _level2Usernames.includes(_currentUsername);
}

/* ── SYS-01..06 modal: name+link, read-only for normal users,
       editable for admin (all) or level2 (SYS-01..03 only) ──── */
async function _openSystem(obj) {
  contentModalBody.innerHTML = `<div style="color:#6b7fa3;padding:20px;text-align:center">⏳ กำลังโหลด...</div>`;
  contentOverlay.classList.remove('hidden'); contentOverlay.classList.add('active');

  const url  = obj.actionValue || '';
  const name = obj.displayName || obj.name || '';
  const canEdit = _isAdminUser() || (obj.editableByLevel2 && _isLevel2User());

  if (canEdit) {
    const announcement = (obj.hasLevel2AdminSection && _isAdminUser()) ? await loadAnnouncement().catch(()=>'') : '';
    const announceSection = (obj.hasLevel2AdminSection && _isAdminUser()) ? `
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid #1e2535">
        <div style="font-size:11px;color:#ffb000;margin-bottom:6px">📢 ป้ายไฟประกาศ (วิ่งบน Central Monitor)</div>
        <input id="announceInput" type="text" value="${_ea(announcement)}" placeholder="พิมพ์ข้อความประกาศ..." maxlength="300" style="
          width:100%; box-sizing:border-box; background:#0d1117; border:1.5px solid #ffb000;
          border-radius:8px; padding:10px 12px; color:#e8ecf4; font-size:13px;
          font-family:Sarabun,sans-serif; outline:none; margin-bottom:8px;
        ">
        <div style="display:flex;gap:8px">
          <button id="announceSaveBtn" style="
            flex:1; background:#3a2a08; border:1px solid #ffb000; color:#ffb000;
            padding:9px; border-radius:7px; cursor:pointer; font-size:13px;
            font-family:Sarabun,sans-serif; font-weight:700; transition:.15s
          ">💾 บันทึก & แสดง</button>
          <button id="announceClearBtn" style="
            flex:1; background:#1c2535; border:1px solid #3b82f6; color:#60a5fa;
            padding:9px; border-radius:7px; cursor:pointer; font-size:13px;
            font-family:Sarabun,sans-serif; transition:.15s
          ">✕ ล้างป้ายไฟ</button>
        </div>
        <div style="font-size:11px;color:#4a5568;margin-top:6px">
          ข้อความจะวิ่งวนซ้ำที่แถบด้านล่างของ Central Monitor ตลอดเวลา จนกว่าจะล้างหรือเปลี่ยน
        </div>
        <div id="announceSaveMsg" style="margin-top:6px;font-size:12px;color:#4ade80;text-align:center;min-height:18px"></div>
      </div>
    ` : '';

    const level2Section = (obj.hasLevel2AdminSection && _isAdminUser()) ? `
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid #1e2535">
        <div style="font-size:11px;color:#ffd700;margin-bottom:6px">🛡️ ผู้ใช้สิทธิ์ระดับ 2</div>
        <div id="lvl2List" style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">
          ${_level2Usernames.length === 0
            ? `<div style="font-size:12px;color:#4a5568;text-align:center;padding:8px 0">— ยังไม่มีผู้ใช้ —</div>`
            : _level2Usernames.map(n => `
              <div style="display:flex;align-items:center;justify-content:space-between;background:#0d1117;border:1px solid #2a3242;border-radius:7px;padding:6px 10px">
                <span style="font-size:13px;color:#ffd700">⭐ ${escapeHtml(n)}</span>
                <button class="lvl2DelBtn" data-name="${_ea(n)}" style="
                  background:#3a1414; border:1px solid #ff5555; color:#ff8888;
                  padding:3px 10px; border-radius:5px; cursor:pointer; font-size:11px;
                  font-family:Sarabun,sans-serif;
                ">ลบ</button>
              </div>`).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-bottom:6px">
          <input id="lvl2Input" type="text" placeholder="เพิ่มชื่อผู้ใช้ (username)" style="
            flex:1; box-sizing:border-box; background:#0d1117; border:1.5px solid #ffd700;
            border-radius:8px; padding:9px 12px; color:#e8ecf4; font-size:13px;
            font-family:Sarabun,sans-serif; outline:none;
          ">
          <button id="lvl2AddBtn" style="
            background:#3a3010; border:1px solid #ffd700; color:#ffd700;
            padding:0 16px; border-radius:7px; cursor:pointer; font-size:13px;
            font-family:Sarabun,sans-serif; font-weight:700; transition:.15s
          ">+ เพิ่ม</button>
        </div>
        <div style="font-size:11px;color:#4a5568;margin-bottom:4px">
          ผู้ใช้ในรายชื่อจะได้: ออร่าวงแหวนสีเหลืองใต้ตัวละคร, ดาว ⭐ นำหน้าชื่อ และสิทธิ์แก้ไข SYS-01, 02, 03
        </div>
        <div id="lvl2SaveMsg" style="margin-top:6px;font-size:12px;color:#4ade80;text-align:center;min-height:18px"></div>
      </div>
    ` : '';

    contentModalBody.innerHTML = `
      <div style="margin-bottom:10px">
        <div style="font-size:11px;color:#22e5ff;margin-bottom:6px">✏️ โหมดแก้ไข ชื่อระบบ + Link</div>
        <input id="sysNameInput" type="text" value="${_ea(name)}" placeholder="ชื่อระบบ" style="
          width:100%; box-sizing:border-box; background:#0d1117; border:1.5px solid #22e5ff;
          border-radius:8px; padding:10px 12px; color:#e8ecf4; font-size:13px;
          font-family:Sarabun,sans-serif; outline:none; margin-bottom:8px;
        ">
        <input id="sysLinkInput" type="text" value="${_ea(url)}" placeholder="https://..." style="
          width:100%; box-sizing:border-box; background:#0d1117; border:1.5px solid #22e5ff;
          border-radius:8px; padding:10px 12px; color:#e8ecf4; font-size:13px;
          font-family:Sarabun,sans-serif; outline:none;
        ">
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button id="sysSaveBtn" style="
          flex:1; background:#0e3a45; border:1px solid #22e5ff; color:#22e5ff;
          padding:9px; border-radius:7px; cursor:pointer; font-size:13px;
          font-family:Sarabun,sans-serif; font-weight:700; transition:.15s
        ">💾 บันทึก</button>
        ${url ? `<button id="sysOpenBtn" style="
          flex:1; background:#1c2535; border:1px solid #3b82f6; color:#60a5fa;
          padding:9px; border-radius:7px; cursor:pointer; font-size:13px;
          font-family:Sarabun,sans-serif; transition:.15s
        ">🔗 เปิดลิงก์</button>` : ''}
      </div>
      <div id="sysSaveMsg" style="margin-top:8px;font-size:12px;color:#4ade80;text-align:center;min-height:18px"></div>
      ${level2Section}
      ${announceSection}
    `;

    $('sysSaveBtn').addEventListener('click', async () => {
      const btn = $('sysSaveBtn'); const msg = $('sysSaveMsg');
      const newUrl  = $('sysLinkInput').value.trim();
      const newName = $('sysNameInput').value.trim();
      btn.textContent = '⏳ กำลังบันทึก...'; btn.disabled = true;
      try {
        await saveSystemLink(obj.id, newUrl, newName);
        obj.actionValue = newUrl;
        obj.displayName = newName;
        if (newName) {
          contentModalTitle.textContent = `${obj.icon} ${newName}`;
        }
        msg.textContent = '✅ บันทึกสำเร็จ!';
        btn.textContent = '💾 บันทึก'; btn.disabled = false;
      } catch (err) {
        msg.style.color = '#ff5555';
        msg.textContent = '❌ บันทึกไม่สำเร็จ: ' + (err.message || err);
        btn.textContent = '💾 บันทึก'; btn.disabled = false;
      }
    });
    $('sysOpenBtn')?.addEventListener('click', () => window.open(url, '_blank', 'noopener'));

    if (obj.hasLevel2AdminSection && _isAdminUser()) {
      $('lvl2AddBtn').addEventListener('click', async () => {
        const btn = $('lvl2AddBtn'); const msg = $('lvl2SaveMsg');
        const newName = $('lvl2Input').value.trim();
        if (!newName) return;
        btn.textContent = '⏳'; btn.disabled = true;
        try {
          await addLevel2Username(newName);
          if (!_level2Usernames.includes(newName)) _level2Usernames.push(newName);
          $('lvl2Input').value = '';
          msg.textContent = '✅ เพิ่มสำเร็จ!';
          _refreshLevel2List();
        } catch (err) {
          msg.style.color = '#ff5555';
          msg.textContent = '❌ ไม่สำเร็จ: ' + (err.message || err);
        }
        btn.textContent = '+ เพิ่ม'; btn.disabled = false;
      });

      // delegate delete clicks (list re-renders dynamically)
      $('lvl2List').addEventListener('click', async (e) => {
        const delBtn = e.target.closest('.lvl2DelBtn');
        if (!delBtn) return;
        const name = delBtn.dataset.name;
        const msg = $('lvl2SaveMsg');
        delBtn.textContent = '⏳'; delBtn.disabled = true;
        try {
          await removeLevel2Username(name);
          _level2Usernames = _level2Usernames.filter(n => n !== name);
          msg.style.color = '#4ade80';
          msg.textContent = `✅ ลบ "${name}" แล้ว`;
          _refreshLevel2List();
        } catch (err) {
          msg.style.color = '#ff5555';
          msg.textContent = '❌ ไม่สำเร็จ: ' + (err.message || err);
          delBtn.textContent = 'ลบ'; delBtn.disabled = false;
        }
      });

      function _refreshLevel2List() {
        const listEl = $('lvl2List');
        listEl.innerHTML = _level2Usernames.length === 0
          ? `<div style="font-size:12px;color:#4a5568;text-align:center;padding:8px 0">— ยังไม่มีผู้ใช้ —</div>`
          : _level2Usernames.map(n => `
            <div style="display:flex;align-items:center;justify-content:space-between;background:#0d1117;border:1px solid #2a3242;border-radius:7px;padding:6px 10px">
              <span style="font-size:13px;color:#ffd700">⭐ ${escapeHtml(n)}</span>
              <button class="lvl2DelBtn" data-name="${_ea(n)}" style="
                background:#3a1414; border:1px solid #ff5555; color:#ff8888;
                padding:3px 10px; border-radius:5px; cursor:pointer; font-size:11px;
                font-family:Sarabun,sans-serif;
              ">ลบ</button>
            </div>`).join('');
      }

      // ── Announcement ticker save/clear ──
      $('announceSaveBtn').addEventListener('click', async () => {
        const btn = $('announceSaveBtn'); const msg = $('announceSaveMsg');
        const text = $('announceInput').value.trim();
        btn.textContent = '⏳ กำลังบันทึก...'; btn.disabled = true;
        try {
          await saveAnnouncement(text);
          msg.style.color = '#4ade80';
          msg.textContent = text ? '✅ บันทึกแล้ว — ป้ายไฟกำลังวิ่ง' : '✅ ล้างป้ายไฟแล้ว';
        } catch (err) {
          msg.style.color = '#ff5555';
          msg.textContent = '❌ ไม่สำเร็จ: ' + (err.message || err);
        }
        btn.textContent = '💾 บันทึก & แสดง'; btn.disabled = false;
      });
      $('announceClearBtn').addEventListener('click', async () => {
        const msg = $('announceSaveMsg');
        try {
          await saveAnnouncement('');
          $('announceInput').value = '';
          msg.style.color = '#4ade80';
          msg.textContent = '✅ ล้างป้ายไฟแล้ว';
        } catch (err) {
          msg.style.color = '#ff5555';
          msg.textContent = '❌ ไม่สำเร็จ: ' + (err.message || err);
        }
      });
    }

  } else {
    // ผู้ใช้ปกติ: กดเข้าลิงก์ทันทีถ้ามี ไม่ก็แจ้งว่ายังไม่ได้ตั้งค่า
    if (url) {
      window.open(url, '_blank', 'noopener');
      _closeModal();
      return;
    }
    contentModalBody.innerHTML = `<div style="color:#6b7fa3;padding:24px;text-align:center;font-size:13px">
      ⚙️ ระบบนี้ยังไม่ได้ตั้งค่า
    </div>`;
  }
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
   ONLINE USERS POPUP (replaces old minimap)
═══════════════════════════════════════════════════════════════ */
onlineUsersBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  onlineUsersPopup.classList.toggle('active');
});
document.addEventListener('click', (e) => {
  if (!onlineUsersPopup.classList.contains('active')) return;
  if (onlineUsersPopup.contains(e.target) || onlineUsersBtn.contains(e.target)) return;
  onlineUsersPopup.classList.remove('active');
});

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
