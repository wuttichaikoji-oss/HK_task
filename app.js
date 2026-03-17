const STORAGE_KEY = 'hkfo_tasks_v1_3';
const STATUSES = ['New', 'Assigned', 'In Progress', 'Waiting Approval', 'Approved', 'Rework'];
let deferredPrompt = null;

const $ = (id) => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2, 10);
const nowIsoLocal = () => new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);

function loadTasks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveTasks(tasks) { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
function statusColor(priority) { return priority === 'Urgent' ? 'badge urgent' : 'badge'; }
function isOverdue(task) {
  return task.dueAt && !['Approved'].includes(task.status) && new Date(task.dueAt).getTime() < Date.now();
}
function readFiles(files) {
  return Promise.all([...files].map(f => new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve({ name: f.name, data: r.result });
    r.readAsDataURL(f);
  })));
}

async function addTask(e) {
  e.preventDefault();
  const images = await readFiles($('imageInput').files);
  const task = {
    id: uid(),
    title: $('title').value.trim(),
    room: $('room').value.trim(),
    desc: $('desc').value.trim(),
    department: $('department').value,
    taskType: $('taskType').value,
    assignee: $('assignee').value.trim(),
    priority: $('priority').value,
    dueAt: $('dueAt').value,
    roomStatus: $('roomStatus').value,
    status: 'New',
    images,
    comments: [],
    createdAt: new Date().toISOString()
  };
  const tasks = loadTasks();
  tasks.unshift(task);
  saveTasks(tasks);
  e.target.reset();
  $('dueAt').value = nowIsoLocal();
  render();
  notify(`มีงานใหม่: ${task.title}`);
}

function nextStatus(current) {
  const map = {
    'New': 'Assigned',
    'Assigned': 'In Progress',
    'In Progress': 'Waiting Approval',
    'Waiting Approval': 'Approved',
    'Approved': 'Approved',
    'Rework': 'In Progress'
  };
  return map[current] || current;
}

function updateStatus(id, status) {
  const tasks = loadTasks();
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.status = status || nextStatus(t.status);
  saveTasks(tasks);
  render();
  notify(`อัปเดตงาน: ${t.title} → ${t.status}`);
}
function removeTask(id) {
  const tasks = loadTasks().filter(t => t.id !== id);
  saveTasks(tasks);
  render();
}
function addComment(id) {
  const msg = prompt('ใส่คอมเมนต์');
  if (!msg) return;
  const tasks = loadTasks();
  const t = tasks.find(x => x.id === id);
  t.comments.push({ at: new Date().toISOString(), text: msg });
  saveTasks(tasks);
  render();
}

function filteredTasks() {
  const q = $('search').value.trim().toLowerCase();
  const fs = $('filterStatus').value;
  const fd = $('filterDept').value;
  return loadTasks().filter(t => {
    const hit = !q || [t.title,t.room,t.assignee,t.desc].join(' ').toLowerCase().includes(q);
    const hitS = !fs || t.status === fs;
    const hitD = !fd || t.department === fd;
    return hit && hitS && hitD;
  });
}

function taskCard(t) {
  const overdue = isOverdue(t) ? '<span class="badge urgent">Overdue</span>' : '';
  const roomStatus = t.roomStatus ? `<span class="badge">${t.roomStatus}</span>` : '';
  const room = t.room ? `<div class="meta">ห้อง/พื้นที่: ${t.room}</div>` : '';
  const due = t.dueAt ? `<div class="meta">กำหนด: ${new Date(t.dueAt).toLocaleString('th-TH')}</div>` : '';
  return `
    <article class="task">
      <h4>${escapeHtml(t.title)}</h4>
      ${room}
      <div class="meta">ผู้รับผิดชอบ: ${escapeHtml(t.assignee || '-')}</div>
      <div class="meta">แผนก: ${escapeHtml(t.department)} • ${escapeHtml(t.taskType)}</div>
      ${due}
      <div class="badges">
        <span class="${statusColor(t.priority)}">${t.priority}</span>
        <span class="badge">${t.status}</span>
        ${roomStatus}
        ${overdue}
      </div>
      <div class="actions">
        <button onclick="showDetail('${t.id}')">ดู</button>
        <button onclick="updateStatus('${t.id}')">เลื่อนสถานะ</button>
        <button onclick="updateStatus('${t.id}','Approved')">ผ่าน</button>
        <button onclick="updateStatus('${t.id}','Rework')">ตีกลับ</button>
        <button onclick="addComment('${t.id}')">คอมเมนต์</button>
        <button onclick="removeTask('${t.id}')">ลบ</button>
      </div>
    </article>`;
}

