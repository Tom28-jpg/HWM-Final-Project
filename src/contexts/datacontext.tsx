import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './authcontext';

export interface Hospital {
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
  isDemo?: boolean;
}

export interface Doctor {
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
  isDemo?: boolean;
}

export interface Patient {
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
  isDemo?: boolean;
}

export interface BloodInventory {
  [bloodType: string]: {
    units: number;
    lastUpdated: string;
  };
}

export interface Appointment {
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
  isDemo?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment' | 'emergency' | 'general' | 'system' | 'blood_alert';
  isRead: boolean;
  createdAt: string;
  persistent?: boolean;
  isDemo?: boolean;
}

interface DataContextType {
  // Hospital data
  hospitals: Hospital[];
  allHospitalsList: Hospital[];
  addHospital: (hospital: Omit<Hospital, 'id' | 'registrationDate'>) => string;
  updateHospital: (id: string, data: Partial<Hospital>) => void;
  getHospitalById: (id: string) => Hospital | undefined;
  
  // Doctors data
  doctors: Doctor[];
  allDoctorsList: Doctor[];
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
    available?: boolean;
  }) => Hospital[];
  getAvailableSlots: (doctorId: string, date: string) => string[];
  
  // Blood alerts
  checkBloodAlerts: (hospitalId: string) => void;
  dismissBloodAlert: (hospitalId: string) => void;
  isDemoMode: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// Helper to remove any undefined fields before sending to Firestore
export const sanitizeForFirestore = <T extends Record<string, any>>(obj: T): T => {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => (typeof item === 'object' && item !== null && !(item instanceof Date) ? sanitizeForFirestore(item) : item)) as unknown as T;
  }
  const cleanObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        cleanObj[key] = sanitizeForFirestore(value);
      } else {
        cleanObj[key] = value;
      }
    }
  }
  return cleanObj;
};

