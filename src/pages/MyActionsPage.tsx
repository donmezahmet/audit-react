import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardHeader, Button, Badge, Loading, Pagination } from '@/components/ui';
import { useTeamFindingActions, useResizableColumns, useExport } from '@/hooks';
import { useAuthStore } from '@/store/auth.store';
import { formatDate, formatFinancialImpact } from '@/utils/format';
import { cn } from '@/utils/cn';
import ResizableTableHeader from '@/components/ResizableTableHeader';
import ViewAsDropdown from '@/components/ViewAsDropdown';

const MyActionsPage: React.FC = () => {
  const [scorecardFilter, setScorecardFilter] = useState<'2024+' | 'all'>('2024+');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>('all');
  const [selectedManagerEmail, setSelectedManagerEmail] = useState<string | null>(null);
  const [managerInfo, setManagerInfo] = useState<{ manager1: { email: string; name: string }; manager2: { email: string; name: string } } | null>(null);
  const { user, role, isImpersonating, originalUser, startImpersonation } = useAuthStore();
  const { isExporting, exportFindingActions } = useExport();
  const tableRef = useRef<HTMLTableElement>(null);
  
  // Column ordering state
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const stored = localStorage.getItem('my-actions-column-order');
    return stored ? JSON.parse(stored) : ['key', 'summary', 'description', 'status', 'audit', 'dueDate', 'riskLevel', 'responsible', 'actions'];
  });
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  // Reset filters
  const handleResetFilters = () => {
    setStatusFilter('all');
    setAuditFilter('all');
    setRiskLevelFilter('all');
    setSortField(null);
    setSortDirection('asc');
  };
  
  // Handle View As functionality (only for admin)
  const handleViewAs = async (email: string) => {
    try {
      await startImpersonation(email);
      // Reload page to update data with impersonated user
      window.location.reload();
    } catch (error) {
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
    localStorage.setItem('my-actions-column-order', JSON.stringify(newOrder));
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
    'my-actions-columns'
  );

  // Column definitions
  const columnDefinitions: Record<string, { label: string; render: (action: any) => React.ReactNode; sortable?: boolean; sortKey?: string }> = {
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
        <Badge variant={getStatusBadge(action.status)} size="sm" className="justify-center whitespace-nowrap">
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

  // Determine userEmail for filtering
  const userEmailForFilter = useMemo(() => {
    if (isImpersonating) {
      // When impersonating, use the impersonated user's email
      return user?.email;
    } else if (role === 'admin') {
      // Admin sees all when not impersonating
      return undefined;
    } else {
      // Regular users see their own actions
      return user?.email;
    }
  }, [isImpersonating, role, user?.email]);

  const { data: actionsData, isLoading } = useTeamFindingActions({
    auditYear: scorecardFilter === 'all' ? undefined : scorecardFilter,
    // Don't use managerEmail when impersonating - use userEmail instead
    managerEmail: (isImpersonating ? undefined : selectedManagerEmail) || undefined,
    // Use computed userEmail for filtering
    userEmail: userEmailForFilter
  });
  
  // Parse response - can be array or object with data and managerInfo
  const actions = useMemo(() => {
    if (!actionsData) return [];
    const parsed = Array.isArray(actionsData) ? actionsData : (actionsData.data || []);
    return parsed;
  }, [actionsData]);

  // Extract manager info from response
  useEffect(() => {
    if (actionsData && !Array.isArray(actionsData) && actionsData.managerInfo) {
      setManagerInfo(actionsData.managerInfo);
      // If impersonating, clear selectedManagerEmail to use userEmail filter instead
      if (isImpersonating) {
        setSelectedManagerEmail(null);
      } else if (!selectedManagerEmail && actionsData.managerInfo.manager1) {
        // Set default selected manager to manager1 if not already set (only when not impersonating)
        setSelectedManagerEmail(actionsData.managerInfo.manager1.email);
      }
    } else if (actionsData && Array.isArray(actionsData)) {
      // No manager info, clear it
      setManagerInfo(null);
    }
  }, [actionsData, selectedManagerEmail, isImpersonating]);

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
    
    // Normalize status for display
    const normalizeStatus = (status: string) => {
      if (status === 'COMPLETED') return 'Completed';
      if (status === 'RISK ACCEPTED') return 'Risk Accepted';
      return status;
    };
    
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
    
    // Apply sorting
    if (sortField) {
      processedActions.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        // Handle date sorting
        if (sortField === 'dueDate') {
          aVal = aVal ? new Date(aVal).getTime() : 0;
          bVal = bVal ? new Date(bVal).getTime() : 0;
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
  }, [actions, sortField, sortDirection, statusFilter, auditFilter, riskLevelFilter]);

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
    const normalizeStatus = (status: string) => {
      if (status === 'COMPLETED') return 'Completed';
      if (status === 'RISK ACCEPTED') return 'Risk Accepted';
      return status;
    };
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

  // Calculate stats - Her parent sadece 1 kez sayılmalı
  const stats = useMemo(() => {
    // Use actions (already filtered by userEmail) for stats calculation
    if (!actions || !Array.isArray(actions)) return { total: 0, open: 0, overdue: 0, completed: 0, moneyOpen: 0, moneyOverdue: 0 };
    
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
      completed: actions.filter((a: any) => a.status === 'COMPLETED' || a.status === 'Completed' || a.status === 'Closed' || a.status === 'In Progress').length,
      moneyOpen,
      moneyOverdue,
    };
  }, [actions]);

  const getStatusBadge = (status: string) => {
    const map: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'default'> = {
      'COMPLETED': 'success',
      'Completed': 'success',
      'Open': 'danger',
      'Overdue': 'warning',
      'RISK ACCEPTED': 'default',
    };
    return map[status] || 'default';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-gray-900">My Team Actions</h1>
          <p className="text-gray-600 mt-1">
            {role === 'team_manager' 
              ? 'Actions managed by your team' 
              : 'Actions from your manager\'s team'}
          </p>
        </div>
        <div className="flex items-center gap-[12.8px]">
          {/* View As Dropdown (Admin Only - can view as team, team_manager) */}
          {(role === 'admin' || (isImpersonating && originalUser?.role === 'admin')) && (
            <ViewAsDropdown 
              onSelectUser={handleViewAs}
              filterByRole={['team', 'team_manager']} // Show only team and team_manager users
            />
          )}
          
          {/* Year Filter Toggle */}
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1 shadow-sm">
          <button
            onClick={() => setScorecardFilter('2024+')}
            className={`flex items-center gap-[6.4px] px-[12.8px] py-[6.4px] text-xs font-medium rounded-md transition-all ${
              scorecardFilter === '2024+'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {/* Colorful Calendar Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" fill={scorecardFilter === '2024+' ? 'white' : '#E5E7EB'} />
              <rect x="3" y="4" width="18" height="6" rx="2" fill={scorecardFilter === '2024+' ? '#DC2626' : '#991B1B'} />
              <text x="12" y="8" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">JUL</text>
              <text x="12" y="16" textAnchor="middle" fill={scorecardFilter === '2024+' ? '#6B7280' : '#1F2937'} fontSize="8" fontWeight="bold">17</text>
            </svg>
            As of 2024
            </button>
            <button
            onClick={() => setScorecardFilter('all')}
            className={`flex items-center gap-[6.4px] px-[12.8px] py-[6.4px] text-xs font-medium rounded-md transition-all ${
              scorecardFilter === 'all'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {/* Colorful Bar Chart Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="14" width="3" height="6" fill="#10B981" rx="0.5" />
              <rect x="10" y="8" width="3" height="12" fill="#EF4444" rx="0.5" />
              <rect x="16" y="11" width="3" height="9" fill="#3B82F6" rx="0.5" />
              <line x1="3" y1="7" x2="21" y2="7" stroke={scorecardFilter === 'all' ? 'white' : '#9CA3AF'} strokeWidth="1.5" />
            </svg>
            All Results
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card variant="elevated" className="p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-gray-500">Total Actions</p>
            <Badge variant="default" size="sm" className="text-xs">{scorecardFilter === '2024+' ? '2024+' : 'All'}</Badge>
          </div>
          {isLoading ? (
            <Loading size="sm" />
          ) : (
            <p className="text-[16px] font-bold text-purple-600">{stats.total}</p>
          )}
        </Card>

        <Card variant="elevated" className="p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-gray-500">Open Actions</p>
            <Badge variant="default" size="sm" className="text-xs">{scorecardFilter === '2024+' ? '2024+' : 'All'}</Badge>
          </div>
          {isLoading ? (
            <Loading size="sm" />
          ) : (
            <>
              <p className="text-[16px] font-bold text-red-600">{stats.open}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {stats.total > 0 ? `${Math.round((stats.open / stats.total) * 100)}%` : '0%'} of total
              </p>
            </>
          )}
        </Card>

        <Card variant="elevated" className="p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-gray-500">Overdue Actions</p>
            <Badge variant="default" size="sm" className="text-xs">{scorecardFilter === '2024+' ? '2024+' : 'All'}</Badge>
          </div>
          {isLoading ? (
            <Loading size="sm" />
          ) : (
            <>
              <p className="text-[16px] font-bold text-yellow-600">{stats.overdue}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {stats.total > 0 ? `${Math.round((stats.overdue / stats.total) * 100)}%` : '0%'} of total
              </p>
            </>
          )}
        </Card>

        <Card variant="elevated" className="p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-gray-500">Completed Actions</p>
            <Badge variant="default" size="sm" className="text-xs">{scorecardFilter === '2024+' ? '2024+' : 'All'}</Badge>
          </div>
          {isLoading ? (
            <Loading size="sm" />
          ) : (
            <>
              <p className="text-[16px] font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}%` : '0%'} of total
              </p>
            </>
          )}
        </Card>
      </div>

      {/* Actions Table */}
      <Card variant="elevated">
        <CardHeader 
          title="Team Finding Actions" 
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
                  role: 'team',
                  actionKeys: filteredKeys.length > 0 ? filteredKeys.join(',') : undefined,
                  statusFilter: statusFilter !== 'all' ? statusFilter : undefined,
                  auditFilter: auditFilter !== 'all' ? auditFilter : undefined,
                  riskLevelFilter: riskLevelFilter !== 'all' ? riskLevelFilter : undefined,
                });
              }}
              isLoading={isExporting}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export to Excel
            </Button>
          }
        />
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loading size="xl" text="Loading team actions..." />
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
            <h3 className="mt-2 text-xs font-medium text-gray-900">No actions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No team actions available for the selected filters.
            </p>
          </div>
        ) : (
          <>
            {/* Manager Toggle (only for team role with managers_email2) - Above table container */}
            {role === 'team' && managerInfo && (
              <div className="mb-4 flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600">Manager:</span>
                <div className="relative inline-flex items-center bg-gray-200 rounded-full p-1 cursor-pointer" style={{ width: 'fit-content' }}>
                  {/* Sliding background */}
                  <div
                    className={`absolute top-1 bottom-1 rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${
                      selectedManagerEmail === managerInfo.manager1.email ? 'left-1' : 'right-1'
                    }`}
                    style={{
                      width: `calc(50% - 4px)`,
                    }}
                  />
                  {/* Buttons */}
                  <button
                    onClick={() => setSelectedManagerEmail(managerInfo.manager1.email)}
                    className={`relative z-10 px-5 py-2 text-sm font-medium rounded-full transition-colors duration-300 ${
                      selectedManagerEmail === managerInfo.manager1.email
                        ? 'text-purple-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {managerInfo.manager1.name}
                  </button>
                  <button
                    onClick={() => setSelectedManagerEmail(managerInfo.manager2.email)}
                    className={`relative z-10 px-5 py-2 text-sm font-medium rounded-full transition-colors duration-300 ${
                      selectedManagerEmail === managerInfo.manager2.email
                        ? 'text-purple-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {managerInfo.manager2.name}
                  </button>
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto mt-4">
            {/* Modern Filters */}
            <div className="mb-4 flex flex-wrap items-center gap-3 justify-between">
              <div className="flex flex-wrap items-center gap-3">
                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-gray-600">Status:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-gradient-to-br from-white to-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm hover:shadow-md hover:border-purple-400 appearance-none cursor-pointer"
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

                {/* Audit Filter */}
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-gray-600">Audit:</label>
                  <select
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-gradient-to-br from-white to-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm hover:shadow-md hover:border-purple-400 appearance-none cursor-pointer max-w-xs"
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

                {/* Risk Level Filter */}
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-gray-600">Risk Level:</label>
                  <select
                    value={riskLevelFilter}
                    onChange={(e) => setRiskLevelFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-gradient-to-br from-white to-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm hover:shadow-md hover:border-purple-400 appearance-none cursor-pointer"
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

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleResetFilters}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                  Reset
              </Button>
              </div>
            </div>
            <table ref={tableRef} className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {columnOrder.map((colKey) => {
                    const col = columnDefinitions[colKey];
                    if (!col) return null;
                    
                    return (
                  <ResizableTableHeader
                        key={colKey}
                        columnKey={colKey}
                        width={columnWidths[colKey]}
                    onResizeStart={handleMouseDown}
                        isResizing={resizing === colKey}
                        className={cn(
                          'text-left py-3 px-4 text-sm font-semibold text-gray-700',
                          col.sortable && 'cursor-pointer hover:bg-purple-50 transition-colors select-none',
                          colKey === 'actions' && 'text-center'
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
                          className={cn('py-4 px-4', colKey === 'actions' && 'text-center')}
                          style={{ width: columnWidths[colKey] }}
                        >
                          {col.render(action)}
                    </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
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

      {/* Finding Detail Modal */}
      {isModalOpen && selectedAction && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Finding Action Details</h2>
                  <p className="text-purple-100 text-sm mt-1">{selectedAction.key}</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-white hover:text-purple-200 transition-colors p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Action Information */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Audit Name</label>
                  <p className="text-gray-900 font-medium mt-1">{selectedAction.auditName || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                  <div className="mt-1">
                    <Badge variant={getStatusBadge(selectedAction.status)}>
                      {selectedAction.status === 'COMPLETED' ? 'Completed' : 
                       selectedAction.status === 'RISK ACCEPTED' ? 'Risk Accepted' : 
                       selectedAction.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Due Date</label>
                  <p className="text-gray-900 font-medium mt-1">
                    {selectedAction.dueDate ? formatDate(selectedAction.dueDate, 'PPP') : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Financial Impact</label>
                  <p className="text-gray-900 font-medium mt-1">
                    {formatFinancialImpact(selectedAction.monetaryImpact)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Action Responsible</label>
                  <p className="text-gray-900 font-medium mt-1">{selectedAction.responsibleEmail || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Manager</label>
                  <p className="text-gray-900 font-medium mt-1">{selectedAction.managerEmail || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">C-Level</label>
                  <p className="text-gray-900 font-medium mt-1">{selectedAction.cLevel || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Risk Level</label>
                  <div className="mt-1">
                    <Badge variant={
                      selectedAction.riskLevel === 'Critical' ? 'danger' :
                      selectedAction.riskLevel === 'High' ? 'warning' :
                      selectedAction.riskLevel === 'Medium' ? 'info' :
                      'default'
                    }>
                      {selectedAction.riskLevel || 'Unassigned'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action Summary */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Action Summary</label>
                <p className="text-gray-900 mt-2 p-4 bg-gray-50 rounded-lg">{selectedAction.summary}</p>
              </div>

              {/* Action Description */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Action Description</label>
                <p className="text-gray-700 mt-2 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap">
                  {selectedAction.description || 'No description available'}
                </p>
              </div>

              {/* Parent Finding Description */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Finding Description</label>
                <p className="text-gray-700 mt-2 p-4 bg-purple-50 rounded-lg whitespace-pre-wrap border border-purple-200">
                  {selectedAction.parentDescription || 'No description available'}
                </p>
              </div>

              {/* Footer */}
              <div className="flex justify-end items-center pt-4 border-t">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
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

export default MyActionsPage;
