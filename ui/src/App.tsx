import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { ChatInterface } from './components/ChatInterface';
import { AuthCallback } from './components/AuthCallback';

interface AuthResponse {
  access_token: string;
  id_token: string;
  user: {
    email: string;
    name: string;
  };
}

interface PrivateRouteProps {
  children: React.ReactNode;
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const isAuthenticated = localStorage.getItem('access_token') !== null;
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('access_token'));
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);

  // Check auth status on mount and when localStorage changes
  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      setIsAuthenticated(true);
      // Fetch user info from backend
      fetch('http://localhost:8080/graph/me', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Invalid token');
      })
      .then(userData => {
        setUser(userData);
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('id_token');
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

    // Listen for storage changes (e.g., when AuthCallback sets tokens)
    const handleStorageChange = () => {
      const token = localStorage.getItem('access_token');
      setIsAuthenticated(!!token);
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
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    window.location.href = '/';
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/auth/callback"
          element={<AuthCallback />} 
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
