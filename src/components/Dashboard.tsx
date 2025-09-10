import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Plus, Users, ClipboardList, Trophy, TrendingUp, Building2, BookCopy, BarChartHorizontal, TrendingDown, ListChecks, UserCog, PieChart, FileText, Award } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { FirebaseScore, scoresService } from '../services/firebaseService';

interface DashboardProps {
  userRole: 'admin' | 'user';
}

const LeaderboardTable: React.FC<{
    title: string;
    icon: React.ElementType;
    data: FirebaseScore[];
    iconColor: string;
}> = ({ title, icon: Icon, data, iconColor }) => {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden dark:bg-gray-800/60 dark:border-gray-800">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center space-x-3">
                    <div className={`bg-gray-100 p-3 rounded-xl dark:bg-gray-800`}><Icon className={`w-8 h-8 ${iconColor}`} /></div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                {data.length > 0 ? (
                    <table className="min-w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">อันดับ</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">ชื่อ</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">เปอร์เซ็นต์</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {data.map((entry, index) => (
                                <tr key={entry.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-400 text-yellow-900' : index === 1 ? 'bg-gray-400 text-gray-900' : index === 2 ? 'bg-orange-400 text-orange-900' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-white'}`}>{index + 1}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900 dark:text-white">{entry.userName}</div></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${typeof entry.percentage === 'number' && entry.percentage >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 
                                             typeof entry.percentage === 'number' && entry.percentage >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : 
                                             'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                                            {typeof entry.percentage === 'number' ? `${entry.percentage.toFixed(1)}%` : 'N/A'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-12 text-center">
                        <TrendingUp className="w-16 h-16 text-gray-400 dark:text-gray-700 mx-auto mb-4" />
                        <p className="text-xl text-gray-500 dark:text-gray-400 font-medium">ยังไม่มีข้อมูลคะแนน</p>
                    </div>
                )}
            </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ userRole }) => {
  const navigate = useNavigate();
  const { scores, quizSets } = useQuizContext();
  const [leaderboard, setLeaderboard] = useState<FirebaseScore[]>([]);
  const [bottomLeaderboard, setBottomLeaderboard] = useState<FirebaseScore[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);

  useEffect(() => {
    const fetchLeaderboards = async () => {
      setIsLoadingLeaderboard(true);
      try {
        const topScoresData = await scoresService.getTopScores(10);
        const bottomScoresData = await scoresService.getBottomScores(10);
        
        const quizSetIds = new Set(quizSets.filter(qs => !qs.isSurvey).map(qs => qs.id));
        setLeaderboard(topScoresData.filter(score => quizSetIds.has(score.setId)));
        setBottomLeaderboard(bottomScoresData.filter(score => quizSetIds.has(score.setId)));

      } catch (error) {
        console.error("Failed to fetch leaderboards:", error);
        setLeaderboard([]);
        setBottomLeaderboard([]);
      } finally {
        setIsLoadingLeaderboard(false);
      }
    };
    
    if (quizSets.length > 0) {
        fetchLeaderboards();
    } else {
        setIsLoadingLeaderboard(false);
        setLeaderboard([]);
        setBottomLeaderboard([]);
    }
  }, [quizSets]);

  const totalQuizSets = quizSets?.length || 0;
  const totalTakers = new Set(scores.map(s => s.userId)).size;

  const statCards = [
    { title: 'จำนวนชุดข้อสอบทั้งหมด', value: totalQuizSets, icon: ClipboardList, iconColor: 'text-red-500 dark:text-red-400' },
    { title: 'จำนวนผู้เข้าสอบทั้งหมด', value: totalTakers, icon: Users, iconColor: 'text-red-500 dark:text-red-400' }
  ];

  const primaryAction = { title: 'เข้าทำข้อสอบ', description: 'เลือกชุดข้อสอบเพื่อเริ่ม', icon: Play, action: () => navigate('/quiz-selection') };
  
  const secondaryActions = [
    { title: 'เพิ่มข้อสอบ', description: 'เพิ่มข้อสอบใหม่เข้าระบบ', icon: Plus, action: () => navigate('/add-question') },
    { title: 'จัดการคลังข้อสอบ', description: 'แก้ไขหรือลบคำถามในระบบ', icon: ListChecks, action: () => navigate('/manage-questions') },
    { title: 'จัดการชุดข้อสอบ', description: 'สร้าง แก้ไข หรือลบชุดข้อสอบ', icon: BookCopy, action: () => navigate('/manage-sets') },
    { title: 'จัดการแผนก', description: 'เพิ่ม/ลบ/แก้ไขแผนก', icon: Building2, action: () => navigate('/manage-departments') },
    { title: 'จัดการผู้ใช้งาน', description: 'ดู แก้ไข หรือลบผู้ใช้งาน', icon: UserCog, action: () => navigate('/manage-users') },
    { title: 'วิเคราะห์ข้อมูล', description: 'ดูข้อมูลสรุปและกราฟต่างๆ', icon: PieChart, action: () => navigate('/analytics') },
    { title: 'ผลแบบสอบถาม', description: 'ดูผลสรุปจากแบบสอบถาม', icon: FileText, action: () => navigate('/survey-report') },
    { title: 'สรุปคะแนนรวม', description: 'ดูอันดับคะแนนรวมของทุกคน', icon: Award, action: () => navigate('/user-summary') },
  ];

  return (
    <div className="space-y-8">
      {userRole === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {statCards.map((stat) => (
            <div key={stat.title} className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm dark:bg-gray-800/60 dark:border-gray-800">
              <div className="flex items-center space-x-6">
                <div className={`bg-red-100 p-4 rounded-xl dark:bg-red-900/30`}><stat.icon className={`w-8 h-8 ${stat.iconColor}`} /></div>
                <div>
                  <p className="text-gray-500 text-lg font-medium dark:text-gray-400">{stat.title}</p>
                  <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">{stat.value.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- THIS IS THE MISSING CARD --- */}
      <div className="space-y-6">
        <button onClick={primaryAction.action} className="group w-full bg-white border border-gray-200 p-8 rounded-2xl shadow-sm hover:border-red-300 hover:shadow-md dark:bg-gray-800/60 dark:border-gray-800 dark:hover:shadow-red-900/30 dark:hover:border-red-800/50 transition-all duration-300 text-left flex items-center space-x-6">
          <div className="bg-red-100 text-[#d93327] p-4 inline-block rounded-2xl dark:bg-red-900/30">
            <primaryAction.icon className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-3xl font-bold mb-1 text-gray-900 dark:text-white">{primaryAction.title}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-lg">{primaryAction.description}</p>
          </div>
        </button>
      {/* --- END OF MISSING CARD SECTION --- */}

        {userRole === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {secondaryActions.map((button) => (
              <button key={button.title} onClick={button.action} className="group bg-white border border-gray-200 text-gray-800 p-6 rounded-2xl shadow-sm hover:border-red-500 hover:shadow-md dark:bg-gray-800/60 dark:border-gray-800 dark:text-white dark:hover:shadow-red-700 dark:hover:border-red-800/50 transition-all duration-300 text-left">
                <div className="bg-red-100 text-[#d93327] p-3 inline-block rounded-xl mb-4 dark:bg-red-900/30">
                  <button.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">{button.title}</h3>
                <p className="text-gray-500 dark:text-gray-400">{button.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
          <div className="flex justify-between items-center mb-4">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">สรุปผลคะแนน</h2>
              {userRole === 'admin' && (
                  <button 
                      onClick={() => navigate('/scores')}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-200 dark:bg-gray-800/60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
                  >
                      <BarChartHorizontal className="w-5 h-5" />
                      <span>ดูรายงานทั้งหมด</span>
                  </button>
              )}
          </div>
          {isLoadingLeaderboard ? (
            <div className="p-12 text-center text-gray-500">กำลังโหลด Leaderboard...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <LeaderboardTable 
                    title="🏆 10 อันดับคะแนนสูงสุด" 
                    icon={Trophy} 
                    data={leaderboard} 
                    iconColor="text-yellow-500 dark:text-yellow-400"
                />
                <LeaderboardTable 
                    title="📉 10 อันดับคะแนนต่ำสุด" 
                    icon={TrendingDown} 
                    data={bottomLeaderboard} 
                    iconColor="text-blue-500 dark:text-blue-400"
                />
            </div>
          )}
      </div>

    </div>
  );
};

export default Dashboard;