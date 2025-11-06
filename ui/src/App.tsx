import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { AuthCallback } from './components/AuthCallback';
import { Header } from './components/Header';
import { ChatInterface } from './components/ChatInterface';
import { Sidebar } from './components/Sidebar';
import { LeftSidebar } from './components/LeftSidebar';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [nextMeeting, setNextMeeting] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated by checking for session_id
    const checkAuth = () => {
      const sessionId = localStorage.getItem('session_id');
      const user = localStorage.getItem('user');
      
      console.log('Checking authentication...', { sessionId: !!sessionId, user: !!user });
      
      // Only consider authenticated if BOTH session_id and user exist
      if (sessionId && user) {
        try {
          const userData = JSON.parse(user);
          console.log('User authenticated:', userData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Invalid user data in localStorage:', error);
          localStorage.removeItem('session_id');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
        }
      } else {
        console.log('No valid authentication found - showing landing page');
        // Clear any partial data
        localStorage.removeItem('session_id');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAuth();

    // Listen for storage changes (for when AuthCallback updates localStorage)
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event from AuthCallback
    window.addEventListener('auth-success', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-success', handleStorageChange);
    };
  }, []);

  // Apply dark mode to html and body elements for full-screen coverage
  useEffect(() => {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;
    
    if (darkMode && isAuthenticated) {
      htmlElement.classList.add('dark');
      htmlElement.style.backgroundColor = '';
      bodyElement.classList.add('dark');
      bodyElement.style.backgroundColor = '';
    } else {
      htmlElement.classList.remove('dark');
      htmlElement.style.backgroundColor = '';
      bodyElement.classList.remove('dark');
      bodyElement.style.backgroundColor = '';
    }

    return () => {
      // Cleanup on unmount
      htmlElement.classList.remove('dark');
      bodyElement.classList.remove('dark');
    };
  }, [darkMode, isAuthenticated]);

  const handleLogout = () => {
    // Add professional logout animation
    const overlay = document.createElement('div');
    overlay.className = 'logout-overlay';
    overlay.innerHTML = `
      <div class="logout-content">
        <div class="logout-icon">✓</div>
        <p class="logout-text">Signed Out Successfully</p>
        <p class="logout-subtext">Redirecting to home...</p>
      </div>
    `;
    document.body.appendChild(overlay);
    
    // Logout and remove overlay after animation
    setTimeout(() => {
      // Clear authentication data
      localStorage.removeItem('session_id');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      
      // Remove overlay
      overlay.remove();
      
      // Call backend logout endpoint
      fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      }).catch(err => console.error('Logout error:', err));
    }, 1500);
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return null; // Silent loading - no ugly spinner
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page Route */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Navigate to="/chat" replace />
            ) : (
              <LandingPage />
            )
          } 
        />

        {/* Auth Callback Route */}
        <Route 
          path="/auth/callback" 
          element={<AuthCallback />} 
        />

        {/* Chat Interface Route (Protected) */}
        <Route
          path="/chat"
          element={
            !isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <div className={darkMode ? 'dark' : ''}>
                <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 transition-colors duration-300 overflow-auto">
                  <Header 
                    darkMode={darkMode} 
                    onToggleDarkMode={() => setDarkMode(!darkMode)}
                    onLogout={handleLogout}
                  />
                  
                  <div className="w-full px-4 py-6">
                    <div className="flex flex-row gap-6 h-[calc(100vh-120px)] max-w-[2000px] mx-auto">
                      {/* Left Sidebar - Compact */}
                      <aside className="w-56 xl:w-64 flex-shrink-0" style={{ width: '18rem', minWidth: '11rem', maxWidth: '110rem' }}>
                        <LeftSidebar 
                          onQuickAction={(action) => {
                            if ((window as any).__chatInterfaceHandlers) {
                              (window as any).__chatInterfaceHandlers.handleQuickAction(action);
                            }
                          }}
                          onScheduleMeeting={() => {
                            if ((window as any).__chatInterfaceHandlers) {
                              (window as any).__chatInterfaceHandlers.triggerScheduleMeeting();
                            }
                          }}
                        />
                      </aside>
                      
                      {/* Main Chat Area - More space */}
                      <main className="flex-1 min-w-0 max-w-[1200px]">
                        <ChatInterface 
                          selectedParticipants={selectedParticipants}
                          setSelectedParticipants={setSelectedParticipants}
                          onMeetingScheduled={setNextMeeting}
                        />
                      </main>
                      
                      {/* Right Sidebar - Compact (40% smaller total) */}
                      <aside className="w-44 xl:w-52 flex-shrink-0" style={{ width: '25rem', minWidth: '11rem', maxWidth: '110rem' }}>
                        <Sidebar 
                          selectedParticipants={selectedParticipants}
                          nextMeeting={nextMeeting}
                        />
                      </aside>
                    </div>
                  </div>
                  
                  <Toaster />
                </div>
              </div>
            )
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
