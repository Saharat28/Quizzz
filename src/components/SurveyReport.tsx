import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Users, HelpCircle, BarChart2 } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { FirebaseQuestion } from '../services/firebaseService';
import ResponseDetailModal from './common/ResponseDetailModal'; // --- 1. IMPORT MODAL ---

// --- 2. MODIFY DATA STRUCTURE ---
interface AnswerStat {
    count: number;
    percentage: number;
    users: string[]; 
}

interface QuestionResult {
    question: FirebaseQuestion;
    answers: Record<string, AnswerStat>;
    totalResponses: number;
}

const SurveyReport: React.FC = () => {
    const navigate = useNavigate();
    const { quizSets, scores, questionsPaginated } = useQuizContext();
    const [selectedSetId, setSelectedSetId] = useState<string>('');
    
    // --- 3. ADD STATE FOR MODAL ---
    const [modalData, setModalData] = useState<{ questionText: string; answerOption: string; users: string[] } | null>(null);

    const surveySets = useMemo(() => {
        return quizSets.filter(set => set.isSurvey);
    }, [quizSets]);

    const surveyResults = useMemo((): QuestionResult[] | null => {
        if (!selectedSetId) return null;

        const relevantScores = scores.filter(score => score.setId === selectedSetId);
        if (relevantScores.length === 0) return [];
        
        const relevantQuestions = questionsPaginated.data.filter(q => q.setId === selectedSetId);
        if (relevantQuestions.length === 0) return [];

        // --- 4. MODIFY CALCULATION LOGIC ---
        const results: QuestionResult[] = relevantQuestions.map(question => {
            const answerCollector: Record<string, string[]> = {}; // Key: answer, Value: array of user names
            let totalResponses = 0;

            relevantScores.forEach(score => {
                const userAnswer = score.userAnswers?.[question.id!];
                if (userAnswer !== undefined && userAnswer !== null && userAnswer !== '') {
                    totalResponses++;
                    const answers = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
                    answers.forEach(ans => {
                        if (!answerCollector[ans]) {
                            answerCollector[ans] = [];
                        }
                        answerCollector[ans].push(score.userName);
                    });
                }
            });

            const finalAnswers: Record<string, AnswerStat> = {};
            for (const ans in answerCollector) {
                const users = answerCollector[ans];
                finalAnswers[ans] = {
                    count: users.length,
                    percentage: totalResponses > 0 ? (users.length / totalResponses) * 100 : 0,
                    users: users.sort(),
                };
            }
            
            return {
                question,
                answers: finalAnswers,
                totalResponses,
            };
        });

        return results;
    }, [selectedSetId, scores, questionsPaginated.data]);

    const selectedSet = quizSets.find(set => set.id === selectedSetId);
    
    // --- 5. ADD MODAL HANDLERS ---
    const handleOpenModal = (questionText: string, answerOption: string, users: string[]) => {
        setModalData({ questionText, answerOption, users });
    };

    const handleCloseModal = () => {
        setModalData(null);
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                    <span>กลับหน้าหลัก</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">ผลลัพธ์แบบสอบถาม</h1>
                <div className="w-36"></div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-8 dark:bg-gray-900/50 dark:border-gray-800">
                <label htmlFor="survey-select" className="block text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    เลือกแบบสอบถาม
                </label>
                <select
                    id="survey-select"
                    value={selectedSetId}
                    onChange={(e) => setSelectedSetId(e.target.value)}
                    className="w-full max-w-md px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                    <option value="">-- กรุณาเลือก --</option>
                    {surveySets.map(set => (
                        <option key={set.id} value={set.id!}>{set.name}</option>
                    ))}
                </select>
            </div>

            {selectedSetId && surveyResults && (
                <div>
                     <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-8 dark:bg-gray-900/50 dark:border-gray-800 text-center">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedSet?.name}</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">{selectedSet?.description}</p>
                        <div className="mt-4 inline-flex items-center space-x-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full">
                            <Users className="w-5 h-5" />
                            <span className="font-semibold">{scores.filter(s => s.setId === selectedSetId).length}</span>
                            <span>ผู้ตอบ</span>
                        </div>
                    </div>
                
                    <div className="space-y-6">
                        {surveyResults.map(({ question, answers }, index) => (
                            <div key={question.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 dark:bg-gray-900/50 dark:border-gray-800">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                    <span className="text-gray-500 mr-2">{index + 1}.</span>{question.text}
                                </h3>
                                
                                <div className="space-y-3 mt-4">
                                    {question.options?.map(option => {
                                        const stat = answers[option] || { count: 0, percentage: 0, users: [] };
                                        return (
                                            // --- 6. MAKE RESULT BAR CLICKABLE ---
                                            <div key={option} onClick={() => handleOpenModal(question.text, option, stat.users)} className="cursor-pointer group">
                                                <div className="flex justify-between items-center mb-1 text-gray-700 dark:text-gray-300">
                                                    <span>{option}</span>
                                                    <span className="font-semibold">
                                                        {stat.count} คน ({stat.percentage.toFixed(1)}%)
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700 group-hover:opacity-80 transition">
                                                    <div 
                                                        className="bg-red-500 h-4 rounded-full transition-all duration-500" 
                                                        style={{ width: `${stat.percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {question.type === 'fill_in_blank' && (
                                        <p className="text-gray-500 italic">ผลลัพธ์สำหรับคำถามปลายเปิดยังไม่รองรับในหน้านี้</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* --- 7. RENDER THE MODAL --- */}
            <ResponseDetailModal
                isOpen={!!modalData}
                onClose={handleCloseModal}
                questionText={modalData?.questionText || ''}
                answerOption={modalData?.answerOption || ''}
                users={modalData?.users || []}
            />
        </div>
    );
};

export default SurveyReport;