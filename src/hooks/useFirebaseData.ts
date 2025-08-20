import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  departmentsService,
  quizSetsService,
  questionsService,
  scoresService,
  usersService,
  convertTimestamps,
  type FirebaseDepartment,
  type FirebaseQuizSet,
  type FirebaseQuestion,
  type FirebaseScore,
  type UserProfile,
} from '../services/firebaseService';
import type { QueryDocumentSnapshot } from 'firebase/firestore';

interface PaginatedData<T> {
  data: T[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
}

const ITEMS_PER_PAGE = 15;

export const useFirebaseData = () => {
  const { currentUser, userProfile, loading: authLoading } = useAuth();

  const [departments, setDepartments] = useState<FirebaseDepartment[]>([]);
  const [quizSets, setQuizSets] = useState<FirebaseQuizSet[]>([]);
  const [scores, setScores] = useState<FirebaseScore[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [questionsPaginated, setQuestionsPaginated] = useState<PaginatedData<FirebaseQuestion>>({
    data: [], lastDoc: null, hasMore: true, loading: true, loadingMore: false,
  });

  const fetchInitialQuestions = useCallback(async () => {
    if (!currentUser) { // ไม่ต้องโหลดถ้ายังไม่ได้ล็อกอิน
        setQuestionsPaginated({ data: [], lastDoc: null, hasMore: false, loading: false, loadingMore: false });
        return;
    };
    try {
      setQuestionsPaginated(prev => ({ ...prev, loading: true }));
      const { data, lastVisible } = await questionsService.getPaginated('createdAt', ITEMS_PER_PAGE, null);
      setQuestionsPaginated({
        data: data.map(convertTimestamps),
        lastDoc: lastVisible,
        hasMore: data.length === ITEMS_PER_PAGE,
        loading: false,
        loadingMore: false,
      });
    } catch (err) {
      console.error('Error fetching initial questions:', err);
      setError('เกิดข้อผิดพลาดในการโหลดคำถาม');
      setQuestionsPaginated(prev => ({ ...prev, loading: false }));
    }
  }, [currentUser]);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const isAdmin = userProfile?.role === 'admin';
      const dataPromises: Promise<any>[] = [
        departmentsService.getAll(),
      ];

      if (currentUser) {
        dataPromises.push(quizSetsService.getAll());
      }
      if (isAdmin) {
        dataPromises.push(scoresService.getAll());
        dataPromises.push(usersService.getAll());
      }

      const [departmentsData, setsData, scoresData, usersData] = await Promise.all(dataPromises);
      
      setDepartments(departmentsData);
      if (setsData) setQuizSets(setsData.map(convertTimestamps));
      if (scoresData) setScores(scoresData.map(convertTimestamps));
      if (usersData) setUsers(usersData);

    } catch (err) {
      console.error('Error loading data:', err);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }, [userProfile, currentUser]);

  useEffect(() => {
    if (!authLoading) {
        loadInitialData();
        fetchInitialQuestions();
    }
  }, [loadInitialData, fetchInitialQuestions, authLoading]);

  const updateQuizSetCount = (setId: string, amount: number) => { setQuizSets(prev => prev.map(qs => qs.id === setId ? { ...qs, questionCount: (qs.questionCount || 0) + amount } : qs)); };

  const addQuestion = useCallback(async (question: Omit<FirebaseQuestion, 'id' | 'createdAt' | 'correctCount' | 'incorrectCount'>) => {
    const id = await questionsService.add(question);
    updateQuizSetCount(question.setId, 1);
    await fetchInitialQuestions();
    return id;
  }, [fetchInitialQuestions]);

  const addMultipleQuestions = useCallback(async (questions: Omit<FirebaseQuestion, 'id' | 'createdAt' | 'correctCount' | 'incorrectCount'>[]) => {
    await questionsService.addMultiple(questions);
    await loadInitialData();
    await fetchInitialQuestions();
  }, [loadInitialData, fetchInitialQuestions]);
  
  const updateQuestion = useCallback(async (id: string, updates: Partial<FirebaseQuestion>) => {
    await questionsService.update(id, updates);
    setQuestionsPaginated(prev => ({ ...prev, data: prev.data.map(q => (q.id === id ? { ...q, ...updates } : q)) }));
  }, []);

  const deleteQuestion = useCallback(async (question: FirebaseQuestion) => {
    await questionsService.deleteSingle(question);
    updateQuizSetCount(question.setId, -1);
    setQuestionsPaginated(prev => ({ ...prev, data: prev.data.filter(q => q.id !== question.id) }));
  }, []);

  const deleteMultipleQuestions = useCallback(async (ids: string[]) => {
    await questionsService.deleteMultiple(ids);
    await loadInitialData();
    await fetchInitialQuestions();
  }, [loadInitialData, fetchInitialQuestions]);

