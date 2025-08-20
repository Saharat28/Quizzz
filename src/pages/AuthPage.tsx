import React, { useState } from 'react';
import { BookOpen, Mail } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useQuizContext } from '../context/QuizContext';
import { useNotification } from '../context/NotificationContext';
import LoadingSpinner from '../components/LoadingSpinner'; // 1. Import LoadingSpinner

const ForgotPasswordModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
}> = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { showNotification } = useNotification();

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            showNotification('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกอีเมลของคุณ', 'error');
            return;
        }
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            showNotification('ส่งอีเมลสำเร็จ', 'กรุณาตรวจสอบกล่องจดหมายของคุณเพื่อตั้งรหัสผ่านใหม่', 'success');
            onClose();
        } catch (error: any) {
            console.error("Password reset error:", error);
            showNotification('เกิดข้อผิดพลาด', 'ไม่พบอีเมลนี้ในระบบ หรือเกิดข้อผิดพลาดบางอย่าง', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 dark:bg-gray-900 dark:border dark:border-gray-700">
                <div className="flex items-center space-x-3 mb-6">
                    <Mail className="w-8 h-8 text-red-500 dark:text-red-400" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">ลืมรหัสผ่าน</h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6">กรอกอีเมลที่ใช้สมัครสมาชิก ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้</p>
                <form onSubmit={handlePasswordReset}>
                    <div className="space-y-4">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-100 border border-gray-300 text-gray-900 rounded-xl text-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                            placeholder="กรอกอีเมลของคุณ"
                            autoFocus
                            required
                        />
                        <button type="submit" disabled={isLoading} className="w-full px-6 py-3 bg-[#d93327] text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
                            {isLoading ? 'กำลังส่ง...' : 'ส่งอีเมลรีเซ็ตรหัสผ่าน'}
                        </button>
                        <button type="button" onClick={onClose} className="w-full px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                            ยกเลิก
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const AuthPage: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  // 2. ดึง 'loading' มาจาก useQuizContext
  const { departments, loading: isQuizContextLoading } = useQuizContext();
  const { showNotification } = useNotification();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !department || !email || !password) {
      showNotification('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกข้อมูลให้ครบทุกช่อง', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name,
        department,
        email: user.email,
        role: 'user',
      });

      showNotification('สมัครสมาชิกสำเร็จ', 'ยินดีต้อนรับ! คุณสามารถเข้าสู่ระบบได้เลย', 'success');
      setIsLoginView(true);
    } catch (error: any) {
      console.error("Registration error:", error.code);
      let errorMessage = 'เกิดข้อผิดพลาดในการสมัครสมาชิก';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'รหัสผ่านไม่ปลอดภัย กรุณาตั้งรหัสผ่านอย่างน้อย 6 ตัวอักษร';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
      }
      showNotification('สมัครไม่สำเร็จ', errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Login error:", error);
      showNotification('เข้าสู่ระบบไม่สำเร็จ', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. ถ้าข้อมูลพื้นฐานกำลังโหลดอยู่ ให้แสดงหน้า Loading Spinner
  if (isQuizContextLoading) {
    return <LoadingSpinner message="กำลังเตรียมข้อมูล..." />;
  }

  const formInputStyle = "w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white";
  const formLabelStyle = "block text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col items-center justify-center p-4 dark:bg-[#010b13] dark:text-gray-300">
      <ForgotPasswordModal isOpen={showForgotPassword} onClose={() => setShowForgotPassword(false)} />

      <header className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-[#d93327] rounded-2xl mb-6 shadow-lg shadow-red-500/20 dark:shadow-red-900/20"><BookOpen className="w-10 h-10 text-white" /></div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#d93327] to-red-500 bg-clip-text text-transparent mb-2">คลังข้อสอบออนไลน์ MASARU</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">พัฒนาทักษะและความรู้ของคุณได้ทุกที่ ทุกเวลา</p>
      </header>

      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-xl p-8 dark:bg-gray-900/50 dark:border-gray-800">
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button onClick={() => setIsLoginView(true)} className={`flex-1 pb-3 font-semibold text-lg transition-colors ${isLoginView ? 'text-[#d93327] border-b-2 border-[#d93327]' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}>เข้าสู่ระบบ</button>
          <button onClick={() => setIsLoginView(false)} className={`flex-1 pb-3 font-semibold text-lg transition-colors ${!isLoginView ? 'text-[#d93327] border-b-2 border-[#d93327]' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}>สมัครสมาชิก</button>
        </div>

        {isLoginView ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className={formLabelStyle}>อีเมล</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={formInputStyle} required />
            </div>
            <div>
              <label className={formLabelStyle}>รหัสผ่าน</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={formInputStyle} required />
            </div>
            <div className="text-right">
                <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:underline">
                    ลืมรหัสผ่าน?
                </button>
            </div>
            <button type="submit" disabled={isLoading} className="w-full px-6 py-4 bg-[#d93327] text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">{isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className={formLabelStyle}>ชื่อ - นามสกุล</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className={formInputStyle} required />
            </div>
            <div>
              <label className={formLabelStyle}>แผนก</label>
              <select value={department} onChange={e => setDepartment(e.target.value)} className={formInputStyle} required>
                <option value="">-- กรุณาเลือกแผนก --</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className={formLabelStyle}>อีเมล</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={formInputStyle} required />
            </div>
            <div>
              <label className={formLabelStyle}>รหัสผ่าน</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={formInputStyle} required />
            </div>
            <button type="submit" disabled={isLoading} className="w-full mt-4 px-6 py-4 bg-[#d93327] text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">{isLoading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthPage;