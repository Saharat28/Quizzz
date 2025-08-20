import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Search, Filter, UserX, Eye } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { useNotification } from '../context/NotificationContext';
import type { UserProfile } from '../services/firebaseService';
import EditProfileModal from './common/EditProfileModal';

const ManageUsers: React.FC = () => {
  const navigate = useNavigate();
  const { users, departments, updateUserProfile, deleteUser } = useQuizContext();
  const { showNotification, showConfirmation } = useNotification();

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const filteredUsers = useMemo(() => {
    let filtered = [...users];
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(u => u.department === departmentFilter);
    }
    if (searchTerm.trim()) {
      const lowercasedTerm = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(lowercasedTerm) ||
        u.email.toLowerCase().includes(lowercasedTerm)
      );
    }
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [users, searchTerm, departmentFilter]);

  const handleSaveProfile = async (uid: string, updates: Partial<UserProfile>) => {
    try {
      await updateUserProfile(uid, updates);
      showNotification('สำเร็จ', 'อัปเดตข้อมูลผู้ใช้เรียบร้อย', 'success');
    } catch (error) {
      showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดตข้อมูลได้', 'error');
    }
  };

  const handleDeleteUser = (user: UserProfile) => {
    showConfirmation(
      'ยืนยันการลบผู้ใช้',
      `ต้องการลบบัญชีของ "${user.name}" และประวัติการสอบทั้งหมดใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      async () => {
        try {
          await deleteUser(user.uid);
          showNotification('สำเร็จ', `ลบบัญชีของ ${user.name} เรียบร้อยแล้ว`, 'success');
        } catch (error) {
          showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถลบบัญชีได้', 'error');
        }
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {editingUser && <EditProfileModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleSaveProfile} />}
      
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>กลับหน้าหลัก</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">จัดการผู้ใช้งาน</h1>
        <div className="w-36"></div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden dark:bg-gray-900/50 dark:border-gray-800">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-6">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ หรือ อีเมล..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-gray-100 border border-gray-300 rounded-xl text-gray-900 px-4 py-2 focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
              className="bg-gray-100 border border-gray-300 rounded-xl text-gray-900 px-4 py-2 focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="all">ทุกแผนก</option>
              {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredUsers.length > 0 ? (
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ชื่อ - นามสกุล</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">อีเมล</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">แผนก</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">สิทธิ์</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredUsers.map(user => (
                  <tr key={user.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.department}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex justify-center space-x-2">
                         <Link to={`/profile/${user.uid}`} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700/50" title="ดูโปรไฟล์">
                          <Eye className="w-5 h-5" />
                        </Link>
                        <button onClick={() => setEditingUser(user)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg dark:text-blue-400 dark:hover:bg-blue-900/50" title="แก้ไข">
                          <Edit className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDeleteUser(user)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg dark:hover:bg-red-900/50" title="ลบผู้ใช้">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <UserX className="w-12 h-12 mx-auto mb-4" />
              <p className="text-lg">ไม่พบข้อมูลผู้ใช้</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageUsers;