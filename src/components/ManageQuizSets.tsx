import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, BookOpen, Users, BarChart3, Eye, EyeOff, Clock, ClipboardCopy, Loader2 } from 'lucide-react'; // แก้ไข: Import Loader2
import { useQuizContext } from '../context/QuizContext';
import { useNotification } from '../context/NotificationContext';
import type { FirebaseQuizSet } from '../services/firebaseService';

interface QuizSetForm {
  name: string;
  description: string;
  isActive: boolean;
  timeLimit: number;
}

const ManageQuizSets: React.FC = () => {
  const navigate = useNavigate();
  const { quizSets, addQuizSet, updateQuizSet, deleteQuizSet, scores, getQuestionsBySetId } = useQuizContext();
  const { showNotification, showConfirmation } = useNotification();

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSet, setEditingSet] = useState<FirebaseQuizSet | null>(null);
  const [deletingSetId, setDeletingSetId] = useState<string | null>(null); // แก้ไข: เพิ่ม state สำหรับ loading
  const [form, setForm] = useState<QuizSetForm>({
    name: '',
    description: '',
    isActive: true,
    timeLimit: 30
  });

  // แก้ไข: เปลี่ยนไปใช้ Clipboard API ที่ทันสมัยกว่า
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
      timeLimit: 30
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
      timeLimit: form.timeLimit
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
      timeLimit: set.timeLimit || 30
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

    showConfirmation(
      'ยืนยันการลบ',
      message,
      async () => {
        setDeletingSetId(setId); // แก้ไข: ตั้งค่า ID ที่กำลังลบ
        try {
          await deleteQuizSet(setId);
          showNotification('สำเร็จ!', `ลบชุดข้อสอบ "${set.name}" เรียบร้อยแล้ว`, 'success');
        } catch (error) {
          showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถลบชุดข้อสอบได้', 'error');
          console.error("Error deleting quiz set:", error);
        } finally {
            setDeletingSetId(null); // แก้ไข: ล้างค่า ID ออก
        }
      }
    );
  };

  const toggleSetStatus = async (set: FirebaseQuizSet) => {
    try {
      await updateQuizSet(set.id!, { isActive: !set.isActive });
      showNotification(
        'อัปเดตสถานะสำเร็จ',
        `ชุดข้อสอบ "${set.name}" ตอนนี้ ${!set.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} แล้ว`,
        'success'
      );
    } catch (error) {
      showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดตสถานะได้', 'error');
      console.error("Error toggling set status:", error);
    }
  };

  const getSetStats = (setId: string) => {
    if (!scores) return { totalTakers: 0, avgScore: 0 };
    const setScores = scores.filter(score => score.setId === setId);
    const totalTakers = setScores.length;
    const avgScore = totalTakers > 0
      ? setScores.reduce((sum, score) => sum + (typeof score.percentage === 'number' ? score.percentage : 0), 0) / totalTakers
      : 0;
    return { totalTakers, avgScore };
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingSet(null);
    setForm({ name: '', description: '', isActive: true, timeLimit: 30 });
  };
  
  const formInputStyle = "w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-red-500 focus:border-red-500";
  const formLabelStyle = "block text-lg font-semibold text-gray-300 mb-3";

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /><span className="font-medium">กลับหน้าหลัก</span></button>
        <h1 className="text-3xl font-bold text-white">จัดการชุดข้อสอบ</h1>
        <button onClick={handleShowAddForm} className="flex items-center space-x-2 px-6 py-3 bg-[#d93327] text-white rounded-xl hover:bg-red-700 transition-colors"><Plus className="w-5 h-5" /><span>เพิ่มชุดข้อสอบใหม่</span></button>
      </div>

      {showForm && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">{editingSet ? 'แก้ไขชุดข้อสอบ' : 'เพิ่มชุดข้อสอบใหม่'}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div><label className={formLabelStyle}>ชื่อชุดข้อสอบ</label><input type="text" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} className={formInputStyle} placeholder="เช่น ความรู้ทั่วไป" required /></div>
            <div><label className={formLabelStyle}>คำอธิบาย</label><textarea value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} rows={4} className={`${formInputStyle} resize-none`} placeholder="อธิบายเนื้อหาของชุดข้อสอบ" required /></div>
            <div>
                <label className={formLabelStyle}>เวลาในการทำ (นาที)</label>
                <input 
                    type="number" 
                    value={form.timeLimit || ''} 
                    onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                        setForm(prev => ({ ...prev, timeLimit: value }));
                    }} 
                    className={formInputStyle} 
                    placeholder="เช่น 30" 
                    min="1" 
                    required 
                />
            </div>
            <div className="flex items-center space-x-3"><input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))} className="w-5 h-5 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500" /><label htmlFor="isActive" className="text-lg font-medium text-gray-300">เปิดใช้งานชุดข้อสอบนี้</label></div>
            <div className="flex space-x-4">
              <button type="button" onClick={cancelForm} className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-xl font-semibold hover:bg-gray-600 transition-colors">ยกเลิก</button>
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
            <div key={set.id} className={`bg-gray-900/50 border border-gray-800 rounded-2xl shadow-lg p-6 transition-opacity ${!set.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`p-2 rounded-xl ${set.isActive ? 'bg-red-900/30' : 'bg-gray-800'}`}><BookOpen className={`w-6 h-6 ${set.isActive ? 'text-red-400' : 'text-gray-500'}`} /></div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{set.name}</h3>
                      <p className="text-gray-400">{set.description}</p>
                    </div>
                    {!set.isActive && (<span className="px-3 py-1 bg-gray-700 text-gray-300 text-sm font-semibold rounded-full">ปิดใช้งาน</span>)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center space-x-3 text-gray-400"><BookOpen className="w-5 h-5" /><div><div className="text-lg font-semibold text-white">{questionCount}</div><div className="text-sm">ข้อสอบ</div></div></div>
                    <div className="flex items-center space-x-3 text-gray-400"><Clock className="w-5 h-5" /><div><div className="text-lg font-semibold text-white">{set.timeLimit || 'N/A'}</div><div className="text-sm">นาที</div></div></div>
                    <div className="flex items-center space-x-3 text-gray-400"><Users className="w-5 h-5" /><div><div className="text-lg font-semibold text-white">{stats.totalTakers}</div><div className="text-sm">ผู้เข้าสอบ</div></div></div>
                    <div className="flex items-center space-x-3 text-gray-400"><BarChart3 className="w-5 h-5" /><div><div className="text-lg font-semibold text-white">{stats.totalTakers > 0 ? `${stats.avgScore.toFixed(1)}%` : 'N/A'}</div><div className="text-sm">คะแนนเฉลี่ย</div></div></div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between flex-wrap gap-2">
                    <div className="text-sm text-gray-500">
                        สร้างเมื่อ: {set.createdAt instanceof Date ? set.createdAt.toLocaleDateString('th-TH') : 'N/A'}
                    </div>
                    <div className="flex items-center space-x-2 bg-gray-800/50 p-1 rounded-lg">
                        <span className="text-xs text-gray-400 font-mono px-2">ID: {set.id}</span>
                        <button 
                            onClick={() => copyToClipboard(set.id!)} 
                            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                            title="คัดลอก ID"
                        >
                            <ClipboardCopy className="w-4 h-4" />
                        </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button onClick={() => toggleSetStatus(set)} className={`p-2 rounded-lg transition-colors ${set.isActive ? 'text-green-400 hover:bg-green-900/50' : 'text-gray-500 hover:bg-gray-700/50'}`} title={set.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>{set.isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}</button>
                  <button onClick={() => handleEdit(set)} className="p-2 text-blue-400 hover:bg-blue-900/50 rounded-lg transition-colors" title="แก้ไข"><Edit className="w-5 h-5" /></button>
                  <button onClick={() => handleDelete(set.id!)} disabled={deletingSetId === set.id} className="p-2 text-red-500 hover:bg-red-900/50 rounded-lg transition-colors disabled:opacity-50" title="ลบ">
                      {deletingSetId === set.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {quizSets.length === 0 && !showForm && (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">ยังไม่มีชุดข้อสอบ</h3>
          <p className="text-gray-500 mb-6">เริ่มต้นสร้างชุดข้อสอบแรกของคุณ</p>
          <button onClick={handleShowAddForm} className="inline-flex items-center space-x-2 px-6 py-3 bg-[#d93327] text-white rounded-xl hover:bg-red-700 transition-colors"><Plus className="w-5 h-5" /><span>เพิ่มชุดข้อสอบใหม่</span></button>
        </div>
      )}
    </div>
  );
};

export default ManageQuizSets;