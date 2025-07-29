import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Filter, Search, Trash2, Loader2 } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { FirebaseScore } from '../services/firebaseService';

const ScoreReport: React.FC = () => {
  const navigate = useNavigate();
  const { scores, departments, quizSets, deleteScore, refreshData } = useQuizContext();
  const { userProfile } = useAuth();
  const { showConfirmation, showNotification } = useNotification();

  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [quizSetFilter, setQuizSetFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [deletingScoreId, setDeletingScoreId] = useState<string | null>(null);
  const isAdmin = userProfile?.role === 'admin';

  const filteredScores = useMemo(() => {
    let filtered = [...scores].sort((a, b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime());
    
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(score => score.department === departmentFilter);
    }
    if (quizSetFilter !== 'all') {
      filtered = filtered.filter(score => score.setId === quizSetFilter);
    }
    if (searchTerm.trim() !== '') {
        filtered = filtered.filter(score => 
            score.userName.toLowerCase().includes(searchTerm.trim().toLowerCase())
        );
    }
    
    return filtered;
  }, [scores, departmentFilter, quizSetFilter, searchTerm]);

  const totalPages = Math.ceil(filteredScores.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedScores = filteredScores.slice(startIndex, startIndex + itemsPerPage);

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value);
    setCurrentPage(1);
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleDeleteScore = (score: FirebaseScore) => {
    showConfirmation(
        'ยืนยันการลบ',
        `ต้องการลบประวัติการสอบของ "${score.userName}" ในชุดข้อสอบ "${score.setName}" ใช่หรือไม่?`,
        async () => {
            setDeletingScoreId(score.id!);
            try {
                await deleteScore(score.id!);
                showNotification('สำเร็จ', 'ลบประวัติการสอบเรียบร้อยแล้ว', 'success');
            } catch (error) {
                showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error');
            } finally {
                setDeletingScoreId(null);
            }
        }
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">กลับหน้าหลัก</span>
        </button>
        <h1 className="text-3xl font-bold text-white">รายงานผลคะแนนทั้งหมด</h1>
        <div className="w-36"></div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex flex-wrap items-center gap-6">
            <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <label htmlFor="department-filter" className="text-lg font-medium text-gray-300">แผนก:</label>
                <select id="department-filter" value={departmentFilter} onChange={handleFilterChange(setDepartmentFilter)} className="bg-gray-800 border border-gray-700 rounded-xl text-white px-4 py-2 focus:ring-2 focus:ring-red-500">
                    <option value="all">ทุกแผนก</option>
                    {departments.map(dept => (<option key={dept.id} value={dept.name}>{dept.name}</option>))}
                </select>
            </div>
            <div className="flex items-center space-x-2">
                <label htmlFor="quizset-filter" className="text-lg font-medium text-gray-300">ชุดข้อสอบ:</label>
                <select id="quizset-filter" value={quizSetFilter} onChange={handleFilterChange(setQuizSetFilter)} className="bg-gray-800 border border-gray-700 rounded-xl text-white px-4 py-2 focus:ring-2 focus:ring-red-500">
                    <option value="all">ทุกชุดข้อสอบ</option>
                    {quizSets.map(set => (<option key={set.id} value={set.id!}>{set.name}</option>))}
                </select>
            </div>
            <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-gray-400" />
                <input type="text" placeholder="ค้นหาชื่อ..." value={searchTerm} onChange={handleSearchChange} className="bg-gray-800 border border-gray-700 rounded-xl text-white px-4 py-2 focus:ring-2 focus:ring-red-500"/>
            </div>
        </div>

        <div className="overflow-x-auto">
          {paginatedScores.length > 0 ? (
            <table className="min-w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ชื่อ - นามสกุล</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">แผนก</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ชุดข้อสอบ</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">คะแนน</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">เปอร์เซ็นต์</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">วันที่ทำ</th>
                  {isAdmin && <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {paginatedScores.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link to={`/profile/${entry.userId}`} className="text-red-400 hover:text-red-300 hover:underline">
                        {entry.userName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{entry.department || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{entry.setName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-white">{entry.score}/{entry.totalQuestions}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${typeof entry.percentage === 'number' && entry.percentage >= 80 ? 'bg-green-900/50 text-green-300' : typeof entry.percentage === 'number' && entry.percentage >= 60 ? 'bg-yellow-900/50 text-yellow-300' : 'bg-red-900/50 text-red-300'}`}>
                            {typeof entry.percentage === 'number' ? `${entry.percentage.toFixed(1)}%` : 'N/A'}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                        {entry.timestamp instanceof Date ? entry.timestamp.toLocaleDateString('th-TH') : 'N/A'}
                    </td>
                    {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onClick={() => handleDeleteScore(entry)} disabled={deletingScoreId === entry.id} className="p-2 text-red-500 hover:bg-red-900/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait" title="ลบประวัติการสอบนี้">
                                {deletingScoreId === entry.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                            </button>
                        </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-500">ไม่พบข้อมูลคะแนนที่ตรงกับตัวกรอง</div>
          )}
        </div>
        
        {totalPages > 1 && (
            <div className="p-4 border-t border-gray-800 flex items-center justify-between text-gray-400">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" />
                    <span>ก่อนหน้า</span>
                </button>
                <span>หน้า {currentPage} จาก {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                     <span>ถัดไป</span>
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default ScoreReport;