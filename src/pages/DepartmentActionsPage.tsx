import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardHeader, Button, Badge, Loading, Pagination } from '@/components/ui';
import { PieChart } from '@/components/charts';
import { useDepartmentFindingActions, useResizableColumns, useExport } from '@/hooks';
import { useAuthStore } from '@/store/auth.store';
import { ChartData } from 'chart.js';
import { formatDate, formatFinancialImpact } from '@/utils/format';
import { cn } from '@/utils/cn';
import ResizableTableHeader from '@/components/ResizableTableHeader';
import ViewAsDropdown from '@/components/ViewAsDropdown';
import { DepartmentAction } from '@/types/department-actions.types';
import { normalizeStatus, STATUS_COLORS, getStatusBadgeVariant } from '@/utils/status.utils';
import { useDepartmentStats } from '@/hooks/useDepartmentStats';
import { DEPARTMENT_ACTIONS_CONFIG } from '@/config/department-actions.config';

const DepartmentActionsPage: React.FC = () => {
  const [scorecardFilter, setScorecardFilter] = useState<'2024+' | 'all'>('2024+');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedAction, setSelectedAction] = useState<DepartmentAction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  // const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set()); // Will be used for bulk actions
  // const [showFilters, setShowFilters] = useState(true); // Will be used for collapsible filters
  const { user, role, isImpersonating, originalUser, startImpersonation } = useAuthStore();
  const { isExporting, exportFindingActions } = useExport();
  const tableRef = useRef<HTMLTableElement>(null);

  // Column ordering state
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const stored = localStorage.getItem(DEPARTMENT_ACTIONS_CONFIG.localStorage.columnOrderKey);
    return stored ? JSON.parse(stored) : DEPARTMENT_ACTIONS_CONFIG.defaultColumnOrder;
  });
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Reset filters
  const handleResetFilters = () => {
    setStatusFilter('all');
    setAuditFilter('all');
    setRiskLevelFilter('all');
    setSearchQuery('');
    setSortField(null);
    setSortDirection('asc');
  };

  // Bulk selection handlers - will be used when implementing bulk actions UI
  /*
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedActions(new Set(filteredActions.map(a => a.key)));
    } else {
      setSelectedActions(new Set());
    }
  };

  const handleSelectAction = (key: string, checked: boolean) => {
    const newSelected = new Set(selectedActions);
    if (checked) {
      newSelected.add(key);
    } else {
      newSelected.delete(key);
    }
    setSelectedActions(newSelected);
  };
  */

  // Handle View As functionality (only department_director users)
  const handleViewAs = async (email: string) => {
    try {
      console.log('Starting impersonation for:', email);
      await startImpersonation(email);
      console.log('Impersonation successful, reloading page...');
      // Reload page to update session and fetch new user's data
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

    // Remove dragged column and insert at new position
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);

    setColumnOrder(newOrder);
    localStorage.setItem('department-actions-column-order', JSON.stringify(newOrder));
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Resizable columns - use config
  const { columnWidths, resizing, handleMouseDown } = useResizableColumns(
    tableRef,
    DEPARTMENT_ACTIONS_CONFIG.columnWidths,
    DEPARTMENT_ACTIONS_CONFIG.localStorage.columnWidthsKey
  );

  // Column definitions
  const columnDefinitions: Record<string, { label: string; render: (action: DepartmentAction) => React.ReactNode; sortable?: boolean; sortKey?: string }> = {
    key: {
      label: 'Key',
      render: (action) => <span className="text-purple-600 font-mono text-xs">{action.key}</span>
    },
    summary: {
      label: 'Summary',
      render: (action) => <span className="text-xs font-medium text-gray-900 line-clamp-2">{action.summary}</span>
    },
    description: {
      label: 'Description',
      render: (action) => <span className="text-gray-700 text-xs line-clamp-2">{action.description || '-'}</span>
    },
    status: {
      label: 'Status',
      sortable: true,
      sortKey: 'displayStatus',
      render: (action) => (
        <Badge variant={getStatusBadgeVariant(action.status)}>
          {action.displayStatus}
        </Badge>
      )
    },
    audit: {
      label: 'Audit',
      sortable: true,
      sortKey: 'auditName',
      render: (action) => <span className="text-gray-600 text-xs">{action.auditName || '-'}</span>
    },
    dueDate: {
      label: 'Due Date',
      sortable: true,
      sortKey: 'dueDate',
      render: (action) => <span className="text-gray-600 text-xs">{action.dueDate ? formatDate(action.dueDate, 'PP') : '-'}</span>
    },
    riskLevel: {
      label: 'Risk Level',
      sortable: true,
      sortKey: 'riskLevel',
      render: (action) => (
        <Badge variant={
          action.riskLevel === 'Critical' ? 'danger' :
            action.riskLevel === 'High' ? 'warning' :
              action.riskLevel === 'Medium' ? 'info' :
                'default'
        }>
          {action.riskLevel || 'Unassigned'}
        </Badge>
      )
    },
    responsible: {
      label: 'Responsible',
      render: (action) => <span className="text-gray-600 text-xs">{action.responsibleEmail || '-'}</span>
    },
    actions: {
      label: 'Action Detail',
      render: (action) => (
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
      )
    }
  };

  const { data: actions, isLoading } = useDepartmentFindingActions({
    auditYear: scorecardFilter === 'all' ? undefined : scorecardFilter,
    // Admin: Show all data when not impersonating, show filtered data when impersonating
    // department_director: Always show filtered data by action_responsible (their email)
    userEmail: (role === 'admin' && !isImpersonating) ? undefined : user?.email,
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

  // Sorting handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get all filtered actions (without pagination) for export
  const filteredActions = useMemo(() => {
    if (!actions || !Array.isArray(actions)) return [];

    // Add normalized status to actions
    let processedActions = actions.map(action => ({
      ...action,
      displayStatus: normalizeStatus(action.status)
    }));

    // Apply filters
    if (statusFilter !== 'all') {
      processedActions = processedActions.filter(a => a.displayStatus === statusFilter);
    }
    if (auditFilter !== 'all') {
      processedActions = processedActions.filter(a => a.auditName === auditFilter);
    }
    if (riskLevelFilter !== 'all') {
      processedActions = processedActions.filter(a => a.riskLevel === riskLevelFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      processedActions = processedActions.filter(a =>
        a.key.toLowerCase().includes(query) ||
        a.summary.toLowerCase().includes(query) ||
        (a.auditName && a.auditName.toLowerCase().includes(query)) ||
        (a.description && a.description.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    if (sortField) {
      processedActions.sort((a, b) => {
        let aVal = a[sortField as keyof DepartmentAction];
        let bVal = b[sortField as keyof DepartmentAction];

        // Handle date sorting
        if (sortField === 'dueDate') {
          aVal = aVal ? new Date(aVal as string).getTime() : 0;
          bVal = bVal ? new Date(bVal as string).getTime() : 0;
        }

        // Handle string sorting
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return processedActions;
  }, [actions, sortField, sortDirection, statusFilter, auditFilter, riskLevelFilter, searchQuery]);

  // Filtering, sorting and pagination logic
  const paginatedActions = useMemo(() => {
    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredActions.slice(startIndex, endIndex);
  }, [filteredActions, currentPage, itemsPerPage]);

  // Get unique values for filters
  const uniqueStatuses = useMemo(() => {
    if (!actions || !Array.isArray(actions)) return [];
    return [...new Set(actions.map(a => normalizeStatus(a.status)))];
  }, [actions]);

  const uniqueAudits = useMemo(() => {
    if (!actions || !Array.isArray(actions)) return [];
    return [...new Set(actions.map(a => a.auditName).filter(Boolean))];
  }, [actions]);

  const uniqueRiskLevels = useMemo(() => {
    if (!actions || !Array.isArray(actions)) return [];
    return [...new Set(actions.map(a => a.riskLevel).filter(Boolean))];
  }, [actions]);

  // Calculate stats using custom hook
  const stats = useDepartmentStats(actions);

  // Chart data for status distribution
  const statusChartData: ChartData<'pie'> = useMemo(() => {
    if (!actions || !Array.isArray(actions)) return { labels: [], datasets: [] };

    const statusCounts: Record<string, number> = {};
    actions.forEach((action) => {
      statusCounts[action.status] = (statusCounts[action.status] || 0) + 1;
    });

    // Normalize labels and aggregate counts - Map "Closed" and "In Progress" to "Completed"
    const normalizedCounts: Record<string, number> = {};
    Object.entries(statusCounts).forEach(([status, count]) => {
      let normalizedStatus = normalizeStatus(status);
      // Map "Closed" and "In Progress" to "Completed" to match exe-dash
      if (status === 'Closed' || status === 'In Progress') {
        normalizedStatus = 'Completed';
      }
      normalizedCounts[normalizedStatus] = (normalizedCounts[normalizedStatus] || 0) + count;
    });

    const labels = Object.keys(normalizedCounts);
    const data = Object.values(normalizedCounts);

    // Updated colors to match exe-dash design - birebir aynı (no gray colors)
    const backgroundColors = {
      'Open': 'rgba(59, 130, 246, 0.8)',        // Blue
      'Risk Accepted': 'rgba(147, 51, 234, 0.8)', // Purple
      'Completed': 'rgba(34, 197, 94, 0.8)',    // Green
      'Overdue': 'rgba(239, 68, 68, 0.8)',      // Red
    };

    const borderColors = {
      'Open': 'rgba(59, 130, 246, 1)',        // Blue
      'Risk Accepted': 'rgba(147, 51, 234, 1)', // Purple
      'Completed': 'rgba(34, 197, 94, 1)',    // Green
      'Overdue': 'rgba(239, 68, 68, 1)',      // Red
    };

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map(l => backgroundColors[l as keyof typeof backgroundColors] || 'rgba(34, 197, 94, 0.8)'), // Default to green (Completed) instead of gray
        borderColor: labels.map(l => borderColors[l as keyof typeof borderColors] || 'rgba(34, 197, 94, 1)'), // Default to green (Completed) instead of gray
        borderWidth: 2,
      }],
    };
  }, [actions]);



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-[12.8px] md:gap-0">
        <div>
          <h1 className="text-[13px] md:text-[22px] font-bold text-gray-900">Department Actions</h1>
          <p className="text-[9.6px] md:text-xs text-gray-600 mt-1">
            Actions for {(user && 'department' in user && user.department) ? `${user.department} Department` : 'your department'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-[6.4px] md:gap-[12.8px] w-full md:w-auto justify-end md:justify-start">
          {/* View As Dropdown (Admin Only - Department Directors only) */}
          {(role === 'admin' || (isImpersonating && originalUser?.role === 'admin')) && (
            <ViewAsDropdown
              onSelectUser={handleViewAs}
              filterByRole={['department_director']}
              className="text-xs md:text-sm"
            />
          )}

          {/* Year Filter Toggle - Only show if there are actions */}
          {!isLoading && stats.total > 0 && (
            <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 md:p-1 shadow-sm">
              <button
                onClick={() => setScorecardFilter('2024+')}
                className={`flex items-center gap-[3.2px] md:gap-[6.4px] px-[4.8px] py-[3.2px] md:px-[12.8px] md:py-[6.4px] text-[8px] md:text-xs font-medium rounded-md transition-all ${scorecardFilter === '2024+'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                {/* Colorful Calendar Icon */}
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
                {/* Colorful Bar Chart Icon */}
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
          )}
        </div>
      </div>

      {/* 6 Cards - Numbers Center Aligned */}
      <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-1.5 md:gap-2">
        <Card variant="elevated" className="relative border-t-4 border-t-purple-600 hover:shadow-lg transition-all">
          <span className="absolute top-0.5 right-0.5 md:top-1.5 md:right-1.5 text-[7px] md:text-[9px] px-0.5 md:px-1 py-0.5 bg-purple-100 text-purple-700 rounded-full">
            {scorecardFilter === '2024+' ? '2024+' : 'All'}
          </span>
          <div className="py-[1.71px] md:py-[5.13px] px-[3.42px] md:px-[6.84px]">
            <svg className="w-3 h-3 md:w-4 md:h-4 text-purple-600 mb-0.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-[15.3px] md:text-[20.7px] font-bold text-purple-600 text-center leading-tight">{stats.total}</p>
            <p className="text-[7.65px] md:text-[9.9px] text-gray-600 text-center">Total</p>
          </div>
        </Card>

        <Card variant="elevated" className="relative border-t-4 border-t-amber-600 hover:shadow-lg transition-all">
          <span className="absolute top-0.5 right-0.5 md:top-1.5 md:right-1.5 text-[7px] md:text-[9px] px-0.5 md:px-1 py-0.5 bg-amber-100 text-amber-700 rounded-full">
            {scorecardFilter === '2024+' ? '2024+' : 'All'}
          </span>
          <div className="py-[1.71px] md:py-[5.13px] px-[3.42px] md:px-[6.84px]">
            <svg className="w-3 h-3 md:w-4 md:h-4 text-amber-600 mb-0.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[15.3px] md:text-[20.7px] font-bold text-amber-600 text-center leading-tight">{stats.open}</p>
            <p className="text-[7.65px] md:text-[9.9px] text-gray-600 text-center">Open</p>
          </div>
        </Card>

        <Card variant="elevated" className="relative border-t-4 border-t-red-600 hover:shadow-lg transition-all">
          <span className="absolute top-0.5 right-0.5 md:top-1.5 md:right-1.5 text-[7px] md:text-[9px] px-0.5 md:px-1 py-0.5 bg-red-100 text-red-700 rounded-full">
            {scorecardFilter === '2024+' ? '2024+' : 'All'}
          </span>
          <div className="py-[1.71px] md:py-[5.13px] px-[3.42px] md:px-[6.84px]">
            <svg className="w-3 h-3 md:w-4 md:h-4 text-red-600 mb-0.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-[15.3px] md:text-[20.7px] font-bold text-red-600 text-center leading-tight">{stats.overdue}</p>
            <p className="text-[7.65px] md:text-[9.9px] text-gray-600 text-center">Overdue</p>
          </div>
        </Card>

        <Card variant="elevated" className="relative border-t-4 border-t-green-600 hover:shadow-lg transition-all">
          <span className="absolute top-0.5 right-0.5 md:top-1.5 md:right-1.5 text-[7px] md:text-[9px] px-0.5 md:px-1 py-0.5 bg-green-100 text-green-700 rounded-full">
            {scorecardFilter === '2024+' ? '2024+' : 'All'}
          </span>
          <div className="py-[1.71px] md:py-[5.13px] px-[3.42px] md:px-[6.84px]">
            <svg className="w-3 h-3 md:w-4 md:h-4 text-green-600 mb-0.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[15.3px] md:text-[20.7px] font-bold text-green-600 text-center leading-tight">{stats.completed}</p>
            <p className="text-[7.65px] md:text-[9.9px] text-gray-600 text-center">Done</p>
          </div>
        </Card>

        <Card variant="elevated" className="relative border-t-4 border-t-orange-600 hover:shadow-lg transition-all">
          <span className="absolute top-0.5 right-0.5 md:top-1.5 md:right-1.5 text-[7px] md:text-[9px] px-0.5 md:px-1 py-0.5 bg-orange-100 text-orange-700 rounded-full">2024+</span>
          <div className="py-[1.71px] md:py-[5.13px] px-[3.42px] md:px-[6.84px] flex flex-col justify-center items-center">
            <div className="h-[14px] md:h-[18px]"></div>
            <p className="text-[15.3px] md:text-[20.7px] font-bold text-orange-600 text-center leading-tight">{formatFinancialImpact(stats.moneyOpen)}</p>
            <p className="text-[7.65px] md:text-[9.9px] text-gray-600 text-center">Open €</p>
          </div>
        </Card>

        <Card variant="elevated" className="relative border-t-4 border-t-rose-600 hover:shadow-lg transition-all">
          <span className="absolute top-0.5 right-0.5 md:top-1.5 md:right-1.5 text-[7px] md:text-[9px] px-0.5 md:px-1 py-0.5 bg-rose-100 text-rose-700 rounded-full">2024+</span>
          <div className="py-[1.71px] md:py-[5.13px] px-[3.42px] md:px-[6.84px] flex flex-col justify-center items-center">
            <div className="h-[14px] md:h-[18px]"></div>
            <p className="text-[15.3px] md:text-[20.7px] font-bold text-rose-600 text-center leading-tight">{formatFinancialImpact(stats.moneyOverdue)}</p>
            <p className="text-[7.65px] md:text-[9.9px] text-gray-600 text-center">Overdue €</p>
          </div>
        </Card>
      </div>

      {/* Charts - Show loading or content based on state */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[12.16px]">
          <Card variant="elevated">
            <CardHeader title="Department Actions Status Distribution" />
            <div className="h-[270px] flex items-center justify-center">
              <Loading size="xl" text="Loading chart..." />
            </div>
          </Card>
          <Card variant="elevated">
            <CardHeader title="Key Metrics" subtitle="Department performance" />
            <div className="h-[270px] flex items-center justify-center">
              <Loading size="xl" text="Loading metrics..." />
            </div>
          </Card>
        </div>
      ) : stats.total > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[12.16px]">
            <PieChart
              title="Department Actions Status Distribution"
              data={statusChartData}
              height={270}
              loading={false}
              options={{
                cutout: '60%',
                plugins: {
                  legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                      padding: 10,
                      usePointStyle: true,
                      font: {
                        size: 9,
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
                        return `${label}: ${value} (${percentage}%)`;
                      },
                    },
                  },
                },
              }}
            />

            <Card variant="elevated">
              <CardHeader title="Key Metrics" subtitle="Department performance" />
              <div className="mt-2.5 space-y-[9px] p-2.5">
                <div className="flex justify-between items-center p-[9px] bg-gradient-to-r from-green-50 to-green-100/50 rounded-lg border-l-4 border-green-500">
                  <span className="text-gray-700 font-semibold text-xs md:text-sm">Completion Rate</span>
                  <span className="text-xl font-bold text-green-600">
                    {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-[9px] bg-gradient-to-r from-red-50 to-red-100/50 rounded-lg border-l-4 border-red-500">
                  <span className="text-gray-700 font-semibold text-xs md:text-sm">Overdue Rate</span>
                  <span className="text-xl font-bold text-red-600">
                    {stats.total > 0 ? Math.round((stats.overdue / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-[9px] bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-lg border-l-4 border-purple-500">
                  <span className="text-gray-700 font-semibold text-xs md:text-sm">Total Financial Impact</span>
                  <span className="text-xl font-bold text-purple-600">
                    {formatFinancialImpact(stats.moneyOpen + stats.moneyOverdue)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Actions Table */}
          <Card variant="elevated">
            <CardHeader
              title="Department Finding Actions"
              subtitle={`${filteredActions.length} actions found${filteredActions.length !== (actions?.length || 0) ? ` (filtered from ${actions?.length || 0} total)` : ''}`}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    // Export only the filtered action keys
                    const filteredKeys = filteredActions.map(a => a.key);
                    exportFindingActions({
                      auditYear: scorecardFilter,
                      role: 'department',
                      actionKeys: filteredKeys.length > 0 ? filteredKeys.join(',') : undefined,
                      statusFilter: statusFilter !== 'all' ? statusFilter : undefined,
                      auditFilter: auditFilter !== 'all' ? auditFilter : undefined,
                      riskLevelFilter: riskLevelFilter !== 'all' ? riskLevelFilter : undefined,
                    });
                  }}
                  isLoading={isExporting}
                  className="text-[9.6px] md:text-xs px-[6.4px] md:px-[12.8px]"
                >
                  <svg className="w-3 h-3 md:w-4 md:h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="hidden md:inline">Export to Excel</span>
                  <span className="md:hidden">Export</span>
                </Button>
              }
            />
        {!actions || !Array.isArray(actions) ? (
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
            <h3 className="mt-2 text-xs font-medium text-gray-900">No actions found</h3>
            <p className="mt-1 text-xs text-gray-500">
              No department actions available for the selected filters.
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
                  className="w-full pl-[32px] pr-[12.8px] py-[8px] text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
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
            <div className="mb-4 flex flex-col md:flex-row md:flex-wrap md:items-center gap-3 md:justify-between">
              <div className="grid grid-cols-1 md:flex md:flex-wrap md:items-center gap-3 flex-1">
                {/* Audit Filter - Full Width on Mobile */}
                <div className="flex items-center gap-1.5 col-span-1">
                  <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Audit:</label>
                  <select
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                    className="flex-1 md:flex-none px-3 py-1.5 text-xs bg-gradient-to-br from-white to-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm hover:shadow-md hover:border-purple-400 appearance-none cursor-pointer md:max-w-xs"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.4rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.2em 1.2em',
                      paddingRight: '2rem'
                    }}
                  >
                    <option value="all">All Audits</option>
                    {uniqueAudits.map(audit => (
                      <option key={audit} value={audit}>{audit}</option>
                    ))}
                  </select>
                </div>

                {/* Status and Risk Level - Side by Side on Mobile */}
                <div className="grid grid-cols-2 md:flex gap-3">
                  {/* Status Filter */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Status:</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="flex-1 md:flex-none px-3 py-1.5 text-xs bg-gradient-to-br from-white to-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm hover:shadow-md hover:border-purple-400 appearance-none cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.4rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.2em 1.2em',
                        paddingRight: '2rem'
                      }}
                    >
                      <option value="all">All Statuses</option>
                      {uniqueStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  {/* Risk Level Filter */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Risk Level:</label>
                    <select
                      value={riskLevelFilter}
                      onChange={(e) => setRiskLevelFilter(e.target.value)}
                      className="flex-1 md:flex-none px-3 py-1.5 text-xs bg-gradient-to-br from-white to-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm hover:shadow-md hover:border-purple-400 appearance-none cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.4rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.2em 1.2em',
                        paddingRight: '2rem'
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50 text-[9.6px] md:text-xs px-[6.4px] md:px-[12.8px]"
                >
                  <svg className="w-3 h-3 md:w-4 md:h-4 md:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden md:inline">Reset</span>
                </Button>
              </div>
            </div>
            <table ref={tableRef} className="w-full hidden md:table table-fixed">
              <thead>
                <tr className="border-b border-gray-200">
                  {columnOrder.map((colKey) => {
                    const col = columnDefinitions[colKey];
                    if (!col) return null;

                    return (
                      <ResizableTableHeader
                        key={colKey}
                        columnKey={colKey}
                        width={isMobile ? undefined : columnWidths[colKey]}
                        onResizeStart={handleMouseDown}
                        isResizing={resizing === colKey}
                        className={cn(
                          'text-left py-[9.6px] px-[6.4px] md:px-[12.8px] text-xs font-semibold text-gray-700',
                          col.sortable && 'cursor-pointer hover:bg-purple-50 transition-colors select-none',
                          colKey === 'actions' && 'text-center',
                          // Mobile widths
                          colKey === 'key' && 'w-[22%]',
                          colKey === 'status' && 'w-[28%]',
                          colKey === 'summary' && 'w-[50%]',
                          // Hide non-essential columns on mobile
                          ['description', 'audit', 'dueDate', 'riskLevel', 'monetaryImpact', 'responsible', 'cLevel', 'actions'].includes(colKey) && 'hidden md:table-cell'
                        )}
                        onClick={col.sortable && col.sortKey ? () => handleSort(col.sortKey!) : undefined}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedColumn === colKey}
                        isDragOver={dragOverColumn === colKey}
                      >
                        {col.sortable && col.sortKey ? (
                          <div className="flex items-center gap-2">
                            {col.label}
                            <span className={sortField === col.sortKey ? 'text-purple-600' : 'text-gray-400'}>
                              {sortField === col.sortKey
                                ? (sortDirection === 'asc' ? '↑' : '↓')
                                : '⇅'
                              }
                            </span>
                          </div>
                        ) : (
                          col.label
                        )}
                      </ResizableTableHeader>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {paginatedActions.map((action: any) => (
                  <tr key={action.key} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    {columnOrder.map((colKey) => {
                      const col = columnDefinitions[colKey];
                      if (!col) return null;

                      return (
                        <td
                          key={colKey}
                          className={cn(
                            'py-[12.8px] px-[6.4px] md:px-[12.8px] align-top',
                            colKey === 'actions' && 'text-center',
                            // Hide non-essential columns on mobile
                            ['description', 'audit', 'dueDate', 'riskLevel', 'monetaryImpact', 'responsible', 'cLevel', 'actions'].includes(colKey) && 'hidden md:table-cell'
                          )}
                          style={{ width: isMobile ? undefined : columnWidths[colKey] }}
                        >
                          {col.render(action)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Hybrid Accordion View */}
            <div className="block md:hidden space-y-2 mt-2">
              {paginatedActions.map((action) => {
                const statusVariant = getStatusBadgeVariant(action.status);
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
                          <Badge variant={statusVariant} size="sm" className="text-[10px] px-1.5 py-0.5 h-5">
                            {action.displayStatus}
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
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${action.riskLevel === 'Critical' ? 'bg-red-100 text-red-700' :
                                action.riskLevel === 'High' ? 'bg-orange-100 text-orange-700' :
                                  action.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                {action.riskLevel || 'Unassigned'}
                              </span>
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
        {filteredActions && filteredActions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredActions.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </div>
        )}
          </Card>
        </>
      ) : (
        /* Empty State - No Actions (only show when not loading and total is 0) */
        <Card variant="elevated" className="mt-6 overflow-hidden">
          <div className="relative">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100 opacity-50"></div>
            
            {/* Content */}
            <div className="relative text-center py-8 md:py-10 px-6">
              <div className="max-w-lg mx-auto">
                {/* Modern Icon with Animation */}
                <div className="mb-4 flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-purple-200 rounded-full blur-xl opacity-30 animate-pulse"></div>
                    <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
                      <svg
                        className="w-8 h-8 md:w-10 md:h-10 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Title with Gradient Text */}
                <h3 className="text-lg md:text-xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                  No Action Responsible Assignments
                </h3>

                {/* Description with Better Typography */}
                <div className="space-y-2 mb-4">
                  <p className="text-sm md:text-base text-gray-700 leading-relaxed font-medium">
                    You currently don't have any audit finding actions assigned to you as Action Responsible.
                  </p>
                  <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                    As ongoing audits are completed and findings are identified, any actions assigned to you will appear here. 
                    You'll be able to view their details, track progress, and manage them from this dashboard.
                  </p>
                </div>

                {/* Decorative Elements */}
                <div className="flex justify-center gap-2 mt-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 opacity-60"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 opacity-60"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 opacity-60"></div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Finding Detail Modal */}
      {isModalOpen && selectedAction && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl md:rounded-2xl rounded-t-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] md:max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-[12.8px] py-[9.6px] md:px-[19.2px] md:py-[12.8px] rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg md:text-2xl font-bold text-white">Finding Action Details</h2>
                  <p className="text-purple-100 text-[9.6px] md:text-xs mt-0.5 md:mt-1">{selectedAction.key}</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-white hover:text-purple-200 transition-colors p-2"
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
              <div className="grid grid-cols-2 gap-[9.6px] md:gap-[19.2px]">
                {/* Audit Name - Full Width */}
                <div className="col-span-2">
                  <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase">Audit Name</label>
                  <p className="text-gray-900 font-medium mt-0.5 md:mt-1 text-xs md:text-sm">{selectedAction.auditName || '-'}</p>
                </div>
                {/* Status and Risk Level - Side by Side */}
                <div>
                  <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase">Status</label>
                  <div className="mt-0.5 md:mt-1">
                    <Badge variant={getStatusBadgeVariant(selectedAction.status)} size="sm" className="text-[10px] md:text-xs">
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
                  <p className="text-gray-900 font-medium mt-0.5 md:mt-1 text-xs md:text-sm">
                    {selectedAction.dueDate ? formatDate(selectedAction.dueDate, 'PPP') : '-'}
                  </p>
                </div>
                {/* Financial Impact and Action Responsible */}
                <div>
                  <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase">Financial Impact</label>
                  <p className="text-gray-900 font-medium mt-0.5 md:mt-1 text-xs md:text-sm">
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
                <p className="text-gray-900 mt-1 md:mt-2 p-[9.6px] md:p-[12.8px] bg-gray-50 rounded-lg text-xs md:text-sm">{selectedAction.summary}</p>
              </div>

              {/* Action Description */}
              <div>
                <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase">Action Description</label>
                <p className="text-gray-700 mt-1 md:mt-2 p-[9.6px] md:p-[12.8px] bg-gray-50 rounded-lg whitespace-pre-wrap text-xs md:text-sm">
                  {selectedAction.description || 'No description available'}
                </p>
              </div>

              {/* Parent Finding Description */}
              <div>
                <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase">Finding Description</label>
                <p className="text-gray-700 mt-1 md:mt-2 p-[9.6px] md:p-[12.8px] bg-purple-50 rounded-lg whitespace-pre-wrap border border-purple-200 text-xs md:text-sm">
                  {selectedAction.parentDescription || 'No description available'}
                </p>
              </div>

              {/* Footer */}
              <div className="hidden md:flex justify-end items-center pt-3 md:pt-4 border-t">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

export default DepartmentActionsPage;
