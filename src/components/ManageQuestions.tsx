import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Plus, Filter, Search, Loader2, Upload, Download, MoreHorizontal } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { useNotification } from '../context/NotificationContext';
import { FirebaseQuestion } from '../services/firebaseService';
import * as XLSX from 'xlsx';
import EditQuestionModal from './common/EditQuestionModal';

const ManageQuestions: React.FC = () => {
  const navigate = useNavigate();
  const { 
    quizSets, 
    addMultipleQuestions, 
    deleteQuestion, 
    deleteMultipleQuestions, 
    updateQuestion,
    questionsPaginated,
    fetchMoreQuestions
  } = useQuizContext();
  
  const { showNotification, showConfirmation } = useNotification();
  
  const [quizSetFilter, setQuizSetFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingQuestion, setEditingQuestion] = useState<FirebaseQuestion | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredQuestions = useMemo(() => {
    let questionsToFilter = [...questionsPaginated.data];
    if (quizSetFilter !== 'all') {
      questionsToFilter = questionsToFilter.filter(q => q.setId === quizSetFilter);
    }
    if (searchTerm.trim() !== '') {
        questionsToFilter = questionsToFilter.filter(q => 
            q.text.toLowerCase().includes(searchTerm.trim().toLowerCase())
        );
    }
    return questionsToFilter;
  }, [questionsPaginated.data, quizSetFilter, searchTerm]);

  const handleSelectOne = (id: string) => {
    setSelectedQuestions(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedQuestions.length === filteredQuestions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(filteredQuestions.map(q => q.id!));
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
                const options = [];
                for (let j = 1; j <= 10; j++) {
                    if (row[`option${j}`]) {
                        options.push(String(row[`option${j}`]).trim());
                    }
                }
                const question: any = {
                    setId: String(row.setId).trim(),
                    type: String(row.type).trim(),
                    text: String(row.text).trim(),
                    imageUrl: row.imageUrl ? String(row.imageUrl).trim() : '',
                    options: options,
                };
                if (question.type === 'multiple_choice_multiple') {
                    if (typeof row.correctAnswer !== 'string') throw new Error(`แถวที่ ${rowNum}: correctAnswer สำหรับ multiple_choice_multiple ต้องคั่นด้วยจุลภาค`);
                    question.correctAnswer = row.correctAnswer.split(',').map((ans: string) => ans.trim());
                } else {
                    question.correctAnswer = String(row.correctAnswer).trim();
                }
                if (['multiple_choice_single', 'multiple_choice_multiple', 'true_false'].includes(question.type) && options.length === 0) {
                  throw new Error(`แถวที่ ${rowNum}: คำถามประเภทนี้ต้องมีอย่างน้อย 1 ตัวเลือกในคอลัมน์ option`);
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
    const templateHeaders = ['setId', 'type', 'text', 'option1', 'option2', 'option3', 'option4', 'option5', 'option6', 'correctAnswer', 'imageUrl'];
    const wsTemplate = XLSX.utils.json_to_sheet([], { header: templateHeaders });
    wsTemplate['!cols'] = [ { wch: 30 }, { wch: 25 }, { wch: 50 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 30 }];
    const availableSetsData = quizSets.map(set => ({ 'Quiz Set Name': set.name, 'Quiz Set ID': set.id }));
    const wsSets = XLSX.utils.json_to_sheet(availableSetsData);
    wsSets['!cols'] = [ { wch: 40 }, { wch: 30 } ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsTemplate, 'Questions Template');
    XLSX.utils.book_append_sheet(workbook, wsSets, 'Available Quiz Set IDs');
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
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" /> <span>กลับหน้าหลัก</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">จัดการคลังข้อสอบ</h1>

        <div className="flex items-center space-x-2">
            <button onClick={handleDownloadTemplate} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"><Download className="w-4 h-4" /><span>ดาวน์โหลดแม่แบบ</span></button>
            <button onClick={handleImportClick} disabled={isImporting} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"><Upload className="w-4 h-4" /><span>{isImporting ? 'กำลังนำเข้า...' : 'นำเข้าจาก Excel'}</span></button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
            <button onClick={() => navigate('/add-question')} className="flex items-center space-x-2 px-4 py-2 bg-[#d93327] text-white rounded-xl hover:bg-red-700 transition-colors"><Plus className="w-4 h-4" /> <span>เพิ่มข้อสอบ</span></button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden dark:bg-gray-900/50 dark:border-gray-800">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-6">
            <div className='flex flex-wrap items-center gap-6'>
                <div className="flex items-center space-x-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <label htmlFor="quizset-filter" className="text-lg font-medium text-gray-700 dark:text-gray-300">ชุดข้อสอบ:</label>
                    <select id="quizset-filter" value={quizSetFilter} onChange={(e) => { setQuizSetFilter(e.target.value); setSelectedQuestions([]); }} className="bg-gray-100 border border-gray-300 rounded-xl text-gray-900 px-4 py-2 focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                        <option value="all">ทุกชุดข้อสอบ</option>
                        {quizSets.map(set => (<option key={set.id} value={set.id!}>{set.name}</option>))}
                    </select>
                </div>
                <div className="flex items-center space-x-2">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input type="text" placeholder="ค้นหาคำถาม..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setSelectedQuestions([]); }} className="bg-gray-100 border border-gray-300 rounded-xl text-gray-900 px-4 py-2 focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"/>
                </div>
            </div>
            {selectedQuestions.length > 0 && (<button onClick={handleBulkDelete} className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"><Trash2 className="w-4 h-4" /><span>ลบ {selectedQuestions.length} รายการที่เลือก</span></button>)}
        </div>

        <div className="overflow-x-auto">
          {questionsPaginated.loading ? (
             <div className="p-12 text-center text-gray-500"><Loader2 className="w-8 h-8 mx-auto animate-spin" /> <p>กำลังโหลดคำถาม...</p></div>
          ) : filteredQuestions.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-center w-12"><input type="checkbox" className="form-checkbox h-5 w-5 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600" checked={filteredQuestions.length > 0 && selectedQuestions.length === filteredQuestions.length} onChange={handleSelectAll} title="เลือกทั้งหมดในหน้านี้" /></th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">คำถาม</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ชุดข้อสอบ</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredQuestions.map((question) => (
                  <tr key={question.id} className={`transition-colors ${selectedQuestions.includes(question.id!) ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                    <td className="px-6 py-4 text-center"><input type="checkbox" className="form-checkbox h-5 w-5 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600" checked={selectedQuestions.includes(question.id!)} onChange={() => handleSelectOne(question.id!)} /></td>
                    <td className="px-6 py-4"><p className="text-gray-900 dark:text-white line-clamp-2" title={question.text}>{question.text}</p></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{getQuizSetName(question.setId)}</td>
                    <td className="px-6 py-4 text-center"><div className="flex justify-center space-x-2"><button onClick={() => setEditingQuestion(question)} className="p-2 text-blue-500 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg transition-colors" title="แก้ไข"><Edit className="w-5 h-5" /></button><button onClick={() => handleDelete(question)} disabled={deletingQuestionId === question.id} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors disabled:opacity-50" title="ลบ">{deletingQuestionId === question.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-500">ไม่พบคำถามที่ตรงกับตัวกรอง</div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 text-center">
            {questionsPaginated.hasMore ? (
                <button 
                    onClick={fetchMoreQuestions}
                    disabled={questionsPaginated.loadingMore}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-100 rounded-lg text-gray-800 hover:bg-gray-200 disabled:opacity-50 mx-auto dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                    {questionsPaginated.loadingMore ? <><Loader2 className="w-5 h-5 animate-spin" /> <span>กำลังโหลด...</span></> : <><MoreHorizontal className="w-5 h-5" /> <span>โหลดเพิ่มเติม</span></>}
                </button>
            ) : (
                <p className="text-gray-500 dark:text-gray-500">แสดงข้อมูลทั้งหมดแล้ว</p>
            )}
        </div>
      </div>
    </div>
  );
};

export default ManageQuestions;