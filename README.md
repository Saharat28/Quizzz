# ระบบคลังข้อสอบออนไลน์

ระบบจัดการและทำข้อสอบออนไลน์ที่ใช้ React + TypeScript + Firebase

## การติดตั้งและใช้งาน

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Firebase

#### 2.1 สร้าง Firebase Project
1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. คลิก "Create a project" หรือ "เพิ่มโปรเจ็กต์"
3. ตั้งชื่อโปรเจ็กต์ เช่น "quiz-system"
4. เลือกการตั้งค่าตามต้องการ

#### 2.2 เปิดใช้งาน Firestore Database
1. ในเมนูด้านซ้าย เลือก "Firestore Database"
2. คลิก "Create database"
3. เลือก "Start in test mode" (สำหรับการพัฒนา)
4. เลือก location ที่ใกล้ที่สุด

#### 2.3 ตั้งค่า Web App
1. ในหน้า Project Overview คลิกไอคอน "</>" เพื่อเพิ่ม Web app
2. ตั้งชื่อ App เช่น "quiz-web"
3. คัดลอก Firebase configuration

#### 2.4 ตั้งค่า Environment Variables
1. คัดลอกไฟล์ `.env.example` เป็น `.env`
2. ใส่ค่า Firebase configuration ที่ได้จากขั้นตอนก่อนหน้า

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
```

### 3. ตั้งค่า Firestore Security Rules

ในหน้า Firestore Database > Rules ให้ใส่ rules ดังนี้:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // อนุญาตให้อ่านและเขียนได้ทั้งหมด (สำหรับการพัฒนา)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**หมายเหตุ**: สำหรับการใช้งานจริง ควรตั้งค่า Security Rules ให้เข้มงวดมากขึ้น

### 4. รันโปรเจ็กต์
```bash
npm run dev
```

## โครงสร้างฐานข้อมูล Firebase

### Collections

#### 1. `quizSets` - ชุดข้อสอบ
```typescript
{
  id: string,
  name: string,
  description: string,
  questionCount: number,
  createdAt: Timestamp,
  isActive: boolean
}
```

#### 2. `questions` - คำถาม
```typescript
{
  id: string,
  question: string,
  options: {
    A: string,
    B: string,
    C: string,
    D: string
  },
  correctAnswer: 'A' | 'B' | 'C' | 'D',
  correctCount: number,
  incorrectCount: number,
  setId: string,
  createdAt: Timestamp
}
```

#### 3. `scores` - คะแนน
```typescript
{
  id: string,
  name: string,
  score: number,
  totalQuestions: number,
  percentage: number,
  timestamp: Timestamp,
  setId: string,
  setName: string
}
```

## คุณสมบัติหลัก

- ✅ จัดการชุดข้อสอบ (เพิ่ม/แก้ไข/ลบ)
- ✅ จัดการคำถาม (เพิ่ม/แก้ไข/ลบ)
- ✅ ระบบทำข้อสอบแบบ Real-time
- ✅ ระบบคะแนนและ Leaderboard
- ✅ สถิติการตอบคำถาม
- ✅ การนำเข้าข้อสอบจากไฟล์ Excel
- ✅ Responsive Design
- ✅ Firebase Firestore Integration

## การ Deploy

### Netlify
1. Build โปรเจ็กต์: `npm run build`
2. Upload โฟลเดอร์ `dist` ไปยัง Netlify
3. ตั้งค่า Environment Variables ใน Netlify

### Firebase Hosting
1. ติดตั้ง Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Init: `firebase init hosting`
4. Build: `npm run build`
5. Deploy: `firebase deploy`

## การพัฒนาต่อ

### เพิ่มระบบ Authentication
```bash
# เพิ่ม Firebase Auth
# แก้ไขไฟล์ src/config/firebase.ts
# เพิ่ม Auth components
```

### เพิ่มระบบ Real-time Updates
```bash
# ใช้ onSnapshot แทน getDocs
# เพิ่ม real-time listeners
```

### เพิ่มระบบ File Upload
```bash
# เพิ่ม Firebase Storage
# อัพโหลดรูปภาพสำหรับคำถาม
```

## การแก้ไขปัญหา

### ปัญหาการเชื่อมต่อ Firebase
1. ตรวจสอบ Environment Variables
2. ตรวจสอบ Firebase Configuration
3. ตรวจสอบ Network Connection

### ปัญหา Permission Denied
1. ตรวจสอบ Firestore Security Rules
2. ตรวจสอบ Firebase Project Settings

## License

MIT License