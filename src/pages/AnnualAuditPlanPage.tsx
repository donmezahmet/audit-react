import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuditPlans, useCreateAuditPlan, useUpdateAuditPlan, useUpdateAuditPlanStatus, AuditPlan } from '../hooks/useAuditPlans';
import { AuditPlanProgressChart } from '../components/audit-plan/AuditPlanProgressChart';
import { AuditPlanBoard } from '../components/audit-plan/AuditPlanBoard';
import { AuditPlanCalendarView } from '../components/audit-plan/AuditPlanCalendarView';
import { AuditPlanCalendarFilters } from '../components/audit-plan/AuditPlanCalendarFilters';
import { AuditPlanForm } from '../components/audit-plan/AuditPlanForm';
import { AuditPlanDetailModal } from '../components/audit-plan/AuditPlanDetailModal';
import Button from '../components/ui/Button';
import { Plus, LayoutList, Kanban, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { auditFindingService } from '../services/auditFinding.service';
import * as XLSX from 'xlsx';

const AnnualAuditPlanPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'progress' | 'kanban' | 'calendar'>('progress');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AuditPlan | undefined>(undefined);
  const [viewingPlan, setViewingPlan] = useState<AuditPlan | undefined>(undefined);
  const [optimisticPlans, setOptimisticPlans] = useState<AuditPlan[] | null>(null);
  const [initialDates, setInitialDates] = useState<{ startDate?: string; endDate?: string } | undefined>(undefined);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set(['all']));
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadPreview, setBulkUploadPreview] = useState<any[]>([]);
  const [bulkUploadErrors, setBulkUploadErrors] = useState<string[]>([]);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const plansRef = useRef<string>('');
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  const { data: plans = [], isLoading, error } = useAuditPlans(selectedYear.toString());

  // Sync query data with optimistic state only when plans actually change
  useEffect(() => {
    const plansKey = JSON.stringify(plans.map(p => ({ id: p.id, status: p.status })));
    if (plansKey !== plansRef.current) {
      plansRef.current = plansKey;
      setOptimisticPlans(plans);
    }
  }, [plans]);

  // Reset optimistic state when year changes
  useEffect(() => {
    setOptimisticPlans(null);
    plansRef.current = '';
  }, [selectedYear]);

  // Close year dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
        setIsYearDropdownOpen(false);
      }
    };

    if (isYearDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isYearDropdownOpen]);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isFormOpen) {
          setIsFormOpen(false);
          setEditingPlan(undefined);
          setInitialDates(undefined);
        }
        if (viewingPlan) {
          setViewingPlan(undefined);
        }
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFormOpen, viewingPlan]);
  const createMutation = useCreateAuditPlan();
  const updateMutation = useUpdateAuditPlan();
  const updateStatusMutation = useUpdateAuditPlanStatus();

  const handleCreate = async (data: Partial<AuditPlan>) => {
    try {
      const newPlan = await createMutation.mutateAsync(data as Omit<AuditPlan, 'id' | 'created_at' | 'updated_at'>);
      // Update optimistic state with new plan
      setOptimisticPlans(prev => {
        if (!prev) return [newPlan];
        return [...prev, newPlan];
      });
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to create plan:', err);
    }
  };

  const handleUpdate = async (data: Partial<AuditPlan>) => {
    if (!editingPlan) return;

    // Optimistically update local state immediately
    setOptimisticPlans(prev => {
      if (!prev) return null;
      return prev.map(plan =>
        plan.id === editingPlan.id ? { ...plan, ...data } : plan
      );
    });

    // Also update viewingPlan if it's the same plan
    if (viewingPlan && viewingPlan.id === editingPlan.id) {
      setViewingPlan({ ...viewingPlan, ...data } as AuditPlan);
    }

    try {
      await updateMutation.mutateAsync({ id: editingPlan.id, updates: data });
      setEditingPlan(undefined);
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to update plan:', err);
      // Rollback on error
      setOptimisticPlans(plans);
      if (viewingPlan && viewingPlan.id === editingPlan.id) {
        const originalPlan = plans.find(p => p.id === editingPlan.id);
        if (originalPlan) setViewingPlan(originalPlan);
      }
    }
  };


  const handleStatusChange = async (id: number, status: string) => {
    // Optimistically update local state immediately
    setOptimisticPlans(prev => {
      if (!prev) return null;
      return prev.map(plan =>
        plan.id === id ? { ...plan, status: status as AuditPlan['status'] } : plan
      );
    });

    try {
      await updateStatusMutation.mutateAsync({ id, status });
    } catch (err) {
      console.error('Failed to update status:', err);
      // Rollback on error
      setOptimisticPlans(plans);
    }
  };

  // Use optimistic plans if available, otherwise use query data
  // Filter plans by selected leads
  const filteredPlans = useMemo(() => {
    const plansToFilter = optimisticPlans || plans;
    if (selectedLeads.has('all')) {
      return plansToFilter;
    }
    return plansToFilter.filter(plan => {
      // Use audit_lead_name directly - it should already be fetched from users table by backend
      const lead = plan.audit_lead_name;
      return lead && lead.trim() && selectedLeads.has(lead.trim());
    });
  }, [optimisticPlans, plans, selectedLeads]);

  const displayPlans = filteredPlans;

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setIsYearDropdownOpen(false);
  };

  // Fetch available years from dropdown options
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const yearOptions = await auditFindingService.getDropdownOptions('audit_year');
        const years = yearOptions
          .map(y => parseInt(y))
          .filter(y => !isNaN(y))
          .sort((a, b) => b - a); // Descending order (newest first)
        setAvailableYears(years.length > 0 ? years : [new Date().getFullYear()]);
      } catch (error) {
        console.error('Failed to fetch years:', error);
        // Fallback to current year if fetch fails
        setAvailableYears([new Date().getFullYear()]);
      }
    };
    fetchYears();
  }, []);

  const handleBulkUpload = async () => {
    if (!bulkUploadFile) {
      setBulkUploadErrors(['Please select a file to upload']);
      return;
    }

    setBulkUploadLoading(true);
    setBulkUploadErrors([]);

    const formData = new FormData();
    formData.append('file', bulkUploadFile);

    try {
      const response = await fetch('/api/audit-plans/bulk-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      if (data.success) {
        // Refresh plans
        window.location.reload();
      } else {
        setBulkUploadErrors(data.errors || ['Upload failed']);
      }
    } catch (error: any) {
      setBulkUploadErrors([error.message || 'Failed to upload file']);
    } finally {
      setBulkUploadLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 h-[calc(100vh-80px)] flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-base md:text-[16px] font-bold text-gray-900 leading-tight">Annual Audit Plan</h1>
          <p className="text-[10px] md:text-base text-gray-500">Manage and track audit plans</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative hidden md:block" ref={yearDropdownRef}>
            <button
              onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
              className="flex items-center gap-1 md:gap-1.5 px-1.5 md:px-3 py-0.5 md:py-1.5 bg-white border border-gray-300 rounded-md md:rounded-lg hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 shadow-sm h-5 md:h-auto"
            >
              <span className="text-[10px] md:text-sm font-semibold text-gray-900">{selectedYear}</span>
              <ChevronDown className={`h-2.5 w-2.5 md:h-3.5 md:w-3.5 text-gray-500 transition-transform duration-200 ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isYearDropdownOpen && availableYears.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-20 md:w-28 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => handleYearChange(year)}
                    className={`
                      w-full px-2 py-1 md:px-3 md:py-2 text-left text-[10px] md:text-sm transition-colors
                      ${selectedYear === year
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Bulk Upload - DISABLED (code preserved) */}
          {false && (
            <Button
              variant="ghost"
              onClick={() => setShowBulkUploadModal(true)}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Bulk Upload
            </Button>
          )}
          <Button onClick={() => {
            setEditingPlan(undefined);
            setIsFormOpen(true);
          }} className="text-[10px] md:text-xs p-0 md:px-3 md:py-1.5 w-6 h-6 md:w-auto md:h-8 rounded-md md:rounded-lg flex items-center justify-center min-w-[24px]">
            <Plus className="h-4 w-4 md:h-3.5 md:w-3.5 md:mr-1 flex-shrink-0" />
            <span className="hidden md:inline">New Audit</span>
          </Button>
        </div>
      </div>

      {/* View Toggles */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-0.5 md:space-x-1 bg-gray-100 p-0.5 md:p-1 rounded-lg w-fit">
          <button
            onClick={() => setViewMode('progress')}
            className={`p-1.5 md:p-2 rounded-md flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium transition-colors ${viewMode === 'progress' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <LayoutList className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Progress</span>
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-1.5 md:p-2 rounded-md flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Kanban className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Kanban</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`p-1.5 md:p-2 rounded-md flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <CalendarIcon className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Calendar</span>
          </button>
        </div>
        {(viewMode === 'calendar' || viewMode === 'progress') && (
          <AuditPlanCalendarFilters
            plans={optimisticPlans || plans}
            selectedLeads={selectedLeads}
            onLeadsChange={setSelectedLeads}
          />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 ${viewMode === 'kanban' ? 'md:overflow-y-auto' : 'md:overflow-hidden'}`}>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            Error loading audit plans. Please try again.
          </div>
        ) : (
          <>
            {viewMode === 'progress' && (
              <AuditPlanProgressChart
                year={selectedYear}
                plans={displayPlans}
                onView={setViewingPlan}
                onStatusChange={handleStatusChange}
              />
            )}
            {viewMode === 'kanban' && (
              <AuditPlanBoard
                plans={displayPlans}
                onStatusChange={handleStatusChange}
                onView={setViewingPlan}
              />
            )}
            {viewMode === 'calendar' && (
              <AuditPlanCalendarView
                plans={displayPlans}
                onView={setViewingPlan}
                onCreate={(startDate, endDate) => {
                  setEditingPlan(undefined);
                  setInitialDates({ startDate, endDate });
                  setIsFormOpen(true);
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Bulk Upload Modal - DISABLED (code preserved) */}
      {false && showBulkUploadModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowBulkUploadModal(false);
              setBulkUploadFile(null);
              setBulkUploadPreview([]);
              setBulkUploadErrors([]);
            }
          }}
          tabIndex={-1}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-gray-900">Bulk Upload Audit Plans from CSV</h2>
              <button
                onClick={() => {
                  setShowBulkUploadModal(false);
                  setBulkUploadFile(null);
                  setBulkUploadPreview([]);
                  setBulkUploadErrors([]);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* File Upload Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-900">
                    Upload File (CSV)
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Create Excel template
                      const headers = [
                        'Audit Year',
                        'Audit Type',
                        'Audit Name',
                        'Audit Lead Email',
                        'Business Unit',
                        'Department',
                        'Process',
                        'Start Date',
                        'End Date',
                        'Audit Duration Weeks',
                        'Report Release Date',
                        'Audit Report Rating',
                        'Status'
                      ];
                      const sampleRow = [
                        '2025',
                        'Technology Audit',
                        'Sample Audit',
                        'ahmet.donmez@example.com',
                        'TDP',
                        'TDP',
                        'Information Technology General Controls (ITGC)',
                        '2025-01-01',
                        '2025-01-31',
                        '4',
                        '2025-02-15',
                        'Good',
                        'Completed'
                      ];

                      // Create workbook
                      const workbook = XLSX.utils.book_new();
                      const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);

                      // Set column widths
                      const colWidths = headers.map(() => ({ wch: 20 }));
                      worksheet['!cols'] = colWidths;

                      // Add worksheet to workbook
                      XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Plans');

                      // Generate Excel file
                      XLSX.writeFile(workbook, 'audit_plan_template.xlsx');
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
                  accept=".csv,.xlsx"
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
                      } else if (file.name.endsWith('.xlsx')) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            const result = event.target?.result;
                            if (!result || !(result instanceof ArrayBuffer)) {
                              setBulkUploadErrors(['Failed to read Excel file']);
                              return;
                            }
                            const data = new Uint8Array(result);
                            const workbook = XLSX.read(data, { type: 'array' });
                            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                              setBulkUploadErrors(['Excel file has no sheets']);
                              return;
                            }
                            const sheetName = workbook.SheetNames[0];
                            if (!workbook.Sheets || !sheetName) {
                              setBulkUploadErrors(['Excel file has no sheets data']);
                              return;
                            }
                            const worksheet = workbook.Sheets[sheetName];
                            if (!worksheet) {
                              setBulkUploadErrors(['Excel sheet is empty']);
                              return;
                            }
                            const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                            setBulkUploadPreview(rows.slice(0, 5) as any[]);
                          } catch (error) {
                            console.error('Error parsing Excel file:', error);
                            setBulkUploadErrors(['Failed to parse Excel file']);
                          }
                        };
                        reader.readAsArrayBuffer(file);
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
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowBulkUploadModal(false);
                    setBulkUploadFile(null);
                    setBulkUploadPreview([]);
                    setBulkUploadErrors([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkUpload}
                  disabled={!bulkUploadFile || bulkUploadLoading}
                >
                  {bulkUploadLoading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AuditPlanForm
        isOpen={isFormOpen}
        onCancel={() => {
          setIsFormOpen(false);
          setEditingPlan(undefined);
          setInitialDates(undefined);
        }}
        onSubmit={editingPlan ? handleUpdate : handleCreate}
        initialData={editingPlan || (initialDates ? {
          audit_year: selectedYear,
          start_date: initialDates.startDate,
          end_date: initialDates.endDate,
        } as Partial<AuditPlan> : {
          audit_year: selectedYear,
        } as Partial<AuditPlan>)}
      />

      {viewingPlan && (
        <AuditPlanDetailModal
          plan={viewingPlan}
          onClose={() => setViewingPlan(undefined)}
          onEdit={(plan) => {
            setViewingPlan(undefined);
            setEditingPlan(plan);
            setIsFormOpen(true);
          }}
        />
      )}
    </div>
  );
};

export default AnnualAuditPlanPage;
