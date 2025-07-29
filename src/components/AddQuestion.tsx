import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { useNotification } from '../context/NotificationContext';
import { QuestionType, FirebaseQuestion } from '../services/firebaseService';

// --- Component ย่อยสำหรับจัดการตัวเลือกของคำถามปรนัย ---
const McqOptionsEditor: React.FC<{
    options: string[];
    setOptions: React.Dispatch<React.SetStateAction<string[]>>;
    correctAnswer: string | string[];
    setCorrectAnswer: React.Dispatch<React.SetStateAction<string | string[]>>;
    isMultiple: boolean;
}> = ({ options, setOptions, correctAnswer, setCorrectAnswer, isMultiple }) => {

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleAddOption = () => setOptions([...options, '']);
    const handleRemoveOption = (index: number) => {
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
        if (!isMultiple && correctAnswer === options[index]) {
            setCorrectAnswer('');
        }
        if (isMultiple && Array.isArray(correctAnswer) && correctAnswer.includes(options[index])) {
            setCorrectAnswer(correctAnswer.filter(ans => ans !== options[index]));
        }
    };
    
    const handleAnswerChange = (option: string) => {
        if (isMultiple) {
            const currentAnswers = Array.isArray(correctAnswer) ? [...correctAnswer] : [];
            if (currentAnswers.includes(option)) {
                setCorrectAnswer(currentAnswers.filter(ans => ans !== option));
            } else {
                setCorrectAnswer([...currentAnswers, option]);
            }
        } else {
            setCorrectAnswer(option);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-300">ตัวเลือกและคำตอบ</h3>
            {options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                    <input 
                        type={isMultiple ? "checkbox" : "radio"}
                        name="correctAnswer"
                        checked={isMultiple ? (correctAnswer as string[]).includes(option) : correctAnswer === option}
                        onChange={() => handleAnswerChange(option)}
                        className="form-radio h-5 w-5 text-red-500 bg-gray-700 border-gray-600 focus:ring-red-500"
                        disabled={!option.trim()}
                    />
                    <input 
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`ตัวเลือกที่ ${index + 1}`}
                        className="flex-grow px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                    <button type="button" onClick={() => handleRemoveOption(index)} className="p-2 text-red-500 hover:bg-red-900/50 rounded-lg">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            ))}
            <button type="button" onClick={handleAddOption} className="text-red-400 hover:text-red-300 font-semibold">+ เพิ่มตัวเลือก</button>
        </div>
    );
};


const AddQuestion: React.FC = () => {
  const navigate = useNavigate();
  const { addQuestion, quizSets } = useQuizContext();
  const { showNotification } = useNotification();
  
  // Form State
  const [setId, setSetId] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('mcq-s');
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correctAnswer, setCorrectAnswer] = useState<string | string[]>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeQuizSets = quizSets.filter(set => set.isActive);

  useEffect(() => {
    setText('');
    setImageUrl('');
    setCorrectAnswer('');
    if (questionType === 'mcq-s' || questionType === 'mcq-m') {
        setOptions(['', '']);
        setCorrectAnswer(questionType === 'mcq-m' ? [] : '');
    } else {
        setOptions([]);
    }
  }, [questionType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!setId) {
        showNotification('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกชุดข้อสอบ', 'error');
        setIsSubmitting(false);
        return;
    }
    
    // --- จุดที่แก้ไข ---
    // สร้าง Object พื้นฐานก่อน
    const questionData: Omit<FirebaseQuestion, 'id' | 'createdAt' | 'correctCount' | 'incorrectCount'> = {
        setId,
        type: questionType,
        text,
        correctAnswer: '', // Placeholder, will be overwritten
    };

    // เพิ่ม imageUrl เข้าไปเฉพาะในกรณีที่มีการกรอกข้อมูลเท่านั้น
    if (imageUrl.trim()) {
        questionData.imageUrl = imageUrl.trim();
    }
    
    switch (questionType) {
        case 'mcq-s':
        case 'mcq-m':
            const filledOptions = options.filter(opt => opt.trim() !== '');
            if (filledOptions.length < 2) {
                showNotification('ข้อมูลไม่ครบถ้วน', 'คำถามปรนัยต้องมีอย่างน้อย 2 ตัวเลือก', 'error');
                setIsSubmitting(false);
                return;
            }
            if (Array.isArray(correctAnswer) ? correctAnswer.length === 0 : !correctAnswer) {
                showNotification('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกคำตอบที่ถูกต้อง', 'error');
                setIsSubmitting(false);
                return;
            }
            questionData.options = filledOptions;
            questionData.correctAnswer = correctAnswer;
            break;
        case 'tf':
            if (!correctAnswer) {
                showNotification('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกคำตอบที่ถูกต้อง', 'error');
                setIsSubmitting(false);
                return;
            }
            questionData.options = ['ถูก', 'ผิด'];
            questionData.correctAnswer = correctAnswer;
            break;
        case 'fib':
            if (typeof correctAnswer !== 'string' || !correctAnswer.trim()) {
                showNotification('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกคำตอบที่ถูกต้อง', 'error');
                setIsSubmitting(false);
                return;
            }
            questionData.correctAnswer = correctAnswer.trim();
            break;
    }

    try {
      await addQuestion(questionData);
      showNotification('สำเร็จ!', 'เพิ่มข้อสอบใหม่เรียบร้อยแล้ว', 'success');
      setText('');
      setImageUrl('');
      setCorrectAnswer(questionType === 'mcq-m' ? [] : '');
      if (questionType === 'mcq-s' || questionType === 'mcq-m') setOptions(['', '']);
    } catch (error) {
      showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถเพิ่มข้อสอบได้', 'error');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const formInputStyle = "w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-red-500 focus:border-red-500";
  const formLabelStyle = "block text-lg font-semibold text-gray-300 mb-3";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /> <span>กลับหน้าหลัก</span></button>
        <h1 className="text-3xl font-bold text-white">เพิ่มข้อสอบใหม่</h1>
        <div className="w-36"></div>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900/50 border border-gray-800 rounded-2xl shadow-lg p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className={formLabelStyle}>ชุดข้อสอบ</label>
                <select value={setId} onChange={(e) => setSetId(e.target.value)} className={formInputStyle} required>
                    <option value="">-- เลือกชุดข้อสอบ --</option>
                    {activeQuizSets.map(set => (<option key={set.id} value={set.id!}>{set.name}</option>))}
                </select>
            </div>
            <div>
                <label className={formLabelStyle}>ประเภทคำถาม</label>
                <select value={questionType} onChange={(e) => setQuestionType(e.target.value as QuestionType)} className={formInputStyle}>
                    <option value="mcq-s">ปรนัย (เลือกตอบข้อเดียว)</option>
                    <option value="mcq-m">ปรนัย (เลือกตอบหลายข้อ)</option>
                    <option value="tf">ถูก-ผิด</option>
                    <option value="fib">เติมคำในช่องว่าง</option>
                </select>
            </div>
        </div>

        <div>
            <label className={formLabelStyle}>คำถาม</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className={`${formInputStyle} resize-none`} placeholder="กรอกคำถามที่นี่..." required />
        </div>
        <div>
            <label className={formLabelStyle}>URL รูปภาพ (ถ้ามี)</label>
            <div className="flex items-center space-x-2">
                <ImageIcon className="w-6 h-6 text-gray-500" />
                <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={formInputStyle} placeholder="https://example.com/image.png" />
            </div>
        </div>

        <div className="pt-4 border-t border-gray-800">
            {(questionType === 'mcq-s' || questionType === 'mcq-m') && (
                <McqOptionsEditor 
                    options={options} 
                    setOptions={setOptions}
                    correctAnswer={correctAnswer}
                    setCorrectAnswer={setCorrectAnswer}
                    isMultiple={questionType === 'mcq-m'}
                />
            )}
            {questionType === 'tf' && (
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-300">คำตอบที่ถูกต้อง</h3>
                    <div className="flex space-x-4">
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="tf-answer" value="ถูก" checked={correctAnswer === 'ถูก'} onChange={e => setCorrectAnswer(e.target.value)} className="form-radio h-5 w-5 text-red-500 bg-gray-700 border-gray-600"/><span>ถูก</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="tf-answer" value="ผิด" checked={correctAnswer === 'ผิด'} onChange={e => setCorrectAnswer(e.target.value)} className="form-radio h-5 w-5 text-red-500 bg-gray-700 border-gray-600"/><span>ผิด</span></label>
                    </div>
                </div>
            )}
            {questionType === 'fib' && (
                <div>
                    <label className={formLabelStyle}>คำตอบที่ถูกต้อง (พิมพ์เล็ก-ใหญ่ มีผล)</label>
                    <input type="text" value={correctAnswer as string} onChange={e => setCorrectAnswer(e.target.value)} className={formInputStyle} placeholder="กรอกคำตอบที่นี่" />
                </div>
            )}
        </div>

        <div className="pt-6 border-t border-gray-800">
            <button type="submit" disabled={isSubmitting} className="w-full px-6 py-4 bg-[#d93327] text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อสอบ'}
            </button>
        </div>
      </form>
    </div>
  );
};

export default AddQuestion;
