import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getFirestore, collection, addDoc, doc, updateDoc, onSnapshot, query,
  orderBy, serverTimestamp, arrayUnion
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js';
import {
  getMessaging, getToken, onMessage, isSupported
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging.js';
import { firebaseSettings } from './firebase-config.js';

const statusOrder = ['New', 'Assigned', 'In Progress', 'Waiting Approval', 'Approved', 'Rework'];
const els = {
  loginView: document.getElementById('loginView'),
  appView: document.getElementById('appView'),
  loginName: document.getElementById('loginName'),
  loginRole: document.getElementById('loginRole'),
  loginOutlet: document.getElementById('loginOutlet'),
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  openCreateTaskBtn: document.getElementById('openCreateTaskBtn'),
  taskDialog: document.getElementById('taskDialog'),
  detailDialog: document.getElementById('detailDialog'),
  closeTaskDialog: document.getElementById('closeTaskDialog'),
  closeDetailDialog: document.getElementById('closeDetailDialog'),
  cancelTaskBtn: document.getElementById('cancelTaskBtn'),
  taskForm: document.getElementById('taskForm'),
  enableNotiBtn: document.getElementById('enableNotiBtn'),
  installBtn: document.getElementById('installBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  currentUserLabel: document.getElementById('currentUserLabel'),
  currentRoleLabel: document.getElementById('currentRoleLabel'),
  searchInput: document.getElementById('searchInput'),
  filterOutlet: document.getElementById('filterOutlet'),
  filterPriority: document.getElementById('filterPriority'),
  filterMine: document.getElementById('filterMine'),
  detailTitle: document.getElementById('detailTitle'),
  detailBody: document.getElementById('detailBody'),
  statNew: document.getElementById('statNew'),
  statProgress: document.getElementById('statProgress'),
  statReview: document.getElementById('statReview'),
  statApproved: document.getElementById('statApproved')
};

const state = {
  user: JSON.parse(localStorage.getItem('layaTaskUser') || 'null'),
  tasks: [],
  previousTaskIds: new Set(JSON.parse(localStorage.getItem('seenTaskIds') || '[]')),
  selectedTask: null,
  deferredPrompt: null,
  app: null,
  db: null,
  storage: null,
  messaging: null,
  listenersReady: false
};

function canUseFirebase() {
  return firebaseSettings.projectId && firebaseSettings.projectId !== 'REPLACE_ME';
}

function initFirebase() {
  if (!canUseFirebase()) {
    showConfigMessage();
    return false;
  }
  state.app = initializeApp(firebaseSettings);
  state.db = getFirestore(state.app);
  state.storage = getStorage(state.app);
  return true;
}

function showConfigMessage() {
  const msg = document.createElement('div');
  msg.className = 'card';
  msg.style.padding = '14px';
  msg.style.marginBottom = '12px';
  msg.innerHTML = `
    <strong>ยังไม่ได้ตั้งค่า Firebase</strong>
    <div class="small">ให้เปิดไฟล์ <code>firebase-config.js</code> แล้วใส่ค่าจาก Firebase ก่อน ระบบเรียลไทม์และอัปโหลดรูปจึงจะใช้งานได้</div>
  `;
  document.querySelector('main').prepend(msg);
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (error) {
      console.error('SW registration failed', error);
    }
  }
}

function saveUser(user) {
  state.user = user;
  localStorage.setItem('layaTaskUser', JSON.stringify(user));
  renderAuth();
}

function renderAuth() {
  const loggedIn = !!state.user;
  els.loginView.classList.toggle('hidden', loggedIn);
  els.appView.classList.toggle('hidden', !loggedIn);
  els.logoutBtn.classList.toggle('hidden', !loggedIn);
  if (loggedIn) {
    els.currentUserLabel.textContent = `${state.user.name} • ${state.user.outlet}`;
    els.currentRoleLabel.textContent = state.user.role.toUpperCase();
  }
}

function notify(title, body) {
  try {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: './icons/icon-192.png' });
    }
  } catch (error) {
    console.error(error);
  }
  const audioCtx = window.AudioContext || window.webkitAudioContext;
  if (audioCtx) {
    const ctx = new audioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.04;
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 160);
  }
}

