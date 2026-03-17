
window.firebaseHelpers = null;

(async function(){
  if(!window.FIREBASE_ENABLED){ return; }
  try{
    const appMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const fsMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");

    const app = appMod.initializeApp(window.FIREBASE_CONFIG);
    const db = fsMod.getFirestore(app);
    const colName = window.FIREBASE_TASKS_COLLECTION || "hkfo_tasks";
    const colRef = fsMod.collection(db, colName);

    window.firebaseHelpers = {
      async getTasks(){
        const snap = await fsMod.getDocs(fsMod.query(colRef));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a,b)=> new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      },
      async upsertTask(task){
        const id = task.id || crypto.randomUUID();
        const payload = { ...task, id };
        await fsMod.setDoc(fsMod.doc(db, colName, id), payload);
        return payload;
      },
      async deleteTask(id){
        await fsMod.deleteDoc(fsMod.doc(db, colName, id));
      },
      async replaceAllTasks(tasks){
        const current = await this.getTasks();
        for(const t of current){
          await this.deleteTask(t.id);
        }
        for(const t of tasks){
          await this.upsertTask(t);
        }
      },
      subscribe(onChange){
        return fsMod.onSnapshot(fsMod.query(colRef), (snap)=>{
          const tasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a,b)=> new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          onChange(tasks);
        });
      }
    };
  }catch(err){
    console.error("Firebase init error:", err);
  }
})();
