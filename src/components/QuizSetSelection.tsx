import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, BookOpen, Settings } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import type { FirebaseQuizSet } from '../services/firebaseService';

interface QuizSetSelectionProps {
  userRole: 'admin' | 'user';
}

const QuizSetSelection: React.FC<QuizSetSelectionProps> = ({ userRole }) => {
  const navigate = useNavigate();
  const { quizSets, getQuestionsBySetId } = useQuizContext();
  
  const activeSets: FirebaseQuizSet[] = quizSets.filter(set => set.isActive && set.name);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">กลับหน้าหลัก</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center">เลือกชุดข้อสอบ</h1>
        
        {userRole === 'admin' ? (
          <button
            onClick={() => navigate('/manage-sets')}
            className="flex items-center space-x-2 px-4 py-2 bg-[#d93327] text-white rounded-xl hover:bg-red-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>จัดการชุดข้อสอบ</span>
          </button>
        ) : <div className="w-40"></div>} {/* Placeholder for alignment */}
      </div>

      {/* Quiz Sets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeSets.map((set) => {
          const questionCount = getQuestionsBySetId(set.id!).length;
          
          return (
            <div 
              key={set.id} 
              className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg hover:border-red-300 dark:bg-gray-900/50 dark:border-gray-800 dark:hover:shadow-red-900/30 dark:hover:border-red-800/50 transition-all duration-300 overflow-hidden group flex flex-col"
            >
              <div className="bg-gradient-to-r from-[#d93327] to-red-600 p-6 text-white">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="bg-white bg-opacity-20 dark:bg-opacity-10 p-2 rounded-xl"><BookOpen className="w-6 h-6" /></div>
                  <h3 className="text-xl font-bold">{set.name}</h3>
                </div>
                <p className="text-red-100 leading-relaxed h-12 line-clamp-2">{set.description}</p>
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{questionCount}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-sm">ข้อสอบ</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{set.timeLimit || 'N/A'}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-sm">นาที</div>
                  </div>
                </div>
                
                <button
                  onClick={() => navigate(`/quiz/${set.id!}`)}
                  disabled={questionCount === 0}
                  className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-semibold transition-all duration-200 mt-auto ${
                    questionCount === 0
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500'
                      : 'bg-[#d93327] text-white hover:bg-red-700 group-hover:scale-105'
                  }`}
                >
                  <Play className="w-5 h-5" />
                  <span>{questionCount === 0 ? 'ไม่มีข้อสอบ' : 'เริ่มทำข้อสอบ'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {activeSets.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 text-gray-400 dark:text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">ไม่มีชุดข้อสอบที่เปิดใช้งาน</h3>
        </div>
      )}
    </div>
  );
};

export default QuizSetSelection;