async function enableNotifications() {
  if (!('Notification' in window)) return alert('เบราว์เซอร์นี้ไม่รองรับ Notification');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return alert('ยังไม่ได้อนุญาตการแจ้งเตือน');
  alert('เปิดแจ้งเตือนแล้ว');

  if (canUseFirebase() && await isSupported()) {
    try {
      state.messaging = getMessaging(state.app);
      const token = await getToken(state.messaging, {
        vapidKey: firebaseSettings.vapidKey,
        serviceWorkerRegistration: await navigator.serviceWorker.ready
      });
      if (token && state.user) {
        const userRef = doc(state.db, 'users', slugify(state.user.name));
        await updateDoc(userRef, { tokens: arrayUnion(token), updatedAt: serverTimestamp() }).catch(async () => {
          // if user doc missing we create minimal user doc using set via add fallback impossible with doc+update
        });
      }
      onMessage(state.messaging, (payload) => {
        const note = payload.notification || {};
        notify(note.title || 'มีอัปเดตงาน', note.body || 'โปรดตรวจสอบในแอพ');
      });
    } catch (error) {
      console.warn('FCM optional setup error', error);
    }
  }
}

function slugify(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9ก-๙-_]/g, '');
}

function dueText(value) {
  if (!value) return 'ไม่กำหนดเวลา';
  const date = value.toDate ? value.toDate() : new Date(value);
  const overdue = date.getTime() < Date.now();
  return `${date.toLocaleString('th-TH')} ${overdue ? '• เกินเวลา' : ''}`;
}

function badgePriority(priority) {
  return `<span class="pill priority-${priority}">${priority}</span>`;
}

function escapeHtml(text = '') {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function filterTasks(tasks) {
  const search = els.searchInput.value.trim().toLowerCase();
  const outlet = els.filterOutlet.value;
  const priority = els.filterPriority.value;
  const mine = els.filterMine.value;
  return tasks.filter((task) => {
    if (outlet && task.outlet !== outlet) return false;
    if (priority && task.priority !== priority) return false;
    if (mine === 'mine' && state.user && !(task.assignedTo || []).includes(state.user.name)) return false;
    if (!search) return true;
    const hay = [task.title, task.description, task.area, task.outlet, ...(task.assignedTo || [])].join(' ').toLowerCase();
    return hay.includes(search);
  });
}

function renderStats(tasks) {
  els.statNew.textContent = tasks.filter(t => t.status === 'New' || t.status === 'Assigned').length;
  els.statProgress.textContent = tasks.filter(t => t.status === 'In Progress').length;
  els.statReview.textContent = tasks.filter(t => t.status === 'Waiting Approval').length;
  els.statApproved.textContent = tasks.filter(t => t.status === 'Approved').length;
}

function renderBoard() {
  const tasks = filterTasks(state.tasks);
  renderStats(tasks);
  statusOrder.forEach(status => {
    const col = document.getElementById(`col${status.replace(/\s/g, '')}`);
    const counter = document.getElementById(`count${status.replace(/\s/g, '')}`);
    const list = tasks.filter(task => task.status === status);
    counter.textContent = String(list.length);
    col.innerHTML = list.map(task => {
      const assigned = (task.assignedTo || []).join(', ') || '-';
      const due = task.dueAt ? dueText(task.dueAt) : 'ไม่กำหนดเวลา';
      return `
        <article class="task-card" data-id="${task.id}">
          <h4>${escapeHtml(task.title)}</h4>
          <div class="pill-row">
            ${badgePriority(task.priority)}
            <span class="pill">${escapeHtml(task.outlet)}</span>
          </div>
          <div class="task-meta">
            <span>ผู้รับผิดชอบ: ${escapeHtml(assigned)}</span>
            <span>โซน: ${escapeHtml(task.area || '-')}</span>
          </div>
          <div class="task-footer">
            <span class="${due.includes('เกินเวลา') ? 'overdue' : ''}">กำหนด: ${escapeHtml(due)}</span>
            <span>โดย ${escapeHtml(task.createdBy || '-')}</span>
          </div>
        </article>
      `;
    }).join('') || '<div class="small">ไม่มีงานในสถานะนี้</div>';
  });

  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('click', () => openTaskDetail(card.dataset.id));
  });
}

