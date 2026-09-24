import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/authcontext';
import { useData } from '../../contexts/datacontext';
import { useLanguage } from '../../contexts/languagecontext';
import LanguageSelector from '../../components/languageselector';
import { 
  Home, 
  Calendar, 
  Building2, 
  Stethoscope, 
  Bell, 
  User, 
  Search,
  Phone,
  MapPin,
  Droplet,
  AlertTriangle,
  FileText,
  LogOut,
  Star,
  Clock,
  Edit3,
  Save,
  X,
  Users,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  Plus,
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';

const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser, deleteAccount } = useAuth();
  const { t } = useLanguage();
  const { 
    hospitals,
    doctors,
    patients,
    addPatient,
    updatePatient,
    deleteUserFromData,
    appointments,
    addAppointment,
    updateAppointment,
    getAppointmentsByPatient,
    notifications,
    markNotificationRead,
    getNotificationsByUser,
    getAvailableSlots,
    searchBloodAvailability,
    getBloodInventoryByHospital
  } = useData();

  const [activeTab, setActiveTab] = useState('home');
  const [symptoms, setSymptoms] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showBloodSearch, setShowBloodSearch] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState<string | null>(null);
  const [searchFilters, setSearchFilters] = useState({
    doctorQuery: '',
    specialization: '',
    location: ''
  });
  const [bloodSearchType, setBloodSearchType] = useState('');

  // In-app Toast message state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // In-app Cancel Modal state
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; apptId: string; doctorName: string; date: string } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Find or create current patient
  const currentPatient = patients.find(p => p.email === user?.email || p.id === user?.id);
  const [patientProfile, setPatientProfile] = useState(currentPatient || {
    id: user?.id || '',
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dateOfBirth: '',
    gender: '',
    address: '',
    bloodGroup: '',
    emergencyContact: {
      name: '',
      relation: '',
      phone: ''
    }
  });

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });

  const [bookingForm, setBookingForm] = useState({
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '10:00',
    type: 'General Consultation',
    symptoms: '',
    isForFamily: false,
    familyMemberName: '',
    familyMemberAge: 0,
    familyMemberRelation: ''
  });

  useEffect(() => {
    if (currentPatient) {
      setPatientProfile(currentPatient);
    }
  }, [currentPatient]);

  // Load uploaded files from localStorage on component mount
  useEffect(() => {
    const savedFiles = localStorage.getItem(`medical_files_${user?.id}`);
    if (savedFiles) {
      try {
        setUploadedFiles(JSON.parse(savedFiles));
      } catch {
        setUploadedFiles([]);
      }
    }
  }, [user?.id]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: any[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB

    Array.from(files).forEach((file) => {
      if (file.size > maxSize) {
        setToast({ type: 'error', text: `File ${file.name} is too large. Maximum size is 10MB.` });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: e.target?.result,
          uploadDate: new Date().toLocaleDateString(),
          id: Date.now() + Math.random()
        };
        
        newFiles.push(fileData);
        
        if (newFiles.length === files.length) {
          const updatedFiles = [...uploadedFiles, ...newFiles];
          setUploadedFiles(updatedFiles);
          localStorage.setItem(`medical_files_${user?.id}`, JSON.stringify(updatedFiles));
          setToast({ type: 'success', text: `${newFiles.length} medical document(s) uploaded successfully!` });
        }
      };
      reader.readAsDataURL(file);
    });

    event.target.value = '';
  };

  const handleViewFile = (file: any) => {
    if (file.type.includes('image')) {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>${file.name}</title></head>
            <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f0f0;">
              <img src="${file.data}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="${file.name}">
            </body>
          </html>
        `);
      }
    } else {
      const link = document.createElement('a');
      link.href = file.data;
      link.download = file.name;
      link.click();
    }
  };

  const handleDeleteFile = (index: number) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updatedFiles);
    localStorage.setItem(`medical_files_${user?.id}`, JSON.stringify(updatedFiles));
    setToast({ type: 'info', text: 'Medical document deleted.' });
  };

  const tabs = [
    { id: 'home', label: t('home') || 'Home', icon: Home },
    { id: 'appointments', label: t('appointments') || 'My Appointments', icon: Calendar },
    { id: 'doctors', label: t('findDoctor') || 'Find Doctors & Book', icon: Stethoscope },
    { id: 'hospitals', label: t('hospital') ? `${t('hospital')}s` : 'Hospitals', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: t('profile') || 'Profile', icon: User },
  ];

  const handleSymptomCheck = () => {
    if (!symptoms.trim()) return;
    setToast({ 
      type: 'info', 
      text: `AI Advice for "${symptoms}": Stay hydrated, rest, and schedule a specialist consultation if symptoms persist.` 
    });
  };

  const handleEmergencyCall = () => {
    setToast({
      type: 'error',
      text: '🚨 Emergency SOS Broadcast Sent! Nearest Apollo & Fortis trauma units notified. Helpline: 108 / 112.'
    });
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      setToast({ type: 'error', text: 'Name and email are required fields.' });
      return;
    }

    try {
      await updateUser({
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
      });
      if (currentPatient) {
        updatePatient(currentPatient.id, {
          ...patientProfile,
          name: profileForm.name.trim(),
          email: profileForm.email.trim(),
          phone: profileForm.phone.trim(),
        });
      } else {
        addPatient({
          ...patientProfile,
          name: profileForm.name.trim(),
          email: profileForm.email.trim(),
          phone: profileForm.phone.trim(),
        });
      }
      setEditingProfile(false);
      setToast({ type: 'success', text: 'Profile details saved successfully!' });
    } catch (err) {
      console.error('Error saving patient profile:', err);
      setToast({ type: 'error', text: 'Failed to save profile changes. Please try again.' });
    }
  };

  const handleDeleteAccount = async () => {
    if (user) {
      await deleteUserFromData(user.id, user.email);
      const result = await deleteAccount(user.id);
      if (result.success) {
        navigate('/');
      } else {
        setToast({ type: 'error', text: result.message || 'Failed to delete account' });
      }
    }
    setShowDeleteModal(false);
  };

  const handleBookAppointment = (doctor: any) => {
    setSelectedDoctor(doctor);
    setBookingForm({
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      time: '10:00',
      type: `${doctor.specialization} Consultation`,
      symptoms: '',
      isForFamily: false,
      familyMemberName: '',
      familyMemberAge: 0,
      familyMemberRelation: ''
    });
    setShowBookingForm(true);
  };

  const handleSubmitBooking = () => {
    if (!selectedDoctor || !bookingForm.date || !bookingForm.time) {
      setToast({ type: 'error', text: 'Please select both appointment date and time slot.' });
      return;
    }

    const availableSlots = getAvailableSlots(selectedDoctor.id, bookingForm.date);
    if (!availableSlots.includes(bookingForm.time)) {
      setToast({ type: 'error', text: 'This time slot is already taken. Please choose another available slot.' });
      return;
    }

    const patientName = bookingForm.isForFamily 
      ? bookingForm.familyMemberName.trim() 
      : (currentPatient?.name || user?.name || 'Patient');
    
    if (bookingForm.isForFamily && !bookingForm.familyMemberName.trim()) {
      setToast({ type: 'error', text: 'Please provide the family member name.' });
      return;
    }

    const hospitalObj = hospitals.find(h => h.id === selectedDoctor.hospitalId);

    const newAppt: any = {
      patientId: currentPatient?.id || user?.id || 'PATIENT',
      doctorId: selectedDoctor.id,
      hospitalId: selectedDoctor.hospitalId,
      patientName,
      doctorName: selectedDoctor.name,
      hospitalName: selectedDoctor.hospitalName || hospitalObj?.name || 'Super Speciality Hospital',
      date: bookingForm.date,
      time: bookingForm.time,
      type: bookingForm.type,
      status: 'confirmed',
      symptoms: bookingForm.symptoms.trim() || 'General Consultation',
      isForFamily: Boolean(bookingForm.isForFamily),
    };

    if (bookingForm.isForFamily) {
      if (bookingForm.familyMemberName.trim()) {
        newAppt.familyMemberName = bookingForm.familyMemberName.trim();
      }
      if (bookingForm.familyMemberRelation.trim()) {
        newAppt.familyMemberRelation = bookingForm.familyMemberRelation.trim();
      }
      if (bookingForm.familyMemberAge && Number(bookingForm.familyMemberAge) > 0) {
        newAppt.familyMemberAge = Number(bookingForm.familyMemberAge);
      }
    }

    addAppointment(newAppt);
    setShowBookingForm(false);
    setActiveTab('appointments');
    setAppointmentFilter('all');
    setToast({
      type: 'success',
      text: `🎉 Appointment booked successfully with Dr. ${selectedDoctor.name} for ${bookingForm.date} at ${bookingForm.time}!`
    });
  };

  const confirmCancelAppointment = () => {
    if (!cancelModal) return;
    updateAppointment(cancelModal.apptId, { status: 'cancelled' });
    setToast({
      type: 'info',
      text: `Appointment with Dr. ${cancelModal.doctorName} on ${cancelModal.date} has been cancelled.`
    });
    setCancelModal(null);
  };

  const handleBloodSearch = () => {
    if (!bloodSearchType) return;
    const userLocation = { latitude: 13.0604, longitude: 80.2496 }; // Chennai
    const results = searchBloodAvailability(bloodSearchType, userLocation);
    
    if (results.length === 0) {
      setToast({ type: 'info', text: `No ${bloodSearchType} blood currently available in nearby hospitals.` });
    } else {
      const resultText = results.map((result, index) => 
        `${index + 1}. ${result.hospital.name} (${result.units} units)`
      ).join(' | ');
      setToast({ type: 'success', text: `🩸 ${bloodSearchType} Blood Stock Available: ${resultText}` });
    }
  };

  // Get patient's appointments and notifications
  const patientAppointments = getAppointmentsByPatient(currentPatient?.id || user?.id || '');
  const patientNotifications = getNotificationsByUser(currentPatient?.id || user?.id || '');

  const filteredAppointments = patientAppointments.filter(apt => {
    if (appointmentFilter === 'all') return true;
    return apt.status === appointmentFilter;
  });

  const availableSlotsList = selectedDoctor 
    ? getAvailableSlots(selectedDoctor.id, bookingForm.date)
    : [];

  // Filter doctors considering selected hospital, specialization, and doctor query
  const filteredDoctorsList = doctors.filter(doctor => {
    // 1. Hospital filter
    if (selectedHospitalFilter) {
      const matchHosp = doctor.hospitalId === selectedHospitalFilter || 
                        doctor.hospitalName?.toLowerCase().includes(selectedHospitalFilter.toLowerCase());
      if (!matchHosp) return false;
    }

    // 2. Specialization dropdown filter
    if (searchFilters.specialization && doctor.specialization !== searchFilters.specialization) {
      return false;
    }

    // 3. Search query filter
    if (searchFilters.doctorQuery) {
      const query = searchFilters.doctorQuery.toLowerCase();
      const matchDoc = doctor.name.toLowerCase().includes(query) ||
                       doctor.specialization.toLowerCase().includes(query) ||
                       doctor.hospitalName?.toLowerCase().includes(query) ||
                       doctor.phone.includes(query) ||
                       doctor.userId.toLowerCase().includes(query) ||
                       doctor.licenseNo.toLowerCase().includes(query);
      if (!matchDoc) return false;
    }

    return doctor.isActive;
  });

  const selectedHospitalObj = selectedHospitalFilter 
    ? hospitals.find(h => h.id === selectedHospitalFilter || h.name === selectedHospitalFilter) 
    : null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-6 rounded-2xl shadow-md transform transition-all duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="bg-white/20 text-xs px-3 py-1 rounded-full uppercase tracking-wider font-semibold">
                    Patient Portal
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold mt-2">Welcome back, {user?.name}!</h2>
                  <p className="opacity-90 mt-1">Access verified doctors, book appointments, and check hospital bed availability.</p>
                  <p className="text-xs opacity-75 mt-2 font-mono">Patient ID: {user?.id}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setSelectedHospitalFilter(null);
                      setActiveTab('doctors');
                    }}
                    className="bg-white text-blue-700 hover:bg-blue-50 px-5 py-2.5 rounded-xl font-semibold shadow transition-all flex items-center space-x-2"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Book Appointment</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={handleEmergencyCall}
                className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-xl flex flex-col items-center justify-center space-y-2 shadow-sm transition-all transform hover:-translate-y-1"
              >
                <Phone className="h-6 w-6" />
                <span className="font-semibold text-sm">Emergency SOS</span>
              </button>
              <button 
                onClick={() => {
                  setSelectedHospitalFilter(null);
                  setActiveTab('doctors');
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-xl flex flex-col items-center justify-center space-y-2 shadow-sm transition-all transform hover:-translate-y-1"
              >
                <Calendar className="h-6 w-6" />
                <span className="font-semibold text-sm">Book Doctor</span>
              </button>
              <button 
                onClick={() => setActiveTab('hospitals')}
                className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl flex flex-col items-center justify-center space-y-2 shadow-sm transition-all transform hover:-translate-y-1"
              >
                <Building2 className="h-6 w-6" />
                <span className="font-semibold text-sm">Find Hospital</span>
              </button>
              <button 
                onClick={() => setShowBloodSearch(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white p-4 rounded-xl flex flex-col items-center justify-center space-y-2 shadow-sm transition-all transform hover:-translate-y-1"
              >
                <Droplet className="h-6 w-6" />
                <span className="font-semibold text-sm">Blood Stock</span>
              </button>
            </div>

            {/* Upcoming Appointments Summary */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  Your Appointments ({patientAppointments.length})
                </h3>
                <button 
                  onClick={() => setActiveTab('appointments')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center"
                >
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </button>
              </div>

              {patientAppointments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patientAppointments.slice(0, 2).map((appt) => (
                    <div key={appt.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex flex-col justify-between space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase ${
                            appt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            appt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            appt.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {appt.status}
                          </span>
                          <h4 className="font-bold text-gray-900 mt-2">Dr. {appt.doctorName}</h4>
                          <p className="text-xs text-gray-600">{appt.type}</p>
                          <p className="text-xs text-gray-500 mt-1 flex items-center">
                            <Building2 className="h-3 w-3 mr-1" />
                            {appt.hospitalName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-700 text-sm">{appt.date}</p>
                          <p className="text-xs text-gray-600 flex items-center justify-end mt-0.5">
                            <Clock className="h-3 w-3 mr-1" />
                            {appt.time}
                          </p>
                        </div>
                      </div>
                      {appt.symptoms && (
                        <p className="text-xs text-gray-500 italic bg-white p-2 rounded border">
                          Reason: {appt.symptoms}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Calendar className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 font-medium">No appointments booked yet</p>
                  <button
                    onClick={() => {
                      setSelectedHospitalFilter(null);
                      setActiveTab('doctors');
                    }}
                    className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold"
                  >
                    Find a Doctor & Book
                  </button>
                </div>
              )}
            </div>

            {/* AI Symptom Checker */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h3 className="text-lg font-bold mb-2 flex items-center text-gray-900">
                <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                AI Health & Symptom Assistant
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Describe your symptoms to receive instant guidance and doctor recommendations.
              </p>
              <div className="space-y-4">
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  rows={3}
                  placeholder="Describe what you are feeling (e.g., migraine, chest pain, recurring fever)..."
                />
                <button
                  onClick={handleSymptomCheck}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
                >
                  Analyze Symptoms
                </button>
              </div>
            </div>

            {/* Medical Files Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-500" />
                  Medical Documents & Lab Reports
                </h4>
                <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center space-x-2">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Plus className="h-4 w-4" />
                  <span>Upload Document</span>
                </label>
              </div>

              <div className="space-y-2">
                {uploadedFiles.length > 0 ? (
                  uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-semibold text-xs text-gray-900">{file.name}</p>
                          <p className="text-[10px] text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.uploadDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewFile(file)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold px-2 py-1 bg-blue-50 rounded"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteFile(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-xs text-gray-500">No medical files uploaded yet.</p>
                )}
              </div>
            </div>
          </div>
        );

      case 'appointments':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">My Appointments</h2>
                <p className="text-sm text-gray-600 mt-1">Manage, review, or cancel your scheduled consultations</p>
              </div>
              <button
                onClick={() => {
                  setSelectedHospitalFilter(null);
                  setActiveTab('doctors');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 shadow"
              >
                <Plus className="h-4 w-4" />
                <span>Book New Appointment</span>
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {(['all', 'confirmed', 'pending', 'completed', 'cancelled'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setAppointmentFilter(filter)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                    appointmentFilter === filter
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border'
                  }`}
                >
                  {filter} ({filter === 'all' ? patientAppointments.length : patientAppointments.filter(a => a.status === filter).length})
                </button>
              ))}
            </div>

            {/* Appointments List */}
            <div className="space-y-4">
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((appt) => (
                  <div key={appt.id} className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-200 transition-all">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                        <Stethoscope className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-lg font-bold text-gray-900">Dr. {appt.doctorName}</h4>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase ${
                            appt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            appt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            appt.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {appt.status}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-blue-600">{appt.type}</p>
                        <p className="text-xs text-gray-600 flex items-center">
                          <Building2 className="h-3.5 w-3.5 mr-1 text-gray-400" />
                          {appt.hospitalName}
                        </p>
                        {appt.isForFamily && (
                          <p className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded inline-block">
                            For Family Member: {appt.familyMemberName} ({appt.familyMemberRelation || 'Relative'})
                          </p>
                        )}
                        {appt.symptoms && (
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="font-semibold text-gray-700">Reason / Symptoms:</span> {appt.symptoms}
                          </p>
                        )}
                        {appt.notes && (
                          <p className="text-xs text-green-700 bg-green-50 p-2 rounded mt-2">
                            <span className="font-semibold">Doctor's Note:</span> {appt.notes}
                          </p>
                        )}
                        {appt.prescription && (
                          <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded mt-1">
                            <span className="font-semibold">Prescription:</span> {appt.prescription}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 shrink-0 space-y-3">
                      <div className="text-left md:text-right">
                        <p className="text-sm font-bold text-gray-900">{appt.date}</p>
                        <p className="text-xs text-gray-500 flex items-center md:justify-end">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          {appt.time}
                        </p>
                      </div>

                      <div className="flex space-x-2">
                        {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                          <button
                            onClick={() => setCancelModal({ isOpen: true, apptId: appt.id, doctorName: appt.doctorName, date: `${appt.date} at ${appt.time}` })}
                            className="text-red-600 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Cancel Appointment
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const doc = doctors.find(d => d.id === appt.doctorId);
                            if (doc) handleBookAppointment(doc);
                            else {
                              setSelectedHospitalFilter(null);
                              setActiveTab('doctors');
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Book Again
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white p-12 rounded-2xl shadow-sm border text-center">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-gray-900">No appointments found</h3>
                  <p className="text-sm text-gray-500 mt-1">You do not have any appointments matching this filter.</p>
                  <button
                    onClick={() => {
                      setSelectedHospitalFilter(null);
                      setActiveTab('doctors');
                    }}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center space-x-2 shadow"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Book Your Consultation</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'doctors':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Header and Filter Controls */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Find Doctors & Book Appointment
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Select from verified specialists across our network hospitals
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search doctor, hospital, license..."
                      value={searchFilters.doctorQuery}
                      onChange={(e) => setSearchFilters({...searchFilters, doctorQuery: e.target.value})}
                      className="pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
                    />
                  </div>

                  <select
                    value={searchFilters.specialization}
                    onChange={(e) => setSearchFilters({...searchFilters, specialization: e.target.value})}
                    className="px-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Specializations</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Gastroenterology">Gastroenterology</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Pulmonology">Pulmonology</option>
                    <option value="Obstetrics & Gynecology">Obstetrics & Gynecology</option>
                    <option value="Oncology">Oncology</option>
                    <option value="Dermatology">Dermatology</option>
                  </select>
                </div>
              </div>

              {/* Selected Hospital Filter Tag */}
              {selectedHospitalFilter && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-4 py-2.5 rounded-xl text-xs">
                  <div className="flex items-center space-x-2 text-blue-900">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span>
                      Showing doctors affiliated with: <strong className="font-bold">{selectedHospitalObj?.name || selectedHospitalFilter}</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedHospitalFilter(null)}
                    className="bg-white hover:bg-blue-100 text-blue-700 font-semibold px-3 py-1 rounded-lg border border-blue-200 flex items-center space-x-1"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Show All Doctors</span>
                  </button>
                </div>
              )}
            </div>

            {/* Doctors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDoctorsList.length > 0 ? (
                filteredDoctorsList.map((doctor) => {
                  const hospitalObj = hospitals.find(h => h.id === doctor.hospitalId);
                  const hospitalDisplayName = doctor.hospitalName || hospitalObj?.name || 'Super Speciality Hospital';

                  return (
                    <div key={doctor.id} className="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0 font-bold text-xl">
                            <Stethoscope className="h-7 w-7" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 truncate">Dr. {doctor.name}</h4>
                            <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block mt-0.5">
                              {doctor.specialization}
                            </p>
                            <div className="flex items-center space-x-1.5 mt-1.5">
                              <div className={`w-2 h-2 rounded-full ${doctor.isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              <span className="text-[11px] font-medium text-gray-500">{doctor.isAvailable ? 'Available Today' : 'Unavailable'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-1.5 text-xs text-gray-600 mb-4 bg-gray-50 p-3.5 rounded-xl border">
                          <p><span className="font-semibold text-gray-800">Hospital:</span> {hospitalDisplayName}</p>
                          <p><span className="font-semibold text-gray-800">Experience:</span> {doctor.experienceYears} Years</p>
                          <p><span className="font-semibold text-gray-800">License:</span> {doctor.licenseNo}</p>
                          <p><span className="font-semibold text-gray-800">Fee:</span> ₹{doctor.consultationFee}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                          <span className="text-xs font-bold text-gray-800">{doctor.rating}</span>
                          <span className="text-[10px] text-gray-400">({doctor.totalPatients}+)</span>
                        </div>
                        <button
                          onClick={() => handleBookAppointment(doctor)}
                          disabled={!doctor.isAvailable}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            doctor.isAvailable
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {doctor.isAvailable ? 'Book Appointment' : 'Unavailable'}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full bg-white p-12 rounded-2xl shadow-sm border text-center text-gray-500">
                  <Stethoscope className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-gray-800">No doctors found matching your criteria</h3>
                  <p className="text-xs text-gray-500 mt-1">Try clearing filters to view all available doctors.</p>
                  <button
                    onClick={() => {
                      setSelectedHospitalFilter(null);
                      setSearchFilters({ doctorQuery: '', specialization: '', location: '' });
                    }}
                    className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'hospitals':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Hospital Network ({hospitals.length})</h2>
                <p className="text-sm text-gray-600 mt-1">Real-time ICU, Emergency, and General bed availability</p>
              </div>
              <input
                type="text"
                placeholder="Filter by city or hospital name..."
                value={searchFilters.location}
                onChange={(e) => setSearchFilters({...searchFilters, location: e.target.value})}
                className="px-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hospitals
                .filter(h => !searchFilters.location || h.name.toLowerCase().includes(searchFilters.location.toLowerCase()) || h.address.toLowerCase().includes(searchFilters.location.toLowerCase()) || h.city?.toLowerCase().includes(searchFilters.location.toLowerCase()))
                .map((hospital) => {
                  const hospDoctors = doctors.filter(d => d.hospitalId === hospital.id);
                  
                  return (
                    <div key={hospital.id} className="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all flex flex-col justify-between">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-bold text-base text-gray-900">{hospital.name}</h4>
                          <p className="text-xs text-gray-500 flex items-center mt-1">
                            <MapPin className="h-3.5 w-3.5 mr-1 shrink-0 text-red-500" />
                            {hospital.address}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Phone: {hospital.phone}</p>
                        </div>

                        {/* Bed Stats */}
                        <div className="bg-gray-50 p-3 rounded-xl border space-y-2 text-xs">
                          <p className="font-bold text-gray-800">Bed Availability</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-white p-2 rounded border">
                              <p className="text-[10px] text-gray-500">ICU</p>
                              <p className="font-bold text-red-600">{hospital.availableIcuBeds}/{hospital.icuBeds}</p>
                            </div>
                            <div className="bg-white p-2 rounded border">
                              <p className="text-[10px] text-gray-500">Emergency</p>
                              <p className="font-bold text-amber-600">{hospital.availableEmergencyBeds}/{hospital.emergencyBeds}</p>
                            </div>
                            <div className="bg-white p-2 rounded border">
                              <p className="text-[10px] text-gray-500">General</p>
                              <p className="font-bold text-blue-600">{hospital.availableGeneralBeds}/{hospital.generalBeds}</p>
                            </div>
                          </div>
                        </div>

                        {/* Doctors preview */}
                        <div>
                          <p className="text-xs font-bold text-gray-700 mb-1">Doctors at this Hospital ({hospDoctors.length})</p>
                          <div className="flex flex-wrap gap-1">
                            {hospDoctors.map((doc) => (
                              <span key={doc.id} className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-medium border border-emerald-100">
                                Dr. {doc.name} ({doc.specialization})
                              </span>
                            ))}
                            {hospDoctors.length === 0 && (
                              <span className="text-[10px] text-gray-400">No doctors listed yet</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t mt-4 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500">Reg: {hospital.licenseNo}</span>
                        <button
                          onClick={() => {
                            setSelectedHospitalFilter(hospital.id);
                            setSearchFilters(prev => ({ ...prev, doctorQuery: '' }));
                            setActiveTab('doctors');
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all"
                        >
                          View Doctors ({hospDoctors.length})
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h2 className="text-2xl font-bold text-gray-900">Notifications & Alerts</h2>
              <p className="text-sm text-gray-600 mt-1">Updates regarding your appointments, test reports, and hospital alerts</p>
            </div>

            <div className="space-y-3">
              {patientNotifications.length > 0 ? (
                patientNotifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-4 rounded-2xl border transition-all flex items-start justify-between ${
                      notif.isRead ? 'bg-white' : 'bg-blue-50/60 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-xl mt-0.5">
                        <Bell className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">{notif.title}</h4>
                        <p className="text-xs text-gray-600 mt-0.5">{notif.message}</p>
                        <span className="text-[10px] text-gray-400 mt-1 block">{notif.createdAt}</span>
                      </div>
                    </div>
                    {!notif.isRead && (
                      <button
                        onClick={() => markNotificationRead(notif.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 bg-white rounded border shrink-0"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-white p-12 rounded-2xl shadow-sm border text-center text-gray-500">
                  <Bell className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm">No new notifications</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Patient Profile</h2>
                <p className="text-sm text-gray-600">Manage your contact and medical info</p>
              </div>
              {!editingProfile ? (
                <button
                  onClick={() => {
                    setProfileForm({
                      name: user?.name || '',
                      email: user?.email || '',
                      phone: user?.phone || ''
                    });
                    setEditingProfile(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveProfile}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => setEditingProfile(false)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-gray-900 mb-4">Personal Details</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Full Name</label>
                      {editingProfile ? (
                        <input
                          type="text"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                          className="w-full px-3 py-2 border rounded-xl mt-1"
                        />
                      ) : (
                        <p className="font-semibold text-gray-900">{user?.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Email Address</label>
                      {editingProfile ? (
                        <input
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                          className="w-full px-3 py-2 border rounded-xl mt-1"
                        />
                      ) : (
                        <p className="font-semibold text-gray-900">{user?.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Phone Number</label>
                      {editingProfile ? (
                        <input
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                          className="w-full px-3 py-2 border rounded-xl mt-1"
                        />
                      ) : (
                        <p className="font-semibold text-gray-900">{user?.phone || 'Not set'}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 mb-4">Account Information</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Patient Identifier</label>
                      <p className="font-mono text-xs bg-gray-100 p-2 rounded-lg text-gray-700">{user?.id}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Registration Date</label>
                      <p className="font-medium text-gray-800">{user?.registrationDate || '2024-01-10'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t flex justify-between">
                <button
                  onClick={logout}
                  className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Account</span>
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in max-w-md w-full px-4">
          <div className={`p-4 rounded-2xl shadow-xl border flex items-start justify-between space-x-3 text-sm font-medium ${
            toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-700' :
            toast.type === 'error' ? 'bg-red-600 text-white border-red-700' :
            'bg-blue-600 text-white border-blue-700'
          }`}>
            <div className="flex items-center space-x-2">
              {toast.type === 'success' && <CheckCircle className="h-5 w-5 shrink-0" />}
              {toast.type === 'error' && <XCircle className="h-5 w-5 shrink-0" />}
              {toast.type === 'info' && <Bell className="h-5 w-5 shrink-0" />}
              <span>{toast.text}</span>
            </div>
            <button onClick={() => setToast(null)} className="p-1 hover:bg-white/20 rounded-lg">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 text-white p-2 rounded-xl">
                <Stethoscope className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg text-gray-900">WIZARDS Health Care</span>
            </div>

            <div className="flex items-center space-x-4">
              <LanguageSelector />
              <button 
                onClick={() => setActiveTab('notifications')}
                className="relative p-2 text-gray-500 hover:text-blue-600 rounded-xl hover:bg-gray-100"
              >
                <Bell className="h-5 w-5" />
                {patientNotifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {patientNotifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>
              <div className="flex items-center space-x-2 border-l pl-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  {user?.name?.[0]?.toUpperCase() || 'P'}
                </div>
                <span className="text-xs font-bold text-gray-800 hidden sm:inline">{user?.name}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-6 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </main>

      {/* BOOKING APPOINTMENT MODAL */}
      {showBookingForm && selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5 animate-scale-in my-8">
            <div className="flex justify-between items-start border-b pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Book Appointment</h3>
                  <p className="text-xs font-semibold text-blue-600">Dr. {selectedDoctor.name} ({selectedDoctor.specialization})</p>
                </div>
              </div>
              <button
                onClick={() => setShowBookingForm(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Doctor & Hospital overview */}
            <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 text-xs space-y-1">
              <p><span className="font-semibold text-gray-700">Hospital:</span> {selectedDoctor.hospitalName || hospitals.find(h => h.id === selectedDoctor.hospitalId)?.name || 'Speciality Medical Center'}</p>
              <p><span className="font-semibold text-gray-700">Consultation Fee:</span> ₹{selectedDoctor.consultationFee}</p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Date selection */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Select Consultation Date *</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingForm.date}
                  onChange={(e) => setBookingForm({...bookingForm, date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Time slot selection */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">Select Time Slot *</label>
                <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
                  {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'].map((slot) => {
                    const isAvailable = availableSlotsList.includes(slot);
                    const isSelected = bookingForm.time === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setBookingForm({...bookingForm, time: slot})}
                        className={`py-2 px-1 rounded-lg text-xs font-semibold text-center transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : isAvailable
                            ? 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-blue-50'
                            : 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Consultation Type */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Consultation Type</label>
                <select
                  value={bookingForm.type}
                  onChange={(e) => setBookingForm({...bookingForm, type: e.target.value})}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="General Consultation">General Consultation</option>
                  <option value="Specialist Follow-up">Specialist Follow-up</option>
                  <option value="Diagnostic Review">Diagnostic Review</option>
                  <option value="Routine Health Check">Routine Health Check</option>
                </select>
              </div>

              {/* Symptoms / Reason */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Symptoms or Reason for Visit</label>
                <textarea
                  value={bookingForm.symptoms}
                  onChange={(e) => setBookingForm({...bookingForm, symptoms: e.target.value})}
                  rows={2}
                  placeholder="Describe what you are experiencing..."
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Family member booking toggle */}
              <div className="bg-gray-50 p-3 rounded-xl border space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bookingForm.isForFamily}
                    onChange={(e) => setBookingForm({...bookingForm, isForFamily: e.target.checked})}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-gray-800">Booking for a Family Member?</span>
                </label>

                {bookingForm.isForFamily && (
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Family Member Name *"
                        value={bookingForm.familyMemberName}
                        onChange={(e) => setBookingForm({...bookingForm, familyMemberName: e.target.value})}
                        className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Relation (e.g. Father)"
                        value={bookingForm.familyMemberRelation}
                        onChange={(e) => setBookingForm({...bookingForm, familyMemberRelation: e.target.value})}
                        className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t">
              <button
                onClick={handleSubmitBooking}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-sm shadow transition-all"
              >
                Confirm & Book Appointment (₹{selectedDoctor.consultationFee})
              </button>
              <button
                onClick={() => setShowBookingForm(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2.5 rounded-xl font-semibold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Appointment Confirmation Modal */}
      {cancelModal && cancelModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full space-y-4 animate-scale-in">
            <h3 className="text-lg font-bold text-red-600 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Cancel Appointment
            </h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to cancel your appointment with <strong className="font-semibold text-gray-900">Dr. {cancelModal.doctorName}</strong> scheduled for <strong className="font-semibold text-gray-900">{cancelModal.date}</strong>?
            </p>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={confirmCancelAppointment}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-sm font-bold shadow"
              >
                Yes, Cancel Appointment
              </button>
              <button
                onClick={() => setCancelModal(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-xl text-sm font-semibold"
              >
                Keep Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blood Search Modal */}
      {showBloodSearch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <Droplet className="h-5 w-5 mr-2 text-red-500" />
              Check Blood Bank Availability
            </h3>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Select Blood Group</label>
              <select
                value={bloodSearchType}
                onChange={(e) => setBloodSearchType(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm"
              >
                <option value="">Choose Blood Type</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={handleBloodSearch}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-xl text-sm font-bold"
              >
                Search Blood Units
              </button>
              <button
                onClick={() => setShowBloodSearch(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-red-600 flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Delete Account
            </h3>
            <p className="text-xs text-gray-600">
              Are you sure you want to delete your account? All your medical files and appointments will be permanently removed.
            </p>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={handleDeleteAccount}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-sm font-bold"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-xl text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
