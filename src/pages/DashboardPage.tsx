import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardHeader, Button, Badge, Loading } from '@/components/ui';
import { InvestigationsCard } from '@/components/dashboard/InvestigationsCard';
import { BarChart, PieChart, ActionAgeChart, AuditProgressChart, RadarChart, ActionsByAuditRiskTable } from '@/components/charts';
import { ChartData } from 'chart.js';
import { useAuthStore } from '@/store/auth.store';
import { PermissionGate } from '@/components/PermissionGate';
import ActionDetailsModal from '@/components/ActionDetailsModal';
import ActionsListModal from '@/components/ActionsListModal';
import ViewAsDropdown from '@/components/ViewAsDropdown';
import ViewAsDropdownMobile from '@/components/ViewAsDropdownMobile';
import { formatFinancialImpact } from '@/utils/format';
import { cn } from '@/utils/cn';
import { jiraService } from '@/services/jira.service';
import { auditFindingService } from '@/services/auditFinding.service';
import { STATUS_COLORS } from '@/utils/status.utils';
import {
  useAuditProjectsByYear,
  useInvestigationCounts,
  useFindingStatusByYear,
  useFindingActionStatusDistribution,
  useActionsByAuditAndRisk,
  useFindingsByAuditAndRisk,
  useFraudImpactScoreCards,
  useLpImpactScoreCards,
  useActionAgeDistribution,
  useLeadStatusDistribution,
  useMatScores,
  useRadarChartData,
  useRiskTypeDistribution,
  useFraudInternalControl,
  useLossPreventionSummary,
  useOverdueActions,
  useUpcomingActions,
} from '@/hooks';

const DashboardPage: React.FC = () => {
  const [scorecardFilter, setScorecardFilter] = useState<'2024+' | 'all'>('2024+'); // New state for scorecard filter
  const [maturityYear, setMaturityYear] = useState<'2024' | '2025'>('2025'); // State for maturity year toggle
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showAllCharts, setShowAllCharts] = useState(false); // State for showing all charts
  const [showControlAnalysisCharts, setShowControlAnalysisCharts] = useState(false); // State for showing Control Analysis charts
  const [isChartsMenuOpen, setIsChartsMenuOpen] = useState(false); // State for charts menu dropdown
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => (
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  ));
  const [activeCardIndex, setActiveCardIndex] = useState<0 | 1 | 2 | 3>(0); // Carousel index (mobil için)
  const [activeKeyMetricIndex, setActiveKeyMetricIndex] = useState<0 | 1 | 2 | 3 | 4>(0); // Key Metrics carousel index
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [keyMetricTouchStart, setKeyMetricTouchStart] = useState<number | null>(null);
  const [keyMetricTouchEnd, setKeyMetricTouchEnd] = useState<number | null>(null);
  const controlAnalysisSectionRef = React.useRef<HTMLDivElement>(null);
  const allChartsSectionRef = React.useRef<HTMLDivElement>(null);
  const chartsMenuRef = React.useRef<HTMLDivElement>(null);
  const [showAuditPlan, setShowAuditPlan] = useState(false); // State for showing Audit Plan chart
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const [actionsModalType, setActionsModalType] = useState<'overdue' | 'upcoming'>('overdue');
  const [isAuditRiskModalOpen, setIsAuditRiskModalOpen] = useState(false);
  const [auditRiskModalData, setAuditRiskModalData] = useState<{ auditYear: string; auditName: string; riskLevel?: string } | null>(null);
  const [auditRiskActions, setAuditRiskActions] = useState<any[]>([]);
  const [loadingAuditRiskActions, setLoadingAuditRiskActions] = useState(false);
  const [breakdownMode, setBreakdownMode] = useState<'actions' | 'findings'>('actions');
  const [isToggleSticky, setIsToggleSticky] = useState(false); // State for sticky toggle
  const [isHideChartsSticky, setIsHideChartsSticky] = useState(false); // State for sticky Hide Charts button
  const [isAuditPlanHideSticky, setIsAuditPlanHideSticky] = useState(false); // State for sticky Audit Plan Hide button (mobile)
  const hasScrolledToAuditPlan = useRef(false); // Track if we've already scrolled to audit plan
  const [auditPlanYear, setAuditPlanYear] = useState<string>('2025'); // State for audit plan year filter
  const [isAuditPlanYearDropdownOpen, setIsAuditPlanYearDropdownOpen] = useState(false);
  const [availableAuditPlanYears, setAvailableAuditPlanYears] = useState<number[]>([]);
  const auditPlanYearDropdownRef = useRef<HTMLDivElement>(null);
  const { user, role, isImpersonating, originalUser, startImpersonation } = useAuthStore();

  // Fetch available years for audit plan filter
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const yearOptions = await auditFindingService.getDropdownOptions('audit_year');
        const years = yearOptions
          .map(y => parseInt(y))
          .filter(y => !isNaN(y))
          .sort((a, b) => b - a); // Descending order (newest first)
        const finalYears = years.length > 0 ? years : [new Date().getFullYear()];
        setAvailableAuditPlanYears(finalYears);
        if (finalYears.length > 0 && finalYears[0] !== undefined && !auditPlanYear) {
          setAuditPlanYear(finalYears[0].toString());
        }
      } catch (error) {
        console.error('Failed to fetch years:', error);
        const currentYear = new Date().getFullYear();
        setAvailableAuditPlanYears([currentYear]);
        if (!auditPlanYear) {
          setAuditPlanYear(currentYear.toString());
        }
      }
    };
    if (showAuditPlan) {
      fetchYears();
    }
  }, [showAuditPlan]);

  // Close year dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (auditPlanYearDropdownRef.current && !auditPlanYearDropdownRef.current.contains(event.target as Node)) {
        setIsAuditPlanYearDropdownOpen(false);
      }
    };

    if (isAuditPlanYearDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isAuditPlanYearDropdownOpen]);

  const handleAuditPlanYearChange = (year: number | string) => {
    setAuditPlanYear(year.toString());
    setIsAuditPlanYearDropdownOpen(false);
  };
  const actionButtonClass = cn(
    'shadow-md hover:shadow-lg transition-all whitespace-nowrap',
    isMobileViewport ? 'w-full justify-center py-3 text-base' : 'min-w-[150px]'
  );

  // Mobile viewport detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 640);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle View As functionality
  const handleViewAs = async (email: string) => {
    try {
      await startImpersonation(email);
      // Reload page to update data with impersonated user
      window.location.reload();
    } catch (error) {
      // Impersonation failed - error handled by auth store
    }
  };

  // Debug: Check role value
  React.useEffect(() => {
    console.log('Dashboard Role:', role);
    console.log('Should show View As:', role === 'admin');
  }, [role]);

  // Control Analysis Charts açıldığında otomatik scroll
  React.useEffect(() => {
    if (showControlAnalysisCharts && controlAnalysisSectionRef.current) {
      // DOM'a eklenmesi için biraz bekle
      setTimeout(() => {
        const element = controlAnalysisSectionRef.current;
        if (element) {
          const elementTop = element.getBoundingClientRect().top + window.pageYOffset;
          const offset = 200; // Toggle ve header için yeterli offset

          window.scrollTo({
            top: elementTop - offset,
            behavior: 'smooth'
          });
        }
      }, 200);
    }
  }, [showControlAnalysisCharts]);

  // See All Charts açıldığında otomatik scroll
  React.useEffect(() => {
    if (showAllCharts && allChartsSectionRef.current) {
      // DOM'a eklenmesi için biraz bekle
      setTimeout(() => {
        const element = allChartsSectionRef.current;
        if (element) {
          const elementTop = element.getBoundingClientRect().top + window.pageYOffset;
          const offset = 200; // Toggle ve header için yeterli offset

          window.scrollTo({
            top: elementTop - offset,
            behavior: 'smooth'
          });
        }
      }, 200);
    }
  }, [showAllCharts]);

  // Close charts menu on ESC key or outside click
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isChartsMenuOpen) {
        setIsChartsMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isChartsMenuOpen && chartsMenuRef.current && !chartsMenuRef.current.contains(target)) {
        setIsChartsMenuOpen(false);
      }
    };

    if (isChartsMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('click', handleClickOutside);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isChartsMenuOpen]);

  // Fetch real data from Jira
  const { data: auditProjects, isLoading: loadingProjects } = useAuditProjectsByYear(scorecardFilter);
  const { data: investigations, isLoading: loadingInvestigations } = useInvestigationCounts(scorecardFilter);
  const { data: findingStatus, isLoading: loadingFindingStatus } = useFindingStatusByYear(
    undefined,
    undefined
  );
  const { data: actionStatus, isLoading: loadingActionStatus } = useFindingActionStatusDistribution(scorecardFilter);
  // Financial Impact always shows 2024+ data (independent of toggle)
  const { data: financialImpactData, isLoading: loadingFinancialImpact } = useFindingActionStatusDistribution('2024+');
  const { data: fraudImpact, isLoading: loadingFraud } = useFraudImpactScoreCards();
  const { data: lpImpact, isLoading: loadingLP } = useLpImpactScoreCards();

  // Action Age Distribution - No audit year filter (show all Open actions)
  const { data: actionAgeData, isLoading: loadingActionAge } = useActionAgeDistribution({});

  // Lead Status Distribution
  const { data: leadStatusData, isLoading: loadingLeadStatus } = useLeadStatusDistribution(scorecardFilter);

  // MAT Scores
  const { data: matScores, isLoading: loadingMAT } = useMatScores();

  // Radar Chart Data
  const { data: radarChartData, isLoading: loadingRadar } = useRadarChartData();

  // Google Sheets data
  const { data: fraudInternalControl, isLoading: loadingFraud2 } = useFraudInternalControl();
  const { data: lossPreventionSummary, isLoading: loadingLossPrevention } = useLossPreventionSummary();

  const formatSheetCurrency = React.useCallback((value: string | number | null | undefined) => {
    if (value === null || value === undefined) return '-';

    let numericValue: number | null = null;

    if (typeof value === 'number') {
      numericValue = Number.isNaN(value) ? null : value;
    } else {
      const trimmed = value.trim();
      if (!trimmed || trimmed === '-') return '-';

      const normalized = trimmed.replace(/,/g, '');
      const parsed = Number(normalized);
      numericValue = Number.isFinite(parsed) ? parsed : null;
    }

    if (numericValue === null) {
      return typeof value === 'string' ? value : '-';
    }

    if (numericValue === 0) {
      return '€0';
    }

    const sign = numericValue < 0 ? '-' : '';
    const absValue = Math.abs(numericValue);

    const formatWithSuffix = (num: number, divisor: number, suffix: string) => {
      const divided = num / divisor;
      const digits = divided >= 100 ? 0 : divided >= 10 ? 1 : 2;
      return `${divided.toFixed(digits)}${suffix}`;
    };

    let formatted: string;
    if (absValue >= 1e9) {
      formatted = formatWithSuffix(absValue, 1e9, 'B');
    } else if (absValue >= 1e6) {
      formatted = formatWithSuffix(absValue, 1e6, 'M');
    } else if (absValue >= 1e3) {
      formatted = formatWithSuffix(absValue, 1e3, 'K');
    } else {
      formatted = Math.round(absValue).toLocaleString('en-US');
    }

    return `${sign}€${formatted}`;
  }, []);

  // Overdue and Upcoming actions
  const { data: overdueActions, isLoading: loadingOverdue } = useOverdueActions();
  const { data: upcomingActions, isLoading: loadingUpcoming } = useUpcomingActions();

  // Finding Distribution Tables
  const riskTypeQuery = useRiskTypeDistribution(scorecardFilter);

  const riskTypeData = riskTypeQuery.data;
  const loadingRiskType = riskTypeQuery.isLoading;

  // Actions by Audit and Risk
  const { data: actionsByAuditRisk, isLoading: loadingAuditRisk } = useActionsByAuditAndRisk(scorecardFilter);


  // Findings by Audit and Risk
  const { data: findingsByAuditRisk, isLoading: loadingFindingsRisk } = useFindingsByAuditAndRisk(scorecardFilter);

  // Convert real Jira data to Chart.js format
  const findingActionsData: ChartData<'pie'> = useMemo(() => {
    if (!actionStatus?.statusDistribution) {
      return { labels: [], datasets: [] };
    }

    const statusDist = actionStatus.statusDistribution as Record<string, number>;
    const labels = Object.keys(statusDist);
    const data = Object.values(statusDist);

    // Use STATUS_COLORS from status.utils.ts for consistency
    const backgroundColors = {
      'Open': STATUS_COLORS['Open'] || 'rgba(59, 130, 246, 0.8)',
      'Risk Accepted': STATUS_COLORS['Risk Accepted'] || 'rgba(147, 51, 234, 0.8)',
      'Completed': STATUS_COLORS['Completed'] || 'rgba(34, 197, 94, 0.8)',
      'Overdue': STATUS_COLORS['Overdue'] || 'rgba(239, 68, 68, 0.8)',
    };

    const borderColors = {
      'Open': STATUS_COLORS['Open']?.replace('0.8', '1') || 'rgba(59, 130, 246, 1)',
      'Risk Accepted': STATUS_COLORS['Risk Accepted']?.replace('0.8', '1') || 'rgba(147, 51, 234, 1)',
      'Completed': STATUS_COLORS['Completed']?.replace('0.8', '1') || 'rgba(34, 197, 94, 1)',
      'Overdue': STATUS_COLORS['Overdue']?.replace('0.8', '1') || 'rgba(239, 68, 68, 1)',
    };

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map(l => backgroundColors[l as keyof typeof backgroundColors] || 'rgba(156, 163, 175, 0.8)'),
        borderColor: labels.map(l => borderColors[l as keyof typeof borderColors] || 'rgba(156, 163, 175, 1)'),
        borderWidth: 2,
      }],
    };
  }, [actionStatus]);

  // Finding Actions by Lead and Status data
  const findingActionsByLeadData: ChartData<'bar'> = useMemo(() => {
    if (!leadStatusData || typeof leadStatusData !== 'object') {
      return { labels: [], datasets: [] };
    }

    const leadStatusMap = leadStatusData as Record<string, Record<string, number>>;
    const leads = Object.keys(leadStatusMap).filter(lead => lead !== 'Unassigned').slice(0, 10); // Top 10 leads
    const statuses = ['Open', 'Risk Accepted', 'Completed', 'Overdue'];

    // Use STATUS_COLORS from status.utils.ts for consistency
    const colors = {
      'Open': STATUS_COLORS['Open']?.replace('0.8', '0.9') || 'rgba(59, 130, 246, 0.9)',
      'Risk Accepted': STATUS_COLORS['Risk Accepted']?.replace('0.8', '0.9') || 'rgba(147, 51, 234, 0.9)',
      'Completed': STATUS_COLORS['Completed']?.replace('0.8', '0.9') || 'rgba(34, 197, 94, 0.9)',
      'Overdue': STATUS_COLORS['Overdue']?.replace('0.8', '0.9') || 'rgba(239, 68, 68, 0.9)',
    };

    return {
      labels: leads,
      datasets: statuses.map(status => ({
        label: status,
        data: leads.map(lead => {
          const leadData = leadStatusMap[lead];
          return leadData ? (leadData[status] || 0) : 0;
        }),
        backgroundColor: colors[status as keyof typeof colors] || 'rgba(156, 163, 175, 0.9)',
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      })),
    };
  }, [leadStatusData]);

  const findingByYearData: ChartData<'bar'> = useMemo(() => {
    if (!findingStatus || typeof findingStatus !== 'object') {
      return { labels: [], datasets: [] };
    }

    const years = Object.keys(findingStatus).sort();

    // Define status order for stacked bar chart (bottom to top)
    const statusOrder = ['Completed', 'Risk Accepted', 'Open'];

    // Use STATUS_COLORS from status.utils.ts for consistency
    const colors = {
      'Completed': STATUS_COLORS['Completed']?.replace('0.8', '0.9') || 'rgba(34, 197, 94, 0.9)',
      'Risk Accepted': STATUS_COLORS['Risk Accepted']?.replace('0.8', '0.9') || 'rgba(147, 51, 234, 0.9)',
      'Open': STATUS_COLORS['Open']?.replace('0.8', '0.9') || 'rgba(59, 130, 246, 0.9)',
    };

    return {
      labels: years,
      datasets: statusOrder.map(status => ({
        label: status,
        data: years.map(year => {
          const yearData = findingStatus[year];
          return (yearData && typeof yearData === 'object') ? (yearData[status] || 0) : 0;
        }),
        backgroundColor: colors[status as keyof typeof colors] || 'rgba(156, 163, 175, 0.9)',
      })),
    };
  }, [findingStatus]);

  // Action Age Chart Data
  const actionAgeChartData: ChartData<'bar'> = useMemo(() => {
    if (!actionAgeData || typeof actionAgeData !== 'object') return { labels: [], datasets: [] };

    // Define correct order for age ranges
    const orderedRanges = [
      '-720—360', '-360—180', '-180—90', '-90—30', '-30—0',
      '0—30', '30—90', '90—180', '180—360', '360—720', '720+'
    ];

    // Color mapping: Overdue (red gradient) → Upcoming (yellow to green gradient)
    const rangeColors: Record<string, { bg: string; border: string }> = {
      // Overdue (negative) - Red gradient (darkest to lightest)
      '-720—360': { bg: 'rgba(185, 28, 28, 0.9)', border: 'rgba(185, 28, 28, 1)' },    // Dark red (most overdue)
      '-360—180': { bg: 'rgba(220, 38, 38, 0.9)', border: 'rgba(220, 38, 38, 1)' },    // Red
      '-180—90': { bg: 'rgba(239, 68, 68, 0.9)', border: 'rgba(239, 68, 68, 1)' },     // Medium red
      '-90—30': { bg: 'rgba(248, 113, 113, 0.9)', border: 'rgba(248, 113, 113, 1)' },  // Light red
      '-30—0': { bg: 'rgba(251, 146, 60, 0.9)', border: 'rgba(251, 146, 60, 1)' },     // Orange (soon overdue)

      // Upcoming (positive) - Yellow to green gradient
      '0—30': { bg: 'rgba(250, 204, 21, 0.9)', border: 'rgba(250, 204, 21, 1)' },      // Yellow (urgent, upcoming soon)
      '30—90': { bg: 'rgba(163, 230, 53, 0.9)', border: 'rgba(163, 230, 53, 1)' },     // Lime green
      '90—180': { bg: 'rgba(74, 222, 128, 0.9)', border: 'rgba(74, 222, 128, 1)' },    // Light green
      '180—360': { bg: 'rgba(34, 197, 94, 0.9)', border: 'rgba(34, 197, 94, 1)' },     // Green
      '360—720': { bg: 'rgba(22, 163, 74, 0.9)', border: 'rgba(22, 163, 74, 1)' },     // Dark green
      '720+': { bg: 'rgba(21, 128, 61, 0.9)', border: 'rgba(21, 128, 61, 1)' },        // Very dark green (lots of time)
    };

    // Filter to only include ranges that exist in data
    const ageRanges = orderedRanges.filter(range =>
      (actionAgeData as Record<string, number>)[range] !== undefined
    );

    return {
      labels: ageRanges,
      datasets: [{
        label: 'Number of Actions',
        data: ageRanges.map(range => (actionAgeData as Record<string, number>)[range] || 0),
        backgroundColor: ageRanges.map(range => rangeColors[range]?.bg || 'rgba(156, 163, 175, 0.9)'),
        borderColor: ageRanges.map(range => rangeColors[range]?.border || 'rgba(156, 163, 175, 1)'),
        borderWidth: 2,
      }],
    };
  }, [actionAgeData]);

  // Prepare radar chart data with groups
  const radarData: ChartData<'radar'> = useMemo(() => {
    if (!radarChartData?.labels) {
      return { labels: [], datasets: [] };
    }

    // Create labels with groups (if available) or fall back to dimension names
    const labels = radarChartData.labelsWithGroups
      ? radarChartData.labelsWithGroups.map((item: { dimension: string; group: string; fullLabel: string }) => item.fullLabel)
      : radarChartData.labels;

    return {
      labels,
      datasets: [
        {
          label: '2024',
          data: radarChartData.data2024,
          backgroundColor: 'rgba(251, 146, 60, 0.2)', // Orange with higher opacity for mobile
          borderColor: 'rgba(251, 146, 60, 1)',
          borderWidth: isMobileViewport ? 4 : 3, // Thicker on mobile
          pointBackgroundColor: 'rgba(251, 146, 60, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(251, 146, 60, 1)',
          pointRadius: isMobileViewport ? 6 : 5,
          pointHoverRadius: 8,
          tension: 0.1,
        },
        {
          label: '2025',
          data: radarChartData.data2025,
          backgroundColor: 'rgba(59, 130, 246, 0.2)', // Blue with higher opacity for mobile
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: isMobileViewport ? 4 : 3, // Thicker on mobile
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(59, 130, 246, 1)',
          pointRadius: isMobileViewport ? 6 : 5,
          pointHoverRadius: 8,
          tension: 0.1,
        },
      ],
    };
  }, [radarChartData, isMobileViewport]);

  // Handle pie chart click to open modal
  const handlePieClick = (status: string) => {
    setSelectedStatus(status);
    setIsModalOpen(true);
  };

  // Handle audit risk table cell click
  const handleAuditRiskCellClick = async (auditYear: string, auditName: string, riskLevel?: string) => {
    setLoadingAuditRiskActions(true);
    setAuditRiskModalData({ auditYear, auditName, riskLevel });
    setIsAuditRiskModalOpen(true);

    try {
      // Call different endpoint based on mode
      const data = breakdownMode === 'actions'
        ? await jiraService.getActionsByAuditRiskDetail(auditYear, auditName, riskLevel)
        : await jiraService.getFindingsByAuditRiskDetail(auditYear, auditName, riskLevel);
      setAuditRiskActions(data);
    } catch (error) {
      console.error('Failed to fetch audit risk data:', error);
      setAuditRiskActions([]);
    } finally {
      setLoadingAuditRiskActions(false);
    }
  };

  // Handle Audit Plan navigation
  const handleAuditPlanClick = () => {
    setShowAuditPlan(true);
    // Scroll will be handled by useEffect when showAuditPlan becomes true
  };

  // Scroll to audit plan when it's shown
  React.useEffect(() => {
    if (!showAuditPlan) return;

    const timeouts: NodeJS.Timeout[] = [];

    if (isMobileViewport) {
      // Mobile: Scroll to show the header and beginning of the list
      const scrollTimeout = setTimeout(() => {
        const auditPlanSection = document.getElementById('audit-plan-section');
        if (auditPlanSection) {
          const rect = auditPlanSection.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const elementTop = rect.top + scrollTop;
          // Scroll to show the top of the element with some padding
          window.scrollTo({ top: Math.max(0, elementTop - 20), behavior: 'smooth' });
        }
      }, 300);
      timeouts.push(scrollTimeout);
    } else {
      // Desktop: Scroll to the very bottom of the page in ONE smooth action
      // Wait for DOM to render completely, then scroll once
      const scrollTimeout = setTimeout(() => {
        // Use requestAnimationFrame to ensure DOM is fully rendered
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Wait one more frame, then scroll to absolute bottom
            const scrollHeight = Math.max(
              document.body.scrollHeight,
              document.body.offsetHeight,
              document.documentElement.clientHeight,
              document.documentElement.scrollHeight,
              document.documentElement.offsetHeight
            );
            window.scrollTo({
              top: scrollHeight,
              behavior: 'smooth'
            });
          });
        });
      }, 1000); // Single delay to allow content to fully load before scrolling
      timeouts.push(scrollTimeout);
    }

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [showAuditPlan, isMobileViewport]);

  // Handle Audit Plan hide
  const handleAuditPlanHide = () => {
    setShowAuditPlan(false);
    setIsToggleSticky(false); // Reset sticky toggle when hiding audit plan
    hasScrolledToAuditPlan.current = false; // Reset scroll flag when hiding
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Scroll handler for sticky toggle - only show when charts are open (except audit plan/progress tracker)
  React.useEffect(() => {
    // Exception: Don't show sticky toggle when only audit plan is open (progress tracker)
    // Only show when showAllCharts or showControlAnalysisCharts is open
    if (!showAllCharts && !showControlAnalysisCharts) {
      setIsToggleSticky(false);
      return;
    }

    const handleScroll = () => {
      // Double check: if charts are closed (except audit plan), set sticky to false
      if (!showAllCharts && !showControlAnalysisCharts) {
        setIsToggleSticky(false);
        return;
      }

      // Only show sticky toggle if charts are actually open (not audit plan)
      const toggleElement = document.getElementById('scorecard-toggle');
      if (toggleElement) {
        const rect = toggleElement.getBoundingClientRect();
        // If original toggle is out of view, show sticky version
        setIsToggleSticky(rect.top < 0);
      } else {
        setIsToggleSticky(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showAllCharts, showControlAnalysisCharts]); // Removed showAuditPlan - progress tracker doesn't need floating toggle

  // Scroll handler for sticky Hide Charts button
  React.useEffect(() => {
    if (!showAllCharts && !showControlAnalysisCharts) {
      setIsHideChartsSticky(false);
      return;
    }

    const handleScroll = () => {
      // Don't show if page is at the top
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollTop < 100) {
        setIsHideChartsSticky(false);
        return;
      }

      // Check both sections
      const allChartsRect = allChartsSectionRef.current?.getBoundingClientRect();
      const controlAnalysisRect = controlAnalysisSectionRef.current?.getBoundingClientRect();

      // Show sticky if either section is scrolled past
      const shouldShow = Boolean(
        (showAllCharts && allChartsRect && allChartsRect.top < 200) ||
        (showControlAnalysisCharts && controlAnalysisRect && controlAnalysisRect.top < 200)
      );

      setIsHideChartsSticky(shouldShow);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showAllCharts, showControlAnalysisCharts]);

  // Scroll handler for sticky Audit Plan Hide button (mobile only)
  React.useEffect(() => {
    if (!showAuditPlan) {
      setIsAuditPlanHideSticky(false);
      return;
    }

    // Only enable sticky on mobile
    if (!isMobileViewport) {
      setIsAuditPlanHideSticky(false);
      return;
    }

    const handleScroll = () => {
      const auditPlanSection = document.getElementById('audit-plan-section');
      if (!auditPlanSection) {
        setIsAuditPlanHideSticky(false);
        return;
      }

      const rect = auditPlanSection.getBoundingClientRect();
      // Show sticky button when section scrolls above viewport (top of section is above top of viewport)
      const shouldShow = rect.top < 0;
      setIsAuditPlanHideSticky(shouldShow);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [showAuditPlan, isMobileViewport]);

  // Role-based welcome message
  const getWelcomeMessage = () => {
    switch (role) {
      case 'admin':
        return 'Admin Dashboard - Full System Control';
      case 'top_management':
        return 'Executive Dashboard - Strategic Overview';
      case 'department_director':
        return 'Director Dashboard - Department Metrics';
      case 'VP':
        return 'VP Dashboard - High-Level Insights';
      case 'team':
        return 'Team Dashboard - Your Tasks & Projects';
      case 'auditor':
        return 'Auditor Dashboard - Your Audits';
      default:
        return 'Dashboard - Overview';
    }
  };

  const pieLegendItems = useMemo(() => {
    const labels = findingActionsData.labels as string[] | undefined;
    const dataset = findingActionsData.datasets && findingActionsData.datasets[0]
      ? findingActionsData.datasets[0] as { data?: (number | string)[]; backgroundColor?: string | string[] }
      : undefined;

    if (!labels || !dataset?.data) {
      return [] as Array<{ label: string; value: number; color: string }>;
    }

    const colors = Array.isArray(dataset.backgroundColor)
      ? dataset.backgroundColor
      : labels.map(() => (dataset.backgroundColor as string) || '#9ca3af');

    return labels.map((label, index) => ({
      label,
      value: Number(dataset.data?.[index] ?? 0),
      color: colors[index] || '#9ca3af',
    }));
  }, [findingActionsData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className={cn(
            "flex items-center",
            isMobileViewport ? "gap-2" : "gap-3"
          )}>
            <h1 className={cn(
              "font-bold text-gray-900",
              isMobileViewport ? "text-[12px]" : "text-[20px]"
            )}>Dashboard</h1>
            <Badge
              variant={
                role === 'admin' ? 'danger' :
                  role === 'top_management' ? 'warning' :
                    role === 'department_director' ? 'info' :
                      'default'
              }
              size={isMobileViewport ? "xs" : "md"}
            >
              {role?.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <p className={cn(
            "text-gray-500",
            isMobileViewport ? "text-[7.2px] mt-0.5" : "text-[9px]"
          )}>
            {getWelcomeMessage()} • Welcome, {user?.name || 'User'}!
          </p>
        </div>
        <div className={cn(
          "flex items-center gap-4",
          isMobileViewport && "gap-1.5"
        )}>
          {/* View As Dropdown (Admin Only - can view as team, team_manager) */}
          {(role === 'admin' || (isImpersonating && originalUser?.role === 'admin')) && (
            <>
              {/* Mobile: Special mobile component */}
              <div className="md:hidden">
                <ViewAsDropdownMobile
                  onSelectUser={handleViewAs}
                  filterByRole={['team', 'team_manager']}
                />
              </div>
              {/* Desktop: Regular dropdown */}
              <div className="hidden md:block">
                <ViewAsDropdown
                  onSelectUser={handleViewAs}
                  filterByRole={['team', 'team_manager']}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Year-over-Year Performance Metrics */}
      <PermissionGate component="audit_projects_by_year_chart">
        <div className="mb-8">
          <div className={cn(
            "flex items-center justify-between mb-6",
            isMobileViewport && "mb-4"
          )}>
            <h2 className={cn(
              "font-bold text-gray-900",
              isMobileViewport ? "text-[12.8px]" : "text-[16px]"
            )}>Performance Overview</h2>

            {/* Chart Category Quick Access - Expandable Badges */}
            <div ref={chartsMenuRef} className="relative flex items-center gap-2">
              {/* Toggle Button with Label */}
              <div className="relative group">
                <button
                  onClick={() => setIsChartsMenuOpen(!isChartsMenuOpen)}
                  className={cn(
                    'relative inline-flex items-center justify-center rounded-lg transition-all duration-200 hover:scale-105',
                    isMobileViewport ? 'h-[22.4px] px-[6.4px] gap-[4.8px]' : 'h-[28.8px] px-[9.6px] gap-[6.4px]',
                    (showAllCharts || showControlAnalysisCharts || isChartsMenuOpen)
                      ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/40'
                      : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600'
                  )}
                >
                  {isChartsMenuOpen ? (
                    <svg className={cn("flex-shrink-0", isMobileViewport ? "w-[9.6px] h-[9.6px]" : "w-[12.8px] h-[12.8px]")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className={cn("flex-shrink-0", isMobileViewport ? "w-[9.6px] h-[9.6px]" : "w-[12.8px] h-[12.8px]")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                  <span className={cn("font-medium", isMobileViewport ? "text-[6.4px]" : "text-[9px]")}>
                    View Charts
                  </span>
                  {(showAllCharts || showControlAnalysisCharts) && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-[8px] text-white">✓</span>
                    </span>
                  )}
                </button>

                {/* Tooltip */}
                <div className="absolute right-0 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                    {isChartsMenuOpen ? 'Close chart options' : 'Open chart options'}
                    <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 rotate-45"></div>
                  </div>
                </div>
              </div>

              {/* Expanded Badges - Horizontal */}
              {isChartsMenuOpen && (
                <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
                  {/* See All Charts Badge */}
                  <div className="relative group">
                    <button
                      onClick={() => {
                        setShowAllCharts(!showAllCharts);
                      }}
                      className={cn(
                        'relative rounded-full flex items-center justify-center transition-all duration-200',
                        'hover:scale-110',
                        isMobileViewport ? 'w-8 h-8' : 'w-10 h-10',
                        showAllCharts
                          ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/40'
                          : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600'
                      )}
                      title={showAllCharts ? "Hide Charts" : "See All Charts"}
                    >
                      {showAllCharts ? (
                        <svg
                          className={cn(isMobileViewport ? "w-4 h-4" : "w-5 h-5")}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                        </svg>
                      ) : (
                        <svg
                          className={cn(isMobileViewport ? "w-4 h-4" : "w-5 h-5")}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      )}
                      {showAllCharts && (
                        <span className={cn(
                          "absolute -top-1 -right-1 bg-green-500 rounded-full border-2 border-white flex items-center justify-center",
                          isMobileViewport ? "w-3 h-3" : "w-4 h-4"
                        )}>
                          <span className={cn(
                            "text-white",
                            isMobileViewport ? "text-[6px]" : "text-[8px]"
                          )}>✓</span>
                        </span>
                      )}
                    </button>

                    {/* Tooltip */}
                    <div className="absolute right-0 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                      <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                        {showAllCharts ? "Hide Charts" : "See All Charts"}
                        <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    </div>
                  </div>

                  {/* Control Analysis Badge */}
                  <div className="relative group">
                    <button
                      onClick={() => {
                        setShowControlAnalysisCharts(!showControlAnalysisCharts);
                      }}
                      className={cn(
                        'relative rounded-full flex items-center justify-center transition-all duration-200',
                        'hover:scale-110',
                        isMobileViewport ? 'w-8 h-8' : 'w-10 h-10',
                        showControlAnalysisCharts
                          ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/40'
                          : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600'
                      )}
                      title="Control Analysis (4 charts)"
                    >
                      <span className={cn(
                        isMobileViewport ? "text-sm" : "text-lg"
                      )}>📊</span>
                      {showControlAnalysisCharts && (
                        <span className={cn(
                          "absolute -top-1 -right-1 bg-green-500 rounded-full border-2 border-white flex items-center justify-center",
                          isMobileViewport ? "w-3 h-3" : "w-4 h-4"
                        )}>
                          <span className={cn(
                            "text-white",
                            isMobileViewport ? "text-[6px]" : "text-[8px]"
                          )}>✓</span>
                        </span>
                      )}
                    </button>

                    {/* Tooltip */}
                    <div className="absolute right-0 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                      <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                        Control Analysis
                        <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Version - Production Code (Always Visible on Desktop) */}
          <div className={cn(
            "grid gap-6",
            isMobileViewport ? "hidden" : "grid-cols-1 lg:grid-cols-2 xl:grid-cols-4"
          )}>
            {/* Audit Projects by Year */}
            <Card variant="elevated" className="bg-white border border-gray-200 shadow-sm">
              <CardHeader
                title="Audit Projects by Year"
                className="border-b border-gray-200 pb-3"
              />
              <div className="mt-4 grid grid-cols-6 gap-2">
                {loadingProjects ? (
                  <div className="col-span-6 flex justify-center py-8">
                    <Loading size="lg" />
                  </div>
                ) : auditProjects && Array.isArray(auditProjects) ? (
                  (() => {
                    // Hard-coded per auditor values
                    const perAuditorMap: Record<string, string> = {
                      '2025': '2.17',
                      '2024': '1.84',
                      '2023': '0.86',
                      '2022': '1.15',
                      '2021': '1.94',
                    };

                    // Year configurations with different shapes and subtle professional colors
                    const yearConfigs: Record<string, {
                      bgColor: string;
                      textColor: string;
                      borderColor: string;
                      shape: string;
                      layout: 'vertical' | 'horizontal';
                    }> = {
                      '2025': {
                        bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50',
                        textColor: 'text-indigo-700',
                        borderColor: 'border-indigo-200',
                        shape: 'rounded-3xl', // Fully rounded
                        layout: 'vertical'
                      },
                      '2024': {
                        bgColor: 'bg-gradient-to-br from-slate-50 to-slate-100/50',
                        textColor: 'text-slate-700',
                        borderColor: 'border-slate-200',
                        shape: 'rounded-lg', // Sharp corners
                        layout: 'vertical'
                      },
                      '2023': {
                        bgColor: 'bg-gradient-to-br from-violet-50 to-violet-100/50',
                        textColor: 'text-violet-700',
                        borderColor: 'border-violet-200',
                        shape: 'rounded-2xl', // Medium rounded
                        layout: 'vertical'
                      },
                      '2022': {
                        bgColor: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
                        textColor: 'text-amber-700',
                        borderColor: 'border-amber-200',
                        shape: 'rounded-xl', // Slightly rounded
                        layout: 'vertical'
                      },
                      '2021': {
                        bgColor: 'bg-gradient-to-br from-neutral-50 to-neutral-100/50',
                        textColor: 'text-neutral-700',
                        borderColor: 'border-neutral-200',
                        shape: 'rounded-xl', // Same as others
                        layout: 'vertical'
                      },
                    };

                    const sortedProjects = auditProjects
                      .filter((item: any) => item.auditYear && item.auditYear !== 'Unknown' && typeof item.auditYear === 'string')
                      .slice(0, 5)
                      .sort((a: any, b: any) => {
                        const yearA = String(a.auditYear || '');
                        const yearB = String(b.auditYear || '');
                        return yearB.localeCompare(yearA);
                      });

                    return sortedProjects.map((item: any, idx: number) => {
                      const config = yearConfigs[item.auditYear] || {
                        bgColor: 'bg-gray-50',
                        textColor: 'text-gray-700',
                        borderColor: 'border-gray-200',
                        shape: 'rounded-xl',
                        layout: 'vertical'
                      };

                        return (
                          <div
                            key={idx}
                            className={cn(
                              "relative p-2.5 overflow-hidden",
                              "hover:shadow-lg hover:scale-[1.02]",
                              "transition-all duration-300 ease-out",
                              "group cursor-pointer",
                              "border-2",
                              config.bgColor,
                              config.borderColor,
                              config.shape,
                              idx < 2 ? 'col-span-3' : 'col-span-2'
                            )}
                          >
                          {/* Subtle pattern overlay */}
                          <div className={cn(
                            "absolute inset-0 opacity-[0.03]",
                            idx % 2 === 0
                              ? "bg-[radial-gradient(circle_at_30%_30%,rgba(0,0,0,0.5)_1px,transparent_1px)] bg-[length:16px_16px]"
                              : "bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.05)_25%,rgba(0,0,0,0.05)_50%,transparent_50%,transparent_75%,rgba(0,0,0,0.05)_75%)] bg-[length:12px_12px]"
                          )} />

                          {/* Content */}
                          <div className={cn(
                            "relative z-10 flex flex-col h-full",
                            config.layout === 'vertical' ? 'items-center justify-center' : 'items-start justify-between'
                          )}>
                            {/* Year badge */}
                            <div className={cn(
                              "flex items-center gap-1 mb-1.5",
                              config.textColor
                            )}>
                              <div className={cn(
                                "w-4 h-4 rounded flex items-center justify-center",
                                "bg-white/60 backdrop-blur-sm",
                                "border border-current/20"
                              )}>
                                <svg
                                  className="w-2.5 h-2.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                              <p className="text-[10px] font-semibold tracking-wide uppercase">
                                {item.auditYear}
                              </p>
                            </div>

                            {/* Count */}
                            <div className="mb-1.5">
                              <p className={cn(
                                "text-2xl font-bold",
                                config.textColor,
                                "group-hover:scale-110 transition-transform duration-300"
                              )}>
                                {item.count}
                              </p>
                            </div>

                            {/* Per auditor metric */}
                            <div className={cn(
                              "flex items-center gap-0.5",
                              config.textColor
                            )}>
                              <svg
                                className={cn("w-2.5 h-2.5 opacity-70")}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                              </svg>
                              <p className={cn("text-[9px] font-medium opacity-80 whitespace-nowrap")}>
                                {perAuditorMap[item.auditYear] || '0'} per auditor
                              </p>
                            </div>
                          </div>

                          {/* Decorative element based on shape */}
                          {config.shape === 'rounded-lg' && (
                            <div className="absolute top-0 right-0 w-6 h-6 bg-white/20 transform rotate-45 translate-x-3 -translate-y-3" />
                          )}
                          {config.shape === 'rounded-3xl' && (
                            <div className="absolute bottom-0 left-0 w-10 h-10 bg-white/20 rounded-full blur-xl" />
                          )}
                          {config.shape === 'rounded-xl' && (
                            <div className="absolute top-0 right-0 w-8 h-8 bg-white/20 rounded-full blur-lg" />
                          )}
                        </div>
                      );
                    });
                  })()
                ) : (
                  <div className="col-span-6 text-center text-gray-500 py-8">
                    No data available
                  </div>
                )}
              </div>
            </Card>

            {/* Investigations by Year */}
            <InvestigationsCard
              investigations={investigations}
              loading={loadingInvestigations}
            />

            {/* Fraud Internal Control by Year */}
            <Card variant="elevated" className="bg-white border border-gray-200 shadow-sm">
              <CardHeader
                title="Fraud Internal Control by Year"
                className="border-b border-gray-200 pb-3"
              />
              <div className="mt-4 grid grid-cols-6 gap-2">
                {loadingFraud ? (
                  <div className="col-span-6 flex justify-center py-8">
                    <Loading size="lg" />
                  </div>
                ) : fraudImpact?.scoreCards && Array.isArray(fraudImpact.scoreCards) ? (
                  (() => {
                    // Hard-coded per auditor values
                    const perAuditorMap: Record<string, string> = {
                      '2025': '€1.34M',
                      '2024': '€2.71M',
                      '2023': '€1.56M',
                      '2022': '€3.50M',
                      '2021': '€0.96M',
                    };

                    // Format impact from "2,363,374" to "€2.36M"
                    const formatImpact = (impact: any) => {
                      if (!impact) return '€0';
                      // Remove commas and convert to number
                      const numericValue = typeof impact === 'string'
                        ? parseFloat(impact.replace(/,/g, ''))
                        : impact;

                      if (isNaN(numericValue)) return '€0';

                      // Convert to millions
                      const millions = numericValue / 1000000;
                      return `€${millions.toFixed(2)}M`;
                    };

                    // Year configurations with different shapes and subtle professional colors
                    const yearConfigs: Record<string, {
                      bgColor: string;
                      textColor: string;
                      borderColor: string;
                      shape: string;
                      layout: 'vertical' | 'horizontal';
                    }> = {
                      '2025': {
                        bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50',
                        textColor: 'text-indigo-700',
                        borderColor: 'border-indigo-200',
                        shape: 'rounded-3xl', // Fully rounded
                        layout: 'vertical'
                      },
                      '2024': {
                        bgColor: 'bg-gradient-to-br from-slate-50 to-slate-100/50',
                        textColor: 'text-slate-700',
                        borderColor: 'border-slate-200',
                        shape: 'rounded-lg', // Sharp corners
                        layout: 'vertical'
                      },
                      '2023': {
                        bgColor: 'bg-gradient-to-br from-violet-50 to-violet-100/50',
                        textColor: 'text-violet-700',
                        borderColor: 'border-violet-200',
                        shape: 'rounded-2xl', // Medium rounded
                        layout: 'vertical'
                      },
                      '2022': {
                        bgColor: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
                        textColor: 'text-amber-700',
                        borderColor: 'border-amber-200',
                        shape: 'rounded-xl', // Slightly rounded
                        layout: 'vertical'
                      },
                      '2021': {
                        bgColor: 'bg-gradient-to-br from-neutral-50 to-neutral-100/50',
                        textColor: 'text-neutral-700',
                        borderColor: 'border-neutral-200',
                        shape: 'rounded-xl', // Same as others
                        layout: 'vertical'
                      },
                    };

                    return fraudImpact.scoreCards
                      .filter((item: any) => item.year && item.year !== '2020')
                      .sort((a: any, b: any) => b.year.localeCompare(a.year))
                      .slice(0, 5)
                      .map((item: any, idx: number) => {
                        const config = yearConfigs[item.year] || {
                          bgColor: 'bg-gray-50',
                          textColor: 'text-gray-700',
                          borderColor: 'border-gray-200',
                          shape: 'rounded-xl',
                          layout: 'vertical'
                        };

                        return (
                          <div
                            key={idx}
                            className={cn(
                              "relative p-2.5 overflow-hidden",
                              "hover:shadow-lg hover:scale-[1.02]",
                              "transition-all duration-300 ease-out",
                              "group cursor-pointer",
                              "border-2",
                              config.bgColor,
                              config.borderColor,
                              config.shape,
                              idx < 2 ? 'col-span-3' : 'col-span-2'
                            )}
                          >
                            {/* Subtle pattern overlay */}
                            <div className={cn(
                              "absolute inset-0 opacity-[0.03]",
                              idx % 2 === 0
                                ? "bg-[radial-gradient(circle_at_30%_30%,rgba(0,0,0,0.5)_1px,transparent_1px)] bg-[length:16px_16px]"
                                : "bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.05)_25%,rgba(0,0,0,0.05)_50%,transparent_50%,transparent_75%,rgba(0,0,0,0.05)_75%)] bg-[length:12px_12px]"
                            )} />

                            {/* Content */}
                            <div className={cn(
                              "relative z-10 flex flex-col h-full",
                              config.layout === 'vertical' ? 'items-center justify-center' : 'items-start justify-between'
                            )}>
                              {/* Year badge */}
                              <div className={cn(
                                "flex items-center gap-1 mb-1.5",
                                config.textColor
                              )}>
                                <div className={cn(
                                  "w-4 h-4 rounded flex items-center justify-center",
                                  "bg-white/60 backdrop-blur-sm",
                                  "border border-current/20"
                                )}>
                                  <svg
                                    className="w-2.5 h-2.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                                <p className="text-[10px] font-semibold tracking-wide uppercase">
                                  {item.year}
                                </p>
                              </div>

                              {/* Impact */}
                              <div className="mb-1.5">
                                <p className={cn(
                                  idx < 2 ? "text-2xl" : "text-[20px]",
                                  "font-bold",
                                  config.textColor,
                                  "group-hover:scale-110 transition-transform duration-300"
                                )}>
                                  {formatImpact(item.impact)}
                                </p>
                              </div>

                              {/* Per auditor metric */}
                              <div className={cn(
                                "flex items-center gap-0.5",
                                config.textColor
                              )}>
                                <svg
                                  className={cn("w-2.5 h-2.5 opacity-70")}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                  />
                                </svg>
                                <p className={cn("text-[9px] font-medium opacity-80 whitespace-nowrap")}>
                                  {perAuditorMap[item.year] || '€0'} per auditor
                                </p>
                              </div>
                            </div>

                            {/* Decorative element based on shape */}
                            {config.shape === 'rounded-lg' && (
                              <div className="absolute top-0 right-0 w-6 h-6 bg-white/20 transform rotate-45 translate-x-3 -translate-y-3" />
                            )}
                            {config.shape === 'rounded-3xl' && (
                              <div className="absolute bottom-0 left-0 w-10 h-10 bg-white/20 rounded-full blur-xl" />
                            )}
                            {config.shape === 'rounded-xl' && (
                              <div className="absolute top-0 right-0 w-8 h-8 bg-white/20 rounded-full blur-lg" />
                            )}
                          </div>
                        );
                      });
                  })()
                ) : (
                  <div className="col-span-6 text-center text-gray-500 py-8">
                    No data available
                  </div>
                )}
              </div>
            </Card>

            {/* Loss Prevention Internal Control by Year */}
            <Card variant="elevated" className="bg-white border border-gray-200 shadow-sm">
              <CardHeader
                title="Loss Prevention Internal Control by Year"
                className="border-b border-gray-200 pb-3"
              />
              <div className="mt-4 grid grid-cols-6 gap-2">
                {loadingLP ? (
                  <div className="col-span-6 flex justify-center py-8">
                    <Loading size="lg" />
                  </div>
                ) : (() => {
                  const scoreCards = lpImpact?.scoreCards || lpImpact?.scoreCards2;
                  if (!scoreCards || !Array.isArray(scoreCards)) {
                    return (
                      <div className="col-span-6 text-center text-gray-500 py-8">
                        No data available
                      </div>
                    );
                  }

                  // Hard-coded per auditor values
                  const perAuditorMap: Record<string, string> = {
                    '2025': '€0.93M',
                    '2024': '€0.76M',
                    '2023': '€0.23M',
                    '2022': '€0.07M',
                    '2021': '€0.05M',
                  };

                  // Format impact from "2,363,374" to "€2.36M"
                  const formatImpact = (impact: any) => {
                    if (!impact) return '€0';
                    // Remove commas and convert to number
                    const numericValue = typeof impact === 'string'
                      ? parseFloat(impact.replace(/,/g, ''))
                      : impact;

                    if (isNaN(numericValue)) return '€0';

                    // Convert to millions
                    const millions = numericValue / 1000000;
                    return `€${millions.toFixed(2)}M`;
                  };

                  // Year configurations with different shapes and subtle professional colors
                  const yearConfigs: Record<string, {
                    bgColor: string;
                    textColor: string;
                    borderColor: string;
                    shape: string;
                    layout: 'vertical' | 'horizontal';
                  }> = {
                    '2025': {
                      bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50',
                      textColor: 'text-indigo-700',
                      borderColor: 'border-indigo-200',
                      shape: 'rounded-3xl', // Fully rounded
                      layout: 'vertical'
                    },
                    '2024': {
                      bgColor: 'bg-gradient-to-br from-slate-50 to-slate-100/50',
                      textColor: 'text-slate-700',
                      borderColor: 'border-slate-200',
                      shape: 'rounded-lg', // Sharp corners
                      layout: 'vertical'
                    },
                    '2023': {
                      bgColor: 'bg-gradient-to-br from-violet-50 to-violet-100/50',
                      textColor: 'text-violet-700',
                      borderColor: 'border-violet-200',
                      shape: 'rounded-2xl', // Medium rounded
                      layout: 'vertical'
                    },
                    '2022': {
                      bgColor: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
                      textColor: 'text-amber-700',
                      borderColor: 'border-amber-200',
                      shape: 'rounded-xl', // Slightly rounded
                      layout: 'vertical'
                    },
                    '2021': {
                      bgColor: 'bg-gradient-to-br from-neutral-50 to-neutral-100/50',
                      textColor: 'text-neutral-700',
                      borderColor: 'border-neutral-200',
                      shape: 'rounded-xl', // Same as others
                      layout: 'vertical'
                    },
                  };

                  return scoreCards
                    .filter((item: any) => item.year && item.year !== '2020')
                    .sort((a: any, b: any) => b.year.localeCompare(a.year))
                    .slice(0, 5)
                    .map((item: any, idx: number) => {
                      const config = yearConfigs[item.year] || {
                        bgColor: 'bg-gray-50',
                        textColor: 'text-gray-700',
                        borderColor: 'border-gray-200',
                        shape: 'rounded-xl',
                        layout: 'vertical'
                      };

                        return (
                          <div
                            key={idx}
                            className={cn(
                              "relative p-2.5 overflow-hidden",
                              "hover:shadow-lg hover:scale-[1.02]",
                              "transition-all duration-300 ease-out",
                              "group cursor-pointer",
                              "border-2",
                              config.bgColor,
                              config.borderColor,
                              config.shape,
                              idx < 2 ? 'col-span-3' : 'col-span-2'
                            )}
                          >
                          {/* Subtle pattern overlay */}
                          <div className={cn(
                            "absolute inset-0 opacity-[0.03]",
                            idx % 2 === 0
                              ? "bg-[radial-gradient(circle_at_30%_30%,rgba(0,0,0,0.5)_1px,transparent_1px)] bg-[length:16px_16px]"
                              : "bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.05)_25%,rgba(0,0,0,0.05)_50%,transparent_50%,transparent_75%,rgba(0,0,0,0.05)_75%)] bg-[length:12px_12px]"
                          )} />

                          {/* Content */}
                          <div className={cn(
                            "relative z-10 flex flex-col h-full",
                            config.layout === 'vertical' ? 'items-center justify-center' : 'items-start justify-between'
                          )}>
                            {/* Year badge */}
                            <div className={cn(
                              "flex items-center gap-1 mb-1.5",
                              config.textColor
                            )}>
                              <div className={cn(
                                "w-4 h-4 rounded flex items-center justify-center",
                                "bg-white/60 backdrop-blur-sm",
                                "border border-current/20"
                              )}>
                                <svg
                                  className="w-2.5 h-2.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                              <p className="text-[10px] font-semibold tracking-wide uppercase">
                                {item.year}
                              </p>
                            </div>

                            {/* Impact */}
                            <div className="mb-1.5">
                              <p className={cn(
                                idx < 2 ? "text-2xl" : "text-[20px]",
                                "font-bold",
                                config.textColor,
                                "group-hover:scale-110 transition-transform duration-300"
                              )}>
                                {formatImpact(item.impact)}
                              </p>
                            </div>

                            {/* Per auditor metric */}
                            <div className={cn(
                              "flex items-center gap-0.5",
                              config.textColor
                            )}>
                              <svg
                                className={cn("w-2.5 h-2.5 opacity-70")}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                              </svg>
                              <p className={cn("text-[9px] font-medium opacity-80 whitespace-nowrap")}>
                                {perAuditorMap[item.year] || '€0'} per auditor
                              </p>
                            </div>
                          </div>

                          {/* Decorative element based on shape */}
                          {config.shape === 'rounded-lg' && (
                            <div className="absolute top-0 right-0 w-6 h-6 bg-white/20 transform rotate-45 translate-x-3 -translate-y-3" />
                          )}
                          {config.shape === 'rounded-3xl' && (
                            <div className="absolute bottom-0 left-0 w-10 h-10 bg-white/20 rounded-full blur-xl" />
                          )}
                          {config.shape === 'rounded-xl' && (
                            <div className="absolute top-0 right-0 w-8 h-8 bg-white/20 rounded-full blur-lg" />
                          )}
                        </div>
                      );
                    });
                })()}
              </div>
            </Card>
          </div>

          {/* Mobile Version - Modern Carousel Design */}
          {isMobileViewport && (
            <div className="space-y-4">
              {/* Modern Tab Switcher */}
              <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 rounded-2xl p-2 shadow-inner">
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Audit', icon: '📊', index: 0 },
                    { label: 'Invest.', icon: '🔍', index: 1 },
                    { label: 'Fraud', icon: '🛡️', index: 2 },
                    { label: 'LP', icon: '🔒', index: 3 }
                  ].map(({ label, icon, index }) => (
                    <button
                      key={index}
                      onClick={() => setActiveCardIndex(index as 0 | 1 | 2 | 3)}
                      className={cn(
                        "relative px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300",
                        "active:scale-95",
                        activeCardIndex === index
                          ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg transform scale-105"
                          : "bg-white/60 text-gray-600 hover:bg-white/80"
                      )}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-sm">{icon}</span>
                        <span>{label}</span>
                      </div>
                      {activeCardIndex === index && (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
                {/* Progress Indicator */}
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-500 ease-out",
                        activeCardIndex === index
                          ? "w-8 bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md"
                          : "w-1.5 bg-white/60"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Swipeable Cards Container */}
              <div
                className="relative overflow-hidden"
                onTouchStart={(e) => {
                  setTouchEnd(null);
                  setTouchStart(e.targetTouches[0]?.clientX || null);
                }}
                onTouchMove={(e) => {
                  setTouchEnd(e.targetTouches[0]?.clientX || null);
                }}
                onTouchEnd={() => {
                  if (!touchStart || !touchEnd) return;
                  const distance = touchStart - touchEnd;
                  const minSwipeDistance = 50;

                  if (Math.abs(distance) > minSwipeDistance) {
                    if (distance > 0 && activeCardIndex < 3) {
                      setActiveCardIndex((activeCardIndex + 1) as 0 | 1 | 2 | 3);
                    } else if (distance < 0 && activeCardIndex > 0) {
                      setActiveCardIndex((activeCardIndex - 1) as 0 | 1 | 2 | 3);
                    }
                  }
                }}
              >
                {/* Audit Projects - Mobile */}
                {activeCardIndex === 0 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <Card variant="elevated" className="bg-white border border-gray-200 shadow-lg">
                      <CardHeader
                        title="Audit Projects by Year"
                        className="border-b border-gray-200 pb-3 text-base font-bold"
                      />
                      <div className="mt-4 space-y-3">
                        {loadingProjects ? (
                          <div className="flex justify-center py-8">
                            <Loading size="lg" />
                          </div>
                        ) : auditProjects && Array.isArray(auditProjects) ? (
                          (() => {
                            const perAuditorMap: Record<string, string> = {
                              '2025': '2.17',
                              '2024': '1.84',
                              '2023': '0.86',
                              '2022': '1.15',
                              '2021': '1.94',
                            };

                            const yearConfigs: Record<string, {
                              bgColor: string;
                              textColor: string;
                              borderColor: string;
                              shape: string;
                            }> = {
                              '2025': { bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50', textColor: 'text-indigo-700', borderColor: 'border-indigo-200', shape: 'rounded-2xl' },
                              '2024': { bgColor: 'bg-gradient-to-br from-slate-50 to-slate-100/50', textColor: 'text-slate-700', borderColor: 'border-slate-200', shape: 'rounded-xl' },
                              '2023': { bgColor: 'bg-gradient-to-br from-violet-50 to-violet-100/50', textColor: 'text-violet-700', borderColor: 'border-violet-200', shape: 'rounded-2xl' },
                              '2022': { bgColor: 'bg-gradient-to-br from-amber-50 to-amber-100/50', textColor: 'text-amber-700', borderColor: 'border-amber-200', shape: 'rounded-xl' },
                              '2021': { bgColor: 'bg-gradient-to-br from-neutral-50 to-neutral-100/50', textColor: 'text-neutral-700', borderColor: 'border-neutral-200', shape: 'rounded-xl' },
                            };

                            const sortedProjects = auditProjects
                              .filter((item: any) => item.auditYear && item.auditYear !== 'Unknown' && typeof item.auditYear === 'string')
                              .slice(0, 5)
                              .sort((a: any, b: any) => {
                                const yearA = String(a.auditYear || '');
                                const yearB = String(b.auditYear || '');
                                return yearB.localeCompare(yearA);
                              });

                            return (
                              <>
                                {/* First row: 2 cards */}
                                <div className="grid grid-cols-2 gap-3">
                                  {sortedProjects.slice(0, 2).map((item: any, idx: number) => {
                                    const config = yearConfigs[item.auditYear] || {
                                      bgColor: 'bg-gray-50',
                                      textColor: 'text-gray-700',
                                      borderColor: 'border-gray-200',
                                      shape: 'rounded-xl'
                                    };

                                    return (
                                      <div
                                        key={idx}
                                        className={cn(
                                          "relative p-4 overflow-hidden",
                                          "border-2 shadow-md hover:shadow-lg",
                                          "transition-all duration-300 active:scale-95",
                                          config.bgColor,
                                          config.borderColor,
                                          config.shape
                                        )}
                                      >
                                        <div className="flex flex-col items-center justify-center h-full">
                                          <p className={cn("text-[10px] font-bold uppercase mb-2", config.textColor)}>
                                            {item.auditYear}
                                          </p>
                                          <p className={cn("text-2xl font-bold mb-1", config.textColor)}>
                                            {item.count}
                                          </p>
                                          <p className={cn("text-[9px] font-medium opacity-70", config.textColor)}>
                                            {perAuditorMap[item.auditYear] || '0'} per auditor
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {/* Second row: 3 cards */}
                                <div className="grid grid-cols-3 gap-3">
                                  {sortedProjects.slice(2, 5).map((item: any, idx: number) => {
                                    const config = yearConfigs[item.auditYear] || {
                                      bgColor: 'bg-gray-50',
                                      textColor: 'text-gray-700',
                                      borderColor: 'border-gray-200',
                                      shape: 'rounded-xl'
                                    };

                                    return (
                                      <div
                                        key={idx + 2}
                                        className={cn(
                                          "relative p-3 overflow-hidden",
                                          "border-2 shadow-md hover:shadow-lg",
                                          "transition-all duration-300 active:scale-95",
                                          config.bgColor,
                                          config.borderColor,
                                          config.shape
                                        )}
                                      >
                                        <div className="flex flex-col items-center justify-center h-full">
                                          <p className={cn("text-[9px] font-bold uppercase mb-1.5", config.textColor)}>
                                            {item.auditYear}
                                          </p>
                                          <p className={cn("text-xl font-bold mb-1", config.textColor)}>
                                            {item.count}
                                          </p>
                                          <p className={cn("text-[8px] font-medium opacity-70", config.textColor)}>
                                            {perAuditorMap[item.auditYear] || '0'} per auditor
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            );
                          })()
                        ) : (
                          <div className="text-center text-gray-500 py-8 text-sm">
                            No data available
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                )}

                {/* Investigations - Mobile */}
                {activeCardIndex === 1 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <Card variant="elevated" className="bg-white border border-gray-200 shadow-lg">
                      <CardHeader
                        title="Investigations by Year"
                        className="border-b border-gray-200 pb-3 text-base font-bold"
                      />
                      <div className="mt-4 space-y-3">
                        {loadingInvestigations ? (
                          <div className="flex justify-center py-8">
                            <Loading size="lg" />
                          </div>
                        ) : investigations && Array.isArray(investigations) && investigations.length > 0 ? (
                          (() => {
                            const yearConfigs: Record<string, {
                              bgColor: string;
                              textColor: string;
                              borderColor: string;
                              shape: string;
                            }> = {
                              '2025': { bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50', textColor: 'text-indigo-700', borderColor: 'border-indigo-200', shape: 'rounded-2xl' },
                              '2024': { bgColor: 'bg-gradient-to-br from-slate-50 to-slate-100/50', textColor: 'text-slate-700', borderColor: 'border-slate-200', shape: 'rounded-xl' },
                              '2023': { bgColor: 'bg-gradient-to-br from-violet-50 to-violet-100/50', textColor: 'text-violet-700', borderColor: 'border-violet-200', shape: 'rounded-2xl' },
                              '2022': { bgColor: 'bg-gradient-to-br from-amber-50 to-amber-100/50', textColor: 'text-amber-700', borderColor: 'border-amber-200', shape: 'rounded-xl' },
                              '2021': { bgColor: 'bg-gradient-to-br from-neutral-50 to-neutral-100/50', textColor: 'text-neutral-700', borderColor: 'border-neutral-200', shape: 'rounded-xl' },
                            };

                            const investigationsByYear = investigations.reduce((acc: any, inv: any) => {
                              const year = inv.year || 'Unknown';
                              if (year !== 'Unknown' && year !== '2020') {
                                if (!acc[year]) {
                                  acc[year] = { total: 0, year, perAuditor: inv.yearPerAuditor || '0.00' };
                                }
                                const yearEntry = acc[year];
                                if (yearEntry) {
                                  yearEntry.total += (inv.count || 1);
                                  if (inv.yearPerAuditor) {
                                    yearEntry.perAuditor = inv.yearPerAuditor;
                                  }
                                }
                              }
                              return acc;
                            }, {});

                            const sortedInvestigations = Object.values(investigationsByYear)
                              .filter((item: any) => item.year && item.year !== 'Unknown')
                              .sort((a: any, b: any) => b.year.localeCompare(a.year))
                              .slice(0, 5);

                            return (
                              <>
                                {/* First row: 2 cards */}
                                <div className="grid grid-cols-2 gap-3">
                                  {sortedInvestigations.slice(0, 2).map((data: any, idx: number) => {
                                    const config = yearConfigs[data.year] || {
                                      bgColor: 'bg-gray-50',
                                      textColor: 'text-gray-700',
                                      borderColor: 'border-gray-200',
                                      shape: 'rounded-xl'
                                    };

                                    return (
                                      <div
                                        key={idx}
                                        className={cn(
                                          "relative p-4 overflow-hidden",
                                          "border-2 shadow-md hover:shadow-lg",
                                          "transition-all duration-300 active:scale-95",
                                          config.bgColor,
                                          config.borderColor,
                                          config.shape
                                        )}
                                      >
                                        <div className="flex flex-col items-center justify-center h-full">
                                          <p className={cn("text-[10px] font-bold uppercase mb-2", config.textColor)}>
                                            {data.year}
                                          </p>
                                          <p className={cn("text-2xl font-bold mb-1", config.textColor)}>
                                            {data.total}
                                          </p>
                                          <p className={cn("text-[9px] font-medium opacity-70", config.textColor)}>
                                            {data.perAuditor || '0'} per auditor
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {/* Second row: 3 cards */}
                                <div className="grid grid-cols-3 gap-3">
                                  {sortedInvestigations.slice(2, 5).map((data: any, idx: number) => {
                                    const config = yearConfigs[data.year] || {
                                      bgColor: 'bg-gray-50',
                                      textColor: 'text-gray-700',
                                      borderColor: 'border-gray-200',
                                      shape: 'rounded-xl'
                                    };

                                    return (
                                      <div
                                        key={idx + 2}
                                        className={cn(
                                          "relative p-3 overflow-hidden",
                                          "border-2 shadow-md hover:shadow-lg",
                                          "transition-all duration-300 active:scale-95",
                                          config.bgColor,
                                          config.borderColor,
                                          config.shape
                                        )}
                                      >
                                        <div className="flex flex-col items-center justify-center h-full">
                                          <p className={cn("text-[9px] font-bold uppercase mb-1.5", config.textColor)}>
                                            {data.year}
                                          </p>
                                          <p className={cn("text-xl font-bold mb-1", config.textColor)}>
                                            {data.total}
                                          </p>
                                          <p className={cn("text-[8px] font-medium opacity-70", config.textColor)}>
                                            {data.perAuditor || '0'} per auditor
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            );
                          })()
                        ) : (
                          <div className="text-center text-gray-500 py-8 text-sm">
                            No data available
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                )}

                {/* Fraud - Mobile */}
                {activeCardIndex === 2 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <Card variant="elevated" className="bg-white border border-gray-200 shadow-lg">
                      <CardHeader
                        title="Fraud Internal Control by Year"
                        className="border-b border-gray-200 pb-3 text-base font-bold"
                      />
                      <div className="mt-4 space-y-3">
                        {loadingFraud ? (
                          <div className="flex justify-center py-8">
                            <Loading size="lg" />
                          </div>
                        ) : fraudImpact?.scoreCards && Array.isArray(fraudImpact.scoreCards) ? (
                          (() => {
                            const perAuditorMap: Record<string, string> = {
                              '2025': '€1.34M',
                              '2024': '€2.71M',
                              '2023': '€1.56M',
                              '2022': '€3.50M',
                              '2021': '€0.96M',
                            };

                            const formatImpact = (impact: any) => {
                              if (!impact) return '€0';
                              const numericValue = typeof impact === 'string'
                                ? parseFloat(impact.replace(/,/g, ''))
                                : impact;
                              if (isNaN(numericValue)) return '€0';
                              const millions = numericValue / 1000000;
                              return `€${millions.toFixed(2)}M`;
                            };

                            const yearConfigs: Record<string, {
                              bgColor: string;
                              textColor: string;
                              borderColor: string;
                              shape: string;
                            }> = {
                              '2025': { bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50', textColor: 'text-indigo-700', borderColor: 'border-indigo-200', shape: 'rounded-2xl' },
                              '2024': { bgColor: 'bg-gradient-to-br from-slate-50 to-slate-100/50', textColor: 'text-slate-700', borderColor: 'border-slate-200', shape: 'rounded-xl' },
                              '2023': { bgColor: 'bg-gradient-to-br from-violet-50 to-violet-100/50', textColor: 'text-violet-700', borderColor: 'border-violet-200', shape: 'rounded-2xl' },
                              '2022': { bgColor: 'bg-gradient-to-br from-amber-50 to-amber-100/50', textColor: 'text-amber-700', borderColor: 'border-amber-200', shape: 'rounded-xl' },
                              '2021': { bgColor: 'bg-gradient-to-br from-neutral-50 to-neutral-100/50', textColor: 'text-neutral-700', borderColor: 'border-neutral-200', shape: 'rounded-xl' },
                            };

                            const sortedFraud = fraudImpact.scoreCards
                              .filter((item: any) => item.year && item.year !== '2020')
                              .sort((a: any, b: any) => b.year.localeCompare(a.year))
                              .slice(0, 5);

                            return (
                              <>
                                {/* First row: 2 cards */}
                                <div className="grid grid-cols-2 gap-3">
                                  {sortedFraud.slice(0, 2).map((item: any, idx: number) => {
                                    const config = yearConfigs[item.year] || {
                                      bgColor: 'bg-gray-50',
                                      textColor: 'text-gray-700',
                                      borderColor: 'border-gray-200',
                                      shape: 'rounded-xl'
                                    };

                                    return (
                                      <div
                                        key={idx}
                                        className={cn(
                                          "relative p-4 overflow-hidden",
                                          "border-2 shadow-md hover:shadow-lg",
                                          "transition-all duration-300 active:scale-95",
                                          config.bgColor,
                                          config.borderColor,
                                          config.shape
                                        )}
                                      >
                                        <div className="flex flex-col items-center justify-center h-full">
                                          <p className={cn("text-[10px] font-bold uppercase mb-2", config.textColor)}>
                                            {item.year}
                                          </p>
                                          <p className={cn("text-2xl font-bold mb-1", config.textColor)}>
                                            {formatImpact(item.impact)}
                                          </p>
                                          <p className={cn("text-[9px] font-medium opacity-70", config.textColor)}>
                                            {perAuditorMap[item.year] || '€0'} per auditor
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {/* Second row: 3 cards */}
                                <div className="grid grid-cols-3 gap-3">
                                  {sortedFraud.slice(2, 5).map((item: any, idx: number) => {
                                    const config = yearConfigs[item.year] || {
                                      bgColor: 'bg-gray-50',
                                      textColor: 'text-gray-700',
                                      borderColor: 'border-gray-200',
                                      shape: 'rounded-xl'
                                    };

                                    return (
                                      <div
                                        key={idx + 2}
                                        className={cn(
                                          "relative p-3 overflow-hidden",
                                          "border-2 shadow-md hover:shadow-lg",
                                          "transition-all duration-300 active:scale-95",
                                          config.bgColor,
                                          config.borderColor,
                                          config.shape
                                        )}
                                      >
                                        <div className="flex flex-col items-center justify-center h-full">
                                          <p className={cn("text-[9px] font-bold uppercase mb-1.5", config.textColor)}>
                                            {item.year}
                                          </p>
                                          <p className={cn("text-xl font-bold mb-1", config.textColor)}>
                                            {formatImpact(item.impact)}
                                          </p>
                                          <p className={cn("text-[8px] font-medium opacity-70", config.textColor)}>
                                            {perAuditorMap[item.year] || '€0'} per auditor
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            );
                          })()
                        ) : (
                          <div className="text-center text-gray-500 py-8 text-sm">
                            No data available
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                )}

                {/* LP - Mobile */}
                {activeCardIndex === 3 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <Card variant="elevated" className="bg-white border border-gray-200 shadow-lg">
                      <CardHeader
                        title="Loss Prevention by Year"
                        className="border-b border-gray-200 pb-3 text-sm font-bold"
                      />
                      <div className="mt-4 space-y-3">
                        {loadingLP ? (
                          <div className="col-span-2 flex justify-center py-8">
                            <Loading size="lg" />
                          </div>
                        ) : (() => {
                          const scoreCards = lpImpact?.scoreCards || lpImpact?.scoreCards2;
                          if (!scoreCards || !Array.isArray(scoreCards)) {
                            return (
                              <div className="text-center text-gray-500 py-8 text-sm">
                                No data available
                              </div>
                            );
                          }

                          const perAuditorMap: Record<string, string> = {
                            '2025': '€0.93M',
                            '2024': '€0.76M',
                            '2023': '€0.23M',
                            '2022': '€0.07M',
                            '2021': '€0.05M',
                          };

                          const formatImpact = (impact: any) => {
                            if (!impact) return '€0';
                            const numericValue = typeof impact === 'string'
                              ? parseFloat(impact.replace(/,/g, ''))
                              : impact;
                            if (isNaN(numericValue)) return '€0';
                            const millions = numericValue / 1000000;
                            return `€${millions.toFixed(2)}M`;
                          };

                          const yearConfigs: Record<string, {
                            bgColor: string;
                            textColor: string;
                            borderColor: string;
                            shape: string;
                          }> = {
                            '2025': { bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50', textColor: 'text-indigo-700', borderColor: 'border-indigo-200', shape: 'rounded-2xl' },
                            '2024': { bgColor: 'bg-gradient-to-br from-slate-50 to-slate-100/50', textColor: 'text-slate-700', borderColor: 'border-slate-200', shape: 'rounded-xl' },
                            '2023': { bgColor: 'bg-gradient-to-br from-violet-50 to-violet-100/50', textColor: 'text-violet-700', borderColor: 'border-violet-200', shape: 'rounded-2xl' },
                            '2022': { bgColor: 'bg-gradient-to-br from-amber-50 to-amber-100/50', textColor: 'text-amber-700', borderColor: 'border-amber-200', shape: 'rounded-xl' },
                            '2021': { bgColor: 'bg-gradient-to-br from-neutral-50 to-neutral-100/50', textColor: 'text-neutral-700', borderColor: 'border-neutral-200', shape: 'rounded-xl' },
                          };

                          const sortedLP = scoreCards
                            .filter((item: any) => item.year && item.year !== '2020')
                            .sort((a: any, b: any) => b.year.localeCompare(a.year))
                            .slice(0, 5);

                          return (
                            <>
                              {/* First row: 2 cards */}
                              <div className="grid grid-cols-2 gap-3">
                                {sortedLP.slice(0, 2).map((item: any, idx: number) => {
                                  const config = yearConfigs[item.year] || {
                                    bgColor: 'bg-gray-50',
                                    textColor: 'text-gray-700',
                                    borderColor: 'border-gray-200',
                                    shape: 'rounded-xl'
                                  };

                                  return (
                                    <div
                                      key={idx}
                                      className={cn(
                                        "relative p-4 overflow-hidden",
                                        "border-2 shadow-md hover:shadow-lg",
                                        "transition-all duration-300 active:scale-95",
                                        config.bgColor,
                                        config.borderColor,
                                        config.shape
                                      )}
                                    >
                                      <div className="flex flex-col items-center justify-center h-full">
                                        <p className={cn("text-[10px] font-bold uppercase mb-2", config.textColor)}>
                                          {item.year}
                                        </p>
                                        <p className={cn("text-2xl font-bold mb-1", config.textColor)}>
                                          {formatImpact(item.impact)}
                                        </p>
                                        <p className={cn("text-[9px] font-medium opacity-70", config.textColor)}>
                                          {perAuditorMap[item.year] || '€0'} per auditor
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Second row: 3 cards */}
                              <div className="grid grid-cols-3 gap-3">
                                {sortedLP.slice(2, 5).map((item: any, idx: number) => {
                                  const config = yearConfigs[item.year] || {
                                    bgColor: 'bg-gray-50',
                                    textColor: 'text-gray-700',
                                    borderColor: 'border-gray-200',
                                    shape: 'rounded-xl'
                                  };

                                  return (
                                    <div
                                      key={idx + 2}
                                      className={cn(
                                        "relative p-3 overflow-hidden",
                                        "border-2 shadow-md hover:shadow-lg",
                                        "transition-all duration-300 active:scale-95",
                                        config.bgColor,
                                        config.borderColor,
                                        config.shape
                                      )}
                                    >
                                      <div className="flex flex-col items-center justify-center h-full">
                                        <p className={cn("text-[9px] font-bold uppercase mb-1.5", config.textColor)}>
                                          {item.year}
                                        </p>
                                        <p className={cn("text-xl font-bold mb-1", config.textColor)}>
                                          {formatImpact(item.impact)}
                                        </p>
                                        <p className={cn("text-[8px] font-medium opacity-70", config.textColor)}>
                                          {perAuditorMap[item.year] || '€0'} per auditor
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </PermissionGate>

      {/* Scorecard Filter Toggle */}
      <PermissionGate component="finding_actions_status_chart">
        <div id="scorecard-toggle" className={cn(
          "flex items-center justify-between mb-4",
          isMobileViewport && "mb-3"
        )}>
          <h2 className={cn(
            "font-semibold text-gray-800",
            isMobileViewport ? "text-[12.8px]" : "text-[16px]"
          )}>Key Metrics</h2>
          <div className={cn(
            "flex rounded-lg",
            isMobileViewport
              ? "gap-1 bg-gray-100 p-0.5"
              : "gap-2 bg-gray-100 p-1"
          )}>
            <Button
              variant={scorecardFilter === '2024+' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setScorecardFilter('2024+')}
              className={cn(
                isMobileViewport
                  ? "!px-1.5 !py-0.5 !text-[7px] !h-5 !min-h-0 leading-tight"
                  : "!px-2.5 !py-1.5 !text-xs !h-8"
              )}
            >
              📅 As of 2024
            </Button>
            <Button
              variant={scorecardFilter === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setScorecardFilter('all')}
              className={cn(
                isMobileViewport
                  ? "!px-1.5 !py-0.5 !text-[7px] !h-5 !min-h-0 leading-tight"
                  : "!px-2.5 !py-1.5 !text-xs !h-8"
              )}
            >
              📊 All Results
            </Button>
          </div>
        </div>

        {/* Sticky Floating Toggle - Only show when charts are open AND original toggle is out of view */}
        {/* Exception: Don't show when only audit plan is open (progress tracker) */}
        {isToggleSticky && (showAllCharts || showControlAnalysisCharts) && !showAuditPlan ? (
          <div className={cn(
            "fixed top-20 right-4 z-40 flex flex-col gap-2"
          )}>
            <div className="relative group">
              <Button
                variant={scorecardFilter === '2024+' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setScorecardFilter('2024+')}
                className={cn(
                  "!rounded-full !p-0 !min-w-0 flex items-center justify-center !shadow-md",
                  isMobileViewport ? "!w-12 !h-12" : "!w-10 !h-10"
                )}
              >
                <svg className={cn(isMobileViewport ? "w-5 h-5" : "w-4 h-4")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" fill="none" />
                  <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
                  <text x="12" y="19" textAnchor="middle" fontSize="11" fontWeight="500" fill="currentColor" fontFamily="system-ui, -apple-system, sans-serif">24</text>
                </svg>
              </Button>
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                <div className="bg-gray-900 text-white text-xs py-1.5 px-2 rounded shadow-lg">
                  As of 2024
                </div>
              </div>
            </div>
            <div className="relative group">
              <Button
                variant={scorecardFilter === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setScorecardFilter('all')}
                className={cn(
                  "!rounded-full !p-0 !min-w-0 flex items-center justify-center !shadow-md !bg-white",
                  isMobileViewport ? "!w-12 !h-12" : "!w-10 !h-10"
                )}
              >
                <span className={cn(isMobileViewport ? "text-base" : "text-sm")}>📊</span>
              </Button>
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                <div className="bg-gray-900 text-white text-xs py-1.5 px-2 rounded shadow-lg">
                  All Results
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Role-Based Stats Cards */}
        {isMobileViewport ? (
          <div className="space-y-4">
            {/* Key Metrics Carousel Tabs */}
            <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 rounded-2xl p-2 shadow-inner">
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: 'Total', icon: '📊', index: 0 },
                  { label: 'Open', icon: '📋', index: 1 },
                  { label: 'Overdue', icon: '⚠️', index: 2 },
                  { label: 'Financial', icon: '💰', index: 3 },
                  { label: 'Maturity', icon: '⭐', index: 4 }
                ].map(({ label, icon, index }) => (
                  <button
                    key={index}
                    onClick={() => setActiveKeyMetricIndex(index as 0 | 1 | 2 | 3 | 4)}
                    className={cn(
                      "relative px-1.5 py-1 rounded-lg text-[9px] font-bold transition-all duration-300",
                      "active:scale-95",
                      activeKeyMetricIndex === index
                        ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg transform scale-105"
                        : "bg-white/60 text-gray-600 hover:bg-white/80"
                    )}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs">{icon}</span>
                      <span className="leading-tight">{label}</span>
                    </div>
                    {activeKeyMetricIndex === index && (
                      <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-0.5 h-0.5 bg-white rounded-full" />
                    )}
                  </button>
                ))}
              </div>
              {/* Progress Indicator */}
              <div className="mt-2 flex items-center justify-center gap-1">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-1 rounded-full transition-all duration-500 ease-out",
                      activeKeyMetricIndex === index
                        ? "w-6 bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md"
                        : "w-1 bg-white/60"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Swipeable Key Metrics Cards */}
            <div
              className="relative overflow-hidden"
              onTouchStart={(e) => {
                setKeyMetricTouchEnd(null);
                setKeyMetricTouchStart(e.targetTouches[0]?.clientX || null);
              }}
              onTouchMove={(e) => {
                setKeyMetricTouchEnd(e.targetTouches[0]?.clientX || null);
              }}
              onTouchEnd={() => {
                if (!keyMetricTouchStart || !keyMetricTouchEnd) return;
                const distance = keyMetricTouchStart - keyMetricTouchEnd;
                const minSwipeDistance = 50;

                if (Math.abs(distance) > minSwipeDistance) {
                  if (distance > 0 && activeKeyMetricIndex < 4) {
                    setActiveKeyMetricIndex((activeKeyMetricIndex + 1) as 0 | 1 | 2 | 3 | 4);
                  } else if (distance < 0 && activeKeyMetricIndex > 0) {
                    setActiveKeyMetricIndex((activeKeyMetricIndex - 1) as 0 | 1 | 2 | 3 | 4);
                  }
                }
              }}
            >
              {/* Total Actions */}
              {activeKeyMetricIndex === 0 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <Card variant="elevated" className="bg-white border border-gray-200 shadow-lg">
                    <CardHeader
                      title="Total Actions"
                      subtitle="All finding actions"
                      action={<Badge variant="default" size="sm">{scorecardFilter === '2024+' ? '2024+' : 'All'}</Badge>}
                    />
                    <div className="mt-3 min-h-[120px] flex flex-col justify-center items-center px-4 pb-3">
                      {loadingActionStatus ? (
                        <div className="flex justify-center items-center">
                          <Loading size="sm" />
                        </div>
                      ) : (
                        <>
                          <p className="text-3xl font-bold text-purple-600 mb-2">
                            {actionStatus?.statusDistribution
                              ? (Object.values(actionStatus.statusDistribution) as number[]).reduce((a: number, b: number) => a + b, 0)
                              : 0}
                          </p>
                          <p className="text-[10px] text-gray-500 text-center">
                            All statuses (Open, Overdue, etc.)
                          </p>
                        </>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {/* Open Actions */}
              {activeKeyMetricIndex === 1 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <Card variant="elevated" className="bg-white border border-gray-200 shadow-lg">
                    <CardHeader
                      title="Open Actions"
                      subtitle="Pending finding actions"
                      action={<Badge variant="default" size="sm">{scorecardFilter === '2024+' ? '2024+' : 'All'}</Badge>}
                    />
                    <div className="mt-3 min-h-[120px] flex flex-col justify-center items-center px-4 pb-3">
                      {loadingActionStatus ? (
                        <div className="flex justify-center items-center">
                          <Loading size="sm" />
                        </div>
                      ) : (
                        <>
                          <p className="text-3xl font-bold text-yellow-600 mb-2">
                            {(actionStatus?.statusDistribution as any)?.['Open'] || 0}
                          </p>
                          <p className="text-[10px] text-gray-500 text-center">
                            Status: Open
                          </p>
                        </>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {/* Overdue Actions */}
              {activeKeyMetricIndex === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <Card variant="elevated" className="bg-white border border-gray-200 shadow-lg">
                    <CardHeader
                      title="Overdue Actions"
                      subtitle="Past due date"
                      action={<Badge variant="default" size="sm">{scorecardFilter === '2024+' ? '2024+' : 'All'}</Badge>}
                    />
                    <div className="mt-3 min-h-[120px] flex flex-col justify-center items-center px-4 pb-3">
                      {loadingActionStatus ? (
                        <div className="flex justify-center items-center">
                          <Loading size="sm" />
                        </div>
                      ) : (
                        <>
                          <p className="text-3xl font-bold text-red-600 mb-2">
                            {(actionStatus?.statusDistribution as any)?.['Overdue'] || 0}
                          </p>
                          <p className="text-[10px] text-gray-500 text-center">
                            Status: Overdue
                          </p>
                        </>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {/* Financial Impact */}
              {activeKeyMetricIndex === 3 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <Card variant="elevated" className="bg-white border border-gray-200 shadow-lg">
                    <CardHeader
                      title="Financial Impact"
                      subtitle="Total monetary impact"
                      action={<Badge variant="default" size="sm">2024+</Badge>}
                    />
                    <div className="mt-3 min-h-[120px] flex flex-col justify-center items-center px-4 pb-3">
                      {loadingFinancialImpact ? (
                        <div className="flex justify-center items-center">
                          <Loading size="sm" />
                        </div>
                      ) : (
                        <>
                          <p className="text-2xl font-bold text-green-600 mb-2 text-center">
                            {financialImpactData?.totalFinancialImpact
                              ? formatFinancialImpact(financialImpactData.totalFinancialImpact)
                              : '0 €'}
                          </p>
                          <p className="text-[10px] text-gray-500 text-center">
                            From {financialImpactData?.parentKeys?.length || 0} findings
                          </p>
                        </>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {/* Audit Maturity */}
              {activeKeyMetricIndex === 4 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <Card variant="elevated" className="bg-gradient-to-br from-indigo-50 to-white border border-gray-200 shadow-lg">
                    <CardHeader
                      title="Audit Maturity"
                      subtitle="Average Score"
                      action={
                        <div className="flex gap-1">
                          <button
                            onClick={() => setMaturityYear('2024')}
                            className={cn(
                              "px-2 py-1 text-xs font-medium rounded transition-colors",
                              maturityYear === '2024'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            )}
                          >
                            2024
                          </button>
                          <button
                            onClick={() => setMaturityYear('2025')}
                            className={cn(
                              "px-2 py-1 text-xs font-medium rounded transition-colors",
                              maturityYear === '2025'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            )}
                          >
                            2025
                          </button>
                        </div>
                      }
                    />
                    <div className="mt-3 min-h-[120px] flex flex-col justify-center items-center px-4 pb-3">
                      {loadingMAT ? (
                        <div className="flex justify-center items-center">
                          <Loading size="sm" />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1.5 justify-center">
                            <p className="text-3xl font-bold text-indigo-600">
                              {maturityYear === '2024'
                                ? (matScores?.average2024 ? matScores.average2024.toFixed(1) : '-')
                                : (matScores?.average2025 ? matScores.average2025.toFixed(1) : '-')
                              }
                            </p>
                            <span className="text-lg text-indigo-400 font-medium">/ 5.0</span>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-[19.2px]">
            <Card variant="elevated">
              <CardHeader
                title="Total Actions"
                subtitle="All finding actions"
                action={<Badge variant="default" size="sm">{scorecardFilter === '2024+' ? '2024+' : 'All'}</Badge>}
              />
              <div className="mt-4 min-h-[100px] flex flex-col justify-center">
                {loadingActionStatus ? (
                  <div className="flex justify-center items-center">
                    <Loading size="lg" />
                  </div>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-purple-600">
                      {actionStatus?.statusDistribution
                        ? (Object.values(actionStatus.statusDistribution) as number[]).reduce((a: number, b: number) => a + b, 0)
                        : 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      All statuses (Open, Overdue, etc.)
                    </p>
                  </>
                )}
              </div>
            </Card>

            <Card variant="elevated">
              <CardHeader
                title="Open Actions"
                subtitle="Pending finding actions"
                action={<Badge variant="default" size="sm">{scorecardFilter === '2024+' ? '2024+' : 'All'}</Badge>}
              />
              <div className="mt-4 min-h-[100px] flex flex-col justify-center">
                {loadingActionStatus ? (
                  <div className="flex justify-center items-center">
                    <Loading size="lg" />
                  </div>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-yellow-600">
                      {(actionStatus?.statusDistribution as any)?.['Open'] || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Status: Open
                    </p>
                  </>
                )}
              </div>
            </Card>

            <Card variant="elevated">
              <CardHeader
                title="Overdue Actions"
                subtitle="Past due date"
                action={<Badge variant="default" size="sm">{scorecardFilter === '2024+' ? '2024+' : 'All'}</Badge>}
              />
              <div className="mt-4 min-h-[100px] flex flex-col justify-center">
                {loadingActionStatus ? (
                  <div className="flex justify-center items-center">
                    <Loading size="lg" />
                  </div>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-red-600">
                      {(actionStatus?.statusDistribution as any)?.['Overdue'] || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Status: Overdue
                    </p>
                  </>
                )}
              </div>
            </Card>

            <Card variant="elevated">
              <CardHeader
                title="Financial Impact"
                subtitle="Total monetary impact"
                action={<Badge variant="default" size="sm">2024+</Badge>}
              />
              <div className="mt-4 min-h-[100px] flex flex-col justify-center">
                {loadingFinancialImpact ? (
                  <div className="flex justify-center items-center">
                    <Loading size="lg" />
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-green-600">
                      {financialImpactData?.totalFinancialImpact
                        ? formatFinancialImpact(financialImpactData.totalFinancialImpact)
                        : '0 €'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      From {financialImpactData?.parentKeys?.length || 0} findings
                    </p>
                  </>
                )}
              </div>
            </Card>

            <Card variant="elevated" className="bg-gradient-to-br from-indigo-50 to-white">
              <CardHeader
                title="Audit Maturity"
                subtitle="Average Score"
                action={
                  <div className="flex gap-1">
                    <button
                      onClick={() => setMaturityYear('2024')}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${maturityYear === '2024'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                      2024
                    </button>
                    <button
                      onClick={() => setMaturityYear('2025')}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${maturityYear === '2025'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                      2025
                    </button>
                  </div>
                }
              />
              <div className="mt-4 min-h-[70px] flex flex-col justify-center">
                {loadingMAT ? (
                  <div className="flex justify-center items-center">
                    <Loading size="lg" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2 justify-center">
                      <p className="text-3xl font-bold text-indigo-600">
                        {maturityYear === '2024'
                          ? (matScores?.average2024 ? matScores.average2024.toFixed(1) : '-')
                          : (matScores?.average2025 ? matScores.average2025.toFixed(1) : '-')
                        }
                      </p>
                      <span className="text-lg text-indigo-400 font-medium">/ 5.0</span>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Toggle Charts and Action Buttons */}
        <div className={cn(
          'flex flex-wrap justify-start gap-3 mt-6',
          isMobileViewport && 'justify-start'
        )}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActionsModalType('overdue');
              setIsActionsModalOpen(true);
            }}
            className={actionButtonClass}
          >
            <span className="mr-2">⏰</span>
            Action Alerts
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAuditPlanClick}
            className={actionButtonClass}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            View Audit Plan
          </Button>
        </div>

      </PermissionGate>

      {/* Control Analysis Charts Section - Only show if See All Charts is NOT open */}
      {showControlAnalysisCharts && !showAllCharts && (
        <div ref={controlAnalysisSectionRef} className="mt-6 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-px bg-gradient-to-r from-purple-500 to-indigo-600 flex-1"></div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 whitespace-nowrap">
                <span>📊</span>
                Control Analysis Charts
              </h2>
              <div className="h-px bg-gradient-to-r from-indigo-600 to-purple-500 flex-1"></div>
            </div>

            {/* Hide Button - Modern Design */}
            <button
              onClick={() => {
                setShowControlAnalysisCharts(false);
                setIsToggleSticky(false); // Reset sticky toggle when hiding charts
                // Sayfanın en üstüne scroll
                window.scrollTo({
                  top: 0,
                  behavior: 'smooth'
                });
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg',
                'bg-gradient-to-r from-gray-100 to-gray-50',
                'border border-gray-300',
                'text-gray-700 font-medium text-sm',
                'hover:from-gray-200 hover:to-gray-100',
                'hover:border-gray-400',
                'hover:shadow-md',
                'transition-all duration-200',
                'group'
              )}
            >
              <span className="text-gray-500 group-hover:text-gray-700 transition-colors">↑</span>
              <span>Hide</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PermissionGate component="finding_distribution_risk_chart">
              <Card variant="elevated">
                <CardHeader
                  title="Finding Distribution by Risk Type and Risk Level"
                >
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-gray-500">
                      Showing {scorecardFilter === '2024+' ? 'As of 2024' : 'All Results'}
                    </p>
                    <span className={cn(
                      "px-2 py-0.5 text-xs font-medium rounded-full",
                      scorecardFilter === '2024+' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    )}>
                      {scorecardFilter === '2024+' ? '📅 Filtered' : '📊 All Data'}
                    </span>
                  </div>
                </CardHeader>
                <div className="mt-4 overflow-x-auto">
                  {loadingRiskType ? (
                    <div className="h-64 flex items-center justify-center">
                      <Loading size="lg" />
                    </div>
                  ) : riskTypeData && Array.isArray(riskTypeData) ? (
                    <>
                      {isMobileViewport ? (
                        // Mobile: Card Layout - Two Column Grid (same as Fraud/Loss Prevention)
                        <div className="grid grid-cols-2 gap-1.5 px-1">
                          {riskTypeData.map((row: any, idx: number) => {
                            const type = row.type?.trim() || '-';
                            const isTotal = type.toLowerCase().includes('total');

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "rounded-lg border shadow-sm overflow-hidden",
                                  isTotal ? "border-blue-700 col-span-2" : "border-gray-200"
                                )}
                              >
                                <div className={cn(
                                  "px-1.5 py-1",
                                  isTotal
                                    ? "bg-gradient-to-r from-blue-800 to-blue-700"
                                    : "bg-gradient-to-r from-blue-900 to-blue-800"
                                )}>
                                  <h4 className="text-white font-semibold text-xs">
                                    {type}
                                  </h4>
                                </div>
                                <div className={cn(
                                  "p-1.5 space-y-0.5",
                                  isTotal ? "bg-blue-50" : "bg-white"
                                )}>
                                  <div className="flex justify-between items-center py-0.5 text-[10px]">
                                    <span className={cn(
                                      "font-medium",
                                      isTotal ? "text-blue-700" : "text-gray-600"
                                    )}>
                                      Critical:
                                    </span>
                                    <span className={cn(
                                      "font-semibold",
                                      isTotal ? "text-blue-900 text-[11px]" : "text-gray-900 text-[11px]"
                                    )}>
                                      {row.Critical || 0}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-0.5 text-[10px]">
                                    <span className={cn(
                                      "font-medium",
                                      isTotal ? "text-blue-700" : "text-gray-600"
                                    )}>
                                      High:
                                    </span>
                                    <span className={cn(
                                      "font-semibold",
                                      isTotal ? "text-blue-900 text-[11px]" : "text-gray-900 text-[11px]"
                                    )}>
                                      {row.High || 0}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-0.5 text-[10px]">
                                    <span className={cn(
                                      "font-medium",
                                      isTotal ? "text-blue-700" : "text-gray-600"
                                    )}>
                                      Medium:
                                    </span>
                                    <span className={cn(
                                      "font-semibold",
                                      isTotal ? "text-blue-900 text-[11px]" : "text-gray-900 text-[11px]"
                                    )}>
                                      {row.Medium || 0}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-0.5 text-[10px]">
                                    <span className={cn(
                                      "font-medium",
                                      isTotal ? "text-blue-700" : "text-gray-600"
                                    )}>
                                      Low:
                                    </span>
                                    <span className={cn(
                                      "font-semibold",
                                      isTotal ? "text-blue-900 text-[11px]" : "text-gray-900 text-[11px]"
                                    )}>
                                      {row.Low || 0}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-0.5 text-[10px]">
                                    <span className={cn(
                                      "font-medium",
                                      isTotal ? "text-blue-700" : "text-gray-600"
                                    )}>
                                      Total:
                                    </span>
                                    <span className={cn(
                                      "font-semibold",
                                      isTotal ? "text-blue-900 text-[11px]" : "text-gray-900 text-[11px]"
                                    )}>
                                      {row.Total || 0}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        // Desktop: Table Layout
                        <table className={cn("w-full", isMobileViewport ? "text-xs" : "text-sm")}>
                          <thead>
                            <tr className="border-b-2 border-purple-600">
                              <th className={cn("text-left bg-blue-900 text-white font-semibold", isMobileViewport ? "p-1.5 text-[10px]" : "p-3")}>RISK TYPE</th>
                              <th className={cn("text-center bg-gray-900 text-white font-semibold", isMobileViewport ? "p-1.5 text-[10px]" : "p-3")}>CRITICAL</th>
                              <th className={cn("text-center bg-red-600 text-white font-semibold", isMobileViewport ? "p-1.5 text-[10px]" : "p-3")}>HIGH</th>
                              <th className={cn("text-center bg-orange-500 text-white font-semibold", isMobileViewport ? "p-1.5 text-[10px]" : "p-3")}>MEDIUM</th>
                              <th className={cn("text-center bg-green-600 text-white font-semibold", isMobileViewport ? "p-1.5 text-[10px]" : "p-3")}>LOW</th>
                              <th className={cn("text-center bg-blue-600 text-white font-semibold", isMobileViewport ? "p-1.5 text-[10px]" : "p-3")}>T:</th>
                            </tr>
                          </thead>
                          <tbody>
                            {riskTypeData.map((row: any, idx: number) => {
                              const isTotal = row.type?.includes('Total');
                              return (
                                <tr key={idx} className={`border-b ${isTotal ? 'bg-gray-100 font-bold' : 'hover:bg-gray-50'}`}>
                                  <td className={cn("text-left", isMobileViewport ? "p-1.5" : "p-3")}>{row.type}</td>
                                  <td className={cn("text-center", isMobileViewport ? "p-1.5" : "p-3")}>{row.Critical || 0}</td>
                                  <td className={cn("text-center", isMobileViewport ? "p-1.5" : "p-3")}>{row.High || 0}</td>
                                  <td className={cn("text-center", isMobileViewport ? "p-1.5" : "p-3")}>{row.Medium || 0}</td>
                                  <td className={cn("text-center", isMobileViewport ? "p-1.5" : "p-3")}>{row.Low || 0}</td>
                                  <td className={cn("text-center font-semibold", isMobileViewport ? "p-1.5" : "p-3")}>{row.Total || 0}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-500">No data available</div>
                  )}
                </div>
              </Card>
            </PermissionGate>
          </div>

          {/* Google Sheets Tables - Fraud & Loss Prevention */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PermissionGate component="finding_distribution_risk_chart">
              <Card variant="elevated">
                <CardHeader
                  title="Fraud Internal Control"
                  subtitle="Data from Google Sheets"
                />
                <div className="mt-4 overflow-x-auto">
                  {loadingFraud2 ? (
                    <div className="h-64 flex items-center justify-center">
                      <Loading size="lg" />
                    </div>
                  ) : fraudInternalControl?.result && Array.isArray(fraudInternalControl.result) && fraudInternalControl.result.length > 0 ? (
                    <>
                      {isMobileViewport ? (
                        // Mobile: Card Layout - Two Column Grid
                        <div className="grid grid-cols-2 gap-1.5 px-1">
                          {fraudInternalControl.result.slice(1).map((row: string[], rowIdx: number) => {
                            const type = row[0]?.trim() || '-';
                            const isTotal = type.toLowerCase().includes('total');
                            const headers = fraudInternalControl.result[0] || [];

                            return (
                              <div
                                key={rowIdx}
                                className={cn(
                                  "rounded-lg border shadow-sm overflow-hidden",
                                  isTotal ? "border-blue-700 col-span-2" : "border-gray-200"
                                )}
                              >
                                <div className={cn(
                                  "px-1.5 py-1",
                                  isTotal
                                    ? "bg-gradient-to-r from-blue-800 to-blue-700"
                                    : "bg-gradient-to-r from-blue-900 to-blue-800"
                                )}>
                                  <h4 className="text-white font-semibold text-xs">
                                    {type === 'Total' ? 'Total (EUR)' : type}
                                  </h4>
                                </div>
                                <div className={cn(
                                  "p-1.5 space-y-0.5",
                                  isTotal ? "bg-blue-50" : "bg-white"
                                )}>
                                  {row.slice(1).map((cell: string, cellIdx: number) => {
                                    const year = headers[cellIdx + 1];
                                    const displayValue = formatSheetCurrency(cell);

                                    return (
                                      <div
                                        key={cellIdx}
                                        className="flex justify-between items-center py-0.5 text-[10px]"
                                      >
                                        <span className={cn(
                                          "font-medium",
                                          isTotal ? "text-blue-700" : "text-gray-600"
                                        )}>
                                          {year}:
                                        </span>
                                        <span className={cn(
                                          "font-semibold",
                                          isTotal ? "text-blue-900 text-[11px]" : "text-gray-900 text-[11px]"
                                        )}>
                                          {displayValue}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        // Desktop: Table Layout
                        <table className={cn("w-full", isMobileViewport ? "text-xs" : "text-sm")}>
                          <thead>
                            <tr className="border-b-2 border-purple-600">
                              {fraudInternalControl.result[0]?.map((header: string, idx: number) => (
                                <th key={idx} className={cn("bg-blue-900 text-white font-semibold", isMobileViewport ? "p-1.5 text-[10px]" : "p-3", idx === 0 ? "text-left" : "text-center")}>
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {fraudInternalControl.result.slice(1).map((row: string[], rowIdx: number) => (
                              <tr key={rowIdx} className="border-b hover:bg-gray-50">
                                {row.map((cell: string, cellIdx: number) => {
                                  let displayValue: string;
                                  if (cellIdx === 0) {
                                    const label = cell?.trim() || '-';
                                    displayValue = label === 'Total' ? 'Total (EUR)' : label;
                                  } else {
                                    displayValue = formatSheetCurrency(cell);
                                  }
                                  return (
                                    <td key={cellIdx} className={cn(isMobileViewport ? "p-1.5" : "p-3", cellIdx === 0 ? 'text-left' : 'text-center')}>
                                      {displayValue}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-500">No data available</div>
                  )}
                </div>
              </Card>
            </PermissionGate>

            <PermissionGate component="finding_distribution_control_chart">
              <Card variant="elevated">
                <CardHeader
                  title="Loss Prevention Internal Control"
                  subtitle="Data from Google Sheets"
                />
                <div className="mt-4 overflow-x-auto">
                  {loadingLossPrevention ? (
                    <div className="h-64 flex items-center justify-center">
                      <Loading size="lg" />
                    </div>
                  ) : lossPreventionSummary?.result && Array.isArray(lossPreventionSummary.result) && lossPreventionSummary.result.length > 0 ? (
                    <>
                      {isMobileViewport ? (
                        // Mobile: Card Layout - Two Column Grid
                        <div className="grid grid-cols-2 gap-1.5 px-1">
                          {lossPreventionSummary.result.slice(1).map((row: string[], rowIdx: number) => {
                            const type = row[0]?.trim() || '-';
                            const isTotal = type.toLowerCase().includes('total');
                            const headers = lossPreventionSummary.result[0] || [];

                            return (
                              <div
                                key={rowIdx}
                                className={cn(
                                  "rounded-lg border shadow-sm overflow-hidden",
                                  isTotal ? "border-blue-700 col-span-2" : "border-gray-200"
                                )}
                              >
                                <div className={cn(
                                  "px-1.5 py-1",
                                  isTotal
                                    ? "bg-gradient-to-r from-blue-800 to-blue-700"
                                    : "bg-gradient-to-r from-blue-900 to-blue-800"
                                )}>
                                  <h4 className="text-white font-semibold text-xs">
                                    {type === 'Total' ? 'Total (EUR)' : type}
                                  </h4>
                                </div>
                                <div className={cn(
                                  "p-1.5 space-y-0.5",
                                  isTotal ? "bg-blue-50" : "bg-white"
                                )}>
                                  {row.slice(1).map((cell: string, cellIdx: number) => {
                                    const year = headers[cellIdx + 1];
                                    const displayValue = formatSheetCurrency(cell);

                                    return (
                                      <div
                                        key={cellIdx}
                                        className="flex justify-between items-center py-0.5 text-[10px]"
                                      >
                                        <span className={cn(
                                          "font-medium",
                                          isTotal ? "text-blue-700" : "text-gray-600"
                                        )}>
                                          {year}:
                                        </span>
                                        <span className={cn(
                                          "font-semibold",
                                          isTotal ? "text-blue-900 text-[11px]" : "text-gray-900 text-[11px]"
                                        )}>
                                          {displayValue}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        // Desktop: Table Layout
                        <table className={cn("w-full", isMobileViewport ? "text-xs" : "text-sm")}>
                          <thead>
                            <tr className="border-b-2 border-purple-600">
                              {lossPreventionSummary.result[0]?.map((header: string, idx: number) => (
                                <th key={idx} className={cn("bg-blue-900 text-white font-semibold", isMobileViewport ? "p-1.5 text-[10px]" : "p-3", idx === 0 ? "text-left" : "text-center")}>
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {lossPreventionSummary.result.slice(1).map((row: string[], rowIdx: number) => (
                              <tr key={rowIdx} className="border-b hover:bg-gray-50">
                                {row.map((cell: string, cellIdx: number) => {
                                  let displayValue: string;
                                  if (cellIdx === 0) {
                                    const label = cell?.trim() || '-';
                                    displayValue = label === 'Total' ? 'Total (EUR)' : label;
                                  } else {
                                    displayValue = formatSheetCurrency(cell);
                                  }
                                  return (
                                    <td key={cellIdx} className={cn(isMobileViewport ? "p-1.5" : "p-3", cellIdx === 0 ? 'text-left' : 'text-center')}>
                                      {displayValue}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-500">No data available</div>
                  )}
                </div>
              </Card>
            </PermissionGate>
          </div>
        </div>
      )}

      {showAllCharts && (
        <>
          {/* Sticky Hide Charts Button */}
          {isHideChartsSticky && (showAllCharts || showControlAnalysisCharts) && (
            <div className={cn(
              "fixed z-50 shadow-lg rounded-lg bg-white border border-gray-200",
              "md:top-24 md:left-4 md:p-2",
              isMobileViewport ? "top-20 left-2 p-0.5" : "top-20 left-2 p-1"
            )}>
              <button
                onClick={() => {
                  setShowAllCharts(false);
                  setShowControlAnalysisCharts(false);
                  setIsToggleSticky(false); // Reset sticky toggle when hiding charts

                  // Mobil ve desktop için farklı scroll davranışı
                  if (isMobileViewport) {
                    // Mobilde önce 0'a scroll et, sonra emin olmak için tekrar
                    window.scrollTo(0, 0);
                    setTimeout(() => {
                      window.scrollTo({ top: 0, behavior: 'auto' });
                      document.documentElement.scrollTop = 0;
                      document.body.scrollTop = 0;
                    }, 50);
                  } else {
                    // Desktop'ta smooth scroll
                    window.scrollTo({
                      top: 0,
                      behavior: 'smooth'
                    });
                  }
                }}
                className={cn(
                  'rounded-lg',
                  'bg-gradient-to-r from-gray-100 to-gray-50',
                  'border border-gray-300',
                  'text-gray-700 font-medium',
                  'hover:from-gray-200 hover:to-gray-100',
                  'hover:border-gray-400',
                  'hover:shadow-md',
                  'transition-all duration-200',
                  'group',
                  // Mobile: vertical, thin, icon only
                  isMobileViewport
                    ? 'flex items-center justify-center px-1.5 py-2 h-auto min-h-[50px] w-8'
                    : 'flex items-center justify-center px-2 py-2 w-10 h-10'
                )}
              >
                <span className="text-gray-500 group-hover:text-gray-700 transition-colors text-lg md:text-xl">↑</span>
              </button>
            </div>
          )}

          {/* Charts Section - Permission Based with Real Data */}
          <div ref={allChartsSectionRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PermissionGate component="finding_actions_status_chart">
              <Card>
                <CardHeader>
                  <div>
                    <h2 className={cn(
                      "font-semibold text-gray-900",
                      isMobileViewport ? "text-base" : "text-xl"
                    )}>Finding Actions Status</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <p className={cn(
                        "text-gray-500 truncate flex-1",
                        isMobileViewport ? "text-xs" : "text-sm"
                      )}>
                        Current distribution (Click on a slice to view details)
                      </p>
                      <span className={cn(
                        "font-medium rounded-full flex-shrink-0",
                        isMobileViewport ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
                        scorecardFilter === '2024+' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      )}>
                        {scorecardFilter === '2024+' ? '📅 Filtered' : '📊 All Data'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <div className={cn("p-6", isMobileViewport && "flex flex-col items-center")}>
                  <div className={cn("w-full", isMobileViewport ? "max-w-[360px]" : "")}>
                    <PieChart
                      data={findingActionsData}
                      height={isMobileViewport ? 320 : 360}
                      loading={loadingActionStatus}
                      options={{
                        onClick: (_event, elements) => {
                          if (elements && elements.length > 0 && elements[0]) {
                            const elementIndex = elements[0].index;
                            const clickedLabel = findingActionsData.labels?.[elementIndex];
                            if (clickedLabel) {
                              handlePieClick(clickedLabel as string);
                            }
                          }
                        },
                        plugins: {
                          legend: {
                            display: !isMobileViewport,
                            position: 'bottom',
                            labels: {
                              padding: 15,
                              usePointStyle: true,
                              font: {
                                size: 12,
                              },
                              generateLabels: (chart) => {
                                const data = chart.data;
                                if (data.labels && data.datasets && data.datasets.length > 0) {
                                  const dataset = data.datasets[0];
                                  if (!dataset) return [];
                                  const bgColors = dataset.backgroundColor;
                                  return data.labels.map((label, i) => {
                                    const dataValue = Array.isArray(dataset.data) ? dataset.data[i] : 0;
                                    const bgColor = Array.isArray(bgColors) ? bgColors[i] : bgColors;
                                    return {
                                      text: `${label}: ${dataValue}`,
                                      fillStyle: typeof bgColor === 'string' ? bgColor : 'rgba(156, 163, 175, 0.8)',
                                      hidden: false,
                                      index: i,
                                    };
                                  });
                                }
                                return [];
                              },
                            },
                          },
                          datalabels: {
                            display: false,
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const dataset = context.dataset;
                                const total = (dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%) - Click to view details`;
                              },
                            },
                          },
                        },
                      }}
                    />
                    {isMobileViewport && pieLegendItems.length > 0 && (
                      <div className="mt-4 grid w-full max-w-[360px] grid-cols-2 gap-x-4 gap-y-3">
                        {pieLegendItems.map((item) => (
                          <div key={item.label} className="flex items-center gap-2 text-xs text-gray-700">
                            <span
                              className="inline-flex h-2.5 w-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="font-medium text-[11px] truncate">{item.label}:</span>
                            <span className="font-bold flex-shrink-0">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </PermissionGate>

            <PermissionGate component="finding_actions_by_lead_chart">
              <Card>
                <CardHeader>
                  <div>
                    <h2 className={cn(
                      "font-semibold text-gray-900",
                      isMobileViewport ? "text-base" : "text-xl"
                    )}>Finding Actions by Lead and Status</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <p className={cn(
                        "text-gray-500",
                        isMobileViewport ? "text-xs" : "text-sm"
                      )}>
                        Action distribution by lead and status ({scorecardFilter === '2024+' ? '2024+' : 'All'})
                      </p>
                      <span className={cn(
                        "font-medium rounded-full",
                        isMobileViewport ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
                        scorecardFilter === '2024+' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      )}>
                        {scorecardFilter === '2024+' ? '📅 Filtered' : '📊 All Data'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <div className="p-6">
                  {isMobileViewport ? (
                    <div className="flex flex-col gap-3">
                      {(() => {
                        const leadsData = findingActionsByLeadData.labels?.map((leadName, index) => {
                          const statusBreakdown = findingActionsByLeadData.datasets.map(dataset => ({
                            label: dataset.label,
                            value: (dataset.data[index] as number) || 0,
                            color: dataset.backgroundColor as string
                          })).filter(status => status.value > 0);

                          const totalActions = statusBreakdown.reduce((sum, status) => sum + status.value, 0);

                          return { leadName: leadName as string, statusBreakdown, totalActions };
                        }) || [];

                        const sortedLeads = leadsData
                          .filter(item => item.totalActions > 0)
                          .sort((a, b) => b.totalActions - a.totalActions);

                        return sortedLeads.map(({ leadName, statusBreakdown, totalActions }) => (
                          <div key={leadName} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 transition-all active:scale-[0.99]">
                            {/* Header: Name & Total */}
                            <div className="flex justify-between items-end">
                              <div>
                                <h3 className="font-bold text-gray-900 text-[15px] leading-tight">{leadName}</h3>
                                <span className="text-[11px] text-gray-400 font-medium">Lead Auditor</span>
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-gray-900 tracking-tight">{totalActions}</span>
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Actions</span>
                              </div>
                            </div>

                            {/* Visual Progress Bar */}
                            <div className="h-2.5 w-full flex rounded-full overflow-hidden bg-gray-100">
                              {statusBreakdown.map((status, idx) => (
                                <div
                                  key={idx}
                                  style={{ width: `${(status.value / totalActions) * 100}%`, backgroundColor: status.color }}
                                  className="h-full first:rounded-l-full last:rounded-r-full"
                                />
                              ))}
                            </div>

                            {/* Legend / Breakdown */}
                            <div className="flex flex-wrap gap-x-4 gap-y-2">
                              {statusBreakdown.map(status => (
                                <div key={status.label} className="flex items-center gap-1.5">
                                  <span
                                    className="w-2 h-2 rounded-full ring-1 ring-white"
                                    style={{ backgroundColor: status.color }}
                                  />
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-[11px] font-bold text-gray-700">{status.value}</span>
                                    <span className="text-[10px] text-gray-500 font-medium truncate max-w-[60px]">{status.label}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <BarChart
                      data={findingActionsByLeadData}
                      height={400}
                      loading={loadingLeadStatus}
                      options={{
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        elements: {
                          bar: {
                            borderRadius: 4,
                          },
                        },
                        plugins: {
                          legend: {
                            display: true,
                            position: 'top',
                            align: 'end',
                            labels: {
                              padding: 15,
                              usePointStyle: true,
                              pointStyle: 'circle',
                              font: {
                                size: 12,
                                weight: 'bold',
                              },
                              color: '#374151',
                            },
                          },
                          tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            titleFont: {
                              size: 13,
                              weight: 'bold',
                            },
                            bodyFont: {
                              size: 12,
                            },
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            borderWidth: 1,
                            displayColors: true,
                            callbacks: {
                              label: (context) => {
                                const label = context.dataset.label || '';
                                const value = context.parsed.x || 0;
                                return `${label}: ${value} actions`;
                              },
                            },
                          },
                          datalabels: {
                            display: false,
                          },
                        },
                        scales: {
                          x: {
                            stacked: true,
                            beginAtZero: true,
                            grid: {
                              color: 'rgba(0, 0, 0, 0.05)',
                            },
                            ticks: {
                              font: {
                                size: 11,
                              },
                              color: '#6B7280',
                              padding: 8,
                            },
                            border: {
                              display: false,
                            },
                          },
                          y: {
                            stacked: true,
                            grid: {
                              display: false,
                            },
                            ticks: {
                              font: {
                                size: 11,
                                weight: 'bold',
                              },
                              color: '#374151',
                              crossAlign: 'far',
                            },
                            border: {
                              display: false,
                            },
                          },
                        },
                        interaction: {
                          mode: 'y',
                          intersect: false,
                        },
                        animation: {
                          duration: 750,
                          easing: 'easeInOutQuart',
                        },
                      }}
                    />
                  )}
                </div>
              </Card>
            </PermissionGate>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* NEW: Actions/Findings Breakdown by Audit & Risk Level */}
            <Card>
              <CardHeader className="relative">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 w-full">
                  <div>
                    <h2 className={cn(
                      "font-semibold text-gray-900",
                      isMobileViewport ? "text-base" : "text-xl"
                    )}>
                      {breakdownMode === 'actions' ? 'Action' : 'Finding'} Breakdown by Audit & Risk Level
                    </h2>
                    <p className={cn(
                      "text-gray-500 mt-1 flex items-center gap-2",
                      isMobileViewport ? "text-xs" : "text-sm"
                    )}>
                      Breakdown by audit and risk ({scorecardFilter === '2024+' ? '2024+' : 'All'})
                      <span className={cn(
                        "font-medium rounded-full",
                        isMobileViewport ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
                        scorecardFilter === '2024+' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      )}>
                        {scorecardFilter === '2024+' ? '📅 Filtered' : '📊 All Data'}
                      </span>
                    </p>
                  </div>
                  {/* Toggle Button - iPhone Style Segmented Control */}
                  <div className="bg-gray-100/80 p-0.5 rounded-lg flex items-center shadow-inner backdrop-blur-sm self-start md:self-auto">
                    <button
                      onClick={() => setBreakdownMode('actions')}
                      className={cn(
                        'px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all duration-200',
                        breakdownMode === 'actions'
                          ? 'bg-white text-purple-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      )}
                    >
                      Actions
                    </button>
                    <button
                      onClick={() => setBreakdownMode('findings')}
                      className={cn(
                        'px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all duration-200',
                        breakdownMode === 'findings'
                          ? 'bg-white text-purple-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      )}
                    >
                      Findings
                    </button>
                  </div>
                </div>
              </CardHeader>
              <div className="p-6">
                <ActionsByAuditRiskTable
                  data={breakdownMode === 'actions' ? (actionsByAuditRisk || []) : (findingsByAuditRisk || [])}
                  isLoading={breakdownMode === 'actions' ? loadingAuditRisk : loadingFindingsRisk}
                  onCellClick={handleAuditRiskCellClick}
                />
              </div>
            </Card>

            <PermissionGate component="audit_findings_chart">
              <BarChart
                title="Audit Findings by Year and Status"
                subtitle="Findings breakdown by year and status"
                data={findingByYearData}
                height={400}
                loading={loadingFindingStatus}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top',
                      align: 'end',
                      labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                          size: 12,
                          weight: 'bold',
                        },
                        color: '#374151',
                      },
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12,
                      titleFont: {
                        size: 13,
                        weight: 'bold',
                      },
                      bodyFont: {
                        size: 12,
                      },
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderWidth: 1,
                      displayColors: true,
                      callbacks: {
                        label: (context) => {
                          const label = context.dataset.label || '';
                          const value = context.parsed.y || 0;
                          return `${label}: ${value} findings`;
                        },
                      },
                    },
                    datalabels: {
                      display: false,
                    },
                  },
                  scales: {
                    x: {
                      stacked: true,
                      grid: {
                        display: false,
                      },
                      ticks: {
                        font: {
                          size: 11,
                          weight: 'bold',
                        },
                        color: '#374151',
                      },
                      border: {
                        display: false,
                      },
                    },
                    y: {
                      stacked: true,
                      beginAtZero: true,
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                      },
                      ticks: {
                        font: {
                          size: 11,
                        },
                        color: '#6B7280',
                        padding: 8,
                      },
                      border: {
                        display: false,
                      },
                    },
                  },
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  animation: {
                    duration: 750,
                    easing: 'easeInOutQuart',
                  },
                }}
              />
            </PermissionGate>
          </div>

          {/* Finding Actions Age Distribution & Audit Maturity (side by side) */}
          <PermissionGate component="department_actions_chart">
            {isMobileViewport ? (
              <>
                {/* Mobile: Stack charts vertically with Audit Maturity more prominent */}
                <PermissionGate component="finding_actions_aging_chart">
                  <ActionAgeChart
                    data={actionAgeChartData}
                    loading={loadingActionAge}
                    title="Finding Actions Age Distribution"
                    subtitle="All Open actions by days until/past due date"
                    height={400}
                    isMobile={isMobileViewport}
                  />
                </PermissionGate>

                {/* Mobile: Optimized Radar Chart for Audit Maturity */}
                <div className="mt-6 w-full">
                  <RadarChart
                    title="Audit Maturity"
                    subtitle="Maturity assessment across key dimensions"
                    data={radarData}
                    height={400}
                    loading={loadingRadar}
                    labelColors={
                      radarChartData?.labelsWithGroups
                        ? radarChartData.labelsWithGroups.map((item: { dimension: string; group: string; fullLabel: string }) => {
                          const groupColors: Record<string, string> = {
                            'Governance': '#1f2937',
                            'Use of Technology': '#8b5cf6',
                            'People': '#10b981',
                            'Communications': '#3b82f6',
                            'Scope of Work': '#f59e0b',
                          };
                          return groupColors[item.group] || '#374151';
                        })
                        : undefined
                    }
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      layout: {
                        padding: {
                          top: 0,
                          bottom: 0,
                          left: 0,
                          right: 0,
                        },
                      },
                      elements: {
                        line: {
                          borderWidth: 3,
                          tension: 0.1,
                        },
                        point: {
                          radius: 4,
                          hoverRadius: 6,
                          borderWidth: 2,
                        },
                      },
                      scales: {
                        r: {
                          beginAtZero: true,
                          min: 0,
                          max: 5,
                          angleLines: {
                            display: true,
                            color: 'rgba(107, 114, 128, 0.3)',
                            lineWidth: 1.5,
                          },
                          grid: {
                            color: 'rgba(107, 114, 128, 0.25)',
                            lineWidth: 1,
                          },
                          ticks: {
                            stepSize: 1,
                            font: {
                              size: 8,
                              weight: 500,
                            },
                            color: '#9ca3af',
                            backdropColor: 'transparent',
                            backdropPadding: 1,
                            z: 1,
                          },
                          pointLabels: {
                            display: true,
                            font: {
                              size: 8.5,
                              weight: 600,
                            },
                            color: (context: any) => {
                              const groupColors: Record<string, string> = {
                                'Governance': '#1f2937',
                                'Use of Technology': '#8b5cf6',
                                'People': '#10b981',
                                'Communications': '#3b82f6',
                                'Scope of Work': '#f59e0b',
                              };
                              if (radarChartData?.labelsWithGroups?.[context.index]) {
                                const group = radarChartData.labelsWithGroups[context.index].group;
                                return groupColors[group] || '#374151';
                              }
                              return '#374151';
                            },
                            padding: 1,
                            callback: (label: string | undefined, context: any) => {
                              if (!label) return '';
                              const abbreviations: Record<string, string> = {
                                'Functional Reporting & Positioning (Governance)': 'Functional Reporting',
                                'Resource': 'Resource',
                                'Use of Technology': 'Technology',
                                'Overall Opinions': 'Overall Opinions',
                                'Audit Methodology & Reporting (Communications)': 'Methodology',
                                'Planning (Scope of Work)': 'Planning',
                                'Assurance (Scope of Work)': 'Assurance',
                                'Risk Assessment (Scope of Work)': 'Risk Assessment',
                              };
                              let dimensionName = '';
                              if (abbreviations[label]) {
                                dimensionName = abbreviations[label];
                              } else {
                                dimensionName = label.split(' (')[0] || label;
                                if (dimensionName.length > 15) {
                                  dimensionName = dimensionName.substring(0, 12) + '...';
                                }
                              }

                              // Get group name
                              let groupName = '';
                              if (radarChartData?.labelsWithGroups?.[context.index]) {
                                groupName = radarChartData.labelsWithGroups[context.index].group;
                                // Shorten group names for mobile
                                const groupShortNames: Record<string, string> = {
                                  'Governance': 'Gov',
                                  'Use of Technology': 'Tech',
                                  'People': 'People',
                                  'Communications': 'Comm',
                                  'Scope of Work': 'Scope',
                                };
                                groupName = groupShortNames[groupName] || groupName;
                              }

                              return groupName ? `${dimensionName}\n${groupName}` : dimensionName;
                            },
                          },
                        },
                      },
                      plugins: {
                        legend: {
                          display: true,
                          position: 'top',
                          align: 'center',
                          labels: {
                            padding: 10,
                            usePointStyle: true,
                            font: {
                              size: 10,
                              weight: 600,
                            },
                            color: '#374151',
                            boxWidth: 12,
                            boxHeight: 12,
                          },
                        },
                        tooltip: {
                          backgroundColor: 'rgba(17, 24, 39, 0.95)',
                          titleColor: '#f9fafb',
                          bodyColor: '#f9fafb',
                          borderColor: '#4b5563',
                          borderWidth: 1,
                          cornerRadius: 6,
                          padding: 6,
                          titleFont: {
                            size: 10,
                            weight: 600,
                          },
                          bodyFont: {
                            size: 9,
                          },
                          displayColors: false,
                          callbacks: {
                            title: (context) => {
                              const fullLabel = context[0]?.label || '';
                              const dimensionName = String(fullLabel).split(' (')[0];
                              return dimensionName;
                            },
                            label: (context) => {
                              const year = context.dataset.label || '';
                              const value = context.parsed.r || 0;
                              return `${year}: ${value.toFixed(1)} / 5`;
                            },
                          },
                        },
                      },
                      animation: {
                        duration: 1500,
                        easing: 'easeInOutQuart',
                      },
                      interaction: {
                        intersect: false,
                        mode: 'index',
                      },
                    }}
                  />
                </div>
              </>
            ) : (
              /* Desktop: Keep side-by-side layout */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PermissionGate component="finding_actions_aging_chart">
                  <ActionAgeChart
                    data={actionAgeChartData}
                    loading={loadingActionAge}
                    title="Finding Actions Age Distribution"
                    subtitle="All Open actions by days until/past due date"
                    height={450}
                    isMobile={isMobileViewport}
                  />
                </PermissionGate>

                <RadarChart
                  title="Audit Maturity"
                  subtitle="Maturity assessment across key dimensions"
                  data={radarData}
                  height={450}
                  loading={loadingRadar}
                  labelColors={
                    radarChartData?.labelsWithGroups
                      ? radarChartData.labelsWithGroups.map((item: { dimension: string; group: string; fullLabel: string }) => {
                        const groupColors: Record<string, string> = {
                          'Governance': '#1f2937',
                          'Use of Technology': '#8b5cf6',
                          'People': '#10b981',
                          'Communications': '#3b82f6',
                          'Scope of Work': '#d97706',
                        };
                        return groupColors[item.group] || '#374151';
                      })
                      : undefined
                  }
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                      padding: {
                        top: -10,
                        bottom: 20,
                        left: -10,
                        right: -10,
                      },
                    },
                    elements: {
                      line: {
                        borderWidth: 4,
                        tension: 0.1,
                      },
                      point: {
                        radius: 5,
                        hoverRadius: 8,
                        borderWidth: 3,
                      },
                    },
                    scales: {
                      r: {
                        beginAtZero: true,
                        min: 0,
                        max: 5,
                        angleLines: {
                          display: true,
                          color: 'rgba(107, 114, 128, 0.45)',
                          lineWidth: 2,
                        },
                        grid: {
                          color: 'rgba(107, 114, 128, 0.15)',
                          lineWidth: 1,
                          drawOnChartArea: true,
                          drawTicks: false,
                          z: -1,
                        },
                        ticks: {
                          stepSize: 1,
                          display: true,
                          font: {
                            size: 12,
                            weight: 600,
                            family: "'SF Pro Display', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
                          },
                          color: '#1e293b',
                          backdropColor: 'transparent',
                          backdropPadding: 0,
                          showLabelBackdrop: false,
                          z: 10,
                        },
                        pointLabels: {
                          display: true,
                          font: {
                            size: 11,
                            weight: 700,
                          },
                          color: (context: any) => {
                            const groupColors: Record<string, string> = {
                              'Governance': '#1f2937',
                              'Use of Technology': '#8b5cf6',
                              'People': '#10b981',
                              'Communications': '#3b82f6',
                              'Scope of Work': '#d97706',
                            };
                            if (radarChartData?.labelsWithGroups?.[context.index]) {
                              const group = radarChartData.labelsWithGroups[context.index].group;
                              return groupColors[group] || '#374151';
                            }
                            return '#374151';
                          },
                          padding: 12,
                          callback: (label: string | undefined, context: any) => {
                            if (!label) return '';

                            // Label is already in fullLabel format like "Functional Reporting & Positioning (Governance)"
                            // Extract dimension name and group
                            const parts = label.split(' (');
                            let dimensionName: string = (parts[0] ?? label) as string;
                            let groupName = '';

                            // Extract group from parentheses if present
                            if (parts.length > 1 && parts[1]) {
                              groupName = parts[1].replace(')', '').trim();
                            }

                            // If no group in label, try to get from labelsWithGroups
                            if (!groupName && radarChartData?.labelsWithGroups && context.index !== undefined) {
                              const groupInfo = radarChartData.labelsWithGroups[context.index];
                              if (groupInfo && groupInfo.group) {
                                groupName = groupInfo.group;
                              }
                            }

                            // Abbreviate long labels
                            const abbreviations: Record<string, string> = {
                              'Functional Reporting & Positioning': 'Functional Reporting',
                              'Resource': 'Resources',
                              'Use of Technology': 'Technology',
                              'Overall Opinions': 'Overall Opinions',
                              'Audit Methodology & Reporting': 'Methodology',
                              'Planning': 'Planning',
                              'Assurance': 'Assurance',
                              'Risk Assessment': 'Risk Assessment',
                            };

                            if (dimensionName) {
                              const abbrev = abbreviations[dimensionName];
                              if (abbrev) {
                                dimensionName = abbrev;
                              } else if (dimensionName.length > 18) {
                                dimensionName = dimensionName.substring(0, 15) + '...';
                              }
                            } else {
                              return '';
                            }

                            // Return 2-line label: dimension name on top, group name on bottom
                            if (groupName) {
                              // Return array for proper multi-line display
                              return [dimensionName, `(${groupName})`];
                            }

                            return dimensionName;
                          },
                        },
                      },
                    },
                    plugins: {
                      legend: {
                        display: true,
                        position: 'bottom' as const,
                        align: 'center' as const,
                        fullSize: false,
                        labels: {
                          padding: 40,
                          usePointStyle: true,
                          pointStyle: 'line',
                          boxWidth: 32,
                          boxHeight: 4,
                          font: {
                            size: 13,
                            weight: 700,
                          },
                          generateLabels: (chart: any) => {
                            const datasets = chart.data.datasets;
                            return datasets.map((dataset: any, i: number) => {
                              const label = dataset.label || '';
                              const borderColor = dataset.borderColor || '#000';

                              return {
                                text: label,
                                fillStyle: borderColor,
                                strokeStyle: borderColor,
                                fontColor: borderColor,  // Text color matches line color
                                lineWidth: 4,
                                hidden: false,
                                index: i,
                                datasetIndex: i,
                                pointStyle: 'line',
                              };
                            });
                          },
                        },
                      },
                      tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#f9fafb',
                        bodyColor: '#e5e7eb',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        cornerRadius: 6,
                        padding: 8,
                        titleFont: {
                          size: 11,
                          weight: 600,
                        },
                        bodyFont: {
                          size: 10,
                          weight: 500,
                        },
                        displayColors: true,
                        usePointStyle: false,
                        boxWidth: 8,
                        boxHeight: 8,
                        boxPadding: 4,
                        animation: {
                          duration: 150,
                        },
                        position: 'nearest' as const,
                        filter: (tooltipItem: any) => {
                          return tooltipItem.parsed.r !== null && tooltipItem.parsed.r !== undefined;
                        },
                        callbacks: {
                          title: (context: any) => {
                            if (!context || context.length === 0) return '';
                            const fullLabel = context[0]?.label || '';
                            // Remove group indicator from tooltip (it's already visible in the label)
                            let dimensionName = String(fullLabel).split(' [')[0] || fullLabel;
                            return dimensionName;
                          },
                          label: (context: any) => {
                            if (!context || context.parsed.r === null || context.parsed.r === undefined) return '';
                            const year = context.dataset.label || '';
                            const value = context.parsed.r || 0;
                            return `${year}: ${value.toFixed(1)}`;
                          },
                          labelColor: (context: any) => {
                            return {
                              borderColor: context.dataset.borderColor || '#000',
                              backgroundColor: context.dataset.borderColor || '#000',
                              borderWidth: 2,
                              borderRadius: 1,
                            };
                          },
                        },
                      },
                    },
                    animation: {
                      duration: 1500,
                      easing: 'easeInOutQuart',
                    },
                    interaction: {
                      intersect: true,
                      mode: 'point',
                    },
                  }}
                />
              </div>
            )}
          </PermissionGate>

          {/* Control Analysis Charts Section */}
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-px bg-gradient-to-r from-purple-500 to-indigo-600 flex-1"></div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 whitespace-nowrap">
                  <span>📊</span>
                  Control Analysis Charts
                </h2>
                <div className="h-px bg-gradient-to-r from-indigo-600 to-purple-500 flex-1"></div>
              </div>
            </div>

            {/* Finding Distribution by Risk Type */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PermissionGate component="finding_distribution_risk_chart">
                <Card variant="elevated">
                  <CardHeader
                    title="Finding Distribution by Risk Type and Risk Level"
                  >
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-gray-500">
                      Showing {scorecardFilter === '2024+' ? 'As of 2024' : 'All Results'}
                    </p>
                    <span className={cn(
                      "px-2 py-0.5 text-xs font-medium rounded-full",
                      scorecardFilter === '2024+' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    )}>
                      {scorecardFilter === '2024+' ? '📅 Filtered' : '📊 All Data'}
                    </span>
                  </div>
                </CardHeader>
                <div className="mt-4 overflow-x-auto">
                  {loadingRiskType ? (
                    <div className="h-64 flex items-center justify-center">
                      <Loading size="lg" />
                    </div>
                  ) : riskTypeData && Array.isArray(riskTypeData) ? (
                    <>
                      {isMobileViewport ? (
                        // Mobile: Card Layout - Two Column Grid (same as Fraud/Loss Prevention)
                        <div className="grid grid-cols-2 gap-1.5 px-1">
                          {riskTypeData.map((row: any, idx: number) => {
                            const type = row.type?.trim() || '-';
                            const isTotal = type.toLowerCase().includes('total');

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "rounded-lg border shadow-sm overflow-hidden",
                                  isTotal ? "border-blue-700 col-span-2" : "border-gray-200"
                                )}
                              >
                                <div className={cn(
                                  "px-1.5 py-1",
                                  isTotal
                                    ? "bg-gradient-to-r from-blue-800 to-blue-700"
                                    : "bg-gradient-to-r from-blue-900 to-blue-800"
                                )}>
                                  <h4 className="text-white font-semibold text-xs">
                                    {type}
                                  </h4>
                                </div>
                                <div className={cn(
                                  "p-1.5 space-y-0.5",
                                  isTotal ? "bg-blue-50" : "bg-white"
                                )}>
                                  <div className="flex justify-between items-center py-0.5 text-[10px]">
                                    <span className={cn(
                                      "font-medium",
                                      isTotal ? "text-blue-700" : "text-gray-600"
                                    )}>
                                      Critical:
                                    </span>
                                    <span className={cn(
                                      "font-semibold",
                                      isTotal ? "text-blue-900 text-[11px]" : "text-gray-900 text-[11px]"
                                    )}>
                                      {row.Critical || 0}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-0.5 text-[10px]">
                                    <span className={cn(
                                      "font-medium",
                                      isTotal ? "text-blue-700" : "text-gray-600"
                                    )}>
                                      High:
                                    </span>
                                    <span className={cn(
                                      "font-semibold",
                                      isTotal ? "text-blue-900 text-[11px]" : "text-gray-900 text-[11px]"
                                    )}>
                                      {row.High || 0}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-0.5 text-[10px]">
                                    <span className={cn(
                                      "font-medium",
                                      isTotal ? "text-blue-700" : "text-gray-600"
                                    )}>
                                      Medium:
                                    </span>
                                    <span className={cn(
                                      "font-semibold",
                                      isTotal ? "text-blue-900 text-[11px]" : "text-gray-900 text-[11px]"
                                    )}>
                                      {row.Medium || 0}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-0.5 text-[10px]">
                                    <span className={cn(
                                      "font-medium",
                                      isTotal ? "text-blue-700" : "text-gray-600"
                                    )}>
                                      Low:
                                    </span>
                                    <span className={cn(
                                      "font-semibold",
                                      isTotal ? "text-blue-900 text-[11px]" : "text-gray-900 text-[11px]"
                                    )}>
                                      {row.Low || 0}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-0.5 text-[10px]">
                                    <span className={cn(
                                      "font-medium",
                                      isTotal ? "text-blue-700" : "text-gray-600"
                                    )}>
                                      Total:
                                    </span>
                                    <span className={cn(
                                      "font-semibold",
                                      isTotal ? "text-blue-900 text-[11px]" : "text-gray-900 text-[11px]"
                                    )}>
                                      {row.Total || 0}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        // Desktop: Table Layout
                        <table className={cn("w-full", isMobileViewport ? "text-xs" : "text-sm")}>
                          <thead>
                            <tr className="border-b-2 border-purple-600">
                              <th className={cn("text-left bg-blue-900 text-white font-semibold", isMobileViewport ? "p-1.5 text-[10px]" : "p-3")}>RISK TYPE</th>
                              <th className={cn("text-center bg-gray-900 text-white font-semibold", isMobileViewport ? "p-1.5 text-[10px]" : "p-3")}>CRITICAL</th>
                              <th className={cn("text-center bg-red-600 text-white font-semibold", isMobileViewport ? "p-1.5 text-[10px]" : "p-3")}>HIGH</th>
                              <th className={cn("text-center bg-orange-500 text-white font-semibold", isMobileViewport ? "p-1.5 text-[10px]" : "p-3")}>MEDIUM</th>
                              <th className={cn("text-center bg-green-600 text-white font-semibold", isMobileViewport ? "p-1.5 text-[10px]" : "p-3")}>LOW</th>
                              <th className={cn("text-center bg-blue-600 text-white font-semibold", isMobileViewport ? "p-1.5 text-[10px]" : "p-3")}>T:</th>
                            </tr>
                          </thead>
                          <tbody>
                            {riskTypeData.map((row: any, idx: number) => {
                              const isTotal = row.type?.includes('Total');
                              return (
                                <tr key={idx} className={`border-b ${isTotal ? 'bg-gray-100 font-bold' : 'hover:bg-gray-50'}`}>
                                  <td className={cn("text-left", isMobileViewport ? "p-1.5" : "p-3")}>{row.type}</td>
                                  <td className={cn("text-center", isMobileViewport ? "p-1.5" : "p-3")}>{row.Critical || 0}</td>
                                  <td className={cn("text-center", isMobileViewport ? "p-1.5" : "p-3")}>{row.High || 0}</td>
                                  <td className={cn("text-center", isMobileViewport ? "p-1.5" : "p-3")}>{row.Medium || 0}</td>
                                  <td className={cn("text-center", isMobileViewport ? "p-1.5" : "p-3")}>{row.Low || 0}</td>
                                  <td className={cn("text-center font-semibold", isMobileViewport ? "p-1.5" : "p-3")}>{row.Total || 0}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )
                      }</>
                  ) : (
                    <div className="text-center py-12 text-gray-500">No data available</div>
                  )}
                </div>
                  </Card>
                </PermissionGate>
              </div>

            {/* Google Sheets Tables - Fraud & Loss Prevention */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PermissionGate component="finding_distribution_risk_chart">
              <Card variant="elevated">
                <CardHeader
                  title="Fraud Internal Control"
                  subtitle="Data from Google Sheets"
                />
                <div className="mt-4 overflow-x-auto">
                  {loadingFraud2 ? (
                    <div className="h-64 flex items-center justify-center">
                      <Loading size="lg" />
                    </div>
                  ) : fraudInternalControl?.result && Array.isArray(fraudInternalControl.result) && fraudInternalControl.result.length > 0 ? (
                    <>
                      {isMobileViewport ? (
                        <div className="grid grid-cols-2 gap-2 px-1">
                          {fraudInternalControl.result.slice(1).map((row: string[], rowIdx: number) => {
                            const type = row[0]?.trim() || '-';
                            const isTotal = type.toLowerCase().includes('total');
                            const headers = fraudInternalControl.result[0] || [];

                            return (
                              <div
                                key={rowIdx}
                                className={cn(
                                  "rounded-lg border shadow-sm overflow-hidden",
                                  isTotal ? "border-blue-700 col-span-2" : "border-gray-200"
                                )}
                              >
                                <div className={cn(
                                  "px-2 py-1.5",
                                  isTotal
                                    ? "bg-gradient-to-r from-blue-800 to-blue-700"
                                    : "bg-gradient-to-r from-blue-900 to-blue-800"
                                )}>
                                  <h4 className="text-white font-semibold text-xs">
                                    {type === 'Total' ? 'Total (EUR)' : type}
                                  </h4>
                                </div>
                                <div className={cn(
                                  "p-2 space-y-1",
                                  isTotal ? "bg-blue-50" : "bg-white"
                                )}>
                                  {row.slice(1).map((cell: string, cellIdx: number) => {
                                    const year = headers[cellIdx + 1];
                                    const displayValue = formatSheetCurrency(cell);

                                    return (
                                      <div
                                        key={cellIdx}
                                        className="flex justify-between items-center py-0.5 text-[10px]"
                                      >
                                        <span className={cn(
                                          "font-medium",
                                          isTotal ? "text-blue-700" : "text-gray-600"
                                        )}>
                                          {year}:
                                        </span>
                                        <span className={cn(
                                          "font-semibold",
                                          isTotal ? "text-blue-900 text-[11px]" : "text-gray-900 text-[11px]"
                                        )}>
                                          {displayValue}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <table className={cn("w-full", isMobileViewport ? "text-xs" : "text-sm")}>
                          <thead>
                            <tr className="border-b-2 border-purple-600">
                              {fraudInternalControl.result[0]?.map((header: string, idx: number) => (
                                <th key={idx} className={cn("bg-blue-900 text-white font-semibold", isMobileViewport ? "p-1.5 text-[10px]" : "p-3", idx === 0 ? "text-left" : "text-center")}>
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {fraudInternalControl.result.slice(1).map((row: string[], rowIdx: number) => (
                              <tr key={rowIdx} className="border-b hover:bg-gray-50">
                                {row.map((cell: string, cellIdx: number) => {
                                  let displayValue: string;
                                  if (cellIdx === 0) {
                                    const label = cell?.trim() || '-';
                                    displayValue = label === 'Total' ? 'Total (EUR)' : label;
                                  } else {
                                    displayValue = formatSheetCurrency(cell);
                                  }
                                  return (
                                    <td key={cellIdx} className={cn(isMobileViewport ? "p-1.5" : "p-3", cellIdx === 0 ? 'text-left' : 'text-center')}>
                                      {displayValue}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-500">No data available</div>
                  )}
                </div>
              </Card>
            </PermissionGate>

            <PermissionGate component="finding_distribution_control_chart">
              <Card variant="elevated">
                <CardHeader
                  title="Loss Prevention Internal Control"
                  subtitle="Data from Google Sheets"
                />
                <div className="mt-4 overflow-x-auto">
                  {loadingLossPrevention ? (
                    <div className="h-64 flex items-center justify-center">
                      <Loading size="lg" />
                    </div>
                  ) : lossPreventionSummary?.result && Array.isArray(lossPreventionSummary.result) && lossPreventionSummary.result.length > 0 ? (
                    <>
                      {isMobileViewport ? (
                        <div className="grid grid-cols-2 gap-2 px-1">
                          {lossPreventionSummary.result.slice(1).map((row: string[], rowIdx: number) => {
                            const type = row[0]?.trim() || '-';
                            const isTotal = type.toLowerCase().includes('total');
                            const headers = lossPreventionSummary.result[0] || [];

                            return (
                              <div
                                key={rowIdx}
                                className={cn(
                                  "rounded-lg border shadow-sm overflow-hidden",
                                  isTotal ? "border-blue-700 col-span-2" : "border-gray-200"
                                )}
                              >
                                <div className={cn(
                                  "px-2 py-1.5",
                                  isTotal
                                    ? "bg-gradient-to-r from-blue-800 to-blue-700"
                                    : "bg-gradient-to-r from-blue-900 to-blue-800"
                                )}>
                                  <h4 className="text-white font-semibold text-xs">
                                    {type === 'Total' ? 'Total (EUR)' : type}
                                  </h4>
                                </div>
                                <div className={cn(
                                  "p-2 space-y-1",
                                  isTotal ? "bg-blue-50" : "bg-white"
                                )}>
                                  {row.slice(1).map((cell: string, cellIdx: number) => {
                                    const year = headers[cellIdx + 1];
                                    const displayValue = formatSheetCurrency(cell);

                                    return (
                                      <div
                                        key={cellIdx}
                                        className="flex justify-between items-center py-0.5 text-[10px]"
                                      >
                                        <span className={cn(
                                          "font-medium",
                                          isTotal ? "text-blue-700" : "text-gray-600"
                                        )}>
                                          {year}:
                                        </span>
                                        <span className={cn(
                                          "font-semibold",
                                          isTotal ? "text-blue-900 text-[11px]" : "text-gray-900 text-[11px]"
                                        )}>
                                          {displayValue}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <table className={cn("w-full", isMobileViewport ? "text-xs" : "text-sm")}>
                          <thead>
                            <tr className="border-b-2 border-purple-600">
                              {lossPreventionSummary.result[0]?.map((header: string, idx: number) => (
                                <th key={idx} className={cn("bg-blue-900 text-white font-semibold", isMobileViewport ? "p-1.5 text-[10px]" : "p-3", idx === 0 ? "text-left" : "text-center")}>
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {lossPreventionSummary.result.slice(1).map((row: string[], rowIdx: number) => (
                              <tr key={rowIdx} className="border-b hover:bg-gray-50">
                                {row.map((cell: string, cellIdx: number) => {
                                  let displayValue: string;
                                  if (cellIdx === 0) {
                                    const label = cell?.trim() || '-';
                                    displayValue = label === 'Total' ? 'Total (EUR)' : label;
                                  } else {
                                    displayValue = formatSheetCurrency(cell);
                                  }
                                  return (
                                    <td key={cellIdx} className={cn(isMobileViewport ? "p-1.5" : "p-3", cellIdx === 0 ? 'text-left' : 'text-center')}>
                                      {displayValue}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-500">No data available</div>
                  )}
                </div>
              </Card>
            </PermissionGate>
          </div>
          </div>

        </>
      )}

      {/* Audit Plan - Progress Tracker (moved to bottom, conditionally shown) */}
      {showAuditPlan && (
        <div id="audit-plan-section" className="mt-6">
          <Card variant="elevated" className="bg-gradient-to-br from-violet-50 via-purple-50 to-white shadow-lg hover:shadow-xl transition-all duration-300">
            {/* Desktop: Production CardHeader (no year filter in header - year filter is in AuditProgressChart) */}
            <div className="hidden md:block">
              <CardHeader
                title="Audit Plan - Progress Tracker"
                subtitle="Current audit progress across all stages"
                action={
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleAuditPlanHide}
                      className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-all duration-200 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Hide
                    </button>
                    <a
                      href="/annual-audit-plan"
                      className="group text-sm text-purple-600 hover:text-purple-700 font-semibold transition-all duration-200 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-purple-100"
                    >
                      View All
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                }
              />
            </div>
            {/* Mobile: Custom Header with responsive text sizes - compact */}
            <div className="md:hidden flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Audit Plan - Progress Tracker</h3>
              </div>
              <div className="ml-4 flex items-center gap-1.5">
                <button
                  onClick={handleAuditPlanHide}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-all duration-200 flex items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Hide
                </button>
                <a
                  href="/annual-audit-plan"
                  className="group text-[10px] text-purple-600 hover:text-purple-700 font-medium transition-all duration-200 flex items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-purple-100"
                >
                  View All
                  <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="mt-6 p-4 bg-white rounded-xl shadow-sm">
              <AuditProgressChart
                selectedYear={auditPlanYear}
                onYearChange={handleAuditPlanYearChange}
                availableYears={availableAuditPlanYears}
                isYearDropdownOpen={isAuditPlanYearDropdownOpen}
                onYearDropdownToggle={setIsAuditPlanYearDropdownOpen}
                yearDropdownRef={auditPlanYearDropdownRef}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Sticky Audit Plan Hide Button - Mobile Only (Compact, top-right corner) */}
      {isAuditPlanHideSticky && showAuditPlan && isMobileViewport && (
        <div className="fixed top-16 right-2 z-40">
          <button
            onClick={handleAuditPlanHide}
            className="flex items-center gap-1 px-2 py-1.5 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg hover:bg-white transition-all duration-200 active:scale-95"
          >
            <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-xs font-medium text-gray-700">Hide</span>
          </button>
        </div>
      )}

      {/* Action Details Modal */}
      <ActionDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        status={selectedStatus}
        auditYear={scorecardFilter}
      />

      {/* Combined Actions Modal with Toggle */}
      <ActionsListModal
        isOpen={isActionsModalOpen}
        onClose={() => setIsActionsModalOpen(false)}
        title={actionsModalType === 'overdue' ? 'Overdue Actions' : 'Upcoming Actions'}
        subtitle={
          actionsModalType === 'overdue'
            ? `${overdueActions?.length || 0} actions past due date`
            : `${upcomingActions?.length || 0} actions due within 30 days`
        }
        actions={actionsModalType === 'overdue' ? overdueActions : upcomingActions}
        loading={actionsModalType === 'overdue' ? loadingOverdue : loadingUpcoming}
        headerBgColor={actionsModalType === 'overdue' ? 'bg-red-50' : 'bg-blue-50'}
        showDaysUntilDue={actionsModalType === 'upcoming'}
        actionType={actionsModalType}
        onActionTypeChange={setActionsModalType}
        overdueCount={overdueActions?.length || 0}
        upcomingCount={upcomingActions?.length || 0}
      />

      {/* Audit Risk Actions/Findings Modal */}
      <ActionsListModal
        isOpen={isAuditRiskModalOpen}
        onClose={() => setIsAuditRiskModalOpen(false)}
        title={auditRiskModalData?.riskLevel
          ? `${auditRiskModalData.riskLevel} Risk ${breakdownMode === 'actions' ? 'Actions' : 'Findings'} - ${auditRiskModalData.auditName}`
          : `All ${breakdownMode === 'actions' ? 'Actions' : 'Findings'} - ${auditRiskModalData?.auditName || ''}`}
        subtitle={`${auditRiskActions.length} ${breakdownMode === 'actions' ? 'actions' : 'findings'} in ${auditRiskModalData?.auditYear || ''}`}
        actions={auditRiskActions}
        loading={loadingAuditRiskActions}
        headerBgColor="bg-purple-50"
        showDaysUntilDue={false}
        mode={breakdownMode}
      />
    </div>
  );
};

export default DashboardPage;