  const fetchMoreQuestions = useCallback(async () => {
    if (questionsPaginated.loadingMore || !questionsPaginated.hasMore) return;
    try {
      setQuestionsPaginated(prev => ({ ...prev, loadingMore: true }));
      const { data, lastVisible } = await questionsService.getPaginated('createdAt', ITEMS_PER_PAGE, questionsPaginated.lastDoc);
      setQuestionsPaginated(prev => ({
        ...prev,
        data: [...prev.data, ...data.map(convertTimestamps)],
        lastDoc: lastVisible,
        hasMore: data.length === ITEMS_PER_PAGE,
        loadingMore: false,
      }));
    } catch (err) {
      console.error('Error fetching more questions:', err);
      setError('เกิดข้อผิดพลาดในการโหลดคำถามเพิ่มเติม');
      setQuestionsPaginated(prev => ({ ...prev, loadingMore: false }));
    }
  }, [questionsPaginated.lastDoc, questionsPaginated.hasMore, questionsPaginated.loadingMore]);

  const getQuestionsBySetId = useCallback((setId: string) => questionsPaginated.data.filter(q => q.setId === setId), [questionsPaginated.data]);
  const addDepartment = useCallback(async (department: Omit<FirebaseDepartment, 'id'>) => { const id = await departmentsService.add(department); setDepartments(prev => [...prev, { ...department, id }].sort((a, b) => a.name.localeCompare(b.name))); return id; }, []);
  const updateDepartment = useCallback(async (id: string, updates: Partial<FirebaseDepartment>) => { await departmentsService.update(id, updates); setDepartments(prev => prev.map(dept => (dept.id === id ? { ...dept, ...updates } : dept))); }, []);
  const deleteDepartment = useCallback(async (id: string) => { await departmentsService.delete(id); setDepartments(prev => prev.filter(dept => dept.id !== id)); }, []);
  const addQuizSet = useCallback(async (quizSet: Omit<FirebaseQuizSet, 'id' | 'createdAt' | 'questionCount'>) => { const id = await quizSetsService.add(quizSet); const newSet = { ...quizSet, id, createdAt: new Date(), questionCount: 0 }; setQuizSets(prev => [newSet, ...prev].sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())); return id; }, []);
  const updateQuizSet = useCallback(async (id: string, updates: Partial<FirebaseQuizSet>) => { await quizSetsService.update(id, updates); setQuizSets(prev => prev.map(set => (set.id === id ? { ...set, ...updates } : set))); }, []);
  const deleteQuizSet = useCallback(async (id: string) => { await quizSetsService.delete(id); setQuizSets(prev => prev.filter(set => set.id !== id)); await fetchInitialQuestions(); }, [fetchInitialQuestions]);
  const updateQuestionStats = useCallback(async (id: string, isCorrect: boolean) => { await questionsService.updateStats(id, isCorrect); }, []);
  const addScore = useCallback(async (score: Omit<FirebaseScore, 'id' | 'timestamp'>) => { const id = await scoresService.add(score); const newScore = { ...score, id, timestamp: new Date() }; setScores(prev => [newScore, ...prev]); return id; }, []);
  const deleteScore = useCallback(async (id: string) => { await scoresService.delete(id); setScores(prev => prev.filter(score => score.id !== id)); }, []);
  const updateUserProfile = useCallback(async (uid: string, updates: Partial<UserProfile>) => { await usersService.update(uid, updates); setUsers(prev => prev.map(user => (user.uid === uid ? { ...user, ...updates } : user))); setScores(prevScores => prevScores.map(score => { if (score.userId === uid) { const newScore = { ...score }; if (updates.name) { newScore.userName = updates.name; } if (updates.department) { newScore.department = updates.department; } return newScore; } return score; })); }, []);
  const deleteUser = useCallback(async (uid: string) => { await usersService.delete(uid); setUsers(prev => prev.filter(user => user.uid !== uid)); setScores(prevScores => prevScores.filter(score => score.userId !== uid)); }, []);
  const getScoresBySetId = useCallback((setId: string) => scores.filter(s => s.setId === setId), [scores]);
  const refreshData = useCallback(() => loadInitialData(), [loadInitialData]);

  return {
    departments, quizSets, scores, users, loading, error,
    questionsPaginated, fetchInitialQuestions, fetchMoreQuestions,
    addDepartment, updateDepartment, deleteDepartment,
    addQuizSet, updateQuizSet, deleteQuizSet,
    addQuestion, addMultipleQuestions, updateQuestion,
    deleteQuestion, deleteMultipleQuestions, updateQuestionStats,
    addScore, deleteScore, getQuestionsBySetId, getScoresBySetId,
    refreshData, updateUserProfile, deleteUser,
  };
};