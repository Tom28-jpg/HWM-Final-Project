import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Stethoscope, 
  Building2, 
  Ambulance, 
  Clock, 
  Shield, 
  Users, 
  MapPin 
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const userRoles = [
    {
      id: 'patient',
      title: 'Patient',
      icon: Heart,
      description: 'Book appointments, check symptoms, find hospitals',
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700',
    },
    {
      id: 'doctor',
      title: 'Doctor',
      icon: Stethoscope,
      description: 'Manage patients, appointments, and medical records',
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700',
    },
    {
      id: 'admin',
      title: 'Hospital Admin',
      icon: Building2,
      description: 'Manage hospital resources, staff, and operations',
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700',
    },
    {
      id: 'ambulance',
      title: 'Emergency Services',
      icon: Ambulance,
      description: 'Emergency response and patient transport',
      color: 'bg-gradient-to-br from-red-500 to-red-600',
      hoverColor: 'hover:from-red-600 hover:to-red-700',
    },
  ];

  const handleRoleSelect = (roleId: string) => {
    if (roleId === 'ambulance') {
      // For ambulance, show emergency interface (placeholder)
      alert('Emergency services interface would be available here');
      return;
    }
    navigate(`/${roleId}/auth`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <header className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white p-3 rounded-full shadow-lg mr-4 animate-pulse">
              <Heart className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800">HWM</h1>
          </div>
          <p className="text-xl text-gray-600 mb-4">
            Health Wizard Management System
          </p>
          <p className="text-lg text-gray-500 mb-4">
            Comprehensive Digital Healthcare Platform
          </p>
          <div className="flex items-center justify-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-2" />
            <span>
              {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
            </span>
          </div>
        </header>

        {/* Features Banner */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-12 transform transition-all duration-300 hover:scale-105">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex items-center justify-center space-x-3 transform transition-all duration-300 hover:scale-105">
              <Shield className="h-6 w-6 text-green-600" />
              <span className="text-gray-700">Secure & HIPAA Compliant</span>
            </div>
            <div className="flex items-center justify-center space-x-3 transform transition-all duration-300 hover:scale-105">
              <Users className="h-6 w-6 text-blue-600" />
              <span className="text-gray-700">Multi-Role Access</span>
            </div>
            <div className="flex items-center justify-center space-x-3 transform transition-all duration-300 hover:scale-105">
              <MapPin className="h-6 w-6 text-red-600" />
              <span className="text-gray-700">Location-Based Services</span>
            </div>
          </div>
        </div>

        {/* User Role Selection */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-8 animate-fade-in">
            Choose Your Access Portal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userRoles.map((role) => {
              const IconComponent = role.icon;
              return (
                <div
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className={`
                    ${role.color} ${role.hoverColor}
                    p-8 rounded-2xl shadow-lg cursor-pointer transform transition-all duration-300
                    hover:scale-105 hover:shadow-xl animate-fade-in
                  `}
                >
                  <div className="text-center text-white">
                    <div className="bg-white/20 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center animate-pulse">
                      <IconComponent className="h-10 w-10" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{role.title}</h3>
                    <p className="text-white/90 text-sm">{role.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="mt-12 text-center animate-fade-in">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto transform transition-all duration-300 hover:scale-105">
            <h3 className="text-red-800 font-semibold mb-2">Emergency Hotline</h3>
            <p className="text-2xl font-bold text-red-600">108</p>
            <p className="text-sm text-red-700">Available 24/7 for medical emergencies</p>
          </div>
        </div>
      </div>

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
          animation: fadeIn 0.8s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;