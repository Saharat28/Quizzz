import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Award, Percent } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import type { FirebaseScore } from '../services/firebaseService';

interface UserSummary {
    userId: string;
    userName: string;
    totalScore: number;
    totalPossibleScore: number;
    overallPercentage: number;
    testCount: number;
}

const UserScoreSummary: React.FC = () => {
    const navigate = useNavigate();
    const { scores, users, quizSets } = useQuizContext();

    const userSummaryData = useMemo((): UserSummary[] => {
        if (scores.length === 0 || users.length === 0) {
            return [];
        }

        // 1. Filter out scores from survey sets first
        const quizSetIds = new Set(quizSets.filter(qs => !qs.isSurvey).map(qs => qs.id));
        const nonSurveyScores = scores.filter(score => quizSetIds.has(score.setId));

        // 2. Group scores by userId
        const scoresByUId = nonSurveyScores.reduce((acc, score) => {
            if (!acc[score.userId]) {
                acc[score.userId] = [];
            }
            acc[score.userId].push(score);
            return acc;
        }, {} as Record<string, FirebaseScore[]>);

        // 3. Calculate totals for each user
        const summary: UserSummary[] = Object.keys(scoresByUId).map(userId => {
            const userScores = scoresByUId[userId];
            const userName = users.find(u => u.uid === userId)?.name || userScores[0]?.userName || 'Unknown User';
            
            const totalScore = userScores.reduce((sum, s) => sum + s.score, 0);
            const totalPossibleScore = userScores.reduce((sum, s) => sum + s.totalQuestions, 0); // totalQuestions is total possible points
            
            const overallPercentage = totalPossibleScore > 0 ? (totalScore / totalPossibleScore) * 100 : 0;

            return {
                userId,
                userName,
                totalScore,
                totalPossibleScore,
                overallPercentage,
                testCount: userScores.length,
            };
        });

        // 4. Sort by overall percentage, descending
        return summary.sort((a, b) => b.overallPercentage - a.overallPercentage);

    }, [scores, users, quizSets]);

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">กลับหน้าหลัก</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">สรุปคะแนนรวม</h1>
                <div className="w-36"></div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden dark:bg-gray-900/50 dark:border-gray-800">
                <div className="overflow-x-auto">
                    {userSummaryData.length > 0 ? (
                        <table className="min-w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">อันดับ</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ชื่อ - นามสกุล</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">จำนวนชุดที่ทำ</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">คะแนนรวมสะสม</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">เปอร์เซ็นต์รวม</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {userSummaryData.map((summary, index) => (
                                    <tr key={summary.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${index === 0 ? 'bg-yellow-400 text-yellow-900' : index === 1 ? 'bg-gray-400 text-gray-900' : index === 2 ? 'bg-orange-400 text-orange-900' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-white'}`}>
                                                {index + 1}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <Link to={`/profile/${summary.userId}`} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:underline">
                                                {summary.userName}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600 dark:text-gray-400">{summary.testCount}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white font-semibold">{summary.totalScore} / {summary.totalPossibleScore}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${summary.overallPercentage >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 
                                                 summary.overallPercentage >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : 
                                                 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                                                {summary.overallPercentage.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-12 text-center text-gray-500">
                            <Award className="w-12 h-12 mx-auto mb-4" />
                            <p className="text-lg">ยังไม่มีข้อมูลคะแนนเพียงพอสำหรับสรุปผล</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserScoreSummary;