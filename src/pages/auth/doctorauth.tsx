import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/authcontext';
import { useData } from '../../contexts/datacontext';
import { 
  Stethoscope, 
  ArrowLeft, 
  Mail, 
  Lock, 
  User, 
  Building2, 
  FileText, 
  Trash2, 
  Shield, 
  Phone, 
  KeyRound, 
  Sparkles,
  Search,
  MapPin,
  CheckCircle2,
  X
} from 'lucide-react';

const DoctorAuth: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle, loginWithOtp, register, deleteAccount } = useAuth();
  const { hospitals, addDoctor, deleteUserFromData } = useData();
  const [isLogin, setIsLogin] = useState(true);
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpStep, setOtpStep] = useState<'signup' | 'login' | 'delete'>('signup');
  const [activeOtp, setActiveOtp] = useState('');
  const [otpTarget, setOtpTarget] = useState('');
  const [otpBanner, setOtpBanner] = useState('');
  const [hospitalSearchQuery, setHospitalSearchQuery] = useState('');
  const [isHospitalDropdownOpen, setIsHospitalDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    licenseId: '',
    hospitalId: '',
    specialization: '',
    experienceYears: 0,
    consultationFee: 0,
  });
  const [deleteData, setDeleteData] = useState({
    identifier: '',
    otp: ''
  });
  const [otp, setOtp] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [generatedId, setGeneratedId] = useState('');
  const [showDoctorAnimation, setShowDoctorAnimation] = useState(false);

  // Doctor popup animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowDoctorAnimation(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendOTP = (target: string, step: 'signup' | 'login' | 'delete') => {
    const generatedOtp = generateOTP();
    console.log(`OTP generated for ${target} (${step}): ${generatedOtp}`);
    setActiveOtp(generatedOtp);
    setOtpTarget(target);
    localStorage.setItem(`${step}_otp`, generatedOtp);
    setOtpBanner(`Verification code sent to ${target}: ${generatedOtp}`);
    return generatedOtp;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      if (isLogin) {
        if (loginMethod === 'password') {
          const result = await login(formData.email, formData.password, 'doctor');
          if (result.success) {
            navigate('/doctor/dashboard');
          } else {
            setMessage(result.message || 'The entered details do not match our database. Please check and try again.');
          }
        } else {
          // Login via OTP
          if (!formData.email) {
            setMessage('Please enter your email, phone, or doctor ID');
            setIsLoading(false);
            return;
          }
          const users = JSON.parse(localStorage.getItem('wizards_users') || '[]');
          const user = users.find((u: any) => 
            (u.email === formData.email || u.phone === formData.email || u.id === formData.email) &&
            u.role === 'doctor'
          );
          if (!user) {
            setMessage('No doctor account found with these details. Please register first or check your details.');
            setIsLoading(false);
            return;
          }
          const target = user.phone || user.email;
          const generatedOtp = sendOTP(target, 'login');
          setOtp(generatedOtp);
          setOtpStep('login');
          setShowOtpModal(true);
          setIsLoading(false);
          return;
        }
      } else {
        if (!formData.hospitalId) {
          setMessage('Please search and select your hospital or clinic to register.');
          setIsLoading(false);
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          setMessage('Passwords do not match');
          setIsLoading(false);
          return;
        }

        const generatedOtp = sendOTP(formData.phone, 'signup');
        localStorage.setItem('signup_data', JSON.stringify(formData));
        setOtp(generatedOtp);
        setOtpStep('signup');
        setShowOtpModal(true);
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setMessage('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerification = async () => {
    setIsVerifyingOtp(true);
    
    setTimeout(async () => {
      const storedOtp = localStorage.getItem(`${otpStep}_otp`);
      
      if (otp !== storedOtp) {
        setIsVerifyingOtp(false);
        setMessage('Invalid OTP. Please enter the correct code.');
        return;
      }

      if (otpStep === 'signup') {
        const storedData = localStorage.getItem('signup_data');
        if (storedData) {
          const signupData = JSON.parse(storedData);
          const result = await register(signupData, 'doctor');
          
          if (result.success && result.userId) {
            setGeneratedId(result.userId);
            localStorage.removeItem('signup_otp');
            localStorage.removeItem('signup_data');
            setShowOtpModal(false);
            setMessage(`Registration successful! Your Doctor ID is ${result.userId}`);
            
            // Add doctor to the doctors list in DataContext
            const doctorData = {
              ...signupData,
              userId: result.userId,
              hospitalName: hospitals.find(h => h.id === signupData.hospitalId)?.name || '',
              isActive: true,
              rating: 5.0,
              totalPatients: 0
            };
            
            addDoctor(doctorData);
            
            // Store doctor data in localStorage for DataContext
            const existingDoctors = JSON.parse(localStorage.getItem('wizards_doctors') || '[]');
            existingDoctors.push(doctorData);
            localStorage.setItem('wizards_doctors', JSON.stringify(existingDoctors));
            
            setTimeout(async () => {
              const loginResult = await login(signupData.email, signupData.password, 'doctor');
              if (loginResult.success) {
                navigate('/doctor/dashboard');
              }
            }, 800);
          } else {
            setIsVerifyingOtp(false);
            setMessage(result.message || 'Registration failed');
            return;
          }
        }
      } else if (otpStep === 'login') {
        const result = await loginWithOtp(formData.email, 'doctor');
        if (result.success) {
          localStorage.removeItem('login_otp');
          setShowOtpModal(false);
          navigate('/doctor/dashboard');
        } else {
          setIsVerifyingOtp(false);
          setMessage(result.message || 'Login failed');
        }
      } else if (otpStep === 'delete') {
        const users = JSON.parse(localStorage.getItem('wizards_users') || '[]');
        const userToDelete = users.find((u: any) => 
          u.email === deleteData.identifier || 
          u.phone === deleteData.identifier || 
          u.id === deleteData.identifier
        );
        if (userToDelete) {
          await deleteUserFromData(userToDelete.id, userToDelete.email);
          await deleteAccount(userToDelete.id);
        } else {
          const updatedUsers = users.filter((user: any) => 
            user.email !== deleteData.identifier && 
            user.phone !== deleteData.identifier && 
            user.id !== deleteData.identifier
          );
          localStorage.setItem('wizards_users', JSON.stringify(updatedUsers));
        }
        localStorage.removeItem('delete_otp');
        
        setShowOtpModal(false);
        setShowDeleteModal(false);
        setMessage('Account deleted successfully.');
        setDeleteData({ identifier: '', otp: '' });
      }
      
      setOtp('');
      setIsVerifyingOtp(false);
    }, 800);
  };

  const handleDeleteAccount = () => {
    if (!deleteData.identifier) {
      setMessage('Please enter your email, phone, or doctor ID');
      return;
    }

    const users = JSON.parse(localStorage.getItem('wizards_users') || '[]');
    const user = users.find((u: any) => 
      u.email === deleteData.identifier || 
      u.phone === deleteData.identifier || 
      u.id === deleteData.identifier
    );

    if (!user) {
      setMessage('Account not found with the provided details');
      return;
    }

    const generatedOtp = sendOTP(user.phone || user.email, 'delete');
    setOtp(generatedOtp);
    setOtpStep('delete');
    setShowDeleteModal(false);
    setShowOtpModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const fillDemoDoctor = () => {
    setFormData((prev) => ({
      ...prev,
      email: 'doctor@demo.com',
      password: 'Password123!',
    }));
    setLoginMethod('password');
    setMessage('Demo doctor credentials filled!');
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setMessage('');
    const result = await loginWithGoogle('doctor');
    setIsLoading(false);
    if (result.success) {
      navigate('/doctor/dashboard');
    } else {
      setMessage(result.message || 'Google sign-in could not be completed.');
    }
  };

  // Only show hospitals that are verified and registered on the platform
  const registeredHospitals = hospitals.filter(
    (hospital) => hospital && hospital.id && hospital.name && hospital.name.trim().length > 0
  );

  const filteredHospitals = registeredHospitals.filter((hospital) => {
    if (!hospitalSearchQuery.trim()) return true;
    const query = hospitalSearchQuery.toLowerCase();
    const nameMatch = hospital.name?.toLowerCase().includes(query);
    const addressMatch = hospital.address?.toLowerCase().includes(query);
    const cityMatch = hospital.city?.toLowerCase().includes(query);
    const licenseMatch = hospital.licenseNo?.toLowerCase().includes(query);
    const specMatch = hospital.specialties?.some((s: string) => s.toLowerCase().includes(query));
    return nameMatch || addressMatch || cityMatch || licenseMatch || specMatch;
  });

  const selectedHospital = registeredHospitals.find((h) => h.id === formData.hospitalId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Doctor Popup Animation */}
      {showDoctorAnimation && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <div className="bg-white rounded-full p-3 shadow-lg border-2 border-green-200">
            <Stethoscope className="h-8 w-8 text-green-500 animate-pulse" />
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 max-h-screen overflow-y-auto relative z-10 transform transition-all duration-500 hover:scale-105">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="absolute top-4 left-4 p-2 text-gray-500 hover:text-gray-700 transition-colors transform hover:scale-110"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="bg-green-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center animate-pulse">
            <Stethoscope className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 animate-fade-in">
            {isLogin ? 'Doctor Login' : 'Doctor Registration'}
          </h2>
          <p className="text-gray-600 mt-2">
            {isLogin ? 'Access your medical practice dashboard' : 'Register as a healthcare provider'}
          </p>
        </div>

        {/* In-app OTP alert banner */}
        {otpBanner && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center space-x-2">
              <span className="text-base">📲</span>
              <span className="font-medium">{otpBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setOtpBanner('')}
              className="text-emerald-700 hover:text-emerald-950 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-center transition-all duration-300 ${
            message.includes('successful') || generatedId || message.includes('filled')
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message}
            {generatedId && (
              <div className="mt-2 p-2 bg-white rounded border font-mono text-sm">
                {generatedId}
              </div>
            )}
          </div>
        )}

        {/* Login Method Toggle */}
        {isLogin && (
          <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('password');
                setMessage('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                loginMethod === 'password'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('otp');
                setMessage('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1 ${
                loginMethod === 'otp'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Login with OTP</span>
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <>
              <div className="transform transition-all duration-300 hover:scale-105">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                    placeholder="Dr. Full Name"
                    required
                  />
                </div>
              </div>

              <div className="transform transition-all duration-300 hover:scale-105">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                    placeholder="Enter phone number"
                    required
                  />
                </div>
              </div>

              <div className="transform transition-all duration-300 hover:scale-105">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NMR License ID *
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="licenseId"
                    value={formData.licenseId}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                    placeholder="Enter NMR License Number"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 flex items-center justify-between">
                  <span>Registered Hospital / Clinic *</span>
                  {selectedHospital && (
                    <span className="text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium border border-green-200 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600" /> Platform Registered
                    </span>
                  )}
                </label>

                {/* Selected Hospital Display */}
                {selectedHospital && !isHospitalDropdownOpen ? (
                  <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border border-green-300 rounded-xl p-3.5 shadow-xs transition-all duration-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="p-2 bg-green-600 text-white rounded-lg mt-0.5 shrink-0 shadow-xs">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                              {selectedHospital.name}
                            </h4>
                            <span className="inline-flex items-center text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                              <CheckCircle2 className="h-3 w-3 mr-0.5 text-green-600" /> Verified Facility
                            </span>
                          </div>
                          {selectedHospital.licenseNo && (
                            <p className="text-[11px] text-gray-600 font-mono">
                              <span className="text-gray-500 font-sans">Reg / Lic:</span> {selectedHospital.licenseNo}
                            </p>
                          )}
                          {selectedHospital.address && (
                            <p className="text-xs text-gray-600 flex items-start gap-1">
                              <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                              <span className="break-words">{selectedHospital.address}</span>
                            </p>
                          )}
                          {selectedHospital.phone && (
                            <p className="text-[11px] text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3 text-gray-400 shrink-0" />
                              <span>{selectedHospital.phone}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsHospitalDropdownOpen(true);
                          setHospitalSearchQuery('');
                        }}
                        className="text-xs font-semibold text-green-700 hover:text-green-800 bg-white hover:bg-green-100/70 border border-green-300 px-2.5 py-1 rounded-lg transition-colors shadow-2xs shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={hospitalSearchQuery}
                        onChange={(e) => {
                          setHospitalSearchQuery(e.target.value);
                          setIsHospitalDropdownOpen(true);
                        }}
                        onFocus={() => setIsHospitalDropdownOpen(true)}
                        placeholder="Search registered hospitals by name, license #, city, or address..."
                        className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all shadow-2xs"
                      />
                      {hospitalSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setHospitalSearchQuery('')}
                          className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {isHospitalDropdownOpen && (
                      <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-gray-100 animate-fade-in">
                        <div className="p-2 bg-gray-50 flex items-center justify-between text-xs text-gray-500 font-medium sticky top-0 border-b border-gray-200 z-10">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-green-500"></span>
                            {filteredHospitals.length} registered platform {filteredHospitals.length === 1 ? 'hospital' : 'hospitals'} found
                          </span>
                          {selectedHospital && (
                            <button
                              type="button"
                              onClick={() => setIsHospitalDropdownOpen(false)}
                              className="text-gray-600 hover:text-gray-900 font-semibold text-xs"
                            >
                              Done
                            </button>
                          )}
                        </div>

                        {filteredHospitals.length === 0 ? (
                          <div className="p-5 text-center text-sm text-gray-500">
                            <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="font-semibold text-gray-800 text-xs">
                              {hospitalSearchQuery 
                                ? `No registered hospitals found matching "${hospitalSearchQuery}"`
                                : 'No registered hospitals available'}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed max-w-xs mx-auto">
                              Only hospitals officially registered on the Wizards platform can be selected. If your facility is not registered, please ask your hospital administrator to register via the Admin portal.
                            </p>
                          </div>
                        ) : (
                          filteredHospitals.map((hospital) => {
                            const isSelected = formData.hospitalId === hospital.id;
                            return (
                              <button
                                key={hospital.id}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, hospitalId: hospital.id }));
                                  setIsHospitalDropdownOpen(false);
                                  setHospitalSearchQuery('');
                                }}
                                className={`w-full text-left p-3 transition-colors flex items-start justify-between gap-2.5 hover:bg-green-50/80 cursor-pointer ${
                                  isSelected ? 'bg-green-50 border-l-4 border-green-600' : ''
                                }`}
                              >
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-gray-900 text-xs">
                                      {hospital.name}
                                    </span>
                                    <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.2 rounded font-medium">
                                      Registered
                                    </span>
                                    {hospital.city && (
                                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1 py-0.2 rounded">
                                        {hospital.city}
                                      </span>
                                    )}
                                  </div>
                                  {hospital.licenseNo && (
                                    <p className="text-[10px] text-gray-500 font-mono">
                                      Lic: {hospital.licenseNo}
                                    </p>
                                  )}
                                  <p className="text-[11px] text-gray-600 flex items-start gap-1">
                                    <MapPin className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                                    <span className="line-clamp-2">{hospital.address || 'Address on file'}</span>
                                  </p>
                                </div>
                                {isSelected && (
                                  <span className="text-green-600 shrink-0 mt-0.5">
                                    <CheckCircle2 className="h-4 w-4" />
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="transform transition-all duration-300 hover:scale-105">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialization *
                </label>
                <select
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                  required
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

              <div className="grid grid-cols-2 gap-4">
                <div className="transform transition-all duration-300 hover:scale-105">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Experience (Years)
                  </label>
                  <input
                    type="number"
                    name="experienceYears"
                    value={formData.experienceYears}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div className="transform transition-all duration-300 hover:scale-105">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Consultation Fee (₹)
                  </label>
                  <input
                    type="number"
                    name="consultationFee"
                    value={formData.consultationFee}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
            </>
          )}

          <div className="transform transition-all duration-300 hover:scale-105">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isLogin ? 'Email / Phone / Doctor ID' : 'Email Address'} *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={isLogin ? "text" : "email"}
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                placeholder={isLogin ? "Enter email, phone, or doctor ID" : "doctor@hospital.com"}
                required
              />
            </div>
          </div>

          {(!isLogin || loginMethod === 'password') && (
            <div className="transform transition-all duration-300 hover:scale-105">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                  placeholder="Enter secure password"
                  required={!isLogin || loginMethod === 'password'}
                />
              </div>
            </div>
          )}

          {!isLogin && (
            <div className="transform transition-all duration-300 hover:scale-105">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                  placeholder="Confirm password"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
          >
            {isLoading
              ? 'Processing...'
              : isLogin
              ? loginMethod === 'otp'
                ? 'Send OTP to Login'
                : 'Login'
              : 'Register (Send OTP)'}
          </button>
        </form>

        {/* Firebase Google Sign-In */}
        <div className="mt-4">
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-3 text-gray-400 text-xs uppercase font-medium">Or continue with</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full mt-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm flex items-center justify-center space-x-2 transition text-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>

        {/* Demo Quick Fill Box */}
        {isLogin && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-900 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="h-4 w-4 text-green-600 flex-shrink-0" />
              <div>
                <span className="font-bold">Demo Doctor:</span> doctor@demo.com
              </div>
            </div>
            <button
              type="button"
              onClick={fillDemoDoctor}
              className="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded font-semibold text-xs transition"
            >
              Fill Demo
            </button>
          </div>
        )}

        {/* Delete Account Button */}
        {isLogin && (
          <div className="mt-4">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 transform hover:scale-105"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Account</span>
            </button>
          </div>
        )}

        {/* Toggle Form */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {isLogin ? "Don't have an account?" : 'Already registered?'}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setMessage('');
                setGeneratedId('');
              }}
              className="ml-2 text-green-600 hover:text-green-700 font-semibold transition-colors"
            >
              {isLogin ? 'Register Here' : 'Login'}
            </button>
          </p>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
            <h3 className="text-lg font-semibold mb-4 text-red-600 flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Delete Account
            </h3>
            <p className="text-gray-600 mb-4">
              Enter your email, phone number, or doctor ID to delete your account. An OTP will be sent for verification.
            </p>
            <input
              type="text"
              value={deleteData.identifier}
              onChange={(e) => setDeleteData({...deleteData, identifier: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
              placeholder="Email / Phone / Doctor ID"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleDeleteAccount}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors"
              >
                Send OTP
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

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full mx-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">
                {otpStep === 'signup'
                  ? 'Verify Phone Number'
                  : otpStep === 'login'
                  ? 'Login with OTP'
                  : 'Verify Account Deletion'}
              </h3>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold">
                OTP Verification
              </span>
            </div>

            {/* Prominent Verification Code Box */}
            {activeOtp && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 mb-4 text-center shadow-inner">
                <div className="flex items-center justify-between mb-1 text-xs text-green-800 font-medium">
                  <span>Simulated Delivery</span>
                  <span>Target: {otpTarget}</span>
                </div>
                <div className="flex items-center justify-center space-x-3 my-2">
                  <div className="font-mono text-3xl font-extrabold text-green-900 tracking-widest bg-white px-4 py-1.5 rounded-lg border border-green-300 shadow-sm">
                    {activeOtp}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtp(activeOtp)}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg transition shadow flex items-center space-x-1"
                  >
                    <span>Auto-fill</span>
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Click <strong>Auto-fill</strong> or enter the 6 digits below to complete verification.
                </p>
              </div>
            )}

            <p className="text-gray-600 text-sm mb-2">
              Enter the 6-digit code sent to <span className="font-semibold text-gray-800">{otpTarget}</span>:
            </p>

            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-3 py-3 border-2 border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-3 text-center text-2xl font-bold tracking-widest font-mono"
              placeholder="000000"
              maxLength={6}
              autoFocus
            />

            <div className="flex justify-between items-center text-xs text-gray-500 mb-4 px-1">
              <span>Didn't receive the code?</span>
              <button
                type="button"
                onClick={() => {
                  const newOtp = sendOTP(otpTarget, otpStep);
                  setOtp(newOtp);
                }}
                className="text-green-600 hover:underline font-semibold"
              >
                Resend OTP
              </button>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleOtpVerification}
                disabled={isVerifyingOtp || otp.length < 6}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow"
              >
                {isVerifyingOtp ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  'Verify & Proceed'
                )}
              </button>
              <button
                onClick={() => {
                  setShowOtpModal(false);
                  setOtp('');
                  if (otpStep === 'signup') {
                    localStorage.removeItem('signup_otp');
                    localStorage.removeItem('signup_data');
                  }
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold transition-colors text-sm"
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

export default DoctorAuth;