async function createTask(evt) {
  evt.preventDefault();
  if (!state.db) return alert('ยังไม่ได้ตั้งค่า Firebase');
  const payload = {
    title: document.getElementById('taskTitle').value.trim(),
    outlet: document.getElementById('taskOutlet').value,
    area: document.getElementById('taskArea').value.trim(),
    priority: document.getElementById('taskPriority').value,
    dueAt: document.getElementById('taskDueAt').value ? new Date(document.getElementById('taskDueAt').value) : null,
    description: document.getElementById('taskDescription').value.trim(),
    assignedTo: document.getElementById('taskAssignedTo').value.split(',').map(v => v.trim()).filter(Boolean),
    status: 'New',
    createdBy: state.user?.name || 'Unknown',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    proofImages: [],
    comments: []
  };
  await addDoc(collection(state.db, 'tasks'), payload);
  els.taskForm.reset();
  els.taskDialog.close();
  notify('สร้างงานใหม่', payload.title);
}

function userCanApprove() {
  return ['admin', 'supervisor'].includes(state.user?.role);
}

function userCanCreate() {
  return ['admin', 'supervisor'].includes(state.user?.role);
}

async function changeStatus(taskId, newStatus) {
  const taskRef = doc(state.db, 'tasks', taskId);
  await updateDoc(taskRef, {
    status: newStatus,
    updatedAt: serverTimestamp(),
    updatedBy: state.user?.name || 'Unknown'
  });
  notify('อัปเดตงาน', `เปลี่ยนสถานะเป็น ${newStatus}`);
}

async function addComment(taskId, message) {
  if (!message.trim()) return;
  const taskRef = doc(state.db, 'tasks', taskId);
  const task = state.tasks.find(t => t.id === taskId);
  const comments = task.comments || [];
  comments.push({
    by: state.user?.name || 'Unknown',
    role: state.user?.role || 'staff',
    message: message.trim(),
    at: new Date().toISOString()
  });
  await updateDoc(taskRef, { comments, updatedAt: serverTimestamp() });
}

async function uploadProof(taskId, file) {
  if (!file || !state.storage) return;
  const fileRef = ref(state.storage, `tasks/${taskId}/${Date.now()}-${file.name}`);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  const taskRef = doc(state.db, 'tasks', taskId);
  const task = state.tasks.find(t => t.id === taskId);
  const proofImages = task.proofImages || [];
  proofImages.push({
    url,
    name: file.name,
    uploadedBy: state.user?.name || 'Unknown',
    uploadedAt: new Date().toISOString()
  });
  await updateDoc(taskRef, { proofImages, updatedAt: serverTimestamp() });
  notify('อัปโหลดรูปสำเร็จ', file.name);
}

function actionButtons(task) {
  const mine = (task.assignedTo || []).includes(state.user?.name);
  const buttons = [];
  if (task.status === 'New' && mine) buttons.push(`<button class="primary" data-action="Assigned">รับงาน</button>`);
  if ((task.status === 'Assigned' || task.status === 'Rework') && mine) buttons.push(`<button class="primary" data-action="In Progress">เริ่มงาน</button>`);
  if (task.status === 'In Progress' && mine) buttons.push(`<button class="primary" data-action="Waiting Approval">ส่งตรวจ</button>`);
  if (task.status === 'Waiting Approval' && userCanApprove()) {
    buttons.push(`<button class="primary" data-action="Approved">Approve</button>`);
    buttons.push(`<button class="danger" data-action="Rework">Reject / Rework</button>`);
  }
  if (task.status === 'New' && userCanApprove()) buttons.push(`<button class="ghost" data-action="Assigned">Mark Assigned</button>`);
  return buttons.join('');
}

