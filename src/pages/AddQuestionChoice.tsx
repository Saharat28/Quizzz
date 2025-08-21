import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Award } from 'lucide-react';

const AddQuestionChoice: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                    <span>กลับหน้าหลัก</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">เพิ่มคำถามใหม่</h1>
                <div className="w-36"></div>
            </div>

            <div className="text-center mb-10">
                <p className="text-xl text-gray-600 dark:text-gray-400">กรุณาเลือกประเภทของคำถามที่ต้องการเพิ่ม</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Choice 1: Add Quiz Question */}
                <button
                    onClick={() => navigate('/add-quiz-question')}
                    className="group bg-white border border-gray-200 p-8 rounded-2xl shadow-sm hover:border-red-400 hover:shadow-lg dark:bg-gray-900/50 dark:border-gray-800 dark:hover:border-red-600 transition-all duration-300 text-left flex flex-col items-center text-center"
                >
                    <div className="bg-red-100 text-[#d93327] p-4 inline-block rounded-2xl mb-6 dark:bg-red-900/30">
                        <Award className="w-12 h-12" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">เพิ่มคำถามในแบบทดสอบ</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">สำหรับข้อสอบที่มีการให้คะแนน, จับเวลา และวัดผล</p>
                </button>

                {/* Choice 2: Add Survey Question */}
                <button
                    onClick={() => navigate('/add-survey-question')}
                    className="group bg-white border border-gray-200 p-8 rounded-2xl shadow-sm hover:border-purple-400 hover:shadow-lg dark:bg-gray-900/50 dark:border-gray-800 dark:hover:border-purple-500 transition-all duration-300 text-left flex flex-col items-center text-center"
                >
                    <div className="bg-purple-100 text-purple-700 p-4 inline-block rounded-2xl mb-6 dark:bg-purple-900/30">
                        <HelpCircle className="w-12 h-12" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">เพิ่มคำถามในแบบสอบถาม</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">สำหรับแบบสอบถาม, แบบสำรวจ หรือแบบประเมินที่ไม่มีคะแนน</p>
                </button>
            </div>
        </div>
    );
};

export default AddQuestionChoice;