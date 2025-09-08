import React, { useState } from 'react';
import { Trash2, DollarSign } from 'lucide-react';
import type { FirebaseQuestion } from '../../services/firebaseService';
import { useQuizContext } from '../../context/QuizContext';

// --- Helper Component: MCQ Options Editor (for Multiple Choice) ---
const McqOptionsEditor: React.FC<{
    options: string[];
    correctAnswer: string | string[];
    isMultiple: boolean;
    onOptionChange: (index: number, value: string) => void;
    onAnswerChange: (option: string) => void;
    onAddOption: () => void;
    onRemoveOption: (index: number) => void;
}> = ({ options, correctAnswer, isMultiple, onOptionChange, onAnswerChange, onAddOption, onRemoveOption }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">ตัวเลือกและคำตอบ</h3>
            {options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                    <input
                        type={isMultiple ? "checkbox" : "radio"}
                        name={`correctAnswer-${index}`}
                        checked={isMultiple ? (correctAnswer as string[]).includes(option) : correctAnswer === option}
                        onChange={() => onAnswerChange(option)}
                        className="form-radio h-5 w-5 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500 flex-shrink-0 dark:bg-gray-700 dark:border-gray-600"
                        disabled={!option.trim()}
                    />
                    <input
                        type="text"
                        value={option}
                        onChange={(e) => onOptionChange(index, e.target.value)}
                        placeholder={`ตัวเลือกที่ ${index + 1}`}
                        className="flex-grow px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                    <button type="button" onClick={() => onRemoveOption(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg dark:hover:bg-red-900/50">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            ))}
            <button type="button" onClick={onAddOption} className="text-red-600 hover:text-red-700 font-semibold dark:text-red-400 dark:hover:text-red-300">+ เพิ่มตัวเลือก</button>
        </div>
    );
};


