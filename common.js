const STORAGE_KEY='multi_dept_local_v1',SESSION_KEY='multi_dept_session_v1',ACTIVE_STATUSES=new Set(['New from FO','In Progress','Done by Department']);
const fmtDate=d=>d?new Date(d).toLocaleString('th-TH'):'-';const uid=()=>Math.random().toString(36).slice(2,10);const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const roleHome=r=>({manager:'manager.html',fo:'fo.html',hk:'hk.html',fb:'fb.html',eng:'eng.html',supervisor_hk:'supervisor-hk.html',supervisor_fb:'supervisor-fb.html',supervisor_eng:'supervisor-eng.html'})[r]||'index.html';
function loadSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}} function saveSession(s){localStorage.setItem(SESSION_KEY,JSON.stringify(s))} function logout(){localStorage.removeItem(SESSION_KEY);location.href='index.html';}
function requireRole(roles){const s=loadSession();if(!s){location.href='index.html';throw new Error('No session')}const a=Array.isArray(roles)?roles:[roles];if(roles&&!a.includes(s.role)){location.href=roleHome(s.role);throw new Error('Wrong role')}return s;}
function taskLocationText(t){return [t.outlet,t.room?'ห้อง '+t.room:'',t.targetDepartment?'แผนก '+t.targetDepartment:''].filter(Boolean).join(' • ')} function statusBadge(t){const label=t.status||t.lifecycleStatus||'-';return `<span class="badge">${escapeHtml(label)}</span>${t.priority==='Urgent'?'<span class="badge urgent">Urgent</span>':''}${t.pushEnabled?'<span class="badge ok">Push</span>':''}`;}
function readFiles(files){return Promise.all([...files].map(f=>new Promise(res=>{const r=new FileReader();r.onload=()=>res({name:f.name,data:r.result});r.readAsDataURL(f)})))} function toast(m){alert(m)}
function setFirebaseStatus(id,state,detail=''){const el=document.getElementById(id);if(!el)return;const map={checking:['กำลังตรวจสอบ Firebase...','badge'],connected:['เชื่อม Firebase สำเร็จ','badge ok'],config_only:['พบ config แล้ว แต่ Firebase ยังไม่พร้อม','badge urgent'],local:['กำลังใช้ Local Mode','badge urgent'],error:['Firebase มีปัญหา','badge urgent']};const item=map[state]||map.error;el.innerHTML=`<span class="${item[1]}">${item[0]}</span>${detail?` <span class="small">${escapeHtml(detail)}</span>`:''}`;}
async function checkFirebaseConnection(){try{if(!window.FIREBASE_ENABLED)return {ok:false,mode:'local',detail:'ยังไม่ได้ใส่ค่า Firebase config ครบ'};let n=0;while((!window.firebaseHelpers||!window.firebaseHelpers.getData)&&n<30){await new Promise(r=>setTimeout(r,200));n++;}if(!window.firebaseHelpers||!window.firebaseHelpers.getData)return {ok:false,mode:'config_only',detail:'โหลด Firebase helper ไม่สำเร็จ'};const d=await window.firebaseHelpers.getData();return {ok:true,mode:'connected',detail:`Tasks: ${(d.tasks||[]).length}, Logs: ${(d.logs||[]).length}`};}catch(err){return {ok:false,mode:'error',detail:err?.message||'เชื่อมต่อไม่ได้'}}}
function isFirebaseReady(){return !!window.FIREBASE_ENABLED&&!!window.firebaseHelpers;}
function loadLocalData(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{"tasks":[],"logs":[],"users":[]}')}catch{return {tasks:[],logs:[],users:[]}}} function saveLocalData(d){localStorage.setItem(STORAGE_KEY,JSON.stringify(d))}
async function getData(){return isFirebaseReady()?await window.firebaseHelpers.getData():loadLocalData()} async function getTasks(){const d=await getData();return d.tasks||[]} async function getLogs(){const d=await getData();return d.logs||[]}
async function updateTask(task){if(isFirebaseReady())return await window.firebaseHelpers.upsertTask(task);const d=loadLocalData();const i=d.tasks.findIndex(x=>x.id===task.id);if(i>=0)d.tasks[i]=task;else d.tasks.unshift(task);saveLocalData(d)}
async function closeTaskToLog(id,closedBy){const d=await getData();const t=(d.tasks||[]).find(x=>x.id===id);if(!t)return;const now=new Date().toISOString();const closed={...t,closedAt:now,closedByFO:closedBy,lifecycleStatus:'Closed by FO',totalMinutes:Math.max(0,Math.round((new Date(now)-new Date(t.createdAt))/60000))};d.tasks=(d.tasks||[]).filter(x=>x.id!==id);d.logs=d.logs||[];d.logs.unshift(closed);if(isFirebaseReady()){await window.firebaseHelpers.deleteTask(id);await window.firebaseHelpers.addLog(closed)} else saveLocalData(d)}
async function ensureUsers(){if(isFirebaseReady()&&window.firebaseHelpers?.ensureDefaultUsers)return await window.firebaseHelpers.ensureDefaultUsers(window.DEFAULT_APP_USERS||[]);const d=loadLocalData();if(!(d.users||[]).length){d.users=(window.DEFAULT_APP_USERS||[]).map(u=>({...u,id:u.code}));saveLocalData(d)}return d.users}
async function getUsers(){if(isFirebaseReady()&&window.firebaseHelpers?.ensureDefaultUsers){await window.firebaseHelpers.ensureDefaultUsers(window.DEFAULT_APP_USERS||[]);return await window.firebaseHelpers.getUsers()}return await ensureUsers()}
async function upsertUser(u){if(isFirebaseReady()&&window.firebaseHelpers?.upsertUser)return await window.firebaseHelpers.upsertUser(u);const d=loadLocalData();d.users=d.users||[];const i=d.users.findIndex(x=>x.code===u.code);if(i>=0)d.users[i]=u;else d.users.unshift(u);saveLocalData(d)} async function deleteUser(code){if(isFirebaseReady()&&window.firebaseHelpers?.deleteUser)return await window.firebaseHelpers.deleteUser(code);const d=loadLocalData();d.users=(d.users||[]).filter(x=>x.code!==code);saveLocalData(d)}
async function login(code){
  let users=[];
  try{ users = await getUsers(); }catch(err){ users = []; }
  if(!users.length) users = (window.DEFAULT_APP_USERS||[]);
  const u=users.find(x=>String(x.code).trim()===String(code).trim());
  if(!u)return false;
  saveSession({name:u.name,role:u.role,code:u.code,department:u.department||'',loginAt:new Date().toISOString()});
  location.href=roleHome(u.role);
  return true;
}
async function seedData(force=false){const d=await getData();if((d.tasks||[]).length&&!force)return;const tasks=[{id:uid(),title:'Room Ready ด่วน',outlet:'Hotel',room:'A105',desc:'แขก early check-in',taskType:'Room Ready',requestedBy:'FO A',assignedBy:'Supervisor HK',targetDepartment:'HK',assignee:'HK A',priority:'Urgent',status:'New from FO',createdAt:new Date().toISOString(),pushEnabled:true,comments:[]},{id:uid(),title:'เตรียม Welcome Drink',outlet:'Lobby',room:'-',desc:'แขก VIP จะเข้ามา',taskType:'Guest Request',requestedBy:'FO A',assignedBy:'Supervisor FB',targetDepartment:'FB',assignee:'FB A',priority:'High',status:'In Progress',createdAt:new Date().toISOString(),startedAt:new Date().toISOString(),pushEnabled:true,comments:[]},{id:uid(),title:'เช็กแอร์ห้อง D308',outlet:'Hotel',room:'D308',desc:'แอร์ไม่เย็น',taskType:'Engineering',requestedBy:'FO A',assignedBy:'Supervisor ENG',targetDepartment:'ENG',assignee:'ENG A',priority:'High',status:'Done by Department',createdAt:new Date().toISOString(),startedAt:new Date().toISOString(),doneAt:new Date().toISOString(),pushEnabled:true,comments:[]}];if(isFirebaseReady()){for(const t of tasks) await window.firebaseHelpers.upsertTask(t)} else {const x=loadLocalData();x.tasks=tasks;x.logs=[];saveLocalData(x)}}
async function renderTaskDetail(id,targetId='taskDetail',source='tasks'){const d=await getData();const arr=source==='logs'?(d.logs||[]):(d.tasks||[]);const t=arr.find(x=>x.id===id);if(!t)return;document.getElementById(targetId).innerHTML=`<h2 style="margin-top:0">${escapeHtml(t.title)}</h2><div class="small">${escapeHtml(taskLocationText(t))}</div><p><strong>รายละเอียด:</strong> ${escapeHtml(t.desc||'-')}</p><p><strong>FO:</strong> ${escapeHtml(t.requestedBy||'-')} • <strong>แผนก:</strong> ${escapeHtml(t.targetDepartment||'-')} • <strong>Assigned by:</strong> ${escapeHtml(t.assignedBy||'-')}</p><p><strong>คนทำงาน:</strong> ${escapeHtml(t.assignee||'-')} • <strong>สถานะ:</strong> ${escapeHtml(t.status||t.lifecycleStatus||'-')}</p><div class="badges">${statusBadge(t)}</div><div>${(t.images||[]).length?(t.images||[]).map(img=>`<img class="preview" src="${img.data}" alt="${escapeHtml(img.name)}">`).join(''):'<div class="small">ยังไม่มีรูป</div>'}</div>`}
async function loadTokenStatus(){if(!isFirebaseReady()||!window.firebaseHelpers?.listDeviceTokens)return {tokens:[],hk:[],fb:[],eng:[],fo:[],manager:[],supervisors:[]};const tokens=await window.firebaseHelpers.listDeviceTokens();return {tokens,hk:tokens.filter(t=>t.role==='hk'&&t.enabled!==false),fb:tokens.filter(t=>t.role==='fb'&&t.enabled!==false),eng:tokens.filter(t=>t.role==='eng'&&t.enabled!==false),fo:tokens.filter(t=>t.role==='fo'&&t.enabled!==false),manager:tokens.filter(t=>t.role==='manager'&&t.enabled!==false),supervisors:tokens.filter(t=>String(t.role||'').startsWith('supervisor_')&&t.enabled!==false)}}
function renderTokenRows(tokens){if(!tokens?.length)return '<div class="small">ยังไม่มีเครื่องที่ลงทะเบียน</div>';return tokens.map(t=>`<div class="token-row"><div><strong>${escapeHtml(t.userName||'ไม่ระบุชื่อ')}</strong> <span class="small">(${escapeHtml(t.role||'-')})</span></div><div class="small">อัปเดตล่าสุด: ${fmtDate(t.updatedAt)}</div></div>`).join('')}
async function enableNotificationsForCurrentUser(session,elId){try{if(!isFirebaseReady())throw new Error('ยังไม่ได้เชื่อม Firebase');setFirebaseStatus(elId,'checking','กำลังเปิดการแจ้งเตือน...');await window.firebaseHelpers.registerDeviceToken(session);const fb=await checkFirebaseConnection();if(fb.ok)setFirebaseStatus(elId,'connected',fb.detail+' • เปิดแจ้งเตือนแล้ว');else setFirebaseStatus(elId,'connected','เปิดแจ้งเตือนแล้ว');alert('เปิดแจ้งเตือนสำเร็จ')}catch(err){setFirebaseStatus(elId,'error',err?.message||'เปิดแจ้งเตือนไม่สำเร็จ');alert('เปิดแจ้งเตือนไม่สำเร็จ: '+(err?.message||'unknown'))}}
let __lastSeenTaskIds=new Set();function initializeSeenTasks(tasks){__lastSeenTaskIds=new Set((tasks||[]).map(t=>t.id))} function vibrateNewTask(){try{if(navigator.vibrate)navigator.vibrate([200,100,200,100,200,100,200,100,200])}catch(e){}} function vibrateStatusUpdate(){try{if(navigator.vibrate)navigator.vibrate([200,100,200])}catch(e){}} function alertForNewTasks(tasks){const ids=new Set((tasks||[]).map(t=>t.id));let hasNew=false;for(const t of (tasks||[])){if(!__lastSeenTaskIds.has(t.id)){hasNew=true;break}} if(hasNew)vibrateNewTask();__lastSeenTaskIds=ids}

let __currentPopupTaskId = null;
function departmentPopupClass(dep){
  if(dep === 'HK') return 'popup-dept-hk';
  if(dep === 'FB') return 'popup-dept-fb';
  if(dep === 'ENG') return 'popup-dept-eng';
  return '';
}
function openDeptPopup(task, targetPage){
  __currentPopupTaskId = task.id;
  const box = document.getElementById('deptPopup');
  const inner = document.getElementById('deptPopupInner');
  if(!box || !inner) return;
  inner.className = 'popup-card ' + departmentPopupClass(task.targetDepartment);
  document.getElementById('popupTitle').textContent = 'มีงานใหม่เข้าแผนก ' + (task.targetDepartment || '-');
  document.getElementById('popupRoom').textContent = task.room ? ('ห้อง ' + task.room) : (task.outlet || '-');
  document.getElementById('popupTaskName').textContent = task.title || '-';
  document.getElementById('popupMeta').textContent = 'FO: ' + (task.requestedBy || '-') + ' • Priority: ' + (task.priority || '-') + ' • Assigned by: ' + (task.assignedBy || '-');
  const viewBtn = document.getElementById('popupViewBtn');
  if(viewBtn){
    viewBtn.onclick = function(){
      closeDeptPopup();
      if(targetPage){
        location.href = targetPage + '?focus=' + encodeURIComponent(task.id);
      }
    };
  }
  box.classList.add('show');
}
function closeDeptPopup(){
  const box = document.getElementById('deptPopup');
  if(box) box.classList.remove('show');
}
function popupMarkup(){
  return `
  <div class="popup-backdrop" id="deptPopup">
    <div class="popup-card" id="deptPopupInner">
      <div class="popup-title" id="popupTitle">มีงานใหม่</div>
      <div class="popup-room" id="popupRoom">-</div>
      <div><strong id="popupTaskName">-</strong></div>
      <div class="popup-meta" id="popupMeta">-</div>
      <div class="popup-actions">
        <button class="good" id="popupViewBtn" type="button">ดูงาน</button>
        <button class="ghost" type="button" onclick="closeDeptPopup()">ปิด</button>
      </div>
    </div>
  </div>`;
}

function roleLabel(role){
  return {fo:'FO',hk:'HK',fb:'FB',eng:'ENG',supervisor_hk:'Supervisor HK',supervisor_fb:'Supervisor FB',supervisor_eng:'Supervisor ENG',manager:'Manager'}[role] || role || '-';
}
async function getUsersSnapshot(){ return await getUsers(); }
async function findUserByCode(code){ const users = await getUsers(); return users.find(u=>String(u.code)===String(code)); }
async function createOrUpdateUser(user){ await upsertUser(user); return user; }
async function ensureUsersReady(){ return await ensureUsers(); }
