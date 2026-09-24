import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Minus,
  Check
} from 'lucide-react';

const DoctorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, deleteAccount, updateUser } = useAuth();
  const { t } = useLanguage();
  const {
    hospitals,
    doctors,
    addDoctor,
    updateDoctor,
    deleteUserFromData,
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
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [selectedApptForNotes, setSelectedApptForNotes] = useState<any>(null);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [prescriptionText, setPrescriptionText] = useState('');

  // Find current doctor data
  const currentDoctor = doctors.find(doc => doc.email === user?.email || doc.id === user?.id || (doc as any).userId === user?.id);
  const currentHospital = hospitals.find(h => h.id === currentDoctor?.hospitalId) || hospitals[0];
  const [bedCounts, setBedCounts] = useState({
    icu: currentHospital?.availableIcuBeds || 0,
    emergency: currentHospital?.availableEmergencyBeds || 0,
    general: currentHospital?.availableGeneralBeds || 0
  });

  const [doctorProfile, setDoctorProfile] = useState({
    id: currentDoctor?.id || '',
    userId: currentDoctor?.userId || user?.id || '',
    hospitalId: currentDoctor?.hospitalId || hospitals[0]?.id || '',
    name: currentDoctor?.name || user?.name || '',
    email: currentDoctor?.email || user?.email || '',
    phone: currentDoctor?.phone || user?.phone || '',
    licenseNo: currentDoctor?.licenseNo || '',
    specialization: currentDoctor?.specialization || 'General Medicine',
    experienceYears: currentDoctor?.experienceYears || 0,
    consultationFee: currentDoctor?.consultationFee || 500,
    isAvailable: currentDoctor?.isAvailable ?? true,
    isActive: currentDoctor?.isActive ?? true,
    rating: currentDoctor?.rating || 5.0,
    totalPatients: currentDoctor?.totalPatients || 0,
  });

  useEffect(() => {
    if (currentDoctor && !editingProfile) {
      setDoctorProfile({
        id: currentDoctor.id,
        userId: currentDoctor.userId || user?.id || '',
        hospitalId: currentDoctor.hospitalId || hospitals[0]?.id || '',
        name: currentDoctor.name || user?.name || '',
        email: currentDoctor.email || user?.email || '',
        phone: currentDoctor.phone || user?.phone || '',
        licenseNo: currentDoctor.licenseNo || '',
        specialization: currentDoctor.specialization || 'General Medicine',
        experienceYears: currentDoctor.experienceYears || 0,
        consultationFee: currentDoctor.consultationFee || 500,
        isAvailable: currentDoctor.isAvailable ?? true,
        isActive: currentDoctor.isActive ?? true,
        rating: currentDoctor.rating || 5.0,
        totalPatients: currentDoctor.totalPatients || 0,
      });
      setAvailability(currentDoctor.isAvailable);
    }
  }, [currentDoctor, user, editingProfile, hospitals]);

  useEffect(() => {
    if (currentHospital) {
      setBedCounts({
        icu: currentHospital.availableIcuBeds || 0,
        emergency: currentHospital.availableEmergencyBeds || 0,
        general: currentHospital.availableGeneralBeds || 0
      });
    }
  }, [currentHospital]);

  const tabs = [
    { id: 'overview', label: t('overview') || 'Overview', icon: Activity },
    { id: 'appointments', label: t('appointments') || 'Appointments', icon: Calendar },
    { id: 'patients', label: t('patients') || 'Patients', icon: Users },
    { id: 'hospital', label: t('hospitalInfo') || 'Hospital & Beds', icon: Building2 },
    { id: 'profile', label: t('profile') || 'Doctor Profile', icon: User },
  ];

  const handleToggleAvailability = () => {
    const newAvailability = !availability;
    setAvailability(newAvailability);
    if (currentDoctor) {
      updateDoctor(currentDoctor.id, { isAvailable: newAvailability });
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateUser({
        name: doctorProfile.name.trim(),
        email: doctorProfile.email.trim(),
        phone: doctorProfile.phone.trim(),
      });

      if (currentDoctor) {
        updateDoctor(currentDoctor.id, {
          ...doctorProfile,
          name: doctorProfile.name.trim(),
          email: doctorProfile.email.trim(),
          phone: doctorProfile.phone.trim(),
        });
      } else {
        addDoctor({
          ...doctorProfile,
          name: doctorProfile.name.trim(),
          email: doctorProfile.email.trim(),
          phone: doctorProfile.phone.trim(),
        });
      }

      setEditingProfile(false);
      alert('Doctor profile updated in database successfully!');
    } catch (err) {
      console.error('Error saving doctor profile:', err);
      alert('Failed to save profile changes. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (user) {
      await deleteUserFromData(user.id, user.email);
      const result = await deleteAccount(user.id);
      if (result.success) {
        alert('Account deleted successfully');
        navigate('/');
      } else {
        alert(result.message || 'Failed to delete account');
      }
    }
    setShowDeleteModal(false);
  };

  const handleAppointmentStatus = (appointmentId: string, status: 'confirmed' | 'completed' | 'cancelled') => {
    updateAppointment(appointmentId, { status });
    alert(`Appointment status updated to ${status}.`);
  };

  const handleSaveClinicalNotes = () => {
    if (!selectedApptForNotes) return;
    updateAppointment(selectedApptForNotes.id, {
      notes: clinicalNotes,
      prescription: prescriptionText,
      status: 'completed'
    });
    setSelectedApptForNotes(null);
    setClinicalNotes('');
    setPrescriptionText('');
    alert('Clinical notes & prescription updated. Consultation marked as completed.');
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

  // Doctor's appointments
  const doctorAppointments = appointments.filter(apt => 
    currentDoctor && (apt.doctorId === currentDoctor.id || apt.doctorId === user?.id)
  );

  const doctorNotifications = notifications.filter(n => 
    currentDoctor && (n.userId === currentDoctor.id || n.userId === user?.id)
  );

  const todayAppointments = doctorAppointments.filter(apt => 
    apt.date === new Date().toISOString().split('T')[0]
  );

  const stats = {
    todayAppointments: todayAppointments.length,
    totalPatients: doctorAppointments.filter(apt => apt.status === 'completed').length,
    pendingReviews: doctorAppointments.filter(apt => apt.status === 'pending' || apt.status === 'confirmed').length,
    availableBeds: currentHospital?.availableBeds || 0,
  };

  const filteredAppointments = doctorAppointments.filter(apt => {
    if (appointmentFilter === 'all') return true;
    return apt.status === appointmentFilter;
  });

  // Doctor's patient list
  const doctorPatientIds = new Set(doctorAppointments.map(a => a.patientId));
  const doctorPatientList = patients.filter(p => doctorPatientIds.has(p.id));

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-2xl shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{t('welcome') || 'Welcome'}, Dr. {user?.name}!</h2>
                  <p className="opacity-90 mt-1">{currentHospital?.name || 'Hospital'} • {currentDoctor?.specialization || 'Specialist'}</p>
                  <p className="text-xs opacity-75 mt-1 font-mono">Doctor ID: {user?.id}</p>
                </div>
                <div className="flex items-center space-x-3 bg-white/10 p-2.5 rounded-xl">
                  <div className={`w-3 h-3 rounded-full ${availability ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                  <span className="text-xs font-semibold">{availability ? 'Accepting Patients' : 'Doctor Unavailable'}</span>
                  <button
                    onClick={handleToggleAvailability}
                    className="bg-white text-emerald-800 hover:bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ml-2"
                  >
                    Toggle Status
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border">
                <p className="text-xs text-gray-500 font-semibold uppercase">Today's Consultations</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.todayAppointments}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border">
                <p className="text-xs text-gray-500 font-semibold uppercase">Completed Patients</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.totalPatients}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border">
                <p className="text-xs text-gray-500 font-semibold uppercase">Pending Schedule</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingReviews}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border">
                <p className="text-xs text-gray-500 font-semibold uppercase">Hospital Beds</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{currentHospital?.availableBeds || 0}</p>
              </div>
            </div>

            {/* Today's Schedule */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-emerald-600" />
                  Today's Schedule ({todayAppointments.length})
                </h3>
                <button
                  onClick={() => setActiveTab('appointments')}
                  className="text-emerald-700 font-bold text-xs hover:underline"
                >
                  Manage All Appointments
                </button>
              </div>

              <div className="space-y-3">
                {todayAppointments.length > 0 ? (
                  todayAppointments.map((appt) => (
                    <div key={appt.id} className="p-4 bg-gray-50 rounded-xl border flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="font-bold text-sm text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                          {appt.time}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{appt.patientName}</p>
                          <p className="text-xs text-gray-500">{appt.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          appt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          appt.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {appt.status}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedApptForNotes(appt);
                            setClinicalNotes(appt.notes || '');
                            setPrescriptionText(appt.prescription || '');
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-xs font-semibold"
                        >
                          Review / Prescribe
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-6 text-sm">No appointments scheduled for today.</p>
                )}
              </div>
            </div>

            {/* Bed Management Widget */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Bed className="h-5 w-5 mr-2 text-blue-600" />
                {currentHospital?.name} - Quick Bed Controls
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-center">
                  <span className="text-xs font-bold text-red-900">ICU BEDS</span>
                  <div className="flex items-center justify-center space-x-3 my-2">
                    <button onClick={() => handleBedCountChange('icu', -1)} className="p-1 bg-red-200 hover:bg-red-300 rounded"><Minus className="h-4 w-4 text-red-900" /></button>
                    <span className="text-2xl font-bold text-red-900">{bedCounts.icu}</span>
                    <button onClick={() => handleBedCountChange('icu', 1)} className="p-1 bg-red-200 hover:bg-red-300 rounded"><Plus className="h-4 w-4 text-red-900" /></button>
                  </div>
                  <p className="text-[10px] text-red-700">of {currentHospital?.icuBeds || 0} total beds</p>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-center">
                  <span className="text-xs font-bold text-amber-900">EMERGENCY BEDS</span>
                  <div className="flex items-center justify-center space-x-3 my-2">
                    <button onClick={() => handleBedCountChange('emergency', -1)} className="p-1 bg-amber-200 hover:bg-amber-300 rounded"><Minus className="h-4 w-4 text-amber-900" /></button>
                    <span className="text-2xl font-bold text-amber-900">{bedCounts.emergency}</span>
                    <button onClick={() => handleBedCountChange('emergency', 1)} className="p-1 bg-amber-200 hover:bg-amber-300 rounded"><Plus className="h-4 w-4 text-amber-900" /></button>
                  </div>
                  <p className="text-[10px] text-amber-700">of {currentHospital?.emergencyBeds || 0} total beds</p>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                  <span className="text-xs font-bold text-blue-900">GENERAL WARD</span>
                  <div className="flex items-center justify-center space-x-3 my-2">
                    <button onClick={() => handleBedCountChange('general', -1)} className="p-1 bg-blue-200 hover:bg-blue-300 rounded"><Minus className="h-4 w-4 text-blue-900" /></button>
                    <span className="text-2xl font-bold text-blue-900">{bedCounts.general}</span>
                    <button onClick={() => handleBedCountChange('general', 1)} className="p-1 bg-blue-200 hover:bg-blue-300 rounded"><Plus className="h-4 w-4 text-blue-900" /></button>
                  </div>
                  <p className="text-[10px] text-blue-700">of {currentHospital?.generalBeds || 0} total beds</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'appointments':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Consultation Appointments</h2>
                <p className="text-sm text-gray-600 mt-1">Review scheduled patient visits, update status, and add prescriptions</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-2 overflow-x-auto pb-1">
              {(['all', 'confirmed', 'pending', 'completed', 'cancelled'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setAppointmentFilter(filter)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                    appointmentFilter === filter
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border'
                  }`}
                >
                  {filter} ({filter === 'all' ? doctorAppointments.length : doctorAppointments.filter(a => a.status === filter).length})
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((appt) => (
                  <div key={appt.id} className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-lg font-bold text-gray-900">{appt.patientName}</h4>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase ${
                          appt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          appt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          appt.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {appt.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium">Type: {appt.type}</p>
                      {appt.isForFamily && (
                        <p className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-semibold inline-block">
                          Family Member: {appt.familyMemberName} ({appt.familyMemberRelation || 'Relation'})
                        </p>
                      )}
                      {appt.symptoms && (
                        <p className="text-xs text-gray-600"><span className="font-semibold">Symptoms:</span> {appt.symptoms}</p>
                      )}
                      {appt.prescription && (
                        <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded"><span className="font-semibold">Prescription:</span> {appt.prescription}</p>
                      )}
                    </div>

                    <div className="flex flex-col md:items-end justify-between space-y-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{appt.date}</p>
                        <p className="text-xs text-gray-500 flex items-center md:justify-end">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          {appt.time}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {appt.status === 'pending' && (
                          <button
                            onClick={() => handleAppointmentStatus(appt.id, 'confirmed')}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                          >
                            Accept
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedApptForNotes(appt);
                            setClinicalNotes(appt.notes || '');
                            setPrescriptionText(appt.prescription || '');
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                        >
                          Notes & Rx
                        </button>
                        {appt.status !== 'cancelled' && (
                          <button
                            onClick={() => handleAppointmentStatus(appt.id, 'cancelled')}
                            className="text-red-600 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white p-12 rounded-2xl shadow-sm border text-center text-gray-500">
                  <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-medium">No appointments matching this filter.</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'patients':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h2 className="text-2xl font-bold text-gray-900">My Patients ({doctorPatientList.length})</h2>
              <p className="text-sm text-gray-600 mt-1">Directory of registered patients under your care</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctorPatientList.length > 0 ? (
                doctorPatientList.map((pat) => (
                  <div key={pat.id} className="bg-white p-5 rounded-2xl shadow-sm border space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                        {pat.name?.[0] || 'P'}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{pat.name}</h4>
                        <p className="text-xs text-gray-500 font-mono">{pat.id}</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1 pt-2 border-t">
                      <p><span className="font-semibold">Email:</span> {pat.email}</p>
                      <p><span className="font-semibold">Phone:</span> {pat.phone}</p>
                      <p><span className="font-semibold">Blood Group:</span> {pat.bloodGroup || 'O+'}</p>
                      {pat.emergencyContact?.name && (
                        <p><span className="font-semibold">Emergency:</span> {pat.emergencyContact.name} ({pat.emergencyContact.phone})</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 bg-white p-12 rounded-2xl shadow-sm border text-center text-gray-500">
                  <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm">No patient records registered yet.</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'hospital':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h2 className="text-2xl font-bold text-gray-900">{currentHospital?.name}</h2>
              <p className="text-xs text-gray-500 mt-1">{currentHospital?.address}</p>
              <p className="text-xs text-gray-500">Phone: {currentHospital?.phone} • Dean: {currentHospital?.deanName}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
              <h3 className="font-bold text-base text-gray-900">Bed Allocation Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-center">
                  <p className="text-xs font-bold text-red-900">ICU OCCUPANCY: {getBedOccupancy('icu')}%</p>
                  <p className="text-3xl font-bold text-red-900 my-2">{bedCounts.icu} / {currentHospital?.icuBeds || 0}</p>
                  <div className="flex justify-center space-x-2">
                    <button onClick={() => handleBedCountChange('icu', -1)} className="p-2 bg-red-200 rounded-lg"><Minus className="h-4 w-4" /></button>
                    <button onClick={() => handleBedCountChange('icu', 1)} className="p-2 bg-red-200 rounded-lg"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-center">
                  <p className="text-xs font-bold text-amber-900">EMERGENCY OCCUPANCY: {getBedOccupancy('emergency')}%</p>
                  <p className="text-3xl font-bold text-amber-900 my-2">{bedCounts.emergency} / {currentHospital?.emergencyBeds || 0}</p>
                  <div className="flex justify-center space-x-2">
                    <button onClick={() => handleBedCountChange('emergency', -1)} className="p-2 bg-amber-200 rounded-lg"><Minus className="h-4 w-4" /></button>
                    <button onClick={() => handleBedCountChange('emergency', 1)} className="p-2 bg-amber-200 rounded-lg"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                  <p className="text-xs font-bold text-blue-900">GENERAL WARD OCCUPANCY: {getBedOccupancy('general')}%</p>
                  <p className="text-3xl font-bold text-blue-900 my-2">{bedCounts.general} / {currentHospital?.generalBeds || 0}</p>
                  <div className="flex justify-center space-x-2">
                    <button onClick={() => handleBedCountChange('general', -1)} className="p-2 bg-blue-200 rounded-lg"><Minus className="h-4 w-4" /></button>
                    <button onClick={() => handleBedCountChange('general', 1)} className="p-2 bg-blue-200 rounded-lg"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Doctor Profile</h2>
                <p className="text-sm text-gray-600">Manage credentials and consultation fee</p>
              </div>
              {!editingProfile ? (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900">Personal Info</h4>
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Doctor Name</label>
                    {editingProfile ? (
                      <input
                        type="text"
                        value={doctorProfile.name}
                        onChange={(e) => setDoctorProfile({...doctorProfile, name: e.target.value})}
                        className="w-full px-3 py-2 border rounded-xl mt-1"
                      />
                    ) : (
                      <p className="font-semibold text-gray-900">Dr. {currentDoctor?.name || user?.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Email</label>
                    {editingProfile ? (
                      <input
                        type="email"
                        value={doctorProfile.email}
                        onChange={(e) => setDoctorProfile({...doctorProfile, email: e.target.value})}
                        className="w-full px-3 py-2 border rounded-xl mt-1"
                      />
                    ) : (
                      <p className="font-semibold text-gray-900">{currentDoctor?.email || user?.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Phone</label>
                    {editingProfile ? (
                      <input
                        type="tel"
                        value={doctorProfile.phone}
                        onChange={(e) => setDoctorProfile({...doctorProfile, phone: e.target.value})}
                        className="w-full px-3 py-2 border rounded-xl mt-1"
                      />
                    ) : (
                      <p className="font-semibold text-gray-900">{currentDoctor?.phone || user?.phone}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900">Professional Details</h4>
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Specialization</label>
                    <p className="font-semibold text-gray-900">{currentDoctor?.specialization}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500">License Number</label>
                    <p className="font-semibold text-gray-900">{currentDoctor?.licenseNo}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Consultation Fee (₹)</label>
                    {editingProfile ? (
                      <input
                        type="number"
                        value={doctorProfile.consultationFee}
                        onChange={(e) => setDoctorProfile({...doctorProfile, consultationFee: Number(e.target.value) || 0})}
                        className="w-full px-3 py-2 border rounded-xl mt-1"
                      />
                    ) : (
                      <p className="font-semibold text-emerald-700">₹{currentDoctor?.consultationFee}</p>
                    )}
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
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-600 text-white p-2 rounded-xl">
                <Stethoscope className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg text-gray-900">WIZARDS Doctor Portal</span>
            </div>

            <div className="flex items-center space-x-4">
              <LanguageSelector />
              <div className="flex items-center space-x-2 border-l pl-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  Dr
                </div>
                <span className="text-xs font-bold text-gray-800">Dr. {user?.name}</span>
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
                      ? 'border-emerald-600 text-emerald-600'
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

      {/* Prescription & Clinical Notes Modal */}
      {selectedApptForNotes && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">
                Patient: {selectedApptForNotes.patientName}
              </h3>
              <button onClick={() => setSelectedApptForNotes(null)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Clinical Notes & Diagnosis</label>
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                rows={3}
                placeholder="Enter diagnosis, observation..."
                className="w-full px-3 py-2 border rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Prescription & Medication</label>
              <textarea
                value={prescriptionText}
                onChange={(e) => setPrescriptionText(e.target.value)}
                rows={3}
                placeholder="Prescription medicines, dosage..."
                className="w-full px-3 py-2 border rounded-xl text-xs"
              />
            </div>

            <div className="flex space-x-2 pt-2 border-t">
              <button
                onClick={handleSaveClinicalNotes}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold"
              >
                Save & Complete Consultation
              </button>
              <button
                onClick={() => setSelectedApptForNotes(null)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-red-600 flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Delete Account
            </h3>
            <p className="text-xs text-gray-600">
              Are you sure you want to delete your doctor profile?
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

export default DoctorDashboard;
