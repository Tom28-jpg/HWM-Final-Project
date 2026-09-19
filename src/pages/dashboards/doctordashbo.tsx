import React, { useState } from 'react';
import { useAuth } from '../../contexts/authcontext';
import { useData } from '../../contexts/datacontext';
import { useLanguage } from '../../contexts/languagecontext';
import LanguageSelector from '../../components/languageselector';
import {
  Stethoscope,
  Calendar,
  Users,
  Building2,
  Bell,
  User,
  Clock,
  Phone,
  MessageCircle,
  FileText,
  Activity,
  LogOut,
  CheckCircle,
  XCircle,
  Edit3,
  Save,
  X,
  Trash2,
  Shield,
  Bed,
  Droplet,
  Plus,
  Minus
} from 'lucide-react';

const DoctorDashboard: React.FC = () => {
  const { user, logout, deleteAccount } = useAuth();
  const { t } = useLanguage();
  const {
    hospitals,
    doctors,
    updateDoctor,
    updateHospital,
    patients,
    bloodInventory,
    getBloodInventoryByHospital,
    appointments,
    updateAppointment,
    notifications,
    markNotificationRead
  } = useData();

  const [activeTab, setActiveTab] = useState('overview');
  const [availability, setAvailability] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBloodType, setSelectedBloodType] = useState('A+');

  const currentHospital = hospitals.find(h => h.id === currentDoctor?.hospitalId) || hospitals[0];
  const [bedCounts, setBedCounts] = useState({
    icu: currentHospital?.availableIcuBeds || 0,
    emergency: currentHospital?.availableEmergencyBeds || 0,
    general: currentHospital?.availableGeneralBeds || 0
  });

  // Find current doctor data
  const currentDoctor = doctors.find(doc => doc.email === user?.email);
  const [doctorProfile, setDoctorProfile] = useState(currentDoctor || {
    id: '',
    userId: '',
    hospitalId: '',
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    licenseNo: '',
    specialization: '',
    experienceYears: 0,
    consultationFee: 0,
    isAvailable: true,
    isActive: true,
    rating: 5.0,
    totalPatients: 0,
  });

  const tabs = [
    { id: 'overview', label: t('overview'), icon: Activity },
    { id: 'appointments', label: t('appointments'), icon: Calendar },
    { id: 'patients', label: t('patients'), icon: Users },
    { id: 'hospital', label: t('hospitalInfo'), icon: Building2 },
    { id: 'profile', label: t('profile'), icon: User },
  ];

  const handleToggleAvailability = () => {
    const newAvailability = !availability;
    setAvailability(newAvailability);
    if (currentDoctor) {
      updateDoctor(currentDoctor.id, { isAvailable: newAvailability });
    }
  };

  const handleSaveProfile = () => {
    if (currentDoctor) {
      updateDoctor(currentDoctor.id, doctorProfile);
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

  const handleAppointmentUpdate = (appointmentId: string, status: string, notes?: string, prescription?: string) => {
    updateAppointment(appointmentId, { status, notes, prescription });
  };

  const handleBedCountChange = (type: 'icu' | 'emergency' | 'general', delta: number) => {
    const newCount = Math.max(0, bedCounts[type] + delta);
    const maxBeds = type === 'icu' ? currentHospital?.icuBeds :
                    type === 'emergency' ? currentHospital?.emergencyBeds :
                    currentHospital?.generalBeds || 0;

    if (newCount <= maxBeds) {
      setBedCounts(prev => ({ ...prev, [type]: newCount }));

      if (currentHospital) {
        const updateKey = type === 'icu' ? 'availableIcuBeds' :
                         type === 'emergency' ? 'availableEmergencyBeds' :
                         'availableGeneralBeds';
        updateHospital(currentHospital.id, { [updateKey]: newCount });
      }
    }
  };

  const getBedOccupancy = (type: 'icu' | 'emergency' | 'general') => {
    const total = type === 'icu' ? currentHospital?.icuBeds :
                  type === 'emergency' ? currentHospital?.emergencyBeds :
                  currentHospital?.generalBeds || 1;
    const available = bedCounts[type];
    const occupied = total - available;
    return Math.round((occupied / total) * 100);
  };

  // Get doctor's appointments
  const doctorAppointments = appointments.filter(apt => 
    currentDoctor && apt.doctorId === currentDoctor.id
  );

  // Get doctor's notifications
  const doctorNotifications = notifications.filter(n => 
    currentDoctor && n.userId === currentDoctor.id
  );

  // Get today's appointments
  const todayAppointments = doctorAppointments.filter(apt => 
    apt.date === new Date().toISOString().split('T')[0]
  );

  const getStats = () => {
    return {
      todayAppointments: todayAppointments.length,
      totalPatients: doctorAppointments.filter(apt => apt.status === 'completed').length,
      pendingReviews: doctorAppointments.filter(apt => apt.status === 'confirmed').length,
      availableBeds: hospitals[0]?.availableBeds || 0,
    };
  };

  const stats = getStats();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl transform transition-all duration-300 hover:scale-105">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{t('welcome')}, {user?.name}!</h2>
                  <p className="opacity-90">{hospitals[0]?.name || 'Hospital'} • {currentDoctor?.specialization || 'Doctor'}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${availability ? 'bg-green-300' : 'bg-red-300'}`}></div>
                    <span className="text-sm">{availability ? t('available') : t('unavailable')}</span>
                  </div>
                  <button
                    onClick={handleToggleAvailability}
                    className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition-all duration-300 transform hover:scale-105"
                  >
                    {t('toggleStatus')}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('todayAppointments')}</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.todayAppointments}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('totalPatients')}</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('pendingReviews')}</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingReviews}</p>
                  </div>
                  <FileText className="h-8 w-8 text-orange-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('availableBeds')}</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.availableBeds}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Bed Management */}
            <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Bed className="h-5 w-5 mr-2 text-blue-500" />
                {t('bedManagement')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* ICU Beds */}
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-red-900">{t('icuBeds')}</span>
                    <span className="text-xs text-red-700">{getBedOccupancy('icu')}% {t('occupied')}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => handleBedCountChange('icu', -1)}
                      className="p-2 bg-red-200 hover:bg-red-300 rounded-lg transition-colors"
                    >
                      <Minus className="h-4 w-4 text-red-900" />
                    </button>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-900">{bedCounts.icu}</div>
                      <div className="text-xs text-red-700">of {currentHospital?.icuBeds || 0}</div>
                    </div>
                    <button
                      onClick={() => handleBedCountChange('icu', 1)}
                      className="p-2 bg-red-200 hover:bg-red-300 rounded-lg transition-colors"
                    >
                      <Plus className="h-4 w-4 text-red-900" />
                    </button>
                  </div>
                  <div className="w-full bg-red-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getBedOccupancy('icu')}%` }}
                    ></div>
                  </div>
                </div>

                {/* Emergency Beds */}
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-orange-900">{t('emergencyBeds')}</span>
                    <span className="text-xs text-orange-700">{getBedOccupancy('emergency')}% {t('occupied')}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => handleBedCountChange('emergency', -1)}
                      className="p-2 bg-orange-200 hover:bg-orange-300 rounded-lg transition-colors"
                    >
                      <Minus className="h-4 w-4 text-orange-900" />
                    </button>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-900">{bedCounts.emergency}</div>
                      <div className="text-xs text-orange-700">of {currentHospital?.emergencyBeds || 0}</div>
                    </div>
                    <button
                      onClick={() => handleBedCountChange('emergency', 1)}
                      className="p-2 bg-orange-200 hover:bg-orange-300 rounded-lg transition-colors"
                    >
                      <Plus className="h-4 w-4 text-orange-900" />
                    </button>
                  </div>
                  <div className="w-full bg-orange-200 rounded-full h-2">
                    <div
                      className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getBedOccupancy('emergency')}%` }}
                    ></div>
                  </div>
                </div>

                {/* General Ward Beds */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-blue-900">{t('generalWard')}</span>
                    <span className="text-xs text-blue-700">{getBedOccupancy('general')}% {t('occupied')}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => handleBedCountChange('general', -1)}
                      className="p-2 bg-blue-200 hover:bg-blue-300 rounded-lg transition-colors"
                    >
                      <Minus className="h-4 w-4 text-blue-900" />
                    </button>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-900">{bedCounts.general}</div>
                      <div className="text-xs text-blue-700">of {currentHospital?.generalBeds || 0}</div>
                    </div>
                    <button
                      onClick={() => handleBedCountChange('general', 1)}
                      className="p-2 bg-blue-200 hover:bg-blue-300 rounded-lg transition-colors"
                    >
                      <Plus className="h-4 w-4 text-blue-900" />
                    </button>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getBedOccupancy('general')}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Blood Inventory Search */}
            <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Droplet className="h-5 w-5 mr-2 text-red-500" />
                {t('bloodInventory')}
              </h3>
              <div className="flex items-center space-x-4 mb-4">
                <label className="text-sm font-medium text-gray-700">{t('selectBloodType')}:</label>
                <select
                  value={selectedBloodType}
                  onChange={(e) => setSelectedBloodType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                >
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
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('availableUnits')}</p>
                    <p className="text-3xl font-bold text-red-900">
                      {currentHospital ? (getBloodInventoryByHospital(currentHospital.id)[selectedBloodType]?.units || 0) : 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('lastUpdated')}: {currentHospital ? (getBloodInventoryByHospital(currentHospital.id)[selectedBloodType]?.lastUpdated || 'N/A') : 'N/A'}
                    </p>
                  </div>
                  <Droplet className="h-16 w-16 text-red-500 opacity-20" />
                </div>
              </div>
            </div>

            {/* Today's Schedule */}
            <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-500" />
                {t('todaySchedule')}
              </h3>
              <div className="space-y-4">
                {todayAppointments.length > 0 ? (
                  todayAppointments.map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg transition-all duration-300 hover:bg-gray-100">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm font-medium">{appointment.time}</div>
                        <div>
                          <p className="font-medium">{appointment.patientName}</p>
                          <p className="text-sm text-gray-600">{appointment.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {appointment.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {appointment.status === 'confirmed' && <Clock className="h-5 w-5 text-orange-500" />}
                        {appointment.status === 'pending' && <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>}
                        <span className="text-sm capitalize text-gray-600">{appointment.status}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">{t('noAppointments')}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">{t('doctorProfile')}</h2>
              {!editingProfile ? (
                <button
                  onClick={() => {
                    setDoctorProfile(currentDoctor || doctorProfile);
                    setEditingProfile(true);
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 transform hover:scale-105"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>{t('edit')}</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveProfile}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 transform hover:scale-105"
                  >
                    <Save className="h-4 w-4" />
                    <span>{t('save')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingProfile(false);
                      setDoctorProfile(currentDoctor || doctorProfile);
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 transform hover:scale-105"
                  >
                    <X className="h-4 w-4" />
                    <span>{t('cancel')}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:shadow-lg">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <Stethoscope className="h-10 w-10 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{currentDoctor?.name || user?.name}</h3>
                  <p className="text-gray-600">{currentDoctor?.email || user?.email}</p>
                  <p className="text-sm text-gray-500">License: {currentDoctor?.licenseNo || 'Not set'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">{t('professionalInfo')}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('specialization')}</label>
                      {editingProfile ? (
                        <select
                          value={doctorProfile.specialization}
                          onChange={(e) => setDoctorProfile({...doctorProfile, specialization: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                        >
                          <option value="">{t('selectSpecialization')}</option>
                          <option value="General Medicine">{t('generalMedicine')}</option>
                          <option value="Cardiology">{t('cardiology')}</option>
                          <option value="Neurology">{t('neurology')}</option>
                          <option value="Orthopedics">{t('orthopedics')}</option>
                          <option value="Pediatrics">{t('pediatrics')}</option>
                          <option value="Surgery">{t('surgery')}</option>
                          <option value="Dermatology">{t('dermatology')}</option>
                          <option value="Psychiatry">{t('psychiatry')}</option>
                        </select>
                      ) : (
                        <p className="text-gray-900">{currentDoctor?.specialization || t('notSet')}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('experience')} ({t('years')})</label>
                      {editingProfile ? (
                        <input
                          type="number"
                          value={doctorProfile.experienceYears}
                          onChange={(e) => setDoctorProfile({...doctorProfile, experienceYears: parseInt(e.target.value) || 0})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                        />
                      ) : (
                        <p className="text-gray-900">{currentDoctor?.experienceYears || 0} {t('years')}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('consultationFee')}</label>
                      {editingProfile ? (
                        <input
                          type="number"
                          value={doctorProfile.consultationFee}
                          onChange={(e) => setDoctorProfile({...doctorProfile, consultationFee: parseInt(e.target.value) || 0})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                        />
                      ) : (
                        <p className="text-gray-900">₹{currentDoctor?.consultationFee || 0}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">{t('contactInfo')}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone')}</label>
                      {editingProfile ? (
                        <input
                          type="tel"
                          value={doctorProfile.phone}
                          onChange={(e) => setDoctorProfile({...doctorProfile, phone: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                        />
                      ) : (
                        <p className="text-gray-900">{currentDoctor?.phone || user?.phone || t('notSet')}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('hospital')}</label>
                      <p className="text-gray-900">{hospitals[0]?.name || t('notSet')}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('department')}</label>
                      <p className="text-gray-900">{currentDoctor?.specialization || t('notSet')}</p>
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
                  <span>{t('logout')}</span>
                </button>
                
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 transform hover:scale-105"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{t('deleteAccount')}</span>
                </button>
              </div>
            </div>
          </div>
        );

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
              <div className="bg-green-100 p-2 rounded-lg">
                <Stethoscope className="h-6 w-6 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">HWM Doctor Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSelector />
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${availability ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm">{availability ? t('available') : t('unavailable')}</span>
              </div>
              <div className="relative">
                <Bell className="h-6 w-6 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" />
                {doctorNotifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {doctorNotifications.filter(n => !n.isRead).length}
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
                      ? 'border-green-500 text-green-600'
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

export default DoctorDashboard;