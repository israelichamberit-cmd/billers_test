import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Organization } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  organizations: Organization[];
  users: User[];
  addUser: (user: Omit<User, 'id'>) => void;
  deleteUser: (id: string) => void;
  addOrganization: (org: Omit<Organization, 'id'>) => string;
  deleteOrganization: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock Data
const MOCK_ORGS: Organization[] = [
  { id: 'org1', name: 'Acme Corp' },
  { id: 'org2', name: 'Globex Inc' },
];

const MOCK_USERS: User[] = [
  { id: 'u1', email: 'admin@lawyal.com', role: 'admin', organizationId: 'org1', name: 'Admin User' },
  { id: 'u2', email: 'manager@acme.com', role: 'user', organizationId: 'org1', name: 'Office Manager' },
  { id: 'u3', email: 'manager@globex.com', role: 'user', organizationId: 'org2', name: 'Globex Manager' },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [organizations, setOrganizations] = useState<Organization[]>(MOCK_ORGS);

  const login = async (email: string) => {
    // Simple mock login
    const foundUser = users.find(u => u.email === email);
    if (foundUser) {
      setUser(foundUser);
    } else {
      throw new Error('User not found');
    }
  };

  const logout = () => {
    setUser(null);
  };

  const addUser = (newUser: Omit<User, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setUsers(prev => [...prev, { ...newUser, id }]);
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const addOrganization = (newOrg: Omit<Organization, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setOrganizations(prev => [...prev, { ...newOrg, id }]);
    return id;
  };

  const deleteOrganization = (id: string) => {
    setOrganizations(prev => prev.filter(o => o.id !== id));
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      organizations,
      users,
      addUser,
      deleteUser,
      addOrganization,
      deleteOrganization
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
