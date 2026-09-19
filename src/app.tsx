import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/landingPage';
import PatientAuth from './pages/auth/patientauth';
import DoctorAuth from './pages/auth/doctorauth';
import AdminAuth from './pages/auth/adminauth';
import PatientDashboard from './pages/dashboards/patientdashbo';
import DoctorDashboard from './pages/dashboards/doctordashbo';
import AdminDashboard from './pages/dashboards/adimindashbo';
import { AuthProvider } from './contexts/authcontext';
import { DataProvider } from './contexts/datacontext';
import { LanguageProvider } from './contexts/languagecontext';
import ProtectedRoute from './components/protectedroute';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <DataProvider>
          <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/patient/auth" element={<PatientAuth />} />
              <Route path="/doctor/auth" element={<DoctorAuth />} />
              <Route path="/admin/auth" element={<AdminAuth />} />
              <Route 
                path="/patient/dashboard" 
                element={
                  <ProtectedRoute role="patient">
                    <PatientDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/doctor/dashboard" 
                element={
                  <ProtectedRoute role="doctor">
                    <DoctorDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/dashboard" 
                element={
                  <ProtectedRoute role="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
          </Router>
        </DataProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;