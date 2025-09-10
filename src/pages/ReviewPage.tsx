import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, ShieldOff, Trash2 } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { FirebaseQuestion, questionsService, FirebaseQuizSet } from '../services/firebaseService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import LoadingSpinner from '../components/LoadingSpinner';
import { checkAnswer } from '../utils/quizUtils';

const AnswerRenderer: React.FC<{
    question: FirebaseQuestion;
    userAnswer: string | string[] | undefined;
    showCorrectAnswer: boolean;
}> = ({ question, userAnswer, showCorrectAnswer }) => {
    
    const isCorrect = checkAnswer(question, userAnswer);

    const formatAnswer = (answer: any) => {
        if (answer === undefined || answer === null || (Array.isArray(answer) && answer.length === 0)) {
            return <span className="text-gray-500 italic">ไม่ได้ตอบ</span>;
        }
        if (Array.isArray(answer)) {
            return answer.join(', ');
        }
        return answer.toString();
    };

    return (
        <div className="space-y-3">
            <div className={`p-4 rounded-lg flex items-center justify-between 
                ${showCorrectAnswer 
                    ? (isCorrect ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50') 
                    : 'bg-gray-100 dark:bg-gray-800/50'}`
            }>
                <div>
                    <p className="text-gray-600 dark:text-gray-400">คำตอบของคุณ:</p>
                    <p className="text-gray-900 dark:text-white font-semibold text-lg">{formatAnswer(userAnswer)}</p>
                </div>
                {showCorrectAnswer && (
                    isCorrect 
                        ? <Check className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" /> 
                        : <X className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                )}
            </div>
            {showCorrectAnswer && !isCorrect && (
                <div className="bg-gray-50 dark:bg-gray-900/50 border-t-2 border-green-500 p-4 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400">คำตอบที่ถูกต้อง:</p>
                    <p className="text-green-700 dark:text-green-300 font-semibold text-lg">{formatAnswer(question.correctAnswer)}</p>
                </div>
            )}
        </div>
    );
};


