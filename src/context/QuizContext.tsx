import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo
} from 'react';
import { useFirebaseData } from '../hooks/useFirebaseData';
import type { FirebaseDepartment, FirebaseQuizSet, FirebaseQuestion, FirebaseScore, UserProfile } from '../services/firebaseService';
import type { QueryDocumentSnapshot } from 'firebase/firestore';

interface PaginatedData<T> {
  data: T[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
}

interface QuizContextType {
  loading: boolean;
  error: string | null;
  departments: FirebaseDepartment[];
  quizSets: FirebaseQuizSet[];
  questionsPaginated: PaginatedData<FirebaseQuestion>;
  fetchMoreQuestions: () => Promise<void>;
  fetchInitialQuestions: () => Promise<void>;
  scores: FirebaseScore[];
  users: UserProfile[];
  addDepartment: (department: Omit<FirebaseDepartment, 'id'>) => Promise<string>;
  updateDepartment: (id: string, updates: Partial<FirebaseDepartment>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  addQuizSet: (quizSet: Omit<FirebaseQuizSet, 'id' | 'createdAt' | 'questionCount'>) => Promise<string>;
  updateQuizSet: (id: string, updates: Partial<FirebaseQuizSet>) => Promise<void>;
  deleteQuizSet: (id: string) => Promise<void>;
  addQuestion: (question: Omit<FirebaseQuestion, 'id' | 'createdAt' | 'correctCount' | 'incorrectCount'>) => Promise<string>;
  addMultipleQuestions: (questions: Omit<FirebaseQuestion, 'id' | 'createdAt' | 'correctCount' | 'incorrectCount'>[]) => Promise<void>;
  updateQuestion: (id: string, updates: Partial<FirebaseQuestion>) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;
  deleteMultipleQuestions: (ids: string[]) => Promise<void>;
  updateQuestionStats: (id: string, isCorrect: boolean) => Promise<void>;
  addScore: (score: Omit<FirebaseScore, 'id' | 'timestamp'>) => Promise<string | void>;
  deleteScore: (id: string) => Promise<void>; // This type definition is crucial
  getQuestionsBySetId: (setId: string) => FirebaseQuestion[];
  getScoresBySetId: (setId: string) => FirebaseScore[];
  refreshData: () => Promise<void>;
  updateUserProfile: (uid: string, updates: Partial<UserProfile>) => Promise<void>;
  deleteUser: (uid: string) => Promise<void>;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export const QuizProvider = ({ children }: { children: ReactNode }) => {
  const firebaseData = useFirebaseData();
  const value = useMemo(() => ({ ...firebaseData }), [firebaseData]);
  
  return (
    <QuizContext.Provider value={value as QuizContextType}>
      {children}
    </QuizContext.Provider>
  );
};

export const useQuizContext = () => {
  const context = useContext(QuizContext);
  if (context === undefined) {
    throw new Error('useQuizContext must be used within a QuizProvider');
  }
  return context;
};