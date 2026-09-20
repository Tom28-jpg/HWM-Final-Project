import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/authcontext';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Building2, ArrowLeft, Mail, Lock, User, Phone, Trash2, Shield, Sparkles } from 'lucide-react';

const AdminAuth: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpStep, setOtpStep] = useState<'signup' | 'delete'>('signup');
  const [activeOtp, setActiveOtp] = useState('');
  const [otpTarget, setOtpTarget] = useState('');
  const [otpBanner, setOtpBanner] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    position: '',
    hospitalName: '',
    hospitalLicenseNo: '',
    hospitalAddress: '',
    hospitalCity: '',
    hospitalPhone: '',
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

  const sendOTP = (target: string, step: 'signup' | 'delete') => {
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
        const result = await login(formData.email, formData.password, 'admin');
        if (result.success) {
          navigate('/admin/dashboard');
        } else {
          setMessage(result.message || 'The entered details do not match our database. Please check and try again.');
        }
      } else {
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
          const result = await register(signupData, 'admin');
          
          if (result.success && result.userId) {
            setGeneratedId(result.userId);

            // Automatically create and store the hospital in database with this admin's ID
            const hospitalId = `HOSP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const newHospital = {
              id: hospitalId,
              name: signupData.hospitalName?.trim() || `${signupData.name}'s Medical Center`,
              licenseNo: signupData.hospitalLicenseNo?.trim() || `LIC-${Date.now().toString().slice(-6)}`,
              address: signupData.hospitalAddress?.trim() || `${signupData.hospitalCity || 'Healthcare Avenue'}, Tamil Nadu`,
              city: signupData.hospitalCity?.trim() || '',
              phone: signupData.hospitalPhone?.trim() || signupData.phone,
              email: signupData.email,
              adminId: result.userId,
              deanName: signupData.name,
              about: `Managed by ${signupData.name} (${signupData.position || 'Hospital Administrator'})`,
              specialties: ['General Medicine', 'Emergency Care'],
              totalBeds: 50,
              availableBeds: 50,
              icuBeds: 10,
              availableIcuBeds: 10,
              emergencyBeds: 10,
              availableEmergencyBeds: 10,
              generalBeds: 30,
              availableGeneralBeds: 30,
              registrationDate: new Date().toISOString().split('T')[0]
            };

            // Save immediately to Firestore database and local storage
            setDoc(doc(db, 'hospitals', hospitalId), newHospital, { merge: true }).catch(() => {});
            try {
              const existingHospitals = JSON.parse(localStorage.getItem('wizards_hospitals') || '[]');
              const updatedHospitals = [
                ...existingHospitals.filter((h: any) => h.id !== hospitalId),
                newHospital
              ];
              localStorage.setItem('wizards_hospitals', JSON.stringify(updatedHospitals));
            } catch {
              localStorage.setItem('wizards_hospitals', JSON.stringify([newHospital]));
            }

            localStorage.removeItem('signup_otp');
            localStorage.removeItem('signup_data');
            setShowOtpModal(false);
            setMessage(`Registration successful! Your Admin ID is ${result.userId}`);
            
            setTimeout(async () => {
              const loginResult = await login(signupData.email, signupData.password, 'admin');
              if (loginResult.success) {
                navigate('/admin/dashboard');
              }
            }, 800);
          } else {
            setIsVerifyingOtp(false);
            setMessage(result.message || 'Registration failed');
            return;
          }
        }
      } else if (otpStep === 'delete') {
        const users = JSON.parse(localStorage.getItem('wizards_users') || '[]');
        const updatedUsers = users.filter((user: any) => 
          user.email !== deleteData.identifier && 
          user.phone !== deleteData.identifier && 
          user.id !== deleteData.identifier
        );
        localStorage.setItem('wizards_users', JSON.stringify(updatedUsers));
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
      setMessage('Please enter your email, phone, or admin ID');
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

  const fillDemoAdmin = () => {
    setFormData((prev) => ({
      ...prev,
      email: 'admin@demo.com',
      password: 'Password123!',
    }));
    setLoginMethod('password');
    setMessage('Demo admin credentials filled!');
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setMessage('');
    const result = await loginWithGoogle('admin');
    setIsLoading(false);
    if (result.success) {
      navigate('/admin/dashboard');
    } else {
      setMessage(result.message || 'Google sign-in could not be completed.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Doctor Popup Animation */}
      {showDoctorAnimation && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <div className="bg-white rounded-full p-3 shadow-lg border-2 border-blue-200">
            <Building2 className="h-8 w-8 text-blue-500 animate-pulse" />
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 relative z-10 transform transition-all duration-500 hover:scale-105">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="absolute top-4 left-4 p-2 text-gray-500 hover:text-gray-700 transition-colors transform hover:scale-110"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="bg-blue-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center animate-pulse">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 animate-fade-in">
            {isLogin ? 'Admin Login' : 'Admin Registration'}
          </h2>
          <p className="text-gray-600 mt-2">
            {isLogin ? 'Access hospital management dashboard' : 'Register as hospital administrator'}
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="Enter your full name"
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="Enter phone number"
                    required
                  />
                </div>
              </div>

              <div className="transform transition-all duration-300 hover:scale-105">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position *
                </label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="e.g., Chief Administrator, Hospital Manager"
                  required
                />
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600 shrink-0" />
                  <h4 className="text-sm font-semibold text-gray-900">Hospital / Clinic Details to Register</h4>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Hospital / Clinic Name *
                  </label>
                  <input
                    type="text"
                    name="hospitalName"
                    value={formData.hospitalName}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., City Specialty Hospital"
                    required={!isLogin}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Registration / License Number *
                  </label>
                  <input
                    type="text"
                    name="hospitalLicenseNo"
                    value={formData.hospitalLicenseNo}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., MED-LIC-TN-2026-001"
                    required={!isLogin}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      City / District *
                    </label>
                    <input
                      type="text"
                      name="hospitalCity"
                      value={formData.hospitalCity}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="e.g., Chennai"
                      required={!isLogin}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Hospital Contact Phone
                    </label>
                    <input
                      type="tel"
                      name="hospitalPhone"
                      value={formData.hospitalPhone}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="e.g., +91 44 2621 0000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Full Hospital Address *
                  </label>
                  <input
                    type="text"
                    name="hospitalAddress"
                    value={formData.hospitalAddress}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., 42 Main Road, Anna Nagar, Chennai"
                    required={!isLogin}
                  />
                </div>
              </div>
            </>
          )}

          <div className="transform transition-all duration-300 hover:scale-105">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isLogin ? 'Email / Phone / Admin ID' : 'Email Address'} *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={isLogin ? "text" : "email"}
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder={isLogin ? "Enter email, phone, or admin ID" : "admin@example.com"}
                required
              />
            </div>
          </div>

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
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="Enter secure password"
                required
              />
            </div>
          </div>

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
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="Confirm password"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
          >
            {isLoading
              ? 'Processing...'
              : isLogin
              ? 'Login to Dashboard'
              : 'Register Admin Account (Send OTP)'}
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
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <div>
                <span className="font-bold">Demo Admin:</span> admin@demo.com
              </div>
            </div>
            <button
              type="button"
              onClick={fillDemoAdmin}
              className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded font-semibold text-xs transition"
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
            {isLogin ? "Need to register as admin?" : 'Already have an account?'}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setMessage('');
                setGeneratedId('');
              }}
              className="ml-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors"
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
              Enter your email, phone number, or admin ID to delete your account. An OTP will be sent for verification.
            </p>
            <input
              type="text"
              value={deleteData.identifier}
              onChange={(e) => setDeleteData({...deleteData, identifier: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
              placeholder="Email / Phone / Admin ID"
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
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                OTP Verification
              </span>
            </div>

            {/* Prominent Verification Code Box */}
            {activeOtp && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 mb-4 text-center shadow-inner">
                <div className="flex items-center justify-between mb-1 text-xs text-blue-800 font-medium">
                  <span>Simulated Delivery</span>
                  <span>Target: {otpTarget}</span>
                </div>
                <div className="flex items-center justify-center space-x-3 my-2">
                  <div className="font-mono text-3xl font-extrabold text-blue-900 tracking-widest bg-white px-4 py-1.5 rounded-lg border border-blue-300 shadow-sm">
                    {activeOtp}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtp(activeOtp)}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-2 rounded-lg transition shadow flex items-center space-x-1"
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
              className="w-full px-3 py-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3 text-center text-2xl font-bold tracking-widest font-mono"
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
                className="text-blue-600 hover:underline font-semibold"
              >
                Resend OTP
              </button>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleOtpVerification}
                disabled={isVerifyingOtp || otp.length < 6}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow"
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

export default AdminAuth;