import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Admin() {
  const { users, organizations, addUser, deleteUser, addOrganization } = useAuth();
  const { t, dir } = useLanguage();

  // Simple form states
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserOrgName, setNewUserOrgName] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Confirmation state
  const [confirmationData, setConfirmationData] = useState<{ name: string; email: string; orgName: string } | null>(null);
  
  // Autocomplete state
  const [orgSuggestions, setOrgSuggestions] = useState<string[]>([]);

  const handleOrgInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewUserOrgName(value);
    if (value.length > 0) {
      const matches = organizations
        .map(o => o.name)
        .filter(name => name.toLowerCase().includes(value.toLowerCase()));
      setOrgSuggestions(matches);
    } else {
      setOrgSuggestions([]);
    }
  };

  const selectOrgSuggestion = (name: string) => {
    setNewUserOrgName(name);
    setOrgSuggestions([]);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = newUserEmail.trim();
    const trimmedName = newUserName.trim();
    const trimmedOrgName = newUserOrgName.trim();

    if (!trimmedEmail || !trimmedName || !trimmedOrgName) {
      return;
    }

    // Check if user already exists
    if (users.some(u => u.email.toLowerCase() === trimmedEmail.toLowerCase())) {
      setError(`User with email ${trimmedEmail} already exists.`);
      return;
    }

    // Find organization
    const existingOrg = organizations.find(o => o.name.toLowerCase() === trimmedOrgName.toLowerCase());
    
    if (existingOrg) {
      // Org exists, add user directly
      addUser({
        email: trimmedEmail,
        name: trimmedName,
        role: 'user',
        organizationId: existingOrg.id
      });
      setNewUserEmail('');
      setNewUserName('');
      setNewUserOrgName('');
      setOrgSuggestions([]);
    } else {
      // Org doesn't exist, show confirmation modal
      setConfirmationData({
        name: trimmedName,
        email: trimmedEmail,
        orgName: trimmedOrgName
      });
    }
  };

  const confirmCreateOrgAndUser = () => {
    if (!confirmationData) return;

    const { name, email, orgName } = confirmationData;
    const newOrgId = addOrganization({ name: orgName });
    
    addUser({
      email,
      name,
      role: 'user',
      organizationId: newOrgId
    });

    setNewUserEmail('');
    setNewUserName('');
    setNewUserOrgName('');
    setOrgSuggestions([]);
    setConfirmationData(null);
  };

  return (
    <div className="space-y-6" dir={dir}>
      <h1 className="text-2xl font-bold text-gray-900">{t('nav.admin')}</h1>

      <div className="bg-white shadow rounded-lg overflow-hidden relative">
        <div className="p-6">
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}
              <form onSubmit={handleAddUser} className="flex gap-4 items-end bg-gray-50 p-4 rounded-md relative z-20">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    required
                  />
                </div>
                <div className="flex-1 relative">
                  <label className="block text-sm font-medium text-gray-700">Organization</label>
                  <input
                    type="text"
                    value={newUserOrgName}
                    onChange={handleOrgInputChange}
                    onBlur={() => setTimeout(() => setOrgSuggestions([]), 200)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    required
                    placeholder="Type to search..."
                    autoComplete="off"
                  />
                  {orgSuggestions.length > 0 && (
                    <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                      {orgSuggestions.map((suggestion, idx) => (
                        <li 
                          key={idx}
                          onClick={() => selectOrgSuggestion(suggestion)}
                          className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm text-gray-700"
                        >
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4 me-2" /> Add User
                </motion.button>
              </form>

              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                    <th className="px-6 py-3 text-end text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {organizations.find(o => o.id === user.organizationId)?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deleteUser(user.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {confirmationData && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Create New Organization?</h3>
                  <button 
                    onClick={() => setConfirmationData(null)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <p className="text-sm text-gray-600 mb-6">
                  You are about to create a new organization <span className="font-semibold text-gray-900">{confirmationData.orgName}</span> and add a new user <span className="font-semibold text-gray-900">{confirmationData.name}</span> to it. Confirm please.
                </p>

                <div className="flex justify-end gap-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setConfirmationData(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={confirmCreateOrgAndUser}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Confirm
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
