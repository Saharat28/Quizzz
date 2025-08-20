import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Users } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { useNotification } from '../context/NotificationContext';
import type { FirebaseDepartment } from '../services/firebaseService';

const ManageDepartments: React.FC = () => {
  const navigate = useNavigate();
  const { departments, addDepartment, updateDepartment, deleteDepartment } = useQuizContext();
  const { showNotification, showConfirmation } = useNotification();

  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [editingDepartment, setEditingDepartment] = useState<FirebaseDepartment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartmentName.trim()) {
      showNotification('Incomplete Data', 'Please enter a department name.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingDepartment) {
        await updateDepartment(editingDepartment.id!, { name: newDepartmentName });
        showNotification('Success', 'Department name updated successfully.', 'success');
      } else {
        await addDepartment({ name: newDepartmentName });
        showNotification('Success', 'New department added successfully.', 'success');
      }
      cancelEdit();
    } catch (error) {
      console.error("Error saving department:", error);
      showNotification('Error', 'An error occurred while saving the data.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (department: FirebaseDepartment) => {
    setEditingDepartment(department);
    setNewDepartmentName(department.name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingDepartment(null);
    setNewDepartmentName('');
  };

  const handleDelete = (department: FirebaseDepartment) => {
    showConfirmation(
        'Confirm Deletion',
        `Are you sure you want to delete the department "${department.name}"?`,
        async () => {
            try {
                await deleteDepartment(department.id!);
                showNotification('Success', 'Department deleted successfully.', 'success');
            } catch (error) {
                console.error("Error deleting department:", error);
                showNotification('Error', 'Could not delete the department.', 'error');
            }
        }
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Home</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Departments</h1>
        <div className="w-36"></div> {/* Placeholder for alignment */}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 mb-8 dark:bg-gray-900/50 dark:border-gray-800">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {editingDepartment ? 'Edit Department Name' : 'Add New Department'}
        </h2>
        <form onSubmit={handleAddOrUpdate} className="flex flex-col sm:flex-row sm:items-end sm:space-x-4 space-y-4 sm:space-y-0">
          <div className="flex-grow">
            <label htmlFor="dept-name" className="block text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Department Name</label>
            <input
              id="dept-name"
              type="text"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              placeholder="e.g., IT, HR, Marketing"
              required
            />
          </div>
          <div className="flex space-x-3">
            {editingDepartment && (
              <button type="button" onClick={cancelEdit} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-grow flex items-center justify-center space-x-2 px-6 py-3 bg-[#d93327] text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>{isSubmitting ? 'Saving...' : (editingDepartment ? 'Save' : 'Add')}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm dark:bg-gray-900/50 dark:border-gray-800">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All Departments</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {departments.map((dept) => (
            <div key={dept.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                <span className="text-lg font-medium text-gray-800 dark:text-gray-200">{dept.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => handleEdit(dept)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors dark:text-blue-400 dark:hover:bg-blue-900/50" title="Edit">
                  <Edit className="w-5 h-5" />
                </button>
                <button onClick={() => handleDelete(dept)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors dark:hover:bg-red-900/50" title="Delete">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        {departments.length === 0 && (
          <p className="p-8 text-center text-gray-500">No departments in the system yet.</p>
        )}
      </div>
    </div>
  );
};

export default ManageDepartments;