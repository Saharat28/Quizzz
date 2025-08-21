import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Image as ImageIcon, Upload, Download } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { useNotification } from '../context/NotificationContext';
import { QuestionType, FirebaseQuestion } from '../services/firebaseService';
import * as XLSX from 'xlsx';

const SurveyOptionsEditor: React.FC<{
    options: string[];
    setOptions: React.Dispatch<React.SetStateAction<string[]>>;
}> = ({ options, setOptions }) => {
    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };
    const handleAddOption = () => setOptions([...options, '']);
    const handleRemoveOption = (index: number) => {
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">ตัวเลือกสำหรับคำถาม</h3>
            {options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`ตัวเลือกที่ ${index + 1}`}
                        className="flex-grow px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                    <button type="button" onClick={() => handleRemoveOption(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg dark:hover:bg-red-900/50">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            ))}
            <button type="button" onClick={handleAddOption} className="text-purple-600 hover:text-purple-700 font-semibold dark:text-purple-400 dark:hover:text-purple-300">+ เพิ่มตัวเลือก</button>
        </div>
    );
};

const AddSurveyQuestion: React.FC = () => {
    const navigate = useNavigate();
    const { addQuestion, quizSets, addMultipleQuestions } = useQuizContext();
    const { showNotification } = useNotification();

    const [setId, setSetId] = useState('');
    const [questionType, setQuestionType] = useState<QuestionType>('multiple_choice_single');
    const [text, setText] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [options, setOptions] = useState<string[]>(['', '']);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const activeSurveySets = quizSets.filter(set => set.isActive && set.isSurvey);

    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setText('');
        setImageUrl('');
        if (questionType === 'multiple_choice_single' || questionType === 'multiple_choice_multiple') {
            setOptions(['', '']);
        } else {
            setOptions([]);
        }
    }, [questionType]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        if (!setId) {
            showNotification('ข้อมูลไม่ครบ', 'กรุณาเลือกชุดแบบสอบถาม', 'error');
            setIsSubmitting(false);
            return;
        }

        const questionData: Omit<FirebaseQuestion, 'id' | 'createdAt' | 'correctCount' | 'incorrectCount'> = {
            setId,
            type: questionType,
            text,
            correctAnswer: 'N/A',
            options: [],
            points: 0,
        };

        if (imageUrl.trim()) {
            questionData.imageUrl = imageUrl.trim();
        }

        if (questionType === 'multiple_choice_single' || questionType === 'multiple_choice_multiple') {
            const filledOptions = options.filter(opt => opt.trim() !== '');
            if (filledOptions.length < 2) {
                showNotification('ข้อมูลไม่ครบ', 'คำถามแบบหลายตัวเลือกต้องมีอย่างน้อย 2 ตัวเลือก', 'error');
                setIsSubmitting(false);
                return;
            }
            questionData.options = filledOptions;
        }

        try {
            await addQuestion(questionData);
            showNotification('สำเร็จ!', 'เพิ่มคำถามในแบบสอบถามเรียบร้อย', 'success');
            setText('');
            setImageUrl('');
            setOptions(['', '']);
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

    const handleDownloadSurveyTemplate = () => {
        const headers = ['setId', 'type', 'text', 'option1', 'option2', 'option3', 'option4', 'option5'];
        const exampleData = [
            { setId: 'PASTE_SURVEY_ID_HERE', type: 'multiple_choice_single', text: 'คุณพึงพอใจกับสวัสดิการของบริษัทหรือไม่', option1: 'พอใจมาก', option2: 'พอใจ', option3: 'เฉยๆ', option4: 'ไม่พอใจ' },
            { setId: 'PASTE_SURVEY_ID_HERE', type: 'fill_in_blank', text: 'สิ่งที่อยากให้บริษัทปรับปรุงคืออะไร' },
        ];
        const wsTemplate = XLSX.utils.json_to_sheet(exampleData, { header: headers });
        wsTemplate['!cols'] = [ { wch: 30 }, { wch: 25 }, { wch: 50 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
        const availableSetsData = quizSets.filter(set => set.isSurvey).map(set => ({ 'Survey Name': set.name, 'Survey ID': set.id }));
        const wsSets = XLSX.utils.json_to_sheet(availableSetsData);
        wsSets['!cols'] = [ { wch: 40 }, { wch: 30 } ];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, wsTemplate, 'Survey Questions Template');
        XLSX.utils.book_append_sheet(workbook, wsSets, 'Available Survey IDs');
        XLSX.writeFile(workbook, 'Survey_Question_Template.xlsx');
    };

    const handleFileChangeForSurvey = (event: React.ChangeEvent<HTMLInputElement>) => {
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
                    if (!row.setId || !row.type || !row.text) {
                        throw new Error(`ข้อมูลบางแถวไม่สมบูรณ์ กรุณาตรวจสอบ setId, type, text`);
                    }
                    const options = [];
                    for (let j = 1; j <= 10; j++) {
                        if (row[`option${j}`]) {
                            options.push(String(row[`option${j}`]).trim());
                        }
                    }
                    const question: Omit<FirebaseQuestion, 'id' | 'createdAt' | 'correctCount' | 'incorrectCount'> = {
                        setId: String(row.setId).trim(),
                        type: String(row.type).trim() as QuestionType,
                        text: String(row.text).trim(),
                        options: options,
                        correctAnswer: 'N/A',
                        points: 0,
                    };
                    newQuestions.push(question);
                }
                await addMultipleQuestions(newQuestions);
                showNotification('สำเร็จ!', `นำเข้าคำถามแบบสอบถาม ${newQuestions.length} ข้อเรียบร้อย`, 'success');
            } catch (error: any) {
                showNotification('นำเข้าไม่สำเร็จ', error.message, 'error');
            } finally {
                setIsImporting(false);
                if (event.target) event.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const formInputStyle = "w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white";
    const formLabelStyle = "block text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3";

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => navigate('/add-question')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" /> <span>กลับไปเลือกประเภท</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">เพิ่มคำถาม (แบบสอบถาม)</h1>
                <div className="flex items-center space-x-2">
                    <button onClick={handleDownloadSurveyTemplate} title="Download Excel Template" className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                        <Download className="w-4 h-4"/> <span>Excel Template</span>
                    </button>
                    <button onClick={handleImportClick} disabled={isImporting} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50">
                        <Upload className="w-4 h-4"/> <span>Import Excel</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChangeForSurvey} />
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 space-y-6 dark:bg-gray-900/50 dark:border-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={formLabelStyle}>ชุดแบบสอบถาม (Survey Set)</label>
                        <select value={setId} onChange={(e) => setSetId(e.target.value)} className={formInputStyle} required>
                            <option value="">-- เลือกชุดแบบสอบถาม --</option>
                            {activeSurveySets.map(set => (<option key={set.id} value={set.id!}>{set.name}</option>))}
                        </select>
                    </div>
                    <div>
                        <label className={formLabelStyle}>ประเภทคำถาม</label>
                        <select value={questionType} onChange={(e) => setQuestionType(e.target.value as QuestionType)} className={formInputStyle}>
                            <option value="multiple_choice_single">หลายตัวเลือก (เลือกตอบข้อเดียว)</option>
                            <option value="multiple_choice_multiple">หลายตัวเลือก (เลือกตอบหลายข้อ)</option>
                            <option value="fill_in_blank">เติมคำในช่องว่าง</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className={formLabelStyle}>คำถาม</label>
                    <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className={`${formInputStyle} resize-none`} placeholder="ป้อนคำถามสำหรับแบบสอบถาม..." required />
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
                        <SurveyOptionsEditor options={options} setOptions={setOptions} />
                    )}
                    {questionType === 'fill_in_blank' && (
                         <p className="text-gray-500 italic">ผู้ใช้จะสามารถกรอกคำตอบได้อย่างอิสระ</p>
                    )}
                </div>
                <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
                    <button type="submit" disabled={isSubmitting} className="w-full px-6 py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50">
                        {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกคำถาม'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddSurveyQuestion;