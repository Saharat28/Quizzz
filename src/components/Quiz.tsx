import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, Clock, Check, X } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { FirebaseQuestion, FirebaseQuizSet, questionsService } from '../services/firebaseService';
import { checkAnswer } from '../utils/quizUtils';

// ฟังก์ชันสำหรับสุ่ม Array (Fisher-Yates Shuffle)
const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const QuestionRenderer: React.FC<{
    question: FirebaseQuestion;
    index: number;
    userAnswer: any;
    onAnswer: (questionId: string, answer: any) => void;
    instantFeedback: boolean;
    selectedSet: FirebaseQuizSet | null; 
}> = ({ question, index, userAnswer, onAnswer, instantFeedback, selectedSet }) => {

    const hasAnswered = userAnswer !== undefined && userAnswer !== null && userAnswer !== '';
    const isCorrect = hasAnswered ? checkAnswer(question, userAnswer) : false;

    const getOptionStyle = (option: string) => {
        if (!instantFeedback || !hasAnswered) {
             return userAnswer === option || (Array.isArray(userAnswer) && userAnswer.includes(option))
                ? 'border-red-500 bg-red-100 dark:bg-red-900/30 ring-2 ring-red-500/50'
                : 'border-gray-300 hover:border-red-400 hover:bg-red-50 dark:border-gray-700 dark:hover:border-red-500/50 dark:hover:bg-red-900/20';
        }
        const isThisOptionCorrect = checkAnswer(question, option);
        const isThisOptionSelected = userAnswer === option || (Array.isArray(userAnswer) && userAnswer.includes(option));

        if (isThisOptionCorrect) return 'border-green-500 bg-green-100 dark:bg-green-900/30 ring-2 ring-green-500/50';
        if (isThisOptionSelected && !isThisOptionCorrect) return 'border-red-500 bg-red-100 dark:bg-red-900/30 ring-2 ring-red-500/50';
        return 'border-gray-300 opacity-60 dark:border-gray-700';
    };

    const handleMcqMultipleChange = (option: string) => {
        if (instantFeedback && hasAnswered) return;
        const currentAnswers = Array.isArray(userAnswer) ? [...userAnswer] : [];
        let newAnswers = currentAnswers.includes(option) ? currentAnswers.filter(ans => ans !== option) : [...currentAnswers, option];
        onAnswer(question.id!, newAnswers.sort());
    };

    const handleSingleAnswer = (option: string) => {
        if (instantFeedback && hasAnswered) return;
        onAnswer(question.id!, option);
    }

    const renderQuestionBody = () => {
        switch (question.type) {
            case 'multiple_choice_single':
            case 'true_false':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {question.options?.map((option, optIndex) => (
                            <button key={optIndex} onClick={() => handleSingleAnswer(option)} disabled={instantFeedback && hasAnswered} className={`text-left p-4 rounded-xl border-2 transition-all duration-200 flex justify-between items-center ${getOptionStyle(option)}`}>
                                <span className="text-lg text-gray-800 dark:text-gray-200">{option}</span>
                                {instantFeedback && hasAnswered && (checkAnswer(question, option) ? <Check className="text-green-600 dark:text-green-400"/> : (userAnswer === option && <X className="text-red-600 dark:text-red-400"/>))}
                            </button>
                        ))}
                    </div>
                );
            case 'multiple_choice_multiple':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {question.options?.map((option, optIndex) => (
                            <label key={optIndex} className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all duration-200 ${getOptionStyle(option)} ${instantFeedback && hasAnswered ? 'cursor-default' : 'cursor-pointer'}`}>
                                <input type="checkbox" checked={Array.isArray(userAnswer) && userAnswer.includes(option)} onChange={() => handleMcqMultipleChange(option)} disabled={instantFeedback && hasAnswered} className="form-checkbox h-5 w-5 text-red-600 bg-gray-200 border-gray-300 rounded focus:ring-red-500 dark:bg-gray-800 dark:border-gray-600" />
                                <span className="text-lg text-gray-800 dark:text-gray-200">{option}</span>
                            </label>
                        ))}
                    </div>
                );
            case 'fill_in_blank':
                return (
                    <div>
                        <input 
                            type="text"
                            value={userAnswer || ''}
                            onChange={(e) => onAnswer(question.id!, e.target.value)}
                            readOnly={instantFeedback && hasAnswered}
                            className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 rounded-xl text-gray-900 dark:text-white text-lg focus:ring-2 focus:ring-red-500 transition-colors ${instantFeedback && hasAnswered ? (isCorrect ? 'border-green-500' : 'border-red-500') : 'border-gray-300 dark:border-gray-700'}`}
                            placeholder="พิมพ์คำตอบของคุณที่นี่..."
                        />
                         {instantFeedback && hasAnswered && !isCorrect && (
                            <div className="mt-2 text-left text-green-600 dark:text-green-400">คำตอบที่ถูกต้องคือ: {Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : question.correctAnswer}</div>
                         )}
                    </div>
                );
            default:
                return <p className="text-yellow-400">ไม่รู้จักประเภทของคำถามนี้</p>;
        }
    };

    return (
        <div id={`question-card-${question.id}`} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 scroll-mt-24 dark:bg-gray-900/50 dark:border-gray-800">
            <h3 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white leading-relaxed mb-4">
                <span className="text-gray-400 dark:text-gray-500 mr-2">{index + 1}.</span>
                {question.text}
                {selectedSet && !selectedSet.isSurvey && <span className="text-sm font-normal text-gray-400 ml-2">({question.points || 1} คะแนน)</span>}
            </h3>
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
    const { quizSets, addScore } = useQuizContext();
    const { showNotification, showConfirmation } = useNotification();
    const { currentUser, userProfile } = useAuth();

    const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
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
    const instantFeedbackEnabled = selectedSet?.instantFeedback || false;

    useEffect(() => {
        const fetchQuestionsForQuiz = async () => {
            if (setId) {
                setIsLoadingQuestions(true);
                try {
                    const fetchedQuestions = await questionsService.getAllBySetId(setId);
                    
                    const processedQuestions = fetchedQuestions.map(q => {
                        if (q.options && q.options.length > 0) {
                            return { ...q, options: shuffleArray(q.options) };
                        }
                        return q;
                    });

                    const shuffledQuestions = shuffleArray(processedQuestions);
                    
                    setQuestions(shuffledQuestions);
                } catch (error) {
                    console.error("Failed to fetch questions for quiz:", error);
                    showNotification("เกิดข้อผิดพลาด", "ไม่สามารถโหลดคำถามสำหรับชุดข้อสอบนี้ได้", "error");
                } finally {
                    setIsLoadingQuestions(false);
                }
            }
        };

        fetchQuestionsForQuiz();
    }, [setId, showNotification]);

    useEffect(() => {
        if (!isLoadingQuestions && questions.length > 0 && selectedSet && !isStarted) {
            const timeInMinutes = selectedSet.timeLimit || questions.length;
            setTimeRemaining(timeInMinutes * 60);
            setIsStarted(true);
        }
    }, [isLoadingQuestions, questions, selectedSet, isStarted]);

    const finishQuiz = useCallback(async () => {
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
            if (selectedSet && !selectedSet.isSurvey) {
                questions.forEach(q => { 
                    if (checkAnswer(q, answers[q.id!])) { 
                        rawScore += (q.points || 1); 
                    } 
                });
            }

            const finalScore = Math.max(0, rawScore - penaltyPoints);
            const totalPossiblePoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
            const percentage = totalPossiblePoints > 0 ? (finalScore / totalPossiblePoints) * 100 : 0;
            
            const newScoreId = await addScore({ 
                userName: userProfile.name, 
                userId: userProfile.uid, 
                score: finalScore, 
                totalQuestions: totalPossiblePoints,
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
        const unansweredCount = questions.length - Object.keys(answers).filter(key => answers[key] !== undefined && answers[key] !== null && `${answers[key]}`.trim() !== '').length;
        if (unansweredCount > 0) {
            const firstUnanswered = questions.find(q => answers[q.id!] === undefined || answers[q.id!] === null || `${answers[q.id!]}`.trim() === '');
            showConfirmation('ยังทำข้อสอบไม่ครบ', `คุณยังไม่ได้ตอบ ${unansweredCount} ข้อ ต้องการส่งคำตอบเลยหรือไม่?`, () => finishQuiz());
            if (firstUnanswered) document.getElementById(`question-card-${firstUnanswered.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            showConfirmation('ยืนยันการส่งคำตอบ', 'คุณต้องการส่งคำตอบทั้งหมดใช่หรือไม่?', () => finishQuiz());
        }
    };

    useEffect(() => {
        const handleBlur = () => {
            if (isStarted && !isFinishingRef.current && !selectedSet?.isSurvey) {
                setCheatAttempts(prev => prev + 1);
            }
        };
        window.addEventListener('blur', handleBlur);
        return () => window.removeEventListener('blur', handleBlur);
    }, [isStarted, selectedSet]);

    useEffect(() => {
        if (!isStarted || isFinishing || (selectedSet && selectedSet.isSurvey)) return;
        if (cheatAttempts > 0 && cheatAttempts !== lastCheatAttemptHandled.current) {
            lastCheatAttemptHandled.current = cheatAttempts;
            switch (cheatAttempts) {
                case 1: showNotification('คำเตือน! (ครั้งที่ 1)', 'ตรวจพบการออกนอกหน้าต่างข้อสอบ หากทำอีกจะถูกหักคะแนน', 'error'); break;
                case 2: setPenaltyPoints(p => p + 2); showNotification('ถูกหักคะแนน! (ครั้งที่ 2)', 'คุณถูกหัก 2 คะแนน', 'error'); break;
                case 3: setPenaltyPoints(p => p + 3); showNotification('ถูกหักเพิ่ม! (ครั้งที่ 3)', 'คุณถูกหักเพิ่ม 3 คะแนน', 'error'); break;
                case 4: showNotification('ส่งคำตอบอัตโนมัติ!', 'ออกนอกหน้าต่างเกินกำหนด ระบบได้ส่งคำตอบของคุณแล้ว', 'error'); finishQuiz(); break;
            }
        }
    }, [cheatAttempts, isStarted, isFinishing, showNotification, finishQuiz, selectedSet]);

    useEffect(() => {
        if (!isStarted || (selectedSet?.isSurvey)) return;
        let timer: NodeJS.Timeout;
        if (timeRemaining > 0) {
            timer = setTimeout(() => setTimeRemaining(p => p - 1), 1000);
        } else if (timeRemaining <= 0) {
            finishQuiz();
        }
        return () => clearTimeout(timer);
    }, [timeRemaining, isStarted, finishQuiz, selectedSet]);

    const handleAnswer = (questionId: string, answer: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    if (isLoadingQuestions || !selectedSet) return <LoadingSpinner message="กำลังเตรียมข้อสอบ..." />;

    return (
        <div className="max-w-3xl mx-auto p-4">
            {isFinishing && <LoadingSpinner message="กำลังส่งคำตอบ..." />}
            <div className="sticky top-4 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg p-4 mb-8">
                <div className="flex items-center justify-between">
                    <div className="text-left">
                        <h2 className="font-bold text-lg text-gray-900 dark:text-white">{selectedSet?.name}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{userProfile?.name}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        {!selectedSet.isSurvey && (
                            <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                                <Clock className="w-5 h-5" />
                                <span className={`font-semibold text-lg ${timeRemaining < 300 && isStarted ? 'text-red-500 animate-pulse' : 'text-gray-900 dark:text-white'}`}>
                                    {formatTime(timeRemaining)}
                                </span>
                            </div>
                        )}
                        <button onClick={handleSubmitAttempt} disabled={isFinishing} className="px-5 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            <CheckCircle className="w-5 h-5" />
                            <span>ส่งคำตอบ</span>
                        </button>
                    </div>
                </div>
            </div>
            <div className="space-y-10">
                {questions.map((question, index) => (
                    <QuestionRenderer 
                        key={question.id} 
                        question={question} 
                        index={index} 
                        userAnswer={answers[question.id!]} 
                        onAnswer={handleAnswer} 
                        instantFeedback={instantFeedbackEnabled}
                        selectedSet={selectedSet}
                    />
                ))}
            </div>
            <div className="mt-12 text-center">
                <p className="text-gray-500 dark:text-gray-500 mb-4">ทำครบทุกข้อแล้วใช่ไหม?</p>
                <button onClick={handleSubmitAttempt} disabled={isFinishing} className="px-10 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 flex items-center space-x-2 mx-auto text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    <CheckCircle className="w-6 h-6" />
                    <span>ส่งคำตอบทั้งหมด</span>
                </button>
            </div>
        </div>
    );
};

export default Quiz;