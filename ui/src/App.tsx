import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { ChatInterface } from './components/ChatInterface';
import { AuthCallback } from './components/AuthCallback';

interface PrivateRouteProps {
  children: React.ReactNode;
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const hasSession = localStorage.getItem('session_id') !== null;
  const user = localStorage.getItem('user');
  console.log('PrivateRoute - Session ID exists:', hasSession);
  console.log('PrivateRoute - User exists:', !!user);
  return hasSession && user ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const sessionId = localStorage.getItem('session_id');
    const user = localStorage.getItem('user');
    return !!(sessionId && user);
  });

  // Check auth status on mount and when localStorage changes
  useEffect(() => {
    const sessionId = localStorage.getItem('session_id');
    const storedUser = localStorage.getItem('user');
    
    if (sessionId && storedUser) {
      setIsAuthenticated(true);
      // Fetch user info to validate session
      fetch('http://localhost:8080/graph/me', {
        credentials: 'include'
      })
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Invalid token');
      })
      .then(userData => {
        // Store fresh user data
        localStorage.setItem('user', JSON.stringify(userData));
      })
      .catch(() => {
        // Clear all auth data on error
        localStorage.removeItem('session_id');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
    } else {
      setIsAuthenticated(false);
      setIsLoading(false);
    }

    // Listen for storage changes (e.g., when AuthCallback sets session)
    const handleStorageChange = () => {
      const sessionId = localStorage.getItem('session_id');
      const user = localStorage.getItem('user');
      setIsAuthenticated(!!(sessionId && user));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch('http://localhost:8080/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      console.log('Sign out API called');
    } catch (err) {
      console.error('Sign out API error', err);
    }
    // Clear all auth data
    localStorage.removeItem('session_id');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/chat" /> : <LandingPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/chat"
          element={
            <PrivateRoute>
              <ChatInterface onSignOut={handleSignOut} />
            </PrivateRoute>
          }
        />
        <Route
          path="/chat" 
          element={
            <PrivateRoute>
              <ChatInterface onSignOut={handleSignOut} />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Navigate to="/chat" replace />
            ) : (
              isLoading ? (
                <div className="flex items-center justify-center h-screen">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
              ) : (
                <LandingPage />
              )
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}
