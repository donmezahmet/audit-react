import { useMemo, useState, useEffect, useRef } from 'react';
import { useAuditPlans, AuditPlan } from '@/hooks/useAuditPlans';
import { AuditPlanProgressChart } from '@/components/audit-plan/AuditPlanProgressChart';
import { AuditPlanDetailModal } from '@/components/audit-plan/AuditPlanDetailModal';
import { Loading } from '@/components/ui';
import { ChevronDown } from 'lucide-react';

interface AuditProgressChartProps {
  selectedLead?: string;
  selectedYear?: string;
  onYearChange?: (year: string) => void;
  availableYears?: number[];
  isYearDropdownOpen?: boolean;
  onYearDropdownToggle?: (open: boolean) => void;
  yearDropdownRef?: React.RefObject<HTMLDivElement>;
}

export default function AuditProgressChart({ 
  selectedLead = '', 
  selectedYear = '2025',
  onYearChange,
  availableYears = [],
  isYearDropdownOpen = false,
  onYearDropdownToggle,
  yearDropdownRef
}: AuditProgressChartProps) {
  // Create a local ref if not provided (for mobile)
  const localYearDropdownRef = useRef<HTMLDivElement>(null);
  const finalYearDropdownRef = yearDropdownRef || localYearDropdownRef;
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set(['all']));
  const [viewingPlan, setViewingPlan] = useState<AuditPlan | undefined>(undefined);
  const year = selectedYear ? parseInt(selectedYear) : new Date().getFullYear();
  const { data: plans = [], isLoading } = useAuditPlans(selectedYear);

  const toggleLead = (lead: string) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev);
      if (lead === 'all') {
        if (newSet.has('all')) {
          // Deactivate all - activate first lead instead
          newSet.clear();
          const firstLead = availableLeads[0];
          if (firstLead) {
            newSet.add(firstLead);
          }
        } else {
          // Activate all - this means all leads are selected
          newSet.clear();
          newSet.add('all');
        }
      } else {
        // When toggling an individual lead, remove 'all' if present
        newSet.delete('all');
        if (newSet.has(lead)) {
          // Deactivating this lead
          newSet.delete(lead);
          // If no leads are selected, activate 'all'
          if (newSet.size === 0) {
            newSet.add('all');
          }
        } else {
          // Activating this lead
          newSet.add(lead);
          // If all leads are now selected, switch to 'all'
          if (newSet.size === availableLeads.length) {
            newSet.clear();
            newSet.add('all');
          }
        }
      }
      return newSet;
    });
  };

  // Determine if a lead should appear as active (either explicitly selected or 'all' is selected)
  const isLeadActive = (lead: string) => {
    if (selectedLeads.has('all')) {
      return true; // All leads are active when 'all' is selected
    }
    return selectedLeads.has(lead);
  };

  const showAllToggle = selectedLeads.has('all');

  // Get unique audit leads from plans
  const availableLeads = useMemo(() => {
    const leads = new Set<string>();
    plans.forEach(plan => {
      const lead = plan.audit_lead_name || plan.audit_lead_email;
      if (lead) {
        leads.add(lead);
      }
    });
    return Array.from(leads).sort();
  }, [plans]);

  // Filter plans by selected leads
  const filteredPlans = useMemo(() => {
    // First filter by selectedLead prop (if provided from parent)
    let filtered = plans;
    if (selectedLead && selectedLead !== '') {
      filtered = plans.filter(plan => {
        const lead = plan.audit_lead_name || plan.audit_lead_email;
        return lead && lead.toLowerCase().includes(selectedLead.toLowerCase());
      });
    }

    // Then filter by selectedLeads state (toggle filters)
    if (selectedLeads.has('all')) {
      return filtered;
    }
    return filtered.filter(plan => {
      const lead = plan.audit_lead_name || plan.audit_lead_email;
      return lead && selectedLeads.has(lead);
    });
  }, [plans, selectedLead, selectedLeads]);

  // Remove scroll adjustment - let parent handle all scrolling

  // Handle view - open modal instead of navigating
  const handleView = (plan: AuditPlan) => {
    setViewingPlan(plan);
  };

  // Handle status change - do nothing in dashboard (read-only)
  const handleStatusChange = () => {
    // Status changes should be done from the Annual Audit Plan page
    console.log('Status changes are not available from dashboard. Please use the Annual Audit Plan page.');
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && viewingPlan) {
        setViewingPlan(undefined);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [viewingPlan]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  if (!filteredPlans || filteredPlans.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-500">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">No audit plans found for {selectedYear || 'selected year'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filters Row - Mobile optimized */}
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between px-2 md:px-2 pb-2 border-b border-gray-200 flex-shrink-0 gap-2 sm:gap-3">
        {/* Audit Lead Filter - Toggle style for desktop, Chip style for mobile */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white/95 backdrop-blur-sm px-2 py-1.5 rounded-lg border border-gray-200 shadow-sm">
          <span className="text-[10px] md:text-[9px] text-gray-600 font-medium whitespace-nowrap">Audit Lead:</span>
          {showAllToggle ? (
            // Show only "All" - Toggle for desktop, Chip for mobile
            <>
              {/* Desktop: Toggle */}
              <button
                onClick={() => toggleLead('all')}
                className={`
                  hidden md:flex relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 flex-shrink-0
                  ${selectedLeads.has('all') ? 'bg-indigo-600' : 'bg-gray-300'}
                `}
              >
                <span className={`
                  inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm
                  ${selectedLeads.has('all') ? 'translate-x-5' : 'translate-x-0.5'}
                `} />
              </button>
              {/* Mobile: Chip */}
              <button
                onClick={() => toggleLead('all')}
                className={`
                  md:hidden px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1
                  ${selectedLeads.has('all') 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                All
              </button>
              <span className="hidden md:inline text-[9px] text-gray-600 font-medium whitespace-nowrap">All</span>
            </>
          ) : (
            // Show individual leads - Toggle for desktop, Chip for mobile
            <>
              {availableLeads.map(lead => (
                <div key={lead} className="flex items-center gap-1">
                  {/* Desktop: Toggle */}
                  <button
                    onClick={() => toggleLead(lead)}
                    className={`
                      hidden md:flex relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1
                      ${isLeadActive(lead) ? 'bg-indigo-600' : 'bg-gray-300'}
                    `}
                  >
                    <span className={`
                      inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm
                      ${isLeadActive(lead) ? 'translate-x-5' : 'translate-x-0.5'}
                    `} />
                  </button>
                  <span className="hidden md:inline text-[9px] text-gray-600 whitespace-nowrap">{lead}</span>
                  {/* Mobile: Chip */}
                  <button
                    onClick={() => toggleLead(lead)}
                    className={`
                      md:hidden px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-200 whitespace-nowrap
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1
                      ${isLeadActive(lead) 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {lead}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Year Filter - Desktop and Mobile, on the right */}
        {onYearChange && availableYears.length > 0 && (
          <div className="relative" ref={finalYearDropdownRef}>
            <button
              onClick={() => onYearDropdownToggle && onYearDropdownToggle(!isYearDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 shadow-sm"
            >
              <span className="text-xs md:text-sm font-semibold text-gray-700 md:text-gray-900">{selectedYear}</span>
              <ChevronDown className={`h-3 w-3 md:h-4 md:w-4 text-gray-500 transition-transform duration-200 ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isYearDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-24 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                {availableYears.map((year: number) => (
                  <button
                    key={year}
                    onClick={() => {
                      onYearChange(year.toString());
                      onYearDropdownToggle && onYearDropdownToggle(false);
                    }}
                    className={`
                      w-full px-3 py-2 text-left text-xs transition-colors
                      ${selectedYear === year.toString() 
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
        )}
      </div>
      
      {/* 2 Column List Layout */}
      <div className="flex-1 overflow-y-auto">
        <AuditPlanProgressChart
          plans={filteredPlans}
          onView={handleView}
          onStatusChange={handleStatusChange}
          year={year}
          compact={true}
          twoColumn={true}
        />
      </div>

      {/* Audit Plan Detail Modal - View Only */}
      {viewingPlan && (
        <AuditPlanDetailModal
          plan={viewingPlan}
          onClose={() => setViewingPlan(undefined)}
          onEdit={() => {
            // Navigate to annual audit plan page for editing
            window.location.href = `/annual-audit-plan?selectedPlanId=${viewingPlan.id}&selectedYear=${year}`;
          }}
          viewOnly={true}
        />
      )}
    </div>
  );
}
