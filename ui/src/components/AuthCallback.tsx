import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function AuthCallback(): JSX.Element {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('Authenticating...');

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const handleCallback = async () => {
      try {
        setLoadingMessage('Reading authorization response...');
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (!code) {
          throw new Error('No authorization code received from Microsoft Teams.');
        }

        setLoadingMessage('Exchanging authorization code for tokens...');
        const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8080';

        const resp = await fetch(`${backendUrl}/auth/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state }),
          credentials: 'include', // important for cookies
          signal: controller.signal,
        });

        // Handle backend errors clearly
        if (!resp.ok) {
          let errText: string;
          try {
            const errJson = await resp.json();
            errText = errJson?.error ?? JSON.stringify(errJson);
          } catch {
            errText = await resp.text();
          }
          throw new Error(`Token exchange failed (${resp.status}): ${errText || resp.statusText}`);
        }

        let authData: any;
        try {
          authData = await resp.json();
        } catch {
          throw new Error('Backend returned invalid JSON.');
        }

        if (!isMounted) return;
        console.log('Auth response:', authData);

        // Persist minimal session info (for convenience, but server cookie is source of truth)
        if (authData.user) {
          localStorage.setItem('user', JSON.stringify(authData.user));
        }
        if (authData.sessionId) {
          localStorage.setItem('session_id', authData.sessionId);
          console.log('Session ID stored:', authData.sessionId);
        }

        // Verify session is set on server by calling /auth/me
        setLoadingMessage('Verifying session...');
        try {
          const verifyResp = await fetch(`${backendUrl}/auth/me`, {
            method: 'GET',
            credentials: 'include', // Important: sends cookies
            headers: {
              'Accept': 'application/json',
            },
            signal: controller.signal,
          });

          if (!verifyResp.ok) {
            throw new Error(`Session verification failed (${verifyResp.status})`);
          }

          const verifyData = await verifyResp.json();
          if (!verifyData.user) {
            throw new Error('Session verification returned no user data');
          }

          console.log('Session verified successfully:', verifyData.user);
          
          // Update localStorage with verified user data
          localStorage.setItem('user', JSON.stringify(verifyData.user));

          // Dispatch custom event so App can re-check auth
          window.dispatchEvent(new Event('auth-success'));

          // Give App.tsx a moment to process the auth-success event and update state
          // Then navigate to /chat
          setTimeout(() => {
            if (isMounted) {
              console.log('Navigating to /chat after session verification');
              navigate('/chat', { replace: true });
            }
          }, 300);
        } catch (verifyErr: any) {
          if (!isMounted) return;
          console.error('Session verification failed:', verifyErr);
          throw new Error(`Failed to verify session: ${verifyErr.message}`);
        }

      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error processing auth callback:', err);
        setError(err instanceof Error ? err.message : String(err));
        setLoadingMessage('Redirecting to home...');
        setTimeout(() => {
          if (isMounted) navigate('/', { replace: true });
        }, 3000);
      }
    };

    handleCallback();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 via-white to-green-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4 break-words">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 via-white to-green-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#00B140] mx-auto mb-4"></div>
        <p className="text-lg font-medium text-gray-700">{loadingMessage}</p>
        <p className="text-sm text-gray-500 mt-2">Please wait...</p>
      </div>
    </div>
  );
}
