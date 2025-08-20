import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { useAuth } from '../context/AuthContext';
import { FirebaseQuestion } from '../services/firebaseService';
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
    const { scores, questionsPaginated, loading } = useQuizContext();
    const { userProfile } = useAuth();

    const isAdmin = userProfile?.role === 'admin';

    const { score, quizQuestions } = useMemo(() => {
        const currentScore = scores.find(s => s.id === scoreId);
        if (!currentScore) {
            return { score: null, quizQuestions: [] };
        }
        
        const relevantQuestions = questionsPaginated.data.filter(q => q.setId === currentScore.setId);
        
        if (currentScore.questionOrder && currentScore.questionOrder.length > 0) {
            const questionMap = new Map(relevantQuestions.map(q => [q.id, q]));
            const sortedQuestions = currentScore.questionOrder
                .map(id => questionMap.get(id!))
                .filter((q): q is FirebaseQuestion => q !== undefined);
            
            return { score: currentScore, quizQuestions: sortedQuestions };
        }
        
        return { score: currentScore, quizQuestions: relevantQuestions };
    }, [scoreId, scores, questionsPaginated.data]);

    if (loading || questionsPaginated.loading) {
        return <LoadingSpinner message="กำลังโหลดข้อมูลการสอบ..." />;
    }

    if (!score) {
        return (
            <div className="text-center p-8">
                <h2 className="text-2xl text-gray-900 dark:text-white">ไม่พบข้อมูลการสอบ</h2>
                <button onClick={() => navigate('/')} className="mt-4 px-5 py-2 bg-[#d93327] text-white rounded-xl">กลับหน้าหลัก</button>
            </div>
        );
    }
    
    const canViewPage = isAdmin || userProfile?.uid === score.userId;
    if (!canViewPage) {
         return (
            <div className="text-center p-8">
                <h2 className="text-2xl text-gray-900 dark:text-white">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
                <button onClick={() => navigate('/')} className="mt-4 px-5 py-2 bg-[#d93327] text-white rounded-xl">กลับหน้าหลัก</button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                    <span>กลับหน้าหลัก</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">ทบทวนคำตอบ</h1>
                <div className="w-24"></div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-8 text-center dark:bg-gray-900/50 dark:border-gray-800">
                <h2 className="text-xl text-gray-700 dark:text-gray-300">ชุดข้อสอบ: <span className="font-bold text-gray-900 dark:text-white">{score.setName}</span></h2>
                <p className="text-lg text-gray-500 dark:text-gray-400 mt-1">ผู้เข้าสอบ: {score.userName}</p>
                <p className="text-5xl font-bold text-red-600 dark:text-red-400 my-4">{score.score} / {score.totalQuestions}</p>
                <p className="text-lg text-gray-600 dark:text-gray-400">คุณตอบถูก {score.score} จาก {score.totalQuestions} ข้อ</p>
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
                            showCorrectAnswer={isAdmin}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReviewPage;