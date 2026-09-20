import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  deleteDoc 
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'patient' | 'doctor' | 'admin';
  hospitalId?: string;
  licenseId?: string;
  registrationDate: string;
  firebaseUid?: string;
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string, role: string) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: (role: 'patient' | 'doctor' | 'admin') => Promise<{ success: boolean; message?: string }>;
  loginWithOtp: (identifier: string, role: string) => Promise<{ success: boolean; message?: string }>;
  register: (userData: any, role: string) => Promise<{ success: boolean; message?: string; userId?: string }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  deleteAccount: (userId: string) => Promise<{ success: boolean; message?: string }>;
  isLoading: boolean;
  isFirebaseConnected: boolean;
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
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);

  useEffect(() => {
    // Seed default demo accounts in localStorage if empty
    const existingUsers = JSON.parse(localStorage.getItem('wizards_users') || '[]');
    if (existingUsers.length === 0) {
      const demoUsers: (User & { password: string })[] = [
        {
          id: 'PATIENT20240001',
          name: 'Mukesh Kumar',
          email: 'patient@demo.com',
          phone: '9876543210',
          role: 'patient',
          registrationDate: new Date().toISOString().split('T')[0],
          password: 'Password123!',
        },
        {
          id: 'DOCTOR20240001',
          name: 'Dr. Sarah Johnson',
          email: 'doctor@demo.com',
          phone: '9876543211',
          role: 'doctor',
          hospitalId: '1',
          licenseId: 'DOC-12345',
          registrationDate: new Date().toISOString().split('T')[0],
          password: 'Password123!',
        },
        {
          id: 'ADMIN20240001',
          name: 'System Admin',
          email: 'admin@demo.com',
          phone: '9876543212',
          role: 'admin',
          registrationDate: new Date().toISOString().split('T')[0],
          password: 'Password123!',
        }
      ];
      localStorage.setItem('wizards_users', JSON.stringify(demoUsers));
    }

    // Check for existing stored session first
    const storedUser = localStorage.getItem('wizards_current_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user', e);
      }
    }

    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as User;
            const fullUser = { ...data, firebaseUid: fbUser.uid };
            setUser(fullUser);
            localStorage.setItem('wizards_current_user', JSON.stringify(fullUser));
          }
        } catch (err) {
          console.warn('Firestore user fetch note:', err);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async (userData: any, role: string): Promise<{ success: boolean; message?: string; userId?: string }> => {
    try {
      // Get existing users
      const existingUsers = JSON.parse(localStorage.getItem('wizards_users') || '[]');
      
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

      // 1. Try registering in Firebase Authentication
      let firebaseUid: string | undefined = undefined;
      try {
        const userCred = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        firebaseUid = userCred.user.uid;
        newUser.firebaseUid = firebaseUid;
        
        // Save user document in Firestore
        await setDoc(doc(db, 'users', firebaseUid), {
          ...newUser,
          createdAt: now.toISOString()
        });
      } catch (fbErr: any) {
        console.warn('Firebase user creation note (falls back safely):', fbErr?.message);
      }

      // 2. Also keep local storage in sync
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
      // 1. Attempt Firebase Auth directly if identifier looks like an email
      if (identifier.includes('@')) {
        try {
          const userCred = await signInWithEmailAndPassword(auth, identifier, password);
          const fbUid = userCred.user.uid;
          
          // Fetch user profile from Firestore
          const userDoc = await getDoc(doc(db, 'users', fbUid));
          if (userDoc.exists()) {
            const data = userDoc.data() as User;
            if (data.role === role) {
              const fullUser = { ...data, firebaseUid: fbUid };
              setUser(fullUser);
              localStorage.setItem('wizards_current_user', JSON.stringify(fullUser));
              return { success: true };
            }
          }
        } catch (fbErr) {
          console.warn('Firebase direct sign-in fallback check:', fbErr);
        }
      }

      // 2. Also check local users database
      const existingUsers = JSON.parse(localStorage.getItem('wizards_users') || '[]');
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

  // Google Sign-In with Firebase
  const loginWithGoogle = async (role: 'patient' | 'doctor' | 'admin'): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      
      // Check if user profile already exists in Firestore
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      let profile: User;
      if (userDoc.exists()) {
        profile = userDoc.data() as User;
        // Verify role or update
        if (profile.role !== role) {
          profile.role = role;
          await setDoc(userDocRef, profile, { merge: true });
        }
      } else {
        // Create new user profile in Firestore
        const now = new Date();
        const userId = generateId(role);
        profile = {
          id: userId,
          name: fbUser.displayName || 'Google User',
          email: fbUser.email || '',
          phone: fbUser.phoneNumber || '',
          role: role,
          registrationDate: now.toISOString().split('T')[0],
          firebaseUid: fbUser.uid,
        };
        await setDoc(userDocRef, {
          ...profile,
          createdAt: now.toISOString()
        });
      }

      setUser(profile);
      localStorage.setItem('wizards_current_user', JSON.stringify(profile));

      // Sync into local users list as well
      const existingUsers = JSON.parse(localStorage.getItem('wizards_users') || '[]');
      if (!existingUsers.some((u: any) => u.email === profile.email)) {
        existingUsers.push(profile);
        localStorage.setItem('wizards_users', JSON.stringify(existingUsers));
      }

      return { success: true };
    } catch (error: any) {
      console.error('Google Sign-In failed:', error);
      return { success: false, message: error?.message || 'Google Sign-in failed. Please try again.' };
    }
  };

  const loginWithOtp = async (identifier: string, role: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const existingUsers = JSON.parse(localStorage.getItem('wizards_users') || '[]');
      
      const foundUser = existingUsers.find((u: any) => 
        (u.email === identifier || u.phone === identifier || u.id === identifier) && 
        u.role === role
      );

      if (!foundUser) {
        return { success: false, message: 'The entered details do not match our database. Please check and try again.' };
      }

      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('wizards_current_user', JSON.stringify(userWithoutPassword));
      
      return { success: true };
    } catch (error) {
      console.error('Login with OTP failed:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem('wizards_current_user', JSON.stringify(updatedUser));
    
    // Update in Firestore across all relevant IDs
    const idsToSync = new Set<string>();
    if (updatedUser.firebaseUid) idsToSync.add(updatedUser.firebaseUid);
    if (auth.currentUser?.uid) idsToSync.add(auth.currentUser.uid);
    if (updatedUser.id) idsToSync.add(updatedUser.id);
    if (user.id) idsToSync.add(user.id);

    for (const docId of idsToSync) {
      try {
        await setDoc(doc(db, 'users', docId), updatedUser, { merge: true });
      } catch (err) {
        console.warn(`Failed to sync user update to Firestore users/${docId}:`, err);
      }
    }

    // Update in local users list
    const existingUsers = JSON.parse(localStorage.getItem('wizards_users') || '[]');
    const updatedUsers = existingUsers.map((u: any) => 
      (u.id === user.id || (user.email && u.email === user.email)) ? { ...u, ...userData } : u
    );
    localStorage.setItem('wizards_users', JSON.stringify(updatedUsers));
  };

  const deleteAccount = async (userId?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const currentUser = user;
      const targetUserId = userId || currentUser?.id;
      const targetEmail = currentUser?.email;
      const firebaseUid = currentUser?.firebaseUid || auth.currentUser?.uid;

      // 1. Delete user from Firestore 'users' collection
      if (firebaseUid) {
        try {
          await deleteDoc(doc(db, 'users', firebaseUid));
        } catch (err) {
          console.warn('Failed to delete doc by firebaseUid in Firestore:', err);
        }
      }

      // Also clean up across users, patients, doctors collections in Firestore
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const userDeletePromises: Promise<any>[] = [];
        usersSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (
            docSnap.id === firebaseUid ||
            docSnap.id === targetUserId ||
            data.id === targetUserId ||
            (targetEmail && data.email === targetEmail) ||
            (firebaseUid && data.firebaseUid === firebaseUid)
          ) {
            userDeletePromises.push(deleteDoc(doc(db, 'users', docSnap.id)).catch(() => {}));
          }
        });
        await Promise.all(userDeletePromises);
      } catch (err) {
        console.warn('Firestore users collection search cleanup note:', err);
      }

      try {
        const patSnap = await getDocs(collection(db, 'patients'));
        const patDeletePromises: Promise<any>[] = [];
        patSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (
            docSnap.id === targetUserId ||
            data.id === targetUserId ||
            (targetEmail && data.email === targetEmail)
          ) {
            patDeletePromises.push(deleteDoc(doc(db, 'patients', docSnap.id)).catch(() => {}));
          }
        });
        await Promise.all(patDeletePromises);
      } catch (err) {
        console.warn('Firestore patients cleanup note:', err);
      }

      try {
        const docSnap = await getDocs(collection(db, 'doctors'));
        const docDeletePromises: Promise<any>[] = [];
        docSnap.forEach((docSnapItem) => {
          const data = docSnapItem.data();
          if (
            docSnapItem.id === targetUserId ||
            data.id === targetUserId ||
            data.userId === targetUserId ||
            (targetEmail && data.email === targetEmail)
          ) {
            docDeletePromises.push(deleteDoc(doc(db, 'doctors', docSnapItem.id)).catch(() => {}));
          }
        });
        await Promise.all(docDeletePromises);
      } catch (err) {
        console.warn('Firestore doctors cleanup note:', err);
      }

      // 2. Delete user in Firebase Authentication (for Google or Email/Password)
      const currentAuthUser = auth.currentUser;
      if (currentAuthUser) {
        try {
          await currentAuthUser.delete();
        } catch (authErr: any) {
          console.warn('Firebase Auth user deletion (signing out as fallback):', authErr?.message);
          try {
            await firebaseSignOut(auth);
          } catch (signoutErr) {
            console.warn('Signout fallback note:', signoutErr);
          }
        }
      }

      // 3. Clean up localStorage
      const existingUsers = JSON.parse(localStorage.getItem('wizards_users') || '[]');
      const updatedUsers = existingUsers.filter((u: any) => {
        if (targetUserId && u.id === targetUserId) return false;
        if (targetEmail && u.email === targetEmail) return false;
        if (firebaseUid && (u.firebaseUid === firebaseUid || u.id === firebaseUid)) return false;
        return true;
      });
      localStorage.setItem('wizards_users', JSON.stringify(updatedUsers));

      const existingPatients = JSON.parse(localStorage.getItem('wizards_patients') || '[]');
      const updatedPatients = existingPatients.filter((p: any) => {
        if (targetUserId && p.id === targetUserId) return false;
        if (targetEmail && p.email === targetEmail) return false;
        return true;
      });
      localStorage.setItem('wizards_patients', JSON.stringify(updatedPatients));

      const existingDoctors = JSON.parse(localStorage.getItem('wizards_doctors') || '[]');
      const updatedDoctors = existingDoctors.filter((d: any) => {
        if (targetUserId && (d.id === targetUserId || d.userId === targetUserId)) return false;
        if (targetEmail && d.email === targetEmail) return false;
        return true;
      });
      localStorage.setItem('wizards_doctors', JSON.stringify(updatedDoctors));

      const existingAppointments = JSON.parse(localStorage.getItem('wizards_appointments') || '[]');
      const updatedAppointments = existingAppointments.filter((a: any) => {
        if (targetUserId && (a.patientId === targetUserId || a.doctorId === targetUserId)) return false;
        return true;
      });
      localStorage.setItem('wizards_appointments', JSON.stringify(updatedAppointments));

      if (targetUserId) {
        localStorage.removeItem(`medical_files_${targetUserId}`);
      }
      localStorage.removeItem('wizards_current_user');

      // 4. Reset auth state in React
      setUser(null);

      return { success: true, message: 'Account and associated data deleted successfully.' };
    } catch (error) {
      console.error('Delete account failed:', error);
      return { success: false, message: 'Failed to delete account. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Firebase signout note:', e);
    }
    setUser(null);
    localStorage.removeItem('wizards_current_user');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      loginWithGoogle, 
      loginWithOtp, 
      register, 
      logout, 
      updateUser, 
      deleteAccount, 
      isLoading,
      isFirebaseConnected 
    }}>
      {children}
    </AuthContext.Provider>
  );
};