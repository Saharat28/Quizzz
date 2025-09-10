import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, Users, ClipboardCheck, TrendingDown, TrendingUp, ClipboardList, LineChart, UserSearch, ArrowDown, ArrowUp, Filter } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { useTheme } from '../context/ThemeContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type TooltipItem
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { checkAnswer } from '../utils/quizUtils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DepartmentStat {
  name: string;
  averageScore: number;
  participantCount: number;
  testCount: number;
}

const QuestionAnalysisTable: React.FC<{
    title: string;
    icon: React.ElementType;
    data: any[];
}> = ({ title, icon: Icon, data }) => (
    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl flex-1 min-w-[300px]">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center space-x-2 mb-4">
            <Icon className="w-6 h-6" />
            <span>{title}</span>
        </h3>
        <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="p-2 text-sm text-gray-500 w-12 sticky top-0 bg-gray-50 dark:bg-gray-900">#</th>
                        <th className="p-2 text-sm text-gray-500 sticky top-0 bg-gray-50 dark:bg-gray-900">Question</th>
                        <th className="p-2 text-sm text-gray-500 text-right sticky top-0 bg-gray-50 dark:bg-gray-900">Correct Rate</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((q, index) => (
                        <tr key={q.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/50">
                            <td className="p-3 text-gray-500 dark:text-gray-400">{index + 1}</td>
                            <td className="p-3 text-gray-700 dark:text-gray-200">
                                <Link to={`/manage-questions`} title={q.text} className="hover:text-red-600 dark:hover:text-red-400 line-clamp-2">
                                    {q.text}
                                </Link>
                            </td>
                            <td className="p-3 text-right font-semibold text-gray-800 dark:text-white">{q.correctRate.toFixed(1)}%</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const AnalyticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { scores, departments, questionsPaginated, users } = useQuizContext();
  const { theme } = useTheme();

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof DepartmentStat; direction: 'asc' | 'desc' }>({ key: 'averageScore', direction: 'desc' });
  const [analyticsDeptFilter, setAnalyticsDeptFilter] = useState<string>('all');

  const departmentStats = useMemo((): DepartmentStat[] => {
    if (scores.length === 0 || departments.length === 0) {
      return [];
    }
    const stats: { [key: string]: { totalPercentage: number; scoreCount: number; userIds: Set<string> } } = {};
    departments.forEach(dept => {
      stats[dept.name] = { totalPercentage: 0, scoreCount: 0, userIds: new Set() };
    });
    scores.forEach(score => {
      if (stats[score.department]) {
        stats[score.department].totalPercentage += score.percentage;
        stats[score.department].scoreCount++;
        stats[score.department].userIds.add(score.userId);
      }
    });
    const results: DepartmentStat[] = departments.map(dept => {
      const deptStat = stats[dept.name];
      const averageScore = deptStat.scoreCount > 0 ? deptStat.totalPercentage / deptStat.scoreCount : 0;
      return {
        name: dept.name,
        averageScore: parseFloat(averageScore.toFixed(1)),
        participantCount: deptStat.userIds.size,
        testCount: deptStat.scoreCount,
      };
    });
    results.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
    return results;
  }, [scores, departments, sortConfig]);

  const questionAnalysis = useMemo(() => {
    if (scores.length === 0 || questionsPaginated.data.length === 0) {
        return { hardestQuestions: [], easiestQuestions: [] };
    }
    const questionsMap = new Map(questionsPaginated.data.map(q => [q.id, q]));
    const stats: { [key: string]: { id: string; text: string; correct: number; total: number } } = {};
    scores.forEach(score => {
        if (!score.userAnswers) return;
        Object.entries(score.userAnswers).forEach(([questionId, userAnswer]) => {
            const question = questionsMap.get(questionId);
            if (!question) return;
            if (!stats[questionId]) {
                stats[questionId] = { id: questionId, text: question.text, correct: 0, total: 0 };
            }
            stats[questionId].total++;
            if (checkAnswer(question, userAnswer)) {
                stats[questionId].correct++;
            }
        });
    });
    const results = Object.values(stats)
      .filter(q => q.total > 0)
      .map(q => ({
        ...q,
        correctRate: (q.correct / q.total) * 100,
      }));
    const hardestQuestions = [...results].sort((a, b) => a.correctRate - b.correctRate).slice(0, 10);
    const easiestQuestions = [...results].sort((a, b) => b.correctRate - a.correctRate).slice(0, 10);
    return { hardestQuestions, easiestQuestions };
  }, [scores, questionsPaginated.data]);

  const filteredUsersForSelection = useMemo(() => {
    if (analyticsDeptFilter === 'all') {
        return users;
    }
    return users.filter(user => user.department === analyticsDeptFilter);
  }, [users, analyticsDeptFilter]);

  const individualAnalysis = useMemo(() => {
    if (!selectedUserId) return null;
    const userScores = scores
      .filter(s => s.userId === selectedUserId)
      .sort((a, b) => (a.timestamp as Date).getTime() - (b.timestamp as Date).getTime());
    if (userScores.length === 0) {
        return {
            userName: users.find(u => u.uid === selectedUserId)?.name || '',
            chartData: { labels: [], datasets: [] },
            scoreHistory: []
        };
    }
    const chartData = {
        labels: userScores.map(s => (s.timestamp as Date).toLocaleDateString('th-TH')),
        datasets: [{
            label: 'Score (%)',
            data: userScores.map(s => s.percentage),
            borderColor: '#d93327',
            backgroundColor: 'rgba(217, 51, 39, 0.2)',
            fill: true,
            tension: 0.1
        }]
    };
    return {
        userName: userScores[0].userName,
        chartData,
        scoreHistory: userScores,
    };
  }, [selectedUserId, scores, users]);
  
  const handleSort = (key: keyof DepartmentStat) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
        direction = 'asc';
    }
    setSortConfig({ key, direction });
  };
  
  const reversedDepartmentStats = useMemo(() => [...departmentStats].sort((a,b) => a.averageScore - b.averageScore), [departmentStats]);

  const barChartOptions = useMemo(() => {
    const gridColor = theme === 'light' ? '#E5E7EB' : '#374151';
    const tickColor = theme === 'light' ? '#374151' : '#E5E7EB';
const titleColor = theme === 'light' ? '#111827' : '#FFFFFF';
    return {
      indexAxis: 'y' as const,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Average Score by Department',
          color: titleColor,
          font: { size: 16 }
        },
        tooltip: {
            callbacks: {
                label: function(context: TooltipItem<'bar'>) {
                    const stat = reversedDepartmentStats[context.dataIndex];
                    if (!stat) return `Average Score: ${context.formattedValue}%`;
                    return [
                        `Average Score: ${stat.averageScore}%`,
                        `Participants: ${stat.participantCount}`,
                        `Tests Taken: ${stat.testCount}`
                    ];
                }
            }
        }
      },
      scales: {
        y: { 
            ticks: { 
                color: tickColor,
                font: {
                    size: 12,
                    weight: 'bold' as const
                }
            }, 
            grid: { 
                display: false
            } 
        },
        x: { 
            beginAtZero: true, 
            max: 100, 
            ticks: { 
                color: tickColor 
            }, 
            grid: { 
                color: gridColor 
            } 
        }
      }
    };
  }, [theme, reversedDepartmentStats]);

  const lineChartOptions = useMemo(() => {
    const gridColor = theme === 'light' ? '#E5E7EB' : '#374151';
    const tickColor = theme === 'light' ? '#4B5563' : '#9CA3AF';
    const titleColor = theme === 'light' ? '#1F2937' : '#E5E7EB';
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: true, text: `Performance of ${individualAnalysis?.userName || ''}`, color: titleColor, font: { size: 16 } },
      },
      scales: {
        y: { beginAtZero: true, max: 100, ticks: { color: tickColor }, grid: { color: gridColor } },
        x: { ticks: { color: tickColor }, grid: { color: gridColor } }
      }
    };
  }, [theme, individualAnalysis?.userName]);

  const barChartData = {
    labels: reversedDepartmentStats.map(d => d.name),
    datasets: [
      {
        label: 'Average Score (%)',
        data: reversedDepartmentStats.map(d => d.averageScore),
        backgroundColor: 'rgba(217, 51, 39, 0.6)',
        borderColor: 'rgba(217, 51, 39, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const barCount = barChartData.labels.length;
  const minHeight = 300;
  const heightPerBar = 35;
  const chartHeight = Math.max(minHeight, barCount * heightPerBar);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
        <div className="w-36"></div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 dark:bg-gray-900/50 dark:border-gray-800">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-3 mb-6">
            <BarChart3 className="w-6 h-6 text-red-500 dark:text-red-400" />
            <span>Department Overview</span>
        </h2>
        {departmentStats.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-4 rounded-xl relative" style={{ height: `${chartHeight}px` }}>
                    <Bar options={barChartOptions} data={barChartData} />
                </div>
                <div className="lg:col-span-1">
                    <table className="w-full text-left">
                        <thead className='border-b border-gray-200 dark:border-gray-700'>
                            <tr>
                                <th className="p-2 text-sm text-gray-500 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('name')}>
                                    <div className="flex items-center">
                                        <span>Department</span>
                                        {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1"/> : <ArrowDown size={14} className="ml-1"/>)}
                                    </div>
                                </th>
                                <th className="p-2 text-sm text-gray-500 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" title="Participants" onClick={() => handleSort('participantCount')}>
                                    <div className="flex items-center justify-center">
                                        <Users size={16}/>
                                        {sortConfig.key === 'participantCount' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1"/> : <ArrowDown size={14} className="ml-1"/>)}
                                    </div>
                                </th>
                                <th className="p-2 text-sm text-gray-500 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" title="Tests Taken" onClick={() => handleSort('testCount')}>
                                    <div className="flex items-center justify-center">
                                        <ClipboardList size={16}/>
                                        {sortConfig.key === 'testCount' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1"/> : <ArrowDown size={14} className="ml-1"/>)}
                                    </div>
                                </th>
                                <th className="p-2 text-sm text-gray-500 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('averageScore')}>
                                    <div className="flex items-center justify-end">
                                        <span>Avg. Score</span>
                                        {sortConfig.key === 'averageScore' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1"/> : <ArrowDown size={14} className="ml-1"/>)}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {departmentStats.map(dept => (
                                <tr key={dept.name} className='border-b border-gray-100 dark:border-gray-800'>
                                    <td className="p-3 font-medium text-gray-800 dark:text-white">{dept.name}</td>
                                    <td className="p-3 text-center text-gray-600 dark:text-gray-300">{dept.participantCount}</td>
                                    <td className="p-3 text-center text-gray-600 dark:text-gray-300">{dept.testCount}</td>
                                    <td className="p-3 text-right font-semibold text-red-600 dark:text-red-400">{dept.averageScore}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        ) : (
            <div className="text-center py-16 text-gray-500">
                <p>Not enough score data for analysis.</p>
            </div>
        )}
      </div>
      
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 dark:bg-gray-900/50 dark:border-gray-800">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-3 mb-6">
            <ClipboardCheck className="w-6 h-6 text-red-500 dark:text-red-400" />
            <span>Question Analysis</span>
        </h2>
        {questionAnalysis.hardestQuestions.length > 0 ? (
            <div className="flex flex-wrap gap-6">
                <QuestionAnalysisTable 
                    title="Top 10 Hardest Questions"
                    icon={TrendingDown}
                    data={questionAnalysis.hardestQuestions}
                />
                <QuestionAnalysisTable 
                    title="Top 10 Easiest Questions"
                    icon={TrendingUp}
                    data={questionAnalysis.easiestQuestions}
                />
            </div>
        ) : (
            <div className="text-center py-16 text-gray-500">
                <p>Not enough score data for question analysis.</p>
            </div>
        )}
      </div>

       <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 dark:bg-gray-900/50 dark:border-gray-800">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-3 mb-6">
            <LineChart className="w-6 h-6 text-red-500 dark:text-red-400" />
            <span>Individual Analysis</span>
        </h2>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 max-w-xl mb-6">
            <div className="flex items-center space-x-2 flex-1">
                <Filter className="w-5 h-5 text-gray-400"/>
                <select
                    value={analyticsDeptFilter}
                    onChange={e => {
                        setAnalyticsDeptFilter(e.target.value);
                        setSelectedUserId('');
                    }}
                    className="w-full bg-gray-100 border border-gray-300 rounded-xl text-gray-900 px-4 py-2 focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                    <option value="all">All Departments</option>
                    {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                </select>
            </div>
            <div className="flex items-center space-x-2 flex-1">
                <UserSearch className="w-5 h-5 text-gray-400"/>
                <select
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                    className="w-full bg-gray-100 border border-gray-300 rounded-xl text-gray-900 px-4 py-2 focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                    <option value="">-- Please select an employee --</option>
                    {filteredUsersForSelection.sort((a,b) => a.name.localeCompare(b.name)).map(user => (
                        <option key={user.uid} value={user.uid}>{user.name}</option>
                    ))}
                </select>
            </div>
        </div>

        {!selectedUserId ? (
            <div className="text-center py-16 text-gray-500">
                <p>Please select an employee to view their data.</p>
            </div>
        ) : individualAnalysis && individualAnalysis.scoreHistory.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-4 rounded-xl h-96">
                    <Line options={lineChartOptions} data={individualAnalysis.chartData} />
                </div>
                <div className="lg:col-span-1 max-h-96 overflow-y-auto">
                    {individualAnalysis.scoreHistory.map(score => (
                        <Link to={`/review/${score.id}`} key={score.id} className="block p-3 mb-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{score.setName}</p>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">{(score.timestamp as Date).toLocaleDateString('th-TH')}</span>
                                <span className="font-bold text-red-600 dark:text-red-400">{score.percentage.toFixed(1)}%</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        ) : (
            <div className="text-center py-16 text-gray-500">
                <p>No test history found for this employee.</p>
            </div>
        )}
      </div>
    </div>
  );
};
export default AnalyticsDashboard;