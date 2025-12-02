import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button, Card, Badge, Loading } from '@/components/ui';
import { SearchInput } from '@/components/forms';
import { Input, Select } from '@/components/ui';
import RichTextEditor from '@/components/RichTextEditor';
import { auditFindingService } from '@/services/auditFinding.service';
import { useUIStore } from '@/store/ui.store';
import { useResizableColumns } from '@/hooks';
import ResizableTableHeader from '@/components/ResizableTableHeader';
import { useAuditPlans } from '@/hooks/useAuditPlans';
import { cn } from '@/utils/cn';
import type { AuditFinding, AuditPlanAudit, FindingAttachment, FindingAction, UserByRole } from '@/types';

// Component for showing tooltip on hover for links in list
const ListLinkTooltip: React.FC<{ containerId: string }> = ({ containerId }) => {
  useEffect(() => {
    let tooltipElement: HTMLDivElement | null = null;

    const createTooltip = (): HTMLDivElement => {
      if (!tooltipElement) {
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'list-link-hover-tooltip';
        tooltipElement.style.cssText = `
          position: absolute;
          background: rgba(0, 0, 0, 0.85);
          color: white;
          padding: 0.375rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          pointer-events: none;
          z-index: 10001;
          white-space: nowrap;
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          display: none;
        `;
        document.body.appendChild(tooltipElement);
      }
      return tooltipElement;
    };

    const showTooltip = (link: HTMLAnchorElement) => {
      const tooltip = createTooltip();
      const href = link.getAttribute('data-href') || link.getAttribute('href') || '';
      tooltip.textContent = href;
      
      const rect = link.getBoundingClientRect();
      tooltip.style.left = `${rect.left + window.scrollX}px`;
      tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
      tooltip.style.display = 'block';
    };

    const hideTooltip = () => {
      if (tooltipElement) {
        tooltipElement.style.display = 'none';
      }
    };

    const container = document.getElementById(containerId);
    if (!container) return;

    const updateLinks = () => {
      const links = container.querySelectorAll('a.list-hyperlink');
      links.forEach((link) => {
        // Remove existing listeners to avoid duplicates
        const newLink = link.cloneNode(true) as HTMLAnchorElement;
        link.parentNode?.replaceChild(newLink, link);
        
        // Add hover listeners
        newLink.addEventListener('mouseenter', () => showTooltip(newLink));
        newLink.addEventListener('mouseleave', hideTooltip);
      });
    };

    // Initial update
    updateLinks();

    // Observe for link changes
    const observer = new MutationObserver(updateLinks);
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href', 'data-href'],
    });

    return () => {
      observer.disconnect();
      if (tooltipElement) {
        document.body.removeChild(tooltipElement);
        tooltipElement = null;
      }
    };
  }, [containerId]);

  return null;
};

