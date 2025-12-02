import { useQuery } from '@tanstack/react-query';
import { jiraService } from '@/services/jira.service';

// Default query options for better error handling
const defaultQueryOptions = {
  retry: 2, // Retry failed requests twice
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  staleTime: 5 * 60 * 1000, // 5 minutes
  onError: () => {
    // Error handling (removed console for production)
  },
};

// Hook for audit projects by year
export function useAuditProjectsByYear(auditYear?: string) {
  return useQuery({
    queryKey: ['audit-projects-by-year', auditYear],
    queryFn: () => jiraService.getAuditProjectsByYear(auditYear),
    ...defaultQueryOptions,
  });
}

// Hook for investigation counts
export function useInvestigationCounts(auditYear?: string) {
  return useQuery({
    queryKey: ['investigation-counts', auditYear],
    queryFn: () => jiraService.getInvestigationCounts(auditYear),
    ...defaultQueryOptions,
  });
}

// Hook for finding status by year
export function useFindingStatusByYear(auditTypes?: string[], auditCountries?: string[]) {
  return useQuery({
    queryKey: ['finding-status-by-year', auditTypes, auditCountries],
    queryFn: () => jiraService.getFindingStatusByYear(auditTypes, auditCountries),
    ...defaultQueryOptions,
  });
}

// Hook for finding action status distribution
export function useFindingActionStatusDistribution(auditYear?: string) {
  return useQuery({
    queryKey: ['finding-action-status-distribution', auditYear],
    queryFn: () => jiraService.getFindingActionStatusDistribution(auditYear),
    ...defaultQueryOptions,
  });
}

// Hook for actions breakdown by audit and risk
export function useActionsByAuditAndRisk(auditYear?: string) {
  return useQuery({
    queryKey: ['actions-by-audit-and-risk', auditYear],
    queryFn: () => jiraService.getActionsByAuditAndRisk(auditYear),
    ...defaultQueryOptions,
  });
}

// Hook for findings breakdown by audit and risk
export function useFindingsByAuditAndRisk(auditYear?: string) {
  return useQuery({
    queryKey: ['findings-by-audit-and-risk', auditYear],
    queryFn: () => jiraService.getFindingsByAuditAndRisk(auditYear),
    ...defaultQueryOptions,
  });
}

// Hook for user finding actions  
export function useUserFindingActions(filters?: { auditYear?: string; cLevel?: string }) {
  return useQuery({
    queryKey: ['user-finding-actions', filters],
    queryFn: () => jiraService.getUserFindingActions(filters),
    enabled: true, // Always enabled
    ...defaultQueryOptions,
    staleTime: 2 * 60 * 1000, // 2 minutes for user-specific data
  });
}

// Hook for VP finding actions
export function useVPFindingActions(filters?: { auditYear?: string; cLevel?: string }) {
  return useQuery({
    queryKey: ['vp-finding-actions', filters],
    queryFn: () => jiraService.getVPFindingActions(filters),
    enabled: true,
    ...defaultQueryOptions,
    staleTime: 2 * 60 * 1000,
  });
}

// Hook for department finding actions
export function useDepartmentFindingActions(filters?: { auditYear?: string; userEmail?: string }) {
  return useQuery({
    queryKey: ['department-finding-actions', filters],
    queryFn: () => jiraService.getDepartmentFindingActions(filters),
    ...defaultQueryOptions,
    staleTime: 2 * 60 * 1000,
  });
}

// Hook for C-Level finding actions
export function useCLevelFindingActions(filters?: { auditYear?: string }) {
  return useQuery({
    queryKey: ['clevel-finding-actions', filters],
    queryFn: () => jiraService.getCLevelFindingActions(filters),
    ...defaultQueryOptions,
    staleTime: 2 * 60 * 1000,
  });
}

// Hook for All finding actions
export function useAllFindingActions(filters?: { auditYear?: string }) {
  return useQuery({
    queryKey: ['all-finding-actions', filters],
    queryFn: () => jiraService.getAllFindingActions(filters),
    ...defaultQueryOptions,
    staleTime: 2 * 60 * 1000,
  });
}

