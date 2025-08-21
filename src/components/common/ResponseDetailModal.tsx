import React from 'react';
import { X, User, List } from 'lucide-react';

interface ResponseDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    questionText: string;
    answerOption: string;
    users: string[];
}

const ResponseDetailModal: React.FC<ResponseDetailModalProps> = ({ isOpen, onClose, questionText, answerOption, users }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 dark:bg-gray-900 dark:border dark:border-gray-700 max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">คำถาม: {questionText}</p>
                        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                            ผู้ที่ตอบ: "{answerOption}"
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                    {users.length > 0 ? (
                        <ul className="space-y-3">
                            {users.map((user, index) => (
                                <li key={index} className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                                    <User className="w-5 h-5 text-gray-400" />
                                    <span className="text-gray-800 dark:text-gray-200">{user}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 py-8">ไม่พบข้อมูลผู้ตอบ</p>
                    )}
                </div>
                 <div className="mt-6 text-right">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                        ปิด
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResponseDetailModal;