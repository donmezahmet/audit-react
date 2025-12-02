import { getMockData } from './mockData.service';
import type { ApiResponse, DashboardComponent, RoleComponentPermission } from '@/types';

export interface UpdatePermissionsData {
  permissions: Array<{
    componentId: number;
    canView: boolean;
    canInteract: boolean;
  }>;
}

export interface BulkPermissionsData {
  roleId: number;
  componentIds: number[];
  action: 'grant' | 'revoke';
  permissionType?: 'view' | 'interact' | 'both';
}

export interface Role {
  id: number;
  name: string;
  description?: string;
}

export const permissionService = {
  // Get all roles
  getRoles: async (): Promise<ApiResponse<Role[]>> => {
    return getMockData('roles', { success: true, data: [] });
  },

  // Get all dashboard components
  getDashboardComponents: async (): Promise<ApiResponse<DashboardComponent[]>> => {
    return getMockData('dashboard-components', { success: true, data: [] });
  },

  // Get permissions for a specific role
  getRolePermissions: async (roleId: number): Promise<ApiResponse<RoleComponentPermission[]>> => {
    return getMockData('role-permissions', { success: true, data: [] });
  },

  // Update permissions for a role
  updateRolePermissions: async (
    roleId: number, 
    data: UpdatePermissionsData
  ): Promise<ApiResponse<void>> => {
    return getMockData('update-role-permissions', { success: true });
  },

  // Bulk grant or revoke permissions
  bulkUpdatePermissions: async (data: BulkPermissionsData): Promise<ApiResponse<void>> => {
    return getMockData('bulk-update-permissions', { success: true });
  },
};

