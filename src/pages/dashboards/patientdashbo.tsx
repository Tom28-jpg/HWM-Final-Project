import React, { useState, useEffect } from 'react';
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
  Shield
} from 'lucide-react';

const PatientDashboard: React.FC = () => {
  const { user, logout, updateUser, deleteAccount } = useAuth();
  const { t } = useLanguage();
  const { 
    hospitals,
    doctors,
    patients,
    addPatient,
    updatePatient,
    appointments,
    addAppointment,
    getAppointmentsByPatient,
    notifications,
    markNotificationRead,
    getNotificationsByUser,
    searchDoctors,
    searchHospitals,
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
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [searchFilters, setSearchFilters] = useState({
    specialization: '',
    location: ''
  });
  const [bloodSearchType, setBloodSearchType] = useState('');

  // Find or create current patient
  const currentPatient = patients.find(p => p.email === user?.email);
  const [patientProfile, setPatientProfile] = useState(currentPatient || {
    id: '',
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
    date: '',
    time: '',
    type: 'consultation',
    symptoms: '',
    isForFamily: false,
    familyMemberName: '',
    familyMemberAge: 0,
    familyMemberRelation: ''
  });

  // Load uploaded files from localStorage on component mount
  useEffect(() => {
    const savedFiles = localStorage.getItem(`medical_files_${user?.id}`);
    if (savedFiles) {
      setUploadedFiles(JSON.parse(savedFiles));
    }
  }, [user?.id]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: any[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB

    Array.from(files).forEach((file) => {
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
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
          alert(`${newFiles.length} file(s) uploaded successfully!`);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset the input
    event.target.value = '';
  };

  const handleViewFile = (file: any) => {
    if (file.type.includes('image')) {
      // Create a new window to display the image
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
    } else if (file.type.includes('pdf')) {
      // Open PDF in new tab
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>${file.name}</title></head>
            <body style="margin:0;">
              <embed src="${file.data}" type="application/pdf" width="100%" height="100%">
            </body>
          </html>
        `);
      }
    } else {
      // For other file types, create a download link
      const link = document.createElement('a');
      link.href = file.data;
      link.download = file.name;
      link.click();
    }
  };

  const handleDeleteFile = (index: number) => {
    if (confirm('Are you sure you want to delete this file?')) {
      const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
      setUploadedFiles(updatedFiles);
      localStorage.setItem(`medical_files_${user?.id}`, JSON.stringify(updatedFiles));
      alert('File deleted successfully!');
    }
  };

  const tabs = [
    { id: 'home', label: t('home'), icon: Home },
    { id: 'appointments', label: t('appointments'), icon: Calendar },
    { id: 'hospitals', label: t('hospital') + 's', icon: Building2 },
    { id: 'doctors', label: t('findDoctor'), icon: Stethoscope },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: t('profile'), icon: User },
  ];

  const handleSymptomCheck = () => {
    if (!symptoms.trim()) return;
    
    // Mock AI response
    const mockResponse = {
      symptoms: symptoms,
      possibleConditions: ['Common Cold', 'Seasonal Allergies', 'Viral Infection'],
      recommendations: [
        'Get plenty of rest',
        'Stay hydrated',
        'Consider seeing a doctor if symptoms persist',
      ],
      urgency: 'Low',
    };
    
    alert(`AI Analysis: Based on your symptoms "${symptoms}", possible conditions include ${mockResponse.possibleConditions.join(', ')}. Recommendations: ${mockResponse.recommendations.join(', ')}`);
  };

  const handleEmergencyCall = () => {
    // Mock location sharing and emergency call
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        alert(`Emergency services contacted! Your location (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) has been shared with the nearest ambulance.`);
      });
    } else {
      alert('Emergency services contacted! Please provide your location to the operator.');
    }
  };

  const handleSaveProfile = () => {
    updateUser(profileForm);
    if (currentPatient) {
      updatePatient(currentPatient.id, { ...patientProfile, ...profileForm });
    } else {
      addPatient({ ...patientProfile, ...profileForm });
    }
    setEditingProfile(false);
  };

  const handleDeleteAccount = async () => {
    if (user) {
      const result = await deleteAccount(user.id);
      if (result.success) {
        alert('Account deleted successfully');
      } else {
        alert(result.message || 'Failed to delete account');
      }
    }
    setShowDeleteModal(false);
  };

  const handleBookAppointment = (doctor: any) => {
    setSelectedDoctor(doctor);
    setShowBookingForm(true);
  };

  const handleSubmitBooking = () => {
    if (!selectedDoctor || !bookingForm.date || !bookingForm.time) return;

    // Check if time slot is available
    const availableSlots = getAvailableSlots(selectedDoctor.id, bookingForm.date);
    if (!availableSlots.includes(bookingForm.time)) {
      alert('This time is already taken, please select another timing');
      return;
    }

    const patientName = bookingForm.isForFamily ? bookingForm.familyMemberName : (currentPatient?.name || user?.name || '');
    
    const appointment = {
      patientId: currentPatient?.id || user?.id || '',
      doctorId: selectedDoctor.id,
      hospitalId: selectedDoctor.hospitalId,
      patientName,
      doctorName: selectedDoctor.name,
      hospitalName: selectedDoctor.hospitalName || '',
      date: bookingForm.date,
      time: bookingForm.time,
      type: bookingForm.type,
      status: 'pending' as const,
      symptoms: bookingForm.symptoms,
      isForFamily: bookingForm.isForFamily,
      familyMemberName: bookingForm.familyMemberName,
      familyMemberAge: bookingForm.familyMemberAge,
      familyMemberRelation: bookingForm.familyMemberRelation
    };

    addAppointment(appointment);
    setShowBookingForm(false);
    setBookingForm({ 
      date: '', 
      time: '', 
      type: 'consultation', 
      symptoms: '',
      isForFamily: false,
      familyMemberName: '',
      familyMemberAge: 0,
      familyMemberRelation: ''
    });
    alert('Appointment request sent! You will be notified once confirmed.');
  };

  const handleBloodSearch = () => {
    if (!bloodSearchType) return;

    // Mock user location for demo
    const userLocation = { latitude: 12.9716, longitude: 77.5946 }; // Bangalore coordinates
    
    const results = searchBloodAvailability(bloodSearchType, userLocation);
    
    if (results.length === 0) {
      alert(`No ${bloodSearchType} blood available in nearby hospitals.`);
    } else {
      const resultText = results.map((result, index) => 
        `${index + 1}. ${result.hospital.name} - ${result.units} units available${result.distance ? ` (${result.distance.toFixed(1)} km away)` : ''}`
      ).join('\n');
      
      alert(`${bloodSearchType} Blood Availability:\n\n${resultText}`);
    }
  };

  // Get patient's appointments and notifications
  const patientAppointments = getAppointmentsByPatient(currentPatient?.id || user?.id || '');
  const patientNotifications = getNotificationsByUser(currentPatient?.id || user?.id || '');

  // Search doctors based on filters with location priority
  const allHospitals = hospitals.filter(h => h.name && h.address); // Only show hospitals with basic info
  const filteredHospitals = allHospitals.filter(hospital => {
    if (searchFilters.location && !hospital.address.toLowerCase().includes(searchFilters.location.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Also get search results from the search function
  const searchResults = searchHospitals({
    ...searchFilters,
    available: true,
    location: { latitude: 12.9716, longitude: 77.5946 } // Mock user location
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-xl transform transition-all duration-300 hover:scale-105">
              <h2 className="text-2xl font-bold mb-2">Welcome, {user?.name}!</h2>
              <p className="opacity-90">How are you feeling today?</p>
              <p className="text-sm opacity-75 mt-1">ID: {user?.id}</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button 
                onClick={handleEmergencyCall}
                className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-lg flex items-center justify-center space-x-2 transition-all duration-300 transform hover:scale-105"
              >
                <Phone className="h-5 w-5" />
                <span>Emergency</span>
              </button>
              <button 
                onClick={() => setActiveTab('doctors')}
                className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-lg flex items-center justify-center space-x-2 transition-all duration-300 transform hover:scale-105"
              >
                <Calendar className="h-5 w-5" />
                <span>Book Appointment</span>
              </button>
              <button 
                onClick={() => setActiveTab('hospitals')}
                className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex items-center justify-center space-x-2 transition-all duration-300 transform hover:scale-105"
              >
                <Building2 className="h-5 w-5" />
                <span>Find Hospital</span>
              </button>
              <button 
                onClick={() => setShowBloodSearch(true)}
                className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-lg flex items-center justify-center space-x-2 transition-all duration-300 transform hover:scale-105"
              >
                <Droplet className="h-5 w-5" />
                <span>Blood Search</span>
              </button>
            </div>

            {/* Symptom Checker */}
            <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
                AI Symptom Checker
              </h3>
              <p className="text-sm text-gray-600 mb-4">Total hospitals found: {filteredHospitals.length}</p>
              <div className="space-y-4">
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-300"
                  rows={3}
                  placeholder="Describe your symptoms (e.g., headache, fever, cough...)"
                />
                <button
                  onClick={handleSymptomCheck}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  Analyze Symptoms
                </button>
              </div>
            </div>

            {/* Medical Files Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-500" />
                  Medical Files & Documents
                </h4>
                <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center space-x-2 transition-all duration-300 transform hover:scale-105">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Upload Files</span>
                </label>
              </div>
              
              <div className="text-sm text-gray-600 mb-4">
                <p>Upload medical reports, prescriptions, lab results, X-rays, and other medical documents.</p>
                <p className="mt-1">Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB per file)</p>
              </div>

              {/* Uploaded Files List */}
              <div className="space-y-3">
                {uploadedFiles.length > 0 ? (
                  uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border transition-all duration-300 hover:bg-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          {file.type.includes('pdf') ? (
                            <FileText className="h-5 w-5 text-red-600" />
                          ) : file.type.includes('image') ? (
                            <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <FileText className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB • Uploaded {file.uploadDate}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewFile(file)}
                          className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-all duration-300"
                          title="View file"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteFile(index)}
                          className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-all duration-300"
                          title="Delete file"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No medical files uploaded yet</p>
                    <p className="text-sm">Upload your medical documents to keep them organized</p>
                  </div>
                )}
              </div>
            </div>
            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {patientAppointments.slice(0, 3).map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg transition-all duration-300 hover:bg-gray-100">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <span>Appointment with Dr. {appointment.doctorName}</span>
                    </div>
                    <span className="text-sm text-gray-500">{appointment.date}</span>
                  </div>
                ))}
                {patientAppointments.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                )}
              </div>
            </div>

            {/* Blood Search Modal */}
            {showBloodSearch && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
                  <h3 className="text-lg font-semibold mb-4">Search Blood Availability</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
                      <select
                        value={bloodSearchType}
                        onChange={(e) => setBloodSearchType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Blood Type</option>
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
                  </div>
                  <div className="flex space-x-2 mt-6">
                    <button
                      onClick={handleBloodSearch}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors"
                    >
                      Search
                    </button>
                    <button
                      onClick={() => setShowBloodSearch(false)}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'hospitals':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Hospitals</h2>
              <div className="flex space-x-4">
                <input
                  type="text"
                  placeholder="Search by location..."
                  value={searchFilters.location}
                  onChange={(e) => setSearchFilters({...searchFilters, location: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHospitals.map((hospital) => {
                const hospitalDoctors = doctors.filter(doc => doc.hospitalId === hospital.id);
                const hospitalBloodInventory = getBloodInventoryByHospital(hospital.id);
                
                return (
                  <div key={hospital.id} className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:shadow-lg hover:scale-105">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-lg">{hospital.name}</h4>
                        <p className="text-gray-600 flex items-center mt-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          {hospital.address}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Phone: {hospital.phone || 'Not available'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Email: {hospital.email || 'Not available'}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-sm text-gray-700 mb-2">Bed Availability</h5>
                          <div className="text-sm text-gray-600 space-y-2">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span>ICU:</span>
                                <span className="font-semibold text-red-600">
                                  {hospital.availableIcuBeds}/{hospital.icuBeds}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-red-600 h-1.5 rounded-full"
                                  style={{ width: `${Math.round(((hospital.icuBeds - hospital.availableIcuBeds) / hospital.icuBeds) * 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span>Emergency:</span>
                                <span className="font-semibold text-orange-600">
                                  {hospital.availableEmergencyBeds}/{hospital.emergencyBeds}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-orange-600 h-1.5 rounded-full"
                                  style={{ width: `${Math.round(((hospital.emergencyBeds - hospital.availableEmergencyBeds) / hospital.emergencyBeds) * 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span>General:</span>
                                <span className="font-semibold text-blue-600">
                                  {hospital.availableGeneralBeds || 0}/{hospital.generalBeds || 0}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-blue-600 h-1.5 rounded-full"
                                  style={{ width: `${hospital.generalBeds ? Math.round(((hospital.generalBeds - (hospital.availableGeneralBeds || 0)) / hospital.generalBeds) * 100) : 0}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-sm text-gray-700 mb-2">Blood Bank</h5>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            {Object.entries(hospitalBloodInventory).slice(0, 4).map(([type, data]) => (
                              <div key={type} className="flex justify-between">
                                <span>{type}:</span>
                                <span className={`font-semibold ${
                                  data.units > 10 ? 'text-green-600' :
                                  data.units > 5 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {data.units}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-sm text-gray-700 mb-2">Available Doctors ({hospitalDoctors.length})</h5>
                        <div className="space-y-1">
                          {hospitalDoctors.slice(0, 3).map((doctor) => (
                            <div key={doctor.id} className="flex items-center justify-between text-xs">
                              <span>Dr. {doctor.name}</span>
                              <span className="text-gray-500">{doctor.specialization}</span>
                            </div>
                          ))}
                          {hospitalDoctors.length > 3 && (
                            <p className="text-xs text-gray-500">+{hospitalDoctors.length - 3} more doctors</p>
                          )}
                          {hospitalDoctors.length === 0 && (
                            <p className="text-xs text-gray-500">No doctors available</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t">
                        <div className="flex items-center space-x-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm text-gray-600">{hospital.rating || 'N/A'}</span>
                        </div>
                        <button
                          onClick={() => setActiveTab('doctors')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-all duration-300 transform hover:scale-105"
                        >
                          View Doctors
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredHospitals.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hospitals found matching your criteria</p>
              </div>
            )}
          </div>
        );

      case 'doctors':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Find Doctors</h2>
              <div className="flex space-x-4">
                <input
                  type="text"
                  placeholder="Search by name, phone, or ID..."
                  value={searchFilters.specialization}
                  onChange={(e) => setSearchFilters({...searchFilters, specialization: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={searchFilters.location}
                  onChange={(e) => setSearchFilters({...searchFilters, location: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Specializations</option>
                  <option value="General Medicine">General Medicine</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Surgery">Surgery</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Psychiatry">Psychiatry</option>
                  <option value="Gynecology">Gynecology</option>
                  <option value="Ophthalmology">Ophthalmology</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors
                .filter(doctor => {
                  const searchTerm = searchFilters.specialization.toLowerCase();
                  const specializationFilter = searchFilters.location;
                  
                  const matchesSearch = !searchTerm || 
                    doctor.name.toLowerCase().includes(searchTerm) ||
                    doctor.phone.includes(searchTerm) ||
                    doctor.userId.toLowerCase().includes(searchTerm) ||
                    doctor.email.toLowerCase().includes(searchTerm);
                  
                  const matchesSpecialization = !specializationFilter || 
                    doctor.specialization === specializationFilter;
                  
                  return matchesSearch && matchesSpecialization && doctor.isActive;
                })
                .map((doctor) => (
                  <div key={doctor.id} className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:shadow-lg hover:scale-105">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <Stethoscope className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">Dr. {doctor.name}</h4>
                        <p className="text-gray-600">{doctor.specialization}</p>
                        <div className="flex items-center space-x-1 mt-1">
                          <div className={`w-2 h-2 rounded-full ${doctor.isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-xs text-gray-500">{doctor.isAvailable ? 'Available' : 'Unavailable'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p><span className="font-medium">Hospital:</span> {doctor.hospitalName || 'Not specified'}</p>
                      <p><span className="font-medium">Experience:</span> {doctor.experienceYears} years</p>
                      <p><span className="font-medium">Consultation Fee:</span> ₹{doctor.consultationFee}</p>
                      <p><span className="font-medium">Phone:</span> {doctor.phone}</p>
                      <p><span className="font-medium">Doctor ID:</span> {doctor.userId}</p>
                      <p><span className="font-medium">License:</span> {doctor.licenseNo}</p>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">{doctor.rating}</span>
                        <span className="text-xs text-gray-500">({doctor.totalPatients} patients)</span>
                      </div>
                      <button
                        onClick={() => handleBookAppointment(doctor)}
                        disabled={!doctor.isAvailable}
                        className={`px-4 py-2 rounded-lg text-sm transition-all duration-300 transform hover:scale-105 ${
                          doctor.isAvailable
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {doctor.isAvailable ? 'Book Appointment' : 'Unavailable'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {doctors.filter(doctor => {
              const searchTerm = searchFilters.specialization.toLowerCase();
              const specializationFilter = searchFilters.location;
              
              const matchesSearch = !searchTerm || 
                doctor.name.toLowerCase().includes(searchTerm) ||
                doctor.phone.includes(searchTerm) ||
                doctor.userId.toLowerCase().includes(searchTerm) ||
                doctor.email.toLowerCase().includes(searchTerm);
              
              const matchesSpecialization = !specializationFilter || 
                doctor.specialization === specializationFilter;
              
              return matchesSearch && matchesSpecialization && doctor.isActive;
            }).length === 0 && (
              <div className="text-center py-12">
                <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No doctors found matching your criteria</p>
              </div>
            )}
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Profile</h2>
              {!editingProfile ? (
                <button
                  onClick={() => {
                    setProfileForm({
                      name: user?.name || '',
                      email: user?.email || '',
                      phone: user?.phone || ''
                    });
                    setPatientProfile(currentPatient || patientProfile);
                    setEditingProfile(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 transform hover:scale-105"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Edit</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveProfile}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 transform hover:scale-105"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingProfile(false);
                      setProfileForm({
                        name: user?.name || '',
                        email: user?.email || '',
                        phone: user?.phone || ''
                      });
                      setPatientProfile(currentPatient || patientProfile);
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 transform hover:scale-105"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:shadow-lg">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-10 w-10 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{user?.name}</h3>
                  <p className="text-gray-600">{user?.email}</p>
                  <p className="text-sm text-gray-500 font-mono">{user?.id}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Personal Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      {editingProfile ? (
                        <input
                          type="text"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        />
                      ) : (
                        <p className="text-gray-900">{user?.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      {editingProfile ? (
                        <input
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        />
                      ) : (
                        <p className="text-gray-900">{user?.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      {editingProfile ? (
                        <input
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        />
                      ) : (
                        <p className="text-gray-900">{user?.phone}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                      {editingProfile ? (
                        <input
                          type="date"
                          value={patientProfile.dateOfBirth}
                          onChange={(e) => setPatientProfile({...patientProfile, dateOfBirth: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        />
                      ) : (
                        <p className="text-gray-900">{currentPatient?.dateOfBirth || 'Not set'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                      {editingProfile ? (
                        <select
                          value={patientProfile.bloodGroup}
                          onChange={(e) => setPatientProfile({...patientProfile, bloodGroup: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        >
                          <option value="">Select Blood Group</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      ) : (
                        <p className="text-gray-900">{currentPatient?.bloodGroup || 'Not set'}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Emergency Contact</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      {editingProfile ? (
                        <input
                          type="text"
                          value={patientProfile.emergencyContact.name}
                          onChange={(e) => setPatientProfile({
                            ...patientProfile, 
                            emergencyContact: {...patientProfile.emergencyContact, name: e.target.value}
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        />
                      ) : (
                        <p className="text-gray-900">{currentPatient?.emergencyContact?.name || 'Not set'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
                      {editingProfile ? (
                        <input
                          type="text"
                          value={patientProfile.emergencyContact.relation}
                          onChange={(e) => setPatientProfile({
                            ...patientProfile, 
                            emergencyContact: {...patientProfile.emergencyContact, relation: e.target.value}
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        />
                      ) : (
                        <p className="text-gray-900">{currentPatient?.emergencyContact?.relation || 'Not set'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      {editingProfile ? (
                        <input
                          type="tel"
                          value={patientProfile.emergencyContact.phone}
                          onChange={(e) => setPatientProfile({
                            ...patientProfile, 
                            emergencyContact: {...patientProfile.emergencyContact, phone: e.target.value}
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        />
                      ) : (
                        <p className="text-gray-900">{currentPatient?.emergencyContact?.phone || 'Not set'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t flex justify-between">
                <button 
                  onClick={logout}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 transform hover:scale-105"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
                
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 transform hover:scale-105"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Account</span>
                </button>
              </div>
            </div>
          </div>
        );

      // ... other cases remain the same but with added animation classes
      default:
        return (
          <div className="animate-fade-in">
            <p className="text-gray-500 text-center py-8">Content for {activeTab} tab</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Stethoscope className="h-6 w-6 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">WIZARDS Patient Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSelector />
              <div className="relative">
                <Bell className="h-6 w-6 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" />
                {patientNotifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {patientNotifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <User className="h-6 w-6 text-gray-400" />
                <span className="text-sm font-medium">{user?.name}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-4 border-b-2 text-sm font-medium transition-all duration-300 whitespace-nowrap transform hover:scale-105 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </main>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
            <h3 className="text-lg font-semibold mb-4 text-red-600 flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Delete Account
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={handleDeleteAccount}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors"
              >
                Delete Account
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default PatientDashboard;