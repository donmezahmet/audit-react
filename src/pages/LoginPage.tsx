import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { Button, Input } from '@/components/ui';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleExternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        const currentRole = useAuthStore.getState().role;
        navigate(currentRole === 'team' ? '/my-actions' : '/');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Disabled - do nothing
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main Content - No Box Design */}
      <div className="relative z-10 w-full max-w-sm md:max-w-sm space-y-4 md:space-y-6">
        {/* Logo placeholder - removed logo image */}
        <div className="flex justify-center animate-logo-entrance">
          <div className="relative group cursor-pointer">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-white/30 rounded-full blur-2xl md:blur-2xl group-hover:blur-3xl transition-all duration-500 animate-pulse-glow"></div>
            {/* Rotating ring */}
            <div className="absolute -inset-2 border-2 border-white/20 rounded-full animate-spin-slow"></div>
            {/* Main logo placeholder */}
            <div className="relative inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-white rounded-full shadow-2xl transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 animate-bounce-gentle">
              <svg className="w-12 h-12 md:w-16 md:h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            {/* Sparkle effects */}
            <div className="absolute -top-2 -right-2 w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full animate-sparkle-1"></div>
            <div className="absolute -bottom-2 -left-2 w-1.5 h-1.5 md:w-2 md:h-2 bg-pink-400 rounded-full animate-sparkle-2"></div>
          </div>
        </div>

        {/* Title - Animated */}
        <div className="text-center space-y-1 md:space-y-2 animate-title-entrance">
          <h1 className="text-[16px] md:text-[24px] font-bold text-white drop-shadow-lg transform hover:scale-105 transition-transform duration-300">
            Audit & Corporate Security
          </h1>
          <p className="text-blue-200 text-xs md:text-sm font-medium animate-fade-in-delay">
            Dashboard Login
          </p>
        </div>

        {/* Buttons - Floating Design */}
        <div className="space-y-3 md:space-y-4 flex flex-col items-center">
          {/* Google Button - Disabled */}
          <button
            onClick={handleGoogleLogin}
            disabled
            className="w-full max-w-[280px] md:max-w-full group relative overflow-hidden bg-gray-300 text-gray-500 font-semibold py-3 md:py-4 px-4 md:px-6 rounded-xl md:rounded-2xl shadow-2xl cursor-not-allowed opacity-50 flex items-center justify-center gap-2.5 md:gap-3 animate-button-entrance"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            
            <svg className="w-5 h-5 md:w-6 md:h-6 relative z-10 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300 animate-icon-bounce" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="relative z-10 text-sm md:text-base group-hover:tracking-wide transition-all duration-300">Continue with Google</span>
          </button>

          {/* Divider - Animated */}
          <div className="flex items-center justify-center gap-2 md:gap-3 my-1.5 md:my-2 animate-divider-entrance">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/30 to-white/20"></div>
            <span className="text-white/70 text-[10px] md:text-xs font-semibold px-2 md:px-3 py-0.5 md:py-1 bg-white/10 rounded-full backdrop-blur-sm transform hover:scale-110 transition-transform duration-300 cursor-default">or</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/30 to-white/20"></div>
          </div>

          {/* External Login Button - Fun & Animated */}
          <button
            onClick={() => setShowExternalModal(true)}
            className="w-full max-w-[280px] md:max-w-full group relative overflow-hidden bg-white/10 hover:bg-white/15 backdrop-blur-xl text-white font-semibold py-3 md:py-4 px-4 md:px-6 rounded-xl md:rounded-2xl border border-white/20 hover:border-white/30 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-2.5 md:gap-3 transform hover:scale-[1.03] hover:-translate-y-2 active:scale-[0.97] animate-button-entrance-delay"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-white/10 rounded-xl md:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
            
            {/* Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            
            <svg className="w-4 h-4 md:w-5 md:h-5 relative z-10 group-hover:scale-125 group-hover:rotate-[-15deg] transition-all duration-300 animate-key-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span className="relative z-10 text-sm md:text-base group-hover:tracking-wide transition-all duration-300">External User Login</span>
          </button>
        </div>

        {/* Help Text - Animated */}
        <div className="text-center pt-1 md:pt-2 animate-fade-in-delay-2">
          <p className="text-blue-200/80 text-[10px] md:text-xs transform hover:scale-105 transition-transform duration-300 inline-block">
            Use external login to access the dashboard
          </p>
        </div>
      </div>

      {/* Footer - Production Style */}
      <div className="absolute bottom-6 md:bottom-8 left-0 right-0 text-center">
        <div className="inline-flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2 md:py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
          <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <span className="text-blue-100 text-xs md:text-sm font-medium">
            Developed by Audit Technology Team
          </span>
        </div>
      </div>

      {/* External Login Modal */}
      {showExternalModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => {
            setShowExternalModal(false);
            setError('');
            setEmail('');
            setPassword('');
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-modal-enter"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-center">
            <button
              onClick={() => {
                setShowExternalModal(false);
                setError('');
                setEmail('');
                setPassword('');
              }}
                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

              <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl mb-3">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-sm font-bold text-white mb-1">External User Login</h2>
              <p className="text-blue-100 text-sm">Enter your credentials to continue</p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
            {error && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleExternalSubmit} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  fullWidth
                  autoComplete="new-email"
                  leftIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  }
                />
              </div>

              <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <a href="/reset-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Forgot password?
                    </a>
                  </div>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  fullWidth
                  autoComplete="new-password"
                  leftIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isLoading}
                size="lg"
                  className="mt-4"
              >
                Sign In
              </Button>
            </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes logo-entrance {
          0% { 
            opacity: 0;
            transform: scale(0) rotate(-180deg);
          }
          60% {
            transform: scale(1.1) rotate(10deg);
          }
          100% { 
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }
        .animate-logo-entrance {
          animation: logo-entrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 3s ease-in-out infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        @keyframes sparkle-1 {
          0%, 100% { 
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% { 
            opacity: 1;
            transform: scale(1) rotate(180deg);
          }
        }
        .animate-sparkle-1 {
          animation: sparkle-1 2s ease-in-out infinite;
        }
        @keyframes sparkle-2 {
          0%, 100% { 
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% { 
            opacity: 1;
            transform: scale(1) rotate(-180deg);
          }
        }
        .animate-sparkle-2 {
          animation: sparkle-2 2.5s ease-in-out infinite 0.5s;
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        @keyframes title-entrance {
          from { 
            opacity: 0;
            transform: translateY(-20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-title-entrance {
          animation: title-entrance 0.6s ease-out 0.3s both;
        }
        @keyframes button-entrance {
          from { 
            opacity: 0;
            transform: translateX(-30px) scale(0.9);
          }
          to { 
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        .animate-button-entrance {
          animation: button-entrance 0.5s ease-out 0.5s both;
        }
        @keyframes button-entrance-delay {
          from { 
            opacity: 0;
            transform: translateX(30px) scale(0.9);
          }
          to { 
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        .animate-button-entrance-delay {
          animation: button-entrance-delay 0.5s ease-out 0.7s both;
        }
        @keyframes divider-entrance {
          from { 
            opacity: 0;
            transform: scaleX(0);
          }
          to { 
            opacity: 1;
            transform: scaleX(1);
          }
        }
        .animate-divider-entrance {
          animation: divider-entrance 0.4s ease-out 0.6s both;
        }
        @keyframes icon-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-icon-bounce {
          animation: icon-bounce 2s ease-in-out infinite;
        }
        @keyframes key-bounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-4px) rotate(-5deg); }
          75% { transform: translateY(-4px) rotate(5deg); }
        }
        .animate-key-bounce {
          animation: key-bounce 2.5s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        @keyframes fade-in-delay {
          0% { opacity: 0; transform: translateY(5px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-delay {
          animation: fade-in-delay 0.5s ease-out 0.8s both;
        }
        @keyframes fade-in-delay-2 {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-fade-in-delay-2 {
          animation: fade-in-delay-2 0.5s ease-out 1s both;
        }
        @keyframes modal-enter {
          from { 
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-modal-enter {
          animation: modal-enter 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-pulse-slow {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
