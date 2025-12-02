import { getMockData, mockChartData, mockFindingActions, mockDropdownOptions } from './mockData.service';
import type { ApiResponse } from '@/types';

// Jira-specific types
export interface JiraFindingAction {
  key: string;
  summary: string;
  description?: string;
  status: string;
  dueDate?: string;
  responsible?: string;
  cLevel?: string;
  auditYear?: string;
  auditName?: string;
  riskLevel?: string;
  [key: string]: any;
}

export interface FindingStatusByYear {
  [year: string]: {
    [status: string]: number;
  };
}

export interface ChartDataResponse {
  labels: string[];
  datasets: any[];
}

export const jiraService = {
  // === Audit Projects ===
  getAuditProjectsByYear: async (auditYear?: string): Promise<any> => {
    // Return format: Array of { auditYear: string, count: number }
    const allProjects = [
      { auditYear: '2025', count: 20 },
      { auditYear: '2024', count: 25 },
      { auditYear: '2023', count: 22 },
      { auditYear: '2022', count: 18 },
      { auditYear: '2021', count: 15 },
    ];
    
    if (auditYear === 'all') {
      return getMockData('audit-projects-by-year', allProjects);
    } else {
      // For '2024+' or undefined, return all years (default behavior)
      return getMockData('audit-projects-by-year', allProjects);
    }
  },

  // === Investigations ===
  getInvestigationCounts: async (auditYear?: string): Promise<any> => {
    // Return format: Array of { year: string, count: number, yearPerAuditor?: string }
    const allInvestigations = [
      { year: '2025', count: 8, yearPerAuditor: '0.87' },
      { year: '2024', count: 12, yearPerAuditor: '1.31' },
      { year: '2023', count: 10, yearPerAuditor: '1.15' },
      { year: '2022', count: 8, yearPerAuditor: '0.92' },
      { year: '2021', count: 7, yearPerAuditor: '0.81' },
    ];
    
    if (auditYear === 'all') {
      return getMockData('investigation-counts', allInvestigations);
    } else {
      // For '2024+' or undefined, return all years (default behavior)
      return getMockData('investigation-counts', allInvestigations);
    }
  },

  // === Finding Status ===
  getFindingStatusByYear: async (_auditTypes?: string[], _auditCountries?: string[]): Promise<FindingStatusByYear> => {
    return getMockData('finding-status-by-year', mockChartData['finding-status-by-year']);
  },

  // === Finding Actions ===
  getFindingActionStatusDistribution: async (auditYear?: string): Promise<any> => {
    // Return format expected by Dashboard: { statusDistribution: {...}, totalFinancialImpact: number, parentKeys: [...] }
    // If auditYear is 'all', return all years data, otherwise return 2024+ data
    if (auditYear === 'all') {
      const statusDistribution = {
        'Open': 85,
        'In Progress': 62,
        'Closed': 145,
        'Risk Accepted': 18,
        'Overdue': 35,
      };
      return getMockData('finding-action-status-distribution', {
        statusDistribution,
        totalFinancialImpact: 1250000,
        parentKeys: ['FND-001', 'FND-002', 'FND-003', 'FND-004', 'FND-005', 'FND-006', 'FND-007', 'FND-008', 'FND-009', 'FND-010'],
      });
    } else {
      // 2024+ data
      const statusDistribution = {
        'Open': 45,
        'In Progress': 32,
        'Closed': 78,
        'Risk Accepted': 10,
        'Overdue': 18,
      };
      return getMockData('finding-action-status-distribution', {
        statusDistribution,
        totalFinancialImpact: 750000,
        parentKeys: ['FND-001', 'FND-002', 'FND-003', 'FND-004', 'FND-005', 'FND-006', 'FND-007', 'FND-008'],
      });
    }
  },

  getActionsByAuditAndRisk: async (_auditYear?: string): Promise<any> => {
    return getMockData('actions-by-audit-and-risk', mockChartData['actions-by-audit-and-risk']);
  },

  getActionsByAuditRiskDetail: async (auditYear: string, auditName: string, riskLevel?: string): Promise<any> => {
    return getMockData('actions-by-audit-risk-detail', mockFindingActions.filter(a => 
      a.auditYear === auditYear && a.auditName === auditName && (!riskLevel || a.riskLevel === riskLevel)
    ));
  },

  getFindingsByAuditAndRisk: async (_auditYear?: string): Promise<any> => {
    return getMockData('findings-by-audit-and-risk', mockChartData['findings-by-audit-and-risk']);
  },

  getFindingsByAuditRiskDetail: async (_auditYear: string, _auditName: string, _riskLevel?: string): Promise<any> => {
    return getMockData('findings-by-audit-risk-detail', []);
  },

  getFindingActionsByLead: async (): Promise<any> => {
    return getMockData('finding-actions-by-lead', {});
  },

  getUserFindingActions: async (filters?: { auditYear?: string; cLevel?: string }): Promise<JiraFindingAction[]> => {
    let filtered = [...mockFindingActions] as any[];
    if (filters?.auditYear && filters.auditYear !== 'all' && filters.auditYear !== '2024+') {
      filtered = filtered.filter(a => a.auditYear === filters.auditYear);
    }
    // If '2024+' or 'all' or undefined, return all actions
    if (filters?.cLevel) {
      filtered = filtered.filter((a: any) => a.cLevel === filters.cLevel);
    }
    return getMockData('user-finding-actions', filtered) as Promise<JiraFindingAction[]>;
  },

  getDepartmentFindingActions: async (filters?: { auditYear?: string; userEmail?: string }): Promise<any> => {
    // Filter actions for department_director users (actions starting with AUDIT-3)
    let departmentActions = mockFindingActions.filter(a => a.key.startsWith('AUDIT-3')) as any[];
    
    // If userEmail is provided (for impersonation/view as), filter by that user's email
    if (filters?.userEmail) {
      departmentActions = departmentActions.filter(a => a.responsibleEmail === filters.userEmail);
    }
    
    if (filters?.auditYear && filters.auditYear !== 'all' && filters.auditYear !== '2024+') {
      departmentActions = departmentActions.filter(a => a.auditYear === filters.auditYear);
    }
    // If '2024+' or 'all' or undefined, return all department actions (already filtered by prefix and/or email)
    
    return getMockData('department-finding-actions', departmentActions);
  },

  getCLevelFindingActions: async (filters?: { auditYear?: string; cLevel?: string }): Promise<any> => {
    // Filter actions for C-level executives (actions starting with AUDIT-C)
    let filtered = (mockFindingActions.filter(a => a.key.startsWith('AUDIT-C')) as any[]).map(a => ({
      ...a,
      status: a.status || 'Open',
      displayStatus: a.displayStatus || a.status || 'Open',
      dueDate: a.dueDate || new Date().toISOString().split('T')[0],
      responsible: a.responsible || a.responsibleEmail || '',
      responsibleEmail: a.responsibleEmail || a.responsible || '',
      auditYear: a.auditYear || '2024',
      auditName: a.auditName || 'Audit',
      riskLevel: a.riskLevel || 'Medium',
    }));
    
    if (filters?.auditYear && filters.auditYear !== 'all' && filters.auditYear !== '2024+') {
      filtered = filtered.filter(a => a.auditYear === filters.auditYear);
    }
    // If '2024+' or 'all' or undefined, return all C-level actions (already filtered by prefix)
    
    if (filters?.cLevel) {
      filtered = filtered.filter((a: any) => a.cLevel === filters.cLevel);
    }
    
    return getMockData('clevel-finding-actions', filtered);
  },

  getAllFindingActions: async (filters?: { auditYear?: string }): Promise<any> => {
    let filtered = [...mockFindingActions];
    if (filters?.auditYear && filters.auditYear !== 'all' && filters.auditYear !== '2024+') {
      filtered = filtered.filter(a => a.auditYear === filters.auditYear);
    }
    // If '2024+' or 'all' or undefined, return all actions
    return getMockData('all-finding-actions', filtered);
  },

  getVPFindingActions: async (filters?: { auditYear?: string; cLevel?: string }): Promise<any> => {
    let filtered = [...mockFindingActions] as any[];
    if (filters?.auditYear && filters.auditYear !== 'all' && filters.auditYear !== '2024+') {
      filtered = filtered.filter(a => a.auditYear === filters.auditYear);
    }
    // If '2024+' or 'all' or undefined, return all actions
    if (filters?.cLevel) {
      filtered = filtered.filter((a: any) => (a as any).cLevel === filters.cLevel);
    }
    return getMockData('vp-finding-actions', filtered);
  },

  // === Finding Actions Aging ===
  getFindingActionsAging: async (): Promise<any> => {
    return getMockData('finding-actions-aging', mockChartData['finding-actions-aging']);
  },

  getFindingActionAgeSummary: async (): Promise<any> => {
    return getMockData('finding-action-age-summary', { total: 58, averageAge: 45 });
  },

  // === Risk Distribution ===
  getFindingRiskDistributionByProject: async (): Promise<any> => {
    return getMockData('finding-risk-distribution-by-project', mockChartData['finding-risk-distribution-by-project']);
  },

  getFindingDetailsByControlAndRisk: async (): Promise<any> => {
    return getMockData('finding-details-by-control-and-risk', []);
  },

  getFindingDetailsByTypeAndRisk: async (): Promise<any> => {
    return getMockData('finding-details-by-type-and-risk', []);
  },

  // === Financial Impact ===
  getFraudImpactScoreCards: async (): Promise<any> => {
    // Return format: { scoreCards: [{ year: string, impact: number | string }, ...] }
    return getMockData('fraud-impact-score-cards', {
      scoreCards: [
        { year: '2025', impact: '1,340,000' },
        { year: '2024', impact: '2,710,000' },
        { year: '2023', impact: '1,560,000' },
        { year: '2022', impact: '3,500,000' },
        { year: '2021', impact: '960,000' },
      ],
    });
  },

  getLpImpactScoreCards: async (): Promise<any> => {
    // Return format: { scoreCards: [{ year: string, impact: number | string }, ...] }
    return getMockData('lp-impact-score-cards', {
      scoreCards: [
        { year: '2025', impact: '930,000' },
        { year: '2024', impact: '760,000' },
        { year: '2023', impact: '230,000' },
        { year: '2022', impact: '70,000' },
        { year: '2021', impact: '50,000' },
      ],
    });
  },

  getFinancialImpactSum: async (): Promise<any> => {
    return getMockData('financial-impact-sum', { total: 335000 });
  },

  // === Audit Maturity ===
  getMatScores: async (): Promise<any> => {
    // Return format: { average2024: number, average2025: number, '2024': {...}, '2025': {...} }
    return getMockData('mat-scores', {
      average2024: 3.8,
      average2025: 4.1,
      '2024': {
        overall: 3.8,
        categories: {
          'Governance': 4.2,
          'Risk Management': 3.9,
          'Control Environment': 3.7,
          'Monitoring': 3.6,
          'Communication': 4.0,
        },
      },
      '2025': {
        overall: 4.1,
        categories: {
          'Governance': 4.4,
          'Risk Management': 4.2,
          'Control Environment': 4.0,
          'Monitoring': 3.9,
          'Communication': 4.2,
        },
      },
    });
  },

  getRadarChartData: async (): Promise<any> => {
    // Return format: { labels: [...], datasets: [...] }
    return getMockData('radar-chart-data', {
      labels: ['Governance', 'Risk Management', 'Control Environment', 'Monitoring', 'Communication'],
      datasets: [{
        label: '2024',
        data: [4.2, 3.9, 3.7, 3.6, 4.0],
        borderColor: 'rgba(99, 102, 241, 1)',
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
      }, {
        label: '2025',
        data: [4.4, 4.2, 4.0, 3.9, 4.2],
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
      }],
    });
  },

  // === Google Sheets ===
  getGoogleSheetData: async (): Promise<any> => {
    return getMockData('google-sheet-data', mockChartData['fraud-internal-control']);
  },

  // === Filters ===
  getAuditTypes: async (): Promise<string[]> => {
    return getMockData('audit-types', mockDropdownOptions['audit_type']);
  },

  getAuditCountries: async (): Promise<string[]> => {
    return getMockData('audit-countries', mockDropdownOptions['country']);
  },

  getCLevelOptions: async (): Promise<string[]> => {
    return getMockData('clevel-options', mockDropdownOptions['clevel']);
  },

  getActionResponsibleOptions: async (): Promise<string[]> => {
    return getMockData('action-responsible-options', ['john.doe@example.com', 'jane.smith@example.com', 'bob.wilson@example.com']);
  },

  // Action Age Distribution
  getActionAgeDistribution: async (_filters?: { responsibleEmail?: string; auditYear?: string }) => {
    // Return format: { 'age-range': number, ... }
    const actionAgeData = {
      '-720—360': 2,
      '-360—180': 3,
      '-180—90': 5,
      '-90—30': 8,
      '-30—0': 12,
      '0—30': 20,
      '30—90': 15,
      '90—180': 10,
      '180—360': 8,
      '360—720': 5,
      '720+': 3,
    };
    return getMockData('action-age-distribution', actionAgeData);
  },

  // Lead Status Distribution
  getLeadStatusDistribution: async (_auditYear: '2024+' | 'all' = '2024+') => {
    // Return format: { 'Lead Name': { 'Open': number, 'Closed': number, ... }, ... }
    const leadStatusData = {
      'John Doe': { 'Open': 8, 'In Progress': 5, 'Closed': 12, 'Risk Accepted': 2 },
      'Jane Smith': { 'Open': 6, 'In Progress': 4, 'Closed': 10, 'Risk Accepted': 1 },
      'Bob Wilson': { 'Open': 11, 'In Progress': 9, 'Closed': 23, 'Risk Accepted': 2 },
    };
    return getMockData('lead-status-distribution', leadStatusData);
  },

  // Project Risk Distribution
  getProjectRiskDistribution: async () => {
    return getMockData('project-risk-distribution', mockChartData['project-risk-distribution']);
  },

  // Department Stats
  getDepartmentStats: async () => {
    return getMockData('department-stats', mockChartData['department-stats']);
  },

  // === Export ===
  exportFindingActions: async (_filters?: any): Promise<Blob> => {
    await getMockData('export', null, 200);
    // Return empty blob for mock
    return new Blob(['Mock export data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  },

  exportFindingActionsAging: async (): Promise<Blob> => {
    await getMockData('export-aging', null, 200);
    return new Blob(['Mock export data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  },

  // === Email ===
  getActionResponsibleList: async (): Promise<ApiResponse<any>> => {
    return getMockData('action-responsible-list', {
      success: true,
      data: [{ email: 'john.doe@example.com', name: 'John Doe' }],
    });
  },

  getAllActionResponsibleList: async (): Promise<ApiResponse<any>> => {
    return getMockData('all-action-responsible-list', {
      success: true,
      data: [
        { email: 'john.doe@example.com', name: 'John Doe' },
        { email: 'jane.smith@example.com', name: 'Jane Smith' },
      ],
    });
  },

  getCLevelList: async (): Promise<ApiResponse<any>> => {
    return getMockData('clevel-list', {
      success: true,
      data: [{ email: 'cfo@example.com', name: 'CFO' }],
    });
  },

  getVPList: async (): Promise<ApiResponse<any>> => {
    return getMockData('vp-list', {
      success: true,
      data: [{ email: 'vp@example.com', name: 'VP Operations' }],
    });
  },

  getActionDataForEmail: async (
    _recipientEmail: string,
    _reportingTarget: 'action_responsible' | 'clevel' | 'vp',
    _auditYear?: string
  ): Promise<ApiResponse<{
    chartHTML: string;
    ownershipBreakdownHTML?: string;
    teamOverdueTableHTML?: string;
    teamUpcomingTableHTML?: string;
    overdueTableHTML: string;
    upcomingTableHTML: string;
    riskAcceptedTableHTML: string;
    openFinancialImpact: string;
    overdueFinancialImpact: string;
    overdueCount: number;
    upcomingCount: number;
    riskAcceptedCount: number;
  }>> => {
    return getMockData('action-data-for-email', {
      success: true,
      data: {
        chartHTML: '<div>Mock Chart</div>',
        overdueTableHTML: '<table>Mock Overdue</table>',
        upcomingTableHTML: '<table>Mock Upcoming</table>',
        riskAcceptedTableHTML: '<table>Mock Risk Accepted</table>',
        openFinancialImpact: '25.5 Bin €',
        overdueFinancialImpact: '15.2 Bin €',
        overdueCount: 12,
        upcomingCount: 8,
        riskAcceptedCount: 3,
      },
    });
  },

  previewEmail: async (_data: any): Promise<ApiResponse<any>> => {
    return getMockData('preview-email', { success: true, data: { html: '<div>Mock Preview</div>' } });
  },

  sendEmail: async (_data: any): Promise<ApiResponse<any>> => {
    return getMockData('send-email', { success: true });
  },

  sendActionResponsibleEmail: async (_data: any): Promise<ApiResponse<any>> => {
    return getMockData('send-action-responsible-email', { success: true });
  },

  sendCLevelEmail: async (_data: any): Promise<ApiResponse<any>> => {
    return getMockData('send-clevel-email', { success: true });
  },

  // Finding Distribution Tables
  getControlElementDistribution: async (_auditYear?: string): Promise<any[]> => {
    return getMockData('control-element-distribution', mockChartData['control-element-distribution']);
  },

  getRiskTypeDistribution: async (_auditYear?: string): Promise<any[]> => {
    return getMockData('risk-type-distribution', mockChartData['risk-type-distribution']);
  },

  // Get detailed actions by status (for modal)
  getActionsByStatus: async (status: string, auditYear?: string): Promise<any[]> => {
    let filtered = mockFindingActions.filter(a => a.status === status);
    if (auditYear) {
      filtered = filtered.filter(a => a.auditYear === auditYear);
    }
    return getMockData('actions-by-status', filtered);
  },

  // Google Sheets data
  getFraudInternalControl: async (): Promise<{ result: string[][] }> => {
    return getMockData('fraud-internal-control', mockChartData['fraud-internal-control']);
  },

  getLossPreventionSummary: async (): Promise<{ result: string[][] }> => {
    return getMockData('loss-prevention-summary', mockChartData['loss-prevention-summary']);
  },

  // Get overdue actions
  getOverdueActions: async (): Promise<any[]> => {
    // Return array of action objects
    return getMockData('overdue-actions', [
      {
        key: 'AUDIT-1001',
        summary: 'Implement enhanced financial controls',
        status: 'Overdue',
        dueDate: '2024-12-15',
        responsible: 'john.doe@example.com',
        auditYear: '2024',
        auditName: 'Financial Audit',
        riskLevel: 'High',
      },
      {
        key: 'AUDIT-1004',
        summary: 'Update compliance documentation',
        status: 'Overdue',
        dueDate: '2024-11-30',
        responsible: 'jane.smith@example.com',
        auditYear: '2024',
        auditName: 'Compliance Audit',
        riskLevel: 'Medium',
      },
    ]);
  },

  // Get upcoming actions (within 30 days)
  getUpcomingActions: async (): Promise<any[]> => {
    // Return array of action objects
    const today = new Date();
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return getMockData('upcoming-actions', [
      {
        key: 'AUDIT-1002',
        summary: 'Update IT security policies',
        status: 'Open',
        dueDate: in30Days.toISOString().split('T')[0],
        responsible: 'jane.smith@example.com',
        auditYear: '2024',
        auditName: 'IT Audit',
        riskLevel: 'Medium',
      },
      {
        key: 'AUDIT-1005',
        summary: 'Review operational procedures',
        status: 'In Progress',
        dueDate: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        responsible: 'bob.wilson@example.com',
        auditYear: '2024',
        auditName: 'Operational Audit',
        riskLevel: 'Low',
      },
    ]);
  },

  // Get Team Finding Actions (filtered by customfield_22459 - Manager Email)
  getTeamFindingActions: async (filters?: { auditYear?: string; managerEmail?: string }): Promise<any> => {
    // Filter actions for team_manager users (actions starting with AUDIT-4)
    let filtered = mockFindingActions.filter(a => a.key.startsWith('AUDIT-4')) as any[];
    
    if (filters?.auditYear && filters.auditYear !== 'all' && filters.auditYear !== '2024+') {
      filtered = filtered.filter(a => a.auditYear === filters.auditYear);
    }
    // If '2024+' or 'all' or undefined, return all team actions (already filtered by prefix)
    if (filters?.managerEmail) {
      filtered = filtered.filter(a => a.responsibleEmail === filters.managerEmail);
    }
    
    // Return format: { data: [...], managerInfo?: { manager1: {...}, manager2: {...} } }
    // If managerEmail is provided, return just the array
    if (filters?.managerEmail) {
      return getMockData('team-finding-actions', filtered);
    }
    
    // Otherwise return with managerInfo for team_manager role
    return getMockData('team-finding-actions', {
      data: filtered,
      managerInfo: {
        manager1: { email: 'manager1@example.com', name: 'Manager One' },
        manager2: { email: 'manager2@example.com', name: 'Manager Two' },
        manager3: { email: 'manager3@example.com', name: 'Manager Three' },
        manager4: { email: 'manager4@example.com', name: 'Manager Four' },
      },
    });
  },

  // Management Finding Actions (filtered by customfield_22185 with logged-in user's email)
  getManagementFindingActions: async (filters?: { auditYear?: string }): Promise<any[]> => {
    let filtered = [...mockFindingActions];
    if (filters?.auditYear && filters.auditYear !== 'all' && filters.auditYear !== '2024+') {
      filtered = filtered.filter(a => a.auditYear === filters.auditYear);
    }
    // If '2024+' or 'all' or undefined, return all actions
    return getMockData('management-finding-actions', filtered);
  },
};

