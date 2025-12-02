import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, User, ExternalUser } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthStore extends AuthState {
  // Actions
  setUser: (user: User | ExternalUser | null) => void;
  setRole: (role: string) => void;
  setPermissions: (permissions: AuthState['permissions']) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  reset: () => void;
  // Impersonation
  isImpersonating: boolean;
  originalUser: User | null;
  startImpersonation: (targetEmail: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  role: undefined,
  permissions: undefined,
};

const initialImpersonationState = {
  isImpersonating: false,
  originalUser: null,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      ...initialImpersonationState,

      setUser: (user) => set({ user }),
      
      setRole: (role) => set({ role }),
      
      setPermissions: (permissions) => set({ permissions }),
      
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      
      setLoading: (isLoading) => set({ isLoading }),

      login: async (email, password) => {
        try {
          set({ isLoading: true });
          const response = await authService.login({ email, password });
          
          if (response.success && response.data) {
            set({
              user: response.data.user,
              role: response.data.role,
              isAuthenticated: true,
              isLoading: false,
            });
            
            // Fetch permissions
            const permissionsResponse = await authService.getPermissions();
            if (permissionsResponse.success && permissionsResponse.data) {
              set({ permissions: permissionsResponse.data });
            }
            
            return true;
          }
          
          set({ isLoading: false });
          return false;
        } catch (error) {
          set({ isLoading: false });
          return false;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          // Logout failed - will still clear local state
        } finally {
          set(initialState);
          // Force reload to clear any cached state
          window.location.href = '/login';
        }
      },

      checkAuth: async () => {
        try {
          set({ isLoading: true });
          const response = await authService.getCurrentUser();
          
          // Backend returns: { authenticated, user, role, permissions, isImpersonating, originalUser }
          // Not wrapped in ApiResponse format
          if (response.authenticated && response.user) {
            set({
              user: response.user,
              role: response.role,
              isAuthenticated: true,
              permissions: response.permissions,
              isImpersonating: response.isImpersonating || false,
              originalUser: response.originalUser || null,
              isLoading: false,
            });
          } else {
            set({ ...initialState, ...initialImpersonationState, isLoading: false });
          }
        } catch (error) {
          set({ ...initialState, ...initialImpersonationState, isLoading: false });
        }
      },

      startImpersonation: async (targetEmail: string) => {
        try {
          const response = await authService.viewAsUser(targetEmail);
          
          if (response.success) {
            // Re-check auth to get the impersonated user's data
            await get().checkAuth();
            // Don't redirect here - let the calling component handle navigation
            // This prevents session issues with window.location.href
          }
        } catch (error) {
          throw error;
        }
      },

      stopImpersonation: async () => {
        try {
          await authService.stopImpersonation();
          
          // Clear local state immediately
          set({ 
            isImpersonating: false, 
            originalUser: null 
          });
          
          // Re-check auth to restore original user
          await get().checkAuth();
          
          // Force page reload to ensure clean state
          window.location.reload();
        } catch (error) {
          throw error;
        }
      },

      reset: () => set({ ...initialState, ...initialImpersonationState }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

