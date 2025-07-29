import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, Building2, BarChart3, Clock, HelpCircle, ShieldAlert, Edit, Trash2, Loader2, ChevronsRight } from 'lucide-react';
import { useAuth, UserProfile } from '../context/AuthContext';
import { useQuizContext } from '../context/QuizContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNotification } from '../context/NotificationContext';
import type { FirebaseScore } from '../services/firebaseService';

const EditProfileModal: React.FC<{ user: UserProfile; onClose: () => void; onSave: (uid: string, updates: Partial<UserProfile>) => Promise<void>; }> = ({ user, onClose, onSave }) => {
    const { departments } = useQuizContext();
    const [name, setName] = useState(user.name);
    const [department, setDepartment] = useState(user.department);
    const [role, setRole] = useState(user.role);
    const [isSaving, setIsSaving] = useState(false);
    const handleSave = async () => { setIsSaving(true); await onSave(user.uid, { name, department, role }); setIsSaving(false); onClose(); };
    const formInputStyle = "w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-red-500 focus:border-red-500";
    const formLabelStyle = "block text-lg font-semibold text-gray-300 mb-2";
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-xl w-full max-w-lg p-8">
                <h2 className="text-2xl font-bold text-white mb-6">แก้ไขโปรไฟล์ - {user.name}</h2>
                <div className="space-y-4">
                    <div><label className={formLabelStyle}>ชื่อ - นามสกุล</label><input type="text" value={name} onChange={e => setName(e.target.value)} className={formInputStyle} /></div>
                    <div><label className={formLabelStyle}>แผนก</label><select value={department} onChange={e => setDepartment(e.target.value)} className={formInputStyle}>{departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}</select></div>
                    <div><label className={formLabelStyle}>สิทธิ์การใช้งาน (Role)</label><select value={role} onChange={e => setRole(e.target.value as 'admin' | 'user')} className={formInputStyle}><option value="user">User</option><option value="admin">Admin</option></select></div>
                </div>
                <div className="flex space-x-4 mt-8">
                    <button onClick={onClose} className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-xl font-semibold hover:bg-gray-600 transition-colors">ยกเลิก</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex-1 px-6 py-3 bg-[#d93327] text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">{isSaving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                </div>
            </div>
        </div>
    );
};


