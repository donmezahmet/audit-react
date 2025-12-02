import React, { useState, useEffect } from 'react';
import { Input, Loading } from '@/components/ui';
import { userService } from '@/services/user.service';
import { useDebounce } from '@/hooks';

interface ViewAsDropdownMobileProps {
  onSelectUser: (email: string) => void;
  filterByRole?: string | string[] | null;
}

const ViewAsDropdownMobile: React.FC<ViewAsDropdownMobileProps> = ({ onSelectUser, filterByRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Load users when modal opens
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true);
        const response = await userService.getAccessManagementUsers();
        if (response.success && response.data) {
          const allUsers = response.data;
          let roleFilteredUsers = allUsers;

          if (filterByRole) {
            if (Array.isArray(filterByRole)) {
              roleFilteredUsers = allUsers.filter(u => filterByRole.includes(u.role));
            } else {
              roleFilteredUsers = allUsers.filter(u => u.role === filterByRole);
            }
          }

          const activeUsers = roleFilteredUsers.filter(u => u.status === 'active');
          setUsers(activeUsers);
          setFilteredUsers(activeUsers);
        }
      } catch (error) {
        // Failed to load users
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      loadUsers();
    }
  }, [isOpen, filterByRole]);

  // Filter users based on search term
  useEffect(() => {
    if (!debouncedSearchTerm) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter((user) =>
      user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [debouncedSearchTerm, users]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const handleSelectUser = (email: string) => {
    onSelectUser(email);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <>
      {/* Mobile Button - Simple icon button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 active:bg-purple-200 transition-colors touch-manipulation"
        aria-label="View As"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </button>

      {/* Full Screen Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] md:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Content - Bottom Sheet Style */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[65vh] flex flex-col transform transition-transform duration-300 ease-out"
            style={{
              animation: 'slideUp 0.3s ease-out'
            }}>
            {/* Drag Handle */}
            <div className="flex justify-center pt-2 pb-1.5">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-3 pb-2 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-900">View As User</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 -mr-1.5 text-gray-400 hover:text-gray-600 active:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search Input */}
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
                autoFocus
                className="text-sm"
                style={{ fontSize: '16px' }}
              />
            </div>

            {/* User List */}
            <div className="overflow-y-auto flex-1 px-3 py-1.5">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loading size="md" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg
                    className="mx-auto h-10 w-10 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <p className="mt-2 text-xs">No users found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.email}
                      onClick={() => handleSelectUser(user.email)}
                      className="w-full text-left px-2 py-2.5 active:bg-purple-50 transition-colors touch-manipulation"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-sm flex-shrink-0">
                          {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.name || user.email}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                          {user.role && (
                            <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                              {user.role.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ViewAsDropdownMobile;

