import { useState, useEffect } from 'react';
import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { AuthCallback } from './components/AuthCallback';
import { Header } from './components/Header';
import { ChatInterface } from './components/ChatInterface';
import { Sidebar } from './components/Sidebar';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [nextMeeting, setNextMeeting] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated on component mount
    const sessionId = localStorage.getItem('session_id');
    const user = localStorage.getItem('user');
    if (sessionId && user) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleSignIn = () => {
    // Clear any existing session
    localStorage.clear();
    
    // Use the exact redirect URI that's configured in Azure portal
    const redirectUri = 'http://localhost:8080/auth/callback';
    window.location.href = `http://localhost:8080/auth/login?redirect_uri=${encodeURIComponent(redirectUri)}`;
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    localStorage.clear();
  };

  // Protected Route component
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  };

  // Main App Layout component
  const AppLayout = () => (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-mint-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-300">
        <Header 
          darkMode={darkMode} 
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          onSignOut={handleSignOut}
        />
        
        <div className="container mx-auto px-4 py-6 max-w-[1400px]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
            {/* Main Chat Area */}
            <div className="lg:col-span-2">
              <ChatInterface 
                selectedParticipants={selectedParticipants}
                setSelectedParticipants={setSelectedParticipants}
                onMeetingScheduled={setNextMeeting}
              />
            </div>
            
            {/* Sidebar */}
            <div className="lg:col-span-1 hidden lg:block">
              <Sidebar 
                selectedParticipants={selectedParticipants}
                nextMeeting={nextMeeting}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Router>
      <Routes>
        {/* Landing Page - Public Route */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <LandingPage onSignIn={handleSignIn} />
          } 
        />

        {/* Auth Callback - Public Route */}
        <Route 
          path="/auth/callback" 
          element={<AuthCallback />} 
        />

        {/* Dashboard - Protected Route */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster />
    </Router>
  );
}
