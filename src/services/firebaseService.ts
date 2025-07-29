import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
  writeBatch,
  query,
  where,
  increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// --- Type Definitions ---

export type QuestionType = 'mcq-s' | 'mcq-m' | 'tf' | 'fib';

export interface FirebaseDepartment {
  id: string;
  name: string;
}

export interface FirebaseQuizSet {
  id?: string;
  name: string;
  description: string;
  isActive: boolean;
  timeLimit: number;
  questionCount: number;
  createdAt: Date | Timestamp;
}

export interface FirebaseQuestion {
  id?: string;
  setId: string;
  type: QuestionType;
  text: string;
  imageUrl?: string;
  options?: string[];
  correctAnswer: string | string[];
  correctCount: number;
  incorrectCount: number;
  createdAt: Date | Timestamp;
}

export interface FirebaseScore {
  id?: string;
  userId: string;
  userName: string;
  department: string;
  setId: string;
  setName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  userAnswers: Record<string, any>;
  questionOrder?: string[];
  cheatAttempts?: number;
  penaltyPoints?: number;
  timestamp: Date | Timestamp;
}

// --- Helper Function ---
export const convertTimestamps = <T extends { createdAt?: any; timestamp?: any }>(item: T): T => {
  const newItem = { ...item };
  if (item.createdAt instanceof Timestamp) {
    newItem.createdAt = item.createdAt.toDate();
  }
  if (item.timestamp instanceof Timestamp) {
    newItem.timestamp = item.timestamp.toDate();
  }
  return newItem;
};

// --- Generic Service Factory ---
const createService = <T extends { id?: string }>(collectionName: string) => {
  const collectionRef = collection(db, collectionName);

  return {
    async getAll(): Promise<T[]> {
      const snapshot = await getDocs(collectionRef);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
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

// --- Services ---
export const departmentsService = {
    ...createService<FirebaseDepartment>('departments'),
    async add(data: Omit<FirebaseDepartment, 'id'>): Promise<string> {
        return (await addDoc(collection(db, 'departments'), data)).id;
    }
};

export const usersService = {
    async update(uid: string, updates: any) {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, updates);
    },
    async delete(uid: string) {
        const userRef = doc(db, 'users', uid);
        await deleteDoc(userRef);
    }
};

// --- Custom Services for Complex Types ---

export const quizSetsService = {
  ...createService<FirebaseQuizSet>('quizSets'), // <-- แก้ไขแล้ว
  async add(data: Omit<FirebaseQuizSet, 'id' | 'createdAt' | 'questionCount'>): Promise<string> {
    const collectionRef = collection(db, 'quizSets'); // <-- แก้ไขแล้ว
    const docRef = await addDoc(collectionRef, {
      ...data,
      questionCount: 0,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },
  async delete(id: string): Promise<void> {
    const batch = writeBatch(db);
    const setRef = doc(db, 'quizSets', id); // <-- แก้ไขแล้ว
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
  async updateStats(id: string, isCorrect: boolean): Promise<void> {
    const questionRef = doc(db, 'questions', id);
    await updateDoc(questionRef, {
      [isCorrect ? 'correctCount' : 'incorrectCount']: increment(1),
    });
  },
};

export const scoresService = {
  ...createService<FirebaseScore>('scores'),
  async add(data: Omit<FirebaseScore, 'id' | 'timestamp'>): Promise<string> {
    const collectionRef = collection(db, 'scores');
    const docRef = await addDoc(collectionRef, {
      ...data,
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  },
};