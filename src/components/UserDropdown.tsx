import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { usePermissions } from '@/hooks';
import { cn } from '@/utils/cn';

interface UserDropdownProps {
  onOpenEmailModal: () => void;
  onLogout: () => void;
}

const UserDropdown: React.FC<UserDropdownProps> = ({ onOpenEmailModal, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, role } = useAuthStore();
  const { hasComponent } = usePermissions();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const canSendEmail = hasComponent('send_email_button');

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      // Dropdown opened
    }
  }, [isOpen, canSendEmail, role]);

  const handleMenuItemClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-[4.8px] md:gap-[9.6px] hover:bg-white/10 rounded-lg p-[3.2px] md:p-[6.4px] transition-colors"
      >
        <div className="hidden md:flex flex-col items-end">
          <span className="text-white text-[11.2px] font-medium">
            {user?.name}
          </span>
          <span className="text-purple-200 text-[9.6px]">
            {user?.email}
          </span>
        </div>
        
        <div className="h-[25.6px] w-[25.6px] md:h-[32px] md:w-[32px] rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-white font-semibold text-[9.6px] md:text-[11.2px]">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>

        <svg
          className={cn(
            'w-[9.6px] h-[9.6px] md:w-[12.8px] md:h-[12.8px] text-white transition-transform duration-200 hidden md:block',
            isOpen && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1 md:mt-2 w-[calc(100vw-1rem)] max-w-[280px] md:w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
          {/* User Info Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-[9.6px] md:p-[12.8px]">
            <div className="flex items-center gap-[6.4px] md:gap-[9.6px]">
              <div className="h-[32px] w-[32px] md:h-[38.4px] md:w-[38.4px] rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-[12.8px] md:text-[14.4px]">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[11.2px] md:text-[12.8px] truncate">{user?.name}</p>
                <p className="text-[9.6px] text-purple-200 truncate">{user?.email}</p>
                <p className="text-[9.6px] text-purple-300 mt-[2px] md:mt-[3.2px] truncate">
                  {role?.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-[3.2px] md:py-[6.4px]">
            {canSendEmail && (
              <button
                onClick={() => handleMenuItemClick(onOpenEmailModal)}
                className="w-full flex items-center gap-[6.4px] md:gap-[9.6px] px-[9.6px] md:px-[12.8px] py-[6.4px] md:py-[9.6px] text-gray-700 hover:bg-purple-50 transition-colors text-[11.2px] md:text-[12.8px]"
              >
                <svg className="w-[12.8px] h-[12.8px] md:w-[16px] md:h-[16px] text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">Send Email</span>
              </button>
            )}

            <button
              onClick={() => handleMenuItemClick(onLogout)}
              className="w-full flex items-center gap-[6.4px] md:gap-[9.6px] px-[9.6px] md:px-[12.8px] py-[6.4px] md:py-[9.6px] text-gray-700 hover:bg-red-50 transition-colors border-t border-gray-100 text-[11.2px] md:text-[12.8px]"
            >
              <svg className="w-[12.8px] h-[12.8px] md:w-[16px] md:h-[16px] text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;

