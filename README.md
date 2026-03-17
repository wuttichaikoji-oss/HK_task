
# Housekeeping × Front Office Task App v1.6

เวอร์ชันนี้เพิ่ม:
- รองรับ Firebase Firestore แบบ Realtime
- ถ้ายังไม่ใส่ค่า Firebase จะทำงานแบบ Local Demo Mode อัตโนมัติ
- แก้รายชื่อและรหัสพนักงานได้ในไฟล์ `users-config.js`
- พนักงานเห็นเฉพาะบอร์ดรวม + หน้าส่งงานของตัวเอง
- หัวหน้าเข้า `supervisor.html` เพื่อสร้างและ assign งานได้

## ไฟล์สำคัญ
- `index.html` = หน้าเข้าสู่ระบบ
- `board.html` = บอร์ดรวม
- `staff.html` = หน้าพนักงาน
- `supervisor.html` = หน้าหัวหน้า
- `users-config.js` = แก้ชื่อและรหัสพนักงาน
- `firebase-config.js` = ใส่ค่า Firebase
- `firebase-helpers.js` = ตัวช่วยเชื่อม Firestore

## วิธีเปิด Firebase
1. สร้าง Firebase Project
2. เปิด Firestore Database
3. เอาค่า config มาใส่ใน `firebase-config.js`
4. Deploy ขึ้น Firebase Hosting หรือ Web Server

## หมายเหตุ
- เวอร์ชันนี้ใช้ Firestore สำหรับ sync งานข้ามเครื่องแบบ realtime
- การแจ้งเตือนทุกเครื่องแบบ push notification เต็มระบบยังไม่ได้เปิดใน v1.6
  ถ้าต้องการ ต้องทำ v1.7 ด้วย Firebase Cloud Messaging (FCM)
