import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code and state from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (!code) {
          throw new Error('No authorization code received from Microsoft Teams');
        }

        // Exchange the code for tokens
        const response = await fetch('http://localhost:8080/auth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state }),
          credentials: 'include', // Important for cookie handling
        });

        if (!response.ok) {
          throw new Error('Failed to exchange code for tokens');
        }

        const authData = await response.json();
        console.log('Auth response:', authData);
        
        // Store the session and user data
        if (authData.user) {
          localStorage.setItem('user', JSON.stringify(authData.user));
        }
        if (authData.sessionId) {
          localStorage.setItem('session_id', authData.sessionId);
          console.log('Session ID stored:', authData.sessionId);
        }

        // Add a small delay to ensure storage is complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Dispatch custom event to notify App component
        window.dispatchEvent(new Event('auth-success'));
        
        // Navigate to chat interface
        console.log('Redirecting to chat interface...');
        navigate('/chat', { replace: true });
      } catch (error) {
        console.error('Error processing auth callback:', error);
        setError(error instanceof Error ? error.message : 'Authentication failed');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 via-white to-green-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 via-white to-green-50">
      <div className="text-center">
        {/* <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#00B140] mx-auto mb-4"></div>
        <p className="text-lg font-medium text-gray-700">Authenticating with Microsoft Teams...</p>
        <p className="text-sm text-gray-500 mt-2">Please wait</p> */}
      </div>
    </div>
  );
}

