import React, { createContext, useContext, useState, useEffect } from 'react';

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

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [bloodInventory, setBloodInventory] = useState<{ [hospitalId: string]: BloodInventory }>({});
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedHospitals = localStorage.getItem('wizards_hospitals');
    const savedDoctors = localStorage.getItem('wizards_doctors');
    const savedPatients = localStorage.getItem('wizards_patients');
    const savedBloodInventory = localStorage.getItem('wizards_blood_inventory');
    const savedAppointments = localStorage.getItem('wizards_appointments');
    const savedNotifications = localStorage.getItem('wizards_notifications');

    if (savedHospitals) {
      const parsed = JSON.parse(savedHospitals);
      const migrated = parsed.map((h: Hospital) => ({
        ...h,
        generalBeds: h.generalBeds || Math.floor((h.totalBeds || 100) * 0.7),
        availableGeneralBeds: h.availableGeneralBeds !== undefined ? h.availableGeneralBeds : Math.floor((h.totalBeds || 100) * 0.5)
      }));
      setHospitals(migrated);
    }
    if (savedDoctors) setDoctors(JSON.parse(savedDoctors));
    if (savedPatients) setPatients(JSON.parse(savedPatients));
    if (savedBloodInventory) setBloodInventory(JSON.parse(savedBloodInventory));
    if (savedAppointments) setAppointments(JSON.parse(savedAppointments));
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('wizards_hospitals', JSON.stringify(hospitals));
  }, [hospitals]);

  useEffect(() => {
    localStorage.setItem('wizards_doctors', JSON.stringify(doctors));
  }, [doctors]);

  useEffect(() => {
    localStorage.setItem('wizards_patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('wizards_blood_inventory', JSON.stringify(bloodInventory));
  }, [bloodInventory]);

  useEffect(() => {
    localStorage.setItem('wizards_appointments', JSON.stringify(appointments));
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
    setHospitals(prev => prev.map(h => h.id === id ? { ...h, ...data } : h));
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
    setDoctors(prev => prev.map(doc => doc.id === id ? { ...doc, ...data } : doc));
  };

  const removeDoctor = (id: string) => {
    setDoctors(prev => prev.filter(doc => doc.id !== id));
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
    setPatients(prev => prev.map(pat => pat.id === id ? { ...pat, ...data } : pat));
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