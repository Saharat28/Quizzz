import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Image as ImageIcon, Upload, Download } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { useNotification } from '../context/NotificationContext';
import { QuestionType, FirebaseQuestion } from '../services/firebaseService';
import * as XLSX from 'xlsx';

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
  const { addQuestion, quizSets, addMultipleQuestions } = useQuizContext();
  const { showNotification, showConfirmation } = useNotification();

  // Form State
  const [setId, setSetId] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('multiple_choice_single');
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correctAnswer, setCorrectAnswer] = useState<string | string[]>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeQuizSets = quizSets.filter(set => set.isActive);

  // Excel Import State
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText('');
    setImageUrl('');
    if (questionType === 'multiple_choice_single' || questionType === 'multiple_choice_multiple') {
        setOptions(['', '']);
        setCorrectAnswer(questionType === 'multiple_choice_multiple' ? [] : '');
    } else {
        setOptions([]);
        setCorrectAnswer('');
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
    const questionData: Omit<FirebaseQuestion, 'id' | 'createdAt' | 'correctCount' | 'incorrectCount'> = {
        setId,
        type: questionType,
        text,
        correctAnswer: '',
        options: [],
    };
    if (imageUrl.trim()) {
        questionData.imageUrl = imageUrl.trim();
    }
    switch (questionType) {
        case 'multiple_choice_single':
        case 'multiple_choice_multiple':
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
        case 'true_false':
            if (!correctAnswer) {
                showNotification('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกคำตอบที่ถูกต้อง', 'error');
                setIsSubmitting(false);
                return;
            }
            questionData.options = ['ถูก', 'ผิด'];
            questionData.correctAnswer = correctAnswer;
            break;
        case 'fill_in_blank':
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
      setCorrectAnswer(questionType === 'multiple_choice_multiple' ? [] : '');
      if (questionType === 'multiple_choice_single' || questionType === 'multiple_choice_multiple') setOptions(['', '']);
    } catch (error) {
      showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถเพิ่มข้อสอบได้', 'error');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // --- แก้ไขฟังก์ชันดาวน์โหลดแม่แบบ ---
  const handleDownloadTemplate = () => {
    const headers = ['setId', 'type', 'text', 'correctAnswer', 'imageUrl', 'option1', 'option2', 'option3', 'option4', 'option5', 'option6'];
    const exampleData = [
        {
            setId: 'คัดลอก ID จากชีทถัดไปมาวางที่นี่',
            type: 'multiple_choice_single',
            text: 'พระอาทิตย์ขึ้นทางทิศไหน?',
            correctAnswer: 'ตะวันออก',
            imageUrl: 'https://example.com/sun.png',
            option1: 'ตะวันออก',
            option2: 'ตะวันตก',
            option3: 'เหนือ',
            option4: 'ใต้',
        },
        {
            setId: 'คัดลอก ID จากชีทถัดไปมาวางที่นี่',
            type: 'multiple_choice_multiple',
            text: 'ข้อใดคือส่วนประกอบของน้ำ?',
            correctAnswer: 'ออกซิเจน,ไฮโดรเจน',
            imageUrl: '',
            option1: 'ออกซิเจน',
            option2: 'ไนโตรเจน',
            option3: 'ไฮโดรเจน',
            option4: 'คาร์บอน',
        },
        {
            setId: 'คัดลอก ID จากชีทถัดไปมาวางที่นี่',
            type: 'true_false',
            text: 'ประเทศไทยมี 77 จังหวัด',
            correctAnswer: 'ถูก',
            imageUrl: '',
            option1: 'ถูก',
            option2: 'ผิด',
        },
        {
            setId: 'คัดลอก ID จากชีทถัดไปมาวางที่นี่',
            type: 'fill_in_blank',
            text: 'เมืองหลวงของประเทศไทยคืออะไร?',
            correctAnswer: 'กรุงเทพมหานคร',
            imageUrl: '',
        }
    ];
    const wsTemplate = XLSX.utils.json_to_sheet(exampleData, { header: headers });
    wsTemplate['!cols'] = [ { wch: 30 }, { wch: 25 }, { wch: 50 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];

    const availableSetsData = quizSets.map(set => ({ 'Quiz Set Name': set.name, 'Quiz Set ID': set.id }));
    const wsSets = XLSX.utils.json_to_sheet(availableSetsData);
    wsSets['!cols'] = [ { wch: 40 }, { wch: 30 } ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsTemplate, 'Questions Template');
    XLSX.utils.book_append_sheet(workbook, wsSets, 'Available Quiz Set IDs');

    XLSX.writeFile(workbook, 'Question_Template_with_IDs.xlsx');
  };

  // --- แก้ไขฟังก์ชันอ่านไฟล์ ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet) as any[];

            if (json.length === 0) { throw new Error('ไม่พบข้อมูลในไฟล์ Excel'); }

            const newQuestions: Omit<FirebaseQuestion, 'id' | 'createdAt' | 'correctCount' | 'incorrectCount'>[] = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                const rowNum = i + 2;
                if (!row.setId || !row.type || !row.text || !row.correctAnswer) {
                    throw new Error(`ข้อมูลแถวที่ ${rowNum} ไม่สมบูรณ์ กรุณาตรวจสอบคอลัมน์ setId, type, text, correctAnswer`);
                }

                // รวบรวม options จากคอลัมน์ option1, option2, ...
                const options = [];
                for (let j = 1; j <= 10; j++) { // รองรับสูงสุด 10 ตัวเลือก
                    if (row[`option${j}`]) {
                        options.push(String(row[`option${j}`]).trim());
                    }
                }

                const question: any = {
                    setId: String(row.setId).trim(),
                    type: String(row.type).trim() as QuestionType,
                    text: String(row.text).trim(),
                    imageUrl: row.imageUrl ? String(row.imageUrl).trim() : '',
                    options: options,
                };

                if (question.type === 'multiple_choice_multiple') {
                    if (typeof row.correctAnswer !== 'string') throw new Error(`แถวที่ ${rowNum}: correctAnswer สำหรับ multiple_choice_multiple ต้องคั่นด้วยจุลภาค`);
                    question.correctAnswer = row.correctAnswer.split(',').map((ans: string) => ans.trim());
                } else {
                    question.correctAnswer = String(row.correctAnswer).trim();
                }

                if (['multiple_choice_single', 'multiple_choice_multiple', 'true_false'].includes(question.type) && options.length === 0) {
                    throw new Error(`แถวที่ ${rowNum}: คำถามประเภทนี้ต้องมีอย่างน้อย 1 ตัวเลือกในคอลัมน์ option`);
                }
                
                newQuestions.push(question);
            }
            showConfirmation('ยืนยันการนำเข้า', `พบคำถาม ${newQuestions.length} ข้อ คุณต้องการนำเข้าทั้งหมดใช่หรือไม่?`, async () => {
                await addMultipleQuestions(newQuestions);
                showNotification('สำเร็จ!', `นำเข้าคำถาม ${newQuestions.length} ข้อเรียบร้อยแล้ว`, 'success');
            });
        } catch (error: any) {
            showNotification('นำเข้าไม่สำเร็จ', error.message, 'error');
        } finally {
            setIsImporting(false);
            if (event.target) event.target.value = '';
        }
    };
    reader.onerror = () => {
        showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถอ่านไฟล์ได้', 'error');
        setIsImporting(false);
    };
    reader.readAsArrayBuffer(file);
  };
  
  const formInputStyle = "w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-red-500 focus:border-red-500";
  const formLabelStyle = "block text-lg font-semibold text-gray-300 mb-3";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /> <span>กลับหน้าหลัก</span></button>
        <h1 className="text-3xl font-bold text-white">เพิ่มข้อสอบ</h1>
        <div className="flex items-center space-x-2">
            <button onClick={handleDownloadTemplate} className="flex items-center space-x-2 px-4 py-2 bg-blue-700 text-white rounded-xl hover:bg-blue-600 transition-colors"><Download className="w-4 h-4" /><span>ดาวน์โหลดแม่แบบ</span></button>
            <button onClick={handleImportClick} disabled={isImporting} className="flex items-center space-x-2 px-4 py-2 bg-green-700 text-white rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"><Upload className="w-4 h-4" /><span>{isImporting ? 'กำลังนำเข้า...' : 'นำเข้าจาก Excel'}</span></button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900/50 border border-gray-800 rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-white">เพิ่มข้อสอบทีละข้อ</h2>
            <p className="text-gray-400">กรอกข้อมูลในฟอร์มด้านล่างเพื่อเพิ่มคำถามใหม่เข้าระบบ</p>
        </div>
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
                    <option value="multiple_choice_single">ปรนัย (เลือกตอบข้อเดียว)</option>
                    <option value="multiple_choice_multiple">ปรนัย (เลือกตอบหลายข้อ)</option>
                    <option value="true_false">ถูก-ผิด</option>
                    <option value="fill_in_blank">เติมคำในช่องว่าง</option>
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
            {(questionType === 'multiple_choice_single' || questionType === 'multiple_choice_multiple') && (
                <McqOptionsEditor options={options} setOptions={setOptions} correctAnswer={correctAnswer} setCorrectAnswer={setCorrectAnswer} isMultiple={questionType === 'multiple_choice_multiple'} />
            )}
            {questionType === 'true_false' && (
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-300">คำตอบที่ถูกต้อง</h3>
                    <div className="flex space-x-4">
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="tf-answer" value="ถูก" checked={correctAnswer === 'ถูก'} onChange={e => setCorrectAnswer(e.target.value)} className="form-radio h-5 w-5 text-red-500 bg-gray-700 border-gray-600"/><span>ถูก</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="tf-answer" value="ผิด" checked={correctAnswer === 'ผิด'} onChange={e => setCorrectAnswer(e.target.value)} className="form-radio h-5 w-5 text-red-500 bg-gray-700 border-gray-600"/><span>ผิด</span></label>
                    </div>
                </div>
            )}
            {questionType === 'fill_in_blank' && (
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