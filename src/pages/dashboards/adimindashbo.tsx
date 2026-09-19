import React, { useState } from 'react';
import { useAuth } from '../../contexts/authcontext';
import { useData } from '../../contexts/datacontext';
import { useLanguage } from '../../contexts/languagecontext';
import LanguageSelector from '../../components/languageselector';
import { 
  Building2, 
  Users, 
  Calendar, 
  Droplet, 
  Bell, 
  User, 
  Activity,
  Bed,
  UserCheck,
  AlertTriangle,
  LogOut,
  Edit3,
  Save,
  X,
  Trash2,
  Shield,
  Plus,
  Settings,
  Stethoscope
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { user, logout, deleteAccount } = useAuth();
  const { t } = useLanguage();
  const { 
    hospitals,
    addHospital,
    updateHospital,
    doctors,
    addDoctor,
    updateDoctor,
    getDoctorsByHospital,
    appointments,
    getAppointmentsByHospital,
    bloodInventory,
    updateBloodInventory,
    getBloodInventoryByHospital,
    notifications,
    addNotification,
    getNotificationsByUser
  } = useData();

  const [activeTab, setActiveTab] = useState('overview');
  const [editingHospital, setEditingHospital] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHospitalForm, setShowHospitalForm] = useState(false);
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any>(null);

  // Find or create hospital for this admin
  const adminHospital = hospitals.find(h => h.adminId === user?.id);
  const [hospitalData, setHospitalData] = useState(adminHospital || {
    id: '',
    name: '',
    address: '',
    phone: '',
    email: '',
    deanName: '',
    licenseNo: '',
    about: '',
    specialties: [],
    totalBeds: 0,
    availableBeds: 0,
    icuBeds: 0,
    availableIcuBeds: 0,
    emergencyBeds: 0,
    availableEmergencyBeds: 0,
    adminId: user?.id || '',
    registrationDate: new Date().toISOString().split('T')[0]
  });

  const [doctorForm, setDoctorForm] = useState({
    name: '',
    email: '',
    phone: '',
    licenseNo: '',
    specialization: '',
    experienceYears: 0,
    consultationFee: 0,
    isAvailable: true
  });

  const [bloodData, setBloodData] = useState({
    'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0,
    'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
  });

  const tabs = [
    { id: 'overview', label: t('overview'), icon: Activity },
    { id: 'hospital', label: t('hospitalManagement'), icon: Building2 },
    { id: 'doctors', label: t('doctorManagement'), icon: Users },
    { id: 'appointments', label: t('appointments'), icon: Calendar },
    { id: 'blood', label: t('bloodBank'), icon: Droplet },
    { id: 'profile', label: t('profile'), icon: User },
  ];

  const handleAddDoctor = () => {
    if (!adminHospital) {
      alert('Please register your hospital first');
      return;
    }

    if (!doctorForm.name || !doctorForm.email || !doctorForm.phone || !doctorForm.licenseNo || !doctorForm.specialization) {
      alert('Please fill in all required fields');
      return;
    }

    const newDoctor = {
      ...doctorForm,
      userId: `DOC${Date.now()}`,
      hospitalId: adminHospital.id,
      hospitalName: adminHospital.name,
      isActive: true,
      rating: 5.0,
      totalPatients: 0
    };

    addDoctor(newDoctor);
    setDoctorForm({
      name: '',
      email: '',
      phone: '',
      licenseNo: '',
      specialization: '',
      experienceYears: 0,
      consultationFee: 0,
      isAvailable: true
    });
    setShowDoctorForm(false);
    alert('Doctor added successfully!');
  };

  const handleEditDoctor = (doctor: any) => {
    setDoctorForm(doctor);
    setEditingDoctor(doctor);
    setShowDoctorForm(true);
  };

  const handleUpdateDoctor = () => {
    if (!editingDoctor) return;
    
    updateDoctor(editingDoctor.id, doctorForm);
    setEditingDoctor(null);
    setShowDoctorForm(false);
    setDoctorForm({
      name: '',
      email: '',
      phone: '',
      licenseNo: '',
      specialization: '',
      experienceYears: 0,
      consultationFee: 0,
      isAvailable: true
    });
    alert('Doctor updated successfully!');
  };

  const handleDeleteDoctor = (doctorId: string) => {
    if (confirm('Are you sure you want to remove this doctor?')) {
      removeDoctor(doctorId);
      alert('Doctor removed successfully!');
    }
  };
  const handleSaveHospital = () => {
    // Validate required fields
    if (!hospitalData.name || !hospitalData.licenseNo || !hospitalData.address || !hospitalData.phone || !hospitalData.email) {
      alert('Please fill in all required fields (Name, License No, Address, Phone, Email)');
      return;
    }
    
    if (adminHospital) {
      updateHospital(adminHospital.id, hospitalData);
      setAdminHospital({ ...adminHospital, ...hospitalData });
    } else {
      const hospitalId = addHospital(hospitalData);
      const newHospital = { ...hospitalData, id: hospitalId, registrationDate: new Date().toISOString().split('T')[0] };
      setHospitalData(newHospital);
      setAdminHospital(newHospital);
    }
    setEditingHospital(false);
    setShowHospitalForm(false);
    
    // Show success message
    alert('Hospital information saved successfully!');
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

  const handleBloodUpdate = (bloodType: string, units: number) => {
    if (adminHospital) {
      updateBloodInventory(adminHospital.id, bloodType, units);
      setBloodData({ ...bloodData, [bloodType]: units });
    }
  };

  // Get hospital-specific data
  const hospitalDoctors = adminHospital ? getDoctorsByHospital(adminHospital.id) : [];
  const hospitalAppointments = adminHospital ? getAppointmentsByHospital(adminHospital.id) : [];
  const hospitalBloodInventory = adminHospital ? getBloodInventoryByHospital(adminHospital.id) : {};
  const adminNotifications = getNotificationsByUser(user?.id || '');

  const getStats = () => {
    return {
      totalDoctors: hospitalDoctors.length,
      activeDoctors: hospitalDoctors.filter(d => d.isActive && d.isAvailable).length,
      todayAppointments: hospitalAppointments.filter(a => 
        a.date === new Date().toISOString().split('T')[0]
      ).length,
      totalBeds: adminHospital?.totalBeds || 0,
      availableBeds: adminHospital?.availableBeds || 0,
      occupancyRate: adminHospital?.totalBeds ? 
        Math.round(((adminHospital.totalBeds - adminHospital.availableBeds) / adminHospital.totalBeds) * 100) : 0
    };
  };

  const stats = getStats();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl transform transition-all duration-300 hover:scale-105">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Welcome, {user?.name}!</h2>
                  <p className="opacity-90">Hospital Administrator • {adminHospital?.name || 'Hospital Management'}</p>
                </div>
                <div className="text-right">
                  {!adminHospital && (
                    <button
                      onClick={() => setShowHospitalForm(true)}
                      className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition-all duration-300 transform hover:scale-105"
                    >
                      Register Hospital
                    </button>
                  )}
                </div>
              </div>
            </div>

            {adminHospital ? (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Doctors</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalDoctors}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Active Doctors</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.activeDoctors}</p>
                      </div>
                      <UserCheck className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Today's Appointments</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.todayAppointments}</p>
                      </div>
                      <Calendar className="h-8 w-8 text-orange-500" />
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Bed Occupancy</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.occupancyRate}%</p>
                      </div>
                      <Bed className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                </div>

                {/* Hospital Overview */}
                <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:shadow-lg">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Building2 className="h-5 w-5 mr-2 text-purple-500" />
                    Hospital Overview
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Bed Status</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Beds:</span>
                          <span className="font-semibold">{adminHospital.totalBeds}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Available:</span>
                          <span className="font-semibold text-green-600">{adminHospital.availableBeds}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ICU Beds:</span>
                          <span className="font-semibold text-yellow-600">{adminHospital.availableIcuBeds}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Emergency:</span>
                          <span className="font-semibold text-red-600">{adminHospital.availableEmergencyBeds}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Blood Bank Status</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(hospitalBloodInventory).slice(0, 4).map(([type, data]) => (
                          <div key={type} className="text-center p-2 bg-gray-50 rounded">
                            <div className="font-semibold">{type}</div>
                            <div className={`text-sm ${
                              data.units > 15 ? 'text-green-600' :
                              data.units > 5 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {data.units} units
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Recent Activity</h4>
                      <div className="space-y-2">
                        {hospitalAppointments.slice(0, 3).map((appointment) => (
                          <div key={appointment.id} className="text-sm p-2 bg-gray-50 rounded">
                            <div className="font-medium">{appointment.patientName}</div>
                            <div className="text-gray-600">Dr. {appointment.doctorName}</div>
                            <div className="text-xs text-gray-500">{appointment.date}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white p-8 rounded-xl shadow-sm border text-center transform transition-all duration-300 hover:shadow-lg">
                <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Hospital Registered</h3>
                <p className="text-gray-600 mb-4">Please register your hospital to access the admin dashboard features.</p>
                <button
                  onClick={() => setShowHospitalForm(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  Register Hospital
                </button>
              </div>
            )}
          </div>
        );

      case 'hospital':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Hospital Management</h2>
              {adminHospital && (
                <button
                  onClick={() => {
                    setHospitalData(adminHospital);
                    setEditingHospital(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 transform hover:scale-105"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Edit Hospital</span>
                </button>
              )}
            </div>

            {adminHospital ? (
              <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Hospital Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name</label>
                        {editingHospital ? (
                          <input
                            type="text"
                            value={hospitalData.name}
                            onChange={(e) => setHospitalData({...hospitalData, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                          />
                        ) : (
                          <p className="text-gray-900">{adminHospital.name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        {editingHospital ? (
                          <textarea
                            value={hospitalData.address}
                            onChange={(e) => setHospitalData({...hospitalData, address: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                            rows={3}
                          />
                        ) : (
                          <p className="text-gray-900">{adminHospital.address}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        {editingHospital ? (
                          <input
                            type="tel"
                            value={hospitalData.phone}
                            onChange={(e) => setHospitalData({...hospitalData, phone: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                          />
                        ) : (
                          <p className="text-gray-900">{adminHospital.phone}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        {editingHospital ? (
                          <input
                            type="email"
                            value={hospitalData.email}
                            onChange={(e) => setHospitalData({...hospitalData, email: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                          />
                        ) : (
                          <p className="text-gray-900">{adminHospital.email}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Bed Management</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Beds</label>
                        {editingHospital ? (
                          <input
                            type="number"
                            value={hospitalData.totalBeds}
                            onChange={(e) => setHospitalData({...hospitalData, totalBeds: parseInt(e.target.value) || 0})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                          />
                        ) : (
                          <p className="text-gray-900">{adminHospital.totalBeds}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Available Beds</label>
                        {editingHospital ? (
                          <input
                            type="number"
                            value={hospitalData.availableBeds}
                            onChange={(e) => setHospitalData({...hospitalData, availableBeds: parseInt(e.target.value) || 0})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                          />
                        ) : (
                          <p className="text-gray-900">{adminHospital.availableBeds}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ICU Beds</label>
                        {editingHospital ? (
                          <input
                            type="number"
                            value={hospitalData.availableIcuBeds}
                            onChange={(e) => setHospitalData({...hospitalData, availableIcuBeds: parseInt(e.target.value) || 0})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                          />
                        ) : (
                          <p className="text-gray-900">{adminHospital.availableIcuBeds}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Beds</label>
                        {editingHospital ? (
                          <input
                            type="number"
                            value={hospitalData.availableEmergencyBeds}
                            onChange={(e) => setHospitalData({...hospitalData, availableEmergencyBeds: parseInt(e.target.value) || 0})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                          />
                        ) : (
                          <p className="text-gray-900">{adminHospital.availableEmergencyBeds}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {editingHospital && (
                  <div className="mt-6 pt-6 border-t flex space-x-2">
                    <button
                      onClick={handleSaveHospital}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 transform hover:scale-105"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Changes</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingHospital(false);
                        setHospitalData(adminHospital);
                      }}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 transform hover:scale-105"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white p-8 rounded-xl shadow-sm border text-center transform transition-all duration-300 hover:shadow-lg">
                <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Hospital Registered</h3>
                <p className="text-gray-600 mb-4">Please register your hospital first.</p>
                <button
                  onClick={() => setShowHospitalForm(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  Register Hospital
                </button>
              </div>
            )}
          </div>
        );

      case 'doctors':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Doctor Management</h2>
              {adminHospital && (
                <button
                  onClick={() => setShowDoctorForm(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 transform hover:scale-105"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Doctor</span>
                </button>
              )}
            </div>

            {adminHospital ? (
              <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:shadow-lg">
                <h3 className="text-lg font-semibold mb-4">Hospital Doctors</h3>
                <div className="space-y-4">
                  {hospitalDoctors.length > 0 ? (
                    hospitalDoctors.map((doctor) => (
                      <div key={doctor.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border transition-all duration-300 hover:bg-gray-100">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <Stethoscope className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Dr. {doctor.name}</h4>
                            <p className="text-sm text-gray-600">{doctor.specialization}</p>
                            <p className="text-xs text-gray-500">License: {doctor.licenseNo}</p>
                            <p className="text-xs text-gray-500">ID: {doctor.userId}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">₹{doctor.consultationFee}</p>
                            <p className="text-xs text-gray-500">{doctor.experienceYears} years exp</p>
                            <div className="flex items-center space-x-1">
                              <div className={`w-2 h-2 rounded-full ${doctor.isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              <span className="text-xs">{doctor.isAvailable ? 'Available' : 'Unavailable'}</span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditDoctor(doctor)}
                              className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-all duration-300"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDoctor(doctor.id)}
                              className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-all duration-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Stethoscope className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No doctors added yet</p>
                      <p className="text-sm">Add doctors to your hospital</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-xl shadow-sm border text-center transform transition-all duration-300 hover:shadow-lg">
                <Stethoscope className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Hospital Registration Required</h3>
                <p className="text-gray-600">Please register your hospital to manage doctors.</p>
              </div>
            )}
          </div>
        );

      case 'blood':
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold">Blood Bank Management</h2>
            
            {adminHospital ? (
              <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:shadow-lg">
                <h3 className="text-lg font-semibold mb-4">Blood Inventory</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bloodType) => (
                    <div key={bloodType} className="border rounded-lg p-4 text-center transform transition-all duration-300 hover:scale-105">
                      <h4 className="font-semibold text-lg mb-2">{bloodType}</h4>
                      <div className="mb-2">
                        <span className={`text-2xl font-bold ${
                          (hospitalBloodInventory[bloodType]?.units || 0) > 15 ? 'text-green-600' :
                          (hospitalBloodInventory[bloodType]?.units || 0) > 5 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {hospitalBloodInventory[bloodType]?.units || 0}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">units</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={bloodData[bloodType as keyof typeof bloodData]}
                        onChange={(e) => setBloodData({...bloodData, [bloodType]: parseInt(e.target.value) || 0})}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-center transition-all duration-300"
                        placeholder="Update"
                      />
                      <button
                        onClick={() => handleBloodUpdate(bloodType, bloodData[bloodType as keyof typeof bloodData])}
                        className="w-full mt-2 bg-red-500 hover:bg-red-600 text-white py-1 rounded text-sm transition-all duration-300 transform hover:scale-105"
                      >
                        Update
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-xl shadow-sm border text-center transform transition-all duration-300 hover:shadow-lg">
                <Droplet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Hospital Registration Required</h3>
                <p className="text-gray-600">Please register your hospital to manage blood inventory.</p>
              </div>
            )}
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold">Admin Profile</h2>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border transform transition-all duration-300 hover:shadow-lg">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
                  <Building2 className="h-10 w-10 text-purple-600" />
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
                      <p className="text-gray-900">{user?.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-gray-900">{user?.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <p className="text-gray-900">{user?.phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <p className="text-gray-900">Hospital Administrator</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Hospital Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hospital</label>
                      <p className="text-gray-900">{adminHospital?.name || 'Not registered'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">License No</label>
                      <p className="text-gray-900">{adminHospital?.licenseNo || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Registration Date</label>
                      <p className="text-gray-900">{user?.registrationDate}</p>
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
              <div className="bg-purple-100 p-2 rounded-lg">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">HWM Admin Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSelector />
              <div className="relative">
                <Bell className="h-6 w-6 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" />
                {adminNotifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {adminNotifications.filter(n => !n.isRead).length}
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
                      ? 'border-purple-500 text-purple-600'
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

      {/* Hospital Registration Modal */}
      {showHospitalForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto transform transition-all duration-300 scale-100">
            <h3 className="text-lg font-semibold mb-4">Register Hospital</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name *</label>
                <input
                  type="text"
                  value={hospitalData.name}
                  onChange={(e) => setHospitalData({...hospitalData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter hospital name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number *</label>
                <input
                  type="text"
                  value={hospitalData.licenseNo}
                  onChange={(e) => setHospitalData({...hospitalData, licenseNo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter license number"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <textarea
                  value={hospitalData.address}
                  onChange={(e) => setHospitalData({...hospitalData, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter hospital address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={hospitalData.phone}
                  onChange={(e) => setHospitalData({...hospitalData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={hospitalData.email}
                  onChange={(e) => setHospitalData({...hospitalData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dean Name</label>
                <input
                  type="text"
                  value={hospitalData.deanName}
                  onChange={(e) => setHospitalData({...hospitalData, deanName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter dean name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Beds</label>
                <input
                  type="number"
                  value={hospitalData.totalBeds}
                  onChange={(e) => setHospitalData({...hospitalData, totalBeds: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-6">
              <button
                onClick={handleSaveHospital}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-colors"
              >
                Register Hospital
              </button>
              <button
                onClick={() => setShowHospitalForm(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Form Modal */}
      {showDoctorForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto transform transition-all duration-300 scale-100">
            <h3 className="text-lg font-semibold mb-4">
              {editingDoctor ? 'Edit Doctor' : 'Add Doctor'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Name *</label>
                <input
                  type="text"
                  value={doctorForm.name}
                  onChange={(e) => setDoctorForm({...doctorForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Dr. Full Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={doctorForm.email}
                  onChange={(e) => setDoctorForm({...doctorForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="doctor@hospital.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={doctorForm.phone}
                  onChange={(e) => setDoctorForm({...doctorForm, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number *</label>
                <input
                  type="text"
                  value={doctorForm.licenseNo}
                  onChange={(e) => setDoctorForm({...doctorForm, licenseNo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Medical license number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialization *</label>
                <select
                  value={doctorForm.specialization}
                  onChange={(e) => setDoctorForm({...doctorForm, specialization: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select Specialization</option>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
                <input
                  type="number"
                  value={doctorForm.experienceYears}
                  onChange={(e) => setDoctorForm({...doctorForm, experienceYears: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee (₹)</label>
                <input
                  type="number"
                  value={doctorForm.consultationFee}
                  onChange={(e) => setDoctorForm({...doctorForm, consultationFee: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={doctorForm.isAvailable}
                  onChange={(e) => setDoctorForm({...doctorForm, isAvailable: e.target.checked})}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">Available for appointments</label>
              </div>
            </div>
            <div className="flex space-x-2 mt-6">
              <button
                onClick={editingDoctor ? handleUpdateDoctor : handleAddDoctor}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors"
              >
                {editingDoctor ? 'Update Doctor' : 'Add Doctor'}
              </button>
              <button
                onClick={() => {
                  setShowDoctorForm(false);
                  setEditingDoctor(null);
                  setDoctorForm({
                    name: '',
                    email: '',
                    phone: '',
                    licenseNo: '',
                    specialization: '',
                    experienceYears: 0,
                    consultationFee: 0,
                    isAvailable: true
                  });
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

export default AdminDashboard;