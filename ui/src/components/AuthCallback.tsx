import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function AuthCallback() {
  const navigate = useNavigate();

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
        
        // Store the tokens
        localStorage.setItem('access_token', authData.access_token);
        localStorage.setItem('id_token', authData.id_token);
        if (authData.user) {
          localStorage.setItem('user', JSON.stringify(authData.user));
        }

        // Navigate to the chat interface
        navigate('/chat', { replace: true });
      } catch (error) {
        console.error('Error processing auth callback:', error);
        navigate('/', { 
          replace: true,
          state: { error: 'Authentication failed. Please try again.' }
        });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
    </div>
  );
}
