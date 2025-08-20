import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Filter, Search, Trash2, Loader2, Download } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { FirebaseScore } from '../services/firebaseService';
import * as XLSX from 'xlsx';

const ScoreReport: React.FC = () => {
  const navigate = useNavigate();
  const { scores, departments, quizSets, deleteScore } = useQuizContext();
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

  const handleExport = () => {
    if (filteredScores.length === 0) {
      showNotification('No Data', 'No score data found matching the filters to export.', 'info');
      return;
    }
    const dataToExport = filteredScores.map(score => ({
      'Name-Surname': score.userName,
      'Department': score.department,
      'Quiz Set': score.setName,
      'Score': score.score,
      'Total Score': score.totalQuestions,
      'Percentage (%)': score.percentage.toFixed(1),
      'Date': score.timestamp instanceof Date ? score.timestamp.toLocaleDateString('en-CA') : 'N/A',
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
    showConfirmation('Confirm Deletion', `Are you sure you want to delete the test record of "${score.userName}" for the quiz set "${score.setName}"?`, async () => {
        setDeletingScoreId(score.id!);
        try {
            await deleteScore(score.id!);
            showNotification('Success', 'Test record deleted successfully.', 'success');
        } catch (error) {
            showNotification('Error', 'Could not delete the record.', 'error');
        } finally {
            setDeletingScoreId(null);
        }
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Home</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Full Score Report</h1>
        <div className="w-36"></div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden dark:bg-gray-900/50 dark:border-gray-800">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-6">
            <div className='flex flex-wrap items-center gap-6'>
                <div className="flex items-center space-x-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <label htmlFor="department-filter" className="text-lg font-medium text-gray-700 dark:text-gray-300">Department:</label>
                    <select id="department-filter" value={departmentFilter} onChange={handleFilterChange(setDepartmentFilter)} className="bg-gray-100 border border-gray-300 rounded-xl text-gray-900 px-4 py-2 focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                        <option value="all">All Departments</option>
                        {departments.map(dept => (<option key={dept.id} value={dept.name}>{dept.name}</option>))}
                    </select>
                </div>
                <div className="flex items-center space-x-2">
                    <label htmlFor="quizset-filter" className="text-lg font-medium text-gray-700 dark:text-gray-300">Quiz Set:</label>
                    <select id="quizset-filter" value={quizSetFilter} onChange={handleFilterChange(setQuizSetFilter)} className="bg-gray-100 border border-gray-300 rounded-xl text-gray-900 px-4 py-2 focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                        <option value="all">All Quiz Sets</option>
                        {quizSets.map(set => (<option key={set.id} value={set.id!}>{set.name}</option>))}
                    </select>
                </div>
                <div className="flex items-center space-x-2">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input type="text" placeholder="Search by name..." value={searchTerm} onChange={handleSearchChange} className="bg-gray-100 border border-gray-300 rounded-xl text-gray-900 px-4 py-2 focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"/>
                </div>
            </div>
            
            <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
            >
                <Download className="w-4 h-4" />
                <span>Export to Excel</span>
            </button>
        </div>

        <div className="overflow-x-auto">
          {paginatedScores.length > 0 ? (
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name-Surname</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quiz Set</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Percentage</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  {isAdmin && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Manage</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {paginatedScores.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
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
                        {entry.timestamp instanceof Date ? entry.timestamp.toLocaleDateString('en-CA') : 'N/A'}
                    </td>
                    {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
            <div className="p-12 text-center text-gray-500">No score data matching the filters was found.</div>
          )}
        </div>
        
        {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-gray-500 dark:text-gray-400">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:hover:bg-gray-700">
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:hover:bg-gray-700">
                     <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default ScoreReport;