// Hook for fraud impact
export function useFraudImpactScoreCards() {
  return useQuery({
    queryKey: ['fraud-impact-score-cards'],
    queryFn: () => jiraService.getFraudImpactScoreCards(),
    ...defaultQueryOptions,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for LP impact
export function useLpImpactScoreCards() {
  return useQuery({
    queryKey: ['lp-impact-score-cards'],
    queryFn: () => jiraService.getLpImpactScoreCards(),
    ...defaultQueryOptions,
    staleTime: 10 * 60 * 1000,
  });
}

// Hook for MAT scores (Audit Maturity)
export function useMatScores() {
  return useQuery({
    queryKey: ['mat-scores'],
    queryFn: () => jiraService.getMatScores(),
    ...defaultQueryOptions,
    staleTime: 10 * 60 * 1000,
  });
}

// Hook for radar chart data
export function useRadarChartData() {
  return useQuery({
    queryKey: ['radar-chart-data'],
    queryFn: () => jiraService.getRadarChartData(),
    ...defaultQueryOptions,
    staleTime: 10 * 60 * 1000,
  });
}

// Hook for risk distribution
export function useRiskDistribution() {
  return useQuery({
    queryKey: ['risk-distribution'],
    queryFn: () => jiraService.getFindingRiskDistributionByProject(),
    ...defaultQueryOptions,
  });
}

// Hook for finding actions aging
export function useFindingActionsAging() {
  return useQuery({
    queryKey: ['finding-actions-aging'],
    queryFn: () => jiraService.getFindingActionsAging(),
    ...defaultQueryOptions,
  });
}

// Hook for audit types filter options
export function useAuditTypes() {
  return useQuery({
    queryKey: ['audit-types'],
    queryFn: () => jiraService.getAuditTypes(),
    ...defaultQueryOptions,
    staleTime: 30 * 60 * 1000, // 30 minutes (rarely changes)
  });
}

// Hook for audit countries filter options
export function useAuditCountries() {
  return useQuery({
    queryKey: ['audit-countries'],
    queryFn: () => jiraService.getAuditCountries(),
    ...defaultQueryOptions,
    staleTime: 30 * 60 * 1000,
  });
}

// Hook for C-Level options
export function useCLevelOptions() {
  return useQuery({
    queryKey: ['clevel-options'],
    queryFn: () => jiraService.getCLevelOptions(),
    ...defaultQueryOptions,
    staleTime: 30 * 60 * 1000,
  });
}

// Hook for Action Responsible options
export function useActionResponsibleOptions() {
  return useQuery({
    queryKey: ['action-responsible-options'],
    queryFn: () => jiraService.getActionResponsibleOptions(),
    ...defaultQueryOptions,
    staleTime: 30 * 60 * 1000,
  });
}

// Hook for Action Age Distribution
export function useActionAgeDistribution(filters?: { responsibleEmail?: string; auditYear?: string }) {
  return useQuery({
    queryKey: ['action-age-distribution', filters],
    queryFn: () => jiraService.getActionAgeDistribution(filters),
    ...defaultQueryOptions,
  });
}

// Hook for Lead Status Distribution
export function useLeadStatusDistribution(auditYear: '2024+' | 'all' = '2024+') {
  return useQuery({
    queryKey: ['lead-status-distribution', auditYear],
    queryFn: () => jiraService.getLeadStatusDistribution(auditYear),
    ...defaultQueryOptions,
  });
}

// Hook for Project Risk Distribution
export function useProjectRiskDistribution() {
  return useQuery({
    queryKey: ['project-risk-distribution'],
    queryFn: () => jiraService.getProjectRiskDistribution(),
    ...defaultQueryOptions,
  });
}

// Hook for Department Stats
export function useDepartmentStats() {
  return useQuery({
    queryKey: ['department-stats'],
    queryFn: () => jiraService.getDepartmentStats(),
    ...defaultQueryOptions,
    staleTime: 2 * 60 * 1000,
  });
}

// Hook for Control Element Distribution
export function useControlElementDistribution(auditYear?: string) {
  return useQuery({
    queryKey: ['control-element-distribution', auditYear],
    queryFn: () => jiraService.getControlElementDistribution(auditYear),
    ...defaultQueryOptions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for Risk Type Distribution
export function useRiskTypeDistribution(auditYear?: string) {
  return useQuery({
    queryKey: ['risk-type-distribution', auditYear],
    queryFn: () => jiraService.getRiskTypeDistribution(auditYear),
    ...defaultQueryOptions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for Fraud Internal Control (Google Sheets)
export function useFraudInternalControl() {
  return useQuery({
    queryKey: ['fraud-internal-control'],
    queryFn: () => jiraService.getFraudInternalControl(),
    ...defaultQueryOptions,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for Loss Prevention Summary (Google Sheets)
export function useLossPreventionSummary() {
  return useQuery({
    queryKey: ['loss-prevention-summary'],
    queryFn: () => jiraService.getLossPreventionSummary(),
    ...defaultQueryOptions,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for Overdue Actions
export function useOverdueActions() {
  return useQuery({
    queryKey: ['overdue-actions'],
    queryFn: () => jiraService.getOverdueActions(),
    ...defaultQueryOptions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for Upcoming Actions (within 30 days)
export function useUpcomingActions() {
  return useQuery({
    queryKey: ['upcoming-actions'],
    queryFn: () => jiraService.getUpcomingActions(),
    ...defaultQueryOptions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for Team Finding Actions (filtered by customfield_22459 - Manager Email)
export function useTeamFindingActions(filters?: { auditYear?: string; managerEmail?: string }) {
  return useQuery({
    queryKey: ['team-finding-actions', filters],
    queryFn: () => jiraService.getTeamFindingActions(filters),
    ...defaultQueryOptions,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook for Management Finding Actions (customfield_22185)
export function useManagementFindingActions(filters?: { auditYear?: string }) {
  return useQuery({
    queryKey: ['management-finding-actions', filters],
    queryFn: () => jiraService.getManagementFindingActions(filters),
    ...defaultQueryOptions,
    staleTime: 0, // Always refetch on filter change
  });
}

