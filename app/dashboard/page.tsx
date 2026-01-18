'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { apiRequest } from '@/lib/api';
import Link from 'next/link';
import { Plus, Users, Trash2, Edit } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  participantIds: string[];
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadGroups();
  }, [router]);

  const loadGroups = async () => {
    try {
      const data = await apiRequest<{ groups: Group[] }>('/api/groups');
      setGroups(data.groups);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await apiRequest<{ group: Group }>('/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: newGroupName }),
      });
      setGroups([...groups, data.group]);
      setNewGroupName('');
      setShowCreateModal(false);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group? This will delete all associated expenses.')) {
      return;
    }
    try {
      await apiRequest(`/api/groups/${id}`, { method: 'DELETE' });
      setGroups(groups.filter(g => g.id !== id));
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">My Groups</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Create Group</span>
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No groups yet. Create your first group to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <div
                key={group.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">{group.name}</h3>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-gray-600 mb-4">
                  {group.participantIds.length} participant{group.participantIds.length !== 1 ? 's' : ''}
                </p>
                <Link
                  href={`/groups/${group.id}`}
                  className="block w-full bg-primary-600 text-white text-center py-2 px-4 rounded-md hover:bg-primary-700"
                >
                  View Group
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Create New Group</h3>
            <form onSubmit={handleCreateGroup}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Weekend Trip"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewGroupName('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