const AuditFindingPage: React.FC = () => {
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('all');
  const [filterAuditYear, setFilterAuditYear] = useState<string>('all');
  const [filterAuditName, setFilterAuditName] = useState<string>('all');
  const [filterActionResponsible, setFilterActionResponsible] = useState<string>('all');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showModal, setShowModal] = useState(false);
  const [editingFinding, setEditingFinding] = useState<AuditFinding | null>(null);
  const [viewingFinding, setViewingFinding] = useState<AuditFinding | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingFindingId, setDeletingFindingId] = useState<number | null>(null);
  const [showDeleteActionConfirm, setShowDeleteActionConfirm] = useState(false);
  const [deletingActionId, setDeletingActionId] = useState<number | null>(null);
  const [deletingActionFindingId, setDeletingActionFindingId] = useState<number | null>(null);
  const [statusErrorModal, setStatusErrorModal] = useState<{ show: boolean; message: string; incompleteActions?: string[]; actionLabel?: string }>({ show: false, message: '', incompleteActions: [], actionLabel: 'Incomplete actions:' });
  const [showFindingHistory, setShowFindingHistory] = useState(false);
  const [findingHistory, setFindingHistory] = useState<any[]>([]);
  const [loadingFindingHistory, setLoadingFindingHistory] = useState(false);
  const [showActionHistory, setShowActionHistory] = useState(false);
  const [actionHistory, setActionHistory] = useState<any[]>([]);
  const [loadingActionHistory, setLoadingActionHistory] = useState(false);
  const { addNotification } = useUIStore();

  // Audit context for batch finding creation
  const [auditContext, setAuditContext] = useState<{
    selectedAuditYear: string;
    selectedAuditKey: string;
    selectedAuditName: string;
  } | null>(null);

  // Dropdown options state
  const [auditTypeOptions, setAuditTypeOptions] = useState<string[]>([]);
  const [riskTypeOptions, setRiskTypeOptions] = useState<string[]>([]);
  const [internalControlOptions, setInternalControlOptions] = useState<string[]>([]);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [auditYearOptions, setAuditYearOptions] = useState<string[]>([]);
  const [riskLevelOptions, setRiskLevelOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [auditPlanAudits, setAuditPlanAudits] = useState<AuditPlanAudit[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    finding_name: '',
    finding_description: '',
    audit_type: '',
    audit_type_other: '',
    risk_type: '',
    internal_control_element: '',
    country: '',
    audit_year: '',
    audit_name: '',
    audit_key: '',
    risk_level: '',
    financial_impact: '',
    status: 'open',
    selectedAuditKey: '',
    selectedAuditYear: '',
  });

  // Store initial form data when entering edit mode to detect changes
  const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Omit<FindingAttachment, 'id' | 'finding_id' | 'uploaded_at' | 'uploaded_by'>[]>([]);

  // Finding Actions state
  const [findingActions, setFindingActions] = useState<Record<number, FindingAction[]>>({});
  const [showActionModal, setShowActionModal] = useState(false);
  const [editingAction, setEditingAction] = useState<FindingAction | null>(null);
  const [viewingAction, setViewingAction] = useState<FindingAction | null>(null);
  const [isActionEditMode, setIsActionEditMode] = useState(false);
  const [showNewActionForm, setShowNewActionForm] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<number | null>(null);
  const [actionStatusDropdownOpen, setActionStatusDropdownOpen] = useState<number | null>(null);
  const [actionDropdownPosition, setActionDropdownPosition] = useState<{ top: number; left: number; side: 'bottom' | 'right' } | null>(null);
  const actionButtonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});
  const [selectedFindingForAction, setSelectedFindingForAction] = useState<number | null>(null);
  const [showFindingActionsList, setShowFindingActionsList] = useState(false);
  const [viewMode, setViewMode] = useState<'findings' | 'actions'>('findings');
  const tableRef = useRef<HTMLTableElement>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);
  const [showFindingCreationModal, setShowFindingCreationModal] = useState(false);
  const [showAddFindingDropdown, setShowAddFindingDropdown] = useState(false);
  const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState(false);
  const addFindingButtonRef = useRef<HTMLDivElement>(null);
  const historySectionRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [findingCreationMode, setFindingCreationMode] = useState<'single' | 'bulk' | null>(null);
  const [creationModalAuditYear, setCreationModalAuditYear] = useState<string>('');
  const [creationModalAuditKey, setCreationModalAuditKey] = useState<string>('');
  const [creationModalAuditName, setCreationModalAuditName] = useState<string>('');
  const [createdFindings, setCreatedFindings] = useState<AuditFinding[]>([]);
  const [creationFormData, setCreationFormData] = useState({
    finding_name: '',
    finding_description: '',
    audit_type: '',
    audit_type_other: '',
    risk_type: '',
    internal_control_element: '',
    country: '',
                              risk_level: '',
                              financial_impact: '',
                              status: '',
                            });
  const [creationFormErrors, setCreationFormErrors] = useState<Record<string, string>>({});
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadPreview, setBulkUploadPreview] = useState<any[]>([]);
  const [bulkUploadErrors, setBulkUploadErrors] = useState<string[]>([]);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);

  // Resizable columns for findings table
  const initialColumnWidths = {
    findingId: 180,
    findingName: 200,
    auditName: 250,
    findingDescription: 300,
    riskLevel: 120,
    status: 120,
    financialImpact: 150,
    actions: 200,
  };

  const { columnWidths, resizing, handleMouseDown } = useResizableColumns(
    tableRef,
    initialColumnWidths,
    'audit-findings-columns'
  );
  
  const [expandedFindings, setExpandedFindings] = useState<Set<number>>(new Set());
  const [allActions, setAllActions] = useState<FindingAction[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [actionFormData, setActionFormData] = useState({
    action_description: '',
    due_date: '',
    audit_lead: '',
    action_responsible: '',
    action_responsible_email: '',
    action_responsible_vp: '',
    action_responsible_clevel: '',
    status: 'open',
  });
  const [actionFormErrors, setActionFormErrors] = useState<Record<string, string>>({});

  // User lists by role
  const [teamManagerUsers, setTeamManagerUsers] = useState<UserByRole[]>([]);
  const [departmentDirectorUsers, setDepartmentDirectorUsers] = useState<UserByRole[]>([]);
  // const [managementUsers, setManagementUsers] = useState<UserByRole[]>([]);
  // const [topManagementUsers, setTopManagementUsers] = useState<UserByRole[]>([]);

  useEffect(() => {
    loadData();
    loadUsersByRole();
  }, []);

  useEffect(() => {
    if (viewMode === 'actions') {
      // If actions are already loaded, use them immediately
      // Otherwise load them
      if (allActions.length === 0) {
      loadAllActions();
      }
    }
  }, [viewMode]);

  // Handle ESC key to close modals and dropdowns - covers ALL scenarios
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.keyCode === 27) {
        // Don't prevent default or stop propagation - let normal behavior work
        // Close in order of priority (most specific first)
        if (statusErrorModal.show) {
          setStatusErrorModal({ show: false, message: '', incompleteActions: [], actionLabel: 'Incomplete actions:' });
        } else if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
          setDeletingFindingId(null);
        } else if (showDeleteActionConfirm) {
          setShowDeleteActionConfirm(false);
          setDeletingActionId(null);
          setDeletingActionFindingId(null);
        } else if (statusDropdownOpen !== null) {
          setStatusDropdownOpen(null);
        } else if (actionStatusDropdownOpen !== null) {
          setActionStatusDropdownOpen(null);
        } else if (actionMenuOpen !== null) {
          setActionMenuOpen(null);
        } else if (showAddFindingDropdown) {
          setShowAddFindingDropdown(false);
        } else if (showFindingCreationModal) {
          setShowFindingCreationModal(false);
          setFindingCreationMode(null);
          setCreatedFindings([]);
          setCreationModalAuditYear('');
          setCreationModalAuditKey('');
          setCreationModalAuditName('');
          setBulkUploadFile(null);
          setBulkUploadPreview([]);
          setBulkUploadErrors([]);
        } else if (showActionModal) {
          handleCloseActionModal();
        } else if (showModal) {
          handleCloseModal();
        }
      }
    };

    // Close dropdown when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
      
      if (statusDropdownOpen !== null) {
        if (!target.closest('.relative')) {
          setStatusDropdownOpen(null);
        }
      }
      
      if (showAddFindingDropdown && addFindingButtonRef.current && !addFindingButtonRef.current.contains(target)) {
        setShowAddFindingDropdown(false);
      }
    };

    // Always listen for ESC key, regardless of modal state
    window.addEventListener('keydown', handleEscKey);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [
    showModal, 
    showActionModal, 
    showDeleteConfirm, 
    showDeleteActionConfirm,
    statusErrorModal.show,
    statusDropdownOpen, 
    actionStatusDropdownOpen, 
    actionMenuOpen,
    showAddFindingDropdown, 
    showFindingCreationModal
  ]);

  // Handle scroll to update dropdown position
  useEffect(() => {
    if (actionStatusDropdownOpen !== null) {
      const handleScroll = () => {
        const button = actionButtonRefs.current[actionStatusDropdownOpen];
        if (button) {
          const rect = button.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          const windowWidth = window.innerWidth;
          const dropdownHeight = 200;
          const dropdownWidth = 140;

          const fitsBelow = rect.bottom + dropdownHeight + 4 <= windowHeight;

          if (fitsBelow) {
            setActionDropdownPosition({
              top: rect.bottom + 4,
              left: rect.left,
              side: 'bottom'
            });
          } else {
            const fitsRight = rect.right + dropdownWidth + 4 <= windowWidth;
            if (fitsRight) {
              setActionDropdownPosition({
                top: rect.top,
                left: rect.right + 4,
                side: 'right'
              });
            } else {
              setActionDropdownPosition({
                top: rect.top,
                left: rect.left - dropdownWidth - 4,
                side: 'right'
              });
            }
          }
        }
      };

      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [actionStatusDropdownOpen]);

  const loadUsersByRole = async () => {
    try {
      const [teamManagers, deptDirectors, _management, _topManagement] = await Promise.all([
        auditFindingService.getUsersByRole('team_manager').catch(err => {
          console.error('Failed to load team_manager users:', err);
          return [];
        }),
        auditFindingService.getUsersByRole('department_director').catch(err => {
          console.error('Failed to load department_director users:', err);
          return [];
        }),
        auditFindingService.getUsersByRole('management').catch(err => {
          console.error('Failed to load management users:', err);
          return [];
        }),
        auditFindingService.getUsersByRole('top_management').catch(err => {
          console.error('Failed to load top_management users:', err);
          return [];
        }),
      ]);
      setTeamManagerUsers(teamManagers);
      setDepartmentDirectorUsers(deptDirectors);
      // setManagementUsers(management);
      // setTopManagementUsers(topManagement);
    } catch (error) {
      console.error('Failed to load users by role:', error);
    }
  };

  const loadFindingActions = async (findingId: number) => {
    try {
      const actions = await auditFindingService.getFindingActions(findingId);
      // Check and update overdue status for Open actions
      const today = new Date().toISOString().split('T')[0];
      if (!today) {
      setFindingActions(prev => ({ ...prev, [findingId]: actions }));
        return;
      }
      
      const updatedActions = await Promise.all(
        actions.map(async (action) => {
          const status = action.status?.toLowerCase().trim();
          // Only check Open actions
          if (status === 'open' && action.due_date) {
            const dueDate = new Date(action.due_date).toISOString().split('T')[0];
            if (!dueDate) return action;
            
            // If due date is in the past, update to overdue
            if (dueDate < today) {
              try {
                await auditFindingService.updateFindingAction(action.id, {
                  action_description: action.action_description,
                  due_date: action.due_date,
                  audit_lead: action.audit_lead,
                  action_responsible: action.action_responsible,
                  action_responsible_email: action.action_responsible_email,
                  action_responsible_vp: action.action_responsible_vp,
                  action_responsible_clevel: action.action_responsible_clevel,
                  status: 'overdue',
                });
                return { ...action, status: 'overdue' };
              } catch (error) {
                console.error('Failed to update overdue status for action:', action.id, error);
                return action;
              }
            }
          }
          // If action is overdue but due date is now in the future, set back to open
          else if (status === 'overdue' && action.due_date) {
            const dueDate = new Date(action.due_date).toISOString().split('T')[0];
            if (!dueDate) return action;
            
            if (dueDate >= today) {
              try {
                await auditFindingService.updateFindingAction(action.id, {
                  action_description: action.action_description,
                  due_date: action.due_date,
                  audit_lead: action.audit_lead,
                  action_responsible: action.action_responsible,
                  action_responsible_email: action.action_responsible_email,
                  action_responsible_vp: action.action_responsible_vp,
                  action_responsible_clevel: action.action_responsible_clevel,
                  status: 'open',
                });
                return { ...action, status: 'open' };
              } catch (error) {
                console.error('Failed to update open status for action:', action.id, error);
                return action;
              }
            }
          }
          return action;
        })
      );
      setFindingActions(prev => ({ ...prev, [findingId]: updatedActions }));
      // Re-check finding status after loading actions
      await checkAndUpdateFindingStatus(findingId, updatedActions);
    } catch (error) {
      console.error('Failed to load finding actions:', error);
    }
  };

  const loadAllFindingActions = async (findingIds: number[]) => {
    try {
      const actionsPromises = findingIds.map(findingId =>
        auditFindingService.getFindingActions(findingId).then(actions => ({ findingId, actions }))
      );
      const results = await Promise.all(actionsPromises);
      const actionsMap: Record<number, FindingAction[]> = {};

      results.forEach(({ findingId, actions }) => {
        actionsMap[findingId] = actions;
      });

      setFindingActions(prev => ({ ...prev, ...actionsMap }));
      // Don't update allActions here - it's only for viewMode === 'actions'
      // allActions is managed by loadAllActions when viewMode === 'actions'
    } catch (error) {
      console.error('Failed to load finding actions:', error);
    }
  };

  const loadAllActions = async (findingIds?: number[]) => {
    try {
      setLoadingActions(true);
      console.log('🔄 loadAllActions called');
      
      // Use provided findingIds or load all findings
      let ids = findingIds;
      if (!ids || ids.length === 0) {
      const allFindings = await auditFindingService.getAuditFindings({});
        ids = allFindings.map(f => f.id);
      }

      if (ids.length > 0) {
        const actionPromises = ids.map(id => auditFindingService.getFindingActions(id));
        const actionArrays = await Promise.all(actionPromises);

        const allActionsList: FindingAction[] = [];
        actionArrays.forEach(actions => {
          allActionsList.push(...(actions || []));
        });

        console.log(`📊 Total actions loaded: ${allActionsList.length}`);

        // Remove duplicates based on action id
        const uniqueActionsMap = new Map<number, FindingAction>();
        allActionsList.forEach(action => {
          if (action.id) {
            if (uniqueActionsMap.has(action.id)) {
              console.warn(`⚠️ Duplicate action found: ${action.id} (${action.action_id})`);
            } else {
              uniqueActionsMap.set(action.id, action);
            }
          }
        });

        const uniqueActions = Array.from(uniqueActionsMap.values());
        console.log(`✅ Unique actions: ${uniqueActions.length}`);
        setAllActions(uniqueActions);
      }
    } catch (error) {
      console.error('Failed to load all actions:', error);
      addNotification({
        type: 'error',
        message: 'Failed to load actions',
      });
    } finally {
      setLoadingActions(false);
    }
  };

  // Helper function to check if all actions have a specific status
  // Status values from database: 'Open', 'Completed', 'Risk Accepted', 'Closed', 'Overdue'
  const areAllActionsStatus = (actions: FindingAction[], status: string): boolean => {
    if (!actions || actions.length === 0) return false;
    // Normalize both for comparison (case-insensitive)
    const normalizedStatus = status.toLowerCase().trim();
    return actions.every(action => {
      const actionStatus = action.status?.toLowerCase().trim();
      return actionStatus === normalizedStatus;
    });
  };

  // Helper function to check if finding status can be set manually
  // Status values from database: 'Open', 'Risk Accepted', 'Closed'
  const canSetFindingStatus = async (findingId: number, targetStatus: string): Promise<{ canSet: boolean; reason?: string; incompleteActions?: string[]; actionLabel?: string }> => {
    // Load actions if not already loaded
    if (!findingActions[findingId] || findingActions[findingId].length === 0) {
      try {
        await loadFindingActions(findingId);
      } catch (error) {
        console.error('Failed to load actions for status check:', error);
      }
    }

    const actions = findingActions[findingId] || [];

    if (actions.length === 0) {
      // No actions, allow manual status change
      return { canSet: true };
    }

    // Normalize target status for comparison (case-insensitive)
    const targetStatusNormalized = targetStatus.toLowerCase().trim();

    // Check if trying to set to Completed
    if (targetStatusNormalized === 'completed') {
      const allCompleted = areAllActionsStatus(actions, 'Completed');
      if (!allCompleted) {
        const incompleteActions = actions
          .filter(action => action.status?.toLowerCase().trim() !== 'completed')
          .map(action => action.action_id || `Action #${action.id}`);
        const totalIncomplete = incompleteActions.length;

        let reason = `Cannot set finding status to Completed. ${totalIncomplete} of ${actions.length} action(s) are not completed.\n\nIncomplete actions:`;

        return {
          canSet: false,
          reason,
          incompleteActions,
          actionLabel: 'Incomplete actions:'
        };
      }
    }

    // Check if trying to set to Closed
    if (targetStatusNormalized === 'closed') {
      const allClosed = areAllActionsStatus(actions, 'Closed');
      if (!allClosed) {
        const incompleteActions = actions
          .filter(action => action.status?.toLowerCase().trim() !== 'closed')
          .map(action => action.action_id || `Action #${action.id}`);
        const totalIncomplete = incompleteActions.length;

        let reason = `Cannot set finding status to Closed. ${totalIncomplete} of ${actions.length} action(s) are not closed.\n\nNot closed actions:`;

        return {
          canSet: false,
          reason,
          incompleteActions,
          actionLabel: 'Not closed actions:'
        };
      }
    }

    // Check if trying to set to Risk Accepted
    if (targetStatusNormalized === 'risk accepted') {
      const allRiskAccepted = areAllActionsStatus(actions, 'Risk Accepted');
      if (!allRiskAccepted) {
        const incompleteActions = actions
          .filter(action => action.status?.toLowerCase().trim() !== 'risk accepted')
          .map(action => action.action_id || `Action #${action.id}`);
        const totalIncomplete = incompleteActions.length;

        let reason = `Cannot set finding status to Risk Accepted. ${totalIncomplete} of ${actions.length} action(s) are not risk accepted.\n\nNot risk accepted actions:`;

        return {
          canSet: false,
          reason,
          incompleteActions,
          actionLabel: 'Not risk accepted actions:'
        };
      }
    }

    return { canSet: true };
  };

  // Helper function to check and auto-update finding status based on action statuses
  // Status values from database: 'Open', 'Completed', 'Risk Accepted', 'Closed', 'Overdue'
  const checkAndUpdateFindingStatus = async (findingId: number, updatedActions?: FindingAction[]) => {
    try {
      // Use provided actions or get from state
      const actions = updatedActions || findingActions[findingId] || [];

      if (actions.length === 0) {
        return; // No actions, no auto-update
      }

      const finding = findings.find(f => f.id === findingId);
      if (!finding) return;

      let newStatus: string;

      // Normalize action statuses for comparison
      const normalizeStatus = (status: string | undefined | null): string => {
        if (!status) return '';
        return status.toLowerCase().trim();
      };

      // Filter out Closed and Risk Accepted actions - these are not tracked
      // Only Open, Overdue, and Completed actions are tracked
      const trackedActions = actions.filter(action => {
        const status = normalizeStatus(action.status);
        return status === 'open' || status === 'overdue' || status === 'completed';
      });

      if (trackedActions.length === 0) {
        // No tracked actions (all are Closed and/or Risk Accepted)
        // - If there's any Risk Accepted → Risk Accepted
        // - If all are Closed → Closed
        const hasRiskAccepted = actions.some(action => {
          const status = normalizeStatus(action.status);
          return status === 'risk accepted';
        });

        if (hasRiskAccepted) {
          newStatus = 'Risk Accepted';
        } else if (areAllActionsStatus(actions, 'Closed')) {
          newStatus = 'Closed';
        } else {
          // Fallback (shouldn't happen, but just in case)
          newStatus = 'Open';
        }
      } else {
        // There are tracked actions (Open, Overdue, or Completed)
        // - If all tracked actions are Completed → Completed
        // - Otherwise → Open
        const allTrackedCompleted = trackedActions.every(action => {
          const status = normalizeStatus(action.status);
          return status === 'completed';
        });

        if (allTrackedCompleted) {
          newStatus = 'Completed';
        } else {
          newStatus = 'Open';
        }
      }

      // Update finding status if needed and different from current
      // Normalize both for comparison (case-insensitive)
      const currentStatusNormalized = finding.status?.toLowerCase().trim();
      const newStatusNormalized = newStatus?.toLowerCase().trim();

      // Always update if status should change (even if it's Open)
      if (currentStatusNormalized !== newStatusNormalized) {
        await auditFindingService.updateAuditFinding(findingId, {
          finding_name: finding.finding_name,
          finding_description: finding.finding_description,
          audit_type: finding.audit_type,
          audit_type_other: finding.audit_type_other,
          risk_type: finding.risk_type,
          internal_control_element: finding.internal_control_element,
          country: finding.country,
          audit_year: finding.audit_year,
          audit_name: finding.audit_name,
          audit_key: finding.audit_key,
          risk_level: finding.risk_level,
          financial_impact: finding.financial_impact,
          status: newStatus, // Use capitalized value: 'Open', 'Completed', 'Closed', 'Risk Accepted'
        });

        // Update finding in state immediately without reloading
        setFindings(prevFindings =>
          prevFindings.map(f =>
            f.id === findingId ? { ...f, status: newStatus! } : f
          )
        );

        // Also update viewingFinding if it's the same finding
        if (viewingFinding && viewingFinding.id === findingId) {
          setViewingFinding(prev => prev ? { ...prev, status: newStatus! } : null);
        }
      }
    } catch (error: any) {
      console.error('Failed to auto-update finding status:', error);
      // Don't show notification for auto-updates to avoid noise
    }
  };

  // Helper function to check and update overdue status for Open actions
  const checkAndUpdateOverdueActions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      if (!today) return;
      
      const updates: Promise<void>[] = [];

      // Check all loaded actions
      Object.keys(findingActions).forEach(findingId => {
        const actions = findingActions[Number(findingId)];
        if (!actions) return;
        
        actions.forEach(action => {
          const status = action.status?.toLowerCase().trim();
          // Only check Open actions
          if (status === 'open' && action.due_date) {
            const dueDate = new Date(action.due_date).toISOString().split('T')[0];
            if (!dueDate || !today) return;
            
            // If due date is in the past, update to overdue
            if (dueDate < today) {
              updates.push(
                auditFindingService.updateFindingAction(action.id, {
                  action_description: action.action_description,
                  due_date: action.due_date,
                  audit_lead: action.audit_lead,
                  action_responsible: action.action_responsible,
                  action_responsible_email: action.action_responsible_email,
                  action_responsible_vp: action.action_responsible_vp,
                  action_responsible_clevel: action.action_responsible_clevel,
                  status: 'overdue',
                }).then(() => {
                  // Update in state
                  setFindingActions(prev => {
                    const currentActions = prev[Number(findingId)];
                    if (!currentActions) return prev;
                    
                    return {
                      ...prev,
                      [Number(findingId)]: currentActions.map(a =>
                        a.id === action.id ? { ...a, status: 'overdue' } : a
                      ),
                    };
                  });
                  // Also update allActions if it exists
                  setAllActions(prev => prev.map(a =>
                    a.id === action.id ? { ...a, status: 'overdue' } : a
                  ));
                  // Re-check finding status after action update
                  checkAndUpdateFindingStatus(Number(findingId));
                })
              );
            }
          }
          // If action is overdue but due date is now in the future, set back to open
          else if (status === 'overdue' && action.due_date) {
            const dueDate = new Date(action.due_date).toISOString().split('T')[0];
            if (!dueDate || !today) return;
            
            if (dueDate >= today) {
              updates.push(
                auditFindingService.updateFindingAction(action.id, {
                  action_description: action.action_description,
                  due_date: action.due_date,
                  audit_lead: action.audit_lead,
                  action_responsible: action.action_responsible,
                  action_responsible_email: action.action_responsible_email,
                  action_responsible_vp: action.action_responsible_vp,
                  action_responsible_clevel: action.action_responsible_clevel,
                  status: 'open',
                }).then(() => {
                  // Update in state
                  setFindingActions(prev => {
                    const currentActions = prev[Number(findingId)];
                    if (!currentActions) return prev;
                    
                    return {
                      ...prev,
                      [Number(findingId)]: currentActions.map(a =>
                        a.id === action.id ? { ...a, status: 'open' } : a
                      ),
                    };
                  });
                  // Also update allActions if it exists
                  setAllActions(prev => prev.map(a =>
                    a.id === action.id ? { ...a, status: 'open' } : a
                  ));
                  // Re-check finding status after action update
                  checkAndUpdateFindingStatus(Number(findingId));
                })
              );
            }
          }
        });
      });

      await Promise.all(updates);
    } catch (error) {
      console.error('Failed to check and update overdue actions:', error);
    }
  };

  useEffect(() => {
    loadFindings();
  }, [filterStatus, filterRiskLevel, filterAuditYear]);

  // Periodically check for overdue actions (every minute)
  useEffect(() => {
    // Check immediately on mount
    checkAndUpdateOverdueActions();
    
    // Then check every minute
    const interval = setInterval(() => {
      checkAndUpdateOverdueActions();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [findingActions]); // Re-run when actions change

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadDropdownOptions(),
        // Note: loadAuditPlanAudits is no longer needed - audit plans are loaded via useAuditPlans hook
        loadFindings(),
      ]);
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to load data',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load audit plans from Annual Audit Plan
  const { data: auditPlans = [] } = useAuditPlans(); // Get all audit plans

  // Extract unique audit years from audit plans
  useEffect(() => {
    if (auditPlans && auditPlans.length > 0) {
      const uniqueYears = Array.from(new Set(auditPlans.map(plan => String(plan.audit_year))))
        .sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)
      setAuditYearOptions(uniqueYears);
    }
  }, [auditPlans]);

  // Convert audit plans to AuditPlanAudit format for compatibility
  useEffect(() => {
    if (auditPlans && auditPlans.length > 0) {
      const audits: AuditPlanAudit[] = auditPlans.map((plan) => ({
        key: `AUDIT-${plan.id}`, // Generate a unique key based on audit plan ID
        summary: plan.audit_name || plan.audit_type || 'Unnamed Audit', // Use audit_name if available, fallback to audit_type
        auditYear: String(plan.audit_year),
        auditLead: plan.audit_lead_name || plan.audit_lead_email || '',
        status: plan.status || 'Planned',
      }));
      setAuditPlanAudits(audits);
      console.log(`✅ Loaded ${audits.length} audit plans from Annual Audit Plan`);
    } else {
      // Clear audits if no plans available
      setAuditPlanAudits([]);
    }
  }, [auditPlans]);

  const loadDropdownOptions = async () => {
    try {
      const [
        auditTypes,
        riskTypes,
        internalControls,
        countries,
        riskLevels,
        statuses,
      ] = await Promise.all([
        auditFindingService.getDropdownOptions('audit_type'),
        auditFindingService.getDropdownOptions('risk_type'),
        auditFindingService.getDropdownOptions('internal_control_element'),
        auditFindingService.getDropdownOptions('country'),
        auditFindingService.getDropdownOptions('risk_level'),
        auditFindingService.getDropdownOptions('status'),
      ]);

      setAuditTypeOptions(auditTypes);
      setRiskTypeOptions(riskTypes);
      setInternalControlOptions(internalControls);
      setCountryOptions(countries);
      // Note: auditYears are now loaded from audit plans via useEffect above
      setRiskLevelOptions(riskLevels);
      // Remove duplicates from status options (case-insensitive)
      const uniqueStatuses = Array.from(new Set(statuses.map(s => s.toLowerCase().trim())))
        .map(uniqueStatus => {
          // Find the original case version
          const original = statuses.find(s => s.toLowerCase().trim() === uniqueStatus);
          return original || uniqueStatus;
        });
      console.log('📋 Status options loaded:', uniqueStatuses.length, uniqueStatuses);
      setStatusOptions(uniqueStatuses);
    } catch (error) {
      console.error('Failed to load dropdown options:', error);
    }
  };

  const loadFindings = async () => {
    try {
      // Load all findings, filtering will be done client-side
      const data = await auditFindingService.getAuditFindings({});
      setFindings(data);

      // Load actions for all findings
      if (data.length > 0) {
        const findingIds = data.map(f => f.id);
        await loadAllFindingActions(findingIds);
        // Also preload all actions for the actions tab - this ensures instant display when switching tabs
        await loadAllActions(findingIds);
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to load audit findings',
      });
    }
  };

  const handleViewFinding = async (finding: AuditFinding) => {
    // Close any open Quill tooltips
    const tooltips = document.querySelectorAll('.ql-tooltip');
    tooltips.forEach((tooltip) => {
      const element = tooltip as HTMLElement;
      element.style.display = 'none';
      element.classList.remove('ql-editing');
    });

    setViewingFinding(finding);
    setEditingFinding(null);
    setIsEditMode(false);
    setFormData({
      finding_name: finding.finding_name || '',
      finding_description: finding.finding_description || '',
      audit_type: finding.audit_type || '',
      audit_type_other: finding.audit_type_other || '',
      risk_type: finding.risk_type || '',
      internal_control_element: finding.internal_control_element || '',
      country: finding.country || '',
      audit_year: finding.audit_year || '',
      audit_name: finding.audit_name || '',
      audit_key: finding.audit_key || '',
      risk_level: finding.risk_level || '',
      financial_impact: finding.financial_impact?.toString() || '',
      status: finding.status || 'open',
      selectedAuditKey: finding.audit_key || '',
      selectedAuditYear: finding.audit_year || '',
    });
    setAttachments(finding.attachments?.map(a => ({
      file_name: a.file_name,
      file_size: a.file_size,
      file_type: a.file_type,
      file_path: a.file_path,
    })) || []);

    // Load finding actions
    await loadFindingActions(finding.id);

    setShowModal(true);
  };



  const handleCloseModal = () => {
    // Close any open Quill tooltips
    const tooltips = document.querySelectorAll('.ql-tooltip');
    tooltips.forEach((tooltip) => {
      const element = tooltip as HTMLElement;
      element.style.display = 'none';
      element.classList.remove('ql-editing');
    });

    setShowModal(false);
    setViewingFinding(null);
    setEditingFinding(null);
    setIsEditMode(false);
    setShowFindingHistory(false); // Reset history state when modal closes
    setFormData({
      finding_name: '',
      finding_description: '',
      audit_type: '',
      audit_type_other: '',
      risk_type: '',
      internal_control_element: '',
      country: '',
      audit_year: '',
      audit_name: '',
      audit_key: '',
      risk_level: '',
      financial_impact: '',
      status: 'open',
      selectedAuditKey: '',
      selectedAuditYear: '',
    });
    setAttachments([]);
    setFormErrors({});
  };

  const handleAuditYearSelect = (year: string) => {
    setFormData(prev => ({
      ...prev,
      selectedAuditYear: year,
      selectedAuditKey: '', // Reset audit selection when year changes
      audit_name: '',
      audit_key: '',
      audit_year: '',
    }));
  };

  const handleAuditSelect = (auditKey: string) => {
    const selectedAudit = auditPlanAudits.find(a => a.key === auditKey);
    if (selectedAudit) {
      // Update form data
      setFormData(prev => ({
        ...prev,
        selectedAuditKey: auditKey,
        audit_name: selectedAudit.summary,
        audit_key: selectedAudit.key,
        audit_year: selectedAudit.auditYear,
      }));

      // Update audit context for batch creation
      setAuditContext({
        selectedAuditYear: selectedAudit.auditYear,
        selectedAuditKey: selectedAudit.key,
        selectedAuditName: selectedAudit.summary,
      });
    }
  };



  // Filter audits by selected year
  const filteredAudits = formData.selectedAuditYear
    ? auditPlanAudits.filter(audit => audit.auditYear === formData.selectedAuditYear)
    : [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newAttachments = Array.from(files).map(file => ({
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        file_path: undefined as string | undefined,
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    if (!formData.finding_name?.trim()) {
      errors.finding_name = 'Finding name is required';
    }

    if (!formData.finding_description?.trim()) {
      errors.finding_description = 'Finding description is required';
    }

    if (!formData.selectedAuditYear) {
      errors.selectedAuditYear = 'Audit year selection is required';
    }

    if (!formData.audit_name?.trim()) {
      errors.audit_name = 'Audit selection is required';
    }

    if (!formData.audit_type) {
      errors.audit_type = 'Audit type is required';
    }

    if (formData.audit_type === 'Other' && !formData.audit_type_other?.trim()) {
      errors.audit_type_other = 'Please specify the audit type';
    }

    if (!formData.risk_type) {
      errors.risk_type = 'Risk type is required';
    }

    if (!formData.internal_control_element) {
      errors.internal_control_element = 'Internal control element is required';
    }

    if (!formData.country) {
      errors.country = 'Country is required';
    }

    if (!formData.risk_level) {
      errors.risk_level = 'Risk level is required';
    }

    setFormErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    return { isValid, errors };
  };

  // Check if form data has changed from initial values
  const hasFormChanged = useMemo(() => {
    if (!initialFormData || !isEditMode) return false;
    
    // Compare all form fields
    return (
      formData.finding_name !== initialFormData.finding_name ||
      formData.finding_description !== initialFormData.finding_description ||
      formData.audit_type !== initialFormData.audit_type ||
      formData.audit_type_other !== initialFormData.audit_type_other ||
      formData.risk_type !== initialFormData.risk_type ||
      formData.internal_control_element !== initialFormData.internal_control_element ||
      formData.country !== initialFormData.country ||
      formData.audit_year !== initialFormData.audit_year ||
      formData.audit_name !== initialFormData.audit_name ||
      formData.audit_key !== initialFormData.audit_key ||
      formData.risk_level !== initialFormData.risk_level ||
      formData.financial_impact !== initialFormData.financial_impact ||
      formData.status !== initialFormData.status
    );
  }, [formData, initialFormData, isEditMode]);

  const handleSubmit = async (e?: React.FormEvent, keepModalOpen = false) => {
    console.log('handleSubmit called', { keepModalOpen, formData, editingFinding, viewingFinding });
    
    if (e) {
    e.preventDefault();
    }

    const validationResult = validateForm();
    const { isValid, errors: validationErrors } = validationResult;
    console.log('Validation result:', isValid, 'Validation errors:', validationErrors);
    
    if (!isValid) {
      console.log('Form validation failed, errors:', validationErrors);
      const errorMessages = Object.values(validationErrors).filter(Boolean);
      addNotification({
        type: 'error',
        message: errorMessages.length > 0 
          ? `Please fix the following errors: ${errorMessages.join(', ')}`
          : 'Please fill in all required fields',
      });
      return;
    }
    
    console.log('Validation passed, proceeding with submit...');

    try {
      const submitData: any = {
        finding_name: formData.finding_name,
        finding_description: formData.finding_description || undefined,
        audit_type: formData.audit_type || undefined,
        audit_type_other: formData.audit_type === 'Other' ? formData.audit_type_other : undefined,
        risk_type: formData.risk_type || undefined,
        internal_control_element: formData.internal_control_element || undefined,
        country: formData.country || undefined,
        audit_year: formData.audit_year || undefined,
        audit_name: formData.audit_name,
        audit_key: formData.audit_key || undefined,
        risk_level: formData.risk_level || undefined,
        financial_impact: formData.financial_impact ? parseFloat(formData.financial_impact) : undefined,
        status: formData.status,
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      if (editingFinding) {
        await auditFindingService.updateAuditFinding(editingFinding.id, submitData);
        
        // Reload the updated finding
        const reloadedFinding = await auditFindingService.getAuditFinding(editingFinding.id);
        
        // Update formData with reloaded data
        setFormData({
          finding_name: reloadedFinding.finding_name || '',
          finding_description: reloadedFinding.finding_description || '',
          audit_type: reloadedFinding.audit_type || '',
          audit_type_other: reloadedFinding.audit_type_other || '',
          risk_type: reloadedFinding.risk_type || '',
          internal_control_element: reloadedFinding.internal_control_element || '',
          country: reloadedFinding.country || '',
          audit_year: reloadedFinding.audit_year || '',
          audit_name: reloadedFinding.audit_name || '',
          audit_key: reloadedFinding.audit_key || '',
          risk_level: reloadedFinding.risk_level || '',
          financial_impact: reloadedFinding.financial_impact ? String(reloadedFinding.financial_impact) : '',
          status: reloadedFinding.status || 'open',
          selectedAuditKey: reloadedFinding.audit_key || '',
          selectedAuditYear: reloadedFinding.audit_year || '',
        });
        
        // Close modal after successful update
        setViewingFinding(null);
        setEditingFinding(null);
        setIsEditMode(false);
        setInitialFormData(null);
        setShowModal(false);
        
        addNotification({
          type: 'success',
          message: 'Audit finding updated successfully',
        });
      } else {
        await auditFindingService.createAuditFinding(submitData);
        addNotification({
          type: 'success',
          message: 'Audit finding created successfully',
        });

        if (keepModalOpen) {
          // For "Save and Add Another" - keep modal open and reset form fields
          setFormData(prev => ({
            ...prev,
            finding_name: '',
            finding_description: '',
            audit_type: '',
            audit_type_other: '',
            risk_type: '',
            internal_control_element: '',
            country: '',
            risk_level: '',
            financial_impact: '',
            status: 'open',
          }));
          setAttachments([]);
          setFormErrors({});
        } else {
          // For regular "Create" - close modal
          handleCloseModal();
        }
      }

      loadFindings();
    } catch (error: any) {
      console.error('❌ Error saving audit finding:', error);
      const errorMessage = error?.response?.data?.error 
        || error?.message 
        || (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error') 
          ? 'Network error: Server may be offline. Please check your connection and try again.'
          : 'Failed to save audit finding');
      addNotification({
        type: 'error',
        message: errorMessage,
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingFindingId) return;

    try {
      await auditFindingService.deleteAuditFinding(deletingFindingId);
      addNotification({
        type: 'success',
        message: 'Audit finding deleted successfully',
      });
      setShowDeleteConfirm(false);
      setDeletingFindingId(null);
      loadFindings();
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: error?.response?.data?.error || 'Failed to delete audit finding',
      });
    }
  };

  const filteredFindings = findings.filter((finding) => {
    if (viewMode === 'actions') return false; // Hide findings when viewing actions

    // Search filter
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch =
      (finding.finding_id ? String(finding.finding_id).toLowerCase().includes(searchTermLower) : false) ||
      finding.finding_name.toLowerCase().includes(searchTermLower) ||
      (finding.finding_description ? finding.finding_description.toLowerCase().includes(searchTermLower) : false) ||
      finding.audit_name.toLowerCase().includes(searchTermLower) ||
      (finding.financial_impact ? String(finding.financial_impact).toLowerCase().includes(searchTermLower) : false);

    // Status filter (case-insensitive)
    const matchesStatus = filterStatus === 'all' ||
      finding.status?.toLowerCase() === filterStatus.toLowerCase();

    // Risk Level filter (case-insensitive)
    const matchesRiskLevel = filterRiskLevel === 'all' ||
      finding.risk_level?.toLowerCase() === filterRiskLevel.toLowerCase();

    // Audit Year filter
    const matchesAuditYear = filterAuditYear === 'all' ||
      finding.audit_year === filterAuditYear;

    // Audit Name filter
    const matchesAuditName = filterAuditName === 'all' ||
      finding.audit_name === filterAuditName;

    return matchesSearch && matchesStatus && matchesRiskLevel && matchesAuditYear && matchesAuditName;
  });

  // Remove duplicates from allActions before filtering
  const uniqueActions = useMemo(() => {
    const actionsMap = new Map<number, FindingAction>();
    allActions.forEach(action => {
      if (action.id && !actionsMap.has(action.id)) {
        actionsMap.set(action.id, action);
      }
    });
    return Array.from(actionsMap.values());
  }, [allActions]);

  const filteredActions = uniqueActions.filter((action) => {
    if (viewMode === 'findings') return false; // Hide actions when viewing findings

    // Search filter
    const matchesSearch =
      action.action_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.action_id.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter (case-insensitive)
    const matchesStatus = filterStatus === 'all' ||
      action.status?.toLowerCase() === filterStatus.toLowerCase();

    // Audit Year filter - use action's audit_year
    const matchesAuditYear = filterAuditYear === 'all' ||
      action.audit_year === filterAuditYear;

    // Audit Name filter - use action's audit_name
    const matchesAuditName = filterAuditName === 'all' ||
      action.audit_name === filterAuditName;

    // Action Responsible filter (case-insensitive)
    const matchesActionResponsible = filterActionResponsible === 'all' ||
      action.action_responsible?.toLowerCase().trim() === filterActionResponsible.toLowerCase().trim();

    return matchesSearch && matchesStatus && matchesAuditYear && matchesAuditName && matchesActionResponsible;
  });

  const toggleFindingExpansion = (findingId: number) => {
    setExpandedFindings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(findingId)) {
        newSet.delete(findingId);
      } else {
        newSet.add(findingId);
        // Load actions if not already loaded
        if (!findingActions[findingId]) {
          loadFindingActions(findingId);
        }
      }
      return newSet;
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'risk accepted':
        return 'warning';
      case 'overdue':
        return 'danger';
      case 'closed':
        return 'dark';
      default:
        return 'info';
    }
  };

  const getRiskLevelBadgeVariant = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'critical':
        return 'dark';
      case 'high':
        return 'danger';
      case 'medium':
        return 'orange';
      case 'low':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getActionStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'risk accepted':
        return 'warning';
      case 'overdue':
        return 'danger';
      case 'closed':
        return 'dark';
      default:
        return 'info';
    }
  };

  // Finding Actions handlers
  const handleViewAction = async (findingId: number, action: FindingAction) => {
    try {
      setSelectedFindingForAction(findingId);
      setViewingAction(action);
      setEditingAction(null);
      setIsActionEditMode(false);
      setShowNewActionForm(false);

      // Set initial form data from action
      // due_date is already a string from backend (YYYY-MM-DD format), use it directly
      // Ensure due_date is in YYYY-MM-DD format for date input
      let dueDateValue: string = action.due_date || '';
      if (dueDateValue && typeof dueDateValue === 'string') {
        // If it's a date string, ensure it's in YYYY-MM-DD format
        const date = new Date(dueDateValue);
        if (!isNaN(date.getTime())) {
          // Format as YYYY-MM-DD
          const formatted = date.toISOString().split('T')[0];
          if (formatted) {
            dueDateValue = formatted;
          }
        }
      }

      console.log('handleViewAction - action.due_date:', action.due_date, 'formatted:', dueDateValue);

      setActionFormData({
        action_description: action.action_description || '',
        due_date: dueDateValue,
        audit_lead: action.audit_lead || '',
        action_responsible: action.action_responsible || '',
        action_responsible_email: action.action_responsible_email || '',
        action_responsible_vp: action.action_responsible_vp || '',
        action_responsible_clevel: action.action_responsible_clevel || '',
        status: action.status || 'open',
      });

      setShowActionModal(true);

      // Reload action to get latest data in background
      try {
        const updatedAction = await auditFindingService.getFindingAction(action.id);

        // Ensure due_date is in YYYY-MM-DD format for date input
        let updatedDueDate: string = updatedAction.due_date || '';
        if (updatedDueDate && typeof updatedDueDate === 'string') {
          const date = new Date(updatedDueDate);
          if (!isNaN(date.getTime())) {
            const formatted = date.toISOString().split('T')[0];
            if (formatted) {
              updatedDueDate = formatted;
            }
          }
        }

        console.log('handleViewAction - updatedAction.due_date:', updatedAction.due_date, 'formatted:', updatedDueDate);

        // due_date is already a string from backend (YYYY-MM-DD format), use it directly
        setActionFormData({
          action_description: updatedAction.action_description || '',
          due_date: updatedDueDate,
          audit_lead: updatedAction.audit_lead || '',
          action_responsible: updatedAction.action_responsible || '',
          action_responsible_email: updatedAction.action_responsible_email || '',
          action_responsible_vp: updatedAction.action_responsible_vp || '',
          action_responsible_clevel: updatedAction.action_responsible_clevel || '',
          status: updatedAction.status || 'open',
        });

        // Update viewingAction with latest data
        setViewingAction(updatedAction);
      } catch (error) {
        console.error('Failed to reload action:', error);
        // Keep using the original action data
      }
    } catch (error) {
      console.error('Error in handleViewAction:', error);
      addNotification({
        type: 'error',
        message: 'Failed to open action view',
      });
    }
  };


  const handleOpenActionModal = (findingId: number, action?: FindingAction) => {
    setSelectedFindingForAction(findingId);
    if (action) {
      handleViewAction(findingId, action);
    } else {
      setViewingAction(null);
      setEditingAction(null);
      setIsActionEditMode(false);
      setShowNewActionForm(true);
      setActionFormData({
        action_description: '',
        due_date: '',
        audit_lead: '',
        action_responsible: '',
        action_responsible_email: '',
        action_responsible_vp: '',
        action_responsible_clevel: '',
        status: 'open',
      });
    }
    setActionFormErrors({});
    setShowActionModal(true);
  };

  const handleCloseActionModal = () => {
    setShowActionModal(false);
    setEditingAction(null);
    setViewingAction(null);
    setShowNewActionForm(false);
    setSelectedFindingForAction(null);
    setShowActionHistory(false); // Reset history state when modal closes
    setActionFormData({
      action_description: '',
      due_date: '',
      audit_lead: '',
      action_responsible: '',
      action_responsible_email: '',
      action_responsible_vp: '',
      action_responsible_clevel: '',
      status: 'open',
    });
    setActionFormErrors({});
  };

  const validateActionForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!actionFormData.action_description.trim()) {
      errors.action_description = 'Action description is required';
    }
    if (!actionFormData.due_date) {
      errors.due_date = 'Due date is required';
    }
    if (!actionFormData.audit_lead) {
      errors.audit_lead = 'Audit lead is required';
    }
    if (!actionFormData.action_responsible) {
      errors.action_responsible = 'Action responsible is required';
    }

    setActionFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateActionForm() || !selectedFindingForAction) {
      return;
    }

    try {
      if (editingAction) {
        // Determine status based on due_date
        const today = new Date().toISOString().split('T')[0] as string;
        let finalStatus = actionFormData.status || editingAction?.status || 'open';
        const currentStatus = editingAction.status?.toLowerCase().trim();

        // Only apply overdue/open logic for Open or Overdue actions
        if (currentStatus === 'open' || currentStatus === 'overdue') {
        // If due_date is in the past and status is open, set to overdue
        if (finalStatus === 'open' && actionFormData.due_date && actionFormData.due_date < today) {
          finalStatus = 'overdue';
        }
          // If due_date is in the future (or today) and status is overdue, set to open
          else if (currentStatus === 'overdue' && actionFormData.due_date && actionFormData.due_date >= today) {
          finalStatus = 'open';
        }
        // If status is explicitly set to overdue but due_date is in the future, set to open
          else if (finalStatus === 'overdue' && actionFormData.due_date && actionFormData.due_date >= today) {
          finalStatus = 'open';
          }
        }

        await auditFindingService.updateFindingAction(editingAction.id, {
          action_description: actionFormData.action_description,
          due_date: actionFormData.due_date,
          audit_lead: actionFormData.audit_lead,
          action_responsible: actionFormData.action_responsible,
          action_responsible_email: actionFormData.action_responsible_email,
          action_responsible_vp: actionFormData.action_responsible_vp,
          action_responsible_clevel: actionFormData.action_responsible_clevel,
          status: finalStatus,
        });

        // Update action in state immediately with all fields
        const updatedAction = {
          ...editingAction,
          action_description: actionFormData.action_description,
          due_date: actionFormData.due_date,
          audit_lead: actionFormData.audit_lead,
          action_responsible: actionFormData.action_responsible,
          action_responsible_email: actionFormData.action_responsible_email,
          action_responsible_vp: actionFormData.action_responsible_vp,
          action_responsible_clevel: actionFormData.action_responsible_clevel,
          status: finalStatus,
        };

        if (selectedFindingForAction) {
          setFindingActions(prev => ({
            ...prev,
            [selectedFindingForAction]: (prev[selectedFindingForAction] || []).map(a =>
              a.id === editingAction.id ? updatedAction : a
            )
          }));

          // Also update allActions if it exists
          setAllActions(prev => prev.map(a =>
            a.id === editingAction.id ? updatedAction : a
          ));

          // Check and auto-update finding status based on action statuses
          await checkAndUpdateFindingStatus(selectedFindingForAction);
        }

        // Reload the action to get the latest data
        if (selectedFindingForAction) {
          await loadFindingActions(selectedFindingForAction);
        }

        // Reload the updated action and set it as viewingAction
        const reloadedAction = await auditFindingService.getFindingAction(editingAction.id);
        
        // Ensure due_date is in YYYY-MM-DD format
        let reloadedDueDate: string = reloadedAction.due_date || '';
        if (reloadedDueDate && typeof reloadedDueDate === 'string') {
          const date = new Date(reloadedDueDate);
          if (!isNaN(date.getTime())) {
            const formatted = date.toISOString().split('T')[0];
            if (formatted) {
              reloadedDueDate = formatted;
            }
          }
        }
        
        // Update actionFormData with reloaded data
        setActionFormData({
          action_description: reloadedAction.action_description || '',
          due_date: reloadedDueDate,
          audit_lead: reloadedAction.audit_lead || '',
          action_responsible: reloadedAction.action_responsible || '',
          action_responsible_email: reloadedAction.action_responsible_email || '',
          action_responsible_vp: reloadedAction.action_responsible_vp || '',
          action_responsible_clevel: reloadedAction.action_responsible_clevel || '',
          status: reloadedAction.status || 'open',
        });
        
        // Set back to view mode (not edit mode)
        // Ensure modal stays open
        setShowActionModal(true);
        setViewingAction(reloadedAction);
        setEditingAction(null);
        setIsActionEditMode(false);

        addNotification({
          type: 'success',
          message: 'Finding action updated successfully',
        });
      } else {
        const response = await auditFindingService.createFindingAction({
          finding_id: selectedFindingForAction,
          ...actionFormData,
        });

        // Update actions in state immediately
        if (selectedFindingForAction && response.data) {
          setFindingActions(prev => ({
            ...prev,
            [selectedFindingForAction]: [...(prev[selectedFindingForAction] || []), response.data!]
          }));

          // Check and auto-update finding status based on action statuses
          await checkAndUpdateFindingStatus(selectedFindingForAction);
        }

        addNotification({
          type: 'success',
          message: 'Finding action created successfully',
        });
      }

      // Don't close modal after update - keep it open in view mode
      // Only close modal for create action if not editing
      if (!editingAction) {
        setShowNewActionForm(false);
        setActionFormData({
          action_description: '',
          due_date: '',
          audit_lead: '',
          action_responsible: '',
          action_responsible_email: '',
          action_responsible_vp: '',
          action_responsible_clevel: '',
          status: 'open',
        });
        setActionFormErrors({});
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: error?.response?.data?.error || 'Failed to save finding action',
      });
    }
  };

  const handleDeleteAction = async () => {
    if (!deletingActionId || !deletingActionFindingId) return;

    try {
      await auditFindingService.deleteFindingAction(deletingActionId);
      addNotification({
        type: 'success',
        message: 'Finding action deleted successfully',
      });
      setShowDeleteActionConfirm(false);
      setDeletingActionId(null);
      setDeletingActionFindingId(null);
      await loadFindingActions(deletingActionFindingId);
      // Close action modal if it's open
      if (showActionModal) {
        handleCloseActionModal();
      }
      // Re-check finding status after action deletion
      await checkAndUpdateFindingStatus(deletingActionFindingId);
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: error?.response?.data?.error || 'Failed to delete finding action',
      });
    }
  };

  // Helper function to strip HTML and get plain text (preserving lists)
  const stripHtml = (html: string | undefined | null): string => {
    if (!html) return '';
    // Create a temporary div element
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Helper function to render HTML with lists and links preserved for display
  const renderHtmlWithLists = (html: string | undefined | null, clampLines: number = 2): JSX.Element => {
    if (!html) return <span>-</span>;
    
    // Check if HTML contains lists or links
    const hasLists = /<[ou]l>|<li>/i.test(html);
    const hasLinks = /<a[^>]*>/i.test(html);
    
    if (hasLists || hasLinks) {
      // Preserve list structure and links, but clean up other tags
      let cleaned = html
        .replace(/<p>/gi, '')
        .replace(/<\/p>/gi, '');
      
      // Process links to make them clickable and show URL on hover
      cleaned = cleaned.replace(/<a([^>]*)>/gi, (_match, attrs) => {
        const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
        const href = hrefMatch ? hrefMatch[1] : '';
        // Preserve the link but ensure it has target and title, and add data-href for tooltip
        return `<a${attrs} target="_blank" rel="noopener noreferrer" title="${href}" data-href="${href}" class="list-hyperlink" style="color: #2563eb; text-decoration: underline; cursor: pointer; position: relative;">`;
      });
      
      const clampClass = clampLines === 1 ? 'line-clamp-1' : 'line-clamp-2';
      const containerId = `html-content-${Math.random().toString(36).substr(2, 9)}`;
      
      return (
        <>
          <div 
            id={containerId}
            className={`${clampClass} prose prose-sm max-w-none html-content-list`}
            style={{ 
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
            }}
            dangerouslySetInnerHTML={{ __html: cleaned }}
            onClick={(e) => {
              // Handle link clicks
              const target = e.target as HTMLElement;
              if (target.tagName === 'A') {
                const href = target.getAttribute('href');
                if (href) {
                  e.preventDefault();
                  window.open(href, '_blank', 'noopener,noreferrer');
                }
              }
            }}
          />
          <ListLinkTooltip containerId={containerId} />
          <style>{`
            .html-content-list ul,
            .html-content-list ol {
              margin: 0.25rem 0 !important;
              padding-left: 1.5rem !important;
              list-style-position: outside !important;
            }
            .html-content-list ul {
              list-style-type: disc !important;
            }
            .html-content-list ol {
              list-style-type: decimal !important;
            }
            .html-content-list li {
              margin: 0.125rem 0 !important;
              padding-left: 0.25rem !important;
            }
            .html-content-list ul li {
              list-style-type: disc !important;
            }
            .html-content-list ol li {
              list-style-type: decimal !important;
            }
            .html-content-list a {
              color: #2563eb !important;
              text-decoration: underline !important;
              cursor: pointer !important;
            }
            .html-content-list a:hover {
              color: #1d4ed8 !important;
            }
          `}</style>
        </>
      );
    }
    
    // No lists or links, use plain text
    const clampClass = clampLines === 1 ? 'line-clamp-1' : 'line-clamp-2';
    return <span className={clampClass}>{stripHtml(html) || '-'}</span>;
  };

  // Helper function to capitalize dropdown values
  const capitalizeValue = (value: string | undefined | null): string => {
    if (!value) return '';
    return value.split(' ').map(word => {
      if (word.includes('&')) {
        return word.split('&').map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join('&');
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  };

  // Format financial impact for display (e.g., 12342.00 -> "12,342.00")
  const formatFinancialImpact = (value: number | string | null | undefined): string => {
    if (!value && value !== 0) return '';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '';
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-2 md:space-y-6 p-0 md:p-6">
      {/* Compact Header with Inline Button */}
      <div className="flex items-start md:items-center justify-between gap-2 px-3 md:px-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-base md:text-[24px] font-bold text-gray-900">Audit Finding</h1>
          <p className="text-[11px] md:text-base text-gray-600 mt-0.5 md:mt-1">Manage audit findings and their related actions</p>
        </div>
        {viewMode === 'findings' && (
          <div className="relative flex-shrink-0" ref={addFindingButtonRef}>
        <Button
          variant="primary"
              onClick={() => setShowAddFindingDropdown(!showAddFindingDropdown)}
              className={cn(
                "flex items-center justify-center gap-0.5 md:gap-1",
                isMobile ? "!text-[8px] px-1.5 py-1 h-6" : "text-base px-4 h-auto"
              )}
        >
              <svg className={cn(isMobile ? "w-2.5 h-2.5" : "w-5 h-5")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
              <span className={cn("hidden md:inline", isMobile && "!text-[8px]")}>Add Finding</span>
              <span className={cn("md:hidden", isMobile && "!text-[8px]")}>Add</span>
              <svg 
                className={cn(
                  "transition-transform",
                  isMobile ? "w-2 h-2" : "w-4 h-4",
                  showAddFindingDropdown ? 'rotate-180' : ''
                )}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
        </Button>
            
            {showAddFindingDropdown && (
              <div className={cn(
                "absolute right-0 bg-white rounded-md md:rounded-lg shadow-xl border border-gray-200 z-50",
                isMobile ? "mt-0.5 w-[200px] py-0.5" : "mt-2 w-72 py-2"
              )}>
                <button
                  onClick={() => {
                    setFindingCreationMode('single');
                    setShowFindingCreationModal(true);
                    setShowAddFindingDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left hover:bg-gray-50 transition-colors flex items-center group",
                    isMobile ? "px-2 py-1 gap-1.5" : "px-4 py-3 gap-3"
                  )}
                >
                  <div className={cn(
                    "flex-shrink-0 rounded-md md:rounded-lg bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center transition-colors",
                    isMobile ? "w-5 h-5" : "w-10 h-10"
                  )}>
                    <svg className={cn("text-purple-600", isMobile ? "w-2.5 h-2.5" : "w-5 h-5")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
            </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn("font-medium text-gray-900", isMobile ? "text-[9px]" : "text-sm")}>Add from Dashboard</div>
                    <div className={cn("text-gray-500", isMobile ? "text-[8px] mt-0" : "text-xs mt-0.5")}>Add findings using the form</div>
                  </div>
                </button>
                
                <div className={cn("border-t border-gray-100", isMobile ? "my-0.5" : "my-1")}></div>
                
                <button
                  onClick={() => {
                    setFindingCreationMode('bulk');
                    setShowFindingCreationModal(true);
                    setShowAddFindingDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left hover:bg-gray-50 transition-colors flex items-center group",
                    isMobile ? "px-2 py-1 gap-1.5" : "px-4 py-3 gap-3"
                  )}
                >
                  <div className={cn(
                    "flex-shrink-0 rounded-md md:rounded-lg bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors",
                    isMobile ? "w-5 h-5" : "w-10 h-10"
                  )}>
                    <svg className={cn("text-blue-600", isMobile ? "w-2.5 h-2.5" : "w-5 h-5")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn("font-medium text-gray-900", isMobile ? "text-[9px]" : "text-sm")}>Bulk Add from Excel/CSV</div>
                    <div className={cn("text-gray-500", isMobile ? "text-[8px] mt-0" : "text-xs mt-0.5")}>Import findings from file</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
        </div>


      {/* Findings Table or Actions Table */}
      <Card className="overflow-hidden">
        <div className="p-2 md:p-4 pb-2 md:pb-3 border-b border-gray-200 px-3 md:px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-[6.4px] md:gap-[12.8px]">
            <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5 inline-flex w-fit">
              <button
                onClick={() => setViewMode('findings')}
                className={`px-2 md:px-3 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium transition-colors ${viewMode === 'findings'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Findings
              </button>
              <button
                onClick={() => setViewMode('actions')}
                className={`px-2 md:px-3 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium transition-colors ${viewMode === 'actions'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Actions
              </button>
            </div>
            {/* Mobile: Ultra Compact Filter Panel */}
            <div className="block md:hidden space-y-1">
              {/* Top Bar: Search + Filter Button */}
              <div className="flex items-center gap-1.5">
                {/* Ultra Compact Search */}
                <div className="flex-1">
                  <SearchInput
                    onSearch={(value) => setSearchTerm(value)}
                    placeholder={viewMode === 'actions' ? 'Search...' : 'Search...'}
                    className="h-[32px] text-[11px] [&>input]:h-[32px] [&>input]:text-[11px] [&>input]:py-1 [&_svg]:w-3 [&_svg]:h-3"
                  />
                </div>
                {/* Ultra Compact Filter Button */}
                <button
                  onClick={() => setMobileFiltersExpanded(!mobileFiltersExpanded)}
                  className={`relative flex items-center gap-1 px-2 h-[32px] rounded-md font-medium text-[11px] transition-all ${mobileFiltersExpanded
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-purple-400'
                    }`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="text-[10px] font-bold">Filters</span>
                  {/* Mini Count Badge */}
                  {(() => {
                    const activeCount = [
                      filterStatus !== 'all',
                      filterRiskLevel !== 'all',
                      filterAuditName !== 'all',
                      filterAuditYear !== 'all',
                      viewMode === 'actions' && filterActionResponsible !== 'all'
                    ].filter(Boolean).length;
                    return activeCount > 0 ? (
                      <span className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center ${mobileFiltersExpanded ? 'bg-white text-purple-600' : 'bg-purple-600 text-white'
                        }`}>
                        {activeCount}
                      </span>
                    ) : null;
                  })()}
                </button>
              </div>

              {/* Ultra Compact Filter Chips */}
              {(() => {
                const activeFilters = [
                  { key: 'status', value: filterStatus, label: 'Status', display: capitalizeValue(filterStatus), setter: setFilterStatus },
                  { key: 'risk', value: filterRiskLevel, label: 'Risk', display: capitalizeValue(filterRiskLevel), setter: setFilterRiskLevel, show: viewMode === 'findings' },
                  { key: 'audit', value: filterAuditName, label: 'Audit', display: filterAuditName, setter: setFilterAuditName },
                  { key: 'year', value: filterAuditYear, label: 'Year', display: filterAuditYear, setter: setFilterAuditYear },
                  {
                    key: 'responsible', value: filterActionResponsible, label: 'Responsible', display: (() => {
                      const user = departmentDirectorUsers.find(u => u.email?.toLowerCase().trim() === filterActionResponsible.toLowerCase().trim());
                      return user ? user.name : filterActionResponsible;
                    })(), setter: setFilterActionResponsible, show: viewMode === 'actions'
                  }
                ].filter(f => f.value !== 'all' && f.show !== false);

                return activeFilters.length > 0 ? (
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
                    {activeFilters.map((filter) => (
                      <div
                        key={filter.key}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[9px] font-medium whitespace-nowrap"
                      >
                        <span className="font-semibold">{filter.label}:</span>
                        <span className="max-w-[80px] truncate">{filter.display}</span>
                        <button
                          onClick={() => filter.setter('all')}
                          className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                        >
                          <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {activeFilters.length > 0 && (
                      <button
                        onClick={() => {
                          setFilterStatus('all');
                          setFilterRiskLevel('all');
                          setFilterAuditName('all');
                          setFilterAuditYear('all');
                          setFilterActionResponsible('all');
                        }}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full text-[9px] font-medium whitespace-nowrap transition-colors"
                      >
                        <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Clear
                      </button>
                    )}
                  </div>
                ) : null;
              })()}

              {/* Ultra Compact Filter Panel */}
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out -mx-3 md:mx-0 w-[calc(100%+1.5rem)] md:w-auto"
                style={{
                  maxHeight: mobileFiltersExpanded ? '400px' : '0px',
                  opacity: mobileFiltersExpanded ? 1 : 0
                }}
              >
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-none md:rounded p-2 space-y-1.5 border-x-0 md:border-x border-t-0 md:border-t border-b border-purple-200">
                  {/* Mobile: All 4 filters in one row */}
                  <div className="flex md:flex-col gap-1 md:gap-0 md:space-y-1.5">
                    {/* Audit Name Filter */}
                    <div className="flex-1 md:flex-none">
                      <label className={cn("flex items-center gap-0.5 text-gray-700 mb-0.5", isMobile ? "text-[7px] font-medium" : "text-[9px] font-semibold")}>
                        <svg className={cn("text-indigo-600 flex-shrink-0", isMobile ? "w-2 h-2" : "w-2.5 h-2.5")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Audit</span>
                      </label>
                      <Select
                        value={filterAuditName}
                        onChange={(e) => setFilterAuditName(e.target.value)}
                        options={[
                          { value: 'all', label: 'All Audits' },
                          ...Array.from(new Set(
                            viewMode === 'actions'
                              ? allActions.map(a => a.audit_name).filter(name => name)
                              : findings.map(f => f.audit_name).filter(name => name)
                          ))
                            .sort()
                            .map(name => ({ value: name, label: name })),
                        ]}
                        placeholder="Audit"
                        fullWidth
                        className={cn(
                          isMobile 
                            ? "h-[28px] text-[10px] [&>select]:!text-[10px] [&>select]:!py-0 [&>select]:!px-1.5 [&>select]:!leading-[28px] [&>select]:!h-[28px]" 
                            : "h-[32px] text-[11px] [&>select]:text-[11px] [&>select]:py-1"
                        )}
                      />
                    </div>

                    {/* Year Filter */}
                    <div className="flex-1 md:flex-none">
                      <label className={cn("flex items-center gap-0.5 text-gray-700 mb-0.5", isMobile ? "text-[7px] font-medium" : "text-[9px] font-semibold")}>
                        <svg className={cn("text-green-600 flex-shrink-0", isMobile ? "w-2 h-2" : "w-2.5 h-2.5")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Year</span>
                      </label>
                      <Select
                        value={filterAuditYear}
                        onChange={(e) => setFilterAuditYear(e.target.value)}
                        options={[
                          { value: 'all', label: 'All Years' },
                          ...auditYearOptions.map(opt => ({ value: opt, label: opt })),
                        ]}
                        placeholder="Year"
                        fullWidth
                        className={cn(
                          isMobile 
                            ? "h-[28px] text-[10px] [&>select]:!text-[10px] [&>select]:!py-0 [&>select]:!px-1.5 [&>select]:!leading-[28px] [&>select]:!h-[28px]" 
                            : "h-[32px] text-[11px] [&>select]:text-[11px] [&>select]:py-1"
                        )}
                      />
                    </div>

                    {/* Status Filter */}
                    <div className="flex-1 md:flex-none">
                      <label className={cn("flex items-center gap-0.5 text-gray-700 mb-0.5", isMobile ? "text-[7px] font-medium" : "text-[9px] font-semibold")}>
                        <svg className={cn("text-purple-600 flex-shrink-0", isMobile ? "w-2 h-2" : "w-2.5 h-2.5")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Status</span>
                      </label>
                      <Select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        options={[
                          { value: 'all', label: 'All Statuses' },
                          ...statusOptions.map(opt => ({ value: opt, label: capitalizeValue(opt) })),
                        ]}
                        placeholder="Status"
                        fullWidth
                        className={cn(
                          isMobile 
                            ? "h-[28px] text-[10px] [&>select]:!text-[10px] [&>select]:!py-0 [&>select]:!px-1.5 [&>select]:!leading-[28px] [&>select]:!h-[28px]" 
                            : "h-[32px] text-[11px] [&>select]:text-[11px] [&>select]:py-1"
                        )}
                      />
                    </div>

                    {/* Risk Level Filter (Findings only) */}
                    {viewMode === 'findings' && (
                      <div className="flex-1 md:flex-none">
                        <label className={cn("flex items-center gap-0.5 text-gray-700 mb-0.5", isMobile ? "text-[7px] font-medium" : "text-[9px] font-semibold")}>
                          <svg className={cn("text-red-600 flex-shrink-0", isMobile ? "w-2 h-2" : "w-2.5 h-2.5")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>Risk</span>
                        </label>
                        <Select
                          value={filterRiskLevel}
                          onChange={(e) => setFilterRiskLevel(e.target.value)}
                          options={[
                            { value: 'all', label: 'All Risk Levels' },
                            ...riskLevelOptions.map(opt => ({ value: opt, label: capitalizeValue(opt) })),
                          ]}
                          placeholder="Risk"
                          fullWidth
                          className={cn(
                            isMobile 
                              ? "h-[28px] text-[10px] [&>select]:!text-[10px] [&>select]:!py-0 [&>select]:!px-1.5 [&>select]:!leading-[28px] [&>select]:!h-[28px]" 
                              : "h-[32px] text-[11px] [&>select]:text-[11px] [&>select]:py-1"
                          )}
                        />
                      </div>
                    )}
                  </div>

                  {/* Action Responsible Filter (Actions only) */}
                  {viewMode === 'actions' && (
                    <div>
                      <label className="flex items-center gap-1 text-[9px] font-semibold text-gray-700 mb-0.5">
                        <svg className="w-2.5 h-2.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Responsible
                      </label>
                      <Select
                        value={filterActionResponsible}
                        onChange={(e) => setFilterActionResponsible(e.target.value)}
                        options={[
                          { value: 'all', label: 'All Responsible' },
                          ...Array.from(new Set(
                            allActions.map(a => a.action_responsible).filter((email): email is string => !!email)
                          ))
                            .sort()
                            .map(email => {
                              const user = departmentDirectorUsers.find(u =>
                                u.email?.toLowerCase().trim() === email.toLowerCase().trim()
                              );
                              return {
                                value: email,
                                label: user ? user.name : email
                              };
                            }),
                        ]}
                        placeholder="Select responsible"
                        fullWidth
                        className="h-[32px] text-[11px] [&>select]:text-[11px] [&>select]:py-1"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Desktop: Original Layout */}
            <div className="hidden md:flex md:flex-row md:items-center gap-2 md:justify-end">
              <div className="w-64">
                <SearchInput
                  onSearch={(value) => setSearchTerm(value)}
                  placeholder={viewMode === 'actions' ? 'Search actions...' : 'Search findings...'}
                />
              </div>
              <div className="w-40">
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    ...statusOptions.map(opt => ({ value: opt, label: capitalizeValue(opt) })),
                  ]}
                  placeholder="Status"
                  fullWidth
                  className="py-1.5 text-sm [&>select]:text-gray-900"
                />
              </div>
              {viewMode === 'findings' && (
                <div className="w-44">
                  <Select
                    value={filterRiskLevel}
                    onChange={(e) => setFilterRiskLevel(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Risk Levels' },
                      ...riskLevelOptions.map(opt => ({ value: opt, label: capitalizeValue(opt) })),
                    ]}
                    placeholder="Risk Level"
                    fullWidth
                    className="py-1.5 text-sm [&>select]:text-gray-900"
                  />
                </div>
              )}
              <div className="w-48">
                <Select
                  value={filterAuditName}
                  onChange={(e) => setFilterAuditName(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Audits' },
                    ...Array.from(new Set(
                      viewMode === 'actions'
                        ? allActions.map(a => a.audit_name).filter(name => name)
                        : findings.map(f => f.audit_name).filter(name => name)
                    ))
                      .sort()
                      .map(name => ({ value: name, label: name })),
                  ]}
                  placeholder="Audit Name"
                  fullWidth
                  className="py-1.5 text-sm"
                />
              </div>
              <div className="w-36">
                <Select
                  value={filterAuditYear}
                  onChange={(e) => setFilterAuditYear(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Years' },
                    ...auditYearOptions.map(opt => ({ value: opt, label: opt })),
                  ]}
                  placeholder="Audit Year"
                  fullWidth
                  className="py-1.5 text-sm"
                />
              </div>
              {viewMode === 'actions' && (
                <div className="w-56">
                  <Select
                    value={filterActionResponsible}
                    onChange={(e) => setFilterActionResponsible(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Responsible' },
                      ...Array.from(new Set(
                        allActions.map(a => a.action_responsible).filter((email): email is string => !!email)
                      ))
                        .sort()
                        .map(email => {
                          const user = departmentDirectorUsers.find(u =>
                            u.email?.toLowerCase().trim() === email.toLowerCase().trim()
                          );
                          return {
                            value: email,
                            label: user ? user.name : email
                          };
                        }),
                    ]}
                    placeholder="Action Responsible"
                    fullWidth
                    className="py-1.5 text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {viewMode === 'actions' ? (
            <>
              {/* Mobile Card View for Actions - Ultra Compact List Style */}
              <div className="block md:hidden space-y-1 -mx-3 md:mx-0 w-[calc(100%+1.5rem)] md:w-auto">
                {loadingActions ? (
                  <div className="flex justify-center py-12 px-3">
                    <Loading size="md" />
                  </div>
                ) : filteredActions.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 px-3">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <p className="text-sm">No actions found</p>
                  </div>
                ) : (
                  filteredActions.map((action) => {
                    const finding = findings.find(f => f.id === action.finding_id);
                    return (
                      <div
                        key={action.id}
                        onClick={() => finding && handleViewAction(finding.id, action)}
                        className="group relative bg-white border-l-2 border-gray-200 hover:border-purple-500 rounded-r shadow-sm hover:shadow transition-all duration-150 active:scale-[0.98] cursor-pointer"
                        style={{
                          borderLeftColor: action.status === 'completed' ? '#22c55e' :
                            action.status === 'in_progress' ? '#3b82f6' :
                              action.status === 'overdue' ? '#ef4444' : '#9ca3af'
                        }}
                      >
                        <div className="px-2.5 py-1.5">
                          {/* Single Row - Ultra Compact */}
                          <div className="flex items-center justify-between gap-2">
                            {/* Left: ID & Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-0.5 mb-0.5">
                                <span className="text-[9px] font-mono font-bold text-purple-600">
                                  {action.action_id}
                                </span>
                                <Badge variant={getActionStatusBadgeVariant(action.status)} className="!text-[6px] !px-0.5 !py-0 !h-2.5 !leading-none !min-w-[18px] !rounded flex items-center justify-center font-bold">
                                  {capitalizeValue(action.status).substring(0, 3)}
                                </Badge>
                              </div>
                              {finding && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewFinding(finding);
                                  }}
                                  className="text-[9px] text-purple-600 hover:text-purple-700 hover:underline font-medium"
                                >
                                  {finding.finding_id.replace(/-\d{4}-/, '-')}
                                </button>
                              )}
                              <div className="flex items-center gap-2 mt-0.5 text-[9px] text-gray-500">
                                {action.due_date && (
                                  <span>{new Date(action.due_date).toLocaleDateString()}</span>
                                )}
                                {action.action_responsible_email && (
                                  <span className="truncate max-w-[120px]">{action.action_responsible_email}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {/* Desktop Table View for Actions */}
              <div className="hidden md:block relative">
                <table className="w-full shadow-sm rounded-lg overflow-hidden border border-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Finding ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action Description
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action Responsible
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loadingActions ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <Loading size="md" />
                        </td>
                      </tr>
                    ) : filteredActions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          No actions found
                        </td>
                      </tr>
                    ) : (
                      filteredActions.map((action) => {
                        const finding = findings.find(f => f.id === action.finding_id);
                        return (
                          <tr key={action.id} className="hover:bg-purple-50/50 transition-colors duration-150 border-b border-gray-100">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                              {action.action_id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {finding ? (
                                <button
                                  onClick={() => handleViewFinding(finding)}
                                  className="text-purple-600 hover:text-purple-800 hover:underline cursor-pointer"
                                >
                                  {finding.finding_id}
                                </button>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {renderHtmlWithLists(action.action_description)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant={getActionStatusBadgeVariant(action.status)}>
                                {capitalizeValue(action.status)}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {action.due_date ? new Date(action.due_date).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {action.action_responsible_email || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (finding) {
                                    handleViewAction(finding.id, action);
                                  }
                                }}
                                className="text-xs px-2 py-1"
                              >
                                View
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              {/* Mobile Card View for Findings - Ultra Compact List Style */}
              <div className="block md:hidden space-y-1 -mx-3 md:mx-0 w-[calc(100%+1.5rem)] md:w-auto">
                {filteredFindings.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 px-3">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm">No findings found</p>
                  </div>
                ) : (
                  filteredFindings.map((finding) => (
                    <div
                      key={finding.id}
                      onClick={() => handleViewFinding(finding)}
                      className="group relative bg-white border-l-2 border-gray-200 hover:border-purple-500 rounded-r shadow-sm hover:shadow transition-all duration-150 active:scale-[0.98] cursor-pointer"
                      style={{
                        borderLeftColor: finding.risk_level === 'high' ? '#ef4444' :
                          finding.risk_level === 'medium' ? '#eab308' :
                            finding.risk_level === 'low' ? '#22c55e' : '#9ca3af'
                      }}
                    >
                      <div className="px-2.5 py-1.5">
                        {/* Single Row - Ultra Compact */}
                        <div className="flex items-center justify-between gap-2">
                          {/* Left: ID & Name */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-0.5 mb-0.5">
                              <span className="text-[9px] font-mono font-bold text-purple-600">
                                {finding.finding_id.replace(/-\d{4}-/, '-')}
                              </span>
                              {finding.risk_level && (
                                <Badge variant={getRiskLevelBadgeVariant(finding.risk_level)} className="!text-[6px] !px-0.5 !py-0 !h-2.5 !leading-none !min-w-[12px] !rounded flex items-center justify-center font-bold">
                                  {capitalizeValue(finding.risk_level).charAt(0)}
                                </Badge>
                              )}
                              <Badge variant={getStatusBadgeVariant(finding.status)} className="!text-[6px] !px-0.5 !py-0 !h-2.5 !leading-none !min-w-[18px] !rounded flex items-center justify-center font-bold">
                                {capitalizeValue(finding.status).substring(0, 3)}
                              </Badge>
                            </div>
                            <h3 className="text-[11px] font-semibold text-gray-900 line-clamp-1 group-hover:text-purple-600 transition-colors">
                              {finding.finding_name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5 text-[9px] text-gray-500">
                              <span className="truncate flex-1 min-w-0">{finding.audit_name}</span>
                              <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
                                <span className="text-gray-400 whitespace-nowrap">({findingActions[finding.id]?.length || 0})</span>
                                {finding.financial_impact && (
                                  <span className="text-purple-600 font-semibold whitespace-nowrap">€{formatFinancialImpact(finding.financial_impact)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Right: Actions Count & Menu */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {findingActions[finding.id] && (findingActions[finding.id]?.length || 0) > 0 && (
                              <span className="bg-purple-100 text-purple-700 px-1 py-0.5 rounded text-[8px] font-bold h-4 flex items-center justify-center min-w-[16px]">
                                {findingActions[finding.id]?.length || 0}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuOpen(actionMenuOpen === finding.id ? null : finding.id);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-all"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>
                            {actionMenuOpen === finding.id && (
                              <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenActionModal(finding.id);
                                    loadFindingActions(finding.id);
                                    setViewingAction(null);
                                    setEditingAction(null);
                                    setShowNewActionForm(false);
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 text-[10px] text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  <span>View</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenActionModal(finding.id);
                                    loadFindingActions(finding.id);
                                    setViewingAction(null);
                                    setEditingAction(null);
                                    setShowNewActionForm(true);
                                    setActionFormData({
                                      action_description: '',
                                      due_date: '',
                                      audit_lead: '',
                                      action_responsible: '',
                                      action_responsible_email: '',
                                      action_responsible_vp: '',
                                      action_responsible_clevel: '',
                                      status: '',
                                    });
                                    setActionFormErrors({});
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 text-[10px] text-purple-600 hover:bg-purple-50 flex items-center gap-1.5"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  <span>New</span>
                                </button>
                                <div className="border-t border-gray-200 my-1"></div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingFindingId(finding.id);
                                    setShowDeleteConfirm(true);
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 text-[10px] text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Desktop Table View for Findings */}
              <div className="hidden md:block relative">
                <table ref={tableRef} className="w-full shadow-lg rounded-xl overflow-hidden border-0 bg-white">
                  <thead className="sticky top-0 z-10 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 shadow-md border-b-4 border-purple-800/30">
                    <tr className="min-h-[3rem]">
                    <ResizableTableHeader
                      columnKey="findingId"
                      width={columnWidths.findingId}
                      onResizeStart={handleMouseDown}
                      isResizing={resizing === 'findingId'}
                      className="border-r border-purple-500/30 text-center"
                    >
                      <span className="px-6 py-5 text-center text-xs font-extrabold text-white uppercase tracking-wider drop-shadow-sm">
                      ID
                      </span>
                    </ResizableTableHeader>
                    <ResizableTableHeader
                      columnKey="findingName"
                      width={columnWidths.findingName}
                      onResizeStart={handleMouseDown}
                      isResizing={resizing === 'findingName'}
                      className="border-r border-purple-500/30 text-center"
                    >
                      <span className="px-6 py-5 text-center text-xs font-extrabold text-white uppercase tracking-wider drop-shadow-sm">
                      Name
                      </span>
                    </ResizableTableHeader>
                    <ResizableTableHeader
                      columnKey="auditName"
                      width={columnWidths.auditName}
                      onResizeStart={handleMouseDown}
                      isResizing={resizing === 'auditName'}
                      className="border-r border-purple-500/30 text-center"
                    >
                      <span className="px-6 py-5 text-center text-xs font-extrabold text-white uppercase tracking-wider drop-shadow-sm">
                        Audit
                      </span>
                    </ResizableTableHeader>
                    <ResizableTableHeader
                      columnKey="findingDescription"
                      width={columnWidths.findingDescription}
                      onResizeStart={handleMouseDown}
                      isResizing={resizing === 'findingDescription'}
                      className="border-r border-purple-500/30 text-center"
                    >
                      <span className="px-6 py-5 text-center text-xs font-extrabold text-white uppercase tracking-wider drop-shadow-sm">
                        Finding Description
                      </span>
                    </ResizableTableHeader>
                    <ResizableTableHeader
                      columnKey="riskLevel"
                      width={columnWidths.riskLevel}
                      onResizeStart={handleMouseDown}
                      isResizing={resizing === 'riskLevel'}
                      className="border-r border-purple-500/30 text-center"
                    >
                      <span className="px-6 py-5 text-center text-xs font-extrabold text-white uppercase tracking-wider drop-shadow-sm">
                      Risk Level
                      </span>
                    </ResizableTableHeader>
                    <ResizableTableHeader
                      columnKey="status"
                      width={columnWidths.status}
                      onResizeStart={handleMouseDown}
                      isResizing={resizing === 'status'}
                      className="border-r border-purple-500/30 text-center"
                    >
                      <span className="px-6 py-5 text-center text-xs font-extrabold text-white uppercase tracking-wider drop-shadow-sm">
                      Status
                      </span>
                    </ResizableTableHeader>
                    <ResizableTableHeader
                      columnKey="financialImpact"
                      width={columnWidths.financialImpact}
                      onResizeStart={handleMouseDown}
                      isResizing={resizing === 'financialImpact'}
                      className="border-r border-purple-500/30 text-center"
                    >
                      <span className="px-6 py-5 text-center text-xs font-extrabold text-white uppercase tracking-wider drop-shadow-sm">
                      Impact (€)
                      </span>
                    </ResizableTableHeader>
                    <ResizableTableHeader
                      columnKey="actions"
                      width={columnWidths.actions}
                      onResizeStart={handleMouseDown}
                      isResizing={resizing === 'actions'}
                      className="text-center"
                    >
                      <span className="px-6 py-5 text-center text-xs font-extrabold text-white uppercase tracking-wider drop-shadow-sm" title="Actions">
                      ⚙️
                      </span>
                    </ResizableTableHeader>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredFindings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        No audit findings found
                      </td>
                    </tr>
                  ) : (
                    filteredFindings.map((finding, index) => (
                      <React.Fragment key={finding.id}>
                        <tr 
                            className={`group transition-all duration-200 ${index % 2 === 0
                              ? 'bg-white hover:bg-gradient-to-r hover:from-purple-50/30 hover:to-indigo-50/30' 
                              : 'bg-slate-50/50 hover:bg-gradient-to-r hover:from-purple-50/40 hover:to-indigo-50/40'
                          } border-b border-slate-200/60`}
                        >
                          <td style={{ width: columnWidths.findingId }} className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-purple-700 border-r border-slate-200/60 align-top">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleFindingExpansion(finding.id)}
                                className="text-slate-400 hover:text-purple-600 transition-all duration-200 hover:scale-110"
                                title={expandedFindings.has(finding.id) ? 'Collapse' : 'Expand'}
                              >
                                <svg
                                  className={`w-4 h-4 transition-transform duration-200 ${expandedFindings.has(finding.id) ? 'rotate-90' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleViewFinding(finding)}
                                className="text-purple-600 hover:text-purple-800 hover:underline cursor-pointer font-semibold transition-colors"
                                title={finding.finding_id}
                              >
                                {finding.finding_id.replace(/-\d{4}-/, '-')}
                              </button>
                            </div>
                          </td>
                          <td style={{ width: columnWidths.findingName }} className="px-6 py-4 text-sm font-medium text-slate-800 border-r border-slate-200/60 align-top leading-relaxed">
                            <div className="break-words">{finding.finding_name}</div>
                          </td>
                          <td style={{ width: columnWidths.auditName }} className="px-6 py-4 text-sm text-slate-700 border-r border-slate-200/60 align-top leading-relaxed">
                            <div className="break-words">{finding.audit_name}</div>
                          </td>
                          <td style={{ width: columnWidths.findingDescription }} className="px-6 py-4 text-sm text-slate-600 border-r border-slate-200/60 align-top leading-relaxed">
                            <div className="break-words line-clamp-3">{renderHtmlWithLists(finding.finding_description)}</div>
                          </td>
                          <td style={{ width: columnWidths.riskLevel }} className="px-6 py-4 whitespace-nowrap border-r border-slate-200/60 align-top">
                            {finding.risk_level && (
                              <Badge variant={getRiskLevelBadgeVariant(finding.risk_level)}>
                                {capitalizeValue(finding.risk_level)}
                              </Badge>
                            )}
                          </td>
                          <td style={{ width: columnWidths.status }} className="px-6 py-4 whitespace-nowrap border-r border-slate-200/60 align-top">
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setStatusDropdownOpen(statusDropdownOpen === finding.id ? null : finding.id)}
                                className="focus:outline-none"
                              >
                                <Badge variant={getStatusBadgeVariant(finding.status)} className="cursor-pointer hover:opacity-80 text-sm px-3 py-1">
                                  {capitalizeValue(finding.status)}
                                </Badge>
                              </button>
                              {statusDropdownOpen === finding.id && (
                                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px] py-1">
                                  {Array.from(new Set(statusOptions.filter(opt => opt !== 'overdue' && opt.toLowerCase() !== finding.status.toLowerCase()))).map((statusOption) => (
                                    <button
                                      key={statusOption}
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          // Ensure actions are loaded
                                          if (!findingActions[finding.id] || (findingActions[finding.id]?.length || 0) === 0) {
                                            await loadFindingActions(finding.id);
                                          }

                                          // Check if status can be set manually
                                          const statusCheck = await canSetFindingStatus(finding.id, statusOption);
                                          if (!statusCheck.canSet) {
                                            // Show error modal
                                            setStatusErrorModal({
                                              show: true,
                                              message: statusCheck.reason || 'Cannot set finding status',
                                              incompleteActions: statusCheck.incompleteActions || [],
                                              actionLabel: statusCheck.actionLabel || 'Incomplete actions:',
                                            });
                                            setStatusDropdownOpen(null);
                                            return;
                                          }

                                          await auditFindingService.updateAuditFinding(finding.id, {
                                            finding_name: finding.finding_name,
                                            finding_description: finding.finding_description,
                                            audit_type: finding.audit_type,
                                            audit_type_other: finding.audit_type_other,
                                            risk_type: finding.risk_type,
                                            internal_control_element: finding.internal_control_element,
                                            country: finding.country,
                                            audit_year: finding.audit_year,
                                            audit_name: finding.audit_name,
                                            audit_key: finding.audit_key,
                                            risk_level: finding.risk_level,
                                            financial_impact: finding.financial_impact,
                                            status: statusOption,
                                          });
                                          await loadData();
                                          setStatusDropdownOpen(null);
                                          addNotification({
                                            type: 'success',
                                            message: 'Finding status updated successfully',
                                          });
                                        } catch (error: any) {
                                          addNotification({
                                            type: 'error',
                                            message: error?.response?.data?.error || 'Failed to update finding status',
                                          });
                                        }
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg flex items-center gap-2"
                                    >
                                      <Badge variant={getStatusBadgeVariant(statusOption)} className="text-xs">
                                        {capitalizeValue(statusOption)}
                                      </Badge>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ width: columnWidths.financialImpact }} className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800 border-r border-slate-200/60 align-top">
                            {finding.financial_impact
                              ? `€${formatFinancialImpact(finding.financial_impact)}`
                              : <span className="text-slate-400">-</span>}
                          </td>
                          <td style={{ width: columnWidths.actions }} className="px-2 py-4 whitespace-nowrap text-right align-top">
                            <div className="relative inline-block">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionMenuOpen(actionMenuOpen === finding.id ? null : finding.id);
                                }}
                                className="text-xs px-1.5 py-1 min-w-0"
                                title="Actions"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </Button>
                              {actionMenuOpen === finding.id && (
                                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                  handleOpenActionModal(finding.id);
                                  loadFindingActions(finding.id);
                                  setViewingAction(null);
                                  setEditingAction(null);
                                  setShowNewActionForm(false);
                                      setActionMenuOpen(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    <span>View Actions</span>
                                    <Badge variant="info" className="ml-auto text-xs">
                                      {findingActions[finding.id]?.length || 0}
                                    </Badge>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                  handleOpenActionModal(finding.id);
                                  loadFindingActions(finding.id);
                                  setViewingAction(null);
                                  setEditingAction(null);
                                  setShowNewActionForm(true);
                                  setActionFormData({
                                    action_description: '',
                                    due_date: '',
                                    audit_lead: '',
                                    action_responsible: '',
                                    action_responsible_email: '',
                                    action_responsible_vp: '',
                                    action_responsible_clevel: '',
                                        status: '',
                                  });
                                  setActionFormErrors({});
                                      setActionMenuOpen(null);
                                }}
                                    className="w-full text-left px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 flex items-center gap-2"
                              >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                    <span>New Action</span>
                                  </button>
                                  <div className="border-t border-gray-200 my-1"></div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                  setDeletingFindingId(finding.id);
                                  setShowDeleteConfirm(true);
                                      setActionMenuOpen(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span>Delete Finding</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedFindings.has(finding.id) && (
                          <tr>
                            <td colSpan={8} className="px-6 py-4 bg-gray-50">
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Actions ({findingActions[finding.id]?.length || 0})</h4>
                                {findingActions[finding.id] && (findingActions[finding.id]?.length || 0) > 0 ? (
                                  <div className="bg-white border border-gray-200 rounded-lg overflow-visible">
                                    <table className="w-full text-xs">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-3 py-2 text-left font-semibold text-gray-700">ID</th>
                                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Description</th>
                                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Due Date</th>
                                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Action Responsible</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {findingActions[finding.id]?.map((action) => (
                                          <tr key={action.id} className="border-t border-gray-100 hover:bg-gray-50">
                                            <td className="px-3 py-2">
                                              <span
                                                className="font-mono text-purple-700 cursor-pointer hover:text-purple-900 hover:underline"
                                                onClick={() => handleViewAction(finding.id, action)}
                                              >
                                                {action.action_id}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2">
                                              <div className="relative" style={{ zIndex: actionStatusDropdownOpen === action.id ? 1000 : 'auto' }}>
                                                <button
                                                  type="button"
                                                  data-action-id={action.id}
                                                  ref={(el) => { actionButtonRefs.current[action.id] = el; }}
                                                  onClick={() => {
                                                    if (actionStatusDropdownOpen === action.id) {
                                                      setActionStatusDropdownOpen(null);
                                                      setActionDropdownPosition(null);
                                                    } else {
                                                      const button = actionButtonRefs.current[action.id];
                                                      if (button) {
                                                        const rect = button.getBoundingClientRect();
                                                        const windowHeight = window.innerHeight;
                                                        const windowWidth = window.innerWidth;
                                                        const dropdownHeight = 200; // max-h-[200px]
                                                        const dropdownWidth = 140; // min-w-[140px]

                                                        // Check if dropdown fits below
                                                        const fitsBelow = rect.bottom + dropdownHeight + 4 <= windowHeight;

                                                        if (fitsBelow) {
                                                          // Open below
                                                          setActionDropdownPosition({
                                                            top: rect.bottom + 4,
                                                            left: rect.left,
                                                            side: 'bottom'
                                                          });
                                                        } else {
                                                          // Open to the right
                                                          const fitsRight = rect.right + dropdownWidth + 4 <= windowWidth;
                                                          if (fitsRight) {
                                                            setActionDropdownPosition({
                                                              top: rect.top,
                                                              left: rect.right + 4,
                                                              side: 'right'
                                                            });
                                                          } else {
                                                            // Open to the left
                                                            setActionDropdownPosition({
                                                              top: rect.top,
                                                              left: rect.left - dropdownWidth - 4,
                                                              side: 'right'
                                                            });
                                                          }
                                                        }
                                                      }
                                                      setActionStatusDropdownOpen(action.id);
                                                    }
                                                  }}
                                                  className="focus:outline-none"
                                                >
                                                  <Badge variant={getActionStatusBadgeVariant(action.status)} className="text-xs cursor-pointer hover:opacity-80">
                                                    {capitalizeValue(action.status)}
                                                  </Badge>
                                                </button>
                                                {actionStatusDropdownOpen === action.id && actionDropdownPosition && (
                                                  <div
                                                    className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[1000] min-w-[140px] max-h-[200px] overflow-y-auto py-1"
                                                    style={{
                                                      top: `${actionDropdownPosition.top}px`,
                                                      left: `${actionDropdownPosition.left}px`
                                                    }}
                                                  >
                                                    {Array.from(new Set(statusOptions.filter(opt => opt !== 'overdue' && opt.toLowerCase() !== action.status.toLowerCase()))).map((statusOption) => (
                                                      <button
                                                        key={statusOption}
                                                        type="button"
                                                        onClick={async () => {
                                                          try {
                                                            await auditFindingService.updateFindingAction(action.id, {
                                                              action_description: action.action_description,
                                                              due_date: action.due_date,
                                                              audit_lead: action.audit_lead,
                                                              action_responsible: action.action_responsible,
                                                              action_responsible_email: action.action_responsible_email,
                                                              action_responsible_vp: action.action_responsible_vp,
                                                              action_responsible_clevel: action.action_responsible_clevel,
                                                              status: statusOption,
                                                            });

                                                            // Update action in state and check finding status with updated actions
                                                            setFindingActions(prev => {
                                                              const updatedActions = (prev[finding.id] || []).map(a =>
                                                                a.id === action.id ? { ...a, status: statusOption } : a
                                                              );

                                                              // Check and auto-update finding status based on updated action statuses
                                                              checkAndUpdateFindingStatus(finding.id, updatedActions);

                                                              return {
                                                                ...prev,
                                                                [finding.id]: updatedActions
                                                              };
                                                            });

                                                            setActionStatusDropdownOpen(null);
                                                            setActionDropdownPosition(null);
                                                            addNotification({
                                                              type: 'success',
                                                              message: 'Action status updated successfully',
                                                            });
                                                          } catch (error: any) {
                                                            addNotification({
                                                              type: 'error',
                                                              message: error?.response?.data?.error || 'Failed to update action status',
                                                            });
                                                          }
                                                        }}
                                                        className="w-full text-left px-3 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg flex items-center gap-2"
                                                      >
                                                        <Badge variant={getActionStatusBadgeVariant(statusOption)} className="text-xs">
                                                          {capitalizeValue(statusOption)}
                                                        </Badge>
                                                      </button>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-3 py-2 text-gray-700">
                                              {renderHtmlWithLists(action.action_description, 1)}
                                            </td>
                                            <td className="px-3 py-2 text-gray-600">
                                              {action.due_date ? new Date(action.due_date).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-3 py-2 text-gray-600">
                                              {action.action_responsible_email || '-'}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-gray-500 text-sm">
                                    No actions yet. Click "+ New Action" to create one.
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* View/Edit Modal - Only show for viewing or editing, not creating */}
      {showModal && (viewingFinding || editingFinding) && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            // Close modal when clicking on backdrop
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
          style={{ pointerEvents: 'auto' }}
        >
          <div 
            ref={modalContentRef}
            className="bg-white rounded-2xl md:rounded-2xl rounded-t-2xl shadow-2xl max-w-[95vw] md:max-w-6xl w-full max-h-[90vh] md:max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'auto' }}
          >
            {/* Modal Header */}
            <div className={cn(
              "bg-gradient-to-r from-purple-600 to-violet-600 rounded-t-2xl",
              isMobile ? "px-3 py-2" : "px-4 py-3 md:px-6 md:py-4"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className={cn(
                    "font-bold text-white truncate",
                    isMobile ? "text-xs" : "text-base md:text-[16px]"
                  )}>
                {viewingFinding ? 'View Audit Finding' : editingFinding ? 'Edit Audit Finding' : ''}
              </h2>
                  {viewingFinding && (
                    <p className={cn(
                      "text-purple-100 truncate",
                      isMobile ? "text-[10px] mt-0.5" : "text-xs md:text-sm mt-0.5 md:mt-1"
                    )}>
                      {viewingFinding.finding_name || viewingFinding.id}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleCloseModal}
                  className={cn(
                    "text-white hover:text-purple-200 transition-colors flex-shrink-0",
                    isMobile ? "p-1 ml-2" : "p-2"
                  )}
                >
                  <svg className={cn(isMobile ? "w-4 h-4" : "w-5 h-5 md:w-6 md:h-6")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className={cn(
              "overflow-y-auto",
              isMobile ? "p-2 space-y-2" : "p-3 md:p-6 space-y-3 md:space-y-6"
            )}>
              {/* Finding Actions Section - Show when viewing */}
              {viewingFinding && !isEditMode && (
                <div className={cn(isMobile ? "mb-2" : "mb-3 md:mb-6")}>
                  <div className={cn("flex flex-col", isMobile ? "gap-1.5 mb-2" : "gap-2 mb-3")}>
                    <div className={cn("flex items-center", isMobile ? "justify-between" : "justify-between")}>
                      {isMobile && <h3 className="text-[11px] font-semibold text-gray-700">Actions</h3>}
                      {/* Desktop: Buttons on left, Status badge on right */}
                      {!isMobile && (
                        <div className={cn(
                          "flex items-center flex-wrap",
                          "gap-1.5 md:gap-2"
                        )}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (!showFindingActionsList) {
                                loadFindingActions(viewingFinding.id);
                              }
                              setShowFindingActionsList(!showFindingActionsList);
                            }}
                            className="justify-center items-center gap-0.5 border-purple-300 text-purple-700 hover:bg-purple-50 text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5"
                          >
                            <svg className="text-purple-600 flex-shrink-0 w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span className="truncate">{showFindingActionsList ? 'Hide' : 'View'} <span className="text-purple-600 font-semibold">({findingActions[viewingFinding.id]?.length || 0})</span></span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleOpenActionModal(viewingFinding.id);
                              setViewingAction(null);
                              setEditingAction(null);
                              setShowNewActionForm(true);
                              setActionFormData({
                                action_description: '',
                                due_date: '',
                                audit_lead: '',
                                action_responsible: '',
                                action_responsible_email: '',
                                action_responsible_vp: '',
                                action_responsible_clevel: '',
                                status: '',
                              });
                              setActionFormErrors({});
                            }}
                            className="justify-center flex items-center gap-0.5 border-purple-300 text-purple-700 hover:bg-purple-50 text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5"
                          >
                            <svg className="flex-shrink-0 w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="truncate">New</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!showFindingHistory) {
                                setLoadingFindingHistory(true);
                                try {
                                  const response = await auditFindingService.getFindingHistory(viewingFinding.id);
                                  setFindingHistory(response.data || []);
                                } catch (error: any) {
                                  addNotification({
                                    type: 'error',
                                    message: error?.response?.data?.error || 'Failed to load history',
                                  });
                                } finally {
                                  setLoadingFindingHistory(false);
                                }
                                setShowFindingHistory(true);
                                setTimeout(() => {
                                  historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 100);
                              } else {
                                setShowFindingHistory(false);
                                setTimeout(() => {
                                  modalContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                                }, 100);
                              }
                            }}
                            className="justify-center flex items-center gap-0.5 border-purple-300 text-purple-700 hover:bg-purple-50 text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5"
                          >
                            <svg className="flex-shrink-0 w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="truncate">{showFindingHistory ? 'Hide' : 'View'} History</span>
                          </Button>
                        </div>
                      )}
                    {/* Finding Status - Show in view mode with dropdown - Right aligned */}
                      <div className="relative flex-shrink-0 ml-auto">
                      <button
                        type="button"
                        onClick={() => setStatusDropdownOpen(statusDropdownOpen === viewingFinding.id ? null : viewingFinding.id)}
                        className="focus:outline-none"
                      >
                          <Badge 
                            variant={getStatusBadgeVariant(viewingFinding.status)} 
                            className={cn(
                              "cursor-pointer hover:opacity-80",
                              isMobile ? "!text-[9px] !px-1.5 !py-0.5 !h-5" : "text-xs md:text-sm px-2 md:px-3 py-1 md:py-1"
                            )}
                          >
                          {capitalizeValue(viewingFinding.status)}
                        </Badge>
                      </button>
                      {statusDropdownOpen === viewingFinding.id && (
                        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px] py-1">
                          {statusOptions.filter(opt => {
                            if (opt === 'overdue') return false;
                            if (opt.toLowerCase() === viewingFinding.status.toLowerCase()) return false;
                            return true; // Show all options, check will be done on click
                          }).map((statusOption) => (
                            <button
                              key={statusOption}
                              type="button"
                              onClick={async () => {
                                try {
                                  // Ensure actions are loaded
                                  if (!findingActions[viewingFinding.id] || (findingActions[viewingFinding.id]?.length || 0) === 0) {
                                    await loadFindingActions(viewingFinding.id);
                                  }

                                  // Check if status can be set manually
                                  const statusCheck = await canSetFindingStatus(viewingFinding.id, statusOption);
                                  if (!statusCheck.canSet) {
                                    // Show error modal
                                    setStatusErrorModal({
                                      show: true,
                                      message: statusCheck.reason || 'Cannot set finding status',
                                      incompleteActions: statusCheck.incompleteActions || [],
                                      actionLabel: statusCheck.actionLabel || 'Incomplete actions:',
                                    });
                                    setStatusDropdownOpen(null);
                                    return;
                                  }

                                  await auditFindingService.updateAuditFinding(viewingFinding.id, {
                                    finding_name: viewingFinding.finding_name,
                                    finding_description: viewingFinding.finding_description,
                                    audit_type: viewingFinding.audit_type,
                                    audit_type_other: viewingFinding.audit_type_other,
                                    risk_type: viewingFinding.risk_type,
                                    internal_control_element: viewingFinding.internal_control_element,
                                    country: viewingFinding.country,
                                    audit_year: viewingFinding.audit_year,
                                    audit_name: viewingFinding.audit_name,
                                    audit_key: viewingFinding.audit_key,
                                    risk_level: viewingFinding.risk_level,
                                    financial_impact: viewingFinding.financial_impact,
                                    status: statusOption,
                                  });
                                  // Reload finding data
                                  const updatedFinding = await auditFindingService.getAuditFinding(viewingFinding.id);
                                  setViewingFinding(updatedFinding);
                                  await loadData();
                                  setStatusDropdownOpen(null);
                                  addNotification({
                                    type: 'success',
                                    message: 'Finding status updated successfully',
                                  });
                                } catch (error: any) {
                                  addNotification({
                                    type: 'error',
                                    message: error?.response?.data?.error || 'Failed to update finding status',
                                  });
                                }
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg flex items-center gap-2"
                            >
                              <Badge variant={getStatusBadgeVariant(statusOption)} className="text-xs">
                                {capitalizeValue(statusOption)}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                    <div className={cn(
                      "flex items-center flex-wrap",
                      isMobile ? "gap-0.5" : "gap-1.5 md:gap-2"
                    )}>
                      {isMobile ? (
                        <>
                          <button
                            onClick={() => {
                              if (!showFindingActionsList) {
                                loadFindingActions(viewingFinding.id);
                              }
                              setShowFindingActionsList(!showFindingActionsList);
                            }}
                            className="flex-1 min-w-0 flex items-center justify-center gap-0.5 px-1 py-0.5 h-5 text-[7px] border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                          >
                            <svg className="w-2 h-2 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span className="truncate">{showFindingActionsList ? 'Hide' : 'View'} <span className="text-purple-600 font-semibold">({findingActions[viewingFinding.id]?.length || 0})</span></span>
                          </button>
                          <button
                            onClick={() => {
                              handleOpenActionModal(viewingFinding.id);
                              setViewingAction(null);
                              setEditingAction(null);
                              setShowNewActionForm(true);
                              setActionFormData({
                                action_description: '',
                                due_date: '',
                                audit_lead: '',
                                action_responsible: '',
                                action_responsible_email: '',
                                action_responsible_vp: '',
                                action_responsible_clevel: '',
                                status: '',
                              });
                              setActionFormErrors({});
                            }}
                            className="flex-1 min-w-0 flex items-center justify-center gap-0.5 px-1 py-0.5 h-5 text-[7px] border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                          >
                            <svg className="w-2 h-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="truncate">New</span>
                          </button>
                          <button
                            onClick={async () => {
                              if (!showFindingHistory) {
                                setLoadingFindingHistory(true);
                                try {
                                  const response = await auditFindingService.getFindingHistory(viewingFinding.id);
                                  setFindingHistory(response.data || []);
                                } catch (error: any) {
                                  addNotification({
                                    type: 'error',
                                    message: error?.response?.data?.error || 'Failed to load history',
                                  });
                                } finally {
                                  setLoadingFindingHistory(false);
                                }
                                // Show history first, then scroll
                                setShowFindingHistory(true);
                                // Wait for DOM update, then scroll
                                setTimeout(() => {
                                  historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 100);
                              } else {
                                setShowFindingHistory(false);
                                // Scroll to top of modal
                                setTimeout(() => {
                                  modalContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                                }, 100);
                              }
                            }}
                            className="flex-1 min-w-0 flex items-center justify-center gap-0.5 px-1 py-0.5 h-5 text-[7px] border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                          >
                            <svg className="w-2 h-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="truncate">{showFindingHistory ? 'Hide' : 'View'} Hist</span>
                          </button>
                        </>
                      ) : null}
                    </div>
                  {showFindingActionsList && (
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 shadow-sm">
                      {findingActions[viewingFinding.id] && (findingActions[viewingFinding.id]?.length || 0) > 0 ? (
                        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded bg-white">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700">ID</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700">Description</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700">Due Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {findingActions[viewingFinding.id]?.map((action) => (
                                <tr key={action.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                                  <td className="px-3 py-2">
                                    <span
                                      className="font-mono text-purple-700 cursor-pointer hover:text-purple-900 hover:underline"
                                      onClick={() => handleViewAction(viewingFinding.id, action)}
                                    >
                                      {action.action_id}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <Badge
                                      variant={getActionStatusBadgeVariant(action.status)}
                                      className="text-xs"
                                    >
                                      {capitalizeValue(action.status)}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 text-gray-700">
                                    {renderHtmlWithLists(action.action_description, 1)}
                                  </td>
                                  <td className="px-3 py-2 text-gray-600">
                                    {action.due_date ? new Date(action.due_date).toLocaleDateString() : 'N/A'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500 text-sm">
                          <p>No actions yet. Click "New Action" to create one.</p>
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              )}

              <form onSubmit={async (e) => {
                console.log('Form submit event triggered');
                await handleSubmit(e);
              }} className="space-y-6">
                {/* Audit Year Selection - Only show for new findings */}
                {!viewingFinding && (
                  <>
                    <Select
                      label="Select Audit Year"
                      value={formData.selectedAuditYear}
                      onChange={(e) => {
                        handleAuditYearSelect(e.target.value);
                        // Update context if changed in modal
                        if (e.target.value) {
                          setAuditContext(prev => prev ? {
                            ...prev,
                            selectedAuditYear: e.target.value,
                            selectedAuditKey: '',
                            selectedAuditName: '',
                          } : {
                            selectedAuditYear: e.target.value,
                            selectedAuditKey: '',
                            selectedAuditName: '',
                          });
                        }
                      }}
                      options={[
                        { value: '', label: 'Select audit year...' },
                        ...auditYearOptions.map(year => ({
                          value: year,
                          label: year,
                        })),
                      ]}
                      required
                      error={formErrors.selectedAuditYear}
                      disabled={!!auditContext?.selectedAuditYear && !editingFinding}
                      fullWidth
                    />

                    {/* Audit Selection (only shown when year is selected) */}
                    {formData.selectedAuditYear && (
                      <Select
                        label="Select Audit"
                        value={formData.selectedAuditKey}
                        onChange={(e) => handleAuditSelect(e.target.value)}
                        options={[
                          { value: '', label: 'Select an audit...' },
                          ...filteredAudits.map(audit => ({
                            value: audit.key,
                            label: audit.summary,
                          })),
                        ]}
                        required
                        error={formErrors.audit_name}
                        disabled={!!auditContext?.selectedAuditKey && !editingFinding}
                        fullWidth
                      />
                    )}
                  </>
                )}

                {/* Finding Identity Section - Compact badge display */}
                {/* Show always when creating/editing, or when viewing and has values */}
                {(!viewingFinding || formData.audit_name || formData.audit_year || formData.audit_type || formData.risk_type || formData.risk_level || formData.internal_control_element || formData.country) && (
                  <div className={cn(
                    "border rounded-lg",
                    isMobile ? "bg-white border-gray-200 p-1.5 mb-2" : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 p-3 md:p-4 mb-4 md:mb-6"
                  )}>
                      {/* Audit Name - Full width on top */}
                      {formData.audit_name && (
                      <div className={cn("mb-1.5 pb-1.5 border-b", isMobile ? "border-gray-200" : "border-blue-200")}>
                        <span className={cn("font-medium text-gray-600 mr-1.5", isMobile ? "text-[9px]" : "text-xs")}>Audit:</span>
                        <span className={cn("font-semibold text-gray-900", isMobile ? "text-[10px]" : "text-sm")}>{formData.audit_name}</span>
                          {formData.audit_year && (
                          <span className={cn("text-gray-500 ml-1.5", isMobile ? "text-[9px]" : "text-xs")}>({formData.audit_year})</span>
                          )}
                        </div>
                      )}

                    {/* Compact badges for other fields - Grid layout for mobile */}
                    <div className={cn(
                      "flex items-center",
                      isMobile ? "flex-wrap gap-1" : "flex-wrap gap-2 md:gap-3"
                    )}>
                      {/* Show always when creating/editing, or when viewing and has value */}
                      {(!viewingFinding || formData.audit_type) && (
                        <div className={cn("flex items-center", isMobile ? "gap-0.5" : "gap-1.5")}>
                          {!isMobile && <span className="text-[10px] font-medium text-gray-600">Type:</span>}
                          {viewingFinding && !isEditMode ? (
                            <Badge variant="info" className={cn(isMobile ? "!text-[8px] !px-1 !py-0.5 !h-4" : "text-xs")}>
                              {capitalizeValue(formData.audit_type)}
                            </Badge>
                          ) : (
                            <Select
                              value={formData.audit_type}
                              onChange={(e) => {
                                setFormData(prev => ({ ...prev, audit_type: e.target.value, audit_type_other: '' }));
                                setFormErrors(prev => ({ ...prev, audit_type: '' }));
                              }}
                              options={auditTypeOptions.map(opt => ({ value: opt, label: capitalizeValue(opt) }))}
                              placeholder="Select..."
                              required
                              error={formErrors.audit_type}
                              disabled={!!(viewingFinding && !isEditMode)}
                              className={isMobile ? "min-w-[90px]" : "min-w-[140px]"}
                            />
                          )}
                        </div>
                      )}

                      {/* Show always when creating/editing, or when viewing and has value */}
                      {(!viewingFinding || formData.risk_type) && (
                        <div className={cn("flex items-center", isMobile ? "gap-0.5" : "gap-1.5")}>
                          {!isMobile && <span className="text-[10px] font-medium text-gray-600">Risk:</span>}
                          {viewingFinding && !isEditMode ? (
                            <Badge variant="warning" className={cn(isMobile ? "!text-[8px] !px-1 !py-0.5 !h-4" : "text-xs")}>
                              {capitalizeValue(formData.risk_type)}
                            </Badge>
                          ) : (
                            <Select
                              value={formData.risk_type}
                              onChange={(e) => {
                                setFormData(prev => ({ ...prev, risk_type: e.target.value }));
                                setFormErrors(prev => ({ ...prev, risk_type: '' }));
                              }}
                              options={riskTypeOptions.map(opt => ({ value: opt, label: capitalizeValue(opt) }))}
                              placeholder="Select..."
                              required
                              error={formErrors.risk_type}
                              disabled={!!(viewingFinding && !isEditMode)}
                              className={isMobile ? "min-w-[90px]" : "min-w-[140px]"}
                            />
                          )}
                        </div>
                      )}

                      {/* Show always when creating/editing, or when viewing and has value */}
                      {(!viewingFinding || formData.risk_level) && (
                        <div className={cn("flex items-center", isMobile ? "gap-0.5" : "gap-1.5")}>
                          {!isMobile && <span className="text-[10px] font-medium text-gray-600">Level:</span>}
                          {viewingFinding && !isEditMode ? (
                            <Badge variant={getRiskLevelBadgeVariant(formData.risk_level)} className={cn(isMobile ? "!text-[8px] !px-1 !py-0.5 !h-4" : "text-xs")}>
                              {capitalizeValue(formData.risk_level)}
                            </Badge>
                          ) : (
                            <Select
                              value={formData.risk_level}
                              onChange={(e) => {
                                setFormData(prev => ({ ...prev, risk_level: e.target.value }));
                                setFormErrors(prev => ({ ...prev, risk_level: '' }));
                              }}
                              options={riskLevelOptions.map(opt => ({ value: opt, label: capitalizeValue(opt) }))}
                              placeholder="Select..."
                              required
                              error={formErrors.risk_level}
                              disabled={!!(viewingFinding && !isEditMode)}
                              className={isMobile ? "min-w-[80px]" : "min-w-[120px]"}
                            />
                          )}
                        </div>
                      )}

                      {/* Show always when creating/editing, or when viewing and has value */}
                      {(!viewingFinding || formData.internal_control_element) && (
                        <div className={cn("flex items-center", isMobile ? "gap-0.5" : "gap-1.5")}>
                          {!isMobile && <span className="text-[10px] font-medium text-gray-600">Control:</span>}
                          {viewingFinding && !isEditMode ? (
                            <Badge variant="default" className={cn(isMobile ? "!text-[8px] !px-1 !py-0.5 !h-4" : "text-xs")}>
                              {capitalizeValue(formData.internal_control_element)}
                            </Badge>
                          ) : (
                            <Select
                              value={formData.internal_control_element}
                              onChange={(e) => {
                                setFormData(prev => ({ ...prev, internal_control_element: e.target.value }));
                                setFormErrors(prev => ({ ...prev, internal_control_element: '' }));
                              }}
                              options={internalControlOptions.map(opt => ({ value: opt, label: capitalizeValue(opt) }))}
                              placeholder="Select..."
                              required
                              error={formErrors.internal_control_element}
                              disabled={!!(viewingFinding && !isEditMode)}
                              className={isMobile ? "min-w-[100px]" : "min-w-[160px]"}
                            />
                          )}
                        </div>
                      )}

                      {/* Show always when creating/editing, or when viewing and has value */}
                      {(!viewingFinding || formData.country) && (
                        <div className={cn("flex items-center", isMobile ? "gap-0.5" : "gap-1.5")}>
                          {!isMobile && <span className="text-[10px] font-medium text-gray-600">Country:</span>}
                          {viewingFinding && !isEditMode ? (
                            <Badge variant="info" className={cn(isMobile ? "!text-[8px] !px-1 !py-0.5 !h-4" : "text-xs")}>
                              {capitalizeValue(formData.country)}
                            </Badge>
                          ) : (
                            <Select
                              value={formData.country}
                              onChange={(e) => {
                                setFormData(prev => ({ ...prev, country: e.target.value }));
                                setFormErrors(prev => ({ ...prev, country: '' }));
                              }}
                              options={countryOptions.map(opt => ({ value: opt, label: capitalizeValue(opt) }))}
                              placeholder="Select..."
                              required
                              error={formErrors.country}
                              disabled={!!(viewingFinding && !isEditMode)}
                              className={isMobile ? "min-w-[80px]" : "min-w-[120px]"}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Finding Name */}
                <div>
                <Input
                    label={<span className={cn("font-medium text-gray-700", isMobile ? "text-[10px]" : "text-sm")}>Finding Name <span className="text-red-500">*</span></span>}
                  value={formData.finding_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, finding_name: e.target.value }))}
                    placeholder="Enter finding name"
                  required
                  error={formErrors.finding_name}
                  disabled={!!(viewingFinding && !isEditMode)}
                  fullWidth
                    className={cn(isMobile ? "text-[10px]" : "text-sm")}
                />
                </div>

                {/* Finding Description */}
                <div className={cn(isMobile ? "mb-2" : "mb-6 md:mb-10")}>
                  <RichTextEditor
                    label={<span className={cn("font-medium text-gray-700", isMobile ? "text-[10px]" : "text-sm")}>Finding Description <span className="text-red-500">*</span></span>}
                    value={formData.finding_description || ''}
                    onChange={(value) => setFormData(prev => ({ ...prev, finding_description: value }))}
                    rows={isMobile ? 2 : 4}
                    required
                    error={formErrors.finding_description}
                    disabled={!!(viewingFinding && !isEditMode)}
                    fullWidth
                    className={cn(isMobile ? "text-[10px]" : "text-sm")}
                  />
                </div>

                {/* Audit Type Other - Only show when "Other" is selected */}
                {formData.audit_type === 'Other' && (
                  <Input
                    label={<span className={cn("font-medium text-gray-700", isMobile ? "text-[11px]" : "text-sm")}>Audit Type (Other)</span>}
                    value={formData.audit_type_other}
                    onChange={(e) => setFormData(prev => ({ ...prev, audit_type_other: e.target.value }))}
                    required
                    error={formErrors.audit_type_other}
                    disabled={!!(viewingFinding && !isEditMode)}
                    fullWidth
                    className={cn(isMobile ? "text-[11px]" : "text-sm")}
                  />
                )}

                {/* Financial Impact */}
                <div className={cn(isMobile ? "mb-2" : "mb-4 md:mb-6")}>
                  <label className={cn("block font-medium text-gray-700", isMobile ? "text-[10px] mb-0.5" : "text-sm mb-1")}>
                    Financial Impact (€)
                  </label>
                  {viewingFinding && !isEditMode ? (
                    <div className={cn(
                      "bg-gray-50 border border-gray-300 rounded text-gray-900",
                      isMobile ? "px-2 py-1 text-[10px]" : "px-3 py-2 text-sm"
                    )}>
                      {formData.financial_impact
                        ? `€${formatFinancialImpact(formData.financial_impact)}`
                        : '-'}
                    </div>
                  ) : (
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={formData.financial_impact || ''}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        // Allow only digits and single decimal point, no formatting while typing
                        const cleaned = inputValue.replace(/[^\d.]/g, '');
                        // Ensure only one decimal point
                        const parts = cleaned.split('.');
                        let normalized = cleaned;
                        if (parts.length > 2) {
                          normalized = parts[0] + '.' + parts.slice(1).join('');
                        }
                        // Store raw value without any formatting - user types what they want
                        setFormData(prev => ({ ...prev, financial_impact: normalized }));
                      }}
                      placeholder="0.00"
                      disabled={!!(viewingFinding && !isEditMode)}
                      fullWidth
                      className={cn(isMobile ? "text-[10px]" : "text-sm")}
                    />
                  )}
                </div>


                {/* Attachments */}
                <div>
                  <label className={cn("block font-medium text-gray-700", isMobile ? "text-[10px] mb-1" : "text-sm mb-1.5")}>
                    Attachments
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    disabled={!!(viewingFinding && !isEditMode)}
                    className={cn(
                      "block w-full text-gray-500 file:rounded-lg file:border-0 file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed",
                      isMobile ? "text-[9px] file:mr-1.5 file:py-0.5 file:px-1.5 file:text-[9px]" : "text-sm file:mr-4 file:py-2 file:px-4 file:text-sm"
                    )}
                  />
                  {attachments.length > 0 && (
                    <div className={cn("mt-1 space-y-0.5", isMobile ? "" : "")}>
                      {attachments.map((attachment, index) => (
                        <div key={index} className={cn(
                          "flex items-center justify-between bg-gray-50 rounded",
                          isMobile ? "p-1" : "p-2"
                        )}>
                          <span className={cn("text-gray-700 truncate", isMobile ? "text-[9px] max-w-[70%]" : "text-sm")}>{attachment.file_name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(index)}
                            className="text-red-500 hover:text-red-700 flex-shrink-0"
                          >
                            <svg className={cn(isMobile ? "w-2.5 h-2.5" : "w-4 h-4")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* History Section - Show when viewing */}
                {viewingFinding && !isEditMode && showFindingHistory && (
                  <div ref={historySectionRef} className={cn("border-t border-gray-200", isMobile ? "mt-3 pt-3" : "mt-6 pt-6")}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={cn("font-semibold text-gray-900", isMobile ? "text-xs" : "text-base")}>Change History</h3>
                      {isMobile ? (
                        <button
                          onClick={() => {
                            setShowFindingHistory(false);
                            // Scroll to top of modal
                            setTimeout(() => {
                              modalContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                            }, 100);
                          }}
                          className="flex items-center gap-0.5 px-1 py-0.5 h-5 text-[7px] border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                        >
                          <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>Hide</span>
                        </button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowFindingHistory(false);
                            // Scroll to top of modal
                            setTimeout(() => {
                              modalContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                            }, 100);
                          }}
                          className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50 px-2 py-1"
                        >
                          Hide History
                        </Button>
                      )}
                    </div>
                    {loadingFindingHistory ? (
                      <div className="text-center py-8">
                        <Loading size="md" />
                      </div>
                    ) : findingHistory.length > 0 ? (
                      <div className={cn(isMobile ? "space-y-2" : "space-y-3")}>
                        {findingHistory.map((entry) => (
                          <div key={entry.id} className={cn(
                            "bg-gray-50 border border-gray-200 rounded-lg",
                            isMobile ? "p-2" : "p-4"
                          )}>
                            <div className={cn("flex items-start justify-between", isMobile ? "mb-1.5" : "mb-2")}>
                              <div className={cn("flex items-center", isMobile ? "gap-1.5" : "gap-2")}>
                                <Badge 
                                  variant={entry.event_type === 'CREATE' ? 'success' : entry.event_type === 'DELETE' ? 'danger' : 'info'}
                                  size={isMobile ? "xs" : "sm"}
                                  className={cn(isMobile && "!text-[9px] !px-1.5 !py-0.5 !h-5")}
                                >
                                  {entry.event_type}
                                </Badge>
                                {entry.field_name && (
                                  <span className={cn("font-medium text-gray-700", isMobile ? "text-[10px]" : "text-sm")}>
                                    Field: {entry.field_name}
                                  </span>
                                )}
                              </div>
                              <span className={cn("text-gray-500", isMobile ? "text-[9px]" : "text-xs")}>
                                {new Date(entry.changed_at).toLocaleString('en-US', {
                                  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  timeZoneName: 'short'
                                })}
                              </span>
                            </div>
                            {entry.field_name && (
                              <div className={cn(
                                "grid grid-cols-2 mt-2",
                                isMobile ? "gap-[6.4px] text-[8px]" : "gap-[12.8px] text-xs"
                              )}>
                                <div>
                                  <span className={cn("text-gray-600 font-medium", isMobile ? "text-[10px]" : "text-sm")}>Old Value:</span>
                                  <div className={cn(
                                    "bg-red-50 border border-red-200 rounded text-gray-900",
                                    isMobile ? "mt-0.5 px-1.5 py-0.5 text-[9px]" : "mt-1 px-2 py-1"
                                  )}>
                                    {entry.old_value || '-'}
                                  </div>
                                </div>
                                <div>
                                  <span className={cn("text-gray-600 font-medium", isMobile ? "text-[10px]" : "text-sm")}>New Value:</span>
                                  <div className={cn(
                                    "bg-green-50 border border-green-200 rounded text-gray-900",
                                    isMobile ? "mt-0.5 px-1.5 py-0.5 text-[9px]" : "mt-1 px-2 py-1"
                                  )}>
                                    {entry.new_value || '-'}
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className={cn("text-gray-500", isMobile ? "mt-1.5 text-[9px]" : "mt-2 text-xs")}>
                              Changed by: {entry.changed_by}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No history available
                      </div>
                    )}
                  </div>
                )}

                {/* Form Actions */}
                <div className={cn(
                  "flex items-stretch justify-end border-t border-gray-200",
                  isMobile ? "flex-col gap-1.5 pt-2" : "sm:flex-row sm:items-center gap-2 pt-3 md:pt-4 sm:gap-3"
                )}>
                  {viewingFinding && !isEditMode && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // Helper function to match finding value with dropdown options (case-insensitive)
                        const matchDropdownValue = (value: string | null | undefined, options: string[]): string => {
                          if (!value) return '';
                          const normalizedValue = value.trim();
                          // Try exact match first
                          const exactMatch = options.find(opt => opt === normalizedValue);
                          if (exactMatch) return exactMatch;
                          // Try case-insensitive match
                          const caseInsensitiveMatch = options.find(opt => opt.toLowerCase().trim() === normalizedValue.toLowerCase());
                          if (caseInsensitiveMatch) return caseInsensitiveMatch;
                          // Return original value if no match found
                          return normalizedValue;
                        };

                        // Set formData with viewingFinding data when entering edit mode
                        const findingFormData = {
                          finding_name: viewingFinding.finding_name || '',
                          finding_description: viewingFinding.finding_description || '',
                          audit_type: matchDropdownValue(viewingFinding.audit_type, auditTypeOptions),
                          audit_type_other: viewingFinding.audit_type_other || '',
                          risk_type: matchDropdownValue(viewingFinding.risk_type, riskTypeOptions),
                          internal_control_element: matchDropdownValue(viewingFinding.internal_control_element, internalControlOptions),
                          country: matchDropdownValue(viewingFinding.country, countryOptions),
                          audit_year: viewingFinding.audit_year || '',
                          audit_name: viewingFinding.audit_name || '',
                          audit_key: viewingFinding.audit_key || '',
                          risk_level: matchDropdownValue(viewingFinding.risk_level, riskLevelOptions),
                          financial_impact: viewingFinding.financial_impact ? String(viewingFinding.financial_impact) : '',
                          status: matchDropdownValue(viewingFinding.status, statusOptions),
                          selectedAuditKey: viewingFinding.audit_key || '',
                          selectedAuditYear: viewingFinding.audit_year || '',
                        };
                        // Store initial form data when entering edit mode
                        setFormData(findingFormData);
                        setInitialFormData({ ...findingFormData });
                        setIsEditMode(true);
                        setEditingFinding(viewingFinding);
                      }}
                      className={cn(
                        "bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-300 text-purple-700 hover:from-purple-100 hover:to-indigo-100 hover:border-purple-400 hover:text-purple-800 font-medium shadow-sm",
                        isMobile ? "w-full text-[9px] px-2 py-1 h-7" : "text-xs md:text-sm px-3 md:px-4 py-2 md:py-2.5"
                      )}
                    >
                      <svg className={cn("mr-0.5", isMobile ? "w-2.5 h-2.5" : "w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Button>
                  )}
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => {
                      if (isEditMode && editingFinding) {
                        // Cancel edit mode - go back to view mode, don't close modal
                        // Reset form data to initial values
                        if (initialFormData) {
                          setFormData({ ...initialFormData });
                        } else {
                          // Reload finding to get original data
                          const originalFinding = findings.find(f => f.id === editingFinding.id);
                          if (originalFinding) {
                            setFormData({
                              finding_name: originalFinding.finding_name || '',
                              finding_description: originalFinding.finding_description || '',
                              audit_type: originalFinding.audit_type || '',
                              audit_type_other: originalFinding.audit_type_other || '',
                              risk_type: originalFinding.risk_type || '',
                              internal_control_element: originalFinding.internal_control_element || '',
                              country: originalFinding.country || '',
                              audit_year: originalFinding.audit_year || '',
                              audit_name: originalFinding.audit_name || '',
                              audit_key: originalFinding.audit_key || '',
                              risk_level: originalFinding.risk_level || '',
                              financial_impact: originalFinding.financial_impact ? String(originalFinding.financial_impact) : '',
                              status: originalFinding.status || 'open',
                              selectedAuditKey: originalFinding.audit_key || '',
                              selectedAuditYear: originalFinding.audit_year || '',
                            });
                            setViewingFinding(originalFinding);
                          }
                        }
                        setEditingFinding(null);
                        setIsEditMode(false);
                        setInitialFormData(null);
                      } else {
                        // Close modal only if not in edit mode
                        handleCloseModal();
                      }
                    }}
                    className={cn(
                      isMobile ? "w-full text-[9px] px-2 py-1 h-7" : "text-xs md:text-sm px-3 md:px-4 py-2 md:py-2.5"
                    )}
                  >
                    {viewingFinding && !isEditMode ? 'Close' : editingFinding ? 'Cancel' : 'Close'}
                  </Button>
                  {!viewingFinding && !editingFinding && auditContext?.selectedAuditKey && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async (e) => {
                        console.log('✅ Save and Add Another button clicked', { e, auditContext });
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          await handleSubmit(undefined, true);
                        } catch (error) {
                          console.error('❌ Error in Save and Add Another:', error);
                        }
                      }}
                      className={cn(
                        "whitespace-nowrap",
                        isMobile ? "w-full text-[9px] px-2 py-1 h-7" : "text-xs md:text-sm px-3 md:px-4 py-2 md:py-2.5"
                      )}
                    >
                      Save & Add Another
                    </Button>
                  )}
                  {(editingFinding || !viewingFinding) && (
                    <Button
                      type="submit"
                      variant="primary"
                      onClick={(e) => {
                        console.log('✅ Create Finding button clicked', { type: e.currentTarget.type, editingFinding, viewingFinding });
                      }}
                      disabled={editingFinding ? !hasFormChanged : false}
                      className={cn(
                        "whitespace-nowrap",
                        isMobile ? "w-full text-[9px] px-2 py-1 h-7" : "text-xs md:text-sm px-3 md:px-4 py-2 md:py-2.5",
                        editingFinding && "bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-600 text-white hover:from-purple-700 hover:to-indigo-700 hover:border-purple-700 font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-purple-600 disabled:hover:to-indigo-600"
                      )}
                    >
                      {editingFinding ? (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Update
                        </div>
                      ) : (
                        'Create Finding'
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Finding Actions Modal */}
      {showActionModal && selectedFindingForAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-[95vw] md:max-w-6xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Finding Actions
              </h2>
              <button
                onClick={handleCloseActionModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Actions List - Only show when not viewing, editing, or creating a single action */}
              {!viewingAction && !editingAction && !showNewActionForm && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-900">
                      Actions ({findingActions[selectedFindingForAction]?.length || 0})
                    </h3>
                    <Button
                      variant="primary"
                      onClick={() => {
                        setEditingAction(null);
                        setShowNewActionForm(true);
                        setActionFormData({
                          action_description: '',
                          due_date: '',
                          audit_lead: '',
                          action_responsible: '',
                          action_responsible_email: '',
                          action_responsible_vp: '',
                          action_responsible_clevel: '',
                          status: '',
                        });
                        setActionFormErrors({});
                      }}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Action
                    </Button>
                  </div>

                  {findingActions[selectedFindingForAction] && findingActions[selectedFindingForAction].length > 0 ? (
                    <div className="space-y-2">
                      {findingActions[selectedFindingForAction]?.map((action) => (
                        <div key={action.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                          <div className="flex items-center justify-between gap-[12.8px]">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-xs font-mono text-gray-500">{action.action_id}</span>
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setStatusDropdownOpen(statusDropdownOpen === action.id ? null : action.id)}
                                    className="focus:outline-none"
                                  >
                                    <Badge variant={getActionStatusBadgeVariant(action.status)} className="text-xs cursor-pointer hover:opacity-80">
                                      {capitalizeValue(action.status)}
                                    </Badge>
                                  </button>
                                  {statusDropdownOpen === action.id && (
                                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px] py-1">
                                      {Array.from(new Set(statusOptions.filter(opt => opt !== 'overdue' && opt.toLowerCase() !== action.status.toLowerCase()))).map((statusOption) => (
                                        <button
                                          key={statusOption}
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              await auditFindingService.updateFindingAction(action.id, {
                                                action_description: action.action_description,
                                                due_date: action.due_date,
                                                audit_lead: action.audit_lead,
                                                action_responsible: action.action_responsible,
                                                action_responsible_email: action.action_responsible_email,
                                                action_responsible_vp: action.action_responsible_vp,
                                                action_responsible_clevel: action.action_responsible_clevel,
                                                status: statusOption,
                                              });
                                              await loadFindingActions(selectedFindingForAction!);
                                              if (viewingFinding && viewingFinding.id === selectedFindingForAction) {
                                                await loadFindingActions(viewingFinding.id);
                                              }
                                              setStatusDropdownOpen(null);
                                              addNotification({
                                                type: 'success',
                                                message: 'Action status updated successfully',
                                              });
                                            } catch (error: any) {
                                              addNotification({
                                                type: 'error',
                                                message: error?.response?.data?.error || 'Failed to update action status',
                                              });
                                            }
                                          }}
                                          className="w-full text-left px-3 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg flex items-center gap-2"
                                        >
                                          <Badge variant={getActionStatusBadgeVariant(statusOption)} className="text-xs">
                                            {capitalizeValue(statusOption)}
                                          </Badge>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm text-gray-900 mb-2">{renderHtmlWithLists(action.action_description, 1)}</div>
                              <div className="flex items-center gap-[12.8px] text-[9.6px] text-gray-600">
                                <div className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>{new Date(action.due_date).toLocaleDateString()}</span>
                                </div>
                                {action.audit_lead && (
                                  <div className="flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="truncate max-w-[150px]">
                                      {(() => {
                                        if (!action.audit_lead) return '-';
                                        const user = teamManagerUsers.find(u =>
                                          u.email?.toLowerCase().trim() === action.audit_lead?.toLowerCase().trim()
                                        );
                                        return user ? user.name : action.audit_lead;
                                      })()}
                                    </span>
                                  </div>
                                )}
                                {action.action_responsible && (
                                  <div className="flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="truncate max-w-[150px]">
                                      {(() => {
                                        if (!action.action_responsible) return '-';
                                        const user = departmentDirectorUsers.find(u =>
                                          u.email?.toLowerCase().trim() === action.action_responsible?.toLowerCase().trim()
                                        );
                                        return user ? user.name : action.action_responsible;
                                      })()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs px-2 py-1"
                                onClick={() => handleViewAction(selectedFindingForAction, action)}
                              >
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs px-2 py-1 text-red-600 hover:text-red-700"
                                onClick={() => {
                                  setDeletingActionId(action.id);
                                  setDeletingActionFindingId(selectedFindingForAction);
                                  setShowDeleteActionConfirm(true);
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <p>No actions found. Click "New Action" to create one.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Form - View/Edit/Create */}
              {(viewingAction || editingAction || showNewActionForm) && (
                <Card className="p-6 border-2 border-dashed border-gray-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {(viewingAction || editingAction) && (
                        <button
                          type="button"
                          onClick={() => {
                            setViewingAction(null);
                            setEditingAction(null);
                            setIsActionEditMode(false);
                            setShowNewActionForm(false);
                          }}
                          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                          </svg>
                          <span className="text-sm font-medium">Back</span>
                        </button>
                      )}
                      <h3 className="text-lg font-semibold text-gray-900 font-mono">
                        {viewingAction ? viewingAction.action_id : editingAction ? editingAction.action_id : 'Create New Action'}
                      </h3>
                    </div>
                    {/* Status and History - Show in view mode with dropdown (top right) */}
                    {viewingAction && !isActionEditMode && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!showActionHistory) {
                              setLoadingActionHistory(true);
                              try {
                                const response = await auditFindingService.getActionHistory(viewingAction.id);
                                setActionHistory(response.data || []);
                              } catch (error: any) {
                                addNotification({
                                  type: 'error',
                                  message: error?.response?.data?.error || 'Failed to load history',
                                });
                              } finally {
                                setLoadingActionHistory(false);
                              }
                            }
                            setShowActionHistory(!showActionHistory);
                          }}
                          className="text-xs flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {showActionHistory ? 'Hide' : 'View'} History
                        </Button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setStatusDropdownOpen(statusDropdownOpen === viewingAction.id ? null : viewingAction.id)}
                          className="focus:outline-none"
                        >
                          <Badge variant={getActionStatusBadgeVariant(actionFormData.status)} className="cursor-pointer hover:opacity-80">
                            {capitalizeValue(actionFormData.status)}
                          </Badge>
                        </button>
                        {statusDropdownOpen === viewingAction.id && (
                          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px] py-1">
                              {Array.from(new Set(statusOptions.filter(opt => opt !== 'overdue' && opt.toLowerCase() !== actionFormData.status.toLowerCase()))).map((statusOption) => (
                              <button
                                key={statusOption}
                                type="button"
                                onClick={async () => {
                                  try {
                                    await auditFindingService.updateFindingAction(viewingAction.id, {
                                      action_description: actionFormData.action_description,
                                      due_date: actionFormData.due_date,
                                      audit_lead: actionFormData.audit_lead,
                                      action_responsible: actionFormData.action_responsible,
                                      action_responsible_email: actionFormData.action_responsible_email,
                                      action_responsible_vp: actionFormData.action_responsible_vp,
                                      action_responsible_clevel: actionFormData.action_responsible_clevel,
                                      status: statusOption,
                                    });
                                    // Reload action data
                                    const updatedAction = await auditFindingService.getFindingAction(viewingAction.id);
                                    setActionFormData(prev => ({ ...prev, status: updatedAction.status }));
                                    setViewingAction(updatedAction);
                                    await loadFindingActions(selectedFindingForAction!);
                                    // Check and auto-update finding status based on action statuses
                                    await checkAndUpdateFindingStatus(selectedFindingForAction!);
                                    if (viewingFinding && viewingFinding.id === selectedFindingForAction) {
                                      await loadFindingActions(viewingFinding.id);
                                    }
                                    setStatusDropdownOpen(null);
                                    addNotification({
                                      type: 'success',
                                      message: 'Action status updated successfully',
                                    });
                                  } catch (error: any) {
                                    addNotification({
                                      type: 'error',
                                      message: error?.response?.data?.error || 'Failed to update action status',
                                    });
                                  }
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg flex items-center gap-2"
                              >
                                <Badge variant={getActionStatusBadgeVariant(statusOption)} className="text-xs">
                                  {capitalizeValue(statusOption)}
                                </Badge>
                              </button>
                            ))}
                          </div>
                        )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Show related finding in view mode */}
                  {viewingAction && !isActionEditMode && selectedFindingForAction && (
                    <div className="mb-4 p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 font-medium">Related Finding:</span>
                          <button
                            onClick={() => {
                              const finding = findings.find(f => f.id === selectedFindingForAction);
                              if (finding) {
                                handleCloseActionModal();
                                handleViewFinding(finding);
                              }
                            }}
                            className="text-purple-600 hover:text-purple-800 hover:underline font-mono"
                          >
                            {findings.find(f => f.id === selectedFindingForAction)?.finding_id || `Finding #${selectedFindingForAction}`}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmitAction} className="space-y-4">
                    {/* Action Identity Section - Compact badge display */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 mb-6">
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Audit Name & Year - Full width on top */}
                        {(viewingAction?.audit_name || editingAction?.audit_name || findings.find(f => f.id === selectedFindingForAction)?.audit_name) && (
                          <div className="w-full mb-2 pb-2 border-b border-purple-200">
                            <span className="text-xs font-medium text-gray-600 mr-2">Audit:</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {viewingAction?.audit_name || editingAction?.audit_name || findings.find(f => f.id === selectedFindingForAction)?.audit_name || ''}
                            </span>
                            {(viewingAction?.audit_year || editingAction?.audit_year || findings.find(f => f.id === selectedFindingForAction)?.audit_year) && (
                              <span className="text-xs text-gray-500 ml-2">
                                ({viewingAction?.audit_year || editingAction?.audit_year || findings.find(f => f.id === selectedFindingForAction)?.audit_year || ''})
                              </span>
                            )}
                          </div>
                        )}

                        {/* Audit Lead - Always show */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-600">Lead:</span>
                          {viewingAction && !isActionEditMode ? (
                            <Badge variant="info" className="text-xs">
                              {(() => {
                                if (!actionFormData.audit_lead) return '-';
                                const user = teamManagerUsers.find(u =>
                                  u.email?.toLowerCase().trim() === actionFormData.audit_lead.toLowerCase().trim()
                                );
                                return user ? user.name : actionFormData.audit_lead;
                              })()}
                            </Badge>
                          ) : (
                            <Select
                              value={actionFormData.audit_lead || ''}
                              onChange={(e) => setActionFormData(prev => ({ ...prev, audit_lead: e.target.value }))}
                              options={(() => {
                                const allOptions = teamManagerUsers.map(user => ({
                                  value: user.email,
                                  label: `${user.name} (${user.email})`
                                }));
                                // Sort: current value first, then alphabetically
                                if (actionFormData.audit_lead) {
                                  const currentIndex = allOptions.findIndex(opt =>
                                    opt.value.toLowerCase().trim() === actionFormData.audit_lead.toLowerCase().trim()
                                  );
                                  if (currentIndex > 0 && allOptions[currentIndex]) {
                                    const currentOption = allOptions[currentIndex];
                                    allOptions.splice(currentIndex, 1);
                                    allOptions.unshift(currentOption);
                                  }
                                }
                                return allOptions;
                              })()}
                              placeholder={actionFormData.audit_lead ? undefined : "Select..."}
                              required
                              error={actionFormErrors.audit_lead}
                              disabled={!!(viewingAction && !isActionEditMode)}
                              className="min-w-[200px]"
                            />
                          )}
                        </div>

                        {/* Action Responsible - Always show */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-600">Responsible:</span>
                          {viewingAction && !isActionEditMode ? (
                            <Badge variant="success" className="text-xs">
                              {(() => {
                                if (!actionFormData.action_responsible) return '-';
                                const user = departmentDirectorUsers.find(u =>
                                  u.email?.toLowerCase().trim() === actionFormData.action_responsible.toLowerCase().trim()
                                );
                                return user ? user.name : actionFormData.action_responsible;
                              })()}
                            </Badge>
                          ) : (
                            <Select
                              value={actionFormData.action_responsible || ''}
                              onChange={async (e) => {
                                if (viewingAction && !isActionEditMode) return;
                                const selectedEmail = e.target.value;
                                setActionFormData(prev => ({
                                  ...prev,
                                  action_responsible: selectedEmail,
                                  action_responsible_email: selectedEmail
                                }));

                                try {
                                  const hierarchy = await auditFindingService.getUserHierarchy(selectedEmail);
                                  setActionFormData(prev => ({
                                    ...prev,
                                    action_responsible: selectedEmail,
                                    action_responsible_email: selectedEmail,
                                    action_responsible_vp: hierarchy.vp_email || '',
                                    action_responsible_clevel: hierarchy.c_level_email || '',
                                  }));
                                } catch (error: any) {
                                  setActionFormData(prev => ({
                                    ...prev,
                                    action_responsible_vp: '',
                                    action_responsible_clevel: '',
                                  }));
                                }
                              }}
                              options={(() => {
                                const allOptions = departmentDirectorUsers.map(user => ({
                                  value: user.email,
                                  label: `${user.name} (${user.email})`
                                }));
                                // Sort: current value first, then alphabetically
                                if (actionFormData.action_responsible) {
                                  const currentIndex = allOptions.findIndex(opt =>
                                    opt.value.toLowerCase().trim() === actionFormData.action_responsible.toLowerCase().trim()
                                  );
                                  if (currentIndex > 0 && allOptions[currentIndex]) {
                                    const currentOption = allOptions[currentIndex];
                                    allOptions.splice(currentIndex, 1);
                                    allOptions.unshift(currentOption);
                                  }
                                }
                                return allOptions;
                              })()}
                              placeholder={actionFormData.action_responsible ? undefined : "Select..."}
                              required
                              error={actionFormErrors.action_responsible}
                              disabled={!!(viewingAction && !isActionEditMode)}
                              className="min-w-[200px]"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <RichTextEditor
                      label="Action Description"
                      value={actionFormData.action_description || ''}
                      onChange={(value) => setActionFormData(prev => ({ ...prev, action_description: value }))}
                      rows={3}
                      required
                      error={actionFormErrors.action_description}
                      disabled={!!(viewingAction && !isActionEditMode)}
                      fullWidth
                    />

                    <Input
                      label="Due Date"
                      type="date"
                      value={actionFormData.due_date}
                      onChange={(e) => setActionFormData(prev => ({ ...prev, due_date: e.target.value }))}
                      required
                      error={actionFormErrors.due_date}
                      disabled={!!(viewingAction && !isActionEditMode)}
                      fullWidth
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-[12.8px]">
                      <Input
                        label="Action Responsible Email"
                        value={actionFormData.action_responsible_email || ''}
                        disabled
                        fullWidth
                      />

                      <Input
                        label="Action Responsible VP"
                        value={actionFormData.action_responsible_vp || ''}
                        disabled
                        fullWidth
                      />

                      <Input
                        label="Action Responsible C-Level"
                        value={actionFormData.action_responsible_clevel || ''}
                        disabled
                        fullWidth
                      />
                    </div>



                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                      {viewingAction && !isActionEditMode && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            // Ensure due_date is in YYYY-MM-DD format for date input
                            let dueDateValue: string = viewingAction.due_date || '';
                            if (dueDateValue && typeof dueDateValue === 'string') {
                              const date = new Date(dueDateValue);
                              if (!isNaN(date.getTime())) {
                                const formatted = date.toISOString().split('T')[0];
                                if (formatted) {
                                  dueDateValue = formatted;
                                }
                              }
                            }
                            
                            setActionFormData({
                              action_description: viewingAction.action_description || '',
                              due_date: dueDateValue,
                              audit_lead: viewingAction.audit_lead || '',
                              action_responsible: viewingAction.action_responsible || '',
                              action_responsible_email: viewingAction.action_responsible_email || '',
                              action_responsible_vp: viewingAction.action_responsible_vp || '',
                              action_responsible_clevel: viewingAction.action_responsible_clevel || '',
                              status: viewingAction.status || 'open',
                            });
                            setIsActionEditMode(true);
                            setEditingAction(viewingAction);
                            setViewingAction(null);
                          }}
                          className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-300 text-purple-700 hover:from-purple-100 hover:to-indigo-100 hover:border-purple-400 hover:text-purple-800 font-medium shadow-sm"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </Button>
                      )}
                      {viewingAction && !isActionEditMode && (
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => {
                            setDeletingActionId(viewingAction.id);
                            setDeletingActionFindingId(selectedFindingForAction);
                            setShowDeleteActionConfirm(true);
                          }}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </Button>
                      )}
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => {
                          if (isActionEditMode && editingAction) {
                            // Cancel edit mode - go back to view mode, don't close modal
                            // Reload action to get original data
                            const originalAction = findingActions[selectedFindingForAction!]?.find(a => a.id === editingAction.id);
                            if (originalAction) {
                              // Ensure due_date is in YYYY-MM-DD format
                              let dueDateValue: string = originalAction.due_date || '';
                              if (dueDateValue && typeof dueDateValue === 'string') {
                                const date = new Date(dueDateValue);
                                if (!isNaN(date.getTime())) {
                                  const formatted = date.toISOString().split('T')[0];
                                  if (formatted) {
                                    dueDateValue = formatted;
                                  }
                                }
                              }
                              
                              setActionFormData({
                                action_description: originalAction.action_description || '',
                                due_date: dueDateValue,
                                audit_lead: originalAction.audit_lead || '',
                                action_responsible: originalAction.action_responsible || '',
                                action_responsible_email: originalAction.action_responsible_email || '',
                                action_responsible_vp: originalAction.action_responsible_vp || '',
                                action_responsible_clevel: originalAction.action_responsible_clevel || '',
                                status: originalAction.status || 'open',
                              });
                            }
                            setViewingAction(originalAction || editingAction);
                            setEditingAction(null);
                            setIsActionEditMode(false);
                          } else {
                            // Close modal only if not in edit mode
                            handleCloseActionModal();
                          }
                        }}
                      >
                        {viewingAction && !isActionEditMode ? 'Close' : 'Cancel'}
                      </Button>
                      {!viewingAction && (
                        <Button type="submit" variant="primary">
                          {editingAction ? 'Update' : 'Create'} Action
                        </Button>
                      )}
                    </div>
                  </form>

                  {/* History Section - Show when viewing */}
                  {viewingAction && !isActionEditMode && showActionHistory && (
                    <div className="mt-6 border-t border-gray-200 pt-6">
                      <h3 className="text-base font-semibold text-gray-900 mb-4">Change History</h3>
                      {loadingActionHistory ? (
                        <div className="text-center py-8">
                          <Loading size="md" />
                        </div>
                      ) : actionHistory.length > 0 ? (
                        <div className="space-y-3">
                          {actionHistory.map((entry) => (
                            <div key={entry.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant={entry.event_type === 'CREATE' ? 'success' : entry.event_type === 'DELETE' ? 'danger' : 'info'}>
                                    {entry.event_type}
                                  </Badge>
                                  {entry.field_name && (
                                    <span className="text-sm font-medium text-gray-700">
                                      Field: {entry.field_name}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {new Date(entry.changed_at).toLocaleString('en-US', {
                                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    timeZoneName: 'short'
                                  })}
                                </span>
                              </div>
                              {entry.field_name && (
                                <div className="grid grid-cols-2 gap-[12.8px] mt-2 text-xs">
                                  <div>
                                    <span className="text-gray-600 font-medium">Old Value:</span>
                                    <div className="mt-1 px-2 py-1 bg-red-50 border border-red-200 rounded text-gray-900">
                                      {(() => {
                                        // Format due_date field to show only date (YYYY-MM-DD)
                                        if (entry.field_name === 'due_date' && entry.old_value) {
                                          try {
                                            const date = new Date(entry.old_value);
                                            if (!isNaN(date.getTime())) {
                                              return date.toISOString().split('T')[0];
                                            }
                                          } catch (e) {
                                            // If parsing fails, return original value
                                          }
                                        }
                                        return entry.old_value || '-';
                                      })()}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 font-medium">New Value:</span>
                                    <div className="mt-1 px-2 py-1 bg-green-50 border border-green-200 rounded text-gray-900">
                                      {(() => {
                                        // Format due_date field to show only date (YYYY-MM-DD)
                                        if (entry.field_name === 'due_date' && entry.new_value) {
                                          try {
                                            const date = new Date(entry.new_value);
                                            if (!isNaN(date.getTime())) {
                                              return date.toISOString().split('T')[0];
                                            }
                                          } catch (e) {
                                            // If parsing fails, return original value
                                          }
                                        }
                                        return entry.new_value || '-';
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="mt-2 text-xs text-gray-500">
                                Changed by: {entry.changed_by}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No history available
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )}

              {/* Legacy Edit Action Form - Remove this if not needed */}
              {false && editingAction && (
                <Card className="p-6 border-2 border-purple-300">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Edit Action</h3>
                  <form onSubmit={handleSubmitAction} className="space-y-4">
                    <RichTextEditor
                      label="Action Description"
                      value={actionFormData.action_description || ''}
                      onChange={(value) => setActionFormData(prev => ({ ...prev, action_description: value }))}
                      rows={3}
                      required
                      error={actionFormErrors.action_description}
                      fullWidth
                    />

                    <Input
                      label="Due Date"
                      type="date"
                      value={actionFormData.due_date}
                      onChange={(e) => setActionFormData(prev => ({ ...prev, due_date: e.target.value }))}
                      required
                      error={actionFormErrors.due_date}
                      fullWidth
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[12.8px]">
                      <Select
                        label="Audit Lead"
                        value={actionFormData.audit_lead}
                        onChange={(e) => setActionFormData(prev => ({ ...prev, audit_lead: e.target.value }))}
                        options={teamManagerUsers.map(user => ({
                          value: user.email,
                          label: `${user.name} (${user.email})`
                        }))}
                        placeholder="Select audit lead..."
                        required
                        error={actionFormErrors.audit_lead}
                        fullWidth
                      />

                      <Select
                        label="Action Responsible"
                        value={actionFormData.action_responsible}
                        onChange={async (e) => {
                          const selectedEmail = e.target.value;
                          setActionFormData(prev => ({
                            ...prev,
                            action_responsible: selectedEmail,
                            action_responsible_email: selectedEmail // Auto-fill email from selected responsible
                          }));

                          // Fetch VP and C-Level emails for selected user
                          try {
                            const hierarchy = await auditFindingService.getUserHierarchy(selectedEmail);
                            console.log('✅ User hierarchy loaded:', hierarchy);
                            setActionFormData(prev => ({
                              ...prev,
                              action_responsible: selectedEmail,
                              action_responsible_email: selectedEmail,
                              action_responsible_vp: hierarchy.vp_email || '',
                              action_responsible_clevel: hierarchy.c_level_email || '',
                            }));
                          } catch (error: any) {
                            console.error('❌ Failed to load user hierarchy:', error);
                            console.error('Error details:', error?.response?.data || error.message);
                            // Set empty if error
                            setActionFormData(prev => ({
                              ...prev,
                              action_responsible_vp: '',
                              action_responsible_clevel: '',
                            }));
                          }
                        }}
                        options={departmentDirectorUsers.map(user => ({
                          value: user.email,
                          label: `${user.name} (${user.email})`
                        }))}
                        placeholder="Select action responsible..."
                        required
                        error={actionFormErrors.action_responsible}
                        fullWidth
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-[12.8px]">
                      <Input
                        label="Action Responsible Email"
                        value={actionFormData.action_responsible_email || ''}
                        disabled
                        fullWidth
                      />

                      <Input
                        label="Action Responsible VP"
                        value={actionFormData.action_responsible_vp || ''}
                        disabled
                        fullWidth
                      />

                      <Input
                        label="Action Responsible C-Level"
                        value={actionFormData.action_responsible_clevel || ''}
                        disabled
                        fullWidth
                      />
                    </div>

                    <Select
                      label="Status"
                      value={editingAction?.status || 'open'}
                      onChange={(e) => {
                        if (editingAction) {
                          setEditingAction({ ...editingAction, status: e.target.value });
                        }
                      }}
                      options={statusOptions.map(opt => ({
                        value: opt,
                        label: capitalizeValue(opt)
                      }))}
                      fullWidth
                    />

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                      <Button type="button" variant="ghost" onClick={handleCloseActionModal}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary">
                        Update Action
                      </Button>
                    </div>
                  </form>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
          <Card className="p-4 md:p-6 max-w-md w-full">
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Delete Audit Finding</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this audit finding? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => {
                setShowDeleteConfirm(false);
                setDeletingFindingId(null);
              }}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Action Confirmation Modal */}
      {showDeleteActionConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
          <Card className="p-4 md:p-6 max-w-md w-full">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">Delete Finding Action</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this action? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => {
                setShowDeleteActionConfirm(false);
                setDeletingActionId(null);
                setDeletingActionFindingId(null);
              }}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteAction}>
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Finding Creation Modal - Initial Options */}
      {showFindingCreationModal && !findingCreationMode && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
          onClick={() => {
            setShowFindingCreationModal(false);
            setCreatedFindings([]);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowFindingCreationModal(false);
              setCreatedFindings([]);
            }
          }}
          tabIndex={-1}
        >
          <Card className="p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Finding</h3>
            <p className="text-gray-600 mb-6">Choose how you would like to add findings:</p>
            <div className="space-y-3">
              <Button
                variant="primary"
                onClick={() => {
                  setFindingCreationMode('single');
                }}
                className="w-full justify-start"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add from Here
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFindingCreationMode('bulk');
                }}
                className="w-full justify-start"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Bulk Add from Excel/CSV
              </Button>
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="ghost" onClick={() => {
                setShowFindingCreationModal(false);
                setCreatedFindings([]);
              }}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Single Finding Creation Modal */}
      {showFindingCreationModal && findingCreationMode === 'single' && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          tabIndex={-1}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-[95vw] md:max-w-[90vw] w-full max-h-[95vh] md:max-h-[98vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
              <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Add Finding</h2>
                <button
                  onClick={() => {
                    setShowFindingCreationModal(false);
                    setFindingCreationMode(null);
                    setCreatedFindings([]);
                    setCreationModalAuditYear('');
                    setCreationModalAuditKey('');
                    setCreationModalAuditName('');
                    setCreationFormData({
                      finding_name: '',
                      finding_description: '',
                      audit_type: '',
                      audit_type_other: '',
                      risk_type: '',
                      internal_control_element: '',
                      country: '',
                      risk_level: '',
                      financial_impact: '',
                      status: '',
                    });
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Created Findings List - In header */}
              {createdFindings.length > 0 && (
                <div className="px-6 pb-4 bg-green-50 border-t border-green-200">
                  <h3 className="text-sm font-semibold text-green-800 mb-2">
                    Successfully Created ({createdFindings.length})
                  </h3>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {createdFindings.map((finding) => (
                      <div key={finding.id} className="text-xs text-green-700 flex items-center gap-2">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="truncate">{finding.finding_id}: {finding.finding_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8">

              <form onSubmit={async (e) => {
                e.preventDefault();
                // Validation
                const errors: Record<string, string> = {};
                if (!creationFormData.finding_name?.trim()) errors.finding_name = 'Required';
                if (!creationFormData.finding_description?.trim()) errors.finding_description = 'Required';
                if (!creationModalAuditYear) errors.auditYear = 'Required';
                if (!creationModalAuditKey) errors.auditKey = 'Required';
                if (!creationFormData.audit_type) errors.audit_type = 'Required';
                if (creationFormData.audit_type === 'Other' && !creationFormData.audit_type_other?.trim()) errors.audit_type_other = 'Required';
                if (!creationFormData.risk_type) errors.risk_type = 'Required';
                if (!creationFormData.internal_control_element) errors.internal_control_element = 'Required';
                if (!creationFormData.country) errors.country = 'Required';
                if (!creationFormData.risk_level) errors.risk_level = 'Required';

                setCreationFormErrors(errors);
                if (Object.keys(errors).length > 0) {
                  addNotification({ type: 'error', message: 'Please fill in all required fields' });
                  return;
                }

                try {
                  const submitData: any = {
                    finding_name: creationFormData.finding_name,
                    finding_description: creationFormData.finding_description,
                    audit_type: creationFormData.audit_type,
                    audit_type_other: creationFormData.audit_type === 'Other' ? creationFormData.audit_type_other : undefined,
                    risk_type: creationFormData.risk_type,
                    internal_control_element: creationFormData.internal_control_element,
                    country: creationFormData.country,
                    audit_year: creationModalAuditYear,
                    audit_name: creationModalAuditName,
                    audit_key: creationModalAuditKey,
                    risk_level: creationFormData.risk_level,
                    financial_impact: creationFormData.financial_impact ? parseFloat(creationFormData.financial_impact) : undefined,
                    status: 'open',
                  };

                  const response = await auditFindingService.createAuditFinding(submitData);
                  const newFinding: AuditFinding = (response as any).data || response;
                  setCreatedFindings(prev => [...prev, newFinding]);
                  addNotification({ type: 'success', message: 'Finding created successfully' });
                  
                  // Close modal and reset
                  setShowFindingCreationModal(false);
                  setFindingCreationMode(null);
                  setCreatedFindings([]);
                  setCreationModalAuditYear('');
                  setCreationModalAuditKey('');
                  setCreationModalAuditName('');
                  setCreationFormData({
                    finding_name: '',
                    finding_description: '',
                    audit_type: '',
                    audit_type_other: '',
                    risk_type: '',
                    internal_control_element: '',
                    country: '',
                    risk_level: '',
                    financial_impact: '',
                    status: '',
                  });
                  setCreationFormErrors({});
                  await loadFindings();
                } catch (error: any) {
                  addNotification({
                    type: 'error',
                    message: error?.response?.data?.error || 'Failed to create finding',
                  });
                }
              }}>
                {/* Audit Year Selection */}
                <div className="mb-6">
                  <Select
                    label="Audit Year *"
                    value={creationModalAuditYear}
                    onChange={(e) => {
                      setCreationModalAuditYear(e.target.value);
                      setCreationModalAuditKey('');
                      setCreationModalAuditName('');
                      setCreationFormErrors(prev => ({ ...prev, auditYear: '', auditKey: '' }));
                    }}
                    options={auditYearOptions.map(year => ({ value: year, label: year }))}
                    placeholder="Select audit year..."
                    required
                    error={creationFormErrors.auditYear}
                    fullWidth
                  />
                </div>

                {/* Audit Selection */}
                <div className="mb-6">
                  <Select
                    label="Audit *"
                    value={creationModalAuditKey}
                    onChange={(e) => {
                      const selectedAudit = auditPlanAudits.find(a => a.key === e.target.value);
                      setCreationModalAuditKey(e.target.value);
                      setCreationModalAuditName(selectedAudit?.summary || '');
                      setCreationFormErrors(prev => ({ ...prev, auditKey: '' }));
                    }}
                    options={creationModalAuditYear 
                      ? auditPlanAudits
                          .filter(a => a.auditYear === creationModalAuditYear)
                          .map(audit => ({
                            value: audit.key,
                            label: audit.summary
                          }))
                      : []}
                    placeholder="Select audit..."
                    required
                    error={creationFormErrors.auditKey}
                    disabled={!creationModalAuditYear}
                    fullWidth
                  />
                </div>

                {/* Finding Form Fields - Always visible but disabled until audit is selected */}
                {/* Finding Identity Section - Compact badge display like old flow */}
                  <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6 ${!creationModalAuditKey ? 'opacity-50' : ''}`}>
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Audit Name - Full width on top */}
                        {creationModalAuditName && (
                          <div className="w-full mb-2 pb-2 border-b border-blue-200">
                            <span className="text-xs font-medium text-gray-600 mr-2">Audit:</span>
                            <span className="text-sm font-semibold text-gray-900">{creationModalAuditName}</span>
                            {creationModalAuditYear && (
                              <span className="text-xs text-gray-500 ml-2">({creationModalAuditYear})</span>
                            )}
                          </div>
                        )}

                        {/* Compact badges for other fields */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-600">Type: <span className="text-red-500">*</span></span>
                          <Select
                            value={creationFormData.audit_type}
                            onChange={(e) => {
                              setCreationFormData(prev => ({ ...prev, audit_type: e.target.value, audit_type_other: '' }));
                              setCreationFormErrors(prev => ({ ...prev, audit_type: '', audit_type_other: '' }));
                            }}
                            options={auditTypeOptions.map(opt => ({ value: opt, label: capitalizeValue(opt) }))}
                            placeholder="Select..."
                            required
                            error={creationFormErrors.audit_type}
                            className="min-w-[140px]"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-600">Risk: <span className="text-red-500">*</span></span>
                          <Select
                            value={creationFormData.risk_type}
                            onChange={(e) => {
                              setCreationFormData(prev => ({ ...prev, risk_type: e.target.value }));
                              setCreationFormErrors(prev => ({ ...prev, risk_type: '' }));
                            }}
                            options={riskTypeOptions.map(opt => ({ value: opt, label: capitalizeValue(opt) }))}
                            placeholder="Select..."
                            required
                            error={creationFormErrors.risk_type}
                            disabled={!creationModalAuditKey}
                            className="min-w-[140px]"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-600">Level: <span className="text-red-500">*</span></span>
                          <Select
                            value={creationFormData.risk_level}
                            onChange={(e) => {
                              setCreationFormData(prev => ({ ...prev, risk_level: e.target.value }));
                              setCreationFormErrors(prev => ({ ...prev, risk_level: '' }));
                            }}
                            options={riskLevelOptions.map(opt => ({ value: opt, label: capitalizeValue(opt) }))}
                            placeholder="Select..."
                            required
                            error={creationFormErrors.risk_level}
                            disabled={!creationModalAuditKey}
                            className="min-w-[120px]"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-600">Control: <span className="text-red-500">*</span></span>
                          <Select
                            value={creationFormData.internal_control_element}
                            onChange={(e) => {
                              setCreationFormData(prev => ({ ...prev, internal_control_element: e.target.value }));
                              setCreationFormErrors(prev => ({ ...prev, internal_control_element: '' }));
                            }}
                            options={internalControlOptions.map(opt => ({ value: opt, label: capitalizeValue(opt) }))}
                            placeholder="Select..."
                            required
                            error={creationFormErrors.internal_control_element}
                            disabled={!creationModalAuditKey}
                            className="min-w-[160px]"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-600">Country: <span className="text-red-500">*</span></span>
                          <Select
                            value={creationFormData.country}
                            onChange={(e) => {
                              setCreationFormData(prev => ({ ...prev, country: e.target.value }));
                              setCreationFormErrors(prev => ({ ...prev, country: '' }));
                            }}
                            options={countryOptions.map(opt => ({ value: opt, label: capitalizeValue(opt) }))}
                            placeholder="Select..."
                            required
                            error={creationFormErrors.country}
                            disabled={!creationModalAuditKey}
                            className="min-w-[120px]"
                          />
                        </div>
                      </div>
                    </div>

                    {creationFormData.audit_type === 'Other' && (
                      <Input
                        label="Audit Type (Other) *"
                        value={creationFormData.audit_type_other}
                        onChange={(e) => {
                          setCreationFormData(prev => ({ ...prev, audit_type_other: e.target.value }));
                          setCreationFormErrors(prev => ({ ...prev, audit_type_other: '' }));
                        }}
                        required
                        error={creationFormErrors.audit_type_other}
                        disabled={!creationModalAuditKey}
                        fullWidth
                      />
                    )}

                    <div className="mb-6">
                      <Input
                        label="Finding Name"
                        value={creationFormData.finding_name}
                        onChange={(e) => {
                          setCreationFormData(prev => ({ ...prev, finding_name: e.target.value }));
                          setCreationFormErrors(prev => ({ ...prev, finding_name: '' }));
                        }}
                        required
                        error={creationFormErrors.finding_name}
                        disabled={!creationModalAuditKey}
                        fullWidth
                      />
                    </div>

                    <div className="mb-10">
                      <RichTextEditor
                        label="Finding Description"
                        value={creationFormData.finding_description || ''}
                        onChange={(value) => {
                          setCreationFormData(prev => ({ ...prev, finding_description: value }));
                          setCreationFormErrors(prev => ({ ...prev, finding_description: '' }));
                        }}
                        rows={4}
                        required
                        error={creationFormErrors.finding_description}
                        disabled={!creationModalAuditKey}
                        fullWidth
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Financial Impact (€)
                      </label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={creationFormData.financial_impact || ''}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          const cleaned = inputValue.replace(/[^\d.]/g, '');
                          const parts = cleaned.split('.');
                          let normalized = cleaned;
                          if (parts.length > 2) {
                            normalized = parts[0] + '.' + parts.slice(1).join('');
                          }
                          setCreationFormData(prev => ({ ...prev, financial_impact: normalized }));
                        }}
                        placeholder="0.00"
                        disabled={!creationModalAuditKey}
                        fullWidth
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShowFindingCreationModal(false);
                          setFindingCreationMode(null);
                          setCreatedFindings([]);
                          setCreationModalAuditYear('');
                          setCreationModalAuditKey('');
                          setCreationModalAuditName('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async (e) => {
                          e.preventDefault();
                          // Same validation and submit logic as form submit
                          const errors: Record<string, string> = {};
                          if (!creationFormData.finding_name?.trim()) errors.finding_name = 'Required';
                          if (!creationFormData.finding_description?.trim()) errors.finding_description = 'Required';
                          if (!creationModalAuditYear) errors.auditYear = 'Required';
                          if (!creationModalAuditKey) errors.auditKey = 'Required';
                          if (!creationFormData.audit_type) errors.audit_type = 'Required';
                          if (creationFormData.audit_type === 'Other' && !creationFormData.audit_type_other?.trim()) errors.audit_type_other = 'Required';
                          if (!creationFormData.risk_type) errors.risk_type = 'Required';
                          if (!creationFormData.internal_control_element) errors.internal_control_element = 'Required';
                          if (!creationFormData.country) errors.country = 'Required';
                          if (!creationFormData.risk_level) errors.risk_level = 'Required';

                          setCreationFormErrors(errors);
                          if (Object.keys(errors).length > 0) {
                            addNotification({ type: 'error', message: 'Please fill in all required fields' });
                            return;
                          }

                          try {
                            const submitData: any = {
                              finding_name: creationFormData.finding_name,
                              finding_description: creationFormData.finding_description,
                              audit_type: creationFormData.audit_type,
                              audit_type_other: creationFormData.audit_type === 'Other' ? creationFormData.audit_type_other : undefined,
                              risk_type: creationFormData.risk_type,
                              internal_control_element: creationFormData.internal_control_element,
                              country: creationFormData.country,
                              audit_year: creationModalAuditYear,
                              audit_name: creationModalAuditName,
                              audit_key: creationModalAuditKey,
                              risk_level: creationFormData.risk_level,
                              financial_impact: creationFormData.financial_impact ? parseFloat(creationFormData.financial_impact) : undefined,
                              status: creationFormData.status,
                            };

                            const response = await auditFindingService.createAuditFinding(submitData);
                            const newFinding: AuditFinding = (response as any).data || response;
                            setCreatedFindings(prev => [...prev, newFinding]);
                            addNotification({ type: 'success', message: 'Finding created successfully' });
                            
                            // Clear form but keep year/audit selected
                            setCreationFormData({
                              finding_name: '',
                              finding_description: '',
                              audit_type: '',
                              audit_type_other: '',
                              risk_type: '',
                              internal_control_element: '',
                              country: '',
                              risk_level: '',
                              financial_impact: '',
                              status: '',
                            });
                            setCreationFormErrors({});
                            await loadFindings();
                          } catch (error: any) {
                            addNotification({
                              type: 'error',
                              message: error?.response?.data?.error || 'Failed to create finding',
                            });
                          }
                        }}
                      >
                        Save & Add Another
                      </Button>
                      <Button type="submit" variant="primary">
                        Save and Close
                      </Button>
                    </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showFindingCreationModal && findingCreationMode === 'bulk' && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowFindingCreationModal(false);
              setFindingCreationMode(null);
              setBulkUploadFile(null);
              setBulkUploadPreview([]);
              setBulkUploadErrors([]);
              setCreationModalAuditYear('');
              setCreationModalAuditKey('');
              setCreationModalAuditName('');
            }
          }}
          tabIndex={-1}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-[95vw] md:max-w-4xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
              <h2 className="text-lg md:text-2xl font-bold text-gray-900">Bulk Add Findings from Excel/CSV</h2>
              <button
                onClick={() => {
                  setShowFindingCreationModal(false);
                  setFindingCreationMode(null);
                  setBulkUploadFile(null);
                  setBulkUploadPreview([]);
                  setBulkUploadErrors([]);
                  setCreationModalAuditYear('');
                  setCreationModalAuditKey('');
                  setCreationModalAuditName('');
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Audit Year and Audit Selection */}
              <div className="mb-6 space-y-4">
                <Select
                  label="Audit Year"
                  value={creationModalAuditYear}
                  onChange={(e) => {
                    setCreationModalAuditYear(e.target.value);
                    setCreationModalAuditKey('');
                    setCreationModalAuditName('');
                  }}
                  options={auditYearOptions.map(year => ({ value: year, label: year }))}
                  required
                  fullWidth
                />

                {creationModalAuditYear && (
                  <Select
                    label="Audit"
                    value={creationModalAuditKey}
                    onChange={(e) => {
                      const selectedAudit = auditPlanAudits.find(a => a.key === e.target.value);
                      setCreationModalAuditKey(e.target.value);
                      setCreationModalAuditName(selectedAudit?.summary || '');
                    }}
                    options={auditPlanAudits
                      .filter(a => a.auditYear === creationModalAuditYear)
                      .map(audit => ({
                        value: audit.key,
                        label: audit.summary
                      }))}
                    required
                    fullWidth
                  />
                )}
              </div>

              {/* File Upload Section - Prominent */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-900">
                    Upload File (Excel .xlsx or CSV)
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Create CSV template
                      const headers = [
                        'Finding Name',
                        'Finding Description',
                        'Audit Type',
                        'Audit Type Other',
                        'Risk Type',
                        'Internal Control Element',
                        'Country',
                        'Risk Level',
                        'Financial Impact'
                      ];
                      const sampleRow = [
                        'Sample Finding',
                        'Sample Description',
                        'Internal',
                        '',
                        'Operational',
                        'Control Environment',
                        'Turkey',
                        'Medium',
                        '1000.00'
                      ];
                      const csvContent = [headers, sampleRow].map(row => row.join(',')).join('\n');
                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'finding_template.csv';
                      a.click();
                      window.URL.revokeObjectURL(url);
                    }}
                    className="text-xs text-gray-600 hover:text-gray-900"
                  >
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Template
                  </Button>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setBulkUploadFile(file);
                      setBulkUploadPreview([]);
                      setBulkUploadErrors([]);
                      // Parse file for preview
                      if (file.name.endsWith('.csv')) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const text = event.target?.result as string;
                          const lines = text.split('\n').filter(line => line.trim());
                          if (lines.length > 0) {
                            const headers = lines[0]?.split(',').map(h => h.trim()) || [];
                            const rows = lines.slice(1, 6).map(line => {
                              const values = line.split(',').map(v => v.trim());
                              const row: any = {};
                              headers.forEach((header, index) => {
                                row[header] = values[index] || '';
                              });
                              return row;
                            });
                            setBulkUploadPreview(rows);
                          }
                        };
                        reader.readAsText(file);
                      }
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
              </div>

              {/* Preview */}
              {bulkUploadPreview.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Preview (first 5 rows):</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(bulkUploadPreview[0] || {}).map((key) => (
                            <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {bulkUploadPreview.map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((value: any, cellIndex) => (
                              <td key={cellIndex} className="px-3 py-2 text-sm text-gray-900">
                                {value || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Errors */}
              {bulkUploadErrors.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
                  <h3 className="text-sm font-semibold text-red-800 mb-2">Errors:</h3>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {bulkUploadErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowFindingCreationModal(false);
                    setFindingCreationMode(null);
                    setBulkUploadFile(null);
                    setBulkUploadPreview([]);
                    setBulkUploadErrors([]);
                    setCreationModalAuditYear('');
                    setCreationModalAuditKey('');
                    setCreationModalAuditName('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={async () => {
                    if (!bulkUploadFile || !creationModalAuditYear || !creationModalAuditKey) {
                      addNotification({
                        type: 'error',
                        message: 'Please select audit year, audit, and upload a file',
                      });
                      return;
                    }

                    setBulkUploadLoading(true);
                    setBulkUploadErrors([]);

                    try {
                      const formData = new FormData();
                      formData.append('file', bulkUploadFile);
                      formData.append('audit_year', creationModalAuditYear);
                      formData.append('audit_key', creationModalAuditKey);
                      formData.append('audit_name', creationModalAuditName);

                      const response = await auditFindingService.bulkUploadFindings(formData);
                      
                      // api.post returns response.data directly, so response is already the data object
                      if (response && typeof response === 'object') {
                        const data = response as any;
                        if (data.createdCount > 0) {
                          addNotification({
                            type: 'success',
                            message: `Successfully created ${data.createdCount} finding${data.createdCount > 1 ? 's' : ''}`,
                          });
                          // Close modal and refresh list
                          setShowFindingCreationModal(false);
                          setFindingCreationMode(null);
                          setBulkUploadFile(null);
                          setBulkUploadPreview([]);
                          setBulkUploadErrors([]);
                          setCreationModalAuditYear('');
                          setCreationModalAuditKey('');
                          setCreationModalAuditName('');
                          await loadFindings();
                          // Show errors if any, but don't keep modal open
                          if (data.errors && data.errors.length > 0) {
                            addNotification({
                              type: 'warning',
                              message: `${data.errors.length} row${data.errors.length > 1 ? 's' : ''} had errors. Check console for details.`,
                            });
                            console.warn('Bulk upload errors:', data.errors);
                          }
                        } else {
                          // No findings created
                          addNotification({
                            type: 'error',
                            message: 'No findings were created. Please check the file format and try again.',
                          });
                          if (data.errors && data.errors.length > 0) {
                            setBulkUploadErrors(data.errors);
                          }
                        }
                      } else {
                        addNotification({
                          type: 'error',
                          message: 'Failed to upload findings',
                        });
                      }
                    } catch (error: any) {
                      addNotification({
                        type: 'error',
                        message: error?.response?.data?.error || 'Failed to upload findings',
                      });
                    } finally {
                      setBulkUploadLoading(false);
                    }
                  }}
                  disabled={bulkUploadLoading || !bulkUploadFile || !creationModalAuditYear || !creationModalAuditKey}
                >
                  {bulkUploadLoading ? 'Uploading...' : 'Upload & Add Findings'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Error Modal */}
      {statusErrorModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setStatusErrorModal({ show: false, message: '', incompleteActions: [], actionLabel: 'Incomplete actions:' })}>
          <Card className="p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-[12.8px]">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Cannot Change Status</h3>
                <p className="text-gray-700 mb-3">
                  {statusErrorModal.message.split('\n\n')[0]}
                </p>
                {statusErrorModal.incompleteActions && statusErrorModal.incompleteActions.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {statusErrorModal.actionLabel || 'Incomplete actions:'}
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                      {statusErrorModal.incompleteActions.map((actionId, index) => (
                        <li key={index}>{actionId}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex items-center justify-end">
                  <Button
                    variant="primary"
                    onClick={() => setStatusErrorModal({ show: false, message: '', incompleteActions: [], actionLabel: 'Incomplete actions:' })}
                    className="min-w-[100px]"
                  >
                    OK
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AuditFindingPage;