const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId?: string }>();
  const { userProfile: loggedInUserProfile } = useAuth();
  const { scores, updateUserProfile, deleteUser, deleteScore } = useQuizContext();
  const { showNotification, showConfirmation } = useNotification();

  const [viewedUserProfile, setViewedUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingScoreId, setDeletingScoreId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      const targetId = userId || loggedInUserProfile?.uid;
      if (!targetId) { setLoading(false); return; }
      if (targetId === loggedInUserProfile?.uid) {
        setViewedUserProfile(loggedInUserProfile);
      } else {
        const userDocRef = doc(db, 'users', targetId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setViewedUserProfile(userDocSnap.data() as UserProfile);
        } else {
          setViewedUserProfile(null);
        }
      }
      setLoading(false);
    };
    if (loggedInUserProfile) { fetchUserProfile(); }
  }, [userId, loggedInUserProfile]);

  const userScores = useMemo(() => {
    if (!viewedUserProfile) return [];
    return scores.filter(score => score.userId === viewedUserProfile.uid).sort((a, b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime());
  }, [scores, viewedUserProfile]);

  const handleSaveProfile = async (uid: string, updates: any) => {
    try {
        await updateUserProfile(uid, updates);
        setViewedUserProfile(prev => prev ? { ...prev, ...updates } : null);
        showNotification('สำเร็จ', 'อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว', 'success');
    } catch (error) { showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดตข้อมูลได้', 'error'); }
  };

  const handleDeleteUser = () => {
    if (!viewedUserProfile) return;
    showConfirmation('ยืนยันการลบผู้ใช้', `ต้องการลบบัญชีของ "${viewedUserProfile.name}" และประวัติการสอบทั้งหมดใช่หรือไม่?`, async () => {
        try {
            await deleteUser(viewedUserProfile.uid);
            showNotification('สำเร็จ', `ลบบัญชีของ ${viewedUserProfile.name} เรียบร้อยแล้ว`, 'success');
            navigate('/scores');
        } catch (error) { showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถลบบัญชีได้', 'error'); }
    });
  };

  const handleDeleteScore = (score: FirebaseScore) => {
    showConfirmation('ยืนยันการลบ', `ต้องการลบประวัติการสอบ "${score.setName}" ใช่หรือไม่?`, async () => {
        setDeletingScoreId(score.id!);
        try {
            await deleteScore(score.id!);
            showNotification('สำเร็จ', 'ลบประวัติการสอบเรียบร้อยแล้ว', 'success');
        } catch (error) { showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error'); } 
        finally { setDeletingScoreId(null); }
    });
  };

  if (loading) return <LoadingSpinner message="กำลังโหลดข้อมูลโปรไฟล์..." />;
  if (!viewedUserProfile) return (
    <div className="max-w-5xl mx-auto text-center p-8">
        <h1 className="text-2xl font-bold text-white">ไม่พบข้อมูลผู้ใช้</h1>
        <button onClick={() => navigate(-1)} className="mt-4 px-5 py-2 bg-[#d93327] text-white rounded-xl">ย้อนกลับ</button>
    </div>
  );

  const isOwnProfile = viewedUserProfile.uid === loggedInUserProfile?.uid;
  const isAdmin = loggedInUserProfile?.role === 'admin';

  return (
    <div className="max-w-5xl mx-auto">
      {isEditModalOpen && viewedUserProfile && <EditProfileModal user={viewedUserProfile} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveProfile} />}
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /><span>ย้อนกลับ</span></button>
        <h1 className="text-3xl font-bold text-white">{isOwnProfile ? 'โปรไฟล์ของคุณ' : `โปรไฟล์ของ ${viewedUserProfile.name}`}</h1>
        <div className="w-36"></div>
      </div>
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl shadow-lg p-8 mb-8">
        <div className="flex justify-between items-start">
            <div className="flex items-center space-x-6">
                <div className="bg-red-900/30 p-4 rounded-full"><User className="w-10 h-10 text-red-400" /></div>
                <div>
                    <h2 className="text-3xl font-bold text-white">{viewedUserProfile.name}</h2>
                    <div className="flex items-center space-x-4 mt-2 text-gray-400">
                        <div className="flex items-center space-x-2"><Mail className="w-4 h-4" /><span>{viewedUserProfile.email}</span></div>
                        <div className="flex items-center space-x-2"><Building2 className="w-4 h-4" /><span>{viewedUserProfile.department}</span></div>
                    </div>
                </div>
            </div>
            {isAdmin && !isOwnProfile && (
                <div className="flex space-x-2">
                    <button onClick={() => setIsEditModalOpen(true)} className="p-2 text-blue-400 hover:bg-blue-900/50 rounded-lg" title="แก้ไขโปรไฟล์"><Edit className="w-5 h-5" /></button>
                    <button onClick={handleDeleteUser} className="p-2 text-red-500 hover:bg-red-900/50 rounded-lg" title="ลบบัญชีผู้ใช้"><Trash2 className="w-5 h-5" /></button>
                </div>
            )}
        </div>
      </div>
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl shadow-lg">
        <div className="p-6 border-b border-gray-800"><h2 className="text-2xl font-bold text-white flex items-center space-x-3"><BarChart3 className="w-6 h-6 text-red-400" /><span>ประวัติการทำข้อสอบ</span></h2></div>
        <div className="divide-y divide-gray-800">
          {userScores.length > 0 ? (
            userScores.map(score => (
              <Link to={`/review/${score.id}`} key={score.id} className="p-6 flex justify-between items-center hover:bg-gray-800/50 transition-colors flex-wrap gap-4 group">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white group-hover:text-red-400 transition-colors">{score.setName}</h3>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                    <div className="flex items-center space-x-1"><Clock className="w-4 h-4" /><span>ทำเมื่อ: {score.timestamp instanceof Date ? score.timestamp.toLocaleDateString('th-TH') : 'N/A'}</span></div>
                    {(score.cheatAttempts ?? 0) > 0 && (<div className="flex items-center space-x-1 text-yellow-400"><ShieldAlert className="w-4 h-4" /><span>สลับหน้าจอ: {score.cheatAttempts} ครั้ง (ถูกหัก {score.penaltyPoints} คะแนน)</span></div>)}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-xl font-bold text-white">{score.score}/{score.totalQuestions} คะแนน</p>
                      <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${typeof score.percentage === 'number' && score.percentage >= 80 ? 'bg-green-900/50 text-green-300' : typeof score.percentage === 'number' && score.percentage >= 60 ? 'bg-yellow-900/50 text-yellow-300' : 'bg-red-900/50 text-red-300'}`}>{typeof score.percentage === 'number' ? `${score.percentage.toFixed(1)}%` : 'N/A'}</span>
                    </div>
                    {isAdmin ? (
                        <button onClick={(e) => { e.preventDefault(); handleDeleteScore(score); }} disabled={deletingScoreId === score.id} className="p-2 text-red-500 hover:bg-red-900/50 rounded-lg" title="ลบประวัติการสอบนี้">
                            {deletingScoreId === score.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                        </button>
                    ) : (
                        <ChevronsRight className="w-6 h-6 text-gray-600 group-hover:text-red-400 transition-colors" />
                    )}
                </div>
              </Link>
            ))
          ) : (
            <div className="p-12 text-center text-gray-500">
              <HelpCircle className="w-12 h-12 mx-auto mb-4" />
              <p className="text-lg">ยังไม่มีประวัติการทำข้อสอบ</p>
              {isOwnProfile && (<button onClick={() => navigate('/quiz-selection')} className="mt-4 px-5 py-2 bg-[#d93327] text-white rounded-xl">เริ่มทำข้อสอบเลย!</button>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;