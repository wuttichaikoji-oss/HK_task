
window.firebaseHelpers = null;
(async function(){
  if(!window.FIREBASE_ENABLED) return;
  try{
    const appMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const fsMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
    const msgMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging.js");
    const app = appMod.initializeApp(window.FIREBASE_CONFIG);
    const db = fsMod.getFirestore(app);
    const colName = window.FIREBASE_TASKS_COLLECTION || "hkfo_tasks_v17";
    const tokenCol = window.FIREBASE_DEVICE_TOKENS_COLLECTION || "device_tokens";
    const colRef = fsMod.collection(db, colName);
    let messaging = null; try { messaging = msgMod.getMessaging(app); } catch (e) {}
    window.firebaseHelpers = {
      async getTasks(){const snap=await fsMod.getDocs(fsMod.query(colRef));return snap.docs.map(doc=>({id:doc.id,...doc.data()})).sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));},
      async upsertTask(task){const id=task.id||crypto.randomUUID();const payload={...task,id,updatedAt:new Date().toISOString()};await fsMod.setDoc(fsMod.doc(db,colName,id),payload);return payload;},
      async deleteTask(id){await fsMod.deleteDoc(fsMod.doc(db,colName,id));},
      async replaceAllTasks(tasks){const current=await this.getTasks();for(const t of current)await this.deleteTask(t.id);for(const t of tasks)await this.upsertTask(t);},
      subscribe(onChange){return fsMod.onSnapshot(fsMod.query(colRef),(snap)=>{const tasks=snap.docs.map(doc=>({id:doc.id,...doc.data()})).sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));onChange(tasks);});},
      async registerDeviceToken(session){
        if(!messaging) throw new Error("Messaging unavailable");
        if(!window.FIREBASE_VAPID_KEY || window.FIREBASE_VAPID_KEY === 'REPLACE_ME') throw new Error("ยังไม่ได้ใส่ VAPID key");
        const permission = await Notification.requestPermission();
        if(permission !== 'granted') throw new Error("ผู้ใช้ยังไม่อนุญาต notification");
        const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const token = await msgMod.getToken(messaging,{vapidKey:window.FIREBASE_VAPID_KEY,serviceWorkerRegistration:swReg});
        if(!token) throw new Error("ไม่สามารถสร้าง token ได้");
        await fsMod.setDoc(fsMod.doc(db,tokenCol,token),{token,userName:session?.name||'',role:session?.role||'',department:session?.department||'',updatedAt:new Date().toISOString(),userAgent:navigator.userAgent});
        msgMod.onMessage(messaging,payload=>{const title=payload?.notification?.title||'มีอัปเดตงานใหม่';const body=payload?.notification?.body||'';if(Notification.permission==='granted'){new Notification(title,{body});}});
        return token;
      }
    };
  }catch(err){console.error("Firebase init error:", err);}
})();
