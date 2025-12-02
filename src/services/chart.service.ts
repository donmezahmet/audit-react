import { getMockData } from './mockData.service';
import type { Chart, ChartData, ApiResponse } from '@/types';

export interface ChartFilters {
  startDate?: string;
  endDate?: string;
  [key: string]: any;
}

export const chartService = {
  // Get all available charts
  getCharts: async (): Promise<ApiResponse<Chart[]>> => {
    return getMockData('charts', { success: true, data: [] });
  },

  // Get specific chart data
  getChartData: async (_chartName: string, _filters?: ChartFilters): Promise<ApiResponse<ChartData>> => {
    const data: ChartData = { labels: [], datasets: [] };
    return getMockData('chart-data', { success: true, data });
  },

  // Export chart as image
  exportChart: async (_chartName: string, _filters?: ChartFilters): Promise<Blob> => {
    await getMockData('export-chart', null, 200);
    return new Blob(['Mock chart image'], { type: 'image/png' });
  },

  // Get user's accessible charts
  getUserCharts: async (): Promise<ApiResponse<Chart[]>> => {
    return getMockData('user-charts', { success: true, data: [] });
  },

  // Audit Projects by Year
  getAuditProjectsByYear: async (filters?: ChartFilters): Promise<ApiResponse<ChartData>> => {
    return chartService.getChartData('audit-projects-by-year', filters);
  },

  // Investigations by Year
  getInvestigationsByYear: async (filters?: ChartFilters): Promise<ApiResponse<ChartData>> => {
    return chartService.getChartData('investigations-by-year', filters);
  },

  // Fraud Impact by Year
  getFraudImpactByYear: async (filters?: ChartFilters): Promise<ApiResponse<ChartData>> => {
    return chartService.getChartData('fraud-impact-by-year', filters);
  },

  // Finding Actions Status Distribution
  getFindingActionsStatus: async (filters?: ChartFilters): Promise<ApiResponse<ChartData>> => {
    return chartService.getChartData('finding-actions-status', filters);
  },

  // Audit Findings by Year and Status
  getAuditFindingsByYear: async (filters?: ChartFilters): Promise<ApiResponse<ChartData>> => {
    return chartService.getChartData('audit-findings-by-year', filters);
  },

  // Finding Actions by Lead and Status
  getFindingActionsByLead: async (filters?: ChartFilters): Promise<ApiResponse<ChartData>> => {
    return chartService.getChartData('finding-actions-by-lead', filters);
  },

  // Audit Plan Progress Tracker
  getAuditPlanProgress: async (filters?: ChartFilters): Promise<ApiResponse<ChartData>> => {
    return chartService.getChartData('audit-plan-progress', filters);
  },

  // Finding Actions Aging
  getFindingActionsAging: async (filters?: ChartFilters): Promise<ApiResponse<ChartData>> => {
    return chartService.getChartData('finding-actions-aging', filters);
  },

  // Risk Level Distribution
  getRiskLevelDistribution: async (filters?: ChartFilters): Promise<ApiResponse<ChartData>> => {
    return chartService.getChartData('risk-level-distribution', filters);
  },
};

