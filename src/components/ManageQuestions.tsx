import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, ChevronLeft, ChevronRight, Plus, Filter, Search, Loader2, Upload, Download } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { useNotification } from '../context/NotificationContext';
import { FirebaseQuestion, QuestionType } from '../services/firebaseService';
import * as XLSX from 'xlsx';

// EditQuestionModal component remains the same
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
  const { questions, quizSets, addMultipleQuestions, deleteQuestion, deleteMultipleQuestions, updateQuestion } = useQuizContext();
  const { showNotification, showConfirmation } = useNotification();
  
  const [quizSetFilter, setQuizSetFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingQuestion, setEditingQuestion] = useState<FirebaseQuestion | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const itemsPerPage = 10;
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const paginatedQuestions = useMemo(() => {
     return filteredQuestions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  },[filteredQuestions, currentPage]);

  const handleSelectOne = (id: string) => {
    setSelectedQuestions(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedQuestions.length === paginatedQuestions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(paginatedQuestions.map(q => q.id!));
    }
  };

  const handleBulkDelete = () => {
    if (selectedQuestions.length === 0) return;
    showConfirmation('ยืนยันการลบ', `ต้องการลบคำถามที่เลือกทั้งหมด ${selectedQuestions.length} ข้อ ใช่หรือไม่?`, async () => {
        try {
          await deleteMultipleQuestions(selectedQuestions);
          showNotification('สำเร็จ', 'ลบคำถามที่เลือกเรียบร้อยแล้ว', 'success');
          setSelectedQuestions([]);
        } catch (error) { showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถลบคำถามได้', 'error'); }
      }, 'warning' 
    );
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet) as any[];

            if (json.length === 0) { throw new Error('ไม่พบข้อมูลในไฟล์ Excel'); }

            const newQuestions: Omit<FirebaseQuestion, 'id' | 'createdAt' | 'correctCount' | 'incorrectCount'>[] = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                const rowNum = i + 2;
                if (!row.setId || !row.type || !row.text || !row.correctAnswer) {
                    throw new Error(`ข้อมูลแถวที่ ${rowNum} ไม่สมบูรณ์ กรุณาตรวจสอบคอลัมน์ setId, type, text, correctAnswer`);
                }
                const question: any = {
                    setId: String(row.setId).trim(),
                    type: String(row.type).trim() as QuestionType,
                    text: String(row.text).trim(),
                    imageUrl: row.imageUrl ? String(row.imageUrl).trim() : '',
                };
                if (['multiple_choice_single', 'multiple_choice_multiple', 'true_false'].includes(question.type)) {
                    if (!row.options || typeof row.options !== 'string') throw new Error(`แถวที่ ${rowNum}: คอลัมน์ options ไม่ถูกต้อง`);
                    question.options = row.options.split(',').map((opt: string) => opt.trim());
                }
                if (question.type === 'multiple_choice_multiple') {
                    if (typeof row.correctAnswer !== 'string') throw new Error(`แถวที่ ${rowNum}: correctAnswer สำหรับ multiple_choice_multiple ต้องคั่นด้วยจุลภาค`);
                    question.correctAnswer = row.correctAnswer.split(',').map((ans: string) => ans.trim());
                } else {
                    question.correctAnswer = String(row.correctAnswer).trim();
                }
                newQuestions.push(question);
            }
            showConfirmation('ยืนยันการนำเข้า', `พบคำถาม ${newQuestions.length} ข้อ คุณต้องการนำเข้าทั้งหมดใช่หรือไม่?`, async () => {
                await addMultipleQuestions(newQuestions);
                showNotification('สำเร็จ!', `นำเข้าคำถาม ${newQuestions.length} ข้อเรียบร้อยแล้ว`, 'success');
            });
        } catch (error: any) {
            showNotification('นำเข้าไม่สำเร็จ', error.message, 'error');
        } finally {
            setIsImporting(false);
            if (event.target) event.target.value = '';
        }
    };
    reader.onerror = () => {
        showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถอ่านไฟล์ได้', 'error');
        setIsImporting(false);
    };
    reader.readAsArrayBuffer(file);
  };
  
  const handleDownloadTemplate = () => {
    // 1. เตรียมข้อมูลสำหรับชีทแรก (แม่แบบคำถาม)
    const templateHeaders = ['setId', 'type', 'text', 'options', 'correctAnswer', 'imageUrl'];
    const templateExampleData = [
        {
            setId: 'คัดลอก ID จากชีท "Available Quiz Set IDs" มาวางที่นี่',
            type: 'multiple_choice_single',
            text: 'พระอาทิตย์ขึ้นทางทิศไหน?',
            options: 'ตะวันออก,ตะวันตก,เหนือ,ใต้',
            correctAnswer: 'ตะวันออก',
            imageUrl: 'https://example.com/sun.png'
        },
        {
            setId: 'คัดลอก ID จากชีท "Available Quiz Set IDs" มาวางที่นี่',
            type: 'multiple_choice_multiple',
            text: 'ข้อใดคือส่วนประกอบของน้ำ?',
            options: 'ออกซิเจน,ไนโตรเจน,ไฮโดรเจน,คาร์บอน',
            correctAnswer: 'ออกซิเจน,ไฮโดรเจน',
            imageUrl: ''
        },
        {
            setId: 'คัดลอก ID จากชีท "Available Quiz Set IDs" มาวางที่นี่',
            type: 'true_false',
            text: 'ประเทศไทยมี 77 จังหวัด',
            options: 'ถูก,ผิด',
            correctAnswer: 'ถูก',
            imageUrl: ''
        },
        {
            setId: 'คัดลอก ID จากชีท "Available Quiz Set IDs" มาวางที่นี่',
            type: 'fill_in_blank',
            text: 'เมืองหลวงของประเทศไทยคืออะไร?',
            options: '',
            correctAnswer: 'กรุงเทพมหานคร',
            imageUrl: ''
        }
    ];
    const wsTemplate = XLSX.utils.json_to_sheet(templateExampleData, { header: templateHeaders });
    wsTemplate['!cols'] = [ { wch: 40 }, { wch: 30 }, { wch: 50 }, { wch: 40 }, { wch: 40 }, { wch: 30 }];

    // 2. เตรียมข้อมูลสำหรับชีทที่สอง (รายการชุดข้อสอบ)
    const availableSetsData = quizSets.map(set => ({
        'Quiz Set Name': set.name,
        'Quiz Set ID': set.id
    }));
    const wsSets = XLSX.utils.json_to_sheet(availableSetsData);
    wsSets['!cols'] = [ { wch: 40 }, { wch: 30 } ];

    // 3. สร้าง Workbook และเพิ่มชีททั้งสองเข้าไป
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsTemplate, 'Questions Template');
    XLSX.utils.book_append_sheet(workbook, wsSets, 'Available Quiz Set IDs');

    // 4. สั่งดาวน์โหลดไฟล์
    XLSX.writeFile(workbook, 'Question_Template_with_IDs.xlsx');
  };

  const getQuizSetName = (setId: string) => {
    return quizSets.find(set => set.id === setId)?.name || 'N/A';
  };

  const handleSaveEdit = async (id: string, updates: Partial<FirebaseQuestion>) => {
    try {
        await updateQuestion(id, updates);
        showNotification('สำเร็จ', 'แก้ไขคำถามเรียบร้อยแล้ว', 'success');
    } catch (error) { showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถแก้ไขคำถามได้', 'error'); }
  };

  const handleDelete = (question: FirebaseQuestion) => {
    showConfirmation('ยืนยันการลบ', `ต้องการลบคำถาม "${question.text.substring(0, 50)}..." ใช่หรือไม่?`, async () => {
            setDeletingQuestionId(question.id!);
            try {
                await deleteQuestion(question.id!);
                showNotification('สำเร็จ', 'ลบคำถามเรียบร้อยแล้ว', 'success');
            } catch (error) { showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถลบคำถามได้', 'error'); } 
            finally { setDeletingQuestionId(null); }
        }, 'warning'
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

        <div className="flex items-center space-x-2">
            <button 
                onClick={handleDownloadTemplate}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-700 text-white rounded-xl hover:bg-blue-600 transition-colors"
            >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดแม่แบบ</span>
            </button>
            <button 
                onClick={handleImportClick} 
                disabled={isImporting}
                className="flex items-center space-x-2 px-4 py-2 bg-green-700 text-white rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
            >
                <Upload className="w-4 h-4" />
                <span>{isImporting ? 'กำลังนำเข้า...' : 'นำเข้าจาก Excel'}</span>
            </button>
            <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
            />
            <button onClick={() => navigate('/add-question')} className="flex items-center space-x-2 px-4 py-2 bg-[#d93327] text-white rounded-xl hover:bg-red-700 transition-colors">
              <Plus className="w-4 h-4" /> <span>เพิ่มข้อสอบ</span>
            </button>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex flex-wrap items-center justify-between gap-6">
            <div className='flex flex-wrap items-center gap-6'>
                <div className="flex items-center space-x-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <label htmlFor="quizset-filter" className="text-lg font-medium text-gray-300">ชุดข้อสอบ:</label>
                    <select
                        id="quizset-filter"
                        value={quizSetFilter}
                        onChange={(e) => { setQuizSetFilter(e.target.value); setCurrentPage(1); setSelectedQuestions([]); }}
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
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); setSelectedQuestions([]); }}
                        className="bg-gray-800 border border-gray-700 rounded-xl text-white px-4 py-2 focus:ring-2 focus:ring-red-500"
                    />
                </div>
            </div>
            {selectedQuestions.length > 0 && (
                <button 
                    onClick={handleBulkDelete} 
                    className="flex items-center space-x-2 px-4 py-2 bg-red-800 text-red-100 rounded-xl hover:bg-red-700 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                    <span>ลบ {selectedQuestions.length} รายการที่เลือก</span>
                </button>
            )}
        </div>

        <div className="overflow-x-auto">
          {paginatedQuestions.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-center w-12">
                    <input 
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-red-500 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                      checked={paginatedQuestions.length > 0 && selectedQuestions.length === paginatedQuestions.length}
                      onChange={handleSelectAll}
                      title="เลือกทั้งหมดในหน้านี้"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">คำถาม</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ชุดข้อสอบ</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {paginatedQuestions.map((question) => (
                  <tr key={question.id} className={`transition-colors ${selectedQuestions.includes(question.id!) ? 'bg-red-900/20' : 'hover:bg-gray-800/50'}`}>
                    <td className="px-6 py-4 text-center">
                       <input 
                          type="checkbox"
                          className="form-checkbox h-5 w-5 text-red-500 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                          checked={selectedQuestions.includes(question.id!)}
                          onChange={() => handleSelectOne(question.id!)}
                        />
                    </td>
                    <td className="px-6 py-4">
                        <p className="text-white line-clamp-2" title={question.text}>{question.text}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{getQuizSetName(question.setId)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center space-x-2">
                        <button onClick={() => setEditingQuestion(question)} className="p-2 text-blue-400 hover:bg-blue-900/50 rounded-lg transition-colors" title="แก้ไข"><Edit className="w-5 h-5" /></button>
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