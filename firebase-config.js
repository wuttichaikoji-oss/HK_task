// ใส่ค่า Firebase ของคุณที่นี่
// ถ้ายังไม่ใส่ ระบบจะทำงานแบบ Local Demo Mode อัตโนมัติ

window.FIREBASE_CONFIG = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};

// ชื่อ collection ใน Firestore
window.FIREBASE_TASKS_COLLECTION = "hkfo_tasks";

// เปิด/ปิดการใช้ Firebase
window.FIREBASE_ENABLED = (
  window.FIREBASE_CONFIG &&
  window.FIREBASE_CONFIG.projectId &&
  window.FIREBASE_CONFIG.projectId !== "REPLACE_ME"
);
