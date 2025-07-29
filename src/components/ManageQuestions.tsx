import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, ChevronLeft, ChevronRight, Plus, Filter, Search, Loader2 } from 'lucide-react'; // แก้ไข: เพิ่ม Loader2
import { useQuizContext } from '../context/QuizContext';
import { useNotification } from '../context/NotificationContext';
import { FirebaseQuestion } from '../services/firebaseService';

// Component for the Edit Modal
const EditQuestionModal: React.FC<{
    question: FirebaseQuestion;
    onClose: () => void;
    onSave: (id: string, updates: Partial<FirebaseQuestion>) => Promise<void>;
}> = ({ question, onClose, onSave }) => {
    const [editedQuestion, setEditedQuestion] = useState(question);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(question.id!, { text: editedQuestion.text, imageUrl: editedQuestion.imageUrl });
        setIsSaving(false);
        onClose();
    };
    
    const formInputStyle = "w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-red-500 focus:border-red-500";
    const formLabelStyle = "block text-lg font-semibold text-gray-300 mb-2";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-xl w-full max-w-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6">แก้ไขคำถาม</h2>
                <div className="space-y-4">
                    <div>
                        <label className={formLabelStyle}>คำถาม</label>
                        <textarea 
                            value={editedQuestion.text} 
                            onChange={(e) => setEditedQuestion(prev => ({ ...prev, text: e.target.value }))} 
                            rows={4} 
                            className={`${formInputStyle} resize-none`} 
                        />
                    </div>
                     <div>
                        <label className={formLabelStyle}>URL รูปภาพ (ถ้ามี)</label>
                        <input 
                            type="text"
                            value={editedQuestion.imageUrl || ''} 
                            onChange={(e) => setEditedQuestion(prev => ({ ...prev, imageUrl: e.target.value }))} 
                            className={formInputStyle}
                            placeholder="https://example.com/image.png"
                        />
                    </div>
                </div>
                <div className="flex space-x-4 mt-8">
                    <button onClick={onClose} className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-xl font-semibold hover:bg-gray-600 transition-colors">ยกเลิก</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex-1 px-6 py-3 bg-[#d93327] text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">{isSaving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                </div>
            </div>
        </div>
    );
};


const ManageQuestions: React.FC = () => {
  const navigate = useNavigate();
  const { questions, quizSets, deleteQuestion, updateQuestion, refreshData } = useQuizContext();
  const { showNotification, showConfirmation } = useNotification();
  
  const [quizSetFilter, setQuizSetFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingQuestion, setEditingQuestion] = useState<FirebaseQuestion | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null); // แก้ไข: เพิ่ม state สำหรับ loading
  const itemsPerPage = 10;

  const filteredQuestions = useMemo(() => {
    let questionsToFilter = [...questions];
    if (quizSetFilter !== 'all') {
      questionsToFilter = questionsToFilter.filter(q => q.setId === quizSetFilter);
    }
    if (searchTerm.trim() !== '') {
        questionsToFilter = questionsToFilter.filter(q => 
            q.text.toLowerCase().includes(searchTerm.trim().toLowerCase())
        );
    }
    return questionsToFilter;
  }, [questions, quizSetFilter, searchTerm]);

  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
  const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getQuizSetName = (setId: string) => {
    return quizSets.find(set => set.id === setId)?.name || 'N/A';
  };

  const handleSaveEdit = async (id: string, updates: Partial<FirebaseQuestion>) => {
    try {
        await updateQuestion(id, updates);
        await refreshData();
        showNotification('สำเร็จ', 'แก้ไขคำถามเรียบร้อยแล้ว', 'success');
    } catch (error) {
        showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถแก้ไขคำถามได้', 'error');
    }
  };

  const handleDelete = (question: FirebaseQuestion) => {
    showConfirmation(
        'ยืนยันการลบ',
        `ต้องการลบคำถาม "${question.text.substring(0, 50)}..." ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
        async () => {
            setDeletingQuestionId(question.id!); // แก้ไข: ตั้งค่า ID ที่กำลังลบ
            try {
                await deleteQuestion(question.id!);
                await refreshData();
                showNotification('สำเร็จ', 'ลบคำถามเรียบร้อยแล้ว', 'success');
            } catch (error) {
                showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถลบคำถามได้', 'error');
            } finally {
                setDeletingQuestionId(null); // แก้ไข: ล้างค่า ID ออก
            }
        }
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {editingQuestion && <EditQuestionModal question={editingQuestion} onClose={() => setEditingQuestion(null)} onSave={handleSaveEdit} />}
      
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" /> <span>กลับหน้าหลัก</span>
        </button>
        <h1 className="text-3xl font-bold text-white">จัดการคลังข้อสอบ</h1>
        <button onClick={() => navigate('/add-question')} className="flex items-center space-x-2 px-4 py-2 bg-[#d93327] text-white rounded-xl hover:bg-red-700 transition-colors">
          <Plus className="w-4 h-4" /> <span>เพิ่มข้อสอบ</span>
        </button>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex flex-wrap items-center gap-6">
            <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <label htmlFor="quizset-filter" className="text-lg font-medium text-gray-300">ชุดข้อสอบ:</label>
                <select
                    id="quizset-filter"
                    value={quizSetFilter}
                    onChange={(e) => { setQuizSetFilter(e.target.value); setCurrentPage(1); }}
                    className="bg-gray-800 border border-gray-700 rounded-xl text-white px-4 py-2 focus:ring-2 focus:ring-red-500"
                >
                    <option value="all">ทุกชุดข้อสอบ</option>
                    {quizSets.map(set => (
                        <option key={set.id} value={set.id!}>{set.name}</option>
                    ))}
                </select>
            </div>
            <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="ค้นหาคำถาม..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="bg-gray-800 border border-gray-700 rounded-xl text-white px-4 py-2 focus:ring-2 focus:ring-red-500"
                />
            </div>
        </div>

        <div className="overflow-x-auto">
          {paginatedQuestions.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">คำถาม</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ชุดข้อสอบ</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {paginatedQuestions.map((question) => (
                  <tr key={question.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                        <p className="text-white line-clamp-2" title={question.text}>{question.text}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{getQuizSetName(question.setId)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center space-x-2">
                        <button onClick={() => setEditingQuestion(question)} className="p-2 text-blue-400 hover:bg-blue-900/50 rounded-lg transition-colors" title="แก้ไข"><Edit className="w-5 h-5" /></button>
                        {/* แก้ไข: เพิ่มเงื่อนไขแสดง Loader */}
                        <button onClick={() => handleDelete(question)} disabled={deletingQuestionId === question.id} className="p-2 text-red-500 hover:bg-red-900/50 rounded-lg transition-colors disabled:opacity-50" title="ลบ">
                            {deletingQuestionId === question.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-500">ไม่พบคำถามที่ตรงกับตัวกรอง</div>
          )}
        </div>
        
        {totalPages > 1 && (
            <div className="p-4 border-t border-gray-800 flex items-center justify-between text-gray-400">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50">
                    <ChevronLeft className="w-4 h-4" /><span>ก่อนหน้า</span>
                </button>
                <span>หน้า {currentPage} จาก {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50">
                    <span>ถัดไป</span><ChevronRight className="w-4 h-4" />
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default ManageQuestions;