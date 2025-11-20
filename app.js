/* Football Team Manager - Single Page App
   - تخزين في localStorage
   - صور اللاعبين مخزنة كـ base64
   - جلسات وتسجيل حضور
   - إحصائيات وتصدير CSV
*/

// ===== Keys =====
const KEY_PLAYERS = 'ft_players_v2';
const KEY_SESSIONS = 'ft_sessions_v2';

// ===== State =====
let players = JSON.parse(localStorage.getItem(KEY_PLAYERS) || '[]');
let sessions = JSON.parse(localStorage.getItem(KEY_SESSIONS) || '[]');
let editingPlayerId = null;
let activeSessionId = null;

// ===== Helpers =====
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function savePlayers(){ localStorage.setItem(KEY_PLAYERS, JSON.stringify(players)); }
function saveSessions(){ localStorage.setItem(KEY_SESSIONS, JSON.stringify(sessions)); }
function formatDT(iso){ if(!iso) return '-'; const d = new Date(iso); return d.toLocaleString('ar-EG', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }); }

// ===== Tabs =====
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=> {
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.add('hidden'));
    document.getElementById(tab).classList.remove('hidden');
    // refresh views
    renderPlayers();
    renderSessionsList();
    renderStats();
  });
});

// ===== Player Form =====
const playerForm = document.getElementById('playerForm');
const inputName = document.getElementById('playerName');
const inputNumber = document.getElementById('playerNumber');
const inputPosition = document.getElementById('playerPosition');
const inputPhoto = document.getElementById('playerPhoto');

playerForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name = inputName.value.trim();
  if(!name) return alert('أدخل اسم اللاعب');

  const number = inputNumber.value.trim();
  const position = inputPosition.value;
  // if editing replace
  if(editingPlayerId){
    const p = players.find(x=>x.id===editingPlayerId);
    if(!p) return;
    p.name = name; p.number = number; p.position = position;
    // photo handled separately
    editingPlayerId = null;
  } else {
    const newP = { id: uid(), name, number, position, photo: null, createdAt: new Date().toISOString() };
    players.push(newP);
  }

  // handle photo file (if selected)
  const file = inputPhoto.files[0];
  if(file){
    const dataUrl = await readFileAsDataURL(file);
    // assign to last added or to edited player
    const targetId = editingPlayerId || players[players.length-1].id;
    const p = players.find(x=>x.id===targetId);
    if(p) p.photo = dataUrl;
  }

  savePlayers();
  playerForm.reset();
  renderPlayers();
  renderSessionsList();
  renderStats();
});

document.getElementById('resetForm').addEventListener('click', ()=>{
  playerForm.reset();
  editingPlayerId = null;
});

// file reader
function readFileAsDataURL(file){
  return new Promise((res, rej)=>{
    const fr = new FileReader();
    fr.onload = ()=> res(fr.result);
    fr.onerror = ()=> rej(fr.error);
    fr.readAsDataURL(file);
  });
}

// ===== Team List Rendering =====
const teamListEl = document.getElementById('teamList');
const searchEl = document.getElementById('searchPlayer');
const filterPosEl = document.getElementById('filterPos');
document.getElementById('clearPlayers').addEventListener('click', ()=>{
  if(!confirm('مسح جميع اللاعبين؟')) return;
  players = []; savePlayers(); renderPlayers(); renderSessionsList(); renderStats();
});

searchEl && searchEl.addEventListener('input', renderPlayers);
filterPosEl && filterPosEl.addEventListener('change', renderPlayers);

function renderPlayers(){
  const q = (searchEl?.value || '').trim().toLowerCase();
  const posFilter = filterPosEl?.value || '';
  teamListEl.innerHTML = '';

  if(players.length === 0){
    teamListEl.innerHTML = '<div class="small">لا يوجد لاعبين بعد.</div>'; return;
  }

  const filtered = players.filter(p=>{
    if(posFilter && p.position !== posFilter) return false;
    if(!q) return true;
    return (p.name || '').toLowerCase().includes(q) || (p.number || '').toString().includes(q);
  });

  filtered.forEach(p=>{
    const li = document.createElement('li');
    li.className = 'player-card';
    li.innerHTML = `
      <div class="player-thumb">${p.photo ? `<img src="${p.photo}" style="width:56px;height:56px;border-radius:8px;object-fit:cover" alt="">` : (p.name[0]||'؟')}</div>
      <div class="player-info">
        <div><strong>${escapeHtml(p.name)}</strong> <span class="small">#${p.number||'-'}</span></div>
        <div class="small">${p.position || '-'}</div>
      </div>
      <div class="player-actions">
        <button class="btn ghost" data-action="edit" data-id="${p.id}">تعديل</button>
        <button class="btn" data-action="view" data-id="${p.id}">سجل</button>
        <button class="btn ghost" data-action="delete" data-id="${p.id}">حذف</button>
      </div>
    `;
    teamListEl.appendChild(li);
  });

  // handlers
  teamListEl.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=> {
      const id = b.dataset.id; const act = b.dataset.action;
      if(act === 'edit') loadPlayerToForm(id);
      if(act === 'delete') { if(confirm('حذف اللاعب؟')) { players = players.filter(x=>x.id!==id); savePlayers(); renderPlayers(); renderSessionsList(); renderStats(); } }
      if(act === 'view') showPlayerRecord(id);
    });
  });
}

