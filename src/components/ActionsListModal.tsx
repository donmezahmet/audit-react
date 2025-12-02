import React, { useState, useEffect, useMemo } from 'react';
import { Button, Badge, Loading } from '@/components/ui';
import { formatDate, formatFinancialImpact } from '@/utils/format';
import { useResizableColumns } from '@/hooks';
import ResizableTableHeader from './ResizableTableHeader';
import FindingChildActionsModal from './FindingChildActionsModal';
import { cn } from '@/utils/cn';

interface Action {
  key: string;
  summary: string;
  description: string;
  findingDescription?: string;
  status: string;
  dueDate: string;
  daysUntilDue?: number;
  responsibleEmail: string;
  cLevel: string;
  auditName: string;
  auditLead: string;
  riskLevel: string;
  financialImpact: number;
  auditYear: string;
}

interface ActionsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  actions: Action[] | undefined;
  loading: boolean;
  headerBgColor?: string; // e.g., 'bg-red-50' or 'bg-blue-50'
  showDaysUntilDue?: boolean; // Show "Days Until Due" column for upcoming actions
  mode?: 'actions' | 'findings'; // Mode to customize columns
  actionType?: 'overdue' | 'upcoming'; // Type of actions being shown
  onActionTypeChange?: (type: 'overdue' | 'upcoming') => void; // Callback to change action type
  overdueCount?: number; // Count of overdue actions
  upcomingCount?: number; // Count of upcoming actions
}

const ActionsListModal: React.FC<ActionsListModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  actions,
  loading,
  headerBgColor = 'bg-gray-50',
  showDaysUntilDue = false,
  mode = 'actions',
  actionType,
  onActionTypeChange,
  overdueCount = 0,
  upcomingCount = 0,
}) => {
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    actionType === 'overdue' ? { key: 'daysOverdue', direction: 'desc' } : null
  );
  const [isFindingChildModalOpen, setIsFindingChildModalOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<Action | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => 
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  // Update mobile viewport state on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Column order based on mode, showDaysUntilDue, and actionType
  const initialColumnOrder = mode === 'findings'
    ? ['status', 'audit', 'auditYear', 'auditLead', 'riskLevel', 'description', 'actions'] // Findings: no dueDate, responsible, cLevel
    : showDaysUntilDue
      ? ['status', 'audit', 'auditYear', 'auditLead', 'dueDate', 'daysUntilDue', 'riskLevel', 'responsible', 'cLevel', 'description', 'actions']
      : actionType === 'overdue'
        ? ['status', 'audit', 'auditYear', 'auditLead', 'dueDate', 'daysOverdue', 'riskLevel', 'responsible', 'cLevel', 'description', 'actions']
        : ['status', 'audit', 'auditYear', 'auditLead', 'dueDate', 'riskLevel', 'responsible', 'cLevel', 'description', 'actions'];

  const [columnOrder, setColumnOrder] = useState(initialColumnOrder);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  // Update column order when mode, showDaysUntilDue, or actionType changes
  useEffect(() => {
    const newColumnOrder = mode === 'findings'
      ? ['status', 'audit', 'auditYear', 'auditLead', 'riskLevel', 'description', 'actions']
      : showDaysUntilDue
        ? ['status', 'audit', 'auditYear', 'auditLead', 'dueDate', 'daysUntilDue', 'riskLevel', 'responsible', 'cLevel', 'description', 'actions']
        : actionType === 'overdue'
          ? ['status', 'audit', 'auditYear', 'auditLead', 'dueDate', 'daysOverdue', 'riskLevel', 'responsible', 'cLevel', 'description', 'actions']
          : ['status', 'audit', 'auditYear', 'auditLead', 'dueDate', 'riskLevel', 'responsible', 'cLevel', 'description', 'actions'];
    setColumnOrder(newColumnOrder);
  }, [mode, showDaysUntilDue, actionType]);

  const { columnWidths, handleMouseDown } = useResizableColumns(
    {
      status: 120,
      audit: 200,
      auditYear: 100,
      auditLead: 180,
      dueDate: 130,
      daysUntilDue: 100,
      daysOverdue: 110,
      riskLevel: 120,
      responsible: 200,
      cLevel: 180,
      description: 300,
      actions: 120,
    },
    undefined,
    'actions-modal-column-widths'
  );

  // Sorting function
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sort actions
  const sortedActions = useMemo(() => {
    if (!actions || !sortConfig) return actions || [];

    const sorted = [...actions].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Special case for daysOverdue - calculate it on the fly
      if (sortConfig.key === 'daysOverdue') {
        const today = new Date();

        if (a.dueDate) {
          const aDueDate = new Date(a.dueDate);
          aValue = Math.floor((today.getTime() - aDueDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        if (b.dueDate) {
          const bDueDate = new Date(b.dueDate);
          bValue = Math.floor((today.getTime() - bDueDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      } else {
        aValue = (a as any)[sortConfig.key];
        bValue = (b as any)[sortConfig.key];
      }

      if (aValue === bValue) return 0;
      if (!aValue && aValue !== 0) return 1;
      if (!bValue && bValue !== 0) return -1;

      const comparison = aValue > bValue ? 1 : -1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [actions, sortConfig]);

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'completed') return 'success';
    if (statusLower === 'risk accepted') return 'default';
    if (statusLower === 'overdue') return 'danger';
    if (statusLower === 'closed') return 'info';
    return 'warning';
  };

  const handleDragStart = (columnId: string) => {
    setDraggedColumn(columnId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetColumnId: string) => {
    if (!draggedColumn || draggedColumn === targetColumnId) {
      setDraggedColumn(null);
      return;
    }

    const newOrder = [...columnOrder];
    const draggedIndex = newOrder.indexOf(draggedColumn);
    const targetIndex = newOrder.indexOf(targetColumnId);

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);

    setColumnOrder(newOrder);
    setDraggedColumn(null);
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        // Don't handle ESC if finding child modal is open (it will handle it)
        if (isFindingChildModalOpen) {
          return;
        }

        if (isDetailModalOpen) {
          setIsDetailModalOpen(false);
          setSelectedAction(null);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen, isDetailModalOpen, isFindingChildModalOpen, onClose]);


  const columns: Record<string, any> = {
    status: {
      label: 'Status',
      render: (action: Action) => (
        <Badge variant={getStatusBadge(action.status)}>
          {action.status}
        </Badge>
      ),
    },
    audit: {
      label: 'Audit',
      sortable: true,
      sortKey: 'auditName',
      render: (action: Action) => (
        <span className="text-gray-600 text-sm">{action.auditName || '-'}</span>
      ),
    },
    auditYear: {
      label: 'Audit Year',
      sortable: true,
      sortKey: 'auditYear',
      render: (action: Action) => (
        <span className="text-gray-600 text-sm">{action.auditYear || '-'}</span>
      ),
    },
    auditLead: {
      label: 'Audit Lead',
      sortable: true,
      sortKey: 'auditLead',
      render: (action: Action) => (
        <span className="text-gray-600 text-sm">{action.auditLead || '-'}</span>
      ),
    },
    daysUntilDue: {
      label: 'Days Until Due',
      sortable: true,
      sortKey: 'daysUntilDue',
      render: (action: Action) => (
        action.daysUntilDue !== null && action.daysUntilDue !== undefined ? (
          <span className={`text-sm font-medium ${action.daysUntilDue < 7 ? 'text-red-600' : action.daysUntilDue < 14 ? 'text-orange-600' : 'text-gray-600'}`}>
            {action.daysUntilDue} days
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    daysOverdue: {
      label: 'Days Overdue',
      sortable: true,
      sortKey: 'daysOverdue',
      render: (action: Action) => {
        if (!action.dueDate) return <span className="text-gray-400">-</span>;

        const today = new Date();
        const dueDate = new Date(action.dueDate);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysOverdue <= 0) return <span className="text-gray-400">-</span>;

        return (
          <span className={`text-sm font-medium ${daysOverdue > 30 ? 'text-red-600' :
            daysOverdue > 15 ? 'text-orange-600' :
              'text-gray-600'
            }`}>
            {daysOverdue} days
          </span>
        );
      },
    },
    dueDate: {
      label: 'Due Date',
      render: (action: Action) => (
        <span className="text-gray-600 text-sm">
          {action.dueDate ? formatDate(action.dueDate, 'PP') : '-'}
        </span>
      ),
    },
    riskLevel: {
      label: 'Risk Level',
      render: (action: Action) => (
        <Badge
          variant={
            action.riskLevel === 'Critical'
              ? 'danger'
              : action.riskLevel === 'High'
                ? 'warning'
                : action.riskLevel === 'Medium'
                  ? 'info'
                  : 'default'
          }
        >
          {action.riskLevel || 'Unassigned'}
        </Badge>
      ),
    },
    responsible: {
      label: 'Responsible',
      render: (action: Action) => (
        <span className="text-gray-600 text-sm">{action.responsibleEmail || '-'}</span>
      ),
    },
    cLevel: {
      label: 'C-Level',
      render: (action: Action) => (
        <span className="text-gray-600 text-sm">{action.cLevel || '-'}</span>
      ),
    },
    description: {
      label: 'Description',
      render: (action: Action) => (
        <span className="text-gray-700 text-sm line-clamp-2" title={action.description}>
          {action.description || '-'}
        </span>
      ),
    },
    actions: {
      label: mode === 'findings' ? 'Finding Detail' : 'Action Detail',
      render: (action: Action) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (mode === 'findings') {
              // For findings, show child actions
              setSelectedFinding(action);
              setIsFindingChildModalOpen(true);
            } else {
              // For actions, show action detail
              setSelectedAction(action);
              setIsDetailModalOpen(true);
            }
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </Button>
      ),
    },
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
        <div className={cn(
          "bg-white rounded-lg shadow-xl w-full overflow-hidden flex flex-col",
          isMobileViewport ? "max-w-full max-h-[95vh]" : "max-w-[95vw] max-h-[90vh]"
        )}>
          <div className={cn(
            "border-b border-gray-200",
            actionType
              ? (actionType === 'overdue' ? 'bg-red-50' : 'bg-blue-50')
              : headerBgColor,
            isMobileViewport ? "px-3 py-3" : "px-6 py-4"
          )}>
            <div className="flex justify-between items-start mb-3 relative">
              <div className="flex-1 min-w-0 pr-2">
                <h3 className={cn(
                  "font-semibold text-gray-900",
                  isMobileViewport ? "text-base" : "text-lg"
                )}>
                  {actionType ? (actionType === 'overdue' ? 'Overdue Actions' : 'Upcoming Actions') : title}
                </h3>
                <p className={cn(
                  "text-gray-600 mt-1",
                  isMobileViewport ? "text-xs" : "text-sm"
                )}>
                  {loading ? 'Loading...' : (
                    actionType
                      ? (actionType === 'overdue'
                        ? `${overdueCount} actions past due date`
                        : `${upcomingCount} actions due within 30 days`)
                      : subtitle
                  )}
                </p>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  "transition-colors flex-shrink-0 rounded-full hover:bg-gray-200 active:bg-gray-300 relative z-10",
                  isMobileViewport 
                    ? "text-gray-700 bg-white shadow-sm p-1 border border-gray-300" 
                    : "text-gray-500 hover:text-gray-700 p-1"
                )}
                aria-label="Close modal"
              >
                <svg className={cn("fill-none stroke-currentColor", isMobileViewport ? "w-4 h-4" : "w-6 h-6")} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Toggle for Overdue/Upcoming - only show if actionType and onActionTypeChange are provided */}
            {actionType && onActionTypeChange && (
              <div className={cn(
                "inline-flex items-center bg-white rounded-xl shadow-md border border-gray-200/50 backdrop-blur-sm",
                isMobileViewport ? "p-1 w-full" : "p-1.5"
              )}>
                <button
                  onClick={() => onActionTypeChange('overdue')}
                  className={cn(
                    "relative rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 flex-1 justify-center",
                    isMobileViewport ? "px-2 py-1.5 text-xs" : "px-5 py-2.5 text-sm",
                    actionType === 'overdue'
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 transform scale-105'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  )}
                >
                  <span className={isMobileViewport ? "text-sm" : "text-base"}>⚠️</span>
                  <span>Overdue</span>
                  {overdueCount > 0 && (
                    <span className={cn(
                      "rounded-full font-bold",
                      isMobileViewport ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
                      actionType === 'overdue'
                        ? 'bg-white/20 text-white'
                        : 'bg-red-100 text-red-700'
                    )}>
                      {overdueCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => onActionTypeChange('upcoming')}
                  className={cn(
                    "relative rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 flex-1 justify-center",
                    isMobileViewport ? "px-2 py-1.5 text-xs" : "px-5 py-2.5 text-sm",
                    actionType === 'upcoming'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 transform scale-105'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  )}
                >
                  <span className={isMobileViewport ? "text-sm" : "text-base"}>⏰</span>
                  <span>Upcoming</span>
                  {upcomingCount > 0 && (
                    <span className={cn(
                      "rounded-full font-bold",
                      isMobileViewport ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
                      actionType === 'upcoming'
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-100 text-blue-700'
                    )}>
                      {upcomingCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className={cn(
            "flex-1 overflow-auto",
            isMobileViewport ? "p-2" : "p-6"
          )}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loading size="lg" />
              </div>
            ) : actions && actions.length > 0 ? (
              <>
                {/* Desktop Table View */}
                {!isMobileViewport && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          {columnOrder.map((columnId) => {
                            const column = columns[columnId];
                            if (!column) return null;

                            return (
                              <ResizableTableHeader
                                key={columnId}
                                columnKey={columnId}
                                width={columnWidths[columnId]}
                                onResizeStart={handleMouseDown}
                                isResizing={false}
                                onClick={column.sortable ? () => handleSort(column.sortKey) : undefined}
                                onDragStart={() => handleDragStart(columnId)}
                                onDragOver={(e) => handleDragOver(e)}
                                onDrop={() => handleDrop(columnId)}
                                isDragging={draggedColumn === columnId}
                                className={`px-4 py-3 text-left font-semibold text-gray-700 border-r border-gray-200 bg-gray-50 ${column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                              >
                                <div className="flex items-center gap-2">
                                  {column.label}
                                  {column.sortable && (
                                    <span className={sortConfig && sortConfig.key === column.sortKey ? 'text-purple-600' : 'text-gray-400'}>
                                      {sortConfig && sortConfig.key === column.sortKey
                                        ? (sortConfig.direction === 'asc' ? '↑' : '↓')
                                        : '⇅'
                                      }
                                    </span>
                                  )}
                                </div>
                              </ResizableTableHeader>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {sortedActions.map((action) => (
                          <tr key={action.key} className="hover:bg-gray-50 transition-colors">
                            {columnOrder.map((columnId) => {
                              const column = columns[columnId];
                              if (!column) return null;

                              return (
                                <td
                                  key={columnId}
                                  className="px-4 py-3 border-r border-gray-100"
                                  style={{ width: `${columnWidths[columnId]}px` }}
                                >
                                  {column.render(action)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Mobile Card View */}
                {isMobileViewport && (
                  <div className="space-y-2">
                    {sortedActions.map((action) => (
                      <div
                        key={action.key}
                        className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="space-y-2">
                          {/* Key and Status */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-mono text-purple-600 mb-1 truncate">
                                {action.key}
                              </div>
                              {columns.status && (
                                <div className="mb-2">
                                  {columns.status.render(action)}
                                </div>
                              )}
                            </div>
                            {columns.actions && (
                              <div className="flex-shrink-0">
                                {columns.actions.render(action)}
                              </div>
                            )}
                          </div>

                          {/* Summary/Description */}
                          {columns.description && (
                            <div>
                              <div className="text-[9px] font-semibold text-gray-500 uppercase mb-1">Description</div>
                              <div className="text-xs text-gray-700 line-clamp-2">
                                {action.description || '-'}
                              </div>
                            </div>
                          )}

                          {/* Details Grid */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {columns.audit && (
                              <div>
                                <div className="text-[9px] font-semibold text-gray-500 uppercase mb-0.5">Audit</div>
                                <div className="text-gray-700 truncate">{action.auditName || '-'}</div>
                              </div>
                            )}
                            {columns.auditYear && (
                              <div>
                                <div className="text-[9px] font-semibold text-gray-500 uppercase mb-0.5">Year</div>
                                <div className="text-gray-700">{action.auditYear || '-'}</div>
                              </div>
                            )}
                            {columns.dueDate && (
                              <div>
                                <div className="text-[9px] font-semibold text-gray-500 uppercase mb-0.5">Due Date</div>
                                <div className="text-gray-700">
                                  {action.dueDate ? formatDate(action.dueDate, 'PP') : '-'}
                                </div>
                              </div>
                            )}
                            {columns.daysUntilDue && action.daysUntilDue !== null && action.daysUntilDue !== undefined && (
                              <div>
                                <div className="text-[9px] font-semibold text-gray-500 uppercase mb-0.5">Days Until</div>
                                <div className={`text-xs font-medium ${action.daysUntilDue < 7 ? 'text-red-600' : action.daysUntilDue < 14 ? 'text-orange-600' : 'text-gray-600'}`}>
                                  {action.daysUntilDue} days
                                </div>
                              </div>
                            )}
                            {columns.daysOverdue && action.dueDate && (() => {
                              const today = new Date();
                              const dueDate = new Date(action.dueDate);
                              const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                              return daysOverdue > 0 ? (
                                <div>
                                  <div className="text-[9px] font-semibold text-gray-500 uppercase mb-0.5">Days Overdue</div>
                                  <div className={`text-xs font-medium ${daysOverdue > 30 ? 'text-red-600' : daysOverdue > 15 ? 'text-orange-600' : 'text-gray-600'}`}>
                                    {daysOverdue} days
                                  </div>
                                </div>
                              ) : null;
                            })()}
                            {columns.riskLevel && (
                              <div>
                                <div className="text-[9px] font-semibold text-gray-500 uppercase mb-0.5">Risk</div>
                                <div>{columns.riskLevel.render(action)}</div>
                              </div>
                            )}
                            {columns.responsible && (
                              <div>
                                <div className="text-[9px] font-semibold text-gray-500 uppercase mb-0.5">Responsible</div>
                                <div className="text-gray-700 text-[10px] truncate">{action.responsibleEmail || '-'}</div>
                              </div>
                            )}
                            {columns.cLevel && (
                              <div>
                                <div className="text-[9px] font-semibold text-gray-500 uppercase mb-0.5">C-Level</div>
                                <div className="text-gray-700 text-[10px] truncate">{action.cLevel || '-'}</div>
                              </div>
                            )}
                            {columns.auditLead && (
                              <div>
                                <div className="text-[9px] font-semibold text-gray-500 uppercase mb-0.5">Audit Lead</div>
                                <div className="text-gray-700 text-[10px] truncate">{action.auditLead || '-'}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">No actions found</div>
            )}
          </div>
        </div>
      </div>

      {/* Action Detail Modal */}
      {isDetailModalOpen && selectedAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-2 md:p-4">
          <div className={cn(
            "bg-white rounded-lg shadow-xl w-full overflow-hidden flex flex-col",
            isMobileViewport ? "max-w-full max-h-[95vh]" : "max-w-3xl max-h-[85vh]"
          )}>
            <div className={cn(
              "border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50 relative",
              isMobileViewport ? "px-3 py-3" : "px-6 py-4"
            )}>
              <div className="flex-1 min-w-0 pr-2">
                <h3 className={cn(
                  "font-semibold text-gray-900",
                  isMobileViewport ? "text-base" : "text-lg"
                )}>Action Details</h3>
                <p className={cn(
                  "text-gray-600 mt-1",
                  isMobileViewport ? "text-xs" : "text-sm"
                )}>{selectedAction.key}</p>
              </div>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedAction(null);
                }}
                className={cn(
                  "transition-colors flex-shrink-0 rounded-full hover:bg-gray-200 active:bg-gray-300 relative z-10",
                  isMobileViewport 
                    ? "text-gray-700 bg-white shadow-sm p-1 border border-gray-300" 
                    : "text-gray-500 hover:text-gray-700 p-1"
                )}
                aria-label="Close modal"
              >
                <svg className={cn("fill-none stroke-currentColor", isMobileViewport ? "w-4 h-4" : "w-6 h-6")} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className={cn(
              "flex-1 overflow-auto",
              isMobileViewport ? "p-3" : "p-6"
            )}>
              <div className="space-y-6">
                {/* Action Summary */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ACTION SUMMARY</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedAction.summary}</p>
                </div>

                {/* Action Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ACTION DESCRIPTION</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                    {selectedAction.description || 'No description available'}
                  </p>
                </div>

                {/* Finding Description (from parent) */}
                {selectedAction.findingDescription && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">FINDING DESCRIPTION</label>
                    <p className="text-gray-900 bg-blue-50 p-3 rounded-lg whitespace-pre-wrap border-l-4 border-blue-500">
                      {selectedAction.findingDescription}
                    </p>
                  </div>
                )}

                {/* Action Details Grid */}
                <div className={cn(
                  "grid gap-4",
                  isMobileViewport ? "grid-cols-1" : "grid-cols-2"
                )}>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">STATUS</label>
                    <Badge variant={getStatusBadge(selectedAction.status)}>{selectedAction.status}</Badge>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">DUE DATE</label>
                    <p className="text-gray-900">
                      {selectedAction.dueDate ? formatDate(selectedAction.dueDate, 'PPP') : '-'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">ACTION RESPONSIBLE</label>
                    <p className="text-gray-900">{selectedAction.responsibleEmail || '-'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">C-LEVEL</label>
                    <p className="text-gray-900">{selectedAction.cLevel || '-'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">AUDIT NAME</label>
                    <p className="text-gray-900">{selectedAction.auditName || '-'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">AUDIT YEAR</label>
                    <p className="text-gray-900">{selectedAction.auditYear || '-'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">AUDIT LEAD</label>
                    <p className="text-gray-900">{selectedAction.auditLead || '-'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">RISK LEVEL</label>
                    <Badge
                      variant={
                        selectedAction.riskLevel === 'Critical'
                          ? 'danger'
                          : selectedAction.riskLevel === 'High'
                            ? 'warning'
                            : selectedAction.riskLevel === 'Medium'
                              ? 'info'
                              : 'default'
                      }
                    >
                      {selectedAction.riskLevel || 'Unassigned'}
                    </Badge>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">FINANCIAL IMPACT</label>
                    <p className="text-gray-900 font-semibold text-indigo-600">
                      {selectedAction.financialImpact > 0
                        ? formatFinancialImpact(selectedAction.financialImpact)
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={cn(
              "border-t border-gray-200 bg-gray-50 flex justify-end",
              isMobileViewport ? "px-3 py-3" : "px-6 py-4"
            )}>
              <Button
                variant="outline"
                size={isMobileViewport ? "sm" : "md"}
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedAction(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Finding Child Actions Modal */}
      {selectedFinding && (
        <FindingChildActionsModal
          isOpen={isFindingChildModalOpen}
          onClose={() => setIsFindingChildModalOpen(false)}
          findingKey={selectedFinding.key}
          findingSummary={selectedFinding.summary}
          findingData={selectedFinding}
        />
      )}
    </>
  );
};

export default ActionsListModal;

