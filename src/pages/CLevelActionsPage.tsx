import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardHeader, Button, Badge, Loading } from '@/components/ui';
import { PieChart } from '@/components/charts';
import { useCLevelFindingActions, useResizableColumns, useExport } from '@/hooks';
import { useAuthStore } from '@/store/auth.store';
import { ChartData } from 'chart.js';
import { formatDate, formatFinancialImpact } from '@/utils/format';
import { cn } from '@/utils/cn';
import ResizableTableHeader from '@/components/ResizableTableHeader';
import ViewAsDropdown from '@/components/ViewAsDropdown';
import { STATUS_COLORS } from '@/utils/status.utils';

const CLevelActionsPage: React.FC = () => {
  const [scorecardFilter, setScorecardFilter] = useState<'2024+' | 'all'>('2024+');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredSegment, setHoveredSegment] = useState<{ responsible: string; status: string; percentage: string } | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const { role, isImpersonating, originalUser, startImpersonation } = useAuthStore();
  const { isExporting, exportFindingActions } = useExport();
  const tableRef = useRef<HTMLTableElement>(null);

  // Column ordering state
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const stored = localStorage.getItem('clevel-actions-column-order');
    return stored ? JSON.parse(stored) : ['key', 'summary', 'description', 'status', 'audit', 'dueDate', 'riskLevel', 'responsible', 'actions'];
  });
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Data fetching
  const { data: actions = [], isLoading } = useCLevelFindingActions({
    auditYear: scorecardFilter === 'all' ? undefined : scorecardFilter,
  });

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isModalOpen]);

  // Reset filters
  const handleResetFilters = () => {
    setStatusFilter('all');
    setAuditFilter('all');
    setRiskLevelFilter('all');
    setSearchQuery('');
    setSortField(null);
    setSortDirection('asc');
  };

  // Handle View As functionality (only top_management users)
  const handleViewAs = async (email: string) => {
    try {
      console.log('Starting impersonation for:', email);
      await startImpersonation(email);
      console.log('Impersonation successful, reloading page...');
      window.location.reload();
    } catch (error) {
      console.error('Impersonation failed:', error);
      // Impersonation failed - error handled by auth store
    }
  };

  // Drag & Drop handlers for column reordering
  const handleDragStart = (columnKey: string) => {
    setDraggedColumn(columnKey);
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    setDragOverColumn(columnKey);
  };

  const handleDrop = (targetColumnKey: string) => {
    if (!draggedColumn || draggedColumn === targetColumnKey) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    const newOrder = [...columnOrder];
    const draggedIndex = newOrder.indexOf(draggedColumn);
    const targetIndex = newOrder.indexOf(targetColumnKey);

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);

    setColumnOrder(newOrder);
    localStorage.setItem('clevel-actions-column-order', JSON.stringify(newOrder));
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Resizable columns
  const initialColumnWidths = {
    key: 120,
    summary: 250,
    description: 280,
    status: 120,
    audit: 200,
    dueDate: 120,
    riskLevel: 100,
    responsible: 180,
    actions: 120,
  };

  const { columnWidths, resizing, handleMouseDown } = useResizableColumns(
    tableRef,
    initialColumnWidths,
    'clevel-actions-columns'
  );

  // Calculate stats - Her parent sadece 1 kez sayılmalı
  const stats = useMemo(() => {
    if (!actions || !Array.isArray(actions)) return {
      total: 0, open: 0, overdue: 0, completed: 0,
      financialImpact: 0, completionRate: '0.0', overdueRate: '0.0',
      moneyOpen: 0, moneyOverdue: 0
    };

    // Open ve Overdue için unique parent'ları bul ve impact'leri topla
    const openActions = actions.filter((a: any) => a.status === 'Open');
    const overdueActions = actions.filter((a: any) => a.status === 'Overdue');

    // Her parent'ın impact'ini sadece 1 kez say - unique parent'lara göre
    const uniqueOpenParents = new Set(openActions.map((a: any) => a.parentKey).filter(Boolean));
    const uniqueOverdueParents = new Set(overdueActions.map((a: any) => a.parentKey).filter(Boolean));

    // Her unique parent için impact'i topla
    const moneyOpen = Array.from(uniqueOpenParents).reduce((sum, parentKey) => {
      const action = openActions.find((a: any) => a.parentKey === parentKey);
      return sum + (action?.monetaryImpact || 0);
    }, 0);

    const moneyOverdue = Array.from(uniqueOverdueParents).reduce((sum, parentKey) => {
      const action = overdueActions.find((a: any) => a.parentKey === parentKey);
      return sum + (action?.monetaryImpact || 0);
    }, 0);

    return {
      total: actions.length,
      open: openActions.length,
      overdue: overdueActions.length,
      completed: actions.filter((a: any) => a.status === 'COMPLETED' || a.status === 'Completed').length,
      financialImpact: moneyOpen + moneyOverdue,
      moneyOpen,
      moneyOverdue,
      completionRate: actions.length > 0
        ? ((actions.filter((a: any) => a.status === 'COMPLETED' || a.status === 'Completed').length / actions.length) * 100).toFixed(1)
        : '0.0',
      overdueRate: actions.length > 0
        ? ((actions.filter((a: any) => a.status === 'Overdue').length / actions.length) * 100).toFixed(1)
        : '0.0',
    };
  }, [actions]);

  // Status pie chart data - birebir Department Actions ile aynı
  const statusChartData: ChartData<'pie'> = useMemo(() => {
    if (!actions || !Array.isArray(actions)) return { labels: [], datasets: [] };

    const statusCounts: Record<string, number> = {};
    actions.forEach((action: any) => {
      statusCounts[action.status] = (statusCounts[action.status] || 0) + 1;
    });

    // Normalize status labels to proper case for display
    const statusMapping: Record<string, string> = {
      'COMPLETED': 'Completed',
      'Completed': 'Completed',
      'RISK ACCEPTED': 'Risk Accepted',
      'Risk Accepted': 'Risk Accepted',
      'Open': 'Open',
      'Overdue': 'Overdue',
      'In Progress': 'In Progress',
    };

    // Use STATUS_COLORS from status.utils.ts for consistency
    const colors: Record<string, string> = {
      'Open': STATUS_COLORS['Open'] || 'rgba(59, 130, 246, 0.8)',
      'Overdue': STATUS_COLORS['Overdue'] || 'rgba(239, 68, 68, 0.8)',
      'Completed': STATUS_COLORS['Completed'] || 'rgba(34, 197, 94, 0.8)',
      'Risk Accepted': STATUS_COLORS['Risk Accepted'] || 'rgba(147, 51, 234, 0.8)',
      'In Progress': STATUS_COLORS['In Progress'] || 'rgba(59, 130, 246, 0.8)',
    };

    // Normalize labels and aggregate counts
    const normalizedCounts: Record<string, number> = {};
    Object.entries(statusCounts).forEach(([status, count]) => {
      const normalizedStatus = statusMapping[status] || status;
      normalizedCounts[normalizedStatus] = (normalizedCounts[normalizedStatus] || 0) + count;
    });

    const labels = Object.keys(normalizedCounts);
    const data = labels.map(label => normalizedCounts[label] || 0);
    const backgroundColors = labels.map(label => colors[label] || 'rgba(156, 163, 175, 0.8)');

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: backgroundColors,
        borderColor: '#fff',
        borderWidth: 2,
      }],
    };
  }, [actions]);

  // Sorted and filtered actions
  const sortedActions = useMemo(() => {
    let filtered = [...actions];

    // Apply filters
    if (statusFilter !== 'all') {
      filtered = filtered.filter(action => action.status === statusFilter);
    }
    if (auditFilter !== 'all') {
      filtered = filtered.filter(action => action.auditName === auditFilter);
    }
    if (riskLevelFilter !== 'all') {
      filtered = filtered.filter(action => action.riskLevel === riskLevelFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.key.toLowerCase().includes(query) ||
        a.summary.toLowerCase().includes(query) ||
        (a.auditName && a.auditName.toLowerCase().includes(query)) ||
        (a.description && a.description.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [actions, sortField, sortDirection, statusFilter, auditFilter, riskLevelFilter, searchQuery]);

  // Get unique values for filters
  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(actions.map((a: any) => a.status))].filter(Boolean) as string[];
    return statuses.map((s: string) => {
      if (s === 'COMPLETED') return 'Completed';
      if (s === 'RISK ACCEPTED') return 'Risk Accepted';
      return s;
    }).sort();
  }, [actions]);

  const uniqueAudits = useMemo(() => {
    const audits = [...new Set(actions.map((a: any) => a.auditName))].filter(Boolean) as string[];
    return audits.sort();
  }, [actions]);

  const uniqueRiskLevels = useMemo(() => {
    const levels = [...new Set(actions.map((a: any) => a.riskLevel))].filter(Boolean) as string[];
    return levels.sort();
  }, [actions]);

  const paginatedActions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedActions.slice(startIndex, endIndex);
  }, [sortedActions, currentPage, itemsPerPage]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'COMPLETED' || status === 'Completed') return 'success';
    if (status === 'Overdue') return 'danger';
    if (status === 'Open') return 'warning';
    if (status === 'RISK ACCEPTED' || status === 'Risk Accepted') return 'info';
    return 'default';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-[12.8px] md:gap-0">
        <div>
          <h1 className="text-[13px] md:text-[22px] font-bold text-gray-900">C-Level Actions</h1>
          <p className="text-[9.6px] md:text-xs text-gray-600 mt-1">Executive-level audit finding actions overview</p>
        </div>
        <div className="flex flex-wrap items-center gap-[6.4px] md:gap-[12.8px] w-full md:w-auto justify-end md:justify-start">
          {/* View As Dropdown (Admin Only - Top Management only) */}
          {(role === 'admin' || (isImpersonating && originalUser?.role === 'admin')) && (
            <ViewAsDropdown
              onSelectUser={handleViewAs}
              filterByRole="top_management"
              className="text-xs md:text-sm"
            />
          )}

          {/* Year Filter Toggle */}
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 md:p-1 shadow-sm">
            <button
              onClick={() => setScorecardFilter('2024+')}
              className={`flex items-center gap-[3.2px] md:gap-[6.4px] px-[4.8px] py-[3.2px] md:px-[12.8px] md:py-[6.4px] text-[8px] md:text-xs font-medium rounded-md transition-all ${scorecardFilter === '2024+'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              <svg className="w-3 h-3 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" fill={scorecardFilter === '2024+' ? 'white' : '#E5E7EB'} />
                <rect x="3" y="4" width="18" height="6" rx="2" fill={scorecardFilter === '2024+' ? '#DC2626' : '#991B1B'} />
                <text x="12" y="8" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">JUL</text>
                <text x="12" y="16" textAnchor="middle" fill={scorecardFilter === '2024+' ? '#6B7280' : '#1F2937'} fontSize="8" fontWeight="bold">17</text>
              </svg>
              {!isMobile && <span>As of 2024</span>}
              {isMobile && <span>As of 2024</span>}
            </button>
            <button
              onClick={() => setScorecardFilter('all')}
              className={`flex items-center gap-[3.2px] md:gap-[6.4px] px-[4.8px] py-[3.2px] md:px-[12.8px] md:py-[6.4px] text-[8px] md:text-xs font-medium rounded-md transition-all ${scorecardFilter === 'all'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              <svg className="w-3 h-3 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="14" width="3" height="6" fill="#10B981" rx="0.5" />
                <rect x="10" y="8" width="3" height="12" fill="#EF4444" rx="0.5" />
                <rect x="16" y="11" width="3" height="9" fill="#3B82F6" rx="0.5" />
                <line x1="3" y1="7" x2="21" y2="7" stroke={scorecardFilter === 'all' ? 'white' : '#9CA3AF'} strokeWidth="1.5" />
              </svg>
              {!isMobile && <span>All Results</span>}
              {isMobile && <span>All</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards with Financial Impact */}
      <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-1.5 md:gap-2">
        <Card
          variant="elevated"
          className={cn(
            "relative border-t-4 hover:shadow-lg transition-all flex flex-col",
            scorecardFilter === '2024+' ? 'border-t-purple-600' : 'border-t-gray-400',
            isMobile ? "min-h-[72.2px]" : "min-h-[90.25px] md:min-h-[108.3px]"
          )}
        >
          <span className={cn(
            "absolute top-1 right-1 text-[7.22px] md:text-[9.025px] px-[3.61px] md:px-[5.415px] py-[1.805px] bg-purple-100 text-purple-700 rounded-full",
            isMobile && "top-0.5 right-0.5"
          )}>
            {scorecardFilter === '2024+' ? '2024+' : 'All'}
          </span>
          <div className={cn(
            "flex flex-col items-center justify-center flex-1",
            isMobile ? "py-[6.4px] px-[3.2px]" : "py-[9.6px] md:py-[12.8px] px-[6.4px]"
          )}>
            <svg className={cn(
              "text-purple-600 mb-0.5 md:mb-1.5",
              isMobile ? "w-3 h-3" : "w-4 md:h-4"
            )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className={cn(
              "font-bold text-purple-600 text-center leading-tight",
              isMobile ? "text-xs" : "text-[17px] md:text-[24px]"
            )}>{stats.total}</p>
            <p className={cn(
              "text-gray-600 text-center mt-0.5",
              isMobile ? "text-[9px]" : "text-[10px] md:text-xs"
            )}>Total</p>
          </div>
        </Card>
        <Card
          variant="elevated"
          className={cn(
            "relative border-t-4 hover:shadow-lg transition-all flex flex-col",
            scorecardFilter === '2024+' ? 'border-t-amber-600' : 'border-t-gray-400',
            isMobile ? "min-h-[72.2px]" : "min-h-[90.25px] md:min-h-[108.3px]"
          )}
        >
          <span className={cn(
            "absolute top-1 right-1 text-[7.22px] md:text-[9.025px] px-[3.61px] md:px-[5.415px] py-[1.805px] bg-amber-100 text-amber-700 rounded-full",
            isMobile && "top-0.5 right-0.5"
          )}>
            {scorecardFilter === '2024+' ? '2024+' : 'All'}
          </span>
          <div className={cn(
            "flex flex-col items-center justify-center flex-1",
            isMobile ? "py-[6.4px] px-[3.2px]" : "py-[9.6px] md:py-[12.8px] px-[6.4px]"
          )}>
            <svg className={cn(
              "text-amber-600 mb-0.5 md:mb-1.5",
              isMobile ? "w-3 h-3" : "w-4 md:h-4"
            )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className={cn(
              "font-bold text-amber-600 text-center leading-tight",
              isMobile ? "text-xs" : "text-[17px] md:text-[24px]"
            )}>{stats.open}</p>
            <p className={cn(
              "text-gray-600 text-center mt-0.5",
              isMobile ? "text-[9px]" : "text-[10px] md:text-xs"
            )}>Open</p>
          </div>
        </Card>
        <Card
          variant="elevated"
          className={cn(
            "relative border-t-4 hover:shadow-lg transition-all flex flex-col",
            scorecardFilter === '2024+' ? 'border-t-red-600' : 'border-t-gray-400',
            isMobile ? "min-h-[72.2px]" : "min-h-[90.25px] md:min-h-[108.3px]"
          )}
        >
          <span className={cn(
            "absolute top-1 right-1 text-[7.22px] md:text-[9.025px] px-[3.61px] md:px-[5.415px] py-[1.805px] bg-red-100 text-red-700 rounded-full",
            isMobile && "top-0.5 right-0.5"
          )}>
            {scorecardFilter === '2024+' ? '2024+' : 'All'}
          </span>
          <div className={cn(
            "flex flex-col items-center justify-center flex-1",
            isMobile ? "py-[6.4px] px-[3.2px]" : "py-[9.6px] md:py-[12.8px] px-[6.4px]"
          )}>
            <svg className={cn(
              "text-red-600 mb-0.5 md:mb-1.5",
              isMobile ? "w-3 h-3" : "w-4 md:h-4"
            )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className={cn(
              "font-bold text-red-600 text-center leading-tight",
              isMobile ? "text-xs" : "text-[17px] md:text-[24px]"
            )}>{stats.overdue}</p>
            <p className={cn(
              "text-gray-600 text-center mt-0.5",
              isMobile ? "text-[9px]" : "text-[10px] md:text-xs"
            )}>Overdue</p>
          </div>
        </Card>
        <Card
          variant="elevated"
          className={cn(
            "relative border-t-4 hover:shadow-lg transition-all flex flex-col",
            scorecardFilter === '2024+' ? 'border-t-green-600' : 'border-t-gray-400',
            isMobile ? "min-h-[72.2px]" : "min-h-[90.25px] md:min-h-[108.3px]"
          )}
        >
          <span className={cn(
            "absolute top-1 right-1 text-[7.22px] md:text-[9.025px] px-[3.61px] md:px-[5.415px] py-[1.805px] bg-green-100 text-green-700 rounded-full",
            isMobile && "top-0.5 right-0.5"
          )}>
            {scorecardFilter === '2024+' ? '2024+' : 'All'}
          </span>
          <div className={cn(
            "flex flex-col items-center justify-center flex-1",
            isMobile ? "py-[6.4px] px-[3.2px]" : "py-[9.6px] md:py-[12.8px] px-[6.4px]"
          )}>
            <svg className={cn(
              "text-green-600 mb-0.5 md:mb-1.5",
              isMobile ? "w-3 h-3" : "w-4 md:h-4"
            )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className={cn(
              "font-bold text-green-600 text-center leading-tight",
              isMobile ? "text-xs" : "text-[17px] md:text-[24px]"
            )}>{stats.completed}</p>
            <p className={cn(
              "text-gray-600 text-center mt-0.5",
              isMobile ? "text-[9px]" : "text-[10px] md:text-xs"
            )}>Done</p>
          </div>
        </Card>
        <Card
          variant="elevated"
          className={cn(
            "relative border-t-4 hover:shadow-lg transition-all flex flex-col",
            scorecardFilter === '2024+' ? 'border-t-blue-600' : 'border-t-gray-400',
            isMobile ? "min-h-[72.2px]" : "min-h-[90.25px] md:min-h-[108.3px]"
          )}
        >
          <span className={cn(
            "absolute top-1 right-1 text-[7.22px] md:text-[9.025px] px-[3.61px] md:px-[5.415px] py-[1.805px] bg-blue-100 text-blue-700 rounded-full",
            isMobile && "top-0.5 right-0.5"
          )}>
            {scorecardFilter === '2024+' ? '2024+' : 'All'}
          </span>
          <div className={cn(
            "flex flex-col items-center justify-center flex-1",
            isMobile ? "py-[6.4px] px-[3.2px]" : "py-[9.6px] md:py-[12.8px] px-[6.4px]"
          )}>
            <p className={cn(
              "font-bold text-blue-600 text-center leading-tight",
              isMobile ? "text-xs" : "text-[17px] md:text-[24px]"
            )}>{stats.completionRate}%</p>
            <p className={cn(
              "text-gray-600 text-center mt-0.5",
              isMobile ? "text-[9px]" : "text-[10px] md:text-xs"
            )}>Completion Rate</p>
          </div>
        </Card>
        <Card
          variant="elevated"
          className={cn(
            "relative border-t-4 hover:shadow-lg transition-all flex flex-col",
            scorecardFilter === '2024+' ? 'border-t-orange-600' : 'border-t-gray-400',
            isMobile ? "min-h-[72.2px]" : "min-h-[90.25px] md:min-h-[108.3px]"
          )}
        >
          <span className={cn(
            "absolute top-1 right-1 text-[7.22px] md:text-[9.025px] px-[3.61px] md:px-[5.415px] py-[1.805px] bg-orange-100 text-orange-700 rounded-full",
            isMobile && "top-0.5 right-0.5"
          )}>
            {scorecardFilter === '2024+' ? '2024+' : 'All'}
          </span>
          <div className={cn(
            "flex flex-col items-center justify-center flex-1",
            isMobile ? "py-[6.4px] px-[3.2px]" : "py-[9.6px] md:py-[12.8px] px-[6.4px]"
          )}>
            <p className={cn(
              "font-bold text-orange-600 text-center leading-tight",
              isMobile ? "text-xs" : "text-[17px] md:text-[24px]"
            )}>{stats.overdueRate}%</p>
            <p className={cn(
              "text-gray-600 text-center mt-0.5",
              isMobile ? "text-[9px]" : "text-[10px] md:text-xs"
            )}>Overdue Rate</p>
          </div>
        </Card>
        <Card
          variant="elevated"
          className={cn(
            "relative border-t-4 border-t-amber-600 hover:shadow-lg transition-all flex flex-col",
            isMobile ? "min-h-[72.2px]" : "min-h-[90.25px] md:min-h-[108.3px]"
          )}
        >
          <span className={cn(
            "absolute top-1 right-1 text-[7.22px] md:text-[9.025px] px-[3.61px] md:px-[5.415px] py-[1.805px] bg-amber-100 text-amber-700 rounded-full",
            isMobile && "top-0.5 right-0.5"
          )}>2024+</span>
          <div className={cn(
            "flex flex-col items-center justify-center flex-1",
            isMobile ? "py-[6.4px] px-[3.2px]" : "py-[9.6px] md:py-[12.8px] px-[6.4px]"
          )}>
            <p className={cn(
              "font-bold text-amber-600 text-center leading-tight whitespace-nowrap",
              isMobile ? "text-xs" : "text-lg md:text-xl"
            )}>{formatFinancialImpact(stats.moneyOpen)}</p>
            <p className={cn(
              "text-gray-600 text-center mt-0.5",
              isMobile ? "text-[9px]" : "text-[10px] md:text-xs"
            )}>Open</p>
          </div>
        </Card>
        <Card
          variant="elevated"
          className={cn(
            "relative border-t-4 border-t-rose-600 hover:shadow-lg transition-all flex flex-col",
            isMobile ? "min-h-[72.2px]" : "min-h-[90.25px] md:min-h-[108.3px]"
          )}
        >
          <span className={cn(
            "absolute top-1 right-1 text-[7.22px] md:text-[9.025px] px-[3.61px] md:px-[5.415px] py-[1.805px] bg-rose-100 text-rose-700 rounded-full",
            isMobile && "top-0.5 right-0.5"
          )}>2024+</span>
          <div className={cn(
            "flex flex-col items-center justify-center flex-1",
            isMobile ? "py-[6.4px] px-[3.2px]" : "py-[9.6px] md:py-[12.8px] px-[6.4px]"
          )}>
            <p className={cn(
              "font-bold text-rose-600 text-center leading-tight whitespace-nowrap",
              isMobile ? "text-xs" : "text-lg md:text-xl"
            )}>{formatFinancialImpact(stats.moneyOverdue)}</p>
            <p className={cn(
              "text-gray-600 text-center mt-0.5",
              isMobile ? "text-[9px]" : "text-[10px] md:text-xs"
            )}>Overdue</p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChart
          title="C-Level Actions Status Distribution"
          subtitle="Current status breakdown"
          data={statusChartData}
          height={isMobile ? 280 : 330}
          loading={isLoading}
          options={{
            plugins: {
              legend: {
                display: true,
                position: 'bottom',
                labels: {
                  padding: isMobile ? 8 : 14,
                  usePointStyle: true,
                  font: {
                    size: isMobile ? 9 : 11,
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
                          text: isMobile ? `${label}: ${dataValue}` : `${label}: ${dataValue}`,
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
                    return `${label}: ${value} (${percentage}%)`;
                  },
                },
              },
            },
          }}
        />

        <Card className={cn("", !isMobile && "flex flex-col")}>
          <CardHeader title="Actions by Responsible and Status" subtitle="Distribution by action responsible" className="flex-shrink-0" />
          <div className={cn("p-2.5 md:p-5 flex-1", !isMobile && "overflow-y-auto min-h-0")}>
            {isLoading ? (
              <Loading size="lg" />
            ) : (
              <div className={cn("space-y-1.5", isMobile && "space-y-1.5")}>
                {(() => {
                  // Group actions by responsible email and status
                  const grouped: Record<string, Record<string, number>> = {};
                  actions.forEach((action: any) => {
                    const responsible = action.responsibleEmail || 'Unassigned';
                    const status = action.status === 'COMPLETED' ? 'Completed' :
                      action.status === 'RISK ACCEPTED' ? 'Risk Accepted' :
                        action.status;
                    if (!grouped[responsible]) grouped[responsible] = {};
                    grouped[responsible][status] = (grouped[responsible][status] || 0) + 1;
                  });

                  // Sort by total count and take top 6 to fit in container
                  const sortedResponsibles = Object.entries(grouped)
                    .sort((a, b) => {
                      const totalA = Object.values(a[1]).reduce((sum, count) => sum + count, 0);
                      const totalB = Object.values(b[1]).reduce((sum, count) => sum + count, 0);
                      return totalB - totalA;
                    })
                    .slice(0, 6);

                  return sortedResponsibles.map(([responsible, statuses]) => {
                    const total = Object.values(statuses).reduce((sum, count) => sum + count, 0);
                    const completed = statuses['Completed'] || 0;
                    const open = statuses['Open'] || 0;
                    const overdue = statuses['Overdue'] || 0;
                    const riskAccepted = statuses['Risk Accepted'] || 0;

                    return (
                      <div key={responsible} className={cn("space-y-0.5 md:space-y-0.5 relative")}>
                        <div className={cn(
                          "flex items-center justify-between",
                          isMobile ? "text-[10px]" : "text-[11px]"
                        )}>
                          <span className={cn(
                            "text-gray-700 font-medium truncate",
                            isMobile ? "max-w-[140px]" : "max-w-[200px]"
                          )} title={responsible}>
                            {responsible}
                          </span>
                          <span className={cn(
                            "text-gray-500",
                            isMobile ? "text-[9px]" : ""
                          )}>{total} actions</span>
                        </div>
                        <div className={cn(
                          "flex rounded-full overflow-visible bg-gray-100 relative",
                          isMobile ? "h-3.5" : "h-[22px]"
                        )}>
                          {completed > 0 && (
                            <div
                              className={cn(
                                "bg-green-500 flex items-center justify-center text-white font-semibold cursor-pointer hover:opacity-90 transition-opacity relative group",
                                isMobile ? "text-[8px]" : "text-xs"
                              )}
                              style={{ width: `${(completed / total) * 100}%` }}
                              onMouseEnter={() => setHoveredSegment({
                                responsible,
                                status: 'Completed',
                                percentage: ((completed / total) * 100).toFixed(1)
                              })}
                              onMouseLeave={() => setHoveredSegment(null)}
                            >
                              {completed > 0 && (completed / total) * 100 > 8 && <span className={cn("px-0.5", isMobile && "text-[7px]")}>{completed}</span>}
                              {hoveredSegment?.responsible === responsible && hoveredSegment?.status === 'Completed' && (
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap z-50 shadow-lg">
                                  Completed: {completed} ({hoveredSegment.percentage}%)
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                </div>
                              )}
                            </div>
                          )}
                          {open > 0 && (
                            <div
                              className={cn(
                                "bg-blue-500 flex items-center justify-center text-white font-semibold cursor-pointer hover:opacity-90 transition-opacity relative group",
                                isMobile ? "text-[8px]" : "text-xs"
                              )}
                              style={{ width: `${(open / total) * 100}%` }}
                              onMouseEnter={() => setHoveredSegment({
                                responsible,
                                status: 'Open',
                                percentage: ((open / total) * 100).toFixed(1)
                              })}
                              onMouseLeave={() => setHoveredSegment(null)}
                            >
                              {open > 0 && (open / total) * 100 > 8 && <span className={cn("px-0.5", isMobile && "text-[7px]")}>{open}</span>}
                              {hoveredSegment?.responsible === responsible && hoveredSegment?.status === 'Open' && (
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap z-50 shadow-lg">
                                  Open: {open} ({hoveredSegment.percentage}%)
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                </div>
                              )}
                            </div>
                          )}
                          {overdue > 0 && (
                            <div
                              className={cn(
                                "bg-red-500 flex items-center justify-center text-white font-semibold cursor-pointer hover:opacity-90 transition-opacity relative group",
                                isMobile ? "text-[8px]" : "text-xs"
                              )}
                              style={{ width: `${(overdue / total) * 100}%` }}
                              onMouseEnter={() => setHoveredSegment({
                                responsible,
                                status: 'Overdue',
                                percentage: ((overdue / total) * 100).toFixed(1)
                              })}
                              onMouseLeave={() => setHoveredSegment(null)}
                            >
                              {overdue > 0 && (overdue / total) * 100 > 8 && <span className={cn("px-0.5", isMobile && "text-[7px]")}>{overdue}</span>}
                              {hoveredSegment?.responsible === responsible && hoveredSegment?.status === 'Overdue' && (
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap z-50 shadow-lg">
                                  Overdue: {overdue} ({hoveredSegment.percentage}%)
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                </div>
                              )}
                            </div>
                          )}
                          {riskAccepted > 0 && (
                            <div
                              className={cn(
                                "bg-purple-500 flex items-center justify-center text-white font-semibold cursor-pointer hover:opacity-90 transition-opacity relative group",
                                isMobile ? "text-[8px]" : "text-xs"
                              )}
                              style={{ width: `${(riskAccepted / total) * 100}%` }}
                              onMouseEnter={() => setHoveredSegment({
                                responsible,
                                status: 'Risk Accepted',
                                percentage: ((riskAccepted / total) * 100).toFixed(1)
                              })}
                              onMouseLeave={() => setHoveredSegment(null)}
                            >
                              {riskAccepted > 0 && (riskAccepted / total) * 100 > 8 && <span className={cn("px-0.5", isMobile && "text-[7px]")}>{riskAccepted}</span>}
                              {hoveredSegment?.responsible === responsible && hoveredSegment?.status === 'Risk Accepted' && (
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap z-50 shadow-lg">
                                  Risk Accepted: {riskAccepted} ({hoveredSegment.percentage}%)
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
                <div className={cn(
                  "flex flex-wrap gap-2 md:gap-3 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-200 justify-center",
                  isMobile && "gap-1.5"
                )}>
                  <div className={cn("flex items-center gap-1", isMobile && "gap-0.5")}>
                    <div className={cn("bg-green-500 rounded", isMobile ? "w-2 h-2" : "w-3 h-3")}></div>
                    <span className={cn("text-gray-600", isMobile ? "text-[9px]" : "text-xs")}>Completed</span>
                  </div>
                  <div className={cn("flex items-center gap-1", isMobile && "gap-0.5")}>
                    <div className={cn("bg-blue-500 rounded", isMobile ? "w-2 h-2" : "w-3 h-3")}></div>
                    <span className={cn("text-gray-600", isMobile ? "text-[9px]" : "text-xs")}>Open</span>
                  </div>
                  <div className={cn("flex items-center gap-1", isMobile && "gap-0.5")}>
                    <div className={cn("bg-red-500 rounded", isMobile ? "w-2 h-2" : "w-3 h-3")}></div>
                    <span className={cn("text-gray-600", isMobile ? "text-[9px]" : "text-xs")}>Overdue</span>
                  </div>
                  <div className={cn("flex items-center gap-1", isMobile && "gap-0.5")}>
                    <div className={cn("bg-purple-500 rounded", isMobile ? "w-2 h-2" : "w-3 h-3")}></div>
                    <span className={cn("text-gray-600", isMobile ? "text-[9px]" : "text-xs")}>Risk Accepted</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Actions Table - birebir Department Actions ile aynı tasarım */}
      <Card variant="elevated">
        <CardHeader
          title="C-Level Finding Actions"
          subtitle={`${sortedActions.length} actions found${sortedActions.length !== (actions?.length || 0) ? ` (filtered from ${actions?.length || 0} total)` : ''}`}
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => exportFindingActions({ auditYear: scorecardFilter, role: 'clevel' })}
              isLoading={isExporting}
              className="text-xs md:text-sm px-2 md:px-4"
            >
              <svg className="w-3 h-3 md:w-4 md:h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden md:inline">Export to Excel</span>
              <span className="md:hidden">Export</span>
            </Button>
          }
        />
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loading size="xl" text="Loading C-Level actions..." />
          </div>
        ) : !actions || !Array.isArray(actions) ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No actions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No C-Level actions available for the selected filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            {/* Search Bar and Active Filters */}
            <div className="mb-4 space-y-3">
              {/* Search Bar */}
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by key, summary, audit, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Active Filter Badges */}
              {(statusFilter !== 'all' || auditFilter !== 'all' || riskLevelFilter !== 'all' || searchQuery) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Active filters:</span>

                  {statusFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      Status: {statusFilter}
                      <button onClick={() => setStatusFilter('all')} className="hover:bg-blue-200 rounded-full p-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}

                  {auditFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Audit: {auditFilter.length > 20 ? auditFilter.substring(0, 20) + '...' : auditFilter}
                      <button onClick={() => setAuditFilter('all')} className="hover:bg-green-200 rounded-full p-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}

                  {riskLevelFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                      Risk: {riskLevelFilter}
                      <button onClick={() => setRiskLevelFilter('all')} className="hover:bg-amber-200 rounded-full p-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}

                  {searchQuery && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      Search: "{searchQuery.length > 15 ? searchQuery.substring(0, 15) + '...' : searchQuery}"
                      <button onClick={() => setSearchQuery('')} className="hover:bg-purple-200 rounded-full p-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}

                  <button
                    onClick={handleResetFilters}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className={cn(
              "mb-3 md:mb-4 flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-3 md:justify-between",
              isMobile && "px-2"
            )}>
              <div className={cn(
                "grid gap-2 md:flex md:flex-wrap md:items-center flex-1",
                isMobile ? "grid-cols-1" : ""
              )}>
                {/* Audit Filter - Full Width on Mobile */}
                <div className={cn(
                  "flex items-center",
                  isMobile ? "gap-1" : "gap-1.5"
                )}>
                  <label className={cn(
                    "font-medium text-gray-600 whitespace-nowrap",
                    isMobile ? "text-[10px]" : "text-xs"
                  )}>Audit:</label>
                  <select
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                    className={cn(
                      "flex-1 md:flex-none bg-gradient-to-br from-white to-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm hover:shadow-md hover:border-purple-400 appearance-none cursor-pointer md:max-w-xs",
                      isMobile ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs"
                    )}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.3rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: isMobile ? '0.9em 0.9em' : '1.2em 1.2em',
                      paddingRight: isMobile ? '1.5rem' : '2rem'
                    }}
                  >
                    <option value="all">All Audits</option>
                    {uniqueAudits.map(audit => (
                      <option key={audit} value={audit}>{audit}</option>
                    ))}
                  </select>
                </div>

                {/* Status and Risk Level - Side by Side on Mobile */}
                <div className={cn(
                  "grid gap-2 md:flex",
                  isMobile ? "grid-cols-2" : ""
                )}>
                  {/* Status Filter */}
                  <div className={cn(
                    "flex items-center",
                    isMobile ? "gap-1" : "gap-1.5"
                  )}>
                    <label className={cn(
                      "font-medium text-gray-600 whitespace-nowrap",
                      isMobile ? "text-[10px]" : "text-xs"
                    )}>Status:</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className={cn(
                        "flex-1 md:flex-none bg-gradient-to-br from-white to-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm hover:shadow-md hover:border-purple-400 appearance-none cursor-pointer",
                        isMobile ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs"
                      )}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.3rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: isMobile ? '0.9em 0.9em' : '1.2em 1.2em',
                        paddingRight: isMobile ? '1.5rem' : '2rem'
                      }}
                    >
                      <option value="all">All Statuses</option>
                      {uniqueStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  {/* Risk Level Filter */}
                  <div className={cn(
                    "flex items-center",
                    isMobile ? "gap-1" : "gap-1.5"
                  )}>
                    <label className={cn(
                      "font-medium text-gray-600 whitespace-nowrap",
                      isMobile ? "text-[10px]" : "text-xs"
                    )}>Risk:</label>
                    <select
                      value={riskLevelFilter}
                      onChange={(e) => setRiskLevelFilter(e.target.value)}
                      className={cn(
                        "flex-1 md:flex-none bg-gradient-to-br from-white to-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm hover:shadow-md hover:border-purple-400 appearance-none cursor-pointer",
                        isMobile ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs"
                      )}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.3rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: isMobile ? '0.9em 0.9em' : '1.2em 1.2em',
                        paddingRight: isMobile ? '1.5rem' : '2rem'
                      }}
                    >
                      <option value="all">All Levels</option>
                      {uniqueRiskLevels.map(risk => (
                        <option key={risk} value={risk}>{risk}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className={cn(
                "flex gap-2",
                isMobile && "justify-end"
              )}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className={cn(
                    "border-purple-300 text-purple-700 hover:bg-purple-50",
                    isMobile ? "px-2 py-1 text-[10px]" : "text-xs md:text-sm px-2 md:px-4"
                  )}
                >
                  <svg className={cn("md:mr-1", isMobile ? "w-3 h-3" : "w-3 h-3 md:w-4 md:h-4")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {!isMobile && <span>Reset</span>}
                </Button>
              </div>
            </div>

            {/* Desktop Table */}
            <table ref={tableRef} className="w-full hidden md:table table-fixed">
              <thead>
                <tr className="border-b border-gray-200">
                  {columnOrder.map(colKey => {
                    const col = {
                      key: { label: 'Key', sortable: true, sortKey: 'key' },
                      summary: { label: 'Summary', sortable: false },
                      description: { label: 'Description', sortable: false },
                      status: { label: 'Status', sortable: true, sortKey: 'status' },
                      audit: { label: 'Audit', sortable: true, sortKey: 'auditName' },
                      dueDate: { label: 'Due Date', sortable: true, sortKey: 'dueDate' },
                      riskLevel: { label: 'Risk Level', sortable: true, sortKey: 'riskLevel' },
                      responsible: { label: 'Responsible', sortable: false },
                      actions: { label: 'Action Detail', sortable: false },
                    }[colKey];

                    return (
                      <ResizableTableHeader
                        key={colKey}
                        columnKey={colKey}
                        width={columnWidths[colKey]}
                        onResizeStart={handleMouseDown}
                        isResizing={resizing === colKey}
                        className={cn(
                          'text-left py-3 px-4 text-sm font-semibold text-gray-700',
                          col?.sortable && 'cursor-pointer hover:bg-purple-50 transition-colors select-none',
                          colKey === 'actions' && 'text-center'
                        )}
                        onClick={col?.sortable && col?.sortKey ? () => handleSort(col.sortKey) : undefined}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedColumn === colKey}
                        isDragOver={dragOverColumn === colKey}
                      >
                        {col?.sortable && col?.sortKey ? (
                          <div className="flex items-center gap-2">
                            {col?.label}
                            <span className={sortField === col.sortKey ? 'text-purple-600' : 'text-gray-400'}>
                              {sortField === col.sortKey
                                ? (sortDirection === 'asc' ? '↑' : '↓')
                                : '⇅'
                              }
                            </span>
                          </div>
                        ) : (
                          col?.label
                        )}
                      </ResizableTableHeader>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedActions.map((action: any) => (
                  <tr key={action.key} className="hover:bg-gray-50 transition-colors">
                    {columnOrder.map(colKey => (
                      <td
                        key={colKey}
                        className="px-4 py-3 text-sm"
                        style={{ width: columnWidths[colKey] }}
                      >
                        {colKey === 'key' && <span className="text-purple-600 font-mono font-semibold">{action.key}</span>}
                        {colKey === 'summary' && <span className="text-gray-900 font-medium">{action.summary}</span>}
                        {colKey === 'description' && <span className="text-gray-600 text-sm">{action.description || '-'}</span>}
                        {colKey === 'status' && (
                          <Badge variant={getStatusBadge(action.status)}>
                            {action.status === 'COMPLETED' ? 'Completed' :
                              action.status === 'RISK ACCEPTED' ? 'Risk Accepted' :
                                action.status}
                          </Badge>
                        )}
                        {colKey === 'audit' && <span className="text-gray-600 text-sm">{action.auditName || '-'}</span>}
                        {colKey === 'dueDate' && <span className="text-gray-600 text-sm">{action.dueDate ? formatDate(action.dueDate, 'PP') : '-'}</span>}
                        {colKey === 'riskLevel' && (
                          <Badge variant={
                            action.riskLevel === 'Critical' ? 'danger' :
                              action.riskLevel === 'High' ? 'warning' :
                                action.riskLevel === 'Medium' ? 'info' :
                                  'default'
                          }>
                            {action.riskLevel || 'Unassigned'}
                          </Badge>
                        )}
                        {colKey === 'responsible' && <span className="text-gray-600 text-sm">{action.responsibleEmail || '-'}</span>}
                        {colKey === 'actions' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAction(action);
                              setIsModalOpen(true);
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Button>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Hybrid Accordion View */}
            <div className="block md:hidden space-y-2 mt-2">
              {paginatedActions.map((action) => {
                const isExpanded = expandedActionId === action.key;

                return (
                  <div
                    key={action.key}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200"
                  >
                    {/* Collapsed Content - Always Visible (Click to Expand) */}
                    <div
                      onClick={() => setExpandedActionId(isExpanded ? null : action.key)}
                      className="p-3 cursor-pointer active:bg-gray-50"
                    >
                      {/* Row 1: Key, Status, Chevron */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-mono">
                            {action.key}
                          </span>
                          <Badge variant={getStatusBadge(action.status)} size="sm" className="text-[10px] px-1.5 py-0.5 h-5">
                            {action.status === 'COMPLETED' ? 'Completed' :
                              action.status === 'RISK ACCEPTED' ? 'Risk Accepted' :
                                action.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Detail Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAction(action);
                              setIsModalOpen(true);
                            }}
                            className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {/* Chevron */}
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Row 2: Summary */}
                      <h4 className={`text-xs font-medium text-gray-900 leading-snug mb-2 ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {action.summary}
                      </h4>

                      {/* Row 3: Audit & Date (Visible in Collapsed) */}
                      <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-50 pt-2 mt-1">
                        <div className="flex items-center gap-1 max-w-[60%]">
                          <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="truncate">{action.auditName || '-'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{action.dueDate ? formatDate(action.dueDate) : '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 bg-gray-50/50 border-t border-gray-100">
                        {/* Description */}
                        {action.description && (
                          <div className="mt-2 mb-3">
                            <p className="text-xs text-gray-600 leading-relaxed">
                              {action.description}
                            </p>
                          </div>
                        )}

                        {/* Extra Meta: Risk & Responsible */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-semibold uppercase">Risk Level</span>
                            <div>
                              <Badge variant={
                                action.riskLevel === 'Critical' ? 'danger' :
                                  action.riskLevel === 'High' ? 'warning' :
                                    action.riskLevel === 'Medium' ? 'info' :
                                      'default'
                              } size="sm" className="text-[10px] px-1.5 py-0.5">
                                {action.riskLevel || 'Unassigned'}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-semibold uppercase">Responsible</span>
                            <span className="text-gray-700 truncate">{action.responsibleEmail || '-'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {sortedActions.length > 0 && (
          <div className={cn(
            "mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-200",
            isMobile && "px-2"
          )}>
            <div className={cn(
              "flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4",
              isMobile && "gap-2"
            )}>
              {/* Items per page selector */}
              <div className={cn(
                "flex items-center gap-1.5 md:gap-2",
                isMobile && "justify-center"
              )}>
                <span className={cn(
                  "text-gray-600",
                  isMobile ? "text-[10px]" : "text-sm"
                )}>Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value, 10));
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
                    isMobile ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-sm"
                  )}
                >
                  {[10, 25, 50, 100].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <span className={cn(
                  "text-gray-600",
                  isMobile ? "text-[10px]" : "text-sm"
                )}>per page</span>
              </div>

              {/* Page info */}
              <div className={cn(
                "flex-1 text-center",
                isMobile && "text-[10px]"
              )}>
                <span className={cn(
                  "font-medium text-gray-700",
                  isMobile ? "text-[10px]" : "text-sm"
                )}>
                  Showing {sortedActions.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedActions.length)} of {sortedActions.length} items
                </span>
              </div>

              {/* Navigation buttons */}
              <div className={cn(
                "flex items-center gap-1.5 md:gap-2",
                isMobile && "justify-center"
              )}>
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "sm"}
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={cn(
                    isMobile ? "px-2 py-1 text-[10px] min-w-[60px]" : "min-w-[80px]"
                  )}
                >
                  <svg className={cn("mr-1", isMobile ? "w-3 h-3" : "w-4 h-4")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {!isMobile && "Previous"}
                  {isMobile && "Prev"}
                </Button>

                <span className={cn(
                  "text-gray-600 px-1 md:px-2",
                  isMobile ? "text-[10px]" : "text-sm"
                )}>
                  Page {currentPage} of {Math.ceil(sortedActions.length / itemsPerPage)}
                </span>

                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "sm"}
                  onClick={() => setCurrentPage(Math.min(Math.ceil(sortedActions.length / itemsPerPage), currentPage + 1))}
                  disabled={currentPage >= Math.ceil(sortedActions.length / itemsPerPage)}
                  className={cn(
                    isMobile ? "px-2 py-1 text-[10px] min-w-[60px]" : "min-w-[80px]"
                  )}
                >
                  {!isMobile && "Next"}
                  {isMobile && "Next"}
                  <svg className={cn("ml-1", isMobile ? "w-3 h-3" : "w-4 h-4")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Finding Detail Modal */}
      {isModalOpen && selectedAction && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 md:p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl md:rounded-2xl rounded-t-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-4 py-3 md:px-6 md:py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <h2 className="text-lg md:text-2xl font-bold text-white">Finding Action Details</h2>
                  <p className="text-purple-100 text-xs md:text-sm mt-0.5 md:mt-1">{selectedAction.key}</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-white hover:text-purple-200 transition-colors p-2 flex-shrink-0"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-3 md:p-6 space-y-3 md:space-y-6">
              {/* Action Information */}
              <div className="grid grid-cols-2 gap-3 md:gap-6">
                {/* Audit Name - Full Width */}
                <div className="col-span-2">
                  <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase">Audit Name</label>
                  <p className="text-gray-900 font-medium mt-0.5 md:mt-1 text-sm md:text-base">{selectedAction.auditName || '-'}</p>
                </div>
                {/* Status and Risk Level - Side by Side */}
                <div>
                  <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase">Status</label>
                  <div className="mt-0.5 md:mt-1">
                    <Badge variant={getStatusBadge(selectedAction.status)} size="sm" className="text-[10px] md:text-xs">
                      {selectedAction.status === 'COMPLETED' ? 'Completed' :
                        selectedAction.status === 'RISK ACCEPTED' ? 'Risk Accepted' :
                          selectedAction.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase">Risk Level</label>
                  <div className="mt-0.5 md:mt-1">
                    <Badge size="sm" className="text-[10px] md:text-xs" variant={
                      selectedAction.riskLevel === 'Critical' ? 'danger' :
                        selectedAction.riskLevel === 'High' ? 'warning' :
                          selectedAction.riskLevel === 'Medium' ? 'info' :
                            'default'
                    }>
                      {selectedAction.riskLevel || 'Unassigned'}
                    </Badge>
                  </div>
                </div>
                {/* Due Date - Full Width */}
                <div className="col-span-2">
                  <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase">Due Date</label>
                  <p className="text-gray-900 font-medium mt-0.5 md:mt-1 text-sm md:text-base">
                    {selectedAction.dueDate ? formatDate(selectedAction.dueDate, 'PPP') : '-'}
                  </p>
                </div>
                {/* Financial Impact and Action Responsible */}
                <div>
                  <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase">Financial Impact</label>
                  <p className="text-gray-900 font-medium mt-0.5 md:mt-1 text-sm md:text-base">
                    {formatFinancialImpact(selectedAction.monetaryImpact || 0)}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase">Action Responsible</label>
                  <p className="text-gray-900 font-medium mt-0.5 md:mt-1 text-sm md:text-base truncate">{selectedAction.responsibleEmail || '-'}</p>
                </div>
                {/* C-Level - Full Width */}
                <div className="col-span-2">
                  <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase">C-Level</label>
                  <p className="text-gray-900 font-medium mt-0.5 md:mt-1 text-sm md:text-base truncate">{selectedAction.cLevel || '-'}</p>
                </div>
              </div>

              {/* Action Summary */}
              <div>
                <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase">Action Summary</label>
                <p className="text-gray-900 mt-1 md:mt-2 p-3 md:p-4 bg-gray-50 rounded-lg text-sm md:text-base">{selectedAction.summary}</p>
              </div>

              {/* Action Description */}
              <div>
                <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase">Action Description</label>
                <p className="text-gray-700 mt-1 md:mt-2 p-3 md:p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm md:text-base">
                  {selectedAction.description || 'No description available'}
                </p>
              </div>

              {/* Parent Finding Description */}
              <div>
                <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase">Finding Description</label>
                <p className="text-gray-700 mt-1 md:mt-2 p-3 md:p-4 bg-purple-50 rounded-lg whitespace-pre-wrap border border-purple-200 text-sm md:text-base">
                  {selectedAction.parentDescription || 'No description available'}
                </p>
              </div>

              {/* Footer */}
              <div className="hidden md:flex justify-end items-center pt-3 md:pt-4 border-t">
                <Button
                  onClick={() => setIsModalOpen(false)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CLevelActionsPage;