function openTaskDetail(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  state.selectedTask = task;
  els.detailTitle.textContent = task.title;
  const comments = (task.comments || []).map(c => `
    <div class="comment-item">
      <strong>${escapeHtml(c.by)}</strong>
      <div>${escapeHtml(c.message)}</div>
      <div class="small">${new Date(c.at).toLocaleString('th-TH')}</div>
    </div>
  `).join('') || '<div class="small">ยังไม่มีคอมเมนต์</div>';
  const proofs = (task.proofImages || []).map(p => `
    <div class="proof-item">
      <img src="${p.url}" alt="proof" />
      <div class="small">${escapeHtml(p.uploadedBy || '-')}</div>
    </div>
  `).join('') || '<div class="small">ยังไม่มีรูปผลงาน</div>';

  els.detailBody.innerHTML = `
    <div class="detail-grid">
      <section class="detail-section">
        <strong>รายละเอียดงาน</strong>
        <div class="small">Outlet: ${escapeHtml(task.outlet)}</div>
        <div class="small">พื้นที่: ${escapeHtml(task.area || '-')}</div>
        <div class="small">สถานะ: ${escapeHtml(task.status)}</div>
        <div class="small">ความสำคัญ: ${escapeHtml(task.priority)}</div>
        <div class="small">ผู้รับผิดชอบ: ${escapeHtml((task.assignedTo || []).join(', ') || '-')}</div>
        <div class="small">กำหนดเสร็จ: ${escapeHtml(dueText(task.dueAt))}</div>
        <hr />
        <div>${escapeHtml(task.description || '-')}</div>
      </section>
      <section class="detail-section">
        <strong>การดำเนินการ</strong>
        <div class="actions-grid">${actionButtons(task)}</div>
        <div class="upload-box" style="margin-top:12px;">
          <label><span>อัปโหลดรูปผลงาน</span><input id="proofInput" type="file" accept="image/*" capture="environment" /></label>
        </div>
        <div class="comment-box" style="margin-top:12px;">
          <textarea id="commentText" rows="3" placeholder="พิมพ์อัปเดต / เหตุผล / หมายเหตุ"></textarea>
          <button id="addCommentBtn" class="ghost">เพิ่มคอมเมนต์</button>
        </div>
      </section>
    </div>
    <section class="detail-section">
      <strong>รูปผลงาน</strong>
      <div class="proof-list">${proofs}</div>
    </section>
    <section class="detail-section">
      <strong>คอมเมนต์</strong>
      <div class="comments-list">${comments}</div>
    </section>
  `;

  els.detailDialog.showModal();
  els.detailBody.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await changeStatus(taskId, btn.dataset.action);
      els.detailDialog.close();
    });
  });
  document.getElementById('addCommentBtn').addEventListener('click', async () => {
    const text = document.getElementById('commentText').value;
    await addComment(taskId, text);
    openTaskDetail(taskId);
  });
  document.getElementById('proofInput').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadProof(taskId, file);
    openTaskDetail(taskId);
  });
}

function attachBoardListeners() {
  [els.searchInput, els.filterOutlet, els.filterPriority, els.filterMine].forEach(el => {
    el.addEventListener('input', renderBoard);
    el.addEventListener('change', renderBoard);
  });
}

function listenTasks() {
  if (!state.db || state.listenersReady) return;
  state.listenersReady = true;
  const q = query(collection(state.db, 'tasks'), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    state.tasks = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    const currentIds = new Set(state.tasks.map(t => t.id));
    state.tasks.forEach(task => {
      if (!state.previousTaskIds.has(task.id) && task.createdBy !== state.user?.name) {
        notify('มีงานใหม่ในบอร์ด', task.title);
      }
    });
    state.previousTaskIds = currentIds;
    localStorage.setItem('seenTaskIds', JSON.stringify([...currentIds]));
    renderBoard();
  }, (error) => {
    console.error(error);
    alert('อ่านข้อมูลงานไม่สำเร็จ กรุณาตรวจสอบ Firebase Rules และค่า config');
  });
}

function bindEvents() {
  els.loginBtn.addEventListener('click', () => {
    const name = els.loginName.value.trim();
    if (!name) return alert('กรุณาใส่ชื่อผู้ใช้งาน');
    saveUser({ name, role: els.loginRole.value, outlet: els.loginOutlet.value });
    if (state.db) listenTasks();
  });
  els.logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('layaTaskUser');
    state.user = null;
    renderAuth();
  });
  els.openCreateTaskBtn.addEventListener('click', () => {
    if (!userCanCreate()) return alert('สิทธิ์นี้ไม่สามารถสร้างงานได้');
    els.taskDialog.showModal();
  });
  els.closeTaskDialog.addEventListener('click', () => els.taskDialog.close());
  els.cancelTaskBtn.addEventListener('click', () => els.taskDialog.close());
  els.closeDetailDialog.addEventListener('click', () => els.detailDialog.close());
  els.taskForm.addEventListener('submit', createTask);
  els.enableNotiBtn.addEventListener('click', enableNotifications);
  els.refreshBtn.addEventListener('click', renderBoard);
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  state.deferredPrompt = e;
  els.installBtn.classList.remove('hidden');
});

els.installBtn.addEventListener('click', async () => {
  if (!state.deferredPrompt) return;
  state.deferredPrompt.prompt();
  await state.deferredPrompt.userChoice;
  state.deferredPrompt = null;
  els.installBtn.classList.add('hidden');
});

async function init() {
  await registerServiceWorker();
  initFirebase();
  bindEvents();
  attachBoardListeners();
  renderAuth();
  if (state.user && state.db) listenTasks();
}

init();
