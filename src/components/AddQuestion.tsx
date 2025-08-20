import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Image as ImageIcon, Upload, Download } from 'lucide-react';
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


const AddQuestion: React.FC = () => {
  const navigate = useNavigate();
  const { addQuestion, quizSets, addMultipleQuestions } = useQuizContext();
  const { showNotification, showConfirmation } = useNotification();

  const [setId, setSetId] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('multiple_choice_single');
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correctAnswer, setCorrectAnswer] = useState<string | string[]>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeQuizSets = quizSets.filter(set => set.isActive);

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
        showNotification('Incomplete Data', 'Please select a quiz set', 'error');
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
                showNotification('Incomplete Data', 'Multiple choice questions must have at least 2 options.', 'error');
                setIsSubmitting(false);
                return;
            }
            if (Array.isArray(correctAnswer) ? correctAnswer.length === 0 : !correctAnswer) {
                showNotification('Incomplete Data', 'Please select the correct answer.', 'error');
                setIsSubmitting(false);
                return;
            }
            questionData.options = filledOptions;
            questionData.correctAnswer = correctAnswer;
            break;
        case 'true_false':
            if (!correctAnswer) {
                showNotification('Incomplete Data', 'Please select the correct answer.', 'error');
                setIsSubmitting(false);
                return;
            }
            questionData.options = ['True', 'False'];
            questionData.correctAnswer = correctAnswer;
            break;
        case 'fill_in_blank':
            if (typeof correctAnswer !== 'string' || !correctAnswer.trim()) {
                showNotification('Incomplete Data', 'Please provide the correct answer.', 'error');
                setIsSubmitting(false);
                return;
            }
            questionData.correctAnswer = correctAnswer.trim();
            break;
    }

    try {
      await addQuestion(questionData);
      showNotification('Success!', 'New question added successfully.', 'success');
      setText('');
      setImageUrl('');
      setCorrectAnswer(questionType === 'multiple_choice_multiple' ? [] : '');
      if (questionType === 'multiple_choice_single' || questionType === 'multiple_choice_multiple') setOptions(['', '']);
    } catch (error) {
      showNotification('Error', 'Could not add the question.', 'error');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = () => {
    const headers = ['setId', 'type', 'text', 'correctAnswer', 'imageUrl', 'option1', 'option2', 'option3', 'option4', 'option5', 'option6'];
    const exampleData = [
        { setId: 'Paste ID from the next sheet here', type: 'multiple_choice_single', text: 'Which way does the sun rise?', correctAnswer: 'East', imageUrl: 'https://example.com/sun.png', option1: 'East', option2: 'West', option3: 'North', option4: 'South', },
        { setId: 'Paste ID from the next sheet here', type: 'multiple_choice_multiple', text: 'Which of these are components of water?', correctAnswer: 'Oxygen,Hydrogen', imageUrl: '', option1: 'Oxygen', option2: 'Nitrogen', option3: 'Hydrogen', option4: 'Carbon', },
        { setId: 'Paste ID from the next sheet here', type: 'true_false', text: 'The capital of France is Paris.', correctAnswer: 'True', imageUrl: '', option1: 'True', option2: 'False', },
        { setId: 'Paste ID from the next sheet here', type: 'fill_in_blank', text: 'The capital of Thailand is ___.', correctAnswer: 'Bangkok', imageUrl: '', }
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
            if (json.length === 0) { throw new Error('No data found in the Excel file.'); }
            const newQuestions: Omit<FirebaseQuestion, 'id' | 'createdAt' | 'correctCount' | 'incorrectCount'>[] = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                const rowNum = i + 2;
                if (!row.setId || !row.type || !row.text || !row.correctAnswer) {
                    throw new Error(`Row ${rowNum} has incomplete data. Please check columns: setId, type, text, correctAnswer`);
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
                    imageUrl: row.imageUrl ? String(row.imageUrl).trim() : '',
                    options: options,
                };
                if (question.type === 'multiple_choice_multiple') {
                    if (typeof row.correctAnswer !== 'string') throw new Error(`Row ${rowNum}: correctAnswer for multiple_choice_multiple must be a comma-separated string.`);
                    question.correctAnswer = row.correctAnswer.split(',').map((ans: string) => ans.trim());
                } else {
                    question.correctAnswer = String(row.correctAnswer).trim();
                }
                if (['multiple_choice_single', 'multiple_choice_multiple', 'true_false'].includes(question.type) && options.length === 0) {
                    throw new Error(`Row ${rowNum}: This question type requires at least one option column.`);
                }
                newQuestions.push(question);
            }
            showConfirmation('Confirm Import', `Found ${newQuestions.length} questions. Do you want to import all of them?`, async () => {
                await addMultipleQuestions(newQuestions);
                showNotification('Success!', `Imported ${newQuestions.length} questions successfully.`, 'success');
            });
        } catch (error: any) {
            showNotification('Import Failed', error.message, 'error');
        } finally {
            setIsImporting(false);
            if (event.target) event.target.value = '';
        }
    };
    reader.onerror = () => {
        showNotification('Error', 'Could not read the file.', 'error');
        setIsImporting(false);
    };
    reader.readAsArrayBuffer(file);
  };
  
  const formInputStyle = "w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white";
  const formLabelStyle = "block text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" /> <span>Back to Home</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Add Question</h1>
        <div className="flex items-center space-x-2">
            <button onClick={handleDownloadTemplate} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"><Download className="w-4 h-4" /><span>Download Template</span></button>
            <button onClick={handleImportClick} disabled={isImporting} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"><Upload className="w-4 h-4" /><span>{isImporting ? 'Importing...' : 'Import from Excel'}</span></button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 space-y-6 dark:bg-gray-900/50 dark:border-gray-800">
        <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add a Single Question</h2>
            <p className="text-gray-500 dark:text-gray-400">Fill out the form below to add a new question to the system.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className={formLabelStyle}>Quiz Set</label>
                <select value={setId} onChange={(e) => setSetId(e.target.value)} className={formInputStyle} required>
                    <option value="">-- Select a quiz set --</option>
                    {activeQuizSets.map(set => (<option key={set.id} value={set.id!}>{set.name}</option>))}
                </select>
            </div>
            <div>
                <label className={formLabelStyle}>Question Type</label>
                <select value={questionType} onChange={(e) => setQuestionType(e.target.value as QuestionType)} className={formInputStyle}>
                    <option value="multiple_choice_single">Multiple Choice (Single Answer)</option>
                    <option value="multiple_choice_multiple">Multiple Choice (Multiple Answers)</option>
                    <option value="true_false">True/False</option>
                    <option value="fill_in_blank">Fill in the Blank</option>
                </select>
            </div>
        </div>
        <div>
            <label className={formLabelStyle}>Question</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className={`${formInputStyle} resize-none`} placeholder="Enter the question text here..." required />
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
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="tf-answer" value="True" checked={correctAnswer === 'True'} onChange={e => setCorrectAnswer(e.target.value)} className="form-radio h-5 w-5 text-red-600 bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600"/><span>True</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="tf-answer" value="False" checked={correctAnswer === 'False'} onChange={e => setCorrectAnswer(e.target.value)} className="form-radio h-5 w-5 text-red-600 bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600"/><span>False</span></label>
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
            <button type="submit" disabled={isSubmitting} className="w-full px-6 py-4 bg-[#d93327] text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                {isSubmitting ? 'Saving...' : 'Save Question'}
            </button>
        </div>
      </form>
    </div>
  );
};

export default AddQuestion;