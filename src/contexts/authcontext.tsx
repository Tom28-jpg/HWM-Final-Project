import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'patient' | 'doctor' | 'admin';
  hospitalId?: string;
  licenseId?: string;
  registrationDate: string;
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string, role: string) => Promise<{ success: boolean; message?: string }>;
  register: (userData: any, role: string) => Promise<{ success: boolean; message?: string; userId?: string }>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  deleteAccount: (userId: string) => Promise<{ success: boolean; message?: string }>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Generate unique ID based on role and date
const generateId = (role: string): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const dateStr = `${day}${month}${year}`;
  
  // Get existing users for today to determine count
  const existingUsers = JSON.parse(localStorage.getItem('wizards_users') || '[]');
  const todayUsers = existingUsers.filter((user: any) => 
    user.role === role && user.registrationDate === `${year}-${month}-${day}`
  );
  
  const count = String(todayUsers.length + 1).padStart(6, '0');
  return `${role.toUpperCase()}${dateStr}${count}`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('wizards_current_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const register = async (userData: any, role: string): Promise<{ success: boolean; message?: string; userId?: string }> => {
    try {
      // Get existing users
      const existingUsers = JSON.parse(localStorage.getItem('wizards_users') || '[]');
      
      // Check if user already exists
      const userExists = existingUsers.some((u: any) => 
        u.email === userData.email || u.phone === userData.phone
      );
      
      if (userExists) {
        return { success: false, message: 'User with this email or phone already exists.' };
      }

      // Generate unique ID
      const userId = generateId(role);
      const now = new Date();
      
      const newUser: User = {
        id: userId,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: role as 'patient' | 'doctor' | 'admin',
        hospitalId: userData.hospitalId,
        licenseId: userData.licenseId,
        registrationDate: now.toISOString().split('T')[0],
      };

      // Store user data
      const updatedUsers = [...existingUsers, { ...newUser, password: userData.password }];
      localStorage.setItem('wizards_users', JSON.stringify(updatedUsers));

      return { success: true, message: 'Registration successful!', userId };
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, message: 'Registration failed. Please try again.' };
    }
  };

  const login = async (identifier: string, password: string, role: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const existingUsers = JSON.parse(localStorage.getItem('wizards_users') || '[]');
      
      // Find user by email, phone, or ID
      const foundUser = existingUsers.find((u: any) => 
        (u.email === identifier || u.phone === identifier || u.id === identifier) && 
        u.role === role && 
        u.password === password
      );

      if (!foundUser) {
        return { success: false, message: 'The entered details do not match our database. Please check and try again.' };
      }

      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('wizards_current_user', JSON.stringify(userWithoutPassword));
      
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem('wizards_current_user', JSON.stringify(updatedUser));
    
    // Update in users list
    const existingUsers = JSON.parse(localStorage.getItem('wizards_users') || '[]');
    const updatedUsers = existingUsers.map((u: any) => 
      u.id === user.id ? { ...u, ...userData } : u
    );
    localStorage.setItem('wizards_users', JSON.stringify(updatedUsers));
  };

  const deleteAccount = async (userId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const existingUsers = JSON.parse(localStorage.getItem('wizards_users') || '[]');
      const updatedUsers = existingUsers.filter((u: any) => u.id !== userId);
      localStorage.setItem('wizards_users', JSON.stringify(updatedUsers));
      
      // If deleting current user, logout
      if (user && user.id === userId) {
        logout();
      }
      
      return { success: true, message: 'Account deleted successfully.' };
    } catch (error) {
      console.error('Delete account failed:', error);
      return { success: false, message: 'Failed to delete account. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('wizards_current_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, deleteAccount, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};