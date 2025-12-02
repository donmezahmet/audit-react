import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { Button } from '@/components/ui';
import { cn } from '@/utils/cn';
import UserDropdown from '../UserDropdown';

interface HeaderProps {
  onOpenEmailModal?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenEmailModal }) => {
  const navigate = useNavigate();
  const { user, role, isImpersonating, originalUser, logout, stopImpersonation } = useAuthStore();
  const [isStoppingImpersonation, setIsStoppingImpersonation] = useState(false);

  const handleStopViewAs = async () => {
    try {
      setIsStoppingImpersonation(true);
      await stopImpersonation();
    } catch (error) {
      // Failed to stop impersonation
    } finally {
      setIsStoppingImpersonation(false);
    }
  };

  const handleLogoClick = () => {
    // Check if user has access to dashboard
    const dashboardRoles = ['admin', 'team', 'team_manager', 'ceo'];
    if (role && dashboardRoles.includes(role)) {
      navigate('/');
    }
  };
  const { isSidebarOpen, toggleSidebar } = useUIStore();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <>
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-yellow-500 text-black px-2 md:px-6 py-1.5 md:py-2 flex items-center justify-between text-xs md:text-sm font-medium shadow-lg">
          <span className="truncate flex-1 min-w-0 mr-2">
            <svg className="w-3 h-3 md:w-4 md:h-4 inline mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="hidden sm:inline">Viewing as: <strong>{user?.email}</strong> (Original: {originalUser?.email})</span>
            <span className="sm:hidden">Viewing as: <strong>{user?.email}</strong></span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleStopViewAs}
            isLoading={isStoppingImpersonation}
            className="bg-black text-yellow-500 hover:bg-gray-800 border-black text-xs md:text-sm px-2 md:px-4 py-1 md:py-2 flex-shrink-0"
          >
            <span className="hidden sm:inline">Stop Viewing</span>
            <span className="sm:hidden">Stop</span>
          </Button>
        </div>
      )}

      <header
        className={cn(
          'fixed left-0 right-0 z-50',
          'h-[38.4px] md:h-[51.2px]', // 80% of h-12 (48px) and h-16 (64px)
          isImpersonating ? 'top-10' : 'top-0',
          'bg-gradient-to-r from-blue-600 to-blue-700',
          'shadow-lg border-b border-blue-700/20',
          'backdrop-blur-lg',
          'transition-all duration-200'
        )}
      >
      <div className="h-full px-[6.4px] md:px-[19.2px] flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-[6.4px] md:gap-[12.8px]">
          <button
            onClick={toggleSidebar}
            className="text-white hover:bg-white/10 p-[4.8px] md:p-[6.4px] rounded-lg transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg
              className="w-4 h-4 md:w-[19.2px] md:h-[19.2px]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isSidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
              />
            </svg>
          </button>
          
          <div 
            className="flex items-center gap-[6.4px] md:gap-[9.6px] cursor-pointer hover:opacity-90 transition-opacity"
            onClick={handleLogoClick}
          >
            <svg className="h-[19.2px] w-[19.2px] md:h-[25.6px] md:w-[25.6px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-white text-[11.2px] md:text-[14.4px] font-semibold hidden md:block">
              Audit Department Dashboard
            </h1>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1 md:gap-4">
          {user && (
            <>
              {/* User Dropdown Menu */}
              <UserDropdown 
                onOpenEmailModal={() => onOpenEmailModal?.()} 
                onLogout={handleLogout} 
              />
            </>
          )}
        </div>
      </div>
    </header>
    </>
  );
};

export default Header;

