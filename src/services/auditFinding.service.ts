import { getMockData, mockAuditFindings, mockDropdownOptions } from './mockData.service';
import type { ApiResponse, AuditFinding, DropdownOption, FindingAttachment, FindingAction, UserByRole } from '@/types';

export interface CreateAuditFindingData {
  finding_name: string;
  finding_description?: string;
  audit_type?: string;
  audit_type_other?: string;
  risk_type?: string;
  internal_control_element?: string;
  country?: string;
  audit_year?: string;
  audit_name: string;
  audit_key?: string;
  risk_level?: string;
  financial_impact?: number;
  status?: string;
  attachments?: Omit<FindingAttachment, 'id' | 'finding_id' | 'uploaded_at'>[];
}

export interface UpdateAuditFindingData extends Partial<CreateAuditFindingData> {
  id: number;
}

export interface AuditFindingFilters {
  audit_name?: string;
  audit_year?: string;
  status?: string;
  risk_level?: string;
}

export interface CreateFindingActionData {
  finding_id: number;
  action_description: string;
  due_date: string;
  audit_lead: string;
  action_responsible: string;
  action_responsible_email?: string;
  action_responsible_vp?: string;
  action_responsible_clevel?: string;
}

export interface UpdateFindingActionData extends Partial<CreateFindingActionData> {
  status?: string;
}

export const auditFindingService = {
  // Get all audit findings with optional filters
  getAuditFindings: async (filters?: AuditFindingFilters): Promise<AuditFinding[]> => {
    let filtered = [...mockAuditFindings];
    if (filters?.audit_name) {
      filtered = filtered.filter(f => f.audit_name === filters.audit_name);
    }
    if (filters?.audit_year) {
      filtered = filtered.filter(f => f.audit_year === filters.audit_year);
    }
    if (filters?.status) {
      filtered = filtered.filter(f => f.status === filters.status);
    }
    if (filters?.risk_level) {
      filtered = filtered.filter(f => f.risk_level === filters.risk_level);
    }
    return getMockData('audit-findings', filtered);
  },

  // Get single audit finding by ID
  getAuditFinding: async (id: number): Promise<AuditFinding> => {
    const finding = mockAuditFindings.find(f => f.id === id);
    if (!finding) throw new Error('Finding not found');
    return getMockData('audit-finding', finding);
  },

  // Create new audit finding
  createAuditFinding: async (data: CreateAuditFindingData): Promise<ApiResponse<AuditFinding>> => {
    const newFinding: AuditFinding = {
      id: mockAuditFindings.length + 1,
      finding_id: `FND-${String(mockAuditFindings.length + 1).padStart(3, '0')}`,
      finding_name: data.finding_name,
      finding_description: data.finding_description,
      audit_type: data.audit_type,
      audit_type_other: data.audit_type_other,
      risk_type: data.risk_type,
      internal_control_element: data.internal_control_element,
      country: data.country,
      audit_year: data.audit_year,
      audit_name: data.audit_name,
      audit_key: data.audit_key,
      risk_level: data.risk_level,
      financial_impact: data.financial_impact,
      status: data.status || 'Open',
      created_by: 'mahmut@turan.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockAuditFindings.push(newFinding);
    return getMockData('create-audit-finding', { success: true, data: newFinding });
  },

  // Update audit finding
  updateAuditFinding: async (id: number, data: Partial<CreateAuditFindingData>): Promise<ApiResponse<AuditFinding>> => {
    const index = mockAuditFindings.findIndex(f => f.id === id);
    if (index === -1) throw new Error('Finding not found');
    mockAuditFindings[index] = { ...mockAuditFindings[index], ...data, updated_at: new Date().toISOString() };
    return getMockData('update-audit-finding', { success: true, data: mockAuditFindings[index] });
  },

  // Delete audit finding
  deleteAuditFinding: async (id: number): Promise<ApiResponse<void>> => {
    const index = mockAuditFindings.findIndex(f => f.id === id);
    if (index !== -1) mockAuditFindings.splice(index, 1);
    return getMockData('delete-audit-finding', { success: true });
  },

  // Get dropdown options for a field (values only)
  getDropdownOptions: async (fieldName: string): Promise<string[]> => {
    const options = mockDropdownOptions[fieldName as keyof typeof mockDropdownOptions] || [];
    return getMockData('dropdown-options', options);
  },

  // Get dropdown options with full details (admin only)
  getDropdownOptionsFull: async (fieldName: string): Promise<DropdownOption[]> => {
    const options = mockDropdownOptions[fieldName as keyof typeof mockDropdownOptions] || [];
    return getMockData('dropdown-options-full', options.map((opt, idx) => ({
      id: idx + 1,
      field_name: fieldName,
      option_value: opt,
      display_order: idx + 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })));
  },

  // Get dropdown options filtered by parent (for cascade)
  getDropdownOptionsByParent: async (fieldName: string, parentValue: string | null): Promise<DropdownOption[]> => {
    const options = mockDropdownOptions[fieldName as keyof typeof mockDropdownOptions] || [];
    return getMockData('dropdown-options-by-parent', options.map((opt, idx) => ({
      id: idx + 1,
      field_name: fieldName,
      option_value: opt,
      display_order: idx + 1,
      is_active: true,
      parent_department: parentValue,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })));
  },

  // Create dropdown option (admin only)
  createDropdownOption: async (data: { field_name: string; option_value: string; display_order?: number; parent_department?: string }): Promise<ApiResponse<DropdownOption>> => {
    const option: DropdownOption = {
      id: Date.now(),
      field_name: data.field_name,
      option_value: data.option_value,
      display_order: data.display_order || 1,
      is_active: true,
      parent_department: data.parent_department || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return getMockData('create-dropdown-option', { success: true, data: option });
  },

  // Update dropdown option (admin only)
  updateDropdownOption: async (id: number, data: { option_value?: string; display_order?: number; is_active?: boolean; parent_department?: string }): Promise<ApiResponse<DropdownOption>> => {
    const option: DropdownOption = {
      id,
      field_name: 'mock',
      option_value: data.option_value || 'mock',
      display_order: data.display_order || 1,
      is_active: data.is_active !== undefined ? data.is_active : true,
      parent_department: data.parent_department || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return getMockData('update-dropdown-option', { success: true, data: option });
  },

  // Delete dropdown option (admin only)
  deleteDropdownOption: async (id: number): Promise<ApiResponse<void>> => {
    return getMockData('delete-dropdown-option', { success: true });
  },


  // Add attachment to finding
  addAttachment: async (findingId: number, data: { file_name: string; file_size?: number; file_type?: string; file_path?: string }): Promise<ApiResponse<FindingAttachment>> => {
    const attachment: FindingAttachment = {
      id: Date.now(),
      finding_id: findingId,
      file_name: data.file_name,
      file_size: data.file_size,
      file_type: data.file_type,
      file_path: data.file_path,
      uploaded_by: 'mahmut@turan.com',
      uploaded_at: new Date().toISOString(),
    };
    return getMockData('add-attachment', { success: true, data: attachment });
  },

  // Delete attachment
  deleteAttachment: async (attachmentId: number): Promise<ApiResponse<void>> => {
    return getMockData('delete-attachment', { success: true });
  },

  // Finding Actions
  getFindingActions: async (findingId: number): Promise<FindingAction[]> => {
    return getMockData('finding-actions', []);
  },

  getFindingAction: async (id: number): Promise<FindingAction> => {
    const action: FindingAction = {
      id,
      action_id: `ACT-${id}`,
      finding_id: 1,
      action_description: 'Mock action',
      due_date: new Date().toISOString(),
      audit_lead: 'John Doe',
      action_responsible: 'Jane Smith',
      audit_name: 'Mock Audit',
      audit_year: '2024',
      status: 'Open',
      created_by: 'mahmut@turan.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return getMockData('finding-action', action);
  },

  createFindingAction: async (data: CreateFindingActionData): Promise<ApiResponse<FindingAction>> => {
    const action: FindingAction = {
      id: Date.now(),
      action_id: `ACT-${Date.now()}`,
      finding_id: data.finding_id,
      action_description: data.action_description,
      due_date: data.due_date,
      audit_lead: data.audit_lead,
      action_responsible: data.action_responsible,
      action_responsible_email: data.action_responsible_email,
      action_responsible_vp: data.action_responsible_vp,
      action_responsible_clevel: data.action_responsible_clevel,
      audit_name: 'Mock Audit',
      audit_year: '2024',
      status: 'Open',
      created_by: 'mahmut@turan.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return getMockData('create-finding-action', { success: true, data: action });
  },

  updateFindingAction: async (id: number, data: UpdateFindingActionData): Promise<ApiResponse<FindingAction>> => {
    const action: FindingAction = {
      id,
      action_id: `ACT-${id}`,
      finding_id: 1,
      action_description: data.action_description || 'Mock action',
      due_date: data.due_date || new Date().toISOString(),
      audit_lead: data.audit_lead || 'John Doe',
      action_responsible: data.action_responsible || 'Jane Smith',
      audit_name: 'Mock Audit',
      audit_year: '2024',
      status: data.status || 'Open',
      created_by: 'mahmut@turan.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return getMockData('update-finding-action', { success: true, data: action });
  },

  deleteFindingAction: async (id: number): Promise<ApiResponse<void>> => {
    return getMockData('delete-finding-action', { success: true });
  },

  // Users by role
  getUsersByRole: async (role: string): Promise<UserByRole[]> => {
    if (role === 'department_director') {
      return getMockData('users-by-role', [
        { id: 1, email: 'dept1.director@example.com', name: 'Department 1 Director', department: 'Operations' },
        { id: 2, email: 'dept2.director@example.com', name: 'Department 2 Director', department: 'Finance' },
        { id: 3, email: 'dept3.director@example.com', name: 'Department 3 Director', department: 'IT' },
        { id: 4, email: 'dept4.director@example.com', name: 'Department 4 Director', department: 'HR' },
        { id: 5, email: 'dept5.director@example.com', name: 'Department 5 Director', department: 'Marketing' },
      ]);
    }
    return getMockData('users-by-role', [
      { id: 1, email: 'user1@example.com', name: 'User One', department: 'IT' },
      { id: 2, email: 'user2@example.com', name: 'User Two', department: 'Finance' },
    ]);
  },

  // Get user hierarchy (VP and C-Level emails)
  getUserHierarchy: async (email: string): Promise<{ vp_email: string | null; c_level_email: string | null }> => {
    return getMockData('user-hierarchy', { vp_email: 'vp@example.com', c_level_email: 'cfo@example.com' });
  },

  // Get finding history
  getFindingHistory: async (findingId: number): Promise<ApiResponse<any[]>> => {
    return getMockData('finding-history', { success: true, data: [] });
  },

  // Get action history
  getActionHistory: async (actionId: number): Promise<ApiResponse<any[]>> => {
    return getMockData('action-history', { success: true, data: [] });
  },

  // Bulk upload findings
  bulkUploadFindings: async (formData: FormData): Promise<ApiResponse<{ createdCount: number; errors: string[] }>> => {
    return getMockData('bulk-upload-findings', { success: true, data: { createdCount: 5, errors: [] } });
  },
};

