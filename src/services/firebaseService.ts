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
  orderBy,
  limit,
  startAfter,
  getDoc,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// --- Type Definitions ---
export type QuestionType = 'multiple_choice_single' | 'multiple_choice_multiple' | 'true_false' | 'fill_in_blank';
export interface FirebaseDepartment { id: string; name: string; }

export interface FirebaseQuizSet { 
  id?: string; 
  name: string; 
  description: string; 
  isActive: boolean; 
  timeLimit: number; 
  questionCount: number; 
  createdAt: Date | Timestamp; 
  instantFeedback?: boolean; 
  isSurvey?: boolean; // --- MODIFIED ---: เพิ่ม field นี้
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
  points?: number; // --- MODIFIED ---: เพิ่ม field นี้
}

export interface FirebaseScore { id?: string; userId: string; userName: string; department: string; setId: string; setName: string; score: number; totalQuestions: number; percentage: number; userAnswers: Record<string, any>; questionOrder?: string[]; cheatAttempts?: number; penaltyPoints?: number; timestamp: Date | Timestamp; }
export interface UserProfile { uid: string; name: string; department: string; email: string; role: 'admin' | 'user';}
export const convertTimestamps = <T extends { createdAt?: any; timestamp?: any }>(item: T): T => {
  const newItem = { ...item };
  if (item.createdAt instanceof Timestamp) { newItem.createdAt = item.createdAt.toDate(); }
  if (item.timestamp instanceof Timestamp) { newItem.timestamp = item.timestamp.toDate(); }
  return newItem;
};

const createService = <T extends { id?: string }>(collectionName: string) => {
  const collectionRef = collection(db, collectionName);
  return {
    async getAll(): Promise<T[]> {
      const snapshot = await getDocs(collectionRef);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
    },
    async getPaginated(orderByField: string, limitCount: number, startAfterDoc: QueryDocumentSnapshot | null = null): Promise<{ data: T[]; lastVisible: QueryDocumentSnapshot | null }> {
        let q = query(collectionRef, orderBy(orderByField, 'desc'), limit(limitCount));
        if (startAfterDoc) {
            q = query(q, startAfter(startAfterDoc));
        }
        const documentSnapshots = await getDocs(q);
        const data = documentSnapshots.docs.map(doc => ({ ...doc.data(), id: doc.id, } as T));
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

export const departmentsService = {
    ...createService<FirebaseDepartment>('departments'),
    async add(data: Omit<FirebaseDepartment, 'id'>): Promise<string> {
        return (await addDoc(collection(db, 'departments'), data)).id;
    }
};
export const usersService = {
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
  async getAllBySetId(setId: string): Promise<FirebaseQuestion[]> {
    const q = query(collection(db, 'questions'), where('setId', '==', setId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as FirebaseQuestion));
  },
  async add(data: Omit<FirebaseQuestion, 'id' | 'createdAt' | 'correctCount' | 'incorrectCount'>): Promise<string> {
    const batch = writeBatch(db);
    const questionRef = doc(collection(db, 'questions'));
    batch.set(questionRef, { ...data, correctCount: 0, incorrectCount: 0, createdAt: serverTimestamp(), });
    const quizSetRef = doc(db, 'quizSets', data.setId);
    batch.update(quizSetRef, { questionCount: increment(1) });
    await batch.commit();
    return questionRef.id;
  },
  async addMultiple(questions: Omit<FirebaseQuestion, 'id' | 'createdAt' | 'correctCount' | 'incorrectCount'>[]): Promise<void> {
    const batch = writeBatch(db);
    const collectionRef = collection(db, 'questions');
    const countsToUpdate: { [setId: string]: number } = {};
    questions.forEach(question => {
        const docRef = doc(collectionRef);
        batch.set(docRef, { ...question, correctCount: 0, incorrectCount: 0, createdAt: serverTimestamp(), });
        if (!countsToUpdate[question.setId]) {
          countsToUpdate[question.setId] = 0;
        }
        countsToUpdate[question.setId]++;
    });
    for (const setId in countsToUpdate) {
      const quizSetRef = doc(db, 'quizSets', setId);
      batch.update(quizSetRef, { questionCount: increment(countsToUpdate[setId]) });
    }
    await batch.commit();
  },
  async deleteSingle(question: FirebaseQuestion): Promise<void> {
    const batch = writeBatch(db);
    const questionRef = doc(db, 'questions', question.id!);
    batch.delete(questionRef);
    const quizSetRef = doc(db, 'quizSets', question.setId);
    batch.update(quizSetRef, { questionCount: increment(-1) });
    await batch.commit();
  },
  async deleteMultiple(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const batch = writeBatch(db);
    const countsToUpdate: { [setId: string]: number } = {};
    const questionsToDelete = await Promise.all(
      ids.map(id => getDoc(doc(db, 'questions', id)))
    );
    questionsToDelete.forEach(docSnap => {
      if (docSnap.exists()) {
        const question = docSnap.data() as FirebaseQuestion;
        if (!countsToUpdate[question.setId]) {
          countsToUpdate[question.setId] = 0;
        }
        countsToUpdate[question.setId]--;
        batch.delete(docSnap.ref);
      }
    });
    for (const setId in countsToUpdate) {
      const quizSetRef = doc(db, 'quizSets', setId);
      batch.update(quizSetRef, { questionCount: increment(countsToUpdate[setId]) });
    }
    await batch.commit();
  },
  async updateStats(id: string, isCorrect: boolean): Promise<void> {
    const questionRef = doc(db, 'questions', id);
    await updateDoc(questionRef, { [isCorrect ? 'correctCount' : 'incorrectCount']: increment(1), });
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