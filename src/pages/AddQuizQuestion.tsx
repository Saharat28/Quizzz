import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Image as ImageIcon, Upload, Download, DollarSign } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { useNotification } from '../context/NotificationContext';
import { QuestionType, FirebaseQuestion } from '../services/firebaseService';
import * as XLSX from 'xlsx';

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
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Options & Answer</h3>
            {options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                    <input
                        type={isMultiple ? "checkbox" : "radio"}
                        name="correctAnswer"
                        checked={isMultiple ? (correctAnswer as string[]).includes(option) : correctAnswer === option}
                        onChange={() => handleAnswerChange(option)}
                        className="form-radio h-5 w-5 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600"
                        disabled={!option.trim()}
                    />
                    <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-grow px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                    <button type="button" onClick={() => handleRemoveOption(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg dark:hover:bg-red-900/50">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            ))}
            <button type="button" onClick={handleAddOption} className="text-red-600 hover:text-red-700 font-semibold dark:text-red-400 dark:hover:text-red-300">+ Add Option</button>
        </div>
    );
};

const AddQuizQuestion: React.FC = () => {
    const navigate = useNavigate();
    const { addQuestion, quizSets, addMultipleQuestions } = useQuizContext();
    const { showNotification, showConfirmation } = useNotification();

    const [setId, setSetId] = useState('');
    const [questionType, setQuestionType] = useState<QuestionType>('multiple_choice_single');
    const [text, setText] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [options, setOptions] = useState<string[]>(['', '']);
    const [correctAnswer, setCorrectAnswer] = useState<string | string[]>('');
    const [points, setPoints] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const activeQuizSets = quizSets.filter(set => set.isActive && !set.isSurvey);

    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setText('');
        setImageUrl('');
        setPoints(1);
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
            showNotification('ข้อมูลไม่ครบ', 'กรุณาเลือกชุดข้อสอบ', 'error');
            setIsSubmitting(false);
            return;
        }

        const questionData: Omit<FirebaseQuestion, 'id' | 'createdAt' | 'correctCount' | 'incorrectCount'> = {
            setId,
            type: questionType,
            text,
            correctAnswer: '',
            options: [],
            points: points,
        };

        if (imageUrl.trim()) {
            questionData.imageUrl = imageUrl.trim();
        }

        switch (questionType) {
            case 'multiple_choice_single':
            case 'multiple_choice_multiple':
                const filledOptions = options.filter(opt => opt.trim() !== '');
                if (filledOptions.length < 2) {
                    showNotification('ข้อมูลไม่ครบ', 'คำถามแบบหลายตัวเลือกต้องมีอย่างน้อย 2 ตัวเลือก', 'error');
                    setIsSubmitting(false);
                    return;
                }
                if (Array.isArray(correctAnswer) ? correctAnswer.length === 0 : !correctAnswer) {
                    showNotification('ข้อมูลไม่ครบ', 'กรุณาเลือกคำตอบที่ถูกต้อง', 'error');
                    setIsSubmitting(false);
                    return;
                }
                questionData.options = filledOptions;
                questionData.correctAnswer = correctAnswer;
                break;
            case 'true_false':
                if (!correctAnswer) {
                    showNotification('ข้อมูลไม่ครบ', 'กรุณาเลือกคำตอบที่ถูกต้อง', 'error');
                    setIsSubmitting(false);
                    return;
                }
                questionData.options = ['ถูก', 'ผิด'];
                questionData.correctAnswer = correctAnswer;
                break;
            case 'fill_in_blank':
                if (typeof correctAnswer !== 'string' || !correctAnswer.trim()) {
                    showNotification('ข้อมูลไม่ครบ', 'กรุณาระบุคำตอบที่ถูกต้อง', 'error');
                    setIsSubmitting(false);
                    return;
                }
                questionData.correctAnswer = correctAnswer.trim();
                break;
        }

        try {
            await addQuestion(questionData);
            showNotification('สำเร็จ!', 'เพิ่มคำถามใหม่เรียบร้อย', 'success');
            setText('');
            setImageUrl('');
            setPoints(1);
            setCorrectAnswer(questionType === 'multiple_choice_multiple' ? [] : '');
            if (questionType === 'multiple_choice_single' || questionType === 'multiple_choice_multiple') setOptions(['', '']);
        } catch (error) {
            showNotification('ผิดพลาด', 'ไม่สามารถเพิ่มคำถามได้', 'error');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleDownloadTemplate = () => {
        const headers = ['setId', 'type', 'text', 'correctAnswer', 'imageUrl', 'points', 'option1', 'option2', 'option3', 'option4', 'option5', 'option6'];
        const exampleData = [
            { setId: 'Paste ID from the next sheet here', type: 'multiple_choice_single', text: 'Which way does the sun rise?', correctAnswer: 'East', imageUrl: 'https://example.com/sun.png', points: 1, option1: 'East', option2: 'West', option3: 'North', option4: 'South', },
            { setId: 'Paste ID from the next sheet here', type: 'multiple_choice_multiple', text: 'Which of these are components of water?', correctAnswer: 'Oxygen,Hydrogen', imageUrl: '', points: 2, option1: 'Oxygen', option2: 'Nitrogen', option3: 'Hydrogen', option4: 'Carbon', },
        ];
        const wsTemplate = XLSX.utils.json_to_sheet(exampleData, { header: headers });
        wsTemplate['!cols'] = [ { wch: 30 }, { wch: 25 }, { wch: 50 }, { wch: 30 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
        const availableSetsData = quizSets.filter(set => !set.isSurvey).map(set => ({ 'Quiz Set Name': set.name, 'Quiz Set ID': set.id }));
        const wsSets = XLSX.utils.json_to_sheet(availableSetsData);
        wsSets['!cols'] = [ { wch: 40 }, { wch: 30 } ];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, wsTemplate, 'Questions Template');
        XLSX.utils.book_append_sheet(workbook, wsSets, 'Available Quiz Set IDs');
        XLSX.writeFile(workbook, 'Quiz_Question_Template.xlsx');
    };

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
                for (const row of json) {
                    if (!row.setId || !row.type || !row.text || !row.correctAnswer) {
                        throw new Error(`ข้อมูลบางแถวไม่สมบูรณ์ กรุณาตรวจสอบ setId, type, text, correctAnswer`);
                    }
                    const options = [];
                    for (let j = 1; j <= 10; j++) {
                        if (row[`option${j}`]) {
                            options.push(String(row[`option${j}`]).trim());
                        }
                    }
                    const question: any = {
                        setId: String(row.setId).trim(),
                        type: String(row.type).trim() as QuestionType,
                        text: String(row.text).trim(),
                        options: options,
                        points: (row.points && Number(row.points) > 0) ? Number(row.points) : 1,
                    };
                    if (question.type === 'multiple_choice_multiple') {
                        question.correctAnswer = String(row.correctAnswer).split(',').map((ans: string) => ans.trim());
                    } else {
                        question.correctAnswer = String(row.correctAnswer).trim();
                    }
                    newQuestions.push(question);
                }
                await addMultipleQuestions(newQuestions);
                showNotification('สำเร็จ!', `นำเข้าคำถาม ${newQuestions.length} ข้อเรียบร้อย`, 'success');
            } catch (error: any) {
                showNotification('นำเข้าไม่สำเร็จ', error.message, 'error');
            } finally {
                setIsImporting(false);
                if (event.target) event.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const formInputStyle = "w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white";
    const formLabelStyle = "block text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3";

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => navigate('/add-question')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" /> <span>กลับไปเลือกประเภท</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">เพิ่มคำถาม (แบบทดสอบ)</h1>
                <div className="flex items-center space-x-2">
                    <button onClick={handleDownloadTemplate} title="Download Excel Template" className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                        <Download className="w-4 h-4"/> <span>Excel Template</span>
                    </button>
                    <button onClick={handleImportClick} disabled={isImporting} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50">
                        <Upload className="w-4 h-4"/> <span>Import Excel</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 space-y-6 dark:bg-gray-900/50 dark:border-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={formLabelStyle}>ชุดข้อสอบ (Quiz Set)</label>
                        <select value={setId} onChange={(e) => setSetId(e.target.value)} className={formInputStyle} required>
                            <option value="">-- เลือกชุดข้อสอบ --</option>
                            {activeQuizSets.map(set => (<option key={set.id} value={set.id!}>{set.name}</option>))}
                        </select>
                    </div>
                    <div>
                        <label className={formLabelStyle}>ประเภทคำถาม</label>
                        <select value={questionType} onChange={(e) => setQuestionType(e.target.value as QuestionType)} className={formInputStyle}>
                            <option value="multiple_choice_single">Multiple Choice (Single Answer)</option>
                            <option value="multiple_choice_multiple">Multiple Choice (Multiple Answers)</option>
                            <option value="true_false">True/False</option>
                            <option value="fill_in_blank">Fill in the Blank</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className={formLabelStyle}>คำถาม</label>
                    <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className={`${formInputStyle} resize-none`} placeholder="Enter the question text here..." required />
                </div>
                <div>
                    <label className={formLabelStyle}>คะแนนสำหรับข้อนี้</label>
                    <div className="flex items-center space-x-2">
                        <DollarSign className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                        <input
                            type="number"
                            value={points}
                            onChange={(e) => setPoints(Number(e.target.value) >= 1 ? Number(e.target.value) : 1)}
                            className={formInputStyle}
                            min="1"
                            placeholder="Default: 1"
                        />
                    </div>
                </div>
                <div>
                    <label className={formLabelStyle}>Image URL (Optional)</label>
                    <div className="flex items-center space-x-2">
                        <ImageIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                        <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={formInputStyle} placeholder="https://example.com/image.png" />
                    </div>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                    {(questionType === 'multiple_choice_single' || questionType === 'multiple_choice_multiple') && (
                        <McqOptionsEditor options={options} setOptions={setOptions} correctAnswer={correctAnswer} setCorrectAnswer={setCorrectAnswer} isMultiple={questionType === 'multiple_choice_multiple'} />
                    )}
                    {questionType === 'true_false' && (
                        <div className="space-y-2 text-gray-800 dark:text-gray-200">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Correct Answer</h3>
                            <div className="flex space-x-4">
                                <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="tf-answer" value="ถูก" checked={correctAnswer === 'ถูก'} onChange={e => setCorrectAnswer(e.target.value)} className="form-radio h-5 w-5 text-red-600" /><span>ถูก</span></label>
                                <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="tf-answer" value="ผิด" checked={correctAnswer === 'ผิด'} onChange={e => setCorrectAnswer(e.target.value)} className="form-radio h-5 w-5 text-red-600" /><span>ผิด</span></label>
                            </div>
                        </div>
                    )}
                    {questionType === 'fill_in_blank' && (
                        <div>
                            <label className={formLabelStyle}>Correct Answer (Case-sensitive)</label>
                            <input type="text" value={correctAnswer as string} onChange={e => setCorrectAnswer(e.target.value)} className={formInputStyle} placeholder="Enter the correct answer here" />
                        </div>
                    )}
                </div>
                <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
                    <button type="submit" disabled={isSubmitting} className="w-full px-6 py-4 bg-[#d93327] text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50">
                        {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกคำถาม'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddQuizQuestion;