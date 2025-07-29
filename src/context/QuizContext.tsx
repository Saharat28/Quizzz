import React, { 
  createContext, 
  useContext, 
  ReactNode, 
  useMemo 
} from 'react';
import { useFirebaseData } from '../hooks/useFirebaseData';
import type { FirebaseDepartment, FirebaseQuizSet, FirebaseQuestion, FirebaseScore } from '../services/firebaseService';

interface QuizContextType {
  loading: boolean;
  error: string | null;
  departments: FirebaseDepartment[];
  quizSets: FirebaseQuizSet[];
  questions: FirebaseQuestion[];
  scores: FirebaseScore[];
  addDepartment: (department: Omit<FirebaseDepartment, 'id'>) => Promise<string>;
  updateDepartment: (id: string, updates: Partial<FirebaseDepartment>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  addQuizSet: (quizSet: Omit<FirebaseQuizSet, 'id' | 'createdAt' | 'questionCount'>) => Promise<string>;
  updateQuizSet: (id: string, updates: Partial<FirebaseQuizSet>) => Promise<void>;
  deleteQuizSet: (id: string) => Promise<void>;
  addQuestion: (question: Omit<FirebaseQuestion, 'id' | 'createdAt' | 'correctCount' | 'incorrectCount'>) => Promise<string>;
  updateQuestion: (id: string, updates: Partial<FirebaseQuestion>) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;
  updateQuestionStats: (id: string, isCorrect: boolean) => Promise<void>;
  addScore: (score: Omit<FirebaseScore, 'id' | 'timestamp'>) => Promise<string | void>; // Updated return type
  deleteScore: (id: string) => Promise<void>;
  getQuestionsBySetId: (setId: string) => FirebaseQuestion[];
  getScoresBySetId: (setId: string) => FirebaseScore[];
  refreshData: () => Promise<void>;
  updateUserProfile: (uid: string, updates: Partial<{name: string, department: string, role: 'admin' | 'user'}>) => Promise<void>;
  deleteUser: (uid: string) => Promise<void>;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export const QuizProvider = ({ children }: { children: ReactNode }) => {
  const firebaseData = useFirebaseData();
  const value = useMemo(() => ({ ...firebaseData }), [firebaseData]);
  
  return (
    <QuizContext.Provider value={value}>
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
