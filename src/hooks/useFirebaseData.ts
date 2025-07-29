import { useState, useEffect, useCallback } from 'react';
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
  type FirebaseScore
} from '../services/firebaseService';
import type { UserProfile } from '../context/AuthContext';

export const useFirebaseData = () => {
  const [departments, setDepartments] = useState<FirebaseDepartment[]>([]);
  const [quizSets, setQuizSets] = useState<FirebaseQuizSet[]>([]);
  const [questions, setQuestions] = useState<FirebaseQuestion[]>([]);
  const [scores, setScores] = useState<FirebaseScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [departmentsData, setsData, questionsData, scoresData] = await Promise.all([
        departmentsService.getAll(),
        quizSetsService.getAll(),
        questionsService.getAll(),
        scoresService.getAll()
      ]);
      setDepartments(departmentsData);
      setQuizSets(setsData.map(convertTimestamps));
      setQuestions(questionsData.map(convertTimestamps));
      setScores(scoresData.map(convertTimestamps));
    } catch (err) {
      console.error('Error loading data:', err);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const addDepartment = useCallback(async (department: Omit<FirebaseDepartment, 'id'>) => {
    const id = await departmentsService.add(department);
    setDepartments(prev => [...prev, { ...department, id }].sort((a, b) => a.name.localeCompare(b.name)));
    return id;
  }, []);

  const updateDepartment = useCallback(async (id: string, updates: Partial<FirebaseDepartment>) => {
    await departmentsService.update(id, updates);
    setDepartments(prev => prev.map(dept => (dept.id === id ? { ...dept, ...updates } : dept)));
  }, []);

  const deleteDepartment = useCallback(async (id: string) => {
    await departmentsService.delete(id);
    setDepartments(prev => prev.filter(dept => dept.id !== id));
  }, []);

  const addQuizSet = useCallback(async (quizSet: Omit<FirebaseQuizSet, 'id' | 'createdAt' | 'questionCount'>) => {
    const id = await quizSetsService.add(quizSet);
    const newSet = { ...quizSet, id, createdAt: new Date(), questionCount: 0 };
    setQuizSets(prev => [newSet, ...prev].sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime()));
    return id;
  }, []);

  const updateQuizSet = useCallback(async (id: string, updates: Partial<FirebaseQuizSet>) => {
    await quizSetsService.update(id, updates);
    setQuizSets(prev => prev.map(set => (set.id === id ? { ...set, ...updates } : set)));
  }, []);

  const deleteQuizSet = useCallback(async (id: string) => {
    await quizSetsService.delete(id);
    setQuizSets(prev => prev.filter(set => set.id !== id));
    setQuestions(prev => prev.filter(q => q.setId !== id));
  }, []);

  const addQuestion = useCallback(async (question: Omit<FirebaseQuestion, 'id' | 'createdAt' | 'correctCount' | 'incorrectCount'>) => {
    const id = await questionsService.add(question);
    await loadAllData();
    return id;
  }, [loadAllData]);

  const updateQuestion = useCallback(async (id: string, updates: Partial<FirebaseQuestion>) => {
    await questionsService.update(id, updates);
    setQuestions(prev => prev.map(q => (q.id === id ? { ...q, ...updates } : q)));
  }, []);

  const deleteQuestion = useCallback(async (id: string) => {
    await questionsService.delete(id);
    await loadAllData();
  }, [loadAllData]);

  const updateQuestionStats = useCallback(async (id: string, isCorrect: boolean) => {
    await questionsService.updateStats(id, isCorrect);
  }, []);

  const addScore = useCallback(async (score: Omit<FirebaseScore, 'id' | 'timestamp'>) => {
    const id = await scoresService.add(score);
    const newScore = { ...score, id, timestamp: new Date() };
    setScores(prev => [newScore, ...prev]);
    return id;
  }, []);

  const deleteScore = useCallback(async (id: string) => {
    await scoresService.delete(id);
    setScores(prev => prev.filter(score => score.id !== id));
  }, []);
  
  const updateUserProfile = useCallback(async (uid: string, updates: Partial<UserProfile>) => {
    await usersService.update(uid, updates);
    setScores(prevScores =>
      prevScores.map(score => {
        if (score.userId === uid) {
          const newScore = { ...score };
          if (updates.name) {
            newScore.userName = updates.name;
          }
          if (updates.department) {
            newScore.department = updates.department;
          }
          return newScore;
        }
        return score;
      })
    );
  }, []);

  const deleteUser = useCallback(async (uid: string) => {
    await usersService.delete(uid);
    setScores(prevScores => prevScores.filter(score => score.userId !== uid));
  }, []);

  const getQuestionsBySetId = useCallback((setId: string) => questions.filter(q => q.setId === setId), [questions]);
  const getScoresBySetId = useCallback((setId: string) => scores.filter(s => s.setId === setId), [scores]);

  return {
    departments, quizSets, questions, scores, loading, error,
    addDepartment, updateDepartment, deleteDepartment,
    addQuizSet, updateQuizSet, deleteQuizSet,
    addQuestion, updateQuestion, deleteQuestion, updateQuestionStats,
    addScore,
    deleteScore,
    getQuestionsBySetId, getScoresBySetId,
    refreshData: loadAllData,
    updateUserProfile,
    deleteUser,
  };
};