import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, Clock } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { FirebaseQuestion } from '../services/firebaseService';
import { isEqual } from 'lodash';

const QuestionRenderer: React.FC<{
    question: FirebaseQuestion;
    index: number;
    userAnswer: any;
    onAnswer: (questionId: string, answer: any) => void;
}> = ({ question, index, userAnswer, onAnswer }) => {

    const handleMcqMultipleChange = (option: string) => {
        const currentAnswers = Array.isArray(userAnswer) ? [...userAnswer] : [];
        let newAnswers;
        if (currentAnswers.includes(option)) {
            newAnswers = currentAnswers.filter(ans => ans !== option);
        } else {
            newAnswers = [...currentAnswers, option];
        }
        onAnswer(question.id!, newAnswers.sort());
    };

    const renderQuestionBody = () => {
        switch (question.type) {
            case 'mcq-s':
            case 'tf':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {question.options?.map((option, optIndex) => (
                            <button key={optIndex} onClick={() => onAnswer(question.id!, option)} className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${userAnswer === option ? 'border-red-500 bg-red-900/30 ring-2 ring-red-500/50' : 'border-gray-700 hover:border-red-500/50 hover:bg-red-900/20'}`}>
                                <span className="text-lg text-gray-200">{option}</span>
                            </button>
                        ))}
                    </div>
                );
            case 'mcq-m':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {question.options?.map((option, optIndex) => (
                            <label key={optIndex} className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${Array.isArray(userAnswer) && userAnswer.includes(option) ? 'border-red-500 bg-red-900/30 ring-2 ring-red-500/50' : 'border-gray-700 hover:border-red-500/50 hover:bg-red-900/20'}`}>
                                <input type="checkbox" checked={Array.isArray(userAnswer) && userAnswer.includes(option)} onChange={() => handleMcqMultipleChange(option)} className="form-checkbox h-5 w-5 text-red-500 bg-gray-800 border-gray-600 rounded focus:ring-red-500" />
                                <span className="text-lg text-gray-200">{option}</span>
                            </label>
                        ))}
                    </div>
                );
            case 'fib':
                return (
                    <input 
                        type="text"
                        value={userAnswer || ''}
                        onChange={(e) => onAnswer(question.id!, e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="พิมพ์คำตอบของคุณที่นี่..."
                    />
                );
            default:
                return <p className="text-yellow-400">ไม่รู้จักประเภทของคำถามนี้</p>;
        }
    };

    return (
        <div id={`question-card-${question.id}`} className="bg-gray-900/50 border border-gray-800 rounded-2xl shadow-lg p-6 md:p-8 scroll-mt-24">
            <h3 className="text-xl md:text-2xl font-semibold text-white leading-relaxed mb-4"><span className="text-gray-500 mr-2">{index + 1}.</span>{question.text}</h3>
            {question.imageUrl && (
                <div className="mb-6">
                    <img src={question.imageUrl} alt="Question illustration" className="max-w-full max-h-80 mx-auto rounded-lg" />
                </div>
            )}
            {renderQuestionBody()}
        </div>
    );
};


