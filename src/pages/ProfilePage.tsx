import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, Building2, BarChart3, Clock, HelpCircle, ShieldAlert, Edit, Trash2, Loader2, ChevronsRight, UserCog } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQuizContext } from '../context/QuizContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNotification } from '../context/NotificationContext';
import type { FirebaseScore, UserProfile } from '../services/firebaseService';
import EditProfileModal from '../components/common/EditProfileModal';
import EditNameModal from '../components/common/EditNameModal';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId?: string }>();
  const { userProfile: loggedInUserProfile } = useAuth();
  const { scores, updateUserProfile, deleteUser, deleteScore } = useQuizContext();
  const { showNotification, showConfirmation } = useNotification();

  const [viewedUserProfile, setViewedUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminEditModalOpen, setIsAdminEditModalOpen] = useState(false);
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  const [deletingScoreId, setDeletingScoreId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      const targetId = userId || loggedInUserProfile?.uid;
      if (!targetId) { setLoading(false); return; }
      if (targetId === loggedInUserProfile?.uid && loggedInUserProfile) {
        setViewedUserProfile(loggedInUserProfile);
      } else {
        const userDocRef = doc(db, 'users', targetId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setViewedUserProfile({ ...userDocSnap.data(), uid: userDocSnap.id } as UserProfile);
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
        showNotification('Success', 'Profile information updated successfully.', 'success');
    } catch (error) { showNotification('Error', 'Could not update profile information.', 'error'); }
  };

  const handleDeleteUser = () => {
    if (!viewedUserProfile) return;
    showConfirmation('Confirm User Deletion', `Are you sure you want to delete the account for "${viewedUserProfile.name}" and all their test history?`, async () => {
        try {
            await deleteUser(viewedUserProfile.uid);
            showNotification('Success', `Account for ${viewedUserProfile.name} has been deleted.`, 'success');
            navigate('/scores');
        } catch (error) { showNotification('Error', 'Could not delete the account.', 'error'); }
    });
  };

  const handleDeleteScore = (score: FirebaseScore) => {
    showConfirmation('Confirm Deletion', `Are you sure you want to delete the test record for "${score.setName}"?`, async () => {
        setDeletingScoreId(score.id!);
        try {
            await deleteScore(score.id!);
            showNotification('Success', 'Test record deleted successfully.', 'success');
        } catch (error) { showNotification('Error', 'Could not delete the record.', 'error'); } 
        finally { setDeletingScoreId(null); }
    });
  };

  if (loading) return <LoadingSpinner message="Loading profile..." />;
  if (!viewedUserProfile) return (
    <div className="max-w-5xl mx-auto text-center p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Not Found</h1>
        <button onClick={() => navigate(-1)} className="mt-4 px-5 py-2 bg-[#d93327] text-white rounded-xl">Go Back</button>
    </div>
  );

  const isOwnProfile = viewedUserProfile.uid === loggedInUserProfile?.uid;
  const isAdmin = loggedInUserProfile?.role === 'admin';

  return (
    <div className="max-w-5xl mx-auto">
      {isAdminEditModalOpen && viewedUserProfile && <EditProfileModal user={viewedUserProfile} onClose={() => setIsAdminEditModalOpen(false)} onSave={handleSaveProfile} />}
      {isEditNameModalOpen && viewedUserProfile && <EditNameModal user={viewedUserProfile} onClose={() => setIsEditNameModalOpen(false)} onSave={handleSaveProfile} />}
      
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            <ArrowLeft className="w-5 h-5" />
            <span>Go Back</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{isOwnProfile ? 'Your Profile' : `Profile of ${viewedUserProfile.name}`}</h1>
        <div className="w-36"></div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 mb-8 dark:bg-gray-900/50 dark:border-gray-800">
        <div className="flex justify-between items-start">
            <div className="flex items-center space-x-6">
                <div className="bg-red-100 p-4 rounded-full dark:bg-red-900/30">
                    <User className="w-10 h-10 text-red-600 dark:text-red-400" />
                </div>
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{viewedUserProfile.name}</h2>
                        {isOwnProfile && (
                            <button onClick={() => setIsEditNameModalOpen(true)} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-200 rounded-lg dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700/50" title="Edit Name">
                                <Edit className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-2"><Mail className="w-4 h-4" /><span>{viewedUserProfile.email}</span></div>
                        <div className="flex items-center space-x-2"><Building2 className="w-4 h-4" /><span>{viewedUserProfile.department}</span></div>
                        {viewedUserProfile.role === 'admin' && <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400"><UserCog className="w-4 h-4" /><span>Admin</span></div>}
                    </div>
                </div>
            </div>
            {isAdmin && (
                <div className="flex space-x-2">
                    <button onClick={() => setIsAdminEditModalOpen(true)} className="p-2 text-blue-500 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg" title="Edit Profile (Admin)">
                        <Edit className="w-5 h-5" />
                    </button>
                    {!isOwnProfile && <button onClick={handleDeleteUser} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg" title="Delete User Account"><Trash2 className="w-5 h-5" /></button>}
                </div>
            )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm dark:bg-gray-900/50 dark:border-gray-800">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
                <BarChart3 className="w-6 h-6 text-red-500 dark:text-red-400" />
                <span>Test History</span>
            </h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {userScores.length > 0 ? (
            userScores.map(score => (
              <Link to={`/review/${score.id}`} key={score.id} className="p-6 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex-wrap gap-4 group">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{score.setName}</h3>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500 dark:text-gray-500">
                    <div className="flex items-center space-x-1"><Clock className="w-4 h-4" /><span>Taken on: {score.timestamp instanceof Date ? score.timestamp.toLocaleDateString('en-CA') : 'N/A'}</span></div>
                    {(score.cheatAttempts ?? 0) > 0 && (<div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-400"><ShieldAlert className="w-4 h-4" /><span>Tab switches: {score.cheatAttempts} (Penalty: {score.penaltyPoints} pts)</span></div>)}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{score.score}/{score.totalQuestions} pts</p>
                      <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full 
                            ${typeof score.percentage === 'number' && score.percentage >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 
                             typeof score.percentage === 'number' && score.percentage >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : 
                             'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                          {typeof score.percentage === 'number' ? `${score.percentage.toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                    {isAdmin ? (
                        <button onClick={(e) => { e.preventDefault(); handleDeleteScore(score); }} disabled={deletingScoreId === score.id} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg" title="Delete this record">
                            {deletingScoreId === score.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                        </button>
                    ) : (
                        <ChevronsRight className="w-6 h-6 text-gray-400 dark:text-gray-600 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors" />
                    )}
                </div>
              </Link>
            ))
          ) : (
            <div className="p-12 text-center text-gray-500">
              <HelpCircle className="w-12 h-12 mx-auto mb-4" />
              <p className="text-lg">No test history available.</p>
              {isOwnProfile && (<button onClick={() => navigate('/quiz-selection')} className="mt-4 px-5 py-2 bg-[#d93327] text-white rounded-xl">Start a Quiz!</button>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;