// --- Helper Component: Main Answer Editor ---
const AnswerEditor: React.FC<{
    question: FirebaseQuestion;
    onQuestionChange: React.Dispatch<React.SetStateAction<FirebaseQuestion>>;
}> = ({ question, onQuestionChange }) => {

    const handleCorrectAnswerChange = (newAnswer: string | string[]) => {
        onQuestionChange(prev => ({...prev, correctAnswer: newAnswer}));
    }

    const handleOptionsChange = (newOptions: string[]) => {
        onQuestionChange(prev => ({...prev, options: newOptions}));
    }

    const handleMcqOptionChange = (index: number, value: string) => {
        const newOptions = [...(question.options || [])];
        newOptions[index] = value;
        handleOptionsChange(newOptions);
    };
    const handleAddOption = () => handleOptionsChange([...(question.options || []), '']);
    const handleRemoveOption = (index: number) => {
        const currentOptions = question.options || [];
        const optionToRemove = currentOptions[index];
        const newOptions = currentOptions.filter((_, i) => i !== index);
        handleOptionsChange(newOptions);
        
        if (question.type === 'multiple_choice_multiple' && Array.isArray(question.correctAnswer)) {
            if (question.correctAnswer.includes(optionToRemove)) {
                handleCorrectAnswerChange(question.correctAnswer.filter(ans => ans !== optionToRemove));
            }
        } else if (question.correctAnswer === optionToRemove) {
            handleCorrectAnswerChange('');
        }
    };
     const handleMcqAnswerChange = (option: string) => {
        if (question.type === 'multiple_choice_multiple') {
            const currentAnswers = Array.isArray(question.correctAnswer) ? [...question.correctAnswer] : [];
            if (currentAnswers.includes(option)) {
                handleCorrectAnswerChange(currentAnswers.filter(ans => ans !== option));
            } else {
                handleCorrectAnswerChange([...currentAnswers, option]);
            }
        } else {
            handleCorrectAnswerChange(option);
        }
    };

    switch (question.type) {
        case 'multiple_choice_single':
        case 'multiple_choice_multiple':
            return <McqOptionsEditor 
                        options={question.options || []}
                        correctAnswer={question.correctAnswer}
                        isMultiple={question.type === 'multiple_choice_multiple'}
                        onOptionChange={handleMcqOptionChange}
                        onAnswerChange={handleMcqAnswerChange}
                        onAddOption={handleAddOption}
                        onRemoveOption={handleRemoveOption}
                    />;
        case 'true_false':
            return (
                 <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">คำตอบที่ถูกต้อง</h3>
                    <div className="flex space-x-4 text-gray-800 dark:text-gray-200">
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="tf-answer" value="ถูก" checked={question.correctAnswer === 'ถูก'} onChange={e => handleCorrectAnswerChange(e.target.value)} className="form-radio h-5 w-5 text-red-600 bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600"/><span>ถูก</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="tf-answer" value="ผิด" checked={question.correctAnswer === 'ผิด'} onChange={e => handleCorrectAnswerChange(e.target.value)} className="form-radio h-5 w-5 text-red-600 bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600"/><span>ผิด</span></label>
                    </div>
                </div>
            );
        case 'fill_in_blank':
             return (
                <div>
                    <label className="block text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">คำตอบที่ถูกต้อง</label>
                    <input type="text" value={question.correctAnswer as string} onChange={e => handleCorrectAnswerChange(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="กรอกคำตอบที่นี่" />
                </div>
            );
        default:
            return null;
    }
};


// --- Main Modal Component for Editing a Question ---
const EditQuestionModal: React.FC<{
    question: FirebaseQuestion;
    onClose: () => void;
    onSave: (id: string, updates: Partial<FirebaseQuestion>) => Promise<void>;
}> = ({ question, onClose, onSave }) => {
    const [editedQuestion, setEditedQuestion] = useState(question);
    const [isSaving, setIsSaving] = useState(false);
    const { quizSets } = useQuizContext();

    const parentSet = quizSets.find(set => set.id === editedQuestion.setId);

    const handleSave = async () => {
        setIsSaving(true);
        
        const updates: Partial<FirebaseQuestion> = {
            text: editedQuestion.text,
            imageUrl: editedQuestion.imageUrl,
            options: editedQuestion.options,
            correctAnswer: editedQuestion.correctAnswer,
            points: editedQuestion.points ?? 1, 
        };
        
        await onSave(question.id!, updates);
        setIsSaving(false);
        onClose();
    };
    
    const formInputStyle = "w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white";
    const formLabelStyle = "block text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl shadow-xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">แก้ไขคำถาม</h2>
                <div className="space-y-4">
                    <div>
                        <label className={formLabelStyle}>คำถาม</label>
                        <textarea 
                            value={editedQuestion.text} 
                            onChange={(e) => setEditedQuestion(prev => ({ ...prev, text: e.target.value }))} 
                            rows={3} 
                            className={`${formInputStyle} resize-none`} 
                        />
                    </div>
                     <div>
                        <label className={formLabelStyle}>URL รูปภาพ (ถ้ามี)</label>
                        <input 
                            type="text"
                            value={editedQuestion.imageUrl || ''} 
                            onChange={(e) => setEditedQuestion(prev => ({ ...prev, imageUrl: e.target.value }))} 
                            className={formInputStyle}
                            placeholder="https://example.com/image.png"
                        />
                    </div>
                    {parentSet && !parentSet.isSurvey && (
                        <div>
                            <label className={formLabelStyle}>คะแนนสำหรับข้อนี้</label>
                             <div className="flex items-center space-x-2">
                                <DollarSign className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                                <input 
                                    type="number"
                                    value={editedQuestion.points || 1}
                                    onChange={(e) => setEditedQuestion(prev => ({ ...prev, points: Number(e.target.value) >= 1 ? Number(e.target.value) : 1 }))}
                                    className={formInputStyle}
                                    min="1"
                                />
                            </div>
                        </div>
                    )}

                    <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                        <AnswerEditor question={editedQuestion} onQuestionChange={setEditedQuestion} />
                    </div>

                </div>
                <div className="flex space-x-4 mt-8">
                    <button onClick={onClose} className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">ยกเลิก</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex-1 px-6 py-3 bg-[#d93327] text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">{isSaving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                </div>
            </div>
        </div>
    );
};

export default EditQuestionModal;