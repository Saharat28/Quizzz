import React, { useState } from 'react';
import { useQuizContext } from '../../context/QuizContext';
import type { UserProfile } from '../../services/firebaseService';

interface EditProfileModalProps {
    user: UserProfile;
    onClose: () => void;
    onSave: (uid: string, updates: Partial<UserProfile>) => Promise<void>;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose, onSave }) => {
    const { departments } = useQuizContext();
    const [name, setName] = useState(user.name);
    const [department, setDepartment] = useState(user.department);
    const [role, setRole] = useState(user.role);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(user.uid, { name, department, role });
        setIsSaving(false);
        onClose();
    };

    const formInputStyle = "w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-red-500 focus:border-red-500";
    const formLabelStyle = "block text-lg font-semibold text-gray-300 mb-2";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-xl w-full max-w-lg p-8">
                <h2 className="text-2xl font-bold text-white mb-6">แก้ไขโปรไฟล์ - {user.name}</h2>
                <div className="space-y-4">
                    <div><label className={formLabelStyle}>ชื่อ - นามสกุล</label><input type="text" value={name} onChange={e => setName(e.target.value)} className={formInputStyle} /></div>
                    <div><label className={formLabelStyle}>แผนก</label><select value={department} onChange={e => setDepartment(e.target.value)} className={formInputStyle}>{departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}</select></div>
                    <div><label className={formLabelStyle}>สิทธิ์การใช้งาน (Role)</label><select value={role} onChange={e => setRole(e.target.value as 'admin' | 'user')} className={formInputStyle}><option value="user">User</option><option value="admin">Admin</option></select></div>
                </div>
                <div className="flex space-x-4 mt-8">
                    <button onClick={onClose} className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-xl font-semibold hover:bg-gray-600 transition-colors">ยกเลิก</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex-1 px-6 py-3 bg-[#d93327] text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">{isSaving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;