function loadPlayerToForm(id){
  const p = players.find(x=>x.id===id);
  if(!p) return;
  inputName.value = p.name; inputNumber.value = p.number || ''; inputPosition.value = p.position || '';
  editingPlayerId = p.id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== Sessions & Attendance =====
const sessionForm = document.getElementById('sessionForm');
const sessionsListEl = document.getElementById('sessionsList');
const attendanceArea = document.getElementById('attendanceArea');
const attendanceGrid = document.getElementById('attendanceGrid');
const attHeader = document.getElementById('attHeader');
const saveAttendanceBtn = document.getElementById('saveAttendance');
const exportSessionCSV = document.getElementById('exportSessionCSV');

sessionForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const date = document.getElementById('sessionDate').value;
  const time = document.getElementById('sessionTime').value || '00:00';
  if(!date) return alert('اختر تاريخ الجلسة');
  const iso = new Date(date + 'T' + time + ':00').toISOString();
  const newS = { id: uid(), dateTime: iso, attendance: {}, attTimes: {} };
  sessions.push(newS);
  saveSessions();
  renderSessionsList();
  renderStats();
});

function renderSessionsList(){
  sessionsListEl.innerHTML = '';
  if(sessions.length === 0){ sessionsListEl.innerHTML = '<div class="small">لا توجد جلسات بعد.</div>'; return; }
  // sort desc
  sessions.slice().sort((a,b)=> new Date(b.dateTime)-new Date(a.dateTime)).forEach(s=>{
    const div = document.createElement('div');
    div.className = 'session-item';
    div.innerHTML = `
      <div><strong>${formatDT(s.dateTime)}</strong><div class="small">${Object.keys(s.attendance||{}).length} سجلات</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" data-act="open" data-id="${s.id}">عرض</button>
        <button class="btn" data-act="markAll" data-id="${s.id}">تبديل الكل</button>
        <button class="btn ghost" data-act="delete" data-id="${s.id}">حذف</button>
      </div>
    `;
    sessionsListEl.appendChild(div);
  });

  // handlers
  sessionsListEl.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=> {
      const id = b.dataset.id; const act = b.dataset.act;
      if(act === 'open'){ openAttendance(id); }
      if(act === 'delete'){ if(confirm('حذف الجلسة؟')) { sessions = sessions.filter(x=>x.id!==id); saveSessions(); renderSessionsList(); renderStats(); attendanceArea.style.display='none'; } }
      if(act === 'markAll'){ toggleAllForSession(id); }
    });
  });
}

function openAttendance(id){
  const s = sessions.find(x=>x.id===id);
  if(!s) return;
  activeSessionId = id;
  attendanceArea.style.display = 'block';
  attHeader.textContent = 'حضور الجلسة — ' + formatDT(s.dateTime);
  renderAttendanceGrid(s);
}

function renderAttendanceGrid(session){
  attendanceGrid.innerHTML = '';
  // show all players with toggles
  players.forEach(p=>{
    const att = session.attendance && session.attendance[p.id];
    const card = document.createElement('div');
    card.className = 'att-card';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="name">${escapeHtml(p.name)}</div>
          <div class="small">${p.position || '-' } • #${p.number||'-'}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button data-p="${p.id}" data-act="present" class="${att===true ? 'toggle-present' : 'btn ghost'}">حاضر</button>
          <button data-p="${p.id}" data-act="absent" class="${att===false ? 'toggle-absent' : 'btn ghost'}">غائب</button>
        </div>
      </div>
      <div class="small" style="margin-top:8px">آخر تحديث: ${session.attTimes && session.attTimes[p.id] ? formatDT(session.attTimes[p.id]) : '-'}</div>
    `;
    attendanceGrid.appendChild(card);
  });

  // attach toggles
  attendanceGrid.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=> {
      const pid = b.dataset.p; const act = b.dataset.act;
      if(act === 'present'){ session.attendance[pid] = true; session.attTimes[pid] = new Date().toISOString(); }
      if(act === 'absent'){ session.attendance[pid] = false; session.attTimes[pid] = new Date().toISOString(); }
      saveSessions();
      renderAttendanceGrid(session);
      renderStats();
    });
  });
}

saveAttendanceBtn.addEventListener('click', ()=>{
  if(!activeSessionId) return alert('اختر جلسة أولاً');
  alert('تم حفظ الحضور محليًا');
});

exportSessionCSV.addEventListener('click', ()=>{
  if(!activeSessionId) return alert('اختر جلسة لتصديرها');
  const s = sessions.find(x=>x.id===activeSessionId);
  if(!s) return;
  const rows = [['جلسة','اسم اللاعب','رقم','مركز','حضور']];
  players.forEach(p=>{
    const att = s.attendance && s.attendance[p.id];
    rows.push([ formatDT(s.dateTime), p.name, p.number||'', p.position||'', att === true ? 'حاضر' : att === false ? 'غائب' : 'لم يسجل' ]);
  });
  downloadCSV(rows, `session_${s.id}.csv`);
});

// toggle all: إذا يوجد لاعب غير حاضر يصبحوا كلهم حاضر، وإلا يمسح حالات
function toggleAllForSession(id){
  const s = sessions.find(x=>x.id===id); if(!s) return;
  const anyNotPresent = players.some(p => s.attendance[p.id] !== true);
  players.forEach(p => {
    if(anyNotPresent){ s.attendance[p.id] = true; s.attTimes[p.id] = new Date().toISOString(); }
    else { delete s.attendance[p.id]; if(s.attTimes) delete s.attTimes[p.id]; }
  });
  saveSessions(); renderSessionsList(); if(activeSessionId === id) renderAttendanceGrid(s); renderStats();
}

// ===== Stats =====
const statPlayersEl = document.getElementById('statPlayers');
const statSessionsEl = document.getElementById('statSessions');
const statAvgEl = document.getElementById('statAvg');
const statTopEl = document.getElementById('statTop');
const statsTableBody = document.querySelector('#statsTable tbody');
const exportAllCSVBtn = document.getElementById('exportAllCSV');

function renderStats(){
  statPlayersEl.textContent = players.length;
  statSessionsEl.textContent = sessions.length;
  // compute per-player attendance
  const perPlayer = players.map(p=>{
    let present = 0, absent = 0;
    sessions.forEach(s=>{
      const att = s.attendance && s.attendance[p.id];
      if(att === true) present++;
      else if(att === false) absent++;
    });
    const totalRecorded = present + absent;
    const perc = sessions.length === 0 ? 0 : Math.round((present / Math.max(1,sessions.length)) * 100);
    return { id: p.id, name: p.name, present, absent, perc };
  });
  // average percentage
  const avg = perPlayer.length === 0 ? 0 : Math.round(perPlayer.reduce((a,b)=>a+b.perc,0)/perPlayer.length);
  statAvgEl.textContent = avg + '%';
  // top attendee
  const top = perPlayer.slice().sort((a,b)=> b.present - a.present)[0];
  statTopEl.textContent = top ? `${top.name} (${top.present})` : '-';

  // table
  statsTableBody.innerHTML = '';
  perPlayer.forEach(p=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(p.name)}</td><td>${p.present}</td><td>${p.absent}</td><td>${p.perc}%</td>`;
    statsTableBody.appendChild(tr);
  });
}

exportAllCSVBtn.addEventListener('click', ()=>{
  const rows = [['جلسة','اسم اللاعب','رقم','مركز','حضور']];
  sessions.forEach(s=>{
    players.forEach(p=>{
      const att = s.attendance && s.attendance[p.id];
      rows.push([ formatDT(s.dateTime), p.name, p.number||'', p.position||'', att === true ? 'حاضر' : att === false ? 'غائب' : 'لم يسجل' ]);
    });
  });
  downloadCSV(rows, 'attendance_all.csv');
});

// ===== Utilities =====
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }

function downloadCSV(rows, filename){
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// ===== Player record view (overlay) =====
function showPlayerRecord(id){
  const p = players.find(x=>x.id===id); if(!p) return;
  // build overlay
  const overlay = document.createElement('div');
  overlay.style.position='fixed'; overlay.style.inset='0'; overlay.style.background='rgba(11,17,30,0.5)';
  overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center'; overlay.style.zIndex=9999;
  const history = sessions.slice().sort((a,b)=> new Date(b.dateTime)-new Date(a.dateTime)).map(s=>{
    const att = s.attendance && s.attendance[p.id];
    return `<li>${formatDT(s.dateTime)} — ${att===true?'<span style="color:green">حاضر</span>':att===false?'<span style="color:#d00">غائب</span>':'<span style="color:#777">لم يُسجل</span>'}</li>`;
  }).join('');
  overlay.innerHTML = `
    <div style="width:90%;max-width:720px;background:white;border-radius:10px;padding:16px;max-height:80vh;overflow:auto">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><h3 style="margin:0">${escapeHtml(p.name)}</h3><div class="small">#${p.number||'-'} • ${p.position||'-'}</div></div>
        <div><button id="closeRec" class="btn ghost">إغلاق</button></div>
      </div>
      <div style="margin-top:12px">
        <strong>سجل الحضور</strong>
        <ul style="margin-top:8px">${history || '<li class="small">لا سجلات بعد</li>'}</ul>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('closeRec').addEventListener('click', ()=> overlay.remove());
}

// ===== CSV helpers & init =====
function init(){
  // load from storage
  players = JSON.parse(localStorage.getItem(KEY_PLAYERS) || '[]');
  sessions = JSON.parse(localStorage.getItem(KEY_SESSIONS) || '[]');
  renderPlayers(); renderSessionsList(); renderStats();
}
init();

// ===== small escape: view player button uses showPlayerRecord declared above in renderPlayers */
