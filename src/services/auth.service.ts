import { getMockData, mockPermissions } from './mockData.service';
import { userService } from './user.service';
import type { ExternalUser, ApiResponse, AuthState } from '@/types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
}

// Hardcoded credentials
const HARDCODED_EMAIL = 'mahmut@turan.com';
const HARDCODED_PASSWORD = 'mahmutturan12345';

export const authService = {
  // Get current user
  getCurrentUser: async (): Promise<any> => {
    // Check if impersonating - if so, return impersonated user
    const impersonatedUserStr = localStorage.getItem('impersonated_user');
    const originalUserStr = localStorage.getItem('mock_user');
    
    if (impersonatedUserStr) {
      const impersonatedUser = JSON.parse(impersonatedUserStr);
      const originalUser = originalUserStr ? JSON.parse(originalUserStr) : null;
      
      return {
        success: true,
        authenticated: true,
        user: impersonatedUser,
        role: impersonatedUser.role,
        permissions: mockPermissions,
        isImpersonating: true,
        originalUser: originalUser,
      };
    }
    
    // Check if user is stored in localStorage (simulating session)
    const storedUser = localStorage.getItem('mock_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return {
        success: true,
        authenticated: true,
        user,
        role: user.role,
        permissions: mockPermissions,
        isImpersonating: false,
        originalUser: null,
      };
    }
    return {
      success: false,
      authenticated: false,
      user: null,
      role: undefined,
      permissions: undefined,
      isImpersonating: false,
      originalUser: null,
    };
  },

  // Login with email/password (for external users)
  login: async (credentials: LoginCredentials): Promise<ApiResponse<{ user: ExternalUser; role: string }>> => {
    await getMockData('login', null, 200);
    
    // Check hardcoded credentials
    if (credentials.email === HARDCODED_EMAIL && credentials.password === HARDCODED_PASSWORD) {
      const user: ExternalUser = {
        id: 1,
        email: HARDCODED_EMAIL,
        name: 'Mahmut Turan',
        role: 'admin',
        is_active: true,
        must_reset_password: false,
        created_at: '2024-01-01T00:00:00Z',
      };
      
      // Store in localStorage to simulate session
      localStorage.setItem('mock_user', JSON.stringify(user));
      
      return {
        success: true,
        data: { user, role: 'admin' },
      };
    }
    
    return {
      success: false,
      error: 'Invalid email or password',
    };
  },

  // Logout
  logout: async (): Promise<ApiResponse<void>> => {
    await getMockData('logout', null, 100);
    localStorage.removeItem('mock_user');
    localStorage.removeItem('impersonated_user');
    return { success: true };
  },

  // Google OAuth login (disabled)
  googleLogin: (): void => {
    // Disabled - do nothing
    console.log('Google SSO is disabled');
  },

  // Request password reset
  requestPasswordReset: async (_email: string): Promise<ApiResponse<void>> => {
    await getMockData('requestPasswordReset', null, 150);
    return { success: true };
  },

  // Reset password with token
  resetPassword: async (_data: ResetPasswordData): Promise<ApiResponse<void>> => {
    await getMockData('resetPassword', null, 150);
    return { success: true };
  },

  // Change password (when logged in)
  changePassword: async (_currentPassword: string, _newPassword: string): Promise<ApiResponse<void>> => {
    await getMockData('changePassword', null, 150);
    return { success: true };
  },

  // Check if user is authenticated
  checkAuth: async (): Promise<boolean> => {
    try {
      const response = await authService.getCurrentUser();
      return response.success && !!response.user;
    } catch (error) {
      return false;
    }
  },

  // Get user permissions
  getPermissions: async (): Promise<ApiResponse<AuthState['permissions']>> => {
    return getMockData('permissions', {
      success: true,
      data: mockPermissions,
    });
  },

  // View as user (admin impersonation)
  viewAsUser: async (targetEmail: string): Promise<ApiResponse<any>> => {
    await getMockData('viewAsUser', null, 150);
    
    // Get the target user from userService
    const usersResponse = await userService.getAccessManagementUsers();
    
    if (usersResponse.success && usersResponse.data) {
      const targetUser = usersResponse.data.find(u => u.email === targetEmail);
      
      if (targetUser) {
        // Store original user if not already stored
        const originalUserStr = localStorage.getItem('mock_user');
        if (!originalUserStr) {
          // This shouldn't happen, but just in case
          return {
            success: false,
            error: 'No original user found',
          };
        }
        
        // Convert User to ExternalUser format for impersonated user
        const impersonatedUser: ExternalUser = {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
          role: targetUser.role,
          is_active: targetUser.status === 'active',
          must_reset_password: false,
          created_at: targetUser.created_at,
        };
        
        // Store impersonated user in localStorage
        localStorage.setItem('impersonated_user', JSON.stringify(impersonatedUser));
        
        return {
          success: true,
          data: { email: targetEmail, user: impersonatedUser },
        };
      }
    }
    
    return {
      success: false,
      error: 'Target user not found',
    };
  },

  // Stop impersonation
  stopImpersonation: async (): Promise<ApiResponse<void>> => {
    await getMockData('stopImpersonation', null, 100);
    // Remove impersonated user from localStorage
    localStorage.removeItem('impersonated_user');
    return { success: true };
  },
};

