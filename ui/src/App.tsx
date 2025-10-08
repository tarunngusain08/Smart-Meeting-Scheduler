import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { ChatInterface } from './components/ChatInterface';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleSignIn = () => {
    setIsAuthenticated(true);
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen">
      {isAuthenticated ? (
        <ChatInterface onSignOut={handleSignOut} />
      ) : (
        <LandingPage onSignIn={handleSignIn} />
      )}
    </div>
  );
}