import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, CardHeader, Badge, Loading, Toggle } from '@/components/ui';
import { SearchInput } from '@/components/forms';
import { userService } from '@/services/user.service';
import { permissionService, type Role } from '@/services/permission.service';
import { auditFindingService } from '@/services/auditFinding.service';
import type { User, DashboardComponent, RoleComponentPermission, DropdownOption } from '@/types';
import { cn } from '@/utils/cn';
import { Input, Select } from '@/components/ui';

type TabType = 'users' | 'roles' | 'components' | 'external-users' | 'dropdown-options';

const AccessManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncStats, setSyncStats] = useState<any>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingRole, setEditingRole] = useState<string>('');

  // Component Permissions state
  const [roles, setRoles] = useState<Role[]>([]);
  const [components, setComponents] = useState<DashboardComponent[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [rolePermissions, setRolePermissions] = useState<RoleComponentPermission[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [permissionChanges, setPermissionChanges] = useState<Map<number, { canView: boolean; canInteract: boolean }>>(new Map());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Create Role Modal state
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  
  // External Users state
  const [externalUsers, setExternalUsers] = useState<any[]>([]);
  const [isLoadingExternalUsers, setIsLoadingExternalUsers] = useState(false);
  const [showCreateExternalUserModal, setShowCreateExternalUserModal] = useState(false);
  const [newExternalUser, setNewExternalUser] = useState({
    email: '',
    name: '',
    company: '',
    access_reason: '',
    expires_at: '',
    notes: '',
    role: 'external_user' // External users can only have external_user role
  });
  const [isCreatingExternalUser, setIsCreatingExternalUser] = useState(false);

  // Dropdown Options state
  const [dropdownOptions, setDropdownOptions] = useState<Record<string, DropdownOption[]>>({});
  const [isLoadingDropdownOptions, setIsLoadingDropdownOptions] = useState(false);
  const [selectedFieldName, setSelectedFieldName] = useState<string>('audit_type');
  const [showCreateOptionModal, setShowCreateOptionModal] = useState(false);
  const [editingOption, setEditingOption] = useState<DropdownOption | null>(null);
  const [newOption, setNewOption] = useState({ field_name: 'audit_type', option_value: '', display_order: 0, parent_department: '' });
  const [isSavingOption, setIsSavingOption] = useState(false);

  const fieldNames = [
    { value: 'audit_type', label: 'Audit Type' },
    { value: 'risk_type', label: 'Risk Type' },
    { value: 'internal_control_element', label: 'Internal Control Element' },
    { value: 'country', label: 'Country' },
    { value: 'audit_year', label: 'Audit Year' },
    { value: 'risk_level', label: 'Risk Level' },
    { value: 'status', label: 'Status' },
    { value: 'department', label: 'Department' },
    { value: 'process', label: 'Process' },
    { value: 'business_unit', label: 'Business Unit' },
  ];

  // Fetch users from database
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await userService.getAccessManagementUsers();
        
        if (response.success && response.data) {
          setUsers(response.data);
        } else {
          setError('Failed to load users');
        }
      } catch (err) {
        setError('Failed to load users. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Load roles for all tabs (needed for user role editing)
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const response = await permissionService.getRoles();
        if (response.success && response.data) {
          setRoles(response.data);
        }
      } catch (error) {
        // Failed to load roles - will retry on next mount
      }
    };

    loadRoles();
  }, [activeTab]); // Reload when tab changes

  // Load external users when switching to external-users tab
  useEffect(() => {
    const loadExternalUsers = async () => {
      if (activeTab === 'external-users') {
        try {
          setIsLoadingExternalUsers(true);
          const response = await userService.getExternalUsers();
          if (response.success && response.data) {
            setExternalUsers(response.data);
          }
        } catch (error) {
          console.error('Failed to load external users:', error);
        } finally {
          setIsLoadingExternalUsers(false);
        }
      }
    };

    loadExternalUsers();
  }, [activeTab]);

  // Dropdown Options handlers - Must be defined before useEffect
  const fetchDropdownOptions = useCallback(async () => {
    try {
      setIsLoadingDropdownOptions(true);
      const allOptions: Record<string, DropdownOption[]> = {};
      
      for (const field of fieldNames) {
        try {
          const options = await auditFindingService.getDropdownOptionsFull(field.value);
          if (options && Array.isArray(options)) {
            allOptions[field.value] = options;
          } else {
            allOptions[field.value] = [];
          }
        } catch (error) {
          console.error(`Failed to load options for ${field.value}:`, error);
          allOptions[field.value] = [];
        }
      }
      setDropdownOptions(allOptions);
    } catch (error) {
      console.error('Failed to load dropdown options:', error);
    } finally {
      setIsLoadingDropdownOptions(false);
    }
  }, []);

  // Load dropdown options when switching to dropdown-options tab
  useEffect(() => {
    if (activeTab === 'dropdown-options') {
      fetchDropdownOptions();
    }
  }, [activeTab, fetchDropdownOptions]);

  // Load dashboard components when switching to components tab
  useEffect(() => {
    const loadComponents = async () => {
      if (activeTab === 'components') {
        try {
          setIsLoadingPermissions(true);
          const response = await permissionService.getDashboardComponents();
          if (response.success && response.data) {
            setComponents(response.data);
          }
        } catch (error) {
          // Failed to load components
        } finally {
          setIsLoadingPermissions(false);
        }
      }
    };

    loadComponents();
  }, [activeTab]);

  // Load role permissions when role is selected
  useEffect(() => {
    const loadRolePermissions = async () => {
      if (selectedRoleId) {
        try {
          setIsLoadingPermissions(true);
          const response = await permissionService.getRolePermissions(selectedRoleId);
          if (response.success && response.data) {
            setRolePermissions(response.data);
            // Clear unsaved changes
            setPermissionChanges(new Map());
          }
        } catch (error) {
          // Failed to load role permissions
        } finally {
          setIsLoadingPermissions(false);
        }
      }
    };

    loadRolePermissions();
  }, [selectedRoleId]);

  // Permission change handlers
  const handlePermissionToggle = (componentId: number, field: 'canView' | 'canInteract', value: boolean) => {
    const currentPerm = rolePermissions.find(p => p.component_id === componentId);
    const existingChange = permissionChanges.get(componentId);
    
    const newChange = {
      canView: existingChange?.canView ?? currentPerm?.can_view ?? false,
      canInteract: existingChange?.canInteract ?? currentPerm?.can_interact ?? false,
      [field]: value,
    };
    
    // If turning off view, also turn off interact
    if (field === 'canView' && !value) {
      newChange.canInteract = false;
    }
    
    const newChanges = new Map(permissionChanges);
    newChanges.set(componentId, newChange);
    setPermissionChanges(newChanges);
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;

    try {
      setIsLoadingPermissions(true);
      
      // Merge current permissions with changes
      const updatedPermissions = rolePermissions.map(perm => {
        const change = permissionChanges.get(perm.component_id);
        return {
          componentId: perm.component_id,
          canView: change?.canView ?? perm.can_view,
          canInteract: change?.canInteract ?? perm.can_interact,
        };
      });

      const response = await permissionService.updateRolePermissions(selectedRoleId, {
        permissions: updatedPermissions
      });

      if (response.success) {
        // Reload permissions to show saved state
        const reloadResponse = await permissionService.getRolePermissions(selectedRoleId);
        if (reloadResponse.success && reloadResponse.data) {
          setRolePermissions(reloadResponse.data);
          setPermissionChanges(new Map());
          alert('Permissions saved successfully!');
        }
      }
    } catch (error) {
      alert('Failed to save permissions. Please try again.');
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  const handleResetChanges = () => {
    setPermissionChanges(new Map());
  };

  const handleCreateOption = async () => {
    if (!newOption.option_value.trim()) {
      alert('Option value is required');
      return;
    }

    try {
      setIsSavingOption(true);
      const response = await auditFindingService.createDropdownOption({
        field_name: newOption.field_name,
        option_value: newOption.option_value,
        display_order: newOption.display_order,
        parent_department: newOption.parent_department || undefined,
      });

      if (response.success) {
        setShowCreateOptionModal(false);
        setNewOption({ field_name: selectedFieldName, option_value: '', display_order: 0, parent_department: '' });
        await fetchDropdownOptions();
        alert('Option created successfully');
      }
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Failed to create option');
    } finally {
      setIsSavingOption(false);
    }
  };

  const handleEditOption = (option: DropdownOption) => {
    setEditingOption(option);
    setNewOption({
      field_name: option.field_name,
      option_value: option.option_value,
      display_order: option.display_order,
      parent_department: option.parent_department || option.parent_business_unit || '',
    });
    setShowCreateOptionModal(true);
  };

  const handleUpdateOption = async () => {
    if (!editingOption || !newOption.option_value.trim()) {
      alert('Option value is required');
      return;
    }

    try {
      setIsSavingOption(true);
      const response = await auditFindingService.updateDropdownOption(editingOption.id, {
        option_value: newOption.option_value,
        display_order: newOption.display_order,
        is_active: editingOption.is_active,
        parent_department: newOption.parent_department || undefined,
      });

      if (response.success) {
        setShowCreateOptionModal(false);
        setEditingOption(null);
        setNewOption({ field_name: selectedFieldName, option_value: '', display_order: 0, parent_department: '' });
        await fetchDropdownOptions();
        alert('Option updated successfully');
      }
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Failed to update option');
    } finally {
      setIsSavingOption(false);
    }
  };

  const handleDeleteOption = async (option: DropdownOption) => {
    if (!confirm(`Are you sure you want to delete "${option.option_value}"?`)) {
      return;
    }

    try {
      const response = await auditFindingService.deleteDropdownOption(option.id);
      if (response.success) {
        await fetchDropdownOptions();
        alert('Option deleted successfully');
      }
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Failed to delete option');
    }
  };

  // Select All / Deselect All handlers
  const handleSelectAllView = (value: boolean) => {
    const newChanges = new Map(permissionChanges);
    filteredComponents.forEach(component => {
      const existingChange = newChanges.get(component.id);
      const currentPerm = rolePermissions.find(p => p.component_id === component.id);
      
      newChanges.set(component.id, {
        canView: value,
        canInteract: value ? (existingChange?.canInteract ?? currentPerm?.can_interact ?? false) : false,
      });
    });
    setPermissionChanges(newChanges);
  };

  const handleSelectAllInteract = (value: boolean) => {
    const newChanges = new Map(permissionChanges);
    filteredComponents.forEach(component => {
      const existingChange = newChanges.get(component.id);
      const currentPerm = rolePermissions.find(p => p.component_id === component.id);
      const currentCanView = existingChange?.canView ?? currentPerm?.can_view ?? false;
      
      // Only allow interaction if view is enabled
      if (currentCanView) {
        newChanges.set(component.id, {
          canView: currentCanView,
          canInteract: value,
        });
      }
    });
    setPermissionChanges(newChanges);
  };

  // Handle Google Group Sync
  const handleSyncGoogleGroup = async () => {
    try {
      setIsSyncing(true);
      const response = await userService.syncGoogleGroup();
      
      if (response.success && response.data) {
        setSyncStats(response.data.stats);
        setLastSyncTime(response.data.timestamp);
        
        // Refresh users list
        const usersResponse = await userService.getAccessManagementUsers();
        if (usersResponse.success && usersResponse.data) {
          setUsers(usersResponse.data);
        }
        
        alert(`Sync completed!\nAdded: ${response.data.stats.newUsersAdded}\nReactivated: ${response.data.stats.usersReactivated}\nDeactivated: ${response.data.stats.usersDeactivated}`);
      }
    } catch (error) {
      alert('Failed to sync with Google Group');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle edit user role
  const handleStartEditRole = (userId: number, currentRole: string) => {
    setEditingUserId(userId);
    setEditingRole(currentRole);
  };

  const handleCancelEditRole = () => {
    setEditingUserId(null);
    setEditingRole('');
  };

  // Handle user role change
  const handleSaveRoleChange = async (userEmail: string) => {
    try {
      const response = await fetch('/api/access-management/update-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: userEmail,
          role: editingRole
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.email === userEmail ? { ...u, role: editingRole } : u
          )
        );
        alert(`User role updated successfully to ${editingRole}`);
        setEditingUserId(null);
        setEditingRole('');
      } else {
        alert(`Failed to update user role: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to update user role');
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Get filtered components based on category
  const filteredComponents = components.filter(comp => 
    filterCategory === 'all' || comp.category === filterCategory
  );

  // Get current permission value (either from changes or original)
  const getPermissionValue = (componentId: number, field: 'canView' | 'canInteract'): boolean => {
    const change = permissionChanges.get(componentId);
    if (change) {
      return field === 'canView' ? change.canView : change.canInteract;
    }
    const perm = rolePermissions.find(p => p.component_id === componentId);
    return field === 'canView' ? (perm?.can_view ?? false) : (perm?.can_interact ?? false);
  };

  // Check if all filtered components have view/interact enabled
  const areAllViewEnabled = filteredComponents.every(comp => 
    getPermissionValue(comp.id, 'canView')
  );
  
  const areAllInteractEnabled = filteredComponents.every(comp => {
    const canView = getPermissionValue(comp.id, 'canView');
    return canView && getPermissionValue(comp.id, 'canInteract');
  });

  // Check if there are unsaved changes
  const hasUnsavedChanges = permissionChanges.size > 0;

  // Get unique categories
  const categories = ['all', ...new Set(components.map(c => c.category).filter(Boolean))];

  // Get unique role list for dropdown
  const uniqueRoles = Array.from(new Set(users.map(u => u.role))).sort();

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'danger';
      case 'top_management':
        return 'warning';
      case 'department_director':
        return 'info';
      default:
        return 'default';
    }
  };

  const roleCounts = {
    all: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    team: users.filter(u => u.role === 'team').length,
    action_operator: users.filter(u => u.role === 'action_operator').length,
    department_director: users.filter(u => u.role === 'department_director').length,
    top_management: users.filter(u => u.role === 'top_management').length,
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading size="lg" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <div className="text-center p-8">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Error Loading Users</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-gray-900">Access Management</h1>
          <p className="text-gray-600 mt-1">Manage users, roles, and component permissions</p>
        </div>
      </div>

      {/* Tabs */}
      <Card>
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              'px-[19.2px] py-[9.6px] font-medium text-xs border-b-2 transition-colors',
              activeTab === 'users'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={cn(
              'px-[19.2px] py-[9.6px] font-medium text-xs border-b-2 transition-colors',
              activeTab === 'roles'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Roles ({uniqueRoles.length})
          </button>
          <button
            onClick={() => setActiveTab('components')}
            className={cn(
              'px-[19.2px] py-[9.6px] font-medium text-xs border-b-2 transition-colors',
              activeTab === 'components'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            Component Permissions
          </button>
          <button
            onClick={() => setActiveTab('external-users')}
            className={cn(
              'px-[19.2px] py-[9.6px] font-medium text-xs border-b-2 transition-colors',
              activeTab === 'external-users'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            External Users ({externalUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('dropdown-options')}
            className={cn(
              'px-[19.2px] py-[9.6px] font-medium text-xs border-b-2 transition-colors',
              activeTab === 'dropdown-options'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Dropdown Options
          </button>
        </div>
      </Card>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-[12.8px]">
        <Card variant="elevated" padding="sm">
          <div className="text-center">
            <p className="text-[24px] font-bold text-purple-600">{roleCounts.all}</p>
            <p className="text-xs text-gray-600 mt-1">Total Users</p>
          </div>
        </Card>
        <Card variant="elevated" padding="sm">
          <div className="text-center">
            <p className="text-[24px] font-bold text-red-600">{roleCounts.admin}</p>
            <p className="text-xs text-gray-600 mt-1">Admins</p>
          </div>
        </Card>
        <Card variant="elevated" padding="sm">
          <div className="text-center">
            <p className="text-[24px] font-bold text-blue-600">{roleCounts.team}</p>
            <p className="text-xs text-gray-600 mt-1">Team Members</p>
          </div>
        </Card>
        <Card variant="elevated" padding="sm">
          <div className="text-center">
            <p className="text-[24px] font-bold text-yellow-600">{roleCounts.department_director}</p>
            <p className="text-xs text-gray-600 mt-1">Directors</p>
          </div>
        </Card>
        <Card variant="elevated" padding="sm">
          <div className="text-center">
            <p className="text-[24px] font-bold text-green-600">{roleCounts.top_management}</p>
            <p className="text-xs text-gray-600 mt-1">Executives</p>
          </div>
        </Card>
      </div>

      {/* Filters and Sync */}
      <Card>
        <div className="flex flex-col gap-[12.8px]">
          <div className="flex flex-col md:flex-row gap-[12.8px] items-start md:items-center justify-between">
          <div className="flex-1">
            <SearchInput
              placeholder="Search users..."
              onSearch={setSearchTerm}
            />
          </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSyncGoogleGroup}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync with Google Group
                </>
              )}
            </Button>
          </div>
          
          {lastSyncTime && (
            <div className="text-xs text-gray-500">
              Last sync: {new Date(lastSyncTime).toLocaleString()} 
              {syncStats && ` (${syncStats.activeUsers} active users)`}
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            <div className="text-xs font-medium text-gray-700 mr-2 flex items-center">Role:</div>
            {['all', 'admin', 'team', 'team_manager', 'action_operator', 'management', 'department_director', 'top_management', 'VP', 'auditor', 'ceo'].map((role) => (
              <Button
                key={role}
                variant={filterRole === role ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilterRole(role)}
              >
                {role === 'all' ? 'All' : role.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Button>
            ))}
          </div>          
          <div className="flex flex-wrap gap-2">
            <div className="text-xs font-medium text-gray-700 mr-2 flex items-center">Status:</div>
            {(['all', 'active', 'inactive'] as const).map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card variant="elevated">
        <CardHeader title="Users" subtitle={`${filteredUsers.length} users found`} />
        <div className="overflow-x-auto mt-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-[9.6px] px-[12.8px] text-xs font-semibold text-gray-700">User</th>
                <th className="text-left py-[9.6px] px-[12.8px] text-xs font-semibold text-gray-700">Email</th>
                <th className="text-left py-[9.6px] px-[12.8px] text-xs font-semibold text-gray-700">Role</th>
                <th className="text-left py-[9.6px] px-[12.8px] text-xs font-semibold text-gray-700">Department</th>
                <th className="text-left py-[9.6px] px-[12.8px] text-xs font-semibold text-gray-700">Status</th>
                <th className="text-left py-[9.6px] px-[12.8px] text-xs font-semibold text-gray-700">Last Login</th>
                <th className="text-right py-[9.6px] px-[12.8px] text-xs font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="text-gray-400">
                      <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-base font-medium">No users found</p>
                      <p className="text-xs mt-1">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-purple-600 font-semibold">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-600">{user.email}</td>
                  <td className="py-4 px-4">
                    {editingUserId === user.id ? (
                      <select
                        value={editingRole}
                        onChange={(e) => setEditingRole(e.target.value)}
                        className="px-[9.6px] py-[4.8px] border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                      >
                        {roles.map((role) => (
                          <option key={role.id} value={role.name}>
                            {role.name.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </option>
                        ))}
                      </select>
                    ) : (
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role.replace('_', ' ')}
                    </Badge>
                    )}
                  </td>
                  <td className="py-4 px-4 text-gray-600">{user.department || '-'}</td>
                  <td className="py-4 px-4">
                    <Badge variant={user.status === 'active' ? 'success' : 'default'}>
                      {user.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-end gap-2">
                      {editingUserId === user.id ? (
                        <>
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => handleSaveRoleChange(user.email)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleCancelEditRole}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleStartEditRole(user.id, user.role)}
                          >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
        </>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <>
          {/* Create Role Button */}
          <Card>
            <div className="flex items-center justify-between p-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Roles</h3>
                <p className="text-xs text-gray-600 mt-1">Manage system roles and permissions</p>
              </div>
              <Button
                variant="primary"
                onClick={() => setShowCreateRoleModal(true)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Role
              </Button>
            </div>
          </Card>
          
          {/* Roles Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-[12.8px]">
            {uniqueRoles.map((roleName) => {
              const roleUsers = users.filter(u => u.role === roleName);
              const roleFromDB = roles.find(r => r.name === roleName);
              
              return (
                <Card key={roleName} variant="elevated" padding="sm">
                  <div className="text-center">
                    <Badge variant={getRoleBadgeVariant(roleName)} className="mb-2">
                      {roleName.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </Badge>
                    <p className="text-3xl font-bold text-purple-600">{roleUsers.length}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {roleUsers.length === 1 ? 'User' : 'Users'}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3 w-full"
                      onClick={() => {
                        setActiveTab('components');
                        setSelectedRoleId(roleFromDB?.id || null);
                      }}
                    >
                      Manage Permissions
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Roles Details Table */}
          <Card variant="elevated">
            <CardHeader title="Role Details" subtitle="Overview of all roles and their users" />
            <div className="overflow-x-auto mt-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-[9.6px] px-[12.8px] text-xs font-semibold text-gray-700">Role</th>
                    <th className="text-left py-[9.6px] px-[12.8px] text-xs font-semibold text-gray-700">Users</th>
                    <th className="text-left py-[9.6px] px-[12.8px] text-xs font-semibold text-gray-700">User Count</th>
                    <th className="text-right py-[9.6px] px-[12.8px] text-xs font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueRoles.map((roleName) => {
                    const roleUsers = users.filter(u => u.role === roleName);
                    const roleFromDB = roles.find(r => r.name === roleName);
                    
                    return (
                      <tr key={roleName} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <Badge variant={getRoleBadgeVariant(roleName)}>
                            {roleName.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-2">
                            {roleUsers.slice(0, 3).map((u) => (
                              <span key={u.id} className="text-xs text-gray-600 bg-gray-100 px-[6.4px] py-[3.2px] rounded">
                                {u.name}
                              </span>
                            ))}
                            {roleUsers.length > 3 && (
                              <span className="text-xs text-gray-500 px-[6.4px] py-[3.2px]">
                                +{roleUsers.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-xs font-medium text-gray-900">{roleUsers.length}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setActiveTab('components');
                                setSelectedRoleId(roleFromDB?.id || null);
                              }}
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Permissions
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Component Permissions Tab */}
      {activeTab === 'components' && (
        <>
          {/* Role Selection */}
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Select Role</h3>
                  <p className="text-xs text-gray-600 mt-1">Choose a role to manage component permissions</p>
                </div>
                {hasUnsavedChanges && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleResetChanges}>
                      Reset Changes
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSavePermissions} isLoading={isLoadingPermissions}>
                      Save Changes ({permissionChanges.size})
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 flex-wrap">
                {roles.map((role) => {
                  const isSelected = selectedRoleId === role.id;
                  const userCount = users.filter(u => u.role === role.name).length;
                  return (
                    <Button
                      key={role.id}
                      variant={isSelected ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedRoleId(role.id)}
                    >
                      {role.name.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      {userCount > 0 && <span className="ml-1 opacity-70">({userCount})</span>}
                    </Button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Component Permissions Matrix */}
          {selectedRoleId && (
            <>
              {/* Category Filters */}
              <Card>
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">Filter by category:</span>
                    {categories.map((cat) => (
                      <Button
                        key={cat}
                        variant={filterCategory === cat ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setFilterCategory(cat)}
                      >
                        {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Permissions Table */}
              <Card variant="elevated">
                <CardHeader 
                  title="Component Permissions" 
                  subtitle={`${filteredComponents.length} components ${filterCategory !== 'all' ? `in ${filterCategory}` : ''}`}
                />
                
                {isLoadingPermissions ? (
                  <div className="flex items-center justify-center p-12">
                    <Loading size="lg" />
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-[9.6px] px-[12.8px] text-xs font-semibold text-gray-700">Component</th>
                          <th className="text-left py-[9.6px] px-[12.8px] text-xs font-semibold text-gray-700">Type</th>
                          <th className="text-left py-[9.6px] px-[12.8px] text-xs font-semibold text-gray-700">Category</th>
                          <th className="text-center py-[9.6px] px-[12.8px] text-xs font-semibold text-gray-700">
                            <div className="flex items-center justify-center gap-2">
                              <span>Can View</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleSelectAllView(true)}
                                  disabled={areAllViewEnabled}
                                  className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  title="Select all"
                                >
                                  All
                                </button>
                                <button
                                  onClick={() => handleSelectAllView(false)}
                                  disabled={!filteredComponents.some(comp => getPermissionValue(comp.id, 'canView'))}
                                  className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  title="Deselect all"
                                >
                                  None
                                </button>
                              </div>
                            </div>
                          </th>
                          <th className="text-center py-[9.6px] px-[12.8px] text-xs font-semibold text-gray-700">
                            <div className="flex items-center justify-center gap-2">
                              <span>Can Interact</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleSelectAllInteract(true)}
                                  disabled={areAllInteractEnabled || filteredComponents.every(comp => !getPermissionValue(comp.id, 'canView'))}
                                  className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  title="Select all (only for viewable components)"
                                >
                                  All
                                </button>
                                <button
                                  onClick={() => handleSelectAllInteract(false)}
                                  disabled={!filteredComponents.some(comp => getPermissionValue(comp.id, 'canInteract'))}
                                  className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  title="Deselect all"
                                >
                                  None
                                </button>
                              </div>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredComponents.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-gray-500">
                              No components found
                            </td>
                          </tr>
                        ) : (
                          filteredComponents.map((component) => {
                            const canView = getPermissionValue(component.id, 'canView');
                            const canInteract = getPermissionValue(component.id, 'canInteract');
                            const hasChange = permissionChanges.has(component.id);
                            
                            return (
                              <tr 
                                key={component.id} 
                                className={cn(
                                  'border-b border-gray-100 hover:bg-gray-50 transition-colors',
                                  hasChange && 'bg-purple-50'
                                )}
                              >
                                <td className="py-4 px-4">
                                  <div>
                                    <p className="font-medium text-gray-900">{component.display_name}</p>
                                    {component.description && (
                                      <p className="text-xs text-gray-500 mt-1">{component.description}</p>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <Badge variant="default">
                                    {component.component_type}
                                  </Badge>
                                </td>
                                <td className="py-4 px-4">
                                  <span className="text-xs text-gray-600">{component.category}</span>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <Toggle
                                    checked={canView}
                                    onChange={(value) => handlePermissionToggle(component.id, 'canView', value)}
                                    size="sm"
                                  />
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <Toggle
                                    checked={canInteract}
                                    onChange={(value) => handlePermissionToggle(component.id, 'canInteract', value)}
                                    disabled={!canView}
                                    size="sm"
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* Empty state when no role selected */}
          {!selectedRoleId && (
            <Card>
              <div className="p-12 text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <p className="text-lg font-medium">Select a role to manage permissions</p>
                <p className="text-xs mt-1">Choose a role from the buttons above to view and edit component permissions</p>
              </div>
            </Card>
          )}
        </>
      )}

      {/* External Users Tab */}
      {activeTab === 'external-users' && (
        <>
          <Card>
            <div className="flex items-center justify-between p-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">External Users</h3>
                <p className="text-sm text-gray-600 mt-1">Manage external user accounts</p>
              </div>
              <Button
                variant="primary"
                onClick={() => setShowCreateExternalUserModal(true)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create External User
              </Button>
            </div>
          </Card>

          {isLoadingExternalUsers ? (
            <div className="flex items-center justify-center p-12">
              <Loading size="lg" />
            </div>
          ) : (
            <Card variant="elevated">
              <CardHeader title="External Users" subtitle={`${externalUsers.length} external users`} />
              <div className="overflow-x-auto mt-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Company</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Access Reason</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Role</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Expires</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {externalUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center">
                          <div className="text-gray-400">
                            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            <p className="text-lg font-medium">No external users found</p>
                            <p className="text-sm mt-1">Click "Create External User" to add a new user</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      externalUsers.map((user) => (
                        <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4 font-medium text-gray-900">{user.name}</td>
                          <td className="py-4 px-4 text-gray-600">{user.email}</td>
                          <td className="py-4 px-4 text-gray-600">{user.company || '-'}</td>
                          <td className="py-4 px-4 text-gray-600">{user.access_reason || '-'}</td>
                          <td className="py-4 px-4">
                            <Badge variant="default">{user.role || 'default'}</Badge>
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant={user.is_active ? 'success' : 'default'}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-gray-600">
                            {user.expires_at ? new Date(user.expires_at).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  // TODO: Implement edit external user functionality
                                  alert('Edit functionality coming soon');
                                }}
                                title="Edit External User"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={async () => {
                                  if (confirm(`Are you sure you want to delete ${user.name}?`)) {
                                    try {
                                      const response = await userService.deleteExternalUser(user.id);
                                      if (response.success) {
                                        // Reload external users
                                        const usersResponse = await userService.getExternalUsers();
                                        if (usersResponse.success && usersResponse.data) {
                                          setExternalUsers(usersResponse.data);
                                        }
                                        alert('External user deleted successfully');
                                      } else {
                                        alert(response.error || 'Failed to delete external user');
                                      }
                                    } catch (error: any) {
                                      alert(error.userMessage || 'Failed to delete external user');
                                    }
                                  }
                                }}
                                title="Delete External User"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Dropdown Options Tab */}
      {activeTab === 'dropdown-options' && (
        <>
          <Card>
            <div className="flex items-center justify-between p-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Dropdown Options Management</h3>
                <p className="text-sm text-gray-600 mt-1">Manage dropdown field options for Audit Finding forms</p>
              </div>
              <div className="flex items-center gap-[12.8px]">
                <Select
                  label="Select Field"
                  value={selectedFieldName}
                  onChange={(e) => {
                    setSelectedFieldName(e.target.value);
                    setNewOption({ ...newOption, field_name: e.target.value });
                  }}
                  options={fieldNames.map(f => ({ value: f.value, label: f.label }))}
                  className="min-w-[200px]"
                />
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditingOption(null);
                    setNewOption({ field_name: selectedFieldName, option_value: '', display_order: 0, parent_department: '' });
                    setShowCreateOptionModal(true);
                  }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Option
                </Button>
              </div>
            </div>
          </Card>

          {isLoadingDropdownOptions ? (
            <div className="flex items-center justify-center p-12">
              <Loading size="lg" />
            </div>
          ) : (
            <Card variant="elevated">
              <CardHeader 
                title={`${fieldNames.find(f => f.value === selectedFieldName)?.label || 'Options'}`}
                subtitle={`${dropdownOptions[selectedFieldName]?.length || 0} options`}
              />
              <div className="overflow-x-auto mt-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Option Value</th>
                      {selectedFieldName === 'process' && (
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Parent Department</th>
                      )}
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!dropdownOptions[selectedFieldName] || dropdownOptions[selectedFieldName].length === 0 ? (
                      <tr>
                        <td colSpan={selectedFieldName === 'process' ? 5 : 4} className="py-12 text-center">
                          <div className="text-gray-400">
                            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            <p className="text-lg font-medium">No options found</p>
                            <p className="text-sm mt-1">Click "Add Option" to create a new option</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      dropdownOptions[selectedFieldName]
                        .sort((a, b) => a.display_order - b.display_order)
                        .map((option) => (
                          <tr key={option.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4 text-gray-600">{option.display_order}</td>
                            <td className="py-4 px-4 font-medium text-gray-900">
                              {option.option_value.split(' ').map(word => {
                                if (word.includes('&')) {
                                  return word.split('&').map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join('&');
                                }
                                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                              }).join(' ')}
                            </td>
                            {selectedFieldName === 'process' && (
                              <td className="py-4 px-4 text-gray-600">
                                {option.parent_department || option.parent_business_unit || '-'}
                              </td>
                            )}
                            <td className="py-4 px-4">
                              <Badge variant={option.is_active ? 'success' : 'default'}>
                                {option.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditOption(option)}
                                  title="Edit Option"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleDeleteOption(option)}
                                  title="Delete Option"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Create/Edit Option Modal */}
          {showCreateOptionModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <Card className="max-w-md w-full">
                <CardHeader
                  title={editingOption ? 'Edit Option' : 'Create New Option'}
                  subtitle={editingOption ? 'Update dropdown option' : 'Add a new option to the dropdown'}
                />
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Field Name
                    </label>
                    <Input
                      value={fieldNames.find(f => f.value === newOption.field_name)?.label || newOption.field_name}
                      disabled
                      fullWidth
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Option Value <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={newOption.option_value}
                      onChange={(e) => setNewOption({ ...newOption, option_value: e.target.value })}
                      placeholder="Enter option value"
                      required
                      fullWidth
                    />
                  </div>

                  {selectedFieldName === 'process' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Parent Department
                      </label>
                      <Select
                        value={newOption.parent_department}
                        onChange={(e) => setNewOption({ ...newOption, parent_department: e.target.value })}
                        options={[
                          { value: '', label: 'None (Standalone)' },
                          ...(dropdownOptions['department'] || [])
                            .filter(opt => opt.is_active)
                            .sort((a, b) => a.display_order - b.display_order)
                            .map(opt => ({ value: opt.option_value, label: opt.option_value }))
                        ]}
                        fullWidth
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Select the Department this Process belongs to
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Order
                    </label>
                    <Input
                      type="number"
                      value={newOption.display_order}
                      onChange={(e) => setNewOption({ ...newOption, display_order: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      fullWidth
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Lower numbers appear first in the dropdown
                    </p>
                  </div>

                  {editingOption && (
                    <div>
                      <label className="flex items-center gap-2">
                        <Toggle
                          checked={editingOption.is_active}
                          onChange={(checked) => setEditingOption({ ...editingOption, is_active: checked })}
                        />
                        <span className="text-sm text-gray-700">Active</span>
                      </label>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="primary"
                      onClick={editingOption ? handleUpdateOption : handleCreateOption}
                      disabled={isSavingOption || !newOption.option_value.trim()}
                      isLoading={isSavingOption}
                    >
                      {editingOption ? 'Update' : 'Create'} Option
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateOptionModal(false);
                        setEditingOption(null);
                        setNewOption({ field_name: selectedFieldName, option_value: '', display_order: 0, parent_department: '' });
                      }}
                      disabled={isSavingOption}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Create Role Modal */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader 
              title="Create New Role" 
              subtitle="Add a new role to the system"
            />
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="e.g., external_viewer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isCreatingRole}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Only lowercase letters, numbers, and underscores allowed
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Role description (optional)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isCreatingRole}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  variant="primary"
                  onClick={async () => {
                    if (!newRoleName.trim()) {
                      alert('Role name is required');
                      return;
                    }
                    
                    setIsCreatingRole(true);
                    try {
                      const response = await userService.createRole({
                        name: newRoleName.trim(),
                        description: newRoleDescription.trim() || undefined
                      });
                      
                      if (response.success && response.data) {
                        // Reload roles
                        const rolesResponse = await permissionService.getRoles();
                        if (rolesResponse.success && rolesResponse.data) {
                          setRoles(rolesResponse.data);
                        }
                        
                        setShowCreateRoleModal(false);
                        setNewRoleName('');
                        setNewRoleDescription('');
                        alert('Role created successfully!');
                      } else {
                        alert(response.error || 'Failed to create role');
                      }
                    } catch (error: any) {
                      alert(error.userMessage || 'Failed to create role');
                    } finally {
                      setIsCreatingRole(false);
                    }
                  }}
                  disabled={isCreatingRole || !newRoleName.trim()}
                  isLoading={isCreatingRole}
                >
                  Create Role
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateRoleModal(false);
                    setNewRoleName('');
                    setNewRoleDescription('');
                  }}
                  disabled={isCreatingRole}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Create External User Modal */}
      {showCreateExternalUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader 
              title="Create External User" 
              subtitle="Add a new external user account"
            />
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-[12.8px]">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newExternalUser.email}
                    onChange={(e) => setNewExternalUser({...newExternalUser, email: e.target.value})}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={isCreatingExternalUser}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newExternalUser.name}
                    onChange={(e) => setNewExternalUser({...newExternalUser, name: e.target.value})}
                    placeholder="Full Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={isCreatingExternalUser}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newExternalUser.company}
                  onChange={(e) => setNewExternalUser({...newExternalUser, company: e.target.value})}
                  placeholder="Company Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isCreatingExternalUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newExternalUser.access_reason}
                  onChange={(e) => setNewExternalUser({...newExternalUser, access_reason: e.target.value})}
                  placeholder="Reason for access"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isCreatingExternalUser}
                />
              </div>

              <div className="grid grid-cols-2 gap-[12.8px]">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expires At
                  </label>
                  <input
                    type="date"
                    value={newExternalUser.expires_at}
                    onChange={(e) => setNewExternalUser({...newExternalUser, expires_at: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={isCreatingExternalUser}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={newExternalUser.notes}
                  onChange={(e) => setNewExternalUser({...newExternalUser, notes: e.target.value})}
                  placeholder="Additional notes (optional)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isCreatingExternalUser}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  variant="primary"
                  onClick={async () => {
                    if (!newExternalUser.email || !newExternalUser.name || !newExternalUser.company || !newExternalUser.access_reason) {
                      alert('Email, name, company, and access reason are required');
                      return;
                    }
                    
                    setIsCreatingExternalUser(true);
                    try {
                      const response = await userService.createExternalUser({
                        email: newExternalUser.email.trim(),
                        name: newExternalUser.name.trim(),
                        company: newExternalUser.company.trim(),
                        access_reason: newExternalUser.access_reason.trim(),
                        expires_at: newExternalUser.expires_at || undefined,
                        notes: newExternalUser.notes.trim() || undefined,
                        role: newExternalUser.role
                      });
                      
                      if (response.success) {
                        // Reload external users
                        const usersResponse = await userService.getExternalUsers();
                        if (usersResponse.success && usersResponse.data) {
                          setExternalUsers(usersResponse.data);
                        }
                        
                        setShowCreateExternalUserModal(false);
                        setNewExternalUser({
                          email: '',
                          name: '',
                          company: '',
                          access_reason: '',
                          expires_at: '',
                          notes: '',
                          role: 'external_user'
                        });
                        alert('External user created successfully! Welcome email has been sent.');
                      } else {
                        alert(response.error || 'Failed to create external user');
                      }
                    } catch (error: any) {
                      console.error('Create external user error:', error);
                      // Check if error has response data (might be successful but axios threw error)
                      if (error.response?.data?.success && error.response?.data?.user) {
                        // Backend succeeded but axios interceptor might have thrown error
                        const usersResponse = await userService.getExternalUsers();
                        if (usersResponse.success && usersResponse.data) {
                          setExternalUsers(usersResponse.data);
                        }
                        setShowCreateExternalUserModal(false);
                        setNewExternalUser({
                          email: '',
                          name: '',
                          company: '',
                          access_reason: '',
                          expires_at: '',
                          notes: '',
                          role: 'external_user'
                        });
                        alert('External user created successfully! Welcome email has been sent.');
                      } else {
                        alert(error.userMessage || error.message || 'Failed to create external user');
                      }
                    } finally {
                      setIsCreatingExternalUser(false);
                    }
                  }}
                  disabled={isCreatingExternalUser || !newExternalUser.email || !newExternalUser.name || !newExternalUser.company || !newExternalUser.access_reason}
                  isLoading={isCreatingExternalUser}
                >
                  Create User
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateExternalUserModal(false);
                    setNewExternalUser({
                      email: '',
                      name: '',
                      company: '',
                      access_reason: '',
                      expires_at: '',
                      notes: '',
                      role: 'default'
                    });
                  }}
                  disabled={isCreatingExternalUser}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AccessManagementPage;

