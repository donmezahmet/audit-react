import { getMockData } from './mockData.service';
import type { User, ExternalUser, Role, ApiResponse, ChartPermission } from '@/types';

export interface CreateUserData {
  email: string;
  name: string;
  managers_email?: string;
  vp_email?: string;
  department?: string;
  role_id: number;
}

export interface UpdateUserData extends Partial<CreateUserData> {
  status?: 'active' | 'inactive';
}

export interface CreateExternalUserData {
  email: string;
  name: string;
  company?: string;
  access_reason?: string;
  expires_at?: string;
  notes?: string;
  chart_permissions?: ChartPermission[];
  role?: string;
}

export const userService = {
  // Internal Users
  getUsers: async (): Promise<ApiResponse<User[]>> => {
    return getMockData('users', { success: true, data: [] });
  },

  // Access Management - Get all users with full details
  getAccessManagementUsers: async (): Promise<ApiResponse<User[]>> => {
    // Return mock users including department_directors for View As functionality
    const mockUsers: User[] = [
      {
        id: 1,
        email: 'mahmut@turan.com',
        name: 'Mahmut Turan',
        role: 'admin',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        email: 'dept1.director@example.com',
        name: 'Department 1 Director',
        role: 'department_director',
        department: 'Operations',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 3,
        email: 'dept2.director@example.com',
        name: 'Department 2 Director',
        role: 'department_director',
        department: 'Finance',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 4,
        email: 'dept3.director@example.com',
        name: 'Department 3 Director',
        role: 'department_director',
        department: 'IT',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 5,
        email: 'dept4.director@example.com',
        name: 'Department 4 Director',
        role: 'department_director',
        department: 'HR',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 6,
        email: 'dept5.director@example.com',
        name: 'Department 5 Director',
        role: 'department_director',
        department: 'Marketing',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 7,
        email: 'manager1@example.com',
        name: 'Manager One',
        role: 'team_manager',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 8,
        email: 'manager2@example.com',
        name: 'Manager Two',
        role: 'team_manager',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 9,
        email: 'cfo@example.com',
        name: 'Chief Financial Officer',
        role: 'top_management',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 10,
        email: 'cto@example.com',
        name: 'Chief Technology Officer',
        role: 'top_management',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 11,
        email: 'management1@example.com',
        name: 'Management User One',
        role: 'management',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 12,
        email: 'management2@example.com',
        name: 'Management User Two',
        role: 'management',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    return getMockData('access-management-users', { success: true, data: mockUsers });
  },

  getUser: async (id: number): Promise<ApiResponse<User>> => {
    const user: User = {
      id,
      email: 'user@example.com',
      name: 'Mock User',
      role: 'team',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return getMockData('user', { success: true, data: user });
  },

  createUser: async (data: CreateUserData): Promise<ApiResponse<User>> => {
    const user: User = {
      id: Date.now(),
      email: data.email,
      name: data.name,
      role: 'team',
      managers_email: data.managers_email,
      vp_email: data.vp_email,
      department: data.department,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return getMockData('create-user', { success: true, data: user });
  },

  updateUser: async (id: number, data: UpdateUserData): Promise<ApiResponse<User>> => {
    const user: User = {
      id,
      email: 'user@example.com',
      name: 'Mock User',
      role: 'team',
      status: data.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return getMockData('update-user', { success: true, data: user });
  },

  deleteUser: async (_id: number): Promise<ApiResponse<void>> => {
    return getMockData('delete-user', { success: true });
  },

  getUserRole: async (_userId: number): Promise<ApiResponse<Role>> => {
    const role: Role = {
      id: 1,
      name: 'team',
      description: 'Team member',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return getMockData('user-role', { success: true, data: role });
  },

  // External Users
  getExternalUsers: async (): Promise<ApiResponse<ExternalUser[]>> => {
    return getMockData('external-users', { success: true, data: [] });
  },

  getExternalUser: async (id: number): Promise<ApiResponse<ExternalUser>> => {
    const user: ExternalUser = {
      id,
      email: 'external@example.com',
      name: 'External User',
      is_active: true,
      must_reset_password: false,
      created_at: new Date().toISOString(),
    };
    return getMockData('external-user', { success: true, data: user });
  },

  createExternalUser: async (data: CreateExternalUserData): Promise<ApiResponse<ExternalUser>> => {
    const user: ExternalUser = {
      id: Date.now(),
      email: data.email,
      name: data.name,
      company: data.company,
      access_reason: data.access_reason,
      expires_at: data.expires_at,
      notes: data.notes,
      role: data.role,
      is_active: true,
      must_reset_password: true,
      created_at: new Date().toISOString(),
    };
    return getMockData('create-external-user', { success: true, data: user });
  },

  updateExternalUser: async (id: number, _data: Partial<CreateExternalUserData>): Promise<ApiResponse<ExternalUser>> => {
    const user: ExternalUser = {
      id,
      email: 'external@example.com',
      name: 'External User',
      is_active: true,
      must_reset_password: false,
      created_at: new Date().toISOString(),
    };
    return getMockData('update-external-user', { success: true, data: user });
  },

  deleteExternalUser: async (_id: number): Promise<ApiResponse<void>> => {
    return getMockData('delete-external-user', { success: true });
  },

  getExternalUserPermissions: async (_userId: number): Promise<ApiResponse<ChartPermission[]>> => {
    return getMockData('external-user-permissions', { success: true, data: [] });
  },

  updateExternalUserPermissions: async (_userId: number, _permissions: ChartPermission[]): Promise<ApiResponse<void>> => {
    return getMockData('update-external-user-permissions', { success: true });
  },

  // Roles
  getRoles: async (): Promise<ApiResponse<Role[]>> => {
    return getMockData('roles', { success: true, data: [] });
  },

  getRole: async (id: number): Promise<ApiResponse<Role>> => {
    const role: Role = {
      id,
      name: 'team',
      description: 'Team member',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return getMockData('role', { success: true, data: role });
  },

  createRole: async (data: { name: string; description?: string }): Promise<ApiResponse<Role>> => {
    const role: Role = {
      id: Date.now(),
      name: data.name,
      description: data.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return getMockData('create-role', { success: true, data: role });
  },

  updateRole: async (id: number, data: { name?: string; description?: string }): Promise<ApiResponse<Role>> => {
    const role: Role = {
      id,
      name: data.name || 'team',
      description: data.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return getMockData('update-role', { success: true, data: role });
  },

  deleteRole: async (_id: number): Promise<ApiResponse<void>> => {
    return getMockData('delete-role', { success: true });
  },

  // Google Group Sync
  syncGoogleGroup: async (): Promise<ApiResponse<{ stats: any; timestamp: string }>> => {
    return getMockData('sync-google-group', {
      success: true,
      data: { stats: {}, timestamp: new Date().toISOString() },
    });
  },
};

