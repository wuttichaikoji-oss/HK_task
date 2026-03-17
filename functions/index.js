
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
initializeApp();
export const pushTaskUpdates = onDocumentWritten("hkfo_tasks_v17/{taskId}", async (event) => {
  const after = event.data.after.exists ? event.data.after.data() : null;
  const before = event.data.before.exists ? event.data.before.data() : null;
  if (!after || after.pushEnabled === false) return;
  const db = getFirestore();
  const tokenSnap = await db.collection("device_tokens").get();
  const tokens = tokenSnap.docs.map(d => d.id).filter(Boolean);
  if (!tokens.length) return;
  let title = "มีงานใหม่ในบอร์ด";
  let body = `${after.title || "งานใหม่"} • ${after.room || ""}`;
  if (before && after.status !== before.status) { title = "อัปเดตสถานะงาน"; body = `${after.title || "งาน"} → ${after.status || ""}`; }
  else if (before) { title = "มีการอัปเดตงาน"; body = `${after.title || "งาน"} ถูกแก้ไขข้อมูล`; }
  await getMessaging().sendEachForMulticast({ tokens, notification: { title, body }, webpush: { notification: { title, body, icon: "/icon-192.png" } } });
});
