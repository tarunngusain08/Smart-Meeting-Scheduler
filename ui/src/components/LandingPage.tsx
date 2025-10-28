import { useState } from 'react';
import { Bot, Globe, Zap, Users } from 'lucide-react';

interface LandingPageProps {
  onGetStarted?: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [isHoveringButton, setIsHoveringButton] = useState(false);

  const handleSignIn = () => {
    // Clear any existing state
    localStorage.clear();
    
    // Add beautiful fade-out animation before redirect
    const overlay = document.createElement('div');
    overlay.className = 'redirect-overlay';
    overlay.innerHTML = `
      <div class="redirect-content">
        <div class="redirect-spinner"></div>
        <p class="redirect-text">Connecting to Microsoft Teams...</p>
      </div>
    `;
    document.body.appendChild(overlay);
    
    // Redirect after animation starts
    setTimeout(() => {
      const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
      window.location.href = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/auth/login?redirect_uri=${redirectUri}`;
    }, 600);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-green-50">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        {/* Blob 1 - Top Right */}
        <div
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-30 animate-blob"
          style={{
            top: '80px',
            right: '80px',
            background: '#BBF7D0',
            mixBlendMode: 'multiply',
          }}
        />
        
        {/* Blob 2 - Bottom Left */}
        <div
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 animate-blob"
          style={{
            bottom: '80px',
            left: '80px',
            background: '#A7F3D0',
            mixBlendMode: 'multiply',
            animationDelay: '2s',
          }}
        />
        
        {/* Blob 3 - Center */}
        <div
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-40 animate-blob"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#DCFCE7',
            mixBlendMode: 'multiply',
            animationDelay: '4s',
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto p-6">
        <div className="flex items-center space-x-3">
          {/* Logo Container */}
          <div
            className="w-12 h-12 rounded-2xl bg-[#4A8456] shadow-lg flex items-center justify-center cursor-pointer transition-all duration-500 hover:scale-110 hover:rotate-3 hover:shadow-xl overflow-hidden p-2"
          >
            <img
              src="/images/gruve-logo.png"
              alt="Gruve Logo"
              className="w-full h-full object-contain rounded-xl transition-transform duration-500"
            />
          </div>
          
          {/* Brand Text */}
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-[#111827]">Gruve</span>
            <span className="text-sm text-[#6B7280] ml-1">Scheduler</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-16 pb-24 text-center">
        {/* AI Badge */}
        <div className="inline-flex items-center space-x-2 bg-[#F0FDF4] border border-[#BBF7D0] rounded-full px-4 py-2 mb-8 animate-fadeInUp">
          <Bot className="w-4 h-4 text-[#059669]" />
          <span className="text-sm font-medium text-[#047857]">AI-Powered Scheduling</span>
        </div>

        {/* Hero Headline */}
        <h1 
          className="text-3xl md:text-5xl font-bold mb-6 animate-fadeInScale"
          style={{
            lineHeight: '1.1',
            letterSpacing: '-0.02em',
            animationDelay: '200ms',
          }}
        >
          <span className="text-[#111827]">Smart scheduling</span>
          <br />
          <span className="text-[#00B140]">made easy with AI</span>
        </h1>

        {/* Subheadline */}
        <p 
          className="text-lg md:text-xl text-[#6B7280] max-w-2xl mx-auto mb-12 animate-fadeIn"
          style={{
            lineHeight: '1.6',
            animationDelay: '400ms',
          }}
        >
          Say goodbye to endless back-and-forth emails. Let AI find the perfect meeting times for everyone, across any timezone.
        </p>

        {/* Primary CTA Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleSignIn}
            onMouseEnter={() => setIsHoveringButton(true)}
            onMouseLeave={() => setIsHoveringButton(false)}
            className="inline-flex items-center space-x-3 px-6 md:px-8 py-3 md:py-4 rounded-xl border-2 bg-white shadow-sm transition-all duration-300 cursor-pointer"
            style={{
              borderColor: isHoveringButton ? '#00B140' : '#D1D5DB',
              boxShadow: isHoveringButton 
                ? '0 20px 25px rgba(0, 177, 64, 0.15)' 
                : '0 1px 2px rgba(0, 0, 0, 0.05)',
              transform: isHoveringButton ? 'scale(1.05)' : 'scale(1.0)',
            }}
          >
            {/* Microsoft Teams Icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="9" height="9" rx="1" fill="#5059C9" />
              <rect x="13" y="2" width="9" height="9" rx="1" fill="#7B68EE" />
              <rect x="2" y="13" width="9" height="9" rx="1" fill="#00BCF2" />
              <rect x="13" y="13" width="9" height="9" rx="1" fill="#28A745" />
              <circle cx="12" cy="12" r="5" fill="white" />
              <path d="M10 12L11.5 13.5L14 10.5" stroke="#5059C9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            
            <span className="text-base md:text-lg font-semibold text-[#374151]">
              Sign in with Microsoft Teams
            </span>
          </button>
          
          <p className="text-sm text-[#6B7280] mt-2">
            Secure enterprise SSO authentication
          </p>
        </div>
      </main>

      {/* Feature Grid Section */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 mt-20 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature Card 1: Cross-Timezone Intelligence */}
          <div className="bg-white border border-[#F3F4F6] rounded-2xl p-8 shadow-sm transition-shadow duration-300 hover:shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-[#DCFCE7] flex items-center justify-center mb-6">
              <Globe className="w-6 h-6 text-[#059669]" strokeWidth={2} />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-[#111827] mb-4" style={{ lineHeight: '1.4' }}>
              Cross-Timezone Intelligence
            </h3>
            <p className="text-base text-[#6B7280]" style={{ lineHeight: '1.6' }}>
              Automatically finds optimal meeting times across multiple time zones with AI precision.
            </p>
          </div>

          {/* Feature Card 2: Lightning Fast */}
          <div className="bg-white border border-[#F3F4F6] rounded-2xl p-8 shadow-sm transition-shadow duration-300 hover:shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-[#DCFCE7] flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-[#059669]" strokeWidth={2} />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-[#111827] mb-4" style={{ lineHeight: '1.4' }}>
              Lightning Fast
            </h3>
            <p className="text-base text-[#6B7280]" style={{ lineHeight: '1.6' }}>
              Schedule meetings in seconds instead of days. No more endless email chains.
            </p>
          </div>

          {/* Feature Card 3: Team Collaboration */}
          <div className="bg-white border border-[#F3F4F6] rounded-2xl p-8 shadow-sm transition-shadow duration-300 hover:shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-[#DCFCE7] flex items-center justify-center mb-6">
              <Users className="w-6 h-6 text-[#059669]" strokeWidth={2} />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-[#111827] mb-4" style={{ lineHeight: '1.4' }}>
              Team Collaboration
            </h3>
            <p className="text-base text-[#6B7280]" style={{ lineHeight: '1.6' }}>
              Coordinate seamlessly with multiple participants and team members.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 mt-16 text-center">
        <p className="text-sm text-[#6B7280]">
          © 2025 Gruve Scheduler. All rights reserved.
        </p>
      </footer>

      {/* Custom Animations */}
      <style>{`
        @keyframes blob {
          0%, 100% { 
            transform: translate(0, 0) scale(1); 
          }
          33% { 
            transform: translate(30px, -50px) scale(1.1); 
          }
          66% { 
            transform: translate(-20px, 20px) scale(0.9); 
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-blob {
          animation: blob 7s ease-in-out infinite;
        }

        .animate-fadeInUp {
          animation: fadeInUp 500ms ease-out forwards;
        }

        .animate-fadeInScale {
          animation: fadeInScale 600ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-fadeIn {
          animation: fadeIn 500ms ease-out forwards;
        }

        /* Redirect Animation Styles */
        .redirect-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: linear-gradient(135deg, rgba(74, 132, 86, 0.95), rgba(16, 185, 129, 0.95));
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeInOverlay 0.4s ease-out forwards;
        }

        @keyframes fadeInOverlay {
          from {
            opacity: 0;
            backdrop-filter: blur(0px);
          }
          to {
            opacity: 1;
            backdrop-filter: blur(10px);
          }
        }

        .redirect-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .redirect-spinner {
          width: 60px;
          height: 60px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .redirect-text {
          color: white;
          font-size: 1.125rem;
          font-weight: 600;
          text-align: center;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        /* Respect user's motion preferences */
        @media (prefers-reduced-motion: reduce) {
          .animate-blob,
          .animate-fadeInUp,
          .animate-fadeInScale,
          .animate-fadeIn {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
