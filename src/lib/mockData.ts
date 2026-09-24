export interface MockHospital {
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
  rating?: number;
}

export interface MockDoctor {
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
  hospitalName?: string;
  registrationDate?: string;
}

export interface MockPatient {
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
  registrationDate?: string;
}

export interface MockAppointment {
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

export interface MockBloodInventory {
  [bloodType: string]: {
    units: number;
    lastUpdated: string;
  };
}

export interface MockNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment' | 'emergency' | 'general' | 'system' | 'blood_alert';
  isRead: boolean;
  createdAt: string;
  persistent?: boolean;
}

export const DEMO_PASSWORD = 'Password123!';

export const DEMO_HOSPITALS: MockHospital[] = [
  {
    id: 'HOSP-001',
    name: 'Apollo Multispeciality Hospital',
    address: '21 Greams Lane, Thousand Lights, Chennai, Tamil Nadu',
    phone: '+91 44 2829 0200',
    email: 'apollo.admin@wizards.com',
    deanName: 'Dr. Rajesh Sharma, MD, FRCS',
    licenseNo: 'NABH-TN-2024-001',
    about: 'Premier tertiary care hospital providing cutting-edge cardiology, oncology, and robotic surgery with 24/7 trauma care.',
    specialties: ['Cardiology', 'Oncology', 'Neurology', 'Robotic Surgery', 'Orthopedics'],
    totalBeds: 550,
    availableBeds: 180,
    icuBeds: 80,
    availableIcuBeds: 24,
    emergencyBeds: 50,
    availableEmergencyBeds: 18,
    generalBeds: 420,
    availableGeneralBeds: 138,
    location: { latitude: 13.0604, longitude: 80.2496 },
    adminId: 'ADMIN20240001',
    registrationDate: '2024-01-10',
    city: 'Chennai',
    rating: 4.9
  },
  {
    id: 'HOSP-002',
    name: 'Fortis Memorial Research Institute',
    address: 'Sector 44, Opposite HUDA City Centre, Gurugram, Haryana',
    phone: '+91 124 496 2200',
    email: 'fortis.admin@wizards.com',
    deanName: 'Dr. Ananya Sen, MS, MCh',
    licenseNo: 'NABH-HR-2024-002',
    about: 'State-of-the-art super-speciality hospital known as the Mecca of Healthcare with international accreditations.',
    specialties: ['Neurology', 'Cardiology', 'Organ Transplant', 'Pediatrics', 'Bone Marrow'],
    totalBeds: 400,
    availableBeds: 110,
    icuBeds: 60,
    availableIcuBeds: 15,
    emergencyBeds: 40,
    availableEmergencyBeds: 12,
    generalBeds: 300,
    availableGeneralBeds: 83,
    location: { latitude: 28.4595, longitude: 77.0266 },
    adminId: 'ADMIN20240002',
    registrationDate: '2024-01-15',
    city: 'Gurugram',
    rating: 4.8
  },
  {
    id: 'HOSP-003',
    name: 'Max Super Speciality Hospital',
    address: '1, 2, Press Enclave Marg, Saket, New Delhi',
    phone: '+91 11 2651 5050',
    email: 'max.admin@wizards.com',
    deanName: 'Dr. Vikram Malhotra, MBBS, DNB',
    licenseNo: 'NABH-DL-2024-003',
    about: 'Flagship healthcare facility offering integrated precision treatments in pediatrics, pulmonology, and critical care.',
    specialties: ['Pediatrics', 'Pulmonology', 'Gastroenterology', 'Cardiology', 'Nephrology'],
    totalBeds: 500,
    availableBeds: 145,
    icuBeds: 75,
    availableIcuBeds: 19,
    emergencyBeds: 45,
    availableEmergencyBeds: 14,
    generalBeds: 380,
    availableGeneralBeds: 112,
    location: { latitude: 28.5284, longitude: 77.2185 },
    adminId: 'ADMIN20240003',
    registrationDate: '2024-02-01',
    city: 'New Delhi',
    rating: 4.7
  },
  {
    id: 'HOSP-004',
    name: 'Manipal Hospital',
    address: '98 HAL Old Airport Road, Kodihalli, Bengaluru, Karnataka',
    phone: '+91 80 2502 4444',
    email: 'manipal.admin@wizards.com',
    deanName: 'Dr. Suresh Rao, MS Ortho, MCh',
    licenseNo: 'NABH-KA-2024-004',
    about: 'One of the leading hospital networks pioneering orthopedic joint replacements, sports injury care, and spinal surgeries.',
    specialties: ['Orthopedics', 'Spine Care', 'Emergency Medicine', 'Urology', 'General Surgery'],
    totalBeds: 600,
    availableBeds: 195,
    icuBeds: 90,
    availableIcuBeds: 28,
    emergencyBeds: 50,
    availableEmergencyBeds: 20,
    generalBeds: 460,
    availableGeneralBeds: 147,
    location: { latitude: 12.9587, longitude: 77.6534 },
    adminId: 'ADMIN20240004',
    registrationDate: '2024-02-10',
    city: 'Bengaluru',
    rating: 4.8
  },
  {
    id: 'HOSP-005',
    name: 'Kokilaben Dhirubhai Ambani Hospital',
    address: 'Rao Saheb, Achutrao Patwardhan Marg, Four Bungalows, Andheri West, Mumbai',
    phone: '+91 22 4269 6969',
    email: 'kokilaben.admin@wizards.com',
    deanName: 'Dr. Meera Nambiar, MD, DDV',
    licenseNo: 'NABH-MH-2024-005',
    about: 'Quaternary-care medical institution with world-class dermatology, plastic surgery, oncology, and robotic surgery suites.',
    specialties: ['Dermatology', 'Cosmetology', 'Cardiac Sciences', 'Neurosciences', 'Nuclear Medicine'],
    totalBeds: 750,
    availableBeds: 240,
    icuBeds: 110,
    availableIcuBeds: 35,
    emergencyBeds: 60,
    availableEmergencyBeds: 22,
    generalBeds: 580,
    availableGeneralBeds: 183,
    location: { latitude: 19.1313, longitude: 72.8252 },
    adminId: 'ADMIN20240005',
    registrationDate: '2024-02-20',
    city: 'Mumbai',
    rating: 4.9
  },
  {
    id: 'HOSP-006',
    name: 'Medanta - The Medicity',
    address: 'CH Bakhtawar Singh Road, Sector 38, Gurugram, Haryana',
    phone: '+91 124 414 1414',
    email: 'medanta.admin@wizards.com',
    deanName: 'Dr. Arvind Singhania, MD, FACP',
    licenseNo: 'NABH-HR-2024-006',
    about: 'One of India\'s largest multi-super specialty institutes founded by eminent doctors delivering comprehensive medicine.',
    specialties: ['General Medicine', 'Endocrinology', 'Heart Institute', 'Liver Transplantation', 'Rheumatology'],
    totalBeds: 1250,
    availableBeds: 410,
    icuBeds: 200,
    availableIcuBeds: 62,
    emergencyBeds: 90,
    availableEmergencyBeds: 38,
    generalBeds: 960,
    availableGeneralBeds: 310,
    location: { latitude: 28.4393, longitude: 77.0427 },
    adminId: 'ADMIN20240006',
    registrationDate: '2024-03-01',
    city: 'Gurugram',
    rating: 4.9
  },
  {
    id: 'HOSP-007',
    name: 'Sir Ganga Ram Hospital',
    address: 'Sir Ganga Ram Hospital Marg, Rajinder Nagar, New Delhi',
    phone: '+91 11 2575 0000',
    email: 'gangaram.admin@wizards.com',
    deanName: 'Dr. Sanjay Gupta, MS, DGO, FICOG',
    licenseNo: 'NABH-DL-2024-007',
    about: 'Centuries-old legacy of clinical excellence specializing in obstetrics, gynecology, pediatric surgery, and genetics.',
    specialties: ['Gynecology & Obstetrics', 'IVF & Reproductive Medicine', 'Neonatology', 'Nephrology', 'General Surgery'],
    totalBeds: 675,
    availableBeds: 205,
    icuBeds: 95,
    availableIcuBeds: 29,
    emergencyBeds: 50,
    availableEmergencyBeds: 17,
    generalBeds: 530,
    availableGeneralBeds: 159,
    location: { latitude: 28.6387, longitude: 77.1895 },
    adminId: 'ADMIN20240007',
    registrationDate: '2024-03-05',
    city: 'New Delhi',
    rating: 4.8
  },
  {
    id: 'HOSP-008',
    name: 'Christian Medical College & Hospital',
    address: 'Ida Scudder Road, Vellore, Tamil Nadu',
    phone: '+91 416 228 1000',
    email: 'cmc.admin@wizards.com',
    deanName: 'Dr. Samuel Kurian, MS, MCh, FACS',
    licenseNo: 'NABH-TN-2024-008',
    about: 'World-renowned medical training and healthcare institution renowned for compassionate surgery, hematology, and research.',
    specialties: ['General Surgery', 'Vascular Surgery', 'Hematology', 'Gastroenterology', 'Trauma & Emergency'],
    totalBeds: 900,
    availableBeds: 280,
    icuBeds: 130,
    availableIcuBeds: 40,
    emergencyBeds: 70,
    availableEmergencyBeds: 25,
    generalBeds: 700,
    availableGeneralBeds: 215,
    location: { latitude: 12.9249, longitude: 79.1353 },
    adminId: 'ADMIN20240008',
    registrationDate: '2024-03-10',
    city: 'Vellore',
    rating: 4.9
  },
  {
    id: 'HOSP-009',
    name: 'KIMS Health Hospital',
    address: '1-8-31/1, Minister Road, Secunderabad, Hyderabad, Telangana',
    phone: '+91 40 4488 5000',
    email: 'kims.admin@wizards.com',
    deanName: 'Dr. Sunitha Reddy, MS Ophthalmology',
    licenseNo: 'NABH-TS-2024-009',
    about: 'Advanced multi-disciplinary healthcare center renowned for ophthalmology, retinal surgery, laser eye treatments, and ENT.',
    specialties: ['Ophthalmology', 'Retinal Surgery', 'ENT', 'Cardiology', 'Neuro Surgery'],
    totalBeds: 450,
    availableBeds: 130,
    icuBeds: 65,
    availableIcuBeds: 18,
    emergencyBeds: 40,
    availableEmergencyBeds: 15,
    generalBeds: 345,
    availableGeneralBeds: 97,
    location: { latitude: 17.4399, longitude: 78.4983 },
    adminId: 'ADMIN20240009',
    registrationDate: '2024-03-15',
    city: 'Hyderabad',
    rating: 4.7
  },
  {
    id: 'HOSP-010',
    name: 'Ruby Hall Clinic',
    address: '40 Sassoon Road, Sangamvadi, Pune, Maharashtra',
    phone: '+91 20 6645 5100',
    email: 'rubyhall.admin@wizards.com',
    deanName: 'Dr. Farhan Merchant, MD Pulmonology, FCCP',
    licenseNo: 'NABH-MH-2024-010',
    about: 'Western India\'s pioneering NABH & NABL accredited hospital offering advanced pulmonology, critical care, and sleep medicine.',
    specialties: ['Pulmonology', 'Critical Care', 'Sleep Medicine', 'Cardiac Sciences', 'Medical Oncology'],
    totalBeds: 600,
    availableBeds: 175,
    icuBeds: 85,
    availableIcuBeds: 26,
    emergencyBeds: 45,
    availableEmergencyBeds: 16,
    generalBeds: 470,
    availableGeneralBeds: 133,
    location: { latitude: 18.5308, longitude: 73.8743 },
    adminId: 'ADMIN20240010',
    registrationDate: '2024-03-20',
    city: 'Pune',
    rating: 4.8
  }
];