// Helper to check if a user is a demo account
export const isDemoUser = (user: { id?: string; email?: string; isDemo?: boolean } | null | undefined): boolean => {
  if (!user) return false;
  if (user.isDemo) return true;
  if (user.email?.toLowerCase().includes('@demo.com')) return true;
  if (user.id?.startsWith('PATIENT2024') || user.id?.startsWith('ADMIN2024') || user.id?.startsWith('DOCTOR2024')) {
    return true;
  }
  return false;
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

// Calculate distance between two coordinates in km
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// 10 Comprehensive Demo Hospitals
export const DEFAULT_HOSPITALS: Hospital[] = [
  {
    id: 'HOSPITAL20240001',
    name: 'Apollo Multi-Speciality Hospital & Research Center',
    address: '21 Greams Lane, Thousand Lights, Chennai, Tamil Nadu 600006',
    phone: '+91 44 2829 0200',
    email: 'admin@demo.com',
    deanName: 'Dr. K. Prathap Reddy',
    licenseNo: 'TN-HOSP-2024-001',
    about: 'Premier quaternary care super-speciality hospital featuring state-of-the-art robotic surgery, comprehensive cancer care, and round-the-clock emergency ICU services.',
    specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Oncology', 'Emergency Care', 'Organ Transplant', 'Pediatrics'],
    totalBeds: 550,
    availableBeds: 142,
    icuBeds: 80,
    availableIcuBeds: 18,
    emergencyBeds: 50,
    availableEmergencyBeds: 12,
    generalBeds: 420,
    availableGeneralBeds: 112,
    location: { latitude: 13.0604, longitude: 80.2496 },
    adminId: 'ADMIN20240001',
    registrationDate: '2024-01-15',
    city: 'Chennai',
    isDemo: true
  },
  {
    id: 'HOSPITAL20240002',
    name: 'Fortis Memorial & Heart Institute',
    address: '154/9 Bannerghatta Road, Opposite IIM, Bengaluru, Karnataka 560076',
    phone: '+91 80 6621 4444',
    email: 'contact@fortis-bengaluru.org',
    deanName: 'Dr. Sanjay Sharma',
    licenseNo: 'KA-HOSP-2024-002',
    about: 'Leading cardiovascular and neurological center recognized globally for minimally invasive bypass surgery, catheterization laboratories, and advanced trauma care.',
    specialties: ['Cardiology', 'Cardiothoracic Surgery', 'Neurology', 'Vascular Surgery', 'Critical Care'],
    totalBeds: 400,
    availableBeds: 95,
    icuBeds: 65,
    availableIcuBeds: 14,
    emergencyBeds: 35,
    availableEmergencyBeds: 8,
    generalBeds: 300,
    availableGeneralBeds: 73,
    location: { latitude: 12.8988, longitude: 77.5996 },
    adminId: 'ADMIN20240002',
    registrationDate: '2024-02-10',
    city: 'Bengaluru',
    isDemo: true
  },
  {
    id: 'HOSPITAL20240003',
    name: 'Manipal Hospital & Institute of Medical Sciences',
    address: '98 HAL Old Airport Road, Kodihalli, Bengaluru, Karnataka 560017',
    phone: '+91 80 2502 4444',
    email: 'helpdesk@manipal-hospital.org',
    deanName: 'Dr. Sudarshan Ballal',
    licenseNo: 'KA-HOSP-2024-003',
    about: 'Renowned multidisciplinary hospital equipped with Asia’s top renal science unit, pediatric intensive care, robotic oncology, and joint replacement wings.',
    specialties: ['Nephrology', 'Pediatrics', 'Orthopedics', 'Gastroenterology', 'General Surgery', 'Urology'],
    totalBeds: 600,
    availableBeds: 160,
    icuBeds: 90,
    availableIcuBeds: 22,
    emergencyBeds: 60,
    availableEmergencyBeds: 15,
    generalBeds: 450,
    availableGeneralBeds: 123,
    location: { latitude: 12.9584, longitude: 77.6496 },
    adminId: 'ADMIN20240003',
    registrationDate: '2024-02-15',
    city: 'Bengaluru',
    isDemo: true
  },
  {
    id: 'HOSPITAL20240004',
    name: 'Sri Ramachandra Medical Centre & Research Institute',
    address: 'No.1 Ramachandra Nagar, Porur, Chennai, Tamil Nadu 600116',
    phone: '+91 44 4592 8500',
    email: 'care@sriramachandra.edu.in',
    deanName: 'Dr. S. Thanikachalam',
    licenseNo: 'TN-HOSP-2024-004',
    about: 'Expansive 800-bed tertiary university hospital accredited by JCI & NABH, delivering cutting-edge gastroenterology, neonatal care, and 24/7 trauma emergency response.',
    specialties: ['Gastroenterology', 'Neonatology', 'General Medicine', 'Dermatology', 'Pulmonology', 'ENT'],
    totalBeds: 800,
    availableBeds: 220,
    icuBeds: 120,
    availableIcuBeds: 30,
    emergencyBeds: 70,
    availableEmergencyBeds: 19,
    generalBeds: 610,
    availableGeneralBeds: 171,
    location: { latitude: 13.0382, longitude: 80.1417 },
    adminId: 'ADMIN20240004',
    registrationDate: '2024-03-01',
    city: 'Chennai',
    isDemo: true
  },
  {
    id: 'HOSPITAL20240005',
    name: 'Kauvery Hospital - Heart & City Center',
    address: '199 Luz Church Road, Mylapore, Chennai, Tamil Nadu 600004',
    phone: '+91 44 4000 6000',
    email: 'reachus@kauveryhospital.com',
    deanName: 'Dr. Aravindan Selvaraj',
    licenseNo: 'TN-HOSP-2024-005',
    about: 'Benchmark healthcare provider in South India specializing in interventional cardiology, geriatric care, vascular sciences, and high-dependency surgical wards.',
    specialties: ['Cardiology', 'Geriatrics', 'Vascular Surgery', 'Emergency Medicine', 'Nephrology'],
    totalBeds: 350,
    availableBeds: 88,
    icuBeds: 50,
    availableIcuBeds: 11,
    emergencyBeds: 30,
    availableEmergencyBeds: 7,
    generalBeds: 270,
    availableGeneralBeds: 70,
    location: { latitude: 13.0336, longitude: 80.2644 },
    adminId: 'ADMIN20240005',
    registrationDate: '2024-03-12',
    city: 'Chennai',
    isDemo: true
  },
  {
    id: 'HOSPITAL20240006',
    name: 'Gleneagles Global Health City',
    address: '439 Cheran Nagar, Perumbakkam, Chennai, Tamil Nadu 600100',
    phone: '+91 44 4477 7000',
    email: 'info.india@gleneagles.net',
    deanName: 'Dr. K. Ravindranath',
    licenseNo: 'TN-HOSP-2024-006',
    about: 'A 21-acre world-class healthcare city with dedicated institutes for liver and multi-organ transplants, pulmonary medicine, neurosciences, and robotic oncology.',
    specialties: ['Organ Transplant', 'Pulmonology', 'Neuroscience', 'Hepatology', 'Critical Care', 'Oncology'],
    totalBeds: 500,
    availableBeds: 130,
    icuBeds: 75,
    availableIcuBeds: 15,
    emergencyBeds: 45,
    availableEmergencyBeds: 10,
    generalBeds: 380,
    availableGeneralBeds: 105,
    location: { latitude: 12.9038, longitude: 80.1912 },
    adminId: 'ADMIN20240006',
    registrationDate: '2024-03-20',
    city: 'Chennai',
    isDemo: true
  },
  {
    id: 'HOSPITAL20240007',
    name: 'MIOT International Hospital & Orthopedic Centre',
    address: '4/112 Mount Poonamallee Road, Manapakkam, Chennai, Tamil Nadu 600089',
    phone: '+91 44 4200 2288',
    email: 'chief@miotinternational.com',
    deanName: 'Dr. P. V. A. Mohandas',
    licenseNo: 'TN-HOSP-2024-007',
    about: 'Internationally acclaimed hospital pioneering computer-navigated joint replacement, keyhole orthopedic trauma care, sports medicine, and thoracic surgery.',
    specialties: ['Orthopedics', 'Joint Replacement', 'Trauma Surgery', 'Sports Medicine', 'Spine Surgery'],
    totalBeds: 500,
    availableBeds: 115,
    icuBeds: 85,
    availableIcuBeds: 20,
    emergencyBeds: 40,
    availableEmergencyBeds: 9,
    generalBeds: 375,
    availableGeneralBeds: 86,
    location: { latitude: 13.0232, longitude: 80.1744 },
    adminId: 'ADMIN20240007',
    registrationDate: '2024-04-05',
    city: 'Chennai',
    isDemo: true
  },
  {
    id: 'HOSPITAL20240008',
    name: 'Aster CMI Hospital & Women Care Center',
    address: 'No. 43/2 New Airport Road, NH 44, Sahakar Nagar, Bengaluru, Karnataka 560092',
    phone: '+91 80 4344 0100',
    email: 'customercare@asterhospital.com',
    deanName: 'Dr. Nitish Shetty',
    licenseNo: 'KA-HOSP-2024-008',
    about: 'Modern tertiary-care sanctuary offering distinguished women & child care, obstetrics & gynecology, robotic uro-surgery, and 24/7 pediatric emergency ICU.',
    specialties: ['Obstetrics & Gynecology', 'Fetal Medicine', 'Pediatric ICU', 'Urology', 'Cardiac Sciences'],
    totalBeds: 500,
    availableBeds: 140,
    icuBeds: 70,
    availableIcuBeds: 18,
    emergencyBeds: 45,
    availableEmergencyBeds: 11,
    generalBeds: 385,
    availableGeneralBeds: 111,
    location: { latitude: 13.0628, longitude: 77.5878 },
    adminId: 'ADMIN20240008',
    registrationDate: '2024-04-18',
    city: 'Bengaluru',
    isDemo: true
  },
  {
    id: 'HOSPITAL20240009',
    name: 'PSG Super Speciality Hospitals & Cancer Institute',
    address: 'Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu 641004',
    phone: '+91 422 257 0170',
    email: 'director@psghospitals.com',
    deanName: 'Dr. T. M. SubbaRao',
    licenseNo: 'TN-HOSP-2024-009',
    about: 'Premier medical institution in Western Tamil Nadu known for comprehensive cancer therapy, bone marrow transplant, cardiology, and advanced medical diagnostics.',
    specialties: ['Oncology', 'Radiation Therapy', 'Cardiology', 'Nuclear Medicine', 'Hematology'],
    totalBeds: 650,
    availableBeds: 175,
    icuBeds: 95,
    availableIcuBeds: 24,
    emergencyBeds: 55,
    availableEmergencyBeds: 14,
    generalBeds: 500,
    availableGeneralBeds: 137,
    location: { latitude: 11.0284, longitude: 77.0042 },
    adminId: 'ADMIN20240009',
    registrationDate: '2024-05-02',
    city: 'Coimbatore',
    isDemo: true
  },
  {
    id: 'HOSPITAL20240010',
    name: 'Ganga Medical Centre & Specialty Hospital',
    address: '313 Mettupalayam Road, Sai Baba Colony, Coimbatore, Tamil Nadu 641043',
    phone: '+91 422 248 5000',
    email: 'info@gangahospital.com',
    deanName: 'Dr. S. Rajasekaran',
    licenseNo: 'TN-HOSP-2024-010',
    about: 'Internationally recognized hospital for microvascular reconstructive surgery, burn therapy, clinical dermatology, and spine pathology.',
    specialties: ['Dermatology', 'Plastic Surgery', 'Spine Surgery', 'Reconstructive Surgery', 'Burns Care'],
    totalBeds: 480,
    availableBeds: 125,
    icuBeds: 70,
    availableIcuBeds: 16,
    emergencyBeds: 40,
    availableEmergencyBeds: 12,
    generalBeds: 370,
    availableGeneralBeds: 97,
    location: { latitude: 11.0183, longitude: 76.9558 },
    adminId: 'ADMIN20240010',
    registrationDate: '2024-05-15',
    city: 'Coimbatore',
    isDemo: true
  }
];

// 10 Comprehensive Demo Doctors
export const DEFAULT_DOCTORS: Doctor[] = [
  {
    id: 'DOCTOR20240001',
    userId: 'DOCTOR20240001',
    hospitalId: 'HOSPITAL20240001',
    hospitalName: 'Apollo Multi-Speciality Hospital & Research Center',
    name: 'Dr. Sarah Johnson',
    email: 'doctor@demo.com',
    phone: '+91 98765 43211',
    licenseNo: 'DOC-TN-12345',
    specialization: 'Cardiology',
    experienceYears: 14,
    consultationFee: 800,
    isAvailable: true,
    isActive: true,
    rating: 4.9,
    totalPatients: 1420,
    isDemo: true
  },
  {
    id: 'DOCTOR20240002',
    userId: 'DOCTOR20240002',
    hospitalId: 'HOSPITAL20240002',
    hospitalName: 'Fortis Memorial & Heart Institute',
    name: 'Dr. Priya Sharma',
    email: 'priya.sharma@fortis.org',
    phone: '+91 98765 43212',
    licenseNo: 'DOC-KA-23456',
    specialization: 'Neurology',
    experienceYears: 11,
    consultationFee: 750,
    isAvailable: true,
    isActive: true,
    rating: 4.8,
    totalPatients: 980,
    isDemo: true
  },
  {
    id: 'DOCTOR20240003',
    userId: 'DOCTOR20240003',
    hospitalId: 'HOSPITAL20240007',
    hospitalName: 'MIOT International Hospital & Orthopedic Centre',
    name: 'Dr. Rajesh Varma',
    email: 'rajesh.varma@miot.org',
    phone: '+91 98765 43213',
    licenseNo: 'DOC-TN-34567',
    specialization: 'Orthopedics',
    experienceYears: 16,
    consultationFee: 900,
    isAvailable: true,
    isActive: true,
    rating: 4.9,
    totalPatients: 2150,
    isDemo: true
  },
  {
    id: 'DOCTOR20240004',
    userId: 'DOCTOR20240004',
    hospitalId: 'HOSPITAL20240003',
    hospitalName: 'Manipal Hospital & Institute of Medical Sciences',
    name: 'Dr. Ananya Iyer',
    email: 'ananya.iyer@manipal.org',
    phone: '+91 98765 43214',
    licenseNo: 'DOC-KA-45678',
    specialization: 'Pediatrics',
    experienceYears: 9,
    consultationFee: 600,
    isAvailable: true,
    isActive: true,
    rating: 4.9,
    totalPatients: 1240,
    isDemo: true
  },
  {
    id: 'DOCTOR20240005',
    userId: 'DOCTOR20240005',
    hospitalId: 'HOSPITAL20240004',
    hospitalName: 'Sri Ramachandra Medical Centre & Research Institute',
    name: 'Dr. Karthik Subramanian',
    email: 'karthik.s@sriramachandra.edu.in',
    phone: '+91 98765 43215',
    licenseNo: 'DOC-TN-56789',
    specialization: 'Gastroenterology',
    experienceYears: 12,
    consultationFee: 700,
    isAvailable: true,
    isActive: true,
    rating: 4.7,
    totalPatients: 1100,
    isDemo: true
  },
  {
    id: 'DOCTOR20240006',
    userId: 'DOCTOR20240006',
    hospitalId: 'HOSPITAL20240005',
    hospitalName: 'Kauvery Hospital - Heart & City Center',
    name: 'Dr. Meenakshi Sundaram',
    email: 'meenakshi.s@kauvery.org',
    phone: '+91 98765 43216',
    licenseNo: 'DOC-TN-67890',
    specialization: 'General Medicine',
    experienceYears: 18,
    consultationFee: 500,
    isAvailable: true,
    isActive: true,
    rating: 4.9,
    totalPatients: 3400,
    isDemo: true
  },
  {
    id: 'DOCTOR20240007',
    userId: 'DOCTOR20240007',
    hospitalId: 'HOSPITAL20240006',
    hospitalName: 'Gleneagles Global Health City',
    name: 'Dr. Vikram Malhotra',
    email: 'vikram.m@gleneagles.org',
    phone: '+91 98765 43217',
    licenseNo: 'DOC-TN-78901',
    specialization: 'Pulmonology',
    experienceYears: 15,
    consultationFee: 850,
    isAvailable: true,
    isActive: true,
    rating: 4.8,
    totalPatients: 1680,
    isDemo: true
  },
  {
    id: 'DOCTOR20240008',
    userId: 'DOCTOR20240008',
    hospitalId: 'HOSPITAL20240008',
    hospitalName: 'Aster CMI Hospital & Women Care Center',
    name: 'Dr. Shalini Reddy',
    email: 'shalini.reddy@aster.org',
    phone: '+91 98765 43218',
    licenseNo: 'DOC-KA-89012',
    specialization: 'Obstetrics & Gynecology',
    experienceYears: 13,
    consultationFee: 750,
    isAvailable: true,
    isActive: true,
    rating: 4.9,
    totalPatients: 1890,
    isDemo: true
  },
  {
    id: 'DOCTOR20240009',
    userId: 'DOCTOR20240009',
    hospitalId: 'HOSPITAL20240009',
    hospitalName: 'PSG Super Speciality Hospitals & Cancer Institute',
    name: 'Dr. Arun Natarajan',
    email: 'arun.n@psghospitals.com',
    phone: '+91 98765 43219',
    licenseNo: 'DOC-TN-90123',
    specialization: 'Oncology',
    experienceYears: 20,
    consultationFee: 1000,
    isAvailable: true,
    isActive: true,
    rating: 5.0,
    totalPatients: 2800,
    isDemo: true
  },
  {
    id: 'DOCTOR20240010',
    userId: 'DOCTOR20240010',
    hospitalId: 'HOSPITAL20240010',
    hospitalName: 'Ganga Medical Centre & Specialty Hospital',
    name: 'Dr. Deepa Nambiar',
    email: 'deepa.n@gangahospital.com',
    phone: '+91 98765 43220',
    licenseNo: 'DOC-TN-01234',
    specialization: 'Dermatology',
    experienceYears: 10,
    consultationFee: 650,
    isAvailable: true,
    isActive: true,
    rating: 4.8,
    totalPatients: 1450,
    isDemo: true
  }
];

// Helper to construct full blood inventory for hospitals
const createInitialBloodInventory = (): { [hospitalId: string]: BloodInventory } => {
  const inventory: { [hospitalId: string]: BloodInventory } = {};
  const types = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const baseUnits = [32, 14, 40, 18, 22, 10, 55, 25];

  DEFAULT_HOSPITALS.forEach((h, idx) => {
    inventory[h.id] = {};
    types.forEach((t, tIdx) => {
      const offset = ((idx + tIdx) * 3) % 15;
      inventory[h.id][t] = {
        units: Math.max(5, baseUnits[tIdx] + offset),
        lastUpdated: new Date().toISOString()
      };
    });
  });

  return inventory;
};

export const DEFAULT_PATIENTS: Patient[] = [
  {
    id: 'PATIENT20240001',
    name: 'Mukesh Kumar',
    email: 'patient@demo.com',
    phone: '9876543210',
    dateOfBirth: '1995-08-12',
    gender: 'Male',
    address: '42 Gandhi Road, T. Nagar, Chennai, Tamil Nadu 600017',
    bloodGroup: 'O+',
    emergencyContact: {
      name: 'Suresh Kumar',
      relation: 'Father',
      phone: '9876543299'
    },
    isDemo: true
  }
];

export const DEFAULT_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-demo-001',
    patientId: 'PATIENT20240001',
    doctorId: 'DOCTOR20240001',
    hospitalId: 'HOSPITAL20240001',
    patientName: 'Mukesh Kumar',
    doctorName: 'Dr. Sarah Johnson',
    hospitalName: 'Apollo Multi-Speciality Hospital & Research Center',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '10:00',
    type: 'Cardiology Consultation',
    status: 'confirmed',
    symptoms: 'Routine cardio checkup and BP review',
    notes: 'Please bring recent lipid profile results',
    isDemo: true
  },
  {
    id: 'apt-demo-002',
    patientId: 'PATIENT20240001',
    doctorId: 'DOCTOR20240003',
    hospitalId: 'HOSPITAL20240007',
    patientName: 'Mukesh Kumar',
    doctorName: 'Dr. Rajesh Varma',
    hospitalName: 'MIOT International Hospital & Orthopedic Centre',
    date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    time: '11:30',
    type: 'Orthopedic Follow-up',
    status: 'confirmed',
    symptoms: 'Knee joint discomfort during exercise',
    notes: 'Follow up from last month knee MRI',
    isDemo: true
  }
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [allHospitals, setAllHospitals] = useState<Hospital[]>([]);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [bloodInventory, setBloodInventory] = useState<{ [hospitalId: string]: BloodInventory }>({});
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);

  const isDemo = isDemoUser(user);

  // Load and merge data from localStorage on mount and sync with Firestore
  useEffect(() => {
    // 1. Hospitals initialization
    const savedHospitals = localStorage.getItem('wizards_hospitals');
    let loadedHospitals: Hospital[] = [];
    if (savedHospitals) {
      try {
        const parsed = JSON.parse(savedHospitals);
        loadedHospitals = Array.isArray(parsed) ? parsed : [];
      } catch {
        loadedHospitals = [];
      }
    }
    const existingHospIds = new Set(loadedHospitals.map(h => h.id));
    const mergedHospitals = [...loadedHospitals];
    DEFAULT_HOSPITALS.forEach(defH => {
      if (!existingHospIds.has(defH.id)) {
        mergedHospitals.push(defH);
      }
    });
    setAllHospitals(mergedHospitals);
    localStorage.setItem('wizards_hospitals', JSON.stringify(mergedHospitals));

    // 2. Doctors initialization
    const savedDoctors = localStorage.getItem('wizards_doctors');
    let loadedDoctors: Doctor[] = [];
    if (savedDoctors) {
      try {
        const parsed = JSON.parse(savedDoctors);
        loadedDoctors = Array.isArray(parsed) ? parsed : [];
      } catch {
        loadedDoctors = [];
      }
    }
    const existingDocIds = new Set(loadedDoctors.map(d => d.id));
    const mergedDoctors = [...loadedDoctors];
    DEFAULT_DOCTORS.forEach(defD => {
      if (!existingDocIds.has(defD.id)) {
        mergedDoctors.push(defD);
      }
    });
    setAllDoctors(mergedDoctors);
    localStorage.setItem('wizards_doctors', JSON.stringify(mergedDoctors));

    // 3. Patients initialization
    const savedPatients = localStorage.getItem('wizards_patients');
    let loadedPatients: Patient[] = [];
    if (savedPatients) {
      try {
        const parsed = JSON.parse(savedPatients);
        loadedPatients = Array.isArray(parsed) ? parsed : [];
      } catch {
        loadedPatients = [];
      }
    }
    const existingPatIds = new Set(loadedPatients.map(p => p.id));
    const mergedPatients = [...loadedPatients];
    DEFAULT_PATIENTS.forEach(defP => {
      if (!existingPatIds.has(defP.id)) {
        mergedPatients.push(defP);
      }
    });
    setAllPatients(mergedPatients);
    localStorage.setItem('wizards_patients', JSON.stringify(mergedPatients));

    // 4. Blood Inventory initialization
    const savedBloodInventory = localStorage.getItem('wizards_blood_inventory');
    let loadedBlood: { [hospId: string]: BloodInventory } = {};
    if (savedBloodInventory) {
      try {
        loadedBlood = JSON.parse(savedBloodInventory);
      } catch {
        loadedBlood = {};
      }
    }
    const defaultBlood = createInitialBloodInventory();
    const mergedBlood = { ...defaultBlood, ...loadedBlood };
    setBloodInventory(mergedBlood);
    localStorage.setItem('wizards_blood_inventory', JSON.stringify(mergedBlood));

    // 5. Appointments initialization
    const savedAppointments = localStorage.getItem('wizards_appointments');
    let loadedAppts: Appointment[] = [];
    if (savedAppointments) {
      try {
        const parsed = JSON.parse(savedAppointments);
        loadedAppts = Array.isArray(parsed) ? parsed : [];
      } catch {
        loadedAppts = [];
      }
    }
    const existingApptIds = new Set(loadedAppts.map(a => a.id));
    const mergedAppts = [...loadedAppts];
    DEFAULT_APPOINTMENTS.forEach(defA => {
      if (!existingApptIds.has(defA.id)) {
        mergedAppts.push(defA);
      }
    });
    setAllAppointments(mergedAppts);
    localStorage.setItem('wizards_appointments', JSON.stringify(mergedAppts));

    // 6. Notifications initialization
    const savedNotifications = localStorage.getItem('wizards_notifications');
    if (savedNotifications) {
      try {
        setAllNotifications(JSON.parse(savedNotifications));
      } catch {
        setAllNotifications([]);
      }
    }

    // Fetch and merge from Firestore cloud if available
    const fetchFromFirestore = async () => {
      try {
        const fetchPromise = Promise.all([
          getDocs(collection(db, 'hospitals')),
          getDocs(collection(db, 'doctors')),
          getDocs(collection(db, 'appointments'))
        ]);
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 4000)
        );

        const [hospSnap, docSnap, apptSnap] = await Promise.race([
          fetchPromise,
          timeoutPromise
        ]) as any;

        if (hospSnap && !hospSnap.empty) {
          const cloudHosp = hospSnap.docs.map((d: any) => ({ ...d.data(), id: d.id })) as Hospital[];
          setAllHospitals(prev => {
            const combinedMap = new Map<string, Hospital>();
            prev.forEach(h => combinedMap.set(h.id, h));
            cloudHosp.forEach(h => combinedMap.set(h.id, h));
            const combined = Array.from(combinedMap.values());
            localStorage.setItem('wizards_hospitals', JSON.stringify(combined));
            return combined;
          });
        }

        if (docSnap && !docSnap.empty) {
          const cloudDocs = docSnap.docs.map((d: any) => ({ ...d.data(), id: d.id })) as Doctor[];
          setAllDoctors(prev => {
            const combinedMap = new Map<string, Doctor>();
            prev.forEach(d => combinedMap.set(d.id, d));
            cloudDocs.forEach(d => combinedMap.set(d.id, d));
            const combined = Array.from(combinedMap.values());
            localStorage.setItem('wizards_doctors', JSON.stringify(combined));
            return combined;
          });
        }

        if (apptSnap && !apptSnap.empty) {
          const cloudAppts = apptSnap.docs.map((d: any) => ({ ...d.data(), id: d.id })) as Appointment[];
          setAllAppointments(prev => {
            const combinedMap = new Map<string, Appointment>();
            prev.forEach(a => combinedMap.set(a.id, a));
            cloudAppts.forEach(a => combinedMap.set(a.id, a));
            const combined = Array.from(combinedMap.values());
            localStorage.setItem('wizards_appointments', JSON.stringify(combined));
            return combined;
          });
        }
      } catch {
        // Safe offline fallback
      }
    };

    fetchFromFirestore();
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('wizards_hospitals', JSON.stringify(allHospitals));
  }, [allHospitals]);

  useEffect(() => {
    localStorage.setItem('wizards_doctors', JSON.stringify(allDoctors));
  }, [allDoctors]);

  useEffect(() => {
    localStorage.setItem('wizards_patients', JSON.stringify(allPatients));
  }, [allPatients]);

  useEffect(() => {
    localStorage.setItem('wizards_blood_inventory', JSON.stringify(bloodInventory));
  }, [bloodInventory]);

  useEffect(() => {
    localStorage.setItem('wizards_appointments', JSON.stringify(allAppointments));
  }, [allAppointments]);

  useEffect(() => {
    localStorage.setItem('wizards_notifications', JSON.stringify(allNotifications));
  }, [allNotifications]);

  // ISOLATION LAYER:
  // When isDemo is true (Demo Account logged in):
  // Show ONLY the 10 demo hospitals, 10 demo doctors, demo appointments, demo patients. Real user entries never show in demo!
  // When isDemo is false (Real Account logged in):
  // Show real hospitals and clean doctor list, BUT exclude demo private appointments & demo patients!
  const hospitals = useMemo(() => {
    if (isDemo) {
      return allHospitals.filter(h => h.isDemo || h.id.startsWith('HOSPITAL2024'));
    }
    // Real user sees all registered hospitals in directory
    return allHospitals;
  }, [allHospitals, isDemo]);

  const doctors = useMemo(() => {
    if (isDemo) {
      return allDoctors.filter(d => d.isDemo || d.id.startsWith('DOCTOR2024'));
    }
    return allDoctors;
  }, [allDoctors, isDemo]);

  const patients = useMemo(() => {
    if (isDemo) {
      return allPatients.filter(p => p.isDemo || p.id.startsWith('PATIENT2024'));
    }
    // Real accounts only see real patient entries
    return allPatients.filter(p => !p.isDemo && !p.id.startsWith('PATIENT2024'));
  }, [allPatients, isDemo]);

  const appointments = useMemo(() => {
    if (isDemo) {
      return allAppointments.filter(a => a.isDemo || a.id.startsWith('apt-demo-') || a.patientId.startsWith('PATIENT2024') || a.doctorId.startsWith('DOCTOR2024'));
    }
    // Real user never sees demo dummy appointments
    return allAppointments.filter(a => !a.isDemo && !a.id.startsWith('apt-demo-') && !a.patientId.startsWith('PATIENT2024'));
  }, [allAppointments, isDemo]);

  const notifications = useMemo(() => {
    if (isDemo) {
      return allNotifications.filter(n => n.persistent || n.userId.startsWith('PATIENT2024') || n.userId.startsWith('DOCTOR2024') || n.userId.startsWith('ADMIN2024') || n.userId === 'admin');
    }
    return allNotifications.filter(n => !n.isDemo && (!n.userId.startsWith('PATIENT2024') && !n.userId.startsWith('DOCTOR2024')));
  }, [allNotifications, isDemo]);

  // Hospital functions
  const addHospital = (hospitalData: Omit<Hospital, 'id' | 'registrationDate'>): string => {
    const hospitalId = generateHospitalId();
    const newHospital: Hospital = {
      ...hospitalData,
      id: hospitalId,
      registrationDate: new Date().toISOString().split('T')[0],
      isDemo: isDemo,
    };
    setAllHospitals(prev => {
      const updated = [...prev, newHospital];
      localStorage.setItem('wizards_hospitals', JSON.stringify(updated));
      return updated;
    });

    setDoc(doc(db, 'hospitals', hospitalId), sanitizeForFirestore(newHospital)).catch(() => {});
    
    // Initialize blood inventory for new hospital
    const initialBloodInventory: BloodInventory = {};
    ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].forEach(type => {
      initialBloodInventory[type] = { units: 10, lastUpdated: new Date().toISOString() };
    });
    setBloodInventory(prev => {
      const updated = { ...prev, [hospitalId]: initialBloodInventory };
      localStorage.setItem('wizards_blood_inventory', JSON.stringify(updated));
      return updated;
    });
    
    return hospitalId;
  };

  const updateHospital = (id: string, data: Partial<Hospital>) => {
    setAllHospitals(prev => {
      const updated = prev.map(h => h.id === id ? { ...h, ...data } : h);
      localStorage.setItem('wizards_hospitals', JSON.stringify(updated));
      return updated;
    });
    const existing = allHospitals.find(h => h.id === id);
    const merged = existing ? { ...existing, ...data } : { ...data, id };
    setDoc(doc(db, 'hospitals', id), sanitizeForFirestore(merged), { merge: true }).catch(() => {});
  };

  const getHospitalById = (id: string) => {
    return hospitals.find(h => h.id === id) || allHospitals.find(h => h.id === id);
  };

  // Doctor functions
  const addDoctor = (doctor: Omit<Doctor, 'id'>) => {
    const newDoctor: Doctor = {
      ...doctor,
      id: `DOC${Date.now()}`,
      isDemo: isDemo,
    };
    setAllDoctors(prev => {
      const updated = [...prev, newDoctor];
      localStorage.setItem('wizards_doctors', JSON.stringify(updated));
      return updated;
    });
    setDoc(doc(db, 'doctors', newDoctor.id), sanitizeForFirestore(newDoctor)).catch(() => {});
  };

  const updateDoctor = (id: string, data: Partial<Doctor>) => {
    setAllDoctors(prev => {
      const updated = prev.map(docItem => docItem.id === id ? { ...docItem, ...data } : docItem);
      localStorage.setItem('wizards_doctors', JSON.stringify(updated));
      return updated;
    });
    const existing = allDoctors.find(docItem => docItem.id === id);
    const merged = existing ? { ...existing, ...data } : { ...data, id };
    setDoc(doc(db, 'doctors', id), sanitizeForFirestore(merged), { merge: true }).catch(() => {});
  };

  const removeDoctor = (id: string) => {
    setAllDoctors(prev => {
      const updated = prev.filter(docItem => docItem.id !== id);
      localStorage.setItem('wizards_doctors', JSON.stringify(updated));
      return updated;
    });
    deleteDoc(doc(db, 'doctors', id)).catch(() => {});
  };

  const getDoctorsByHospital = (hospitalId: string) => {
    return doctors.filter(docItem => docItem.hospitalId === hospitalId);
  };

  // Patient functions
  const addPatient = (patient: Omit<Patient, 'id'>) => {
    const newPatient: Patient = {
      ...patient,
      id: `PAT${Date.now()}`,
      isDemo: isDemo,
    };
    setAllPatients(prev => {
      const updated = [...prev, newPatient];
      localStorage.setItem('wizards_patients', JSON.stringify(updated));
      return updated;
    });
    setDoc(doc(db, 'patients', newPatient.id), sanitizeForFirestore(newPatient)).catch(() => {});
  };

  const updatePatient = (id: string, data: Partial<Patient>) => {
    setAllPatients(prev => {
      const updated = prev.map(pat => pat.id === id ? { ...pat, ...data } : pat);
      localStorage.setItem('wizards_patients', JSON.stringify(updated));
      return updated;
    });
    const existing = allPatients.find(pat => pat.id === id);
    const merged = existing ? { ...existing, ...data } : { ...data, id };
    setDoc(doc(db, 'patients', id), sanitizeForFirestore(merged), { merge: true }).catch(() => {});
  };

  const removePatient = (id: string) => {
    setAllPatients(prev => {
      const updated = prev.filter(pat => pat.id !== id);
      localStorage.setItem('wizards_patients', JSON.stringify(updated));
      return updated;
    });
    deleteDoc(doc(db, 'patients', id)).catch(() => {});
  };

  const deleteUserFromData = async (userId: string, email?: string) => {
    setAllPatients(prev => {
      const remaining = prev.filter(p => p.id !== userId && (!email || p.email !== email));
      const removed = prev.filter(p => p.id === userId || (email && p.email === email));
      removed.forEach(p => deleteDoc(doc(db, 'patients', p.id)).catch(() => {}));
      localStorage.setItem('wizards_patients', JSON.stringify(remaining));
      return remaining;
    });

    setAllDoctors(prev => {
      const remaining = prev.filter(d => d.id !== userId && d.userId !== userId && (!email || d.email !== email));
      const removed = prev.filter(d => d.id === userId || d.userId === userId || (email && d.email === email));
      removed.forEach(d => deleteDoc(doc(db, 'doctors', d.id)).catch(() => {}));
      localStorage.setItem('wizards_doctors', JSON.stringify(remaining));
      return remaining;
    });

    setAllAppointments(prev => {
      const remaining = prev.filter(a => a.patientId !== userId && a.doctorId !== userId);
      const removed = prev.filter(a => a.patientId === userId || a.doctorId === userId);
      removed.forEach(a => deleteDoc(doc(db, 'appointments', a.id)).catch(() => {}));
      localStorage.setItem('wizards_appointments', JSON.stringify(remaining));
      return remaining;
    });
  };

  // Blood inventory functions
  const updateBloodInventory = (hospitalId: string, bloodType: string, units: number) => {
    setBloodInventory(prev => {
      const updated = {
        ...prev,
        [hospitalId]: {
          ...prev[hospitalId],
          [bloodType]: {
            units: Math.max(0, units),
            lastUpdated: new Date().toISOString()
          }
        }
      };
      localStorage.setItem('wizards_blood_inventory', JSON.stringify(updated));
      setDoc(doc(db, 'blood_inventory', hospitalId), sanitizeForFirestore(updated[hospitalId]), { merge: true }).catch(() => {});
      return updated;
    });
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

    if (userLocation) {
      results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else {
      results.sort((a, b) => b.units - a.units);
    }

    return results;
  };

  // Appointment functions
  const addAppointment = (appointment: Omit<Appointment, 'id'>) => {
    const newAppointment: Appointment = {
      ...appointment,
      id: `apt-${Date.now()}`,
      isDemo: isDemo,
    };
    setAllAppointments(prev => {
      const updated = [...prev, newAppointment];
      localStorage.setItem('wizards_appointments', JSON.stringify(updated));
      return updated;
    });
    setDoc(doc(db, 'appointments', newAppointment.id), sanitizeForFirestore(newAppointment)).catch(() => {});

    const adminNotification: Notification = {
      id: `notif-${Date.now()}-admin`,
      userId: appointment.hospitalId || 'admin',
      title: 'New Appointment Request',
      message: `New appointment request from ${appointment.patientName} for ${appointment.date} at ${appointment.time}`,
      type: 'appointment',
      isRead: false,
      createdAt: new Date().toISOString(),
      isDemo: isDemo,
    };

    const doctorNotification: Notification = {
      id: `notif-${Date.now()}-doctor`,
      userId: appointment.doctorId,
      title: 'New Appointment Booked',
      message: `New appointment with ${appointment.patientName} scheduled for ${appointment.date} at ${appointment.time}`,
      type: 'appointment',
      isRead: false,
      createdAt: new Date().toISOString(),
      isDemo: isDemo,
    };

    setAllNotifications(prev => [...prev, adminNotification, doctorNotification]);
  };

  const updateAppointment = (id: string, data: Partial<Appointment>) => {
    setAllAppointments(prev => {
      const updated = prev.map(apt => apt.id === id ? { ...apt, ...data } : apt);
      localStorage.setItem('wizards_appointments', JSON.stringify(updated));
      return updated;
    });
    const existing = allAppointments.find(a => a.id === id);
    const merged = existing ? { ...existing, ...data } : { ...data, id };
    setDoc(doc(db, 'appointments', id), sanitizeForFirestore(merged), { merge: true }).catch(() => {});
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
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      isDemo: isDemo,
    };
    setAllNotifications(prev => [...prev, newNotification]);
  };

  const markNotificationRead = (id: string) => {
    setAllNotifications(prev => prev.map(notif => 
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
      if (filters.specialization && doctor.specialization.toLowerCase() !== filters.specialization.toLowerCase()) return false;
      if (filters.hospitalId && doctor.hospitalId !== filters.hospitalId) return false;
      if (filters.available !== undefined && doctor.isAvailable !== filters.available) return false;
      return doctor.isActive;
    });

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
    available?: boolean;
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
            return hospital.availableGeneralBeds > 0 || hospital.availableBeds > 0;
          case 'icu':
            return hospital.availableIcuBeds > 0;
          case 'emergency':
            return hospital.availableEmergencyBeds > 0;
          default:
            return true;
        }
      });
    }

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

  const checkBloodAlerts = (hospitalId: string) => {
    const inventory = bloodInventory[hospitalId];
    if (!inventory) return;

    const lowStockTypes = Object.entries(inventory).filter(([_, data]) => data.units < 10);
    
    if (lowStockTypes.length > 0) {
      const alertNotification: Notification = {
        id: `blood-alert-${Date.now()}`,
        userId: hospitalId,
        title: 'Blood Stock Alert',
        message: `Low stock alert: ${lowStockTypes.map(([type]) => type).join(', ')} need to be restocked.`,
        type: 'blood_alert',
        isRead: false,
        createdAt: new Date().toISOString(),
        persistent: true,
        isDemo: isDemo,
      };
      
      setAllNotifications(prev => [...prev, alertNotification]);
    }
  };

  const dismissBloodAlert = (hospitalId: string) => {
    setAllNotifications(prev => prev.filter(n => 
      !(n.type === 'blood_alert' && n.userId === hospitalId)
    ));
  };

  return (
    <DataContext.Provider value={{
      hospitals,
      allHospitalsList: allHospitals,
      addHospital,
      updateHospital,
      getHospitalById,
      doctors,
      allDoctorsList: allDoctors,
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
      isDemoMode: isDemo,
    }}>
      {children}
    </DataContext.Provider>
  );
};
