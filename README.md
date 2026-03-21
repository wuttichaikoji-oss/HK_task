# Laya Multi Department Task App v1.0

ระบบใหม่แยกออกจาก HK Task เดิม เพื่อเก็บ HK Task เดิมเป็น backup

## Roles
- Manager
- FO
- HK
- FB
- ENG
- Supervisor HK
- Supervisor FB
- Supervisor ENG

## Flow
- FO เปิดงานและเลือกแผนกปลายทาง HK / FB / ENG
- Supervisor ของแต่ละแผนก assign งานภายในแผนกตัวเอง
- แผนกปลายทางทำงานแบบเดียวกับ HK เดิม
- FO ปิดงานแล้วงานจะย้ายไป LOG

## Pages
- manager.html
- fo.html
- hk.html
- fb.html
- eng.html
- supervisor-hk.html
- supervisor-fb.html
- supervisor-eng.html
- board.html
- log.html

## Firebase Collections
- multi_dept_tasks_v1
- multi_dept_logs_v1
- multi_dept_users_v1
- device_tokens

## Firestore Rules ที่ต้องมีเพิ่ม
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /multi_dept_tasks_v1/{document} { allow read, write: if true; }
    match /multi_dept_logs_v1/{document} { allow read, write: if true; }
    match /multi_dept_users_v1/{document} { allow read, write: if true; }
    match /device_tokens/{document} { allow read, write: if true; }
  }
}

## Default Login
- FO A = 1001
- HK A = 2001
- FB A = 3001
- ENG A = 4001
- Supervisor HK = 9100
- Supervisor FB = 9200
- Supervisor ENG = 9300
- Manager = 9900


## อัปเดต v1.1
- เพิ่ม popup แจ้งเตือนแยกตามแผนก
  - HK เห็น popup ของ HK เท่านั้น
  - FB เห็น popup ของ FB เท่านั้น
  - ENG เห็น popup ของ ENG เท่านั้น
- popup จะแสดงเมื่อมีงานใหม่ `New from FO`
- มีปุ่ม `ดูงาน` และ `ปิด`


## อัปเดต v1.2
- ปรับหน้า Supervisor HK / FB / ENG ให้ใช้ layout แนวเดียวกับไฟล์ supervisor ที่ผู้ใช้อัปโหลด fileciteturn1file0
- Supervisor แต่ละแผนกสร้างรหัสทีมตัวเองและ assign งานในแผนกตัวเองได้
- ปรับ fallback การล็อกอินให้ Manager code `9900` เข้าได้ง่ายขึ้น