const Quiz: React.FC = () => {
    const navigate = useNavigate();
    const { setId } = useParams<{ setId: string }>();
    const { quizSets, addScore, getQuestionsBySetId } = useQuizContext();
    const { showNotification, showConfirmation } = useNotification();
    const { currentUser, userProfile } = useAuth();

    const [isStarted, setIsStarted] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [questions, setQuestions] = useState<FirebaseQuestion[]>([]);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isFinishing, setIsFinishing] = useState(false);
    const [cheatAttempts, setCheatAttempts] = useState(0);
    const [penaltyPoints, setPenaltyPoints] = useState(0);
    const isFinishingRef = useRef(false);
    const lastCheatAttemptHandled = useRef(0);

    const selectedSet = useMemo(() => setId ? quizSets.find(set => set.id === setId) : null, [quizSets, setId]);
    const availableQuestions = useMemo(() => setId ? getQuestionsBySetId(setId) : [], [getQuestionsBySetId, setId]);

    useEffect(() => {
        if (availableQuestions.length > 0 && selectedSet && !isStarted) {
            const shuffledQuestions = [...availableQuestions].sort(() => Math.random() - 0.5);
            setQuestions(shuffledQuestions);
            const timeInMinutes = selectedSet.timeLimit || shuffledQuestions.length;
            setTimeRemaining(timeInMinutes * 60);
            setIsStarted(true);
        }
    }, [availableQuestions, selectedSet, isStarted]);

    const checkAnswer = (question: FirebaseQuestion, userAnswer: any): boolean => {
        if (userAnswer === undefined || userAnswer === null) return false;
        switch (question.type) {
            case 'mcq-s':
            case 'tf':
                return userAnswer === question.correctAnswer;
            case 'fib':
                return typeof userAnswer === 'string' && userAnswer.trim() === question.correctAnswer;
            case 'mcq-m':
                return Array.isArray(userAnswer) && Array.isArray(question.correctAnswer) && isEqual([...userAnswer].sort(), [...question.correctAnswer].sort());
            default:
                return false;
        }
    };

    const finishQuiz = useCallback(async (forced = false) => {
        if (isFinishingRef.current) return;
        isFinishingRef.current = true;
        if (!currentUser || !userProfile) {
            showNotification("เกิดข้อผิดพลาด", "ไม่พบข้อมูลผู้ใช้", "error");
            isFinishingRef.current = false;
            return;
        }
        setIsFinishing(true);
        setIsStarted(false);

        try {
            let rawScore = 0;
            questions.forEach(q => {
                if (checkAnswer(q, answers[q.id!])) {
                    rawScore++;
                }
            });

            const finalScore = Math.max(0, rawScore - penaltyPoints);
            const totalQuestions = questions.length;
            const percentage = totalQuestions > 0 ? (finalScore / totalQuestions) * 100 : 0;

            const newScoreId = await addScore({
                userName: userProfile.name,
                userId: userProfile.uid,
                score: finalScore,
                totalQuestions,
                percentage,
                setId: setId!,
                setName: selectedSet?.name || 'ทั่วไป',
                department: userProfile.department,
                cheatAttempts,
                penaltyPoints,
                userAnswers: answers,
                questionOrder: questions.map(q => q.id!),
            });
            
            navigate(`/review/${newScoreId}`);

        } catch (error) {
            console.error("Error finishing quiz:", error);
            showNotification("เกิดข้อผิดพลาด", "ไม่สามารถส่งคำตอบได้", "error");
            setIsStarted(true);
            isFinishingRef.current = false;
        }
    }, [answers, userProfile, currentUser, questions, addScore, setId, selectedSet, navigate, showNotification, penaltyPoints, cheatAttempts]);

    const handleSubmitAttempt = () => {
        if (!isStarted || isFinishing) return;
        const unansweredCount = questions.length - Object.keys(answers).length;
        if (unansweredCount > 0) {
            const firstUnanswered = questions.find(q => answers[q.id!] === undefined);
            showConfirmation('ยังทำข้อสอบไม่ครบ', `คุณยังไม่ได้ตอบ ${unansweredCount} ข้อ ต้องการส่งคำตอบเลยหรือไม่?`, () => finishQuiz());
            if (firstUnanswered) document.getElementById(`question-card-${firstUnanswered.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            showConfirmation('ยืนยันการส่งคำตอบ', 'คุณต้องการส่งคำตอบทั้งหมดใช่หรือไม่?', () => finishQuiz());
        }
    };
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && isStarted) setCheatAttempts(prev => prev + 1);
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isStarted]);
    useEffect(() => {
        if (!isStarted || isFinishing) return;
        if (cheatAttempts > 0 && cheatAttempts !== lastCheatAttemptHandled.current) {
            lastCheatAttemptHandled.current = cheatAttempts;
            switch (cheatAttempts) {
                case 1: showNotification('คำเตือน! (ครั้งที่ 1)', 'ตรวจพบการสลับหน้าจอ หากทำอีกจะถูกหักคะแนน', 'error'); break;
                case 2: setPenaltyPoints(p => p + 2); showNotification('ถูกหักคะแนน! (ครั้งที่ 2)', 'คุณถูกหัก 2 คะแนน', 'error'); break;
                case 3: setPenaltyPoints(p => p + 3); showNotification('ถูกหักคะแนน! (ครั้งที่ 3)', 'คุณถูกหักเพิ่ม 3 คะแนน', 'error'); break;
                case 4: showNotification('ส่งคำตอบอัตโนมัติ!', 'สลับหน้าจอเกินกำหนด ระบบได้ส่งคำตอบของคุณแล้ว', 'error'); finishQuiz(true); break;
            }
        }
    }, [cheatAttempts, isStarted, isFinishing, showNotification, finishQuiz]);
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isStarted && timeRemaining > 0) timer = setTimeout(() => setTimeRemaining(p => p - 1), 1000);
        else if (isStarted && timeRemaining === 0) finishQuiz();
        return () => clearTimeout(timer);
    }, [timeRemaining, isStarted, finishQuiz]);
    const handleAnswer = (questionId: string, answer: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };
    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };
    if (!isStarted) return <LoadingSpinner message="กำลังเตรียมข้อสอบ..." />;
    return (
        <div className="max-w-3xl mx-auto p-4">
            {isFinishing && <LoadingSpinner message="กำลังส่งคำตอบและตรวจคะแนน..." />}
            <div className="sticky top-4 z-10 bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-lg p-4 mb-8">
                <div className="flex items-center justify-between">
                    <div className="text-left">
                        <h2 className="font-bold text-lg text-white">{selectedSet?.name}</h2>
                        <p className="text-sm text-gray-400">{userProfile?.name}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 text-gray-300"><Clock className="w-5 h-5" /><span className={`font-semibold text-lg ${timeRemaining < 300 && isStarted ? 'text-red-500 animate-pulse' : 'text-white'}`}>{formatTime(timeRemaining)}</span></div>
                        <button onClick={handleSubmitAttempt} disabled={isFinishing} className="px-5 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"><CheckCircle className="w-5 h-5" /><span>ส่งคำตอบ</span></button>
                    </div>
                </div>
            </div>
            <div className="space-y-10">
                {questions.map((question, index) => (
                    <QuestionRenderer key={question.id} question={question} index={index} userAnswer={answers[question.id!]} onAnswer={handleAnswer} />
                ))}
            </div>
            <div className="mt-12 text-center">
                <p className="text-gray-500 mb-4">ทำครบทุกข้อแล้วใช่ไหม?</p>
                <button onClick={handleSubmitAttempt} disabled={isFinishing} className="px-10 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 flex items-center space-x-2 mx-auto text-lg disabled:opacity-50 disabled:cursor-not-allowed"><CheckCircle className="w-6 h-6" /><span>ส่งคำตอบทั้งหมด</span></button>
            </div>
        </div>
    );
};

export default Quiz;