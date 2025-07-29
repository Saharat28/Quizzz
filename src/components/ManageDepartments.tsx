import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Users } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { useNotification } from '../context/NotificationContext';
import type { FirebaseDepartment } from '../services/firebaseService';

const ManageDepartments: React.FC = () => {
  const navigate = useNavigate();
  const { departments, addDepartment, updateDepartment, deleteDepartment } = useQuizContext();
  const { showNotification, showConfirmation } = useNotification();

  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [editingDepartment, setEditingDepartment] = useState<FirebaseDepartment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartmentName.trim()) {
      showNotification('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อแผนก', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingDepartment) {
        await updateDepartment(editingDepartment.id!, { name: newDepartmentName });
        showNotification('สำเร็จ', 'แก้ไขชื่อแผนกเรียบร้อยแล้ว', 'success');
      } else {
        await addDepartment({ name: newDepartmentName });
        showNotification('สำเร็จ', 'เพิ่มแผนกใหม่เรียบร้อยแล้ว', 'success');
      }
      cancelEdit();
    } catch (error) {
      console.error("Error saving department:", error);
      showNotification('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (department: FirebaseDepartment) => {
    setEditingDepartment(department);
    setNewDepartmentName(department.name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingDepartment(null);
    setNewDepartmentName('');
  };

  const handleDelete = (department: FirebaseDepartment) => {
    showConfirmation(
        'ยืนยันการลบ',
        `ต้องการลบแผนก "${department.name}" หรือไม่?`,
        async () => {
            try {
                await deleteDepartment(department.id!);
                showNotification('สำเร็จ', 'ลบแผนกเรียบร้อยแล้ว', 'success');
            } catch (error) {
                console.error("Error deleting department:", error);
                showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถลบแผนกได้', 'error');
            }
        }
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">กลับหน้าหลัก</span>
        </button>
        <h1 className="text-3xl font-bold text-white">จัดการแผนก</h1>
        <div className="w-36"></div> {/* Placeholder for alignment */}
      </div>

      {/* Theme Change: Form container styles updated */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl shadow-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-white mb-6">
          {editingDepartment ? 'แก้ไขชื่อแผนก' : 'เพิ่มแผนกใหม่'}
        </h2>
        <form onSubmit={handleAddOrUpdate} className="flex flex-col sm:flex-row sm:items-end sm:space-x-4 space-y-4 sm:space-y-0">
          <div className="flex-grow">
            <label htmlFor="dept-name" className="block text-lg font-semibold text-gray-300 mb-2">ชื่อแผนก</label>
            {/* Theme Change: Input styles updated */}
            <input
              id="dept-name"
              type="text"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="เช่น IT, HR, การตลาด"
              required
            />
          </div>
          <div className="flex space-x-3">
            {editingDepartment && (
              // Theme Change: Cancel button styles updated
              <button type="button" onClick={cancelEdit} className="px-6 py-3 bg-gray-700 text-gray-300 rounded-xl font-semibold hover:bg-gray-600 transition-colors">
                ยกเลิก
              </button>
            )}
            {/* Theme Change: Submit button styles updated */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-grow flex items-center justify-center space-x-2 px-6 py-3 bg-[#d93327] text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : (editingDepartment ? 'บันทึก' : 'เพิ่ม')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Theme Change: List container styles updated */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl shadow-lg">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white">รายชื่อแผนกทั้งหมด</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {departments.map((dept) => (
            // Theme Change: List item styles updated
            <div key={dept.id} className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-gray-500" />
                <span className="text-lg font-medium text-gray-200">{dept.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                {/* Theme Change: Edit/Delete button styles updated */}
                <button onClick={() => handleEdit(dept)} className="p-2 text-blue-400 hover:bg-blue-900/50 rounded-lg transition-colors" title="แก้ไข">
                  <Edit className="w-5 h-5" />
                </button>
                <button onClick={() => handleDelete(dept)} className="p-2 text-red-500 hover:bg-red-900/50 rounded-lg transition-colors" title="ลบ">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        {departments.length === 0 && (
          <p className="p-8 text-center text-gray-500">ยังไม่มีแผนกในระบบ</p>
        )}
      </div>
    </div>
  );
};

export default ManageDepartments;
