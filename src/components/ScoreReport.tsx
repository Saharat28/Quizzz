import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Filter, Search, Trash2, Loader2, Download } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { FirebaseScore } from '../services/firebaseService';
import * as XLSX from 'xlsx';

const ScoreReport: React.FC = () => {
  const navigate = useNavigate();
  const { scores, departments, quizSets, deleteScore, deleteMultipleScores } = useQuizContext();
  const { userProfile } = useAuth();
  const { showConfirmation, showNotification } = useNotification();

  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [quizSetFilter, setQuizSetFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [deletingScoreId, setDeletingScoreId] = useState<string | null>(null);
  
  const [selectedScores, setSelectedScores] = useState<string[]>([]);

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

  // Clear selection when filters change
  useEffect(() => {
    setSelectedScores([]);
  }, [departmentFilter, quizSetFilter, searchTerm, currentPage]);

  const totalPages = Math.ceil(filteredScores.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedScores = filteredScores.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectOne = (id: string) => {
    setSelectedScores(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedScores.length === paginatedScores.length) {
      setSelectedScores([]);
    } else {
      setSelectedScores(paginatedScores.map(s => s.id!));
    }
  };

  const handleExport = () => {
    if (filteredScores.length === 0) {
      showNotification('ไม่มีข้อมูล', 'ไม่พบข้อมูลคะแนนตามที่กรองไว้', 'info');
      return;
    }
    const dataToExport = filteredScores.map(score => ({
      'ชื่อ-นามสกุล': score.userName,
      'แผนก': score.department,
      'ชุดข้อสอบ': score.setName,
      'คะแนน': score.score,
      'คะแนนเต็ม': score.totalQuestions,
      'เปอร์เซ็นต์ (%)': score.percentage.toFixed(1),
      'วันที่': score.timestamp instanceof Date ? score.timestamp.toLocaleDateString('th-TH') : 'N/A',
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    worksheet['!cols'] = [ { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Score Report');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Score_Report_${today}.xlsx`);
  };

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value);
    setCurrentPage(1);
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleDeleteScore = (score: FirebaseScore) => {
    showConfirmation('ยืนยันการลบ', `ต้องการลบประวัติการสอบของ "${score.userName}" สำหรับชุด "${score.setName}" หรือไม่?`, async () => {
        setDeletingScoreId(score.id!);
        try {
            await deleteScore(score.id!);
            showNotification('สำเร็จ', 'ลบประวัติการสอบเรียบร้อย', 'success');
        } catch (error) {
            showNotification('ผิดพลาด', 'ไม่สามารถลบประวัติได้', 'error');
        } finally {
            setDeletingScoreId(null);
        }
      }
    );
  };
  
  const handleBulkDelete = () => {
    if (selectedScores.length === 0) return;
    showConfirmation('ยืนยันการลบ', `ต้องการลบประวัติการสอบที่เลือกทั้งหมด ${selectedScores.length} รายการ ใช่หรือไม่?`, async () => {
        try {
          await deleteMultipleScores(selectedScores);
          showNotification('สำเร็จ', 'ลบรายการที่เลือกเรียบร้อยแล้ว', 'success');
          setSelectedScores([]);
        } catch (error) {
          console.error("Bulk delete failed:", error);
          showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถลบรายการที่เลือกได้', 'error');
        }
      }, 'warning'
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">กลับหน้าหลัก</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">รายงานคะแนนทั้งหมด</h1>
        <div className="w-36"></div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden dark:bg-gray-900/50 dark:border-gray-800">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-6">
            <div className='flex flex-wrap items-center gap-6'>
                <div className="flex items-center space-x-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <label htmlFor="department-filter" className="text-lg font-medium text-gray-700 dark:text-gray-300">แผนก:</label>
                    <select id="department-filter" value={departmentFilter} onChange={handleFilterChange(setDepartmentFilter)} className="bg-gray-100 border border-gray-300 rounded-xl text-gray-900 px-4 py-2 focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                        <option value="all">ทุกแผนก</option>
                        {departments.map(dept => (<option key={dept.id} value={dept.name}>{dept.name}</option>))}
                    </select>
                </div>
                <div className="flex items-center space-x-2">
                    <label htmlFor="quizset-filter" className="text-lg font-medium text-gray-700 dark:text-gray-300">ชุดข้อสอบ:</label>
                    <select id="quizset-filter" value={quizSetFilter} onChange={handleFilterChange(setQuizSetFilter)} className="bg-gray-100 border border-gray-300 rounded-xl text-gray-900 px-4 py-2 focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                        <option value="all">ทุกชุดข้อสอบ</option>
                        {quizSets.map(set => (<option key={set.id} value={set.id!}>{set.name}</option>))}
                    </select>
                </div>
                <div className="flex items-center space-x-2">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input type="text" placeholder="ค้นหาด้วยชื่อ..." value={searchTerm} onChange={handleSearchChange} className="bg-gray-100 border border-gray-300 rounded-xl text-gray-900 px-4 py-2 focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"/>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                {selectedScores.length > 0 && (
                    <button onClick={handleBulkDelete} className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700">
                        <Trash2 className="w-4 h-4" />
                        <span>ลบ ({selectedScores.length})</span>
                    </button>
                )}
                <button onClick={handleExport} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700">
                    <Download className="w-4 h-4" />
                    <span>Export to Excel</span>
                </button>
            </div>
        </div>

        <div className="overflow-x-auto">
          {paginatedScores.length > 0 ? (
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-center w-12">
                    <input type="checkbox"
                      className="form-checkbox h-5 w-5 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                      checked={paginatedScores.length > 0 && selectedScores.length === paginatedScores.length}
                      onChange={handleSelectAll}
                      title="เลือกทั้งหมดในหน้านี้"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ชื่อ-นามสกุล</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">แผนก</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ชุดข้อสอบ</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">คะแนน</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">เปอร์เซ็นต์</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">วันที่</th>
                  {isAdmin && <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {paginatedScores.map((entry) => (
                  <tr key={entry.id} className={`transition-colors ${selectedScores.includes(entry.id!) ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                    <td className="px-6 py-4 text-center">
                      <input type="checkbox"
                        className="form-checkbox h-5 w-5 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                        checked={selectedScores.includes(entry.id!)}
                        onChange={() => handleSelectOne(entry.id!)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link to={`/profile/${entry.userId}`} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:underline">
                        {entry.userName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{entry.department || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{entry.setName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white">{entry.score}/{entry.totalQuestions}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${typeof entry.percentage === 'number' && entry.percentage >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 
                             typeof entry.percentage === 'number' && entry.percentage >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : 
                             'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                            {typeof entry.percentage === 'number' ? `${entry.percentage.toFixed(1)}%` : 'N/A'}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-500">
                        {entry.timestamp instanceof Date ? entry.timestamp.toLocaleDateString('th-TH') : 'N/A'}
                    </td>
                    {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <button onClick={() => handleDeleteScore(entry)} disabled={deletingScoreId === entry.id} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait" title="Delete this record">
                                {deletingScoreId === entry.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                            </button>
                        </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-500">ไม่พบข้อมูลคะแนนตามที่กรองไว้</div>
          )}
        </div>
        
        {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-gray-500 dark:text-gray-400">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:hover:bg-gray-700">
                    <ChevronLeft className="w-4 h-4" />
                    <span>ก่อนหน้า</span>
                </button>
                <span>หน้า {currentPage} จาก {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:hover:bg-gray-700">
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