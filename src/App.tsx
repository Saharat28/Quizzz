import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { BookOpen, LogOut, User, Sun, Moon } from 'lucide-react';

import { QuizProvider } from './context/QuizContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import ReviewPage from './pages/ReviewPage';
import LoadingSpinner from './components/LoadingSpinner';
import Dashboard from './components/Dashboard';
import Quiz from './components/Quiz';
import QuizSetSelection from './components/QuizSetSelection';
import ManageQuizSets from './components/ManageQuizSets';
import ManageQuestions from './components/ManageQuestions';
import ManageDepartments from './components/ManageDepartments';
import ScoreReport from './components/ScoreReport';
import ManageUsers from './components/ManageUsers';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import SurveyReport from './components/SurveyReport';
import AddQuestionChoice from './pages/AddQuestionChoice';
import AddQuizQuestion from './pages/AddQuizQuestion';
import AddSurveyQuestion from './pages/AddSurveyQuestion';
import UserScoreSummary from './components/UserScoreSummary';


const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { userProfile } = useAuth();
  if (userProfile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const ThemeToggleButton = () => {
    const { theme, toggleTheme } = useTheme();
    return (
        <button 
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 text-gray-400 bg-white/80 dark:text-gray-300 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-200/90 dark:hover:bg-gray-700/90 transition-colors"
            title="Toggle Theme"
        >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
    );
}

function AppContent() {
  const { userProfile, logout } = useAuth();

  return (
      <div className="min-h-screen bg-white text-gray-900 dark:bg-[#010b13] dark:text-gray-300 transition-colors duration-300">
        <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
          <ThemeToggleButton />
          <Link to="/profile" className="flex items-center space-x-2 text-gray-800 bg-white/80 dark:text-gray-300 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-300 dark:border-gray-700 px-3 py-2 rounded-xl hover:bg-gray-200/90 dark:hover:bg-gray-700/90 transition-colors">
            <User className="w-5 h-5 text-red-500" />
            <span className="font-medium">{userProfile!.name}</span>
          </Link>
          <button onClick={logout} className="flex items-center space-x-2 bg-[#d93327]/90 backdrop-blur-sm border border-red-800 px-4 py-2 rounded-xl shadow-lg hover:bg-red-700 transition-colors">
            <LogOut className="w-5 h-5 text-white" />
            <span className="text-white font-semibold">Logout</span>
          </button>
        </div>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <header className="text-center mb-12 pt-16">
            <Link to="/"><div className="inline-flex items-center justify-center w-20 h-20 bg-[#d93327] rounded-2xl mb-6 shadow-lg shadow-red-500/20 dark:shadow-red-900/20"><BookOpen className="w-10 h-10 text-white" /></div></Link>
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-[#d93327] to-red-500 bg-clip-text text-transparent mb-4">คลังข้อสอบออนไลน์ MASARU</h1>
            <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">พัฒนาทักษะและความรู้ของคุณได้ทุกที่ ทุกเวลา</p>
          </header>
          <main className="min-h-[60vh]">
            <Routes>
              <Route path="/" element={<Dashboard userRole={userProfile!.role} />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/:userId" element={<AdminRoute><ProfilePage /></AdminRoute>} />
              <Route path="/review/:scoreId" element={<ReviewPage />} />
              <Route path="/quiz-selection" element={<QuizSetSelection userRole={userProfile!.role} />} />
              <Route path="/quiz/:setId" element={<Quiz />} />
              <Route path="/scores" element={<AdminRoute><ScoreReport /></AdminRoute>} />
              <Route path="/manage-sets" element={<AdminRoute><ManageQuizSets /></AdminRoute>} />
              <Route path="/manage-questions" element={<AdminRoute><ManageQuestions /></AdminRoute>} />
              <Route path="/manage-departments" element={<AdminRoute><ManageDepartments /></AdminRoute>} />
              <Route path="/manage-users" element={<AdminRoute><ManageUsers /></AdminRoute>} />
              <Route path="/analytics" element={<AdminRoute><AnalyticsDashboard /></AdminRoute>} />
              <Route path="/survey-report" element={<AdminRoute><SurveyReport /></AdminRoute>} />
              <Route path="/user-summary" element={<AdminRoute><UserScoreSummary /></AdminRoute>} />
              <Route path="/add-question" element={<AdminRoute><AddQuestionChoice /></AdminRoute>} />
              <Route path="/add-quiz-question" element={<AdminRoute><AddQuizQuestion /></AdminRoute>} />
              <Route path="/add-survey-question" element={<AdminRoute><AddSurveyQuestion /></AdminRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <footer className="text-center mt-16 py-8 border-t border-gray-300 dark:border-gray-800"><p className="text-gray-600 dark:text-gray-500 font-medium">Masaru PowerTools - ระบบจัดการข้อสอบออนไลน์</p></footer>
        </div>
      </div>
  );
}

function AppRouter() {
    const { currentUser, userProfile, loading } = useAuth();
    if (loading) { return <LoadingSpinner message="กำลังตรวจสอบสิทธิ์..." />; }
    if (currentUser && !userProfile) { return <LoadingSpinner message="กำลังโหลดข้อมูลผู้ใช้..." />; }
    return (
        <Routes>
            {currentUser && userProfile ? (
                <Route path="/*" element={<AppContent />} />
            ) : (
                <Route path="/*" element={<AuthPage />} />
            )}
        </Routes>
    );
}

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
            <QuizProvider>
                <AppRouter />
            </QuizProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;