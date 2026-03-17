# Laya Task Board MVP

เว็บแอพสำหรับสั่งงานพนักงานห้องอาหาร ใช้ได้ทั้งมือถือและคอมพิวเตอร์ในโปรเจกต์เดียว

## ฟีเจอร์ในเวอร์ชันนี้
- Login แบบง่ายด้วยชื่อ + role
- Board รวมงาน 6 สถานะ
- สร้างงานและระบุผู้รับผิดชอบ
- ดูงานของตัวเอง / กรองตาม outlet / priority
- พนักงานรับงาน เริ่มงาน ส่งตรวจ
- หัวหน้ากด Approve / Rework
- อัปโหลดรูปผลงานไป Firebase Storage
- คอมเมนต์ในงาน
- PWA ติดตั้งลงมือถือได้
- Browser notification และเสียงแจ้งเตือนในแอพ

## ข้อสำคัญ
เพื่อให้ระบบข้ามหลายเครื่องและอัปโหลดรูปได้จริง ต้องตั้งค่า Firebase ก่อน

## วิธีตั้งค่าอย่างย่อ
1. สร้างโปรเจกต์ใน Firebase Console
2. เปิด Firestore Database
3. เปิด Storage
4. เปิด Hosting (ถ้าต้องการ)
5. คัดลอก `firebase-config.example.js` เป็น `firebase-config.js`
6. ใส่ค่า config จริงจาก Firebase
7. Deploy ขึ้น Firebase Hosting หรือ GitHub Pages (กรณี GitHub Pages ฟีเจอร์บางอย่างเกี่ยวกับ notification อาจต้องเพิ่มการตั้งค่าเพิ่ม)

## Firestore suggested rules (MVP only)
> ใช้สำหรับทดสอบก่อน ควรปรับเพิ่มความปลอดภัยก่อนใช้งานจริง

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Storage suggested rules (MVP only)
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

## แนะนำสำหรับเวอร์ชันถัดไป
- ผูก Firebase Auth จริง
- เพิ่มรายชื่อพนักงานเป็น master data
- ส่ง push notification แบบ background ด้วย FCM + Cloud Functions
- เพิ่ม recurring tasks / KPI dashboard / export report
