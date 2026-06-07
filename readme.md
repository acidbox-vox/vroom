# 🏛️ Virtual Room — Firebase Edition

Multiplayer virtual room ที่ deploy บน **Netlify** ได้เลย ไม่ต้อง server

## ⚡ วิธี Deploy (ทำครั้งเดียว ~10 นาที)

---

### ขั้นที่ 1 — สร้าง Firebase Project

1. ไปที่ https://console.firebase.google.com
2. กด **"Add project"** → ตั้งชื่อ เช่น `virtual-room`
3. ปิด Google Analytics (ไม่จำเป็น) → กด **Create project**

---

### ขั้นที่ 2 — เปิด Realtime Database

1. เมนูซ้าย → **Build → Realtime Database**
2. กด **Create Database**
3. เลือก Location: **asia-southeast1 (Singapore)**
4. เลือก **"Start in test mode"** → กด Enable

---

### ขั้นที่ 3 — ตั้ง Security Rules

1. ไปที่ **Realtime Database → Rules**
2. ลบทุกอย่างออก แล้ว copy เนื้อหาจากไฟล์ `database.rules.json` วางแทน
3. กด **Publish**

---

### ขั้นที่ 4 — รับ Firebase Config

1. Project Overview → กดไอคอน **`</>`** (Web App)
2. ตั้งชื่อ App เช่น `virtual-room-web` → กด **Register app**
3. จะเห็นโค้ดแบบนี้:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "virtual-room-xxx.firebaseapp.com",
  databaseURL: "https://virtual-room-xxx-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "virtual-room-xxx",
  ...
};
```

4. Copy ค่าเหล่านี้ไปใส่ในไฟล์ **`js/config.js`**

---

### ขั้นที่ 5 — แก้ config.js

เปิดไฟล์ `js/config.js` แล้วแก้:

```js
export const FIREBASE_CONFIG = {
  apiKey:            "AIza...",          // ← วางค่าจริงตรงนี้
  authDomain:        "your-app.firebaseapp.com",
  databaseURL:       "https://your-app-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "your-app",
  storageBucket:     "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123...",
};
```

---

### ขั้นที่ 6 — Deploy บน Netlify

**วิธี A — Drag & Drop (ง่ายที่สุด)**

1. ไปที่ https://app.netlify.com
2. ลาก folder `virtual-room-firebase` ทั้ง folder ทิ้งลงใน Netlify
3. รอ 1 นาที → ได้ URL เลย ✅

**วิธี B — GitHub (แนะนำ)**

1. Push ขึ้น GitHub repo
2. Netlify → **Add new site → Import from Git**
3. เลือก repo → **Build command: (ว่าง)** → **Publish directory: `.`**
4. กด Deploy

---

## 📁 โครงสร้างไฟล์

```
virtual-room-firebase/
├── index.html              ← หน้าหลัก
├── netlify.toml            ← Netlify config
├── database.rules.json     ← Firebase Rules (copy ไปวางใน console)
├── css/
│   └── style.css
└── js/
    ├── config.js           ← ✏️ แก้ Firebase config ที่นี่
    ├── firebase.js         ← Firebase wrapper (แทน Socket.IO)
    ├── game.js             ← Phaser 3 + Firebase integration
    ├── player.js           ← LocalPlayer + RemotePlayer
    ├── chat.js             ← Chat system
    ├── ui.js               ← UI helpers
    └── objects.js          ← ✏️ เพิ่มวัตถุในห้องที่นี่
```

---

## ➕ เพิ่มวัตถุในห้อง

แก้ไฟล์ `js/objects.js`:

```js
{
  id: "myObject",
  name: "ชื่อวัตถุ",
  description: "คำอธิบาย",
  icon: "📌",
  x: 500, y: 400,
  width: 64, height: 48,
  actionType: "url",          // url | modal | image | pdf | text
  actionValue: "https://...",
}
```

---

## 🐛 แก้ปัญหาที่พบบ่อย

| ปัญหา | วิธีแก้ |
|-------|---------|
| เข้าห้องไม่ได้ | ตรวจสอบ `databaseURL` ใน config.js ต้องตรงกับ region |
| เห็นแค่ตัวเอง | ตรวจ Firebase Rules ว่า publish แล้ว |
| Firebase Error 401 | ตรวจสอบ `apiKey` ใน config.js |
| Deploy Netlify แล้วหน้าว่าง | ตรวจว่า `publish directory` = `.` |
