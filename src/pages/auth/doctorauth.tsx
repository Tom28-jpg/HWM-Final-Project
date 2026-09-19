import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/authcontext';
import { useData } from '../../contexts/datacontext';
import { Stethoscope, ArrowLeft, Mail, Lock, User, Building2, FileText, Trash2, Shield, Phone } from 'lucide-react';

const DoctorAuth: React.FC = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { hospitals } = useData();
  const [isLogin, setIsLogin] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpStep, setOtpStep] = useState<'signup' | 'delete'>('signup');
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

  const sendOTP = (phone: string) => {
    const generatedOtp = generateOTP();
    console.log(`OTP sent to ${phone}: ${generatedOtp}`);
    alert(`OTP sent to ${phone}: ${generatedOtp}`);
    return generatedOtp;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      if (isLogin) {
        const result = await login(formData.email, formData.password, 'doctor');
        if (result.success) {
          navigate('/doctor/dashboard');
        } else {
          setMessage(result.message || 'The entered details do not match our database. Please check and try again.');
        }
      } else {
        if (formData.password !== formData.confirmPassword) {
          setMessage('Passwords do not match');
          setIsLoading(false);
          return;
        }

        const generatedOtp = sendOTP(formData.phone);
        localStorage.setItem('signup_otp', generatedOtp);
        localStorage.setItem('signup_data', JSON.stringify(formData));
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
    
    setTimeout(() => {
      const storedOtp = localStorage.getItem(`${otpStep}_otp`);
      
      if (otp !== storedOtp) {
        setIsVerifyingOtp(false);
        setMessage('Invalid OTP. Please try again.');
        return;
      }

      if (otpStep === 'signup') {
        const storedData = localStorage.getItem('signup_data');
        if (storedData) {
          const signupData = JSON.parse(storedData);
          const result = register(signupData, 'doctor');
          
          if (result.success && result.userId) {
            setGeneratedId(result.userId);
            localStorage.removeItem('signup_otp');
            localStorage.removeItem('signup_data');
            setShowOtpModal(false);
            
            // Add doctor to the doctors list in DataContext
            const doctorData = {
              ...signupData,
              userId: result.userId,
              hospitalName: hospitals.find(h => h.id === signupData.hospitalId)?.name || '',
              isActive: true,
              rating: 5.0,
              totalPatients: 0
            };
            
            // Store doctor data in localStorage for DataContext
            const existingDoctors = JSON.parse(localStorage.getItem('wizards_doctors') || '[]');
            existingDoctors.push(doctorData);
            localStorage.setItem('wizards_doctors', JSON.stringify(existingDoctors));
            
            setTimeout(() => {
              const loginResult = login(signupData.email, signupData.password, 'doctor');
              if (loginResult.success) {
                navigate('/doctor/dashboard');
              }
            }, 100);
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
    }, 1500);
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

    const generatedOtp = sendOTP(user.phone);
    localStorage.setItem('delete_otp', generatedOtp);
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

        {/* Message Display */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-center transition-all duration-300 ${
            message.includes('successful') || generatedId
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

              <div className="transform transition-all duration-300 hover:scale-105">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hospital/Clinic *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    name="hospitalId"
                    value={formData.hospitalId}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                    required
                  >
                    <option value="">Select Hospital</option>
                    {hospitals.map(hospital => (
                      <option key={hospital.id} value={hospital.id}>
                        {hospital.name}
                      </option>
                    ))}
                  </select>
                </div>
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
            {isLoading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
            <h3 className="text-lg font-semibold mb-4">
              {otpStep === 'signup' ? 'Verify Phone Number' : 'Verify Account Deletion'}
            </h3>
            <p className="text-gray-600 mb-4">
              Enter the 6-digit OTP sent to your phone number
            </p>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent mb-4 text-center text-lg tracking-widest"
              placeholder="000000"
              maxLength={6}
            />
            <div className="flex space-x-2">
              <button
                onClick={handleOtpVerification}
                disabled={isVerifyingOtp}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifyingOtp ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  'Verify OTP'
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
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default DoctorAuth;