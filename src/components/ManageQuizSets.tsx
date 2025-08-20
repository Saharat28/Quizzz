import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, BookOpen, Users, BarChart3, Eye, EyeOff, Clock, ClipboardCopy, Loader2, Zap } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { useNotification } from '../context/NotificationContext';
import type { FirebaseQuizSet } from '../services/firebaseService';

interface QuizSetForm {
  name: string;
  description: string;
  isActive: boolean;
  timeLimit: number;
  instantFeedback: boolean;
}

const ManageQuizSets: React.FC = () => {
  const navigate = useNavigate();
  const { quizSets, addQuizSet, updateQuizSet, deleteQuizSet, scores, getQuestionsBySetId } = useQuizContext();
  const { showNotification, showConfirmation } = useNotification();

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSet, setEditingSet] = useState<FirebaseQuizSet | null>(null);
  const [deletingSetId, setDeletingSetId] = useState<string | null>(null);
  const [form, setForm] = useState<QuizSetForm>({
    name: '',
    description: '',
    isActive: true,
    timeLimit: 30,
    instantFeedback: false,
  });

  const copyToClipboard = async (text: string) => {
    if (!navigator.clipboard) {
      showNotification('เกิดข้อผิดพลาด', 'ฟีเจอร์นี้ไม่รองรับในเบราว์เซอร์ของคุณ', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showNotification('คัดลอกสำเร็จ!', 'คัดลอก ID ชุดข้อสอบแล้ว', 'success');
    } catch (err) {
      showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถคัดลอก ID ได้', 'error');
      console.error('Failed to copy ID: ', err);
    }
  };

  const handleShowAddForm = () => {
    setEditingSet(null);
    setForm({
      name: '',
      description: '',
      isActive: true,
      timeLimit: 30,
      instantFeedback: false,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.timeLimit <= 0) {
        showNotification('ข้อมูลไม่ถูกต้อง', 'เวลาในการทำต้องมากกว่า 0 นาที', 'error');
        return;
    }

    setIsSubmitting(true);
    const dataToSubmit = {
      name: form.name,
      description: form.description,
      isActive: form.isActive,
      timeLimit: form.timeLimit,
      instantFeedback: form.instantFeedback,
    };

    try {
        if (editingSet) {
          await updateQuizSet(editingSet.id!, dataToSubmit);
          showNotification('สำเร็จ!', 'แก้ไขชุดข้อสอบเรียบร้อยแล้ว', 'success');
        } else {
          await addQuizSet(dataToSubmit);
          showNotification('สำเร็จ!', 'เพิ่มชุดข้อสอบใหม่เรียบร้อยแล้ว', 'success');
        }
        cancelForm();
    } catch (error) {
        showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
        console.error("Error submitting quiz set:", error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleEdit = (set: FirebaseQuizSet) => {
    setEditingSet(set);
    setForm({
      name: set.name,
      description: set.description,
      isActive: set.isActive,
      timeLimit: set.timeLimit || 30,
      instantFeedback: set.instantFeedback || false,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (setId: string) => {
    const set = quizSets.find(s => s.id === setId);
    if (!set) return;

    const questionCount = getQuestionsBySetId(setId).length;
    const message = questionCount > 0
      ? `ชุดข้อสอบ "${set.name}" มี ${questionCount} ข้อ การลบจะทำให้ข้อสอบทั้งหมดหายไปด้วย ต้องการดำเนินการต่อหรือไม่?`
      : `ต้องการลบชุดข้อสอบ "${set.name}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`;

    showConfirmation('ยืนยันการลบ', message, async () => {
        setDeletingSetId(setId);
        try {
          await deleteQuizSet(setId);
          showNotification('สำเร็จ!', `ลบชุดข้อสอบ "${set.name}" เรียบร้อยแล้ว`, 'success');
        } catch (error) {
          showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถลบชุดข้อสอบได้', 'error');
          console.error("Error deleting quiz set:", error);
        } finally {
            setDeletingSetId(null);
        }
      }
    );
  };

  const toggleSetStatus = async (set: FirebaseQuizSet) => {
    try {
      await updateQuizSet(set.id!, { isActive: !set.isActive });
      showNotification('อัปเดตสถานะสำเร็จ', `ชุดข้อสอบ "${set.name}" ตอนนี้ ${!set.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} แล้ว`, 'success');
    } catch (error) {
      showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดตสถานะได้', 'error');
    }
  };

  const getSetStats = (setId: string) => {
    if (!scores) return { totalTakers: 0, avgScore: 0 };
    const setScores = scores.filter(score => score.setId === setId);
    const totalTakers = setScores.length;
    const avgScore = totalTakers > 0 ? setScores.reduce((sum, score) => sum + (score.percentage || 0), 0) / totalTakers : 0;
    return { totalTakers, avgScore };
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingSet(null);
    setForm({ name: '', description: '', isActive: true, timeLimit: 30, instantFeedback: false });
  };
  
  const formInputStyle = "w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white";
  const formLabelStyle = "block text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3";

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">กลับหน้าหลัก</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">จัดการชุดข้อสอบ</h1>
        <button onClick={handleShowAddForm} className="flex items-center space-x-2 px-6 py-3 bg-[#d93327] text-white rounded-xl hover:bg-red-700 transition-colors">
          <Plus className="w-5 h-5" />
          <span>เพิ่มชุดข้อสอบใหม่</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 mb-8 dark:bg-gray-900/50 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{editingSet ? 'แก้ไขชุดข้อสอบ' : 'เพิ่มชุดข้อสอบใหม่'}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={formLabelStyle}>ชื่อชุดข้อสอบ</label>
              <input type="text" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} className={formInputStyle} placeholder="เช่น ความรู้ทั่วไป" required />
            </div>
            <div>
              <label className={formLabelStyle}>คำอธิบาย</label>
              <textarea value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} rows={4} className={`${formInputStyle} resize-none`} placeholder="อธิบายเนื้อหาของชุดข้อสอบ" required />
            </div>
            <div>
                <label className={formLabelStyle}>เวลาในการทำ (นาที)</label>
                <input type="number" value={form.timeLimit || ''} onChange={(e) => setForm(prev => ({ ...prev, timeLimit: e.target.value === '' ? 0 : parseInt(e.target.value, 10) }))} className={formInputStyle} placeholder="เช่น 30" min="1" required />
            </div>
            <div className='flex items-center justify-between flex-wrap gap-4'>
                <div className="flex items-center space-x-3">
                    <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))} className="w-5 h-5 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600" />
                    <label htmlFor="isActive" className="text-lg font-medium text-gray-700 dark:text-gray-300">เปิดใช้งานชุดข้อสอบนี้</label>
                </div>
                <div className="flex items-center space-x-3">
                    <input type="checkbox" id="instantFeedback" checked={form.instantFeedback} onChange={(e) => setForm(prev => ({ ...prev, instantFeedback: e.target.checked }))} className="w-5 h-5 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600" />
                    <label htmlFor="instantFeedback" className="text-lg font-medium text-gray-700 dark:text-gray-300">เฉลยทันทีหลังตอบ</label>
                </div>
            </div>
            <div className="flex space-x-4">
              <button type="button" onClick={cancelForm} className="flex-1 px-6 py-3 bg-gray-100 text-gray-800 rounded-xl font-semibold hover:bg-gray-200 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">ยกเลิก</button>
              <button type="submit" disabled={isSubmitting} className="flex-1 px-6 py-3 bg-[#d93327] text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">{isSubmitting ? 'กำลังบันทึก...' : (editingSet ? 'บันทึกการแก้ไข' : 'เพิ่มชุดข้อสอบ')}</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {quizSets.filter(set => set && set.id).map((set) => {
          const stats = getSetStats(set.id!);
          const questionCount = getQuestionsBySetId(set.id!).length;
          return (
            <div key={set.id} className={`bg-white border border-gray-200 rounded-2xl shadow-sm p-6 dark:bg-gray-900/50 dark:border-gray-800 transition-opacity ${!set.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3 flex-wrap gap-y-2">
                    <div className={`p-2 rounded-xl ${set.isActive ? 'bg-red-50 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}><BookOpen className={`w-6 h-6 ${set.isActive ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`} /></div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{set.name}</h3>
                      <p className="text-gray-500 dark:text-gray-400">{set.description}</p>
                    </div>
                    {set.instantFeedback && (<span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full flex items-center gap-1 dark:bg-blue-900/50 dark:text-blue-300"><Zap size={14}/> เฉลยทันที</span>)}
                    {!set.isActive && (<span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-semibold rounded-full dark:bg-gray-700 dark:text-gray-300">ปิดใช้งาน</span>)}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
                    <div className="flex items-center space-x-3 text-gray-500 dark:text-gray-400"><BookOpen className="w-5 h-5 flex-shrink-0" /><div><div className="text-lg font-semibold text-gray-800 dark:text-white">{questionCount}</div><div className="text-sm">ข้อสอบ</div></div></div>
                    <div className="flex items-center space-x-3 text-gray-500 dark:text-gray-400"><Clock className="w-5 h-5 flex-shrink-0" /><div><div className="text-lg font-semibold text-gray-800 dark:text-white">{set.timeLimit || 'N/A'}</div><div className="text-sm">นาที</div></div></div>
                    <div className="flex items-center space-x-3 text-gray-500 dark:text-gray-400"><Users className="w-5 h-5 flex-shrink-0" /><div><div className="text-lg font-semibold text-gray-800 dark:text-white">{stats.totalTakers}</div><div className="text-sm">ผู้เข้าสอบ</div></div></div>
                    <div className="flex items-center space-x-3 text-gray-500 dark:text-gray-400"><BarChart3 className="w-5 h-5 flex-shrink-0" /><div><div className="text-lg font-semibold text-gray-800 dark:text-white">{stats.totalTakers > 0 ? `${stats.avgScore.toFixed(1)}%` : 'N/A'}</div><div className="text-sm">คะแนนเฉลี่ย</div></div></div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2">
                    <div className="text-sm text-gray-400 dark:text-gray-500">สร้างเมื่อ: {set.createdAt instanceof Date ? set.createdAt.toLocaleDateString('th-TH') : 'N/A'}</div>
                    <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg dark:bg-gray-800/50">
                        <span className="text-xs text-gray-500 font-mono px-2 dark:text-gray-400">ID: {set.id}</span>
                        <button onClick={() => copyToClipboard(set.id!)} className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700" title="คัดลอก ID"><ClipboardCopy className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center items-end space-y-2 sm:space-y-0 sm:space-x-2 ml-4">
                  <button onClick={() => toggleSetStatus(set)} className={`p-2 rounded-lg transition-colors ${set.isActive ? 'text-green-500 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/50' : 'text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-700/50'}`} title={set.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>{set.isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}</button>
                  <button onClick={() => handleEdit(set)} className="p-2 text-blue-500 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg transition-colors" title="แก้ไข"><Edit className="w-5 h-5" /></button>
                  <button onClick={() => handleDelete(set.id!)} disabled={deletingSetId === set.id} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors disabled:opacity-50" title="ลบ">{deletingSetId === set.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {quizSets.length === 0 && !showForm && (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 text-gray-400 dark:text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">ยังไม่มีชุดข้อสอบ</h3>
          <p className="text-gray-500 dark:text-gray-500 mb-6">เริ่มต้นสร้างชุดข้อสอบแรกของคุณ</p>
          <button onClick={handleShowAddForm} className="inline-flex items-center space-x-2 px-6 py-3 bg-[#d93327] text-white rounded-xl hover:bg-red-700 transition-colors"><Plus className="w-5 h-5" /><span>เพิ่มชุดข้อสอบใหม่</span></button>
        </div>
      )}
    </div>
  );
};

export default ManageQuizSets;