function renderBoard(tasks) {
  $('boardView').innerHTML = STATUSES.map(status => {
    const items = tasks.filter(t => t.status === status);
    return `<section class="column"><h3>${status} <span class="count">(${items.length})</span></h3>${items.map(taskCard).join('') || '<div class="meta">ไม่มีงาน</div>'}</section>`;
  }).join('');
}
function renderList(tasks) {
  $('listView').innerHTML = tasks.map(taskCard).join('') || '<div class="card panel">ไม่มีงานตามตัวกรอง</div>';
}
function renderStats(tasks) {
  $('statAll').textContent = tasks.length;
  $('statNew').textContent = tasks.filter(t => t.status === 'New').length;
  $('statProg').textContent = tasks.filter(t => t.status === 'In Progress').length;
  $('statWait').textContent = tasks.filter(t => t.status === 'Waiting Approval').length;
  $('statDone').textContent = tasks.filter(t => t.status === 'Approved').length;
  $('statOver').textContent = tasks.filter(isOverdue).length;
}
function render() {
  const tasks = filteredTasks();
  renderStats(loadTasks());
  renderBoard(tasks);
  renderList(tasks);
  const mode = $('viewMode').value;
  $('boardView').classList.toggle('hidden', mode !== 'board');
  $('listView').classList.toggle('hidden', mode !== 'list');
}
function showDetail(id) {
  const t = loadTasks().find(x => x.id === id);
  if (!t) return;
  $('taskDetail').innerHTML = `
    <h2>${escapeHtml(t.title)}</h2>
    <p><strong>ห้อง/พื้นที่:</strong> ${escapeHtml(t.room || '-')}</p>
    <p><strong>รายละเอียด:</strong> ${escapeHtml(t.desc || '-')}</p>
    <p><strong>แผนก:</strong> ${escapeHtml(t.department)}</p>
    <p><strong>ผู้รับผิดชอบ:</strong> ${escapeHtml(t.assignee || '-')}</p>
    <p><strong>ประเภทงาน:</strong> ${escapeHtml(t.taskType)}</p>
    <p><strong>สถานะ:</strong> ${escapeHtml(t.status)}</p>
    <p><strong>สถานะห้อง:</strong> ${escapeHtml(t.roomStatus || '-')}</p>
    <p><strong>กำหนดเสร็จ:</strong> ${t.dueAt ? new Date(t.dueAt).toLocaleString('th-TH') : '-'}</p>
    <h3>รูปภาพ</h3>
    <div>${t.images.length ? t.images.map(img => `<img src="${img.data}" alt="${escapeHtml(img.name)}" />`).join('') : '<p>-</p>'}</div>
    <h3>คอมเมนต์</h3>
    <div>${t.comments.length ? t.comments.map(c => `<p>• ${escapeHtml(c.text)} <small>${new Date(c.at).toLocaleString('th-TH')}</small></p>`).join('') : '<p>-</p>'}</div>
  `;
  $('taskDialog').showModal();
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
function seedData() {
  const demo = [
    { title:'ห้อง A105 ทำความสะอาดด่วน', room:'A105', desc:'ลูกค้า early arrival, ขอเร่งห้องให้พร้อมขาย', department:'Housekeeping x Front Office', taskType:'Room Ready', assignee:'HK Floor A / FO AM', priority:'Urgent', dueAt:nowIsoLocal(), roomStatus:'Vacant Dirty', status:'Assigned' },
    { title:'อัปเดต Room Status C212', room:'C212', desc:'HK แจ้งทำเสร็จแล้ว ให้ FO เปลี่ยนเป็น Vacant Clean', department:'Housekeeping x Front Office', taskType:'Room Status Update', assignee:'FO PM', priority:'High', dueAt:nowIsoLocal(), roomStatus:'Vacant Clean', status:'Waiting Approval' },
    { title:'Guest Request เพิ่มผ้าเช็ดตัว D308', room:'D308', desc:'FO รับคำขอจากแขก ส่งต่อแม่บ้านนำผ้าไปเพิ่ม', department:'Housekeeping', taskType:'Guest Request', assignee:'HK Runner', priority:'High', dueAt:nowIsoLocal(), roomStatus:'Occupied', status:'In Progress' },
    { title:'ตรวจ Lost & Found ห้อง B120', room:'B120', desc:'แขกแจ้งลืมสายชาร์จ ให้ HK ค้นหาและอัปเดต FO', department:'Housekeeping x Front Office', taskType:'Lost & Found', assignee:'HK Supervisor / FO Desk', priority:'Medium', dueAt:nowIsoLocal(), roomStatus:'Vacant Clean', status:'New' }
  ].map(t => ({ id:uid(), images:[], comments:[], createdAt:new Date().toISOString(), ...t }));
  saveTasks(demo);
  render();
}
function clearAll() {
  if (!confirm('ล้างข้อมูลทั้งหมด?')) return;
  localStorage.removeItem(STORAGE_KEY);
  render();
}
function notify(message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('HK x FO Board', { body: message });
  }
}
async function requestNotify() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

$('taskForm').addEventListener('submit', addTask);
['search','filterStatus','filterDept','viewMode'].forEach(id => $(id).addEventListener('input', render));
$('seedBtn').addEventListener('click', seedData);
$('clearBtn').addEventListener('click', clearAll);
$('dueAt').value = nowIsoLocal();

window.updateStatus = updateStatus;
window.removeTask = removeTask;
window.addComment = addComment;
window.showDetail = showDetail;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $('installBtn').classList.remove('hidden');
});
$('installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt = null;
  $('installBtn').classList.add('hidden');
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
requestNotify();
render();
