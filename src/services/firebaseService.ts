import {
  getFirestore,
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
  writeBatch,
  query,
  where,
  increment,
  orderBy, // <-- เพิ่มเข้ามา
  limit,   // <-- เพิ่มเข้ามา
  startAfter, // <-- เพิ่มเข้ามา
  type QueryDocumentSnapshot, // <-- เพิ่มเข้ามา
} from 'firebase/firestore';
import { db } from '../config/firebase';

// --- Type Definitions (ไม่มีการเปลี่ยนแปลง) ---
export type QuestionType = 'multiple_choice_single' | 'multiple_choice_multiple' | 'true_false' | 'fill_in_blank';
export interface FirebaseDepartment { id: string; name: string; }
export interface FirebaseQuizSet { id?: string; name: string; description: string; isActive: boolean; timeLimit: number; questionCount: number; createdAt: Date | Timestamp; instantFeedback?: boolean; }
export interface FirebaseQuestion { id?: string; setId: string; type: QuestionType; text: string; imageUrl?: string; options?: string[]; correctAnswer: string | string[]; correctCount: number; incorrectCount: number; createdAt: Date | Timestamp; }
export interface FirebaseScore { id?: string; userId: string; userName: string; department: string; setId: string; setName: string; score: number; totalQuestions: number; percentage: number; userAnswers: Record<string, any>; questionOrder?: string[]; cheatAttempts?: number; penaltyPoints?: number; timestamp: Date | Timestamp; }

export interface UserProfile {
  uid: string;
  name: string;
  department: string;
  email: string;
  role: 'admin' | 'user';
}


// --- Helper Function (ไม่มีการเปลี่ยนแปลง) ---
export const convertTimestamps = <T extends { createdAt?: any; timestamp?: any }>(item: T): T => {
  const newItem = { ...item };
  if (item.createdAt instanceof Timestamp) { newItem.createdAt = item.createdAt.toDate(); }
  if (item.timestamp instanceof Timestamp) { newItem.timestamp = item.timestamp.toDate(); }
  return newItem;
};

// --- Generic Service Factory (อัปเดตส่วนนี้) ---
const createService = <T extends { id?: string }>(collectionName: string) => {
  const collectionRef = collection(db, collectionName);
  return {
    // ฟังก์ชันเดิมสำหรับดึงข้อมูลทั้งหมด ยังคงเก็บไว้ใช้กับข้อมูลที่ไม่เยอะ
    async getAll(): Promise<T[]> {
      const snapshot = await getDocs(collectionRef);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
    },

    // --- ฟังก์ชันใหม่สำหรับ Pagination ---
    async getPaginated(
        orderByField: string,
        limitCount: number,
        startAfterDoc: QueryDocumentSnapshot | null = null
    ): Promise<{ data: T[]; lastVisible: QueryDocumentSnapshot | null }> {
        // สร้าง query เริ่มต้น
        let q = query(
            collectionRef,
            orderBy(orderByField, 'desc'),
            limit(limitCount)
        );

        // ถ้ามีการระบุเอกสารตัวเริ่ม (สำหรับการโหลดหน้า 2 เป็นต้นไป) ให้เพิ่ม startAfter เข้าไปใน query
        if (startAfterDoc) {
            q = query(q, startAfter(startAfterDoc));
        }

        const documentSnapshots = await getDocs(q);

        // ดึงข้อมูลจาก snapshot
        const data = documentSnapshots.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
        } as T));

        // เก็บเอกสารตัวสุดท้ายของหน้านี้ไว้ เพื่อใช้เป็น "ตัวชี้" ในการโหลดหน้าถัดไป
        const lastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1] || null;

        return { data, lastVisible };
    },

    async update(id: string, updates: Partial<T>): Promise<void> {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, updates as any);
    },
    async delete(id: string): Promise<void> {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    },
  };
};

// --- Services (ไม่มีการเปลี่ยนแปลง) ---
// Service ต่างๆ ที่สร้างจาก createService จะได้รับฟังก์ชัน getPaginated ไปใช้โดยอัตโนมัติ
export const departmentsService = {
    ...createService<FirebaseDepartment>('departments'),
    async add(data: Omit<FirebaseDepartment, 'id'>): Promise<string> {
        return (await addDoc(collection(db, 'departments'), data)).id;
    }
};

export const usersService = {
    // User service ไม่ได้ใช้ createService จึงไม่ได้รับผลกระทบ
    async getAll(): Promise<UserProfile[]> {
        const collectionRef = collection(db, 'users');
        const snapshot = await getDocs(collectionRef);
        return snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
    },
    async update(uid: string, updates: Partial<UserProfile>): Promise<void> {
        const docRef = doc(db, 'users', uid);
        await updateDoc(docRef, updates);
    },
    async delete(uid: string): Promise<void> {
        const docRef = doc(db, 'users', uid);
        await deleteDoc(docRef);
    }
};

export const quizSetsService = {
  ...createService<FirebaseQuizSet>('quizSets'),
  async add(data: Omit<FirebaseQuizSet, 'id' | 'createdAt' | 'questionCount'>): Promise<string> {
    const collectionRef = collection(db, 'quizSets');
    const docRef = await addDoc(collectionRef, { ...data, questionCount: 0, createdAt: serverTimestamp() });
    return docRef.id;
  },
  async delete(id: string): Promise<void> {
    const batch = writeBatch(db);
    const setRef = doc(db, 'quizSets', id);
    batch.delete(setRef);
    const q = query(collection(db, 'questions'), where('setId', '==', id));
    const questionsSnapshot = await getDocs(q);
    questionsSnapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  },
};

export const questionsService = {
  ...createService<FirebaseQuestion>('questions'),
  async add(data: Omit<FirebaseQuestion, 'id' | 'createdAt' | 'correctCount' | 'incorrectCount'>): Promise<string> {
    const collectionRef = collection(db, 'questions');
    const docRef = await addDoc(collectionRef, {
      ...data,
      correctCount: 0,
      incorrectCount: 0,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },
  async addMultiple(questions: Omit<FirebaseQuestion, 'id' | 'createdAt' | 'correctCount' | 'incorrectCount'>[]): Promise<void> {
    const batch = writeBatch(db);
    const collectionRef = collection(db, 'questions');
    questions.forEach(question => {
        const docRef = doc(collectionRef);
        batch.set(docRef, {
            ...question,
            correctCount: 0,
            incorrectCount: 0,
            createdAt: serverTimestamp(),
        });
    });
    await batch.commit();
  },
  async updateStats(id: string, isCorrect: boolean): Promise<void> {
    const questionRef = doc(db, 'questions', id);
    await updateDoc(questionRef, {
      [isCorrect ? 'correctCount' : 'incorrectCount']: increment(1),
    });
  },
  async deleteMultiple(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const batch = writeBatch(db);
    ids.forEach(id => {
      const docRef = doc(db, 'questions', id);
      batch.delete(docRef);
    });
    await batch.commit();
  },
};

export const scoresService = {
  ...createService<FirebaseScore>('scores'),
  async add(data: Omit<FirebaseScore, 'id' | 'timestamp'>): Promise<string> {
    const collectionRef = collection(db, 'scores');
    const docRef = await addDoc(collectionRef, { ...data, timestamp: serverTimestamp() });
    return docRef.id;
  },
};