export const DEMO_ADMIN_USERS = DEMO_HOSPITALS.map((hosp, idx) => ({
  id: hosp.adminId,
  name: hosp.deanName.split(',')[0].trim(),
  email: hosp.email,
  phone: `98765432${String(10 + idx).padStart(2, '0')}`,
  role: 'admin' as const,
  hospitalId: hosp.id,
  registrationDate: hosp.registrationDate,
  password: DEMO_PASSWORD
}));

export const DEMO_DOCTORS: MockDoctor[] = [
  {
    id: 'DOC-001',
    userId: 'DOCTOR20240001',
    hospitalId: 'HOSP-001',
    name: 'Dr. Sarah Johnson',
    email: 'doctor1@wizards.com',
    phone: '+91 98765 41001',
    licenseNo: 'MCI-TN-54210',
    specialization: 'Cardiology',
    experienceYears: 14,
    consultationFee: 800,
    isAvailable: true,
    isActive: true,
    rating: 4.9,
    totalPatients: 412,
    hospitalName: 'Apollo Multispeciality Hospital',
    registrationDate: '2024-01-10'
  },
  {
    id: 'DOC-002',
    userId: 'DOCTOR20240002',
    hospitalId: 'HOSP-002',
    name: 'Dr. Robert Chen',
    email: 'doctor2@wizards.com',
    phone: '+91 98765 41002',
    licenseNo: 'MCI-HR-68231',
    specialization: 'Neurology',
    experienceYears: 12,
    consultationFee: 900,
    isAvailable: true,
    isActive: true,
    rating: 4.8,
    totalPatients: 320,
    hospitalName: 'Fortis Memorial Research Institute',
    registrationDate: '2024-01-15'
  },
  {
    id: 'DOC-003',
    userId: 'DOCTOR20240003',
    hospitalId: 'HOSP-003',
    name: 'Dr. Priya Patel',
    email: 'doctor3@wizards.com',
    phone: '+91 98765 41003',
    licenseNo: 'MCI-DL-99120',
    specialization: 'Pediatrics',
    experienceYears: 9,
    consultationFee: 650,
    isAvailable: true,
    isActive: true,
    rating: 4.9,
    totalPatients: 560,
    hospitalName: 'Max Super Speciality Hospital',
    registrationDate: '2024-02-01'
  },
  {
    id: 'DOC-004',
    userId: 'DOCTOR20240004',
    hospitalId: 'HOSP-004',
    name: 'Dr. Amit Verma',
    email: 'doctor4@wizards.com',
    phone: '+91 98765 41004',
    licenseNo: 'MCI-KA-44102',
    specialization: 'Orthopedics',
    experienceYears: 16,
    consultationFee: 750,
    isAvailable: true,
    isActive: true,
    rating: 4.7,
    totalPatients: 640,
    hospitalName: 'Manipal Hospital',
    registrationDate: '2024-02-10'
  },
  {
    id: 'DOC-005',
    userId: 'DOCTOR20240005',
    hospitalId: 'HOSP-005',
    name: 'Dr. Neha Kapoor',
    email: 'doctor5@wizards.com',
    phone: '+91 98765 41005',
    licenseNo: 'MCI-MH-82190',
    specialization: 'Dermatology',
    experienceYears: 8,
    consultationFee: 700,
    isAvailable: true,
    isActive: true,
    rating: 4.9,
    totalPatients: 490,
    hospitalName: 'Kokilaben Dhirubhai Ambani Hospital',
    registrationDate: '2024-02-20'
  },
  {
    id: 'DOC-006',
    userId: 'DOCTOR20240006',
    hospitalId: 'HOSP-006',
    name: 'Dr. Arjun Reddy',
    email: 'doctor6@wizards.com',
    phone: '+91 98765 41006',
    licenseNo: 'MCI-HR-31804',
    specialization: 'General Medicine',
    experienceYears: 11,
    consultationFee: 500,
    isAvailable: true,
    isActive: true,
    rating: 4.8,
    totalPatients: 780,
    hospitalName: 'Medanta - The Medicity',
    registrationDate: '2024-03-01'
  },
  {
    id: 'DOC-007',
    userId: 'DOCTOR20240007',
    hospitalId: 'HOSP-007',
    name: 'Dr. Kavita Nair',
    email: 'doctor7@wizards.com',
    phone: '+91 98765 41007',
    licenseNo: 'MCI-DL-51289',
    specialization: 'Gynecology & Obstetrics',
    experienceYears: 15,
    consultationFee: 850,
    isAvailable: true,
    isActive: true,
    rating: 4.9,
    totalPatients: 520,
    hospitalName: 'Sir Ganga Ram Hospital',
    registrationDate: '2024-03-05'
  },
  {
    id: 'DOC-008',
    userId: 'DOCTOR20240008',
    hospitalId: 'HOSP-008',
    name: 'Dr. David Wilson',
    email: 'doctor8@wizards.com',
    phone: '+91 98765 41008',
    licenseNo: 'MCI-TN-11492',
    specialization: 'General Surgery',
    experienceYears: 18,
    consultationFee: 1000,
    isAvailable: true,
    isActive: true,
    rating: 5.0,
    totalPatients: 850,
    hospitalName: 'Christian Medical College & Hospital',
    registrationDate: '2024-03-10'
  },
  {
    id: 'DOC-009',
    userId: 'DOCTOR20240009',
    hospitalId: 'HOSP-009',
    name: 'Dr. Sneha Roy',
    email: 'doctor9@wizards.com',
    phone: '+91 98765 41009',
    licenseNo: 'MCI-TS-73821',
    specialization: 'Ophthalmology',
    experienceYears: 10,
    consultationFee: 600,
    isAvailable: true,
    isActive: true,
    rating: 4.8,
    totalPatients: 430,
    hospitalName: 'KIMS Health Hospital',
    registrationDate: '2024-03-15'
  },
  {
    id: 'DOC-010',
    userId: 'DOCTOR20240010',
    hospitalId: 'HOSP-010',
    name: 'Dr. Manoj Joshi',
    email: 'doctor10@wizards.com',
    phone: '+91 98765 41010',
    licenseNo: 'MCI-MH-60912',
    specialization: 'Pulmonology',
    experienceYears: 13,
    consultationFee: 750,
    isAvailable: true,
    isActive: true,
    rating: 4.8,
    totalPatients: 395,
    hospitalName: 'Ruby Hall Clinic',
    registrationDate: '2024-03-20'
  }
];

export const DEMO_DOCTOR_USERS = DEMO_DOCTORS.map((doc) => ({
  id: doc.userId,
  name: doc.name,
  email: doc.email,
  phone: doc.phone.replace(/[^0-9]/g, '').slice(-10),
  role: 'doctor' as const,
  hospitalId: doc.hospitalId,
  licenseId: doc.licenseNo,
  registrationDate: doc.registrationDate || '2024-01-10',
  password: DEMO_PASSWORD
}));

export const DEMO_PATIENTS: MockPatient[] = [
  {
    id: 'PATIENT20240001',
    name: 'Mukesh Kumar',
    email: 'patient1@wizards.com',
    phone: '9876543201',
    dateOfBirth: '1992-05-14',
    gender: 'Male',
    address: '42 Lake View Road, Nungambakkam, Chennai',
    bloodGroup: 'O+',
    emergencyContact: {
      name: 'Ramesh Kumar',
      relation: 'Brother',
      phone: '9876543291'
    },
    registrationDate: '2024-01-12'
  },
  {
    id: 'PATIENT20240002',
    name: 'Aditi Sharma',
    email: 'patient2@wizards.com',
    phone: '9876543202',
    dateOfBirth: '1995-08-22',
    gender: 'Female',
    address: '104 DLF Cyber City Phase 2, Gurugram',
    bloodGroup: 'A+',
    emergencyContact: {
      name: 'Sunil Sharma',
      relation: 'Father',
      phone: '9876543292'
    },
    registrationDate: '2024-01-18'
  },
  {
    id: 'PATIENT20240003',
    name: 'Rohan Mehta',
    email: 'patient3@wizards.com',
    phone: '9876543203',
    dateOfBirth: '1988-11-03',
    gender: 'Male',
    address: 'B-12 Greater Kailash 1, New Delhi',
    bloodGroup: 'B+',
    emergencyContact: {
      name: 'Shweta Mehta',
      relation: 'Spouse',
      phone: '9876543293'
    },
    registrationDate: '2024-02-05'
  },
  {
    id: 'PATIENT20240004',
    name: 'Pooja Hegde',
    email: 'patient4@wizards.com',
    phone: '9876543204',
    dateOfBirth: '1994-03-30',
    gender: 'Female',
    address: '77 Indiranagar 100ft Road, Bengaluru',
    bloodGroup: 'AB+',
    emergencyContact: {
      name: 'Girish Hegde',
      relation: 'Father',
      phone: '9876543294'
    },
    registrationDate: '2024-02-14'
  },
  {
    id: 'PATIENT20240005',
    name: 'Karan Singhal',
    email: 'patient5@wizards.com',
    phone: '9876543205',
    dateOfBirth: '1990-07-19',
    gender: 'Male',
    address: '22 Bandra Bandstand, Mumbai',
    bloodGroup: 'O-',
    emergencyContact: {
      name: 'Anita Singhal',
      relation: 'Mother',
      phone: '9876543295'
    },
    registrationDate: '2024-02-25'
  },
  {
    id: 'PATIENT20240006',
    name: 'Deepika Rao',
    email: 'patient6@wizards.com',
    phone: '9876543206',
    dateOfBirth: '1996-12-10',
    gender: 'Female',
    address: '56 Golf Course Road, Gurugram',
    bloodGroup: 'A-',
    emergencyContact: {
      name: 'Venkat Rao',
      relation: 'Brother',
      phone: '9876543296'
    },
    registrationDate: '2024-03-03'
  },
  {
    id: 'PATIENT20240007',
    name: 'Vikramaditya Seth',
    email: 'patient7@wizards.com',
    phone: '9876543207',
    dateOfBirth: '1985-04-08',
    gender: 'Male',
    address: '88 Civil Lines, North Delhi',
    bloodGroup: 'B-',
    emergencyContact: {
      name: 'Kavita Seth',
      relation: 'Spouse',
      phone: '9876543297'
    },
    registrationDate: '2024-03-08'
  },
  {
    id: 'PATIENT20240008',
    name: 'Ananya Deshmukh',
    email: 'patient8@wizards.com',
    phone: '9876543208',
    dateOfBirth: '1998-09-17',
    gender: 'Female',
    address: '15 Gandhi Nagar, Vellore',
    bloodGroup: 'AB-',
    emergencyContact: {
      name: 'Rajendra Deshmukh',
      relation: 'Father',
      phone: '9876543298'
    },
    registrationDate: '2024-03-12'
  },
  {
    id: 'PATIENT20240009',
    name: 'Rahul Verma',
    email: 'patient9@wizards.com',
    phone: '9876543209',
    dateOfBirth: '1991-01-25',
    gender: 'Male',
    address: '34 Banjara Hills Road No 10, Hyderabad',
    bloodGroup: 'O+',
    emergencyContact: {
      name: 'Meena Verma',
      relation: 'Mother',
      phone: '9876543299'
    },
    registrationDate: '2024-03-17'
  },
  {
    id: 'PATIENT20240010',
    name: 'Snehalatha Iyer',
    email: 'patient10@wizards.com',
    phone: '9876543210',
    dateOfBirth: '1987-06-05',
    gender: 'Female',
    address: '9 Koregaon Park Lane 4, Pune',
    bloodGroup: 'A+',
    emergencyContact: {
      name: 'Sivasubramanian Iyer',
      relation: 'Spouse',
      phone: '9876543200'
    },
    registrationDate: '2024-03-22'
  }
];

export const DEMO_PATIENT_USERS = DEMO_PATIENTS.map((p) => ({
  id: p.id,
  name: p.name,
  email: p.email,
  phone: p.phone,
  role: 'patient' as const,
  registrationDate: p.registrationDate || '2024-01-12',
  password: DEMO_PASSWORD
}));

export const ALL_DEMO_USERS = [
  ...DEMO_ADMIN_USERS,
  ...DEMO_DOCTOR_USERS,
  ...DEMO_PATIENT_USERS
];

export const DEMO_BLOOD_INVENTORY: { [hospitalId: string]: MockBloodInventory } = {
  'HOSP-001': {
    'A+': { units: 28, lastUpdated: '2024-03-24 10:30' },
    'A-': { units: 12, lastUpdated: '2024-03-24 10:30' },
    'B+': { units: 35, lastUpdated: '2024-03-24 10:30' },
    'B-': { units: 9, lastUpdated: '2024-03-24 10:30' },
    'AB+': { units: 18, lastUpdated: '2024-03-24 10:30' },
    'AB-': { units: 6, lastUpdated: '2024-03-24 10:30' },
    'O+': { units: 42, lastUpdated: '2024-03-24 10:30' },
    'O-': { units: 14, lastUpdated: '2024-03-24 10:30' }
  },
  'HOSP-002': {
    'A+': { units: 22, lastUpdated: '2024-03-24 09:15' },
    'A-': { units: 8, lastUpdated: '2024-03-24 09:15' },
    'B+': { units: 29, lastUpdated: '2024-03-24 09:15' },
    'B-': { units: 7, lastUpdated: '2024-03-24 09:15' },
    'AB+': { units: 14, lastUpdated: '2024-03-24 09:15' },
    'AB-': { units: 4, lastUpdated: '2024-03-24 09:15' },
    'O+': { units: 36, lastUpdated: '2024-03-24 09:15' },
    'O-': { units: 11, lastUpdated: '2024-03-24 09:15' }
  },
  'HOSP-003': {
    'A+': { units: 25, lastUpdated: '2024-03-24 11:00' },
    'A-': { units: 10, lastUpdated: '2024-03-24 11:00' },
    'B+': { units: 31, lastUpdated: '2024-03-24 11:00' },
    'B-': { units: 8, lastUpdated: '2024-03-24 11:00' },
    'AB+': { units: 16, lastUpdated: '2024-03-24 11:00' },
    'AB-': { units: 5, lastUpdated: '2024-03-24 11:00' },
    'O+': { units: 39, lastUpdated: '2024-03-24 11:00' },
    'O-': { units: 12, lastUpdated: '2024-03-24 11:00' }
  },
  'HOSP-004': {
    'A+': { units: 30, lastUpdated: '2024-03-24 08:45' },
    'A-': { units: 14, lastUpdated: '2024-03-24 08:45' },
    'B+': { units: 38, lastUpdated: '2024-03-24 08:45' },
    'B-': { units: 11, lastUpdated: '2024-03-24 08:45' },
    'AB+': { units: 20, lastUpdated: '2024-03-24 08:45' },
    'AB-': { units: 7, lastUpdated: '2024-03-24 08:45' },
    'O+': { units: 48, lastUpdated: '2024-03-24 08:45' },
    'O-': { units: 16, lastUpdated: '2024-03-24 08:45' }
  },
  'HOSP-005': {
    'A+': { units: 36, lastUpdated: '2024-03-24 12:20' },
    'A-': { units: 15, lastUpdated: '2024-03-24 12:20' },
    'B+': { units: 42, lastUpdated: '2024-03-24 12:20' },
    'B-': { units: 12, lastUpdated: '2024-03-24 12:20' },
    'AB+': { units: 24, lastUpdated: '2024-03-24 12:20' },
    'AB-': { units: 8, lastUpdated: '2024-03-24 12:20' },
    'O+': { units: 55, lastUpdated: '2024-03-24 12:20' },
    'O-': { units: 18, lastUpdated: '2024-03-24 12:20' }
  },
  'HOSP-006': {
    'A+': { units: 50, lastUpdated: '2024-03-24 07:30' },
    'A-': { units: 20, lastUpdated: '2024-03-24 07:30' },
    'B+': { units: 60, lastUpdated: '2024-03-24 07:30' },
    'B-': { units: 18, lastUpdated: '2024-03-24 07:30' },
    'AB+': { units: 30, lastUpdated: '2024-03-24 07:30' },
    'AB-': { units: 10, lastUpdated: '2024-03-24 07:30' },
    'O+': { units: 75, lastUpdated: '2024-03-24 07:30' },
    'O-': { units: 25, lastUpdated: '2024-03-24 07:30' }
  },
  'HOSP-007': {
    'A+': { units: 32, lastUpdated: '2024-03-24 10:10' },
    'A-': { units: 11, lastUpdated: '2024-03-24 10:10' },
    'B+': { units: 36, lastUpdated: '2024-03-24 10:10' },
    'B-': { units: 10, lastUpdated: '2024-03-24 10:10' },
    'AB+': { units: 19, lastUpdated: '2024-03-24 10:10' },
    'AB-': { units: 6, lastUpdated: '2024-03-24 10:10' },
    'O+': { units: 44, lastUpdated: '2024-03-24 10:10' },
    'O-': { units: 15, lastUpdated: '2024-03-24 10:10' }
  },
  'HOSP-008': {
    'A+': { units: 45, lastUpdated: '2024-03-24 08:15' },
    'A-': { units: 18, lastUpdated: '2024-03-24 08:15' },
    'B+': { units: 52, lastUpdated: '2024-03-24 08:15' },
    'B-': { units: 15, lastUpdated: '2024-03-24 08:15' },
    'AB+': { units: 26, lastUpdated: '2024-03-24 08:15' },
    'AB-': { units: 9, lastUpdated: '2024-03-24 08:15' },
    'O+': { units: 68, lastUpdated: '2024-03-24 08:15' },
    'O-': { units: 22, lastUpdated: '2024-03-24 08:15' }
  },
  'HOSP-009': {
    'A+': { units: 26, lastUpdated: '2024-03-24 11:45' },
    'A-': { units: 9, lastUpdated: '2024-03-24 11:45' },
    'B+': { units: 33, lastUpdated: '2024-03-24 11:45' },
    'B-': { units: 8, lastUpdated: '2024-03-24 11:45' },
    'AB+': { units: 15, lastUpdated: '2024-03-24 11:45' },
    'AB-': { units: 5, lastUpdated: '2024-03-24 11:45' },
    'O+': { units: 38, lastUpdated: '2024-03-24 11:45' },
    'O-': { units: 13, lastUpdated: '2024-03-24 11:45' }
  },
  'HOSP-010': {
    'A+': { units: 34, lastUpdated: '2024-03-24 09:50' },
    'A-': { units: 13, lastUpdated: '2024-03-24 09:50' },
    'B+': { units: 40, lastUpdated: '2024-03-24 09:50' },
    'B-': { units: 11, lastUpdated: '2024-03-24 09:50' },
    'AB+': { units: 21, lastUpdated: '2024-03-24 09:50' },
    'AB-': { units: 7, lastUpdated: '2024-03-24 09:50' },
    'O+': { units: 49, lastUpdated: '2024-03-24 09:50' },
    'O-': { units: 16, lastUpdated: '2024-03-24 09:50' }
  }
};

export const DEMO_APPOINTMENTS: MockAppointment[] = [
  {
    id: 'APPT-1001',
    patientId: 'PATIENT20240001',
    doctorId: 'DOC-001',
    hospitalId: 'HOSP-001',
    patientName: 'Mukesh Kumar',
    doctorName: 'Dr. Sarah Johnson',
    hospitalName: 'Apollo Multispeciality Hospital',
    date: '2024-03-26',
    time: '10:00 AM',
    type: 'Consultation',
    status: 'confirmed',
    symptoms: 'Mild chest tightness and routine hypertension checkup',
    notes: 'ECG recommended, check lipid profile',
    prescription: 'Amlodipine 5mg once daily, follow-up in 2 weeks'
  },
  {
    id: 'APPT-1002',
    patientId: 'PATIENT20240002',
    doctorId: 'DOC-002',
    hospitalId: 'HOSP-002',
    patientName: 'Aditi Sharma',
    doctorName: 'Dr. Robert Chen',
    hospitalName: 'Fortis Memorial Research Institute',
    date: '2024-03-26',
    time: '11:30 AM',
    type: 'Follow-up',
    status: 'confirmed',
    symptoms: 'Occasional migraine aura and light sensitivity'
  },
  {
    id: 'APPT-1003',
    patientId: 'PATIENT20240003',
    doctorId: 'DOC-003',
    hospitalId: 'HOSP-003',
    patientName: 'Rohan Mehta',
    doctorName: 'Dr. Priya Patel',
    hospitalName: 'Max Super Speciality Hospital',
    date: '2024-03-27',
    time: '02:00 PM',
    type: 'Consultation',
    status: 'pending',
    symptoms: 'Seasonal allergic cough and fever in toddler',
    isForFamily: true,
    familyMemberName: 'Aarav Mehta',
    familyMemberAge: 4,
    familyMemberRelation: 'Son'
  },
  {
    id: 'APPT-1004',
    patientId: 'PATIENT20240004',
    doctorId: 'DOC-004',
    hospitalId: 'HOSP-004',
    patientName: 'Pooja Hegde',
    doctorName: 'Dr. Amit Verma',
    hospitalName: 'Manipal Hospital',
    date: '2024-03-27',
    time: '04:00 PM',
    type: 'Consultation',
    status: 'pending',
    symptoms: 'Right knee joint pain after running, swelling'
  },
  {
    id: 'APPT-1005',
    patientId: 'PATIENT20240005',
    doctorId: 'DOC-005',
    hospitalId: 'HOSP-005',
    patientName: 'Karan Singhal',
    doctorName: 'Dr. Neha Kapoor',
    hospitalName: 'Kokilaben Dhirubhai Ambani Hospital',
    date: '2024-03-25',
    time: '03:30 PM',
    type: 'Consultation',
    status: 'completed',
    symptoms: 'Eczema flare-up on both forearms',
    prescription: 'Hydrocortisone cream 1% topical twice daily'
  },
  {
    id: 'APPT-1006',
    patientId: 'PATIENT20240006',
    doctorId: 'DOC-006',
    hospitalId: 'HOSP-006',
    patientName: 'Deepika Rao',
    doctorName: 'Dr. Arjun Reddy',
    hospitalName: 'Medanta - The Medicity',
    date: '2024-03-28',
    time: '09:30 AM',
    type: 'Checkup',
    status: 'confirmed',
    symptoms: 'Annual comprehensive health checkup and lipid profiling'
  },
  {
    id: 'APPT-1007',
    patientId: 'PATIENT20240007',
    doctorId: 'DOC-007',
    hospitalId: 'HOSP-007',
    patientName: 'Vikramaditya Seth',
    doctorName: 'Dr. Kavita Nair',
    hospitalName: 'Sir Ganga Ram Hospital',
    date: '2024-03-28',
    time: '11:00 AM',
    type: 'Consultation',
    status: 'pending',
    symptoms: 'Prenatal second-trimester ultrasound and consultation',
    isForFamily: true,
    familyMemberName: 'Kavita Seth',
    familyMemberAge: 32,
    familyMemberRelation: 'Spouse'
  },
  {
    id: 'APPT-1008',
    patientId: 'PATIENT20240008',
    doctorId: 'DOC-008',
    hospitalId: 'HOSP-008',
    patientName: 'Ananya Deshmukh',
    doctorName: 'Dr. David Wilson',
    hospitalName: 'Christian Medical College & Hospital',
    date: '2024-03-29',
    time: '10:30 AM',
    type: 'Surgical Consultation',
    status: 'confirmed',
    symptoms: 'Post-operative wound healing check after laparoscopic appendectomy'
  },
  {
    id: 'APPT-1009',
    patientId: 'PATIENT20240009',
    doctorId: 'DOC-009',
    hospitalId: 'HOSP-009',
    patientName: 'Rahul Verma',
    doctorName: 'Dr. Sneha Roy',
    hospitalName: 'KIMS Health Hospital',
    date: '2024-03-29',
    time: '03:00 PM',
    type: 'Vision Test',
    status: 'pending',
    symptoms: 'Computer vision syndrome, eye strain, and dry eyes'
  },
  {
    id: 'APPT-1010',
    patientId: 'PATIENT20240010',
    doctorId: 'DOC-010',
    hospitalId: 'HOSP-010',
    patientName: 'Snehalatha Iyer',
    doctorName: 'Dr. Manoj Joshi',
    hospitalName: 'Ruby Hall Clinic',
    date: '2024-03-30',
    time: '11:00 AM',
    type: 'Consultation',
    status: 'confirmed',
    symptoms: 'Persistent allergic asthma wheezing during weather transition'
  }
];

export const DEMO_NOTIFICATIONS: MockNotification[] = [
  {
    id: 'NOTIF-001',
    userId: 'PATIENT20240001',
    title: 'Appointment Confirmed',
    message: 'Your appointment with Dr. Sarah Johnson on 2024-03-26 at 10:00 AM has been confirmed.',
    type: 'appointment',
    isRead: false,
    createdAt: '2024-03-24 10:00'
  },
  {
    id: 'NOTIF-002',
    userId: 'DOCTOR20240001',
    title: 'New Appointment Booked',
    message: 'Patient Mukesh Kumar booked an appointment for 2024-03-26 at 10:00 AM.',
    type: 'appointment',
    isRead: false,
    createdAt: '2024-03-24 09:30'
  },
  {
    id: 'NOTIF-003',
    userId: 'ADMIN20240001',
    title: 'Hospital Activity Update',
    message: 'New appointment scheduled with Dr. Sarah Johnson by patient Mukesh Kumar.',
    type: 'general',
    isRead: false,
    createdAt: '2024-03-24 09:30'
  },
  {
    id: 'NOTIF-004',
    userId: 'ADMIN20240001',
    title: 'Blood Inventory Stable',
    message: 'Apollo blood bank currently maintains 189 total units with all groups in healthy stock.',
    type: 'blood_alert',
    isRead: true,
    createdAt: '2024-03-24 08:00'
  }
];
