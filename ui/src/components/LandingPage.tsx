import { Bot, Globe, Zap, Users } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-20 right-20 w-96 h-96 bg-green-100 rounded-full opacity-30 blur-3xl animate-blob"
          style={{ mixBlendMode: 'multiply' }}
        />
        <div 
          className="absolute bottom-20 left-20 w-96 h-96 bg-green-200 rounded-full opacity-20 blur-3xl animate-blob-delay-2s"
          style={{ mixBlendMode: 'multiply' }}
        />
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-50 rounded-full opacity-40 blur-3xl animate-blob-delay-4s"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center space-x-3">
            {/* Gruve Logo */}
            <div className="w-12 h-12 bg-[#5b9a68] rounded-xl shadow-lg flex items-center justify-center hover:scale-110 hover:rotate-3 transition-transform duration-300 cursor-pointer overflow-hidden">
                <img
                  src="/images/gruve-logo.png"
                  alt="Gruve Logo"
                  className="w-8 h-8 object-contain"
                />
              </div>
            
            <div>
              <span className="text-2xl font-bold text-gray-900">Gruve</span>
              <span className="text-s text-gray-500 ml-1">Scheduler</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center">
          {/* AI Badge */}
          <div className="inline-flex items-center space-x-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 mb-8">
            <Bot className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">AI-Powered Scheduling</span>
          </div>

          {/* Hero Headline */}
          <h1 className="text-5xl md:text-2xl font-bold text-center mb-6">
            <span className="text-gray-900">Smart scheduling</span>
            <br />
            <span className="text-[#00B140]">made easy with AI</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-600 max-w-2xl mx-auto text-center mb-12">
            Say goodbye to endless back-and-forth emails. Let AI find the perfect meeting times for everyone, across any timezone.
          </p>

          {/* Microsoft Teams Login Button */}
          <div className="mb-8">
            <button
              onClick={() => {
                // Clear any existing session
                localStorage.clear();
                
                // Use the exact redirect URI that's configured in Azure portal
                const redirectUri = 'http://localhost:8080/auth/callback'; // This must match Azure exactly
                window.location.href = `http://localhost:8080/auth/login?redirect_uri=${encodeURIComponent(redirectUri)}`;
              }}
              className="group inline-flex items-center space-x-3 bg-white border-2 border-gray-300 rounded-xl px-8 py-4 text-lg font-semibold text-gray-700 hover:border-[#00B140] hover:shadow-xl transform hover:scale-105 transition-all duration-300 cursor-pointer"
            >
              {/* Microsoft Teams Icon */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="9" height="9" rx="1" fill="#5059C9"/>
                <rect x="13" y="2" width="9" height="9" rx="1" fill="#7B68EE"/>
                <rect x="2" y="13" width="9" height="9" rx="1" fill="#00BCF2"/>
                <rect x="13" y="13" width="9" height="9" rx="1" fill="#28A745"/>
                <circle cx="12" cy="12" r="6" fill="white"/>
                <path d="M9 12l2 2 4-4" stroke="#5059C9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Sign in with Microsoft Teams</span>
            </button>
            <p className="text-sm text-gray-500 mt-2">Secure enterprise SSO authentication</p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 mb-20">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <Globe className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Cross-Timezone Intelligence</h3>
              <p className="text-gray-600">
                Automatically finds optimal meeting times across multiple time zones with AI precision.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Lightning Fast</h3>
              <p className="text-gray-600">
                Schedule meetings in seconds instead of days. No more endless email chains.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Team Collaboration</h3>
              <p className="text-gray-600">
                Coordinate seamlessly with multiple participants and team members.
              </p>
            </div>
          </div>

          {/* Statistics Section */}
          {/* <div className="bg-gradient-to-r from-[#00B140] to-green-600 rounded-3xl p-12 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-white text-center">
              <div>
                <div className="text-5xl font-bold mb-2">10×</div>
                <div className="text-green-100">Faster Scheduling</div>
              </div>
              <div>
                <div className="text-5xl font-bold mb-2">95%</div>
                <div className="text-green-100">Time Saved</div>
              </div>
              <div>
                <div className="text-5xl font-bold mb-2">24/7</div>
                <div className="text-green-100">AI Assistance</div>
              </div>
            </div>
          </div> */}
        </div>
      

      {/* Footer */}
      <footer className="relative z-10 text-center text-sm text-gray-500 py-8 mt-16">
        <p>© 2025 Gruve Scheduler. All rights reserved.</p>
      </footer>
    </main>

    </div>
  );
}