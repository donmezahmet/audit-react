import React, { useState, useMemo } from 'react';
import { AuditPlan } from '../../hooks/useAuditPlans';

interface AuditPlanCalendarFiltersProps {
    plans: AuditPlan[];
    selectedLeads?: Set<string>;
    onLeadsChange?: (leads: Set<string>) => void;
}

export const AuditPlanCalendarFilters: React.FC<AuditPlanCalendarFiltersProps> = ({
    plans,
    selectedLeads: externalSelectedLeads,
    onLeadsChange
}) => {
    const [internalSelectedLeads, setInternalSelectedLeads] = useState<Set<string>>(new Set(['all']));

    const selectedLeads = externalSelectedLeads || internalSelectedLeads;

    // Get unique audit leads - use audit_lead_name directly (should come from users table via backend)
    const auditLeads = useMemo(() => {
        const leads = new Set<string>();
        plans.forEach(plan => {
            // Use audit_lead_name directly - it should already be fetched from users table by backend
            const lead = plan.audit_lead_name;
            if (lead && lead.trim()) {
                leads.add(lead.trim());
            }
        });
        return Array.from(leads).sort();
    }, [plans]);

    const toggleLead = (lead: string) => {
        if (onLeadsChange) {
            const newSet = new Set(selectedLeads);
            if (lead === 'all') {
                if (newSet.has('all')) {
                    // Deactivate all - activate first lead instead
                    newSet.clear();
                    if (auditLeads.length > 0 && auditLeads[0]) {
                        newSet.add(auditLeads[0]);
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
                    if (newSet.size === auditLeads.length) {
                        newSet.clear();
                        newSet.add('all');
                    }
                }
            }
            onLeadsChange(newSet);
        } else {
            setInternalSelectedLeads((prev: Set<string>) => {
                const newSet = new Set(prev);
                if (lead === 'all') {
                    if (newSet.has('all')) {
                        // Deactivate all - activate first lead instead
                        newSet.clear();
                        if (auditLeads.length > 0 && auditLeads[0]) {
                            newSet.add(auditLeads[0]);
                        }
                    } else {
                        newSet.clear();
                        newSet.add('all');
                    }
                } else {
                    newSet.delete('all');
                    if (newSet.has(lead)) {
                        newSet.delete(lead);
                        if (newSet.size === 0) {
                            newSet.add('all');
                        }
                    } else {
                        newSet.add(lead);
                        if (newSet.size === auditLeads.length) {
                            newSet.clear();
                            newSet.add('all');
                        }
                    }
                }
                return newSet;
            });
        }
    };

    // Determine if a lead should appear as active (either explicitly selected or 'all' is selected)
    const isLeadActive = (lead: string) => {
        if (selectedLeads.has('all')) {
            return true; // All leads are active when 'all' is selected
        }
        return selectedLeads.has(lead);
    };

    return (
        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-1.5 py-1 rounded-lg border border-gray-200 shadow-sm overflow-x-auto max-w-[200px] md:max-w-none no-scrollbar">
            <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap mr-0.5">Lead:</span>

            {/* All Option */}
            <button
                onClick={() => toggleLead('all')}
                className={`
                    flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-all border
                    ${selectedLeads.has('all')
                        ? 'bg-indigo-600 text-white border-indigo-600 ring-1 ring-indigo-200'
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}
                `}
                title="All Leads"
            >
                ALL
            </button>

            {/* Individual Leads */}
            {auditLeads.map(lead => {
                // Get initials
                const initials = lead
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                const isActive = isLeadActive(lead) && !selectedLeads.has('all');

                return (
                    <button
                        key={lead}
                        onClick={() => toggleLead(lead)}
                        className={`
                            flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-all border
                            ${isActive
                                ? 'bg-indigo-100 text-indigo-700 border-indigo-200 ring-1 ring-indigo-200'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}
                        `}
                        title={lead}
                    >
                        {initials}
                    </button>
                );
            })}
        </div>
    );
};