const ReviewPage: React.FC = () => {
    const navigate = useNavigate();
    const { scoreId } = useParams<{ scoreId: string }>();
    const { scores, loading: contextLoading, deleteScore } = useQuizContext();
    const { userProfile } = useAuth();
    const { showNotification } = useNotification();

    const [quizQuestions, setQuizQuestions] = useState<FirebaseQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCleaningUp, setIsCleaningUp] = useState(false);
    const [parentSet, setParentSet] = useState<FirebaseQuizSet | null | undefined>(undefined);

    // This useEffect scrolls the page to the top whenever the component loads.
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const isAdmin = userProfile?.role === 'admin';

    const score = useMemo(() => {
        if (!scoreId || contextLoading) return null;
        return scores.find(s => s.id === scoreId);
    }, [scoreId, scores, contextLoading]);

    useEffect(() => {
        if (isCleaningUp) return;

        const cleanupAndRedirect = async (reason: 'deleted' | 'inactive') => {
            if (!scoreId) return;
            setIsCleaningUp(true);
            const message = reason === 'deleted'
                ? 'ชุดข้อสอบนี้ถูกลบไปแล้ว ประวัติการทำข้อสอบนี้จะถูกลบออก'
                : 'ชุดข้อสอบนี้ถูกปิดใช้งาน ประวัติการทำข้อสอบนี้จะถูกลบออก';
            showNotification('โปรดทราบ', message, 'info');
            try {
                await deleteScore(scoreId);
            } catch (err) { 
                console.error("Failed to process cleanup:", err);
            } 
            finally {
                setTimeout(() => navigate('/profile', { replace: true }), 3000);
            }
        };

        const verifyAndFetchData = async () => {
            if (!score) {
                if (!contextLoading) setIsLoading(false);
                return;
            }

            const docRef = doc(db, 'quizSets', score.setId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                setParentSet(null);
                cleanupAndRedirect('deleted');
                return;
            }

            const freshParentSet = { id: docSnap.id, ...docSnap.data() } as FirebaseQuizSet;
            setParentSet(freshParentSet);

            const isOwner = userProfile?.uid === score.userId;
            if (!freshParentSet.isActive && !isAdmin && isOwner) {
                cleanupAndRedirect('inactive');
                return;
            }

            try {
                const allQuestionsForSet = await questionsService.getAllBySetId(score.setId);
                const questionOrder = score.questionOrder ?? [];
                if (questionOrder.length > 0) {
                    const questionMap = new Map(allQuestionsForSet.map(q => [q.id, q]));
                    const sortedQuestions = questionOrder.map(id => questionMap.get(id!)).filter((q): q is FirebaseQuestion => !!q);
                    setQuizQuestions(sortedQuestions);
                } else {
                    setQuizQuestions(allQuestionsForSet);
                }
            } catch (error) { console.error("Failed to fetch questions:", error); } 
            finally { setIsLoading(false); }
        };

        verifyAndFetchData();

    }, [score, scoreId, contextLoading, deleteScore, navigate, showNotification, isAdmin, userProfile, isCleaningUp]);


    if (isLoading) return <LoadingSpinner message="กำลังโหลดผลสอบ..." />;
    if (isCleaningUp) return <LoadingSpinner message="กำลังลบประวัติการทำข้อสอบ..." />;

    if (!score) {
        return (
            <div className="text-center p-8">
                <h2 className="text-2xl text-gray-900 dark:text-white">ไม่พบผลการสอบ</h2>
                <button onClick={() => navigate('/profile')} className="mt-4 px-5 py-2 bg-[#d93327] text-white rounded-xl">กลับไปที่โปรไฟล์</button>
            </div>
        );
    }
    
    if (parentSet === null) {
        return <LoadingSpinner message="ชุดข้อสอบถูกลบแล้ว กำลังลบประวัติ..." />;
    }
    
    if (parentSet === undefined) {
        return <LoadingSpinner message="กำลังตรวจสอบข้อมูลชุดข้อสอบ..." />;
    }
    
    const isOwner = userProfile?.uid === score.userId;
    if (!parentSet.isActive && !isAdmin) {
         return (
             <div className="max-w-xl mx-auto text-center p-8">
                <ShieldOff className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">ไม่สามารถเข้าถึงได้</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">ชุดข้อสอบนี้ถูกปิดการใช้งานโดยผู้ดูแลระบบ</p>
                <button onClick={() => navigate('/profile')} className="mt-6 px-5 py-2 bg-[#d93327] text-white rounded-xl">กลับไปที่โปรไฟล์</button>
            </div>
        );
    }
    
    const canViewPage = isAdmin || isOwner;
    if (!canViewPage) {
         return (
            <div className="text-center p-8">
                <h2 className="text-2xl text-gray-900 dark:text-white">You do not have permission to view this page</h2>
                <button onClick={() => navigate('/')} className="mt-4 px-5 py-2 bg-[#d93327] text-white rounded-xl">กลับหน้าหลัก</button>
            </div>
        );
    }
    
    const canViewAnswers = !parentSet.isSurvey && (isAdmin || (isOwner && parentSet.instantFeedback === true));

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => navigate('/profile')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                    <span>กลับไปที่โปรไฟล์</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {parentSet.isSurvey ? "ผลแบบสอบถาม" : "Review Answers"}
                </h1>
                <div className="w-36"></div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-8 text-center dark:bg-gray-900/50 dark:border-gray-800">
                <h2 className="text-xl text-gray-700 dark:text-gray-300">
                    {parentSet.isSurvey ? "แบบสอบถาม:" : "ชุดข้อสอบ:"}
                    <span className="font-bold text-gray-900 dark:text-white"> {score.setName}</span>
                </h2>
                <p className="text-lg text-gray-500 dark:text-gray-400 mt-1">ผู้ทำ: {score.userName}</p>
                {!parentSet.isSurvey && (
                    <>
                        <p className="text-5xl font-bold text-red-600 dark:text-red-400 my-4">{score.score} คะแนน</p>
                        <p className="text-lg text-gray-600 dark:text-gray-400">เปอร์เซ็นต์ที่ทำได้: {score.percentage.toFixed(1)}%</p>
                    </>
                )}
            </div>

            <div className="space-y-6">
                {quizQuestions.map((question, index) => (
                    <div key={question.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 dark:bg-gray-900/50 dark:border-gray-800">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                            <span className="text-gray-500 dark:text-gray-500 mr-2">{index + 1}.</span>{question.text}
                        </h3>
                        {question.imageUrl && (
                            <div className="mb-4">
                                <img src={question.imageUrl} alt="Question" className="max-w-sm max-h-64 mx-auto rounded-lg" />
                            </div>
                        )}
                        <AnswerRenderer 
                            question={question} 
                            userAnswer={score.userAnswers?.[question.id!]}
                            showCorrectAnswer={canViewAnswers}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReviewPage;