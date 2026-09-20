import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Hospital {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  deanName: string;
  licenseNo: string;
  about: string;
  specialties: string[];
  totalBeds: number;
  availableBeds: number;
  icuBeds: number;
  availableIcuBeds: number;
  emergencyBeds: number;
  availableEmergencyBeds: number;
  generalBeds: number;
  availableGeneralBeds: number;
  location?: { latitude: number; longitude: number };
  adminId: string;
  registrationDate: string;
  city?: string;
}

interface Doctor {
  id: string;
  userId: string;
  hospitalId: string;
  name: string;
  email: string;
  phone: string;
  licenseNo: string;
  specialization: string;
  experienceYears: number;
  consultationFee: number;
  isAvailable: boolean;
  isActive: boolean;
  rating: number;
  totalPatients: number;
  unavailableFrom?: string;
  unavailableTo?: string;
  unavailableReason?: string;
  hospitalName?: string;
}

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  bloodGroup: string;
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
}

interface BloodInventory {
  [bloodType: string]: {
    units: number;
    lastUpdated: string;
  };
}

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  hospitalId: string;
  patientName: string;
  doctorName: string;
  hospitalName: string;
  date: string;
  time: string;
  type: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  symptoms?: string;
  notes?: string;
  prescription?: string;
  isForFamily?: boolean;
  familyMemberName?: string;
  familyMemberAge?: number;
  familyMemberRelation?: string;
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment' | 'emergency' | 'general' | 'system' | 'blood_alert';
  isRead: boolean;
  createdAt: string;
  persistent?: boolean;
}

interface DataContextType {
  // Hospital data
  hospitals: Hospital[];
  addHospital: (hospital: Omit<Hospital, 'id' | 'registrationDate'>) => string;
  updateHospital: (id: string, data: Partial<Hospital>) => void;
  getHospitalById: (id: string) => Hospital | undefined;
  
  // Doctors data
  doctors: Doctor[];
  addDoctor: (doctor: Omit<Doctor, 'id'>) => void;
  updateDoctor: (id: string, data: Partial<Doctor>) => void;
  removeDoctor: (id: string) => void;
  getDoctorsByHospital: (hospitalId: string) => Doctor[];
  
  // Patients data
  patients: Patient[];
  addPatient: (patient: Omit<Patient, 'id'>) => void;
  updatePatient: (id: string, data: Partial<Patient>) => void;
  removePatient: (id: string) => void;
  deleteUserFromData: (userId: string, email?: string) => Promise<void>;
  
  // Blood inventory
  bloodInventory: { [hospitalId: string]: BloodInventory };
  updateBloodInventory: (hospitalId: string, bloodType: string, units: number) => void;
  getBloodInventoryByHospital: (hospitalId: string) => BloodInventory;
  searchBloodAvailability: (bloodType: string, userLocation?: { latitude: number; longitude: number }) => Array<{
    hospital: Hospital;
    units: number;
    distance?: number;
  }>;
  
  // Appointments
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id'>) => void;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  getAppointmentsByPatient: (patientId: string) => Appointment[];
  getAppointmentsByDoctor: (doctorId: string) => Appointment[];
  getAppointmentsByHospital: (hospitalId: string) => Appointment[];
  
  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markNotificationRead: (id: string) => void;
  getNotificationsByUser: (userId: string) => Notification[];
  
  // Search functions
  searchDoctors: (filters: { 
    specialization?: string; 
    location?: { latitude: number; longitude: number }; 
    hospitalId?: string;
    available?: boolean;
  }) => Doctor[];
  searchHospitals: (filters: { 
    location?: { latitude: number; longitude: number }; 
    services?: string;
    bedType?: string;
  }) => Hospital[];
  getAvailableSlots: (doctorId: string, date: string) => string[];
  
  // Blood alerts
  checkBloodAlerts: (hospitalId: string) => void;
  dismissBloodAlert: (hospitalId: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// Generate hospital ID
const generateHospitalId = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const dateStr = `${day}${month}${year}`;
  
  const existingHospitals = JSON.parse(localStorage.getItem('wizards_hospitals') || '[]');
  const todayHospitals = existingHospitals.filter((h: any) => 
    h.registrationDate === `${year}-${month}-${day}`
  );
  
  const count = String(todayHospitals.length + 1).padStart(6, '0');
  return `HOSPITAL${dateStr}${count}`;
};

// Calculate distance between two coordinates
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Comprehensive check for demo / test accounts and mock data
export const isDemoOrTestEntity = (entity: any): boolean => {
  if (!entity) return true;
  const str = JSON.stringify(entity).toLowerCase();
  
  // Checks for demo emails or test usernames
  if (
    str.includes('@demo.com') ||
    str.includes('demo@') ||
    str.includes('udffg') ||
    str.includes('concord textiles') ||
    str.includes('9867849473')
  ) {
    return true;
  }

  // Checks for demo admin/user IDs
  if (entity.adminId && (
    entity.adminId.toLowerCase().includes('demo') ||
    entity.adminId.includes('2024') ||
    entity.adminId === 'ADM001' ||
    entity.adminId === 'ADMIN20240001'
  )) {
    return true;
  }

  // Checks for demo IDs
  if (typeof entity.id === 'string' && (
    entity.id.startsWith('HOSPITAL01012026') ||
    entity.id.toLowerCase().includes('demo') ||
    entity.id === '1' ||
    entity.id === '2' ||
    entity.id === 'DOC001' ||
    entity.id === 'PAT001' ||
    entity.id === 'DOCTOR20240001' ||
    entity.id === 'PATIENT20240001'
  )) {
    return true;
  }

  // Checks for mock hospital names
  const mockNames = [
    'City General Hospital & Trauma Center',
    'Apollo Multispeciality Hospital & Research Center',
    'Fortis Malar Hospital & Heart Institute',
    'MIOT International Hospital & Orthopedic Clinic',
    'Global Health City & Specialty Clinic',
    'udffg'
  ];
  if (entity.name && mockNames.some(m => entity.name.toLowerCase().trim() === m.toLowerCase())) {
    return true;
  }

  return false;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [bloodInventory, setBloodInventory] = useState<{ [hospitalId: string]: BloodInventory }>({});
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load data from localStorage on mount and sync with Firestore
  useEffect(() => {
    const savedHospitals = localStorage.getItem('wizards_hospitals');
    const savedDoctors = localStorage.getItem('wizards_doctors');
    const savedPatients = localStorage.getItem('wizards_patients');
    const savedBloodInventory = localStorage.getItem('wizards_blood_inventory');
    const savedAppointments = localStorage.getItem('wizards_appointments');
    const savedNotifications = localStorage.getItem('wizards_notifications');

    if (savedHospitals) {
      try {
        const parsed = JSON.parse(savedHospitals);
        const validHospitals = (Array.isArray(parsed) ? parsed : [])
          .filter((h: Hospital) => !isDemoOrTestEntity(h))
          .map((h: Hospital) => ({
            ...h,
            generalBeds: h.generalBeds || Math.floor((h.totalBeds || 100) * 0.7),
            availableGeneralBeds: h.availableGeneralBeds !== undefined ? h.availableGeneralBeds : Math.floor((h.totalBeds || 100) * 0.5)
          }));
        setHospitals(validHospitals);
        localStorage.setItem('wizards_hospitals', JSON.stringify(validHospitals));
      } catch {
        setHospitals([]);
        localStorage.setItem('wizards_hospitals', JSON.stringify([]));
      }
    } else {
      setHospitals([]);
      localStorage.setItem('wizards_hospitals', JSON.stringify([]));
    }

    if (savedDoctors) {
      try {
        const parsed = JSON.parse(savedDoctors);
        const validDocs = (Array.isArray(parsed) ? parsed : []).filter((d: Doctor) => !isDemoOrTestEntity(d));
        setDoctors(validDocs);
        localStorage.setItem('wizards_doctors', JSON.stringify(validDocs));
      } catch {
        setDoctors([]);
      }
    }
    if (savedPatients) {
      try {
        const parsed = JSON.parse(savedPatients);
        const validPats = (Array.isArray(parsed) ? parsed : []).filter((p: Patient) => !isDemoOrTestEntity(p));
        setPatients(validPats);
        localStorage.setItem('wizards_patients', JSON.stringify(validPats));
      } catch {
        setPatients([]);
      }
    }
    if (savedBloodInventory) {
      try {
        setBloodInventory(JSON.parse(savedBloodInventory));
      } catch {
        setBloodInventory({});
      }
    }
    if (savedAppointments) {
      try {
        const parsed = JSON.parse(savedAppointments);
        const validAppts = (Array.isArray(parsed) ? parsed : []).filter((a: Appointment) => !isDemoOrTestEntity(a));
        setAppointments(validAppts);
        localStorage.setItem('wizards_appointments', JSON.stringify(validAppts));
      } catch {
        setAppointments([]);
      }
    }
    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications));
      } catch {
        setNotifications([]);
      }
    }

    // Try fetching from Firestore cloud if available with a graceful timeout
    const fetchFromFirestore = async () => {
      try {
        // Query Firestore with safety
        const fetchPromise = Promise.all([
          getDocs(collection(db, 'hospitals')),
          getDocs(collection(db, 'doctors')),
          getDocs(collection(db, 'appointments'))
        ]);
        
        // Don't hang or throw unhandled offline errors if Firestore is initializing or offline
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 4000)
        );

        const [hospSnap, docSnap, apptSnap] = await Promise.race([
          fetchPromise,
          timeoutPromise
        ]) as any;

        if (hospSnap && !hospSnap.empty) {
          const cloudHosp = hospSnap.docs
            .map((d: any) => ({ ...d.data(), id: d.id }))
            .filter((h: Hospital) => !isDemoOrTestEntity(h)) as Hospital[];

          // Asynchronously clean up old demo documents in Firestore if any exist
          hospSnap.docs.forEach((d: any) => {
            const data = { ...d.data(), id: d.id };
            if (isDemoOrTestEntity(data)) {
              deleteDoc(doc(db, 'hospitals', d.id)).catch(() => {});
              deleteDoc(doc(db, 'blood_inventory', d.id)).catch(() => {});
            }
          });

          setHospitals(cloudHosp);
          localStorage.setItem('wizards_hospitals', JSON.stringify(cloudHosp));
        }

        if (docSnap && !docSnap.empty) {
          const cloudDocs = docSnap.docs
            .map((d: any) => ({ ...d.data(), id: d.id }))
            .filter((d: Doctor) => !isDemoOrTestEntity(d)) as Doctor[];

          // Clean up demo doctors from Firestore
          docSnap.docs.forEach((d: any) => {
            const data = { ...d.data(), id: d.id };
            if (isDemoOrTestEntity(data)) {
              deleteDoc(doc(db, 'doctors', d.id)).catch(() => {});
            }
          });

          setDoctors(cloudDocs);
          localStorage.setItem('wizards_doctors', JSON.stringify(cloudDocs));
        }

        if (apptSnap && !apptSnap.empty) {
          const cloudAppts = apptSnap.docs
            .map((d: any) => ({ ...d.data(), id: d.id }))
            .filter((a: Appointment) => !isDemoOrTestEntity(a)) as Appointment[];

          // Clean up demo appointments from Firestore
          apptSnap.docs.forEach((d: any) => {
            const data = { ...d.data(), id: d.id };
            if (isDemoOrTestEntity(data)) {
              deleteDoc(doc(db, 'appointments', d.id)).catch(() => {});
            }
          });

          setAppointments(cloudAppts);
          localStorage.setItem('wizards_appointments', JSON.stringify(cloudAppts));
        }
      } catch {
        // Operates smoothly in local mode if network / cloud backend is connecting
      }
    };

    fetchFromFirestore();
  }, []);

  // Save to localStorage & Cloud Firestore whenever data changes (ONLY for real non-demo items)
  useEffect(() => {
    localStorage.setItem('wizards_hospitals', JSON.stringify(hospitals));
    hospitals.forEach(h => {
      if (!isDemoOrTestEntity(h)) {
        setDoc(doc(db, 'hospitals', h.id), h, { merge: true }).catch(() => {});
      }
    });
  }, [hospitals]);

  useEffect(() => {
    localStorage.setItem('wizards_doctors', JSON.stringify(doctors));
    doctors.forEach(d => {
      if (!isDemoOrTestEntity(d)) {
        setDoc(doc(db, 'doctors', d.id), d, { merge: true }).catch(() => {});
      }
    });
  }, [doctors]);

  useEffect(() => {
    localStorage.setItem('wizards_patients', JSON.stringify(patients));
    patients.forEach(p => {
      if (!isDemoOrTestEntity(p)) {
        setDoc(doc(db, 'patients', p.id), p, { merge: true }).catch(() => {});
      }
    });
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('wizards_blood_inventory', JSON.stringify(bloodInventory));
    Object.entries(bloodInventory).forEach(([hospId, inv]) => {
      const parentHosp = hospitals.find(h => h.id === hospId);
      if (!parentHosp || !isDemoOrTestEntity(parentHosp)) {
        setDoc(doc(db, 'blood_inventory', hospId), inv, { merge: true }).catch(() => {});
      }
    });
  }, [bloodInventory, hospitals]);

  useEffect(() => {
    localStorage.setItem('wizards_appointments', JSON.stringify(appointments));
    appointments.forEach(a => {
      if (!isDemoOrTestEntity(a)) {
        setDoc(doc(db, 'appointments', a.id), a, { merge: true }).catch(() => {});
      }
    });
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('wizards_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Hospital functions
  const addHospital = (hospitalData: Omit<Hospital, 'id' | 'registrationDate'>): string => {
    const hospitalId = generateHospitalId();
    const newHospital: Hospital = {
      ...hospitalData,
      id: hospitalId,
      registrationDate: new Date().toISOString().split('T')[0],
    };
    setHospitals(prev => {
      const updatedHospitals = [...prev, newHospital];
      // Force immediate localStorage update
      localStorage.setItem('wizards_hospitals', JSON.stringify(updatedHospitals));
      return updatedHospitals;
    });
    
    // Initialize blood inventory for new hospital
    const initialBloodInventory: BloodInventory = {};
    ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].forEach(type => {
      initialBloodInventory[type] = { units: 0, lastUpdated: new Date().toISOString() };
    });
    setBloodInventory(prev => {
      const updatedBloodInventory = { ...prev, [hospitalId]: initialBloodInventory };
      // Force immediate localStorage update
      localStorage.setItem('wizards_blood_inventory', JSON.stringify(updatedBloodInventory));
      return updatedBloodInventory;
    });
    
    return hospitalId;
  };

  const updateHospital = (id: string, data: Partial<Hospital>) => {
    setHospitals(prev => {
      const updated = prev.map(h => h.id === id ? { ...h, ...data } : h);
      localStorage.setItem('wizards_hospitals', JSON.stringify(updated));
      return updated;
    });
    const existing = hospitals.find(h => h.id === id);
    const merged = existing ? { ...existing, ...data } : { ...data, id };
    if (!isDemoOrTestEntity(merged)) {
      setDoc(doc(db, 'hospitals', id), merged, { merge: true }).catch(err => {
        console.warn('Failed to sync hospital update to Firestore:', err);
      });
    }
  };

  const getHospitalById = (id: string) => {
    return hospitals.find(h => h.id === id);
  };

  // Doctor functions
  const addDoctor = (doctor: Omit<Doctor, 'id'>) => {
    const newDoctor = {
      ...doctor,
      id: `doc-${Date.now()}`,
    };
    setDoctors(prev => [...prev, newDoctor]);
  };

  const updateDoctor = (id: string, data: Partial<Doctor>) => {
    setDoctors(prev => {
      const updated = prev.map(doc => doc.id === id ? { ...doc, ...data } : doc);
      localStorage.setItem('wizards_doctors', JSON.stringify(updated));
      return updated;
    });
    const existing = doctors.find(doc => doc.id === id);
    const merged = existing ? { ...existing, ...data } : { ...data, id };
    if (!isDemoOrTestEntity(merged)) {
      setDoc(doc(db, 'doctors', id), merged, { merge: true }).catch(err => {
        console.warn('Failed to sync doctor update to Firestore:', err);
      });
    }
  };

  const removeDoctor = (id: string) => {
    setDoctors(prev => prev.filter(doc => doc.id !== id));
    deleteDoc(doc(db, 'doctors', id)).catch(() => {});
  };

  const getDoctorsByHospital = (hospitalId: string) => {
    return doctors.filter(doc => doc.hospitalId === hospitalId);
  };

  // Patient functions
  const addPatient = (patient: Omit<Patient, 'id'>) => {
    const newPatient = {
      ...patient,
      id: `pat-${Date.now()}`,
    };
    setPatients(prev => [...prev, newPatient]);
  };

  const updatePatient = (id: string, data: Partial<Patient>) => {
    setPatients(prev => {
      const updated = prev.map(pat => pat.id === id ? { ...pat, ...data } : pat);
      localStorage.setItem('wizards_patients', JSON.stringify(updated));
      return updated;
    });
    const existing = patients.find(pat => pat.id === id);
    const merged = existing ? { ...existing, ...data } : { ...data, id };
    if (!isDemoOrTestEntity(merged)) {
      setDoc(doc(db, 'patients', id), merged, { merge: true }).catch(err => {
        console.warn('Failed to sync patient update to Firestore:', err);
      });
    }
  };

  const removePatient = (id: string) => {
    setPatients(prev => prev.filter(pat => pat.id !== id));
    deleteDoc(doc(db, 'patients', id)).catch(() => {});
  };

  // Completely clean up a user's records from DataContext and Firestore
  const deleteUserFromData = async (userId: string, email?: string) => {
    // Remove matching patient records
    setPatients(prev => {
      const remaining = prev.filter(p => p.id !== userId && (!email || p.email !== email));
      const removed = prev.filter(p => p.id === userId || (email && p.email === email));
      removed.forEach(p => {
        deleteDoc(doc(db, 'patients', p.id)).catch(() => {});
      });
      localStorage.setItem('wizards_patients', JSON.stringify(remaining));
      return remaining;
    });

    // Remove matching doctor records
    setDoctors(prev => {
      const remaining = prev.filter(d => d.id !== userId && d.userId !== userId && (!email || d.email !== email));
      const removed = prev.filter(d => d.id === userId || d.userId === userId || (email && d.email === email));
      removed.forEach(d => {
        deleteDoc(doc(db, 'doctors', d.id)).catch(() => {});
      });
      localStorage.setItem('wizards_doctors', JSON.stringify(remaining));
      return remaining;
    });

    // Remove matching appointments
    setAppointments(prev => {
      const remaining = prev.filter(a => a.patientId !== userId && a.doctorId !== userId);
      const removed = prev.filter(a => a.patientId === userId || a.doctorId === userId);
      removed.forEach(a => {
        deleteDoc(doc(db, 'appointments', a.id)).catch(() => {});
      });
      localStorage.setItem('wizards_appointments', JSON.stringify(remaining));
      return remaining;
    });
  };

  // Blood inventory functions
  const updateBloodInventory = (hospitalId: string, bloodType: string, units: number) => {
    setBloodInventory(prev => ({
      ...prev,
      [hospitalId]: {
        ...prev[hospitalId],
        [bloodType]: {
          units: Math.max(0, units),
          lastUpdated: new Date().toISOString()
        }
      }
    }));
  };

  const getBloodInventoryByHospital = (hospitalId: string) => {
    return bloodInventory[hospitalId] || {};
  };

  const searchBloodAvailability = (bloodType: string, userLocation?: { latitude: number; longitude: number }) => {
    const results: Array<{
      hospital: Hospital;
      units: number;
      distance?: number;
    }> = [];

    hospitals.forEach(hospital => {
      const inventory = bloodInventory[hospital.id];
      if (inventory && inventory[bloodType] && inventory[bloodType].units > 0) {
        let distance: number | undefined;
        
        if (userLocation && hospital.location) {
          distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            hospital.location.latitude,
            hospital.location.longitude
          );
        }

        results.push({
          hospital,
          units: inventory[bloodType].units,
          distance
        });
      }
    });

    // Sort by distance if location provided, otherwise by units available
    if (userLocation) {
      results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else {
      results.sort((a, b) => b.units - a.units);
    }

    return results;
  };

  // Appointment functions
  const addAppointment = (appointment: Omit<Appointment, 'id'>) => {
    const newAppointment = {
      ...appointment,
      id: `apt-${Date.now()}`,
    };
    setAppointments(prev => [...prev, newAppointment]);

    // Create notifications for admin and doctor
    const adminNotification = {
      id: `notif-${Date.now()}-admin`,
      userId: 'admin',
      title: 'New Appointment Request',
      message: `New appointment request from ${appointment.patientName} for ${appointment.date} at ${appointment.time}`,
      type: 'appointment' as const,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    const doctorNotification = {
      id: `notif-${Date.now()}-doctor`,
      userId: appointment.doctorId,
      title: 'New Appointment Booked',
      message: `New appointment with ${appointment.patientName} scheduled for ${appointment.date} at ${appointment.time}`,
      type: 'appointment' as const,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    setNotifications(prev => [...prev, adminNotification, doctorNotification]);
  };

  const updateAppointment = (id: string, data: Partial<Appointment>) => {
    setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, ...data } : apt));
  };

  const getAppointmentsByPatient = (patientId: string) => {
    return appointments.filter(apt => apt.patientId === patientId);
  };

  const getAppointmentsByDoctor = (doctorId: string) => {
    return appointments.filter(apt => apt.doctorId === doctorId);
  };

  const getAppointmentsByHospital = (hospitalId: string) => {
    return appointments.filter(apt => apt.hospitalId === hospitalId);
  };

  // Notification functions
  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const newNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
    };
    setNotifications(prev => [...prev, newNotification]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === id ? { ...notif, isRead: true } : notif
    ));
  };

  const getNotificationsByUser = (userId: string) => {
    return notifications.filter(n => n.userId === userId || n.userId === 'admin');
  };

  // Search functions
  const searchDoctors = (filters: { 
    specialization?: string; 
    location?: { latitude: number; longitude: number }; 
    hospitalId?: string;
    available?: boolean;
  }) => {
    let filteredDoctors = doctors.filter(doctor => {
      if (filters.specialization && doctor.specialization !== filters.specialization) return false;
      if (filters.hospitalId && doctor.hospitalId !== filters.hospitalId) return false;
      if (filters.available !== undefined && doctor.isAvailable !== filters.available) return false;
      return doctor.isActive;
    });

    // Sort by location if provided
    if (filters.location) {
      filteredDoctors = filteredDoctors.sort((a, b) => {
        const hospitalA = hospitals.find(h => h.id === a.hospitalId);
        const hospitalB = hospitals.find(h => h.id === b.hospitalId);
        
        if (!hospitalA?.location || !hospitalB?.location) return 0;
        
        const distanceA = calculateDistance(
          filters.location!.latitude, filters.location!.longitude,
          hospitalA.location.latitude, hospitalA.location.longitude
        );
        const distanceB = calculateDistance(
          filters.location!.latitude, filters.location!.longitude,
          hospitalB.location.latitude, hospitalB.location.longitude
        );
        
        return distanceA - distanceB;
      });
    }

    return filteredDoctors;
  };

  const searchHospitals = (filters: { 
    location?: { latitude: number; longitude: number }; 
    services?: string;
    bedType?: string;
  }) => {
    let filteredHospitals = hospitals;

    if (filters.services) {
      filteredHospitals = filteredHospitals.filter(hospital =>
        hospital.specialties.some(specialty => 
          specialty.toLowerCase().includes(filters.services!.toLowerCase())
        )
      );
    }

    if (filters.bedType) {
      filteredHospitals = filteredHospitals.filter(hospital => {
        switch (filters.bedType) {
          case 'general':
            return hospital.availableBeds > 0;
          case 'icu':
            return hospital.availableIcuBeds > 0;
          case 'emergency':
            return hospital.availableEmergencyBeds > 0;
          default:
            return true;
        }
      });
    }

    // Sort by location if provided
    if (filters.location) {
      filteredHospitals = filteredHospitals.sort((a, b) => {
        if (!a.location || !b.location) return 0;
        
        const distanceA = calculateDistance(
          filters.location!.latitude, filters.location!.longitude,
          a.location.latitude, a.location.longitude
        );
        const distanceB = calculateDistance(
          filters.location!.latitude, filters.location!.longitude,
          b.location.latitude, b.location.longitude
        );
        
        return distanceA - distanceB;
      });
    }

    return filteredHospitals;
  };

  const getAvailableSlots = (doctorId: string, date: string) => {
    const defaultSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
    ];

    const bookedSlots = appointments
      .filter(apt => apt.doctorId === doctorId && apt.date === date && apt.status !== 'cancelled')
      .map(apt => apt.time);

    return defaultSlots.filter(slot => !bookedSlots.includes(slot));
  };

  // Blood alert functions
  const checkBloodAlerts = (hospitalId: string) => {
    const inventory = bloodInventory[hospitalId];
    if (!inventory) return;

    const lowStockTypes = Object.entries(inventory).filter(([_, data]) => data.units < 10);
    
    if (lowStockTypes.length > 0) {
      const alertNotification = {
        id: `blood-alert-${Date.now()}`,
        userId: hospitalId,
        title: 'Blood Stock Alert',
        message: `Low stock alert: ${lowStockTypes.map(([type]) => type).join(', ')} need to be restocked.`,
        type: 'blood_alert' as const,
        isRead: false,
        createdAt: new Date().toISOString(),
        persistent: true,
      };
      
      setNotifications(prev => [...prev, alertNotification]);
    }
  };

  const dismissBloodAlert = (hospitalId: string) => {
    setNotifications(prev => prev.filter(n => 
      !(n.type === 'blood_alert' && n.userId === hospitalId)
    ));
  };

  return (
    <DataContext.Provider value={{
      hospitals,
      addHospital,
      updateHospital,
      getHospitalById,
      doctors,
      addDoctor,
      updateDoctor,
      removeDoctor,
      getDoctorsByHospital,
      patients,
      addPatient,
      updatePatient,
      removePatient,
      deleteUserFromData,
      bloodInventory,
      updateBloodInventory,
      getBloodInventoryByHospital,
      searchBloodAvailability,
      appointments,
      addAppointment,
      updateAppointment,
      getAppointmentsByPatient,
      getAppointmentsByDoctor,
      getAppointmentsByHospital,
      notifications,
      addNotification,
      markNotificationRead,
      getNotificationsByUser,
      searchDoctors,
      searchHospitals,
      getAvailableSlots,
      checkBloodAlerts,
      dismissBloodAlert,
    }}>
      {children}
    </DataContext.Provider>
  );
};