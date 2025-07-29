import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Plus, Users, ClipboardList, Trophy, TrendingUp, Building2, BookCopy, BarChartHorizontal, TrendingDown, ListChecks } from 'lucide-react'; // 1. Import icon ใหม่
import { useQuizContext } from '../context/QuizContext';
import type { FirebaseScore } from '../services/firebaseService';

interface DashboardProps {
  userRole: 'admin' | 'user';
}

interface LeaderboardEntry extends FirebaseScore {}

const LeaderboardTable: React.FC<{
    title: string;
    icon: React.ElementType;
    data: LeaderboardEntry[];
    iconColor: string;
}> = ({ title, icon: Icon, data, iconColor }) => {
    return (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-800">
                <div className="flex items-center space-x-3">
                    <div className={`bg-gray-800 p-3 rounded-xl`}><Icon className={`w-8 h-8 ${iconColor}`} /></div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{title}</h2>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                {data.length > 0 ? (
                    <table className="min-w-full">
                        <thead className="bg-gray-800/50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">อันดับ</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ชื่อ</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">เปอร์เซ็นต์</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {data.map((entry, index) => (
                                <tr key={entry.id || index} className="hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-500' : index === 2 ? 'bg-orange-600' : 'bg-gray-700'}`}>{index + 1}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-white">{entry.userName}</div></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${typeof entry.percentage === 'number' && entry.percentage >= 80 ? 'bg-green-900/50 text-green-300' : typeof entry.percentage === 'number' && entry.percentage >= 60 ? 'bg-yellow-900/50 text-yellow-300' : 'bg-red-900/50 text-red-300'}`}>
                                            {typeof entry.percentage === 'number' ? `${entry.percentage.toFixed(1)}%` : 'N/A'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-12 text-center">
                        <TrendingUp className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                        <p className="text-xl text-gray-400 font-medium">ยังไม่มีข้อมูลคะแนน</p>
                    </div>
                )}
            </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ userRole }) => {
  const navigate = useNavigate();
  const { scores, quizSets } = useQuizContext();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [bottomLeaderboard, setBottomLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (scores && scores.length > 0) {
      const sortedTop = [...scores].sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0)).slice(0, 10);
      setLeaderboard(sortedTop as LeaderboardEntry[]);
      const sortedBottom = [...scores].sort((a, b) => (a.percentage ?? 0) - (b.percentage ?? 0)).slice(0, 10);
      setBottomLeaderboard(sortedBottom as LeaderboardEntry[]);
    }
  }, [scores]);

  const totalQuizSets = quizSets?.length || 0;
  const totalTakers = new Set(scores.map(s => s.userId)).size;

  const statCards = [
    { title: 'จำนวนชุดข้อสอบทั้งหมด', value: totalQuizSets, icon: ClipboardList, iconColor: 'text-red-400' },
    { title: 'จำนวนผู้เข้าสอบทั้งหมด', value: totalTakers, icon: Users, iconColor: 'text-red-400' }
  ];

  const primaryAction = { title: 'เข้าทำข้อสอบ', description: 'เลือกชุดข้อสอบเพื่อเริ่ม', icon: Play, action: () => navigate('/quiz-selection') };
  
  // 2. เพิ่มปุ่ม "จัดการคลังข้อสอบ"
  const secondaryActions = [
    { title: 'เพิ่มข้อสอบ', description: 'เพิ่มข้อสอบใหม่เข้าระบบ', icon: Plus, action: () => navigate('/add-question') },
    { title: 'จัดการคลังข้อสอบ', description: 'แก้ไขหรือลบคำถามในระบบ', icon: ListChecks, action: () => navigate('/manage-questions') },
    { title: 'จัดการชุดข้อสอบ', description: 'สร้าง แก้ไข หรือลบชุดข้อสอบ', icon: BookCopy, action: () => navigate('/manage-sets') },
    { title: 'จัดการแผนก', description: 'เพิ่ม/ลบ/แก้ไขแผนก', icon: Building2, action: () => navigate('/manage-departments') }
  ];

  return (
    <div className="space-y-8">
      {userRole === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {statCards.map((stat) => (
            <div key={stat.title} className="bg-gray-900/50 border border-gray-800 p-8 rounded-2xl shadow-lg">
              <div className="flex items-center space-x-6">
                <div className={`bg-red-900/30 p-4 rounded-xl`}><stat.icon className={`w-8 h-8 ${stat.iconColor}`} /></div>
                <div>
                  <p className="text-gray-400 text-lg font-medium">{stat.title}</p>
                  <p className="text-4xl font-bold text-white mt-2">{stat.value.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-6">
        <button onClick={primaryAction.action} className="group w-full bg-gray-900/50 border border-gray-800 text-white p-8 rounded-2xl shadow-lg hover:shadow-red-900/30 hover:border-red-800/50 transition-all duration-300 text-left flex items-center space-x-6">
          <div className="bg-red-900/30 text-[#d93327] p-4 inline-block rounded-2xl">
            <primaryAction.icon className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-3xl font-bold mb-1 text-white">{primaryAction.title}</h3>
            <p className="text-gray-400 text-lg">{primaryAction.description}</p>
          </div>
        </button>

        {/* 3. ปรับ Layout ให้เป็น 2x2 */}
        {userRole === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {secondaryActions.map((button) => (
              <button key={button.title} onClick={button.action} className="group bg-gray-900/50 border border-gray-800 text-white p-6 rounded-2xl shadow-lg hover:shadow-red-900/30 hover:border-red-800/50 transition-all duration-300 text-left">
                <div className="bg-red-900/30 text-[#d93327] p-3 inline-block rounded-xl mb-4">
                  <button.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-1 text-white">{button.title}</h3>
                <p className="text-gray-400">{button.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {userRole === 'admin' && (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold text-white">สรุปผลคะแนน</h2>
                <button 
                    onClick={() => navigate('/scores')}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                    <BarChartHorizontal className="w-5 h-5" />
                    <span>ดูรายงานทั้งหมด</span>
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <LeaderboardTable 
                    title="🏆 10 อันดับคะแนนสูงสุด" 
                    icon={Trophy} 
                    data={leaderboard} 
                    iconColor="text-yellow-400"
                />
                <LeaderboardTable 
                    title="📉 10 อันดับคะแนนต่ำสุด" 
                    icon={TrendingDown} 
                    data={bottomLeaderboard} 
                    iconColor="text-blue-400"
                />
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
