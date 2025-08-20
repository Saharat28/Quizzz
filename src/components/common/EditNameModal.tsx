import React, { useState } from 'react';
import type { UserProfile } from '../../services/firebaseService';

interface EditNameModalProps {
    user: UserProfile;
    onClose: () => void;
    onSave: (uid: string, updates: { name: string }) => Promise<void>;
}

const EditNameModal: React.FC<EditNameModalProps> = ({ user, onClose, onSave }) => {
    const [name, setName] = useState(user.name);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) return; // Prevent saving an empty name
        setIsSaving(true);
        await onSave(user.uid, { name: name.trim() });
        setIsSaving(false);
        onClose();
    };

    const formInputStyle = "w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-red-500 focus:border-red-500";
    const formLabelStyle = "block text-lg font-semibold text-gray-300 mb-2";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-xl w-full max-w-lg p-8">
                <h2 className="text-2xl font-bold text-white mb-6">แก้ไขชื่อโปรไฟล์</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="profile-name" className={formLabelStyle}>ชื่อ - นามสกุล</label>
                        <input
                            id="profile-name"
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className={formInputStyle}
                        />
                    </div>
                </div>
                <div className="flex space-x-4 mt-8">
                    <button onClick={onClose} className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-xl font-semibold hover:bg-gray-600 transition-colors">ยกเลิก</button>
                    <button onClick={handleSave} disabled={isSaving || !name.trim()} className="flex-1 px-6 py-3 bg-[#d93327] text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditNameModal;