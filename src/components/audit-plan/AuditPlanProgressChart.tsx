import React, { useState, useRef, useEffect, useMemo } from 'react';
import Card, { CardHeader, CardBody as CardContent } from '../ui/Card';
// import Badge from '../ui/Badge'; // Not used in compact/2-column mode
import { AuditPlan } from '../../hooks/useAuditPlans';

interface AuditPlanProgressChartProps {
    plans: AuditPlan[];
    onView: (plan: AuditPlan) => void;
    onStatusChange: (id: number, status: string) => void;
    year?: number;
    compact?: boolean; // For dashboard view - hide status column and make more compact
    twoColumn?: boolean; // Display as 2-column grid layout
}

const STATUS_STEPS = [
    'Planned',
    'Fieldwork',
    'Pre Closing Meeting',
    'Closing Meeting',
    'Completed'
];

const getProgress = (status: string) => {
    const index = STATUS_STEPS.indexOf(status);
    if (index === -1) return 0;
    return ((index + 1) / STATUS_STEPS.length) * 100;
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Planned': return 'bg-blue-500';
        case 'Fieldwork': return 'bg-yellow-500';
        case 'Pre Closing Meeting': return 'bg-orange-500';
        case 'Closing Meeting': return 'bg-purple-500';
        case 'Completed': return 'bg-green-500';
        default: return 'bg-gray-500';
    }
};

// const getStatusBadgeVariant = (status: string) => {
//     switch (status) {
//         case 'Planned': return 'info';
//         case 'Fieldwork': return 'warning';
//         case 'Pre Closing Meeting': return 'orange';
//         case 'Closing Meeting': return 'purple';
//         case 'Completed': return 'success';
//         default: return 'default';
//     }
// }; // Not used in compact/2-column mode

// Helper function to render table row (reusable for 2-column layout - desktop only)
const renderTableRow = (
    plan: AuditPlan,
    index: number,
    compact: boolean,
    onView: (plan: AuditPlan) => void,
    onStatusChange: (id: number, status: string) => void,
    hoveredStatus: { planId: number; stepIndex: number } | null,
    setHoveredStatus: (status: { planId: number; stepIndex: number } | null) => void,
    recentlyChangedId: number | null,
    pendingStatusChange: { id: number; status: string } | null
) => {
    // Use pending status for progress bar if this plan is being changed
    const displayStatus = (pendingStatusChange && pendingStatusChange.id === plan.id) 
        ? pendingStatusChange.status 
        : plan.status;
    const progress = getProgress(displayStatus);
    const statusColor = getStatusColor(displayStatus);
    const stepIndex = STATUS_STEPS.indexOf(displayStatus);

    const isRecentlyChanged = recentlyChangedId === plan.id;
    
    return (
        <tr 
            key={plan.id} 
            className={`
                cursor-pointer border-b
                ${isRecentlyChanged 
                    ? 'bg-indigo-50/50 border-indigo-300 shadow-md z-10' 
                    : index % 2 === 0 ? 'bg-white border-gray-100' : 'bg-gray-50/30 border-gray-100'
                }
                hover:bg-indigo-50/50
                ${compact ? 'text-[11px]' : ''}
            `} 
            onClick={() => onView(plan)}
            style={{
                transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease-in-out, background-color 0.3s ease-in-out, border-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                transform: isRecentlyChanged ? 'scale(1.01)' : 'scale(1)',
            }}
        >
            <td className={compact ? "px-2 py-2" : "px-3 py-2"} style={{ width: compact ? '35%' : '40%' }}>
                <div className="flex flex-col gap-1.5">
                    <span className={`font-medium ${compact ? 'text-sm' : 'text-base'} text-gray-900 leading-tight hover:text-indigo-600 transition-colors line-clamp-2`}>
                        {plan.audit_name || plan.audit_type}
                    </span>
                    <div className="flex items-center gap-2">
                        <div className={`${compact ? 'h-5 w-5 text-[10px]' : 'h-6 w-6 text-xs'} rounded-full bg-indigo-100 flex items-center justify-center font-medium text-indigo-700 flex-shrink-0`}>
                            {(plan.audit_lead_name || plan.audit_lead_email).charAt(0).toUpperCase()}
                        </div>
                        <span className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600 truncate`} title={plan.audit_lead_email}>
                            {plan.audit_lead_name || plan.audit_lead_email.split('@')[0]}
                        </span>
                    </div>
                </div>
            </td>
            <td className={compact ? "px-2 py-2" : "px-3 py-2"} style={{ width: compact ? '65%' : '60%' }}>
                <div 
                    className="w-full relative overflow-visible"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={`flex justify-between items-center ${compact ? 'text-xs mb-1.5' : 'text-sm mb-2'}`}>
                        <span className="font-medium text-gray-700">{Math.round(progress)}%</span>
                        <span className="text-gray-500">{stepIndex + 1}/{STATUS_STEPS.length}</span>
                    </div>
                                                <div 
                                                    className={`relative w-full bg-gray-100 rounded-full ${compact ? 'h-2.5' : 'h-3'} overflow-hidden ${compact ? '' : 'cursor-pointer hover:bg-gray-200'} transition-colors`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!compact) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left;
                                const clickPercentage = (clickX / rect.width) * 100;
                                
                                const statusIndex = Math.min(
                                    Math.floor(clickPercentage / (100 / STATUS_STEPS.length)),
                                    STATUS_STEPS.length - 1
                                );
                                const clickedStatus = STATUS_STEPS[statusIndex];
                                
                                if (clickedStatus && clickedStatus !== plan.status) {
                                    onStatusChange(plan.id, clickedStatus);
                                }
                            }
                        }}
                    >
                        <div
                            className={`h-full rounded-full ${statusColor} transition-all duration-700 ease-in-out`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className={`flex justify-between items-center ${compact ? 'mt-2 gap-0.5' : 'mt-2 gap-1'} relative overflow-visible`}>
                        {STATUS_STEPS.map((step, idx) => {
                            const isCompleted = idx <= stepIndex;
                            const isCurrent = idx === stepIndex;
                            const stepColor = getStatusColor(step);
                            const canClick = step !== plan.status;
                            const isHovered = hoveredStatus?.planId === plan.id && hoveredStatus?.stepIndex === idx;
                            return (
                                <div key={step} className="relative flex-1 flex justify-center overflow-visible">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (canClick && !compact) {
                                                onStatusChange(plan.id, step);
                                            }
                                        }}
                                        onMouseEnter={() => setHoveredStatus({ planId: plan.id, stepIndex: idx })}
                                        onMouseLeave={() => setHoveredStatus(null)}
                                        className={`
                                            ${compact ? 'text-[9px]' : 'text-xs'} text-center truncate px-0.5 w-full
                                            transition-all duration-200
                                            ${canClick && !compact ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
                                            ${!canClick || compact ? 'opacity-50' : ''}
                                            ${isCurrent 
                                                ? 'font-semibold text-gray-900' 
                                                : isCompleted 
                                                ? 'text-gray-700' 
                                                : 'text-gray-400'
                                            }
                                        `}
                                    >
                                        <div className={`flex flex-col items-center ${compact ? 'gap-0.5' : 'gap-0.5'}`}>
                                            <div 
                                                className={`
                                                    ${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'} rounded-full transition-all duration-200
                                                    ${isCompleted ? stepColor : 'bg-gray-300'}
                                                    ${canClick && !compact ? 'hover:scale-125' : ''}
                                                `} 
                                            />
                                        </div>
                                    </button>
                                    {isHovered && (
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg z-[100] whitespace-nowrap pointer-events-none">
                                            {step}
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </td>
        </tr>
    );
};

export const AuditPlanProgressChart: React.FC<AuditPlanProgressChartProps> = ({
    plans,
    onView,
    onStatusChange,
    year,
    compact = false,
    twoColumn = false
}) => {
    const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
    const dropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
    const [hoveredStatus, setHoveredStatus] = useState<{ planId: number; stepIndex: number } | null>(null);
    const [recentlyChangedId, setRecentlyChangedId] = useState<number | null>(null);
    
    // Sort plans by status (Completed at bottom, Planned at top)
    const sortedPlans = useMemo(() => {
        const sorted = [...plans];
        return sorted.sort((a, b) => {
            const aIndex = STATUS_STEPS.indexOf(a.status);
            const bIndex = STATUS_STEPS.indexOf(b.status);
            // Normal order: Planned (index 0) at top, Completed (index 4) at bottom
            return aIndex - bIndex;
        });
    }, [plans]);

    const [pendingStatusChange, setPendingStatusChange] = useState<{ id: number; status: string } | null>(null);

    // Track recently changed plan for animation
    useEffect(() => {
        if (recentlyChangedId !== null && pendingStatusChange) {
            // First: Progress bar animation (700ms)
            const progressTimer = setTimeout(() => {
                // Apply status change after progress bar animation completes
                onStatusChange(pendingStatusChange.id, pendingStatusChange.status);
                setPendingStatusChange(null);
                
                // Then: Reordering animation (800ms) + highlight fade
                const reorderTimer = setTimeout(() => {
                    setRecentlyChangedId(null);
                }, 1000);
                return () => clearTimeout(reorderTimer);
            }, 700);
            return () => clearTimeout(progressTimer);
        }
    }, [recentlyChangedId, pendingStatusChange, onStatusChange]);

    // Enhanced status change handler with animation
    const handleStatusChangeWithAnimation = (id: number, status: string) => {
        setRecentlyChangedId(id);
        setPendingStatusChange({ id, status });
        // Don't apply status change immediately - wait for progress bar animation
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openDropdownId !== null) {
                const dropdown = dropdownRefs.current[openDropdownId];
                if (dropdown && !dropdown.contains(event.target as Node)) {
                    setOpenDropdownId(null);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openDropdownId]);

    // Use provided year prop, or derive from first plan, or use current year
    const displayYear = year || (plans && plans.length > 0 ? plans[0]?.audit_year : new Date().getFullYear());

    const colSpan = compact ? 2 : 3;
    
    return (
        <Card className={`w-full bg-white shadow-sm h-auto md:h-full flex flex-col ${compact ? 'border-0 shadow-none' : ''}`}>
            {!compact && (
                <CardHeader className="pb-1.5 pt-3 px-4 border-b border-gray-100 flex-shrink-0">
                    <h3 className="font-semibold text-base text-gray-900">{displayYear} Audit Plan</h3>
                </CardHeader>
            )}
            <CardContent className={`p-0 relative md:flex-1 md:min-h-0 ${compact ? 'pt-0' : ''} md:overflow-hidden`}>
                <div className="md:overflow-x-auto md:overflow-y-auto md:h-full">
                    {twoColumn ? (
                        // 2 Column Table Layout - List Style (Desktop only, mobile uses single column)
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x md:divide-gray-200">
                            {/* Left Column - Hidden on mobile, shown on desktop */}
                            <div className="hidden md:block min-w-0">
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-white z-10">
                                        <tr className="bg-gray-50/50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                                            <th className={compact ? "px-2 py-2" : "px-3 py-2"}>Audit & Lead</th>
                                            <th className={compact ? "px-2 py-2" : "px-3 py-2"}>Progress</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                    {sortedPlans.length === 0 ? (
                                        <tr>
                                            <td colSpan={2} className={`${compact ? 'px-2 py-4' : 'px-3 py-8'} text-center text-gray-500`}>
                                                No audit plans found.
                                            </td>
                                        </tr>
                                    ) : (
                                        sortedPlans
                                            .filter((_, index) => index % 2 === 0)
                                            .map((plan, index) => renderTableRow(plan, index * 2, compact, onView, handleStatusChangeWithAnimation, hoveredStatus, setHoveredStatus, recentlyChangedId, pendingStatusChange))
                                    )}
                                    </tbody>
                                </table>
                            </div>
                            {/* Right Column - Hidden on mobile, shown on desktop */}
                            <div className="hidden md:block min-w-0">
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-white z-10">
                                        <tr className="bg-gray-50/50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                                            <th className={compact ? "px-2 py-2" : "px-3 py-2"}>Audit & Lead</th>
                                            <th className={compact ? "px-2 py-2" : "px-3 py-2"}>Progress</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                    {sortedPlans.length === 0 ? null : (
                                        sortedPlans
                                            .filter((_, index) => index % 2 === 1)
                                            .map((plan, index) => renderTableRow(plan, index * 2 + 1, compact, onView, handleStatusChangeWithAnimation, hoveredStatus, setHoveredStatus, recentlyChangedId, pendingStatusChange))
                                    )}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile Card Layout - Shown only on mobile */}
                            <div className="md:hidden min-w-0 px-2 py-2 space-y-2" style={{ transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                                    {sortedPlans.length === 0 ? (
                                    <div className="text-center py-6 text-gray-500 text-xs">
                                                No audit plans found.
                                    </div>
                                ) : (
                                    sortedPlans.map((plan) => {
                                        // Use pending status for progress bar if this plan is being changed
                                        const displayStatus = (pendingStatusChange && pendingStatusChange.id === plan.id) 
                                            ? pendingStatusChange.status 
                                            : plan.status;
                                        const progress = getProgress(displayStatus);
                                        const statusColor = getStatusColor(displayStatus);
                                        const stepIndex = STATUS_STEPS.indexOf(displayStatus);
                                        const isRecentlyChanged = recentlyChangedId === plan.id;
                                        
                                        return (
                                            <div
                                                key={plan.id}
                                                onClick={() => onView(plan)}
                                                className={`
                                                    bg-white rounded-lg border p-2.5 active:bg-gray-50 cursor-pointer
                                                    ${isRecentlyChanged 
                                                        ? 'border-indigo-400 shadow-lg ring-2 ring-indigo-200 bg-indigo-50/30 z-10' 
                                                        : 'border-gray-200'
                                                    }
                                                `}
                                                style={{
                                                    transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease-in-out, box-shadow 0.3s ease-in-out',
                                                    transform: isRecentlyChanged ? 'scale(1.02)' : 'scale(1)',
                                                }}
                                            >
                                                {/* Header: Audit Name & Lead */}
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-bold text-gray-900 leading-tight mb-1 line-clamp-2">
                                                            {plan.audit_name || plan.audit_type}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center font-semibold text-indigo-700 flex-shrink-0 text-[10px]">
                                                                {(plan.audit_lead_name || plan.audit_lead_email).charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="text-[10px] text-gray-600 truncate font-medium">
                                                                {plan.audit_lead_name || plan.audit_lead_email.split('@')[0]}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex-shrink-0 text-right">
                                                        <div className="text-sm font-bold text-gray-900">{Math.round(progress)}%</div>
                                                        <div className="text-[9px] text-gray-500 mt-0.5">{stepIndex + 1}/{STATUS_STEPS.length}</div>
                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                <div 
                                                    className="relative w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-2"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        const clickX = e.clientX - rect.left;
                                                        const clickPercentage = (clickX / rect.width) * 100;
                                                        
                                                        const statusIndex = Math.min(
                                                            Math.floor(clickPercentage / (100 / STATUS_STEPS.length)),
                                                            STATUS_STEPS.length - 1
                                                        );
                                                        const clickedStatus = STATUS_STEPS[statusIndex];
                                                        
                                                        if (clickedStatus && clickedStatus !== plan.status) {
                                                            handleStatusChangeWithAnimation(plan.id, clickedStatus);
                                                        }
                                                    }}
                                                >
                                                    <div
                                                        className={`h-full rounded-full ${statusColor} transition-all duration-700 ease-in-out`}
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>

                                                {/* Status Steps */}
                                                <div className="flex justify-between items-center gap-0.5 relative">
                                                    {STATUS_STEPS.map((step, idx) => {
                                                        const isCompleted = idx <= stepIndex;
                                                        const isCurrent = idx === stepIndex;
                                                        const stepColor = getStatusColor(step);
                                                        const canClick = step !== plan.status;
                                                        const isHovered = hoveredStatus?.planId === plan.id && hoveredStatus?.stepIndex === idx;
                                                        
                                                        return (
                                                            <div key={step} className="relative flex-1 flex flex-col items-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (canClick) {
                                                                            handleStatusChangeWithAnimation(plan.id, step);
                                                                        }
                                                                    }}
                                                                    onTouchStart={() => setHoveredStatus({ planId: plan.id, stepIndex: idx })}
                                                                    onTouchEnd={() => setHoveredStatus(null)}
                                                                    className={`
                                                                        w-full flex flex-col items-center gap-0.5
                                                                        transition-all duration-200
                                                                        ${canClick ? 'active:opacity-80' : ''}
                                                                    `}
                                                                >
                                                                    <div 
                                                                        className={`
                                                                            w-3 h-3 rounded-full transition-all duration-200
                                                                            ${isCompleted ? stepColor : 'bg-gray-300'}
                                                                            ${isCurrent ? 'ring-1 ring-offset-0.5 ring-gray-400' : ''}
                                                                        `} 
                                                                    />
                                                                    <span className={`
                                                                        text-[8px] text-center leading-tight
                                                                        ${isCurrent 
                                                                            ? 'font-bold text-gray-900' 
                                                                            : isCompleted 
                                                                            ? 'text-gray-700 font-medium' 
                                                                            : 'text-gray-400'
                                                                        }
                                                                    `}>
                                                                        {step.split(' ')[0]}
                                                                    </span>
                                                                </button>
                                                                {isHovered && (
                                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 bg-gray-900 text-white text-[8px] px-1.5 py-0.5 rounded shadow-lg z-[100] whitespace-nowrap pointer-events-none">
                                                                        {step}
                                                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-gray-900"></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Mobile Card Layout */}
                            <div className="md:hidden px-2 py-2 space-y-2" style={{ transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                                {sortedPlans.length === 0 ? (
                                    <div className="text-center py-6 text-gray-500 text-xs">
                                        No audit plans found for the selected year.
                                    </div>
                                ) : (
                                    sortedPlans.map((plan) => {
                                        // Use pending status for progress bar if this plan is being changed
                                        const displayStatus = (pendingStatusChange && pendingStatusChange.id === plan.id) 
                                            ? pendingStatusChange.status 
                                            : plan.status;
                                        const progress = getProgress(displayStatus);
                                        const statusColor = getStatusColor(displayStatus);
                                        const stepIndex = STATUS_STEPS.indexOf(displayStatus);
                                        const isRecentlyChanged = recentlyChangedId === plan.id;
                                        
                                        return (
                                            <div
                                                key={plan.id}
                                                onClick={() => onView(plan)}
                                                className={`
                                                    bg-white rounded-lg border p-2.5 active:bg-gray-50 cursor-pointer
                                                    ${isRecentlyChanged 
                                                        ? 'border-indigo-400 shadow-lg ring-2 ring-indigo-200 bg-indigo-50/30 z-10' 
                                                        : 'border-gray-200'
                                                    }
                                                `}
                                                style={{
                                                    transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease-in-out, box-shadow 0.3s ease-in-out',
                                                    transform: isRecentlyChanged ? 'scale(1.02)' : 'scale(1)',
                                                }}
                                            >
                                                {/* Header: Audit Name & Lead */}
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-bold text-gray-900 leading-tight mb-1 line-clamp-2">
                                                            {plan.audit_name || plan.audit_type}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center font-semibold text-indigo-700 flex-shrink-0 text-[10px]">
                                                                {(plan.audit_lead_name || plan.audit_lead_email).charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="text-[10px] text-gray-600 truncate font-medium">
                                                                {plan.audit_lead_name || plan.audit_lead_email.split('@')[0]}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex-shrink-0 text-right">
                                                        <div className="text-sm font-bold text-gray-900">{Math.round(progress)}%</div>
                                                        <div className="text-[9px] text-gray-500 mt-0.5">{stepIndex + 1}/{STATUS_STEPS.length}</div>
                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                <div 
                                                    className="relative w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-2"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        const clickX = e.clientX - rect.left;
                                                        const clickPercentage = (clickX / rect.width) * 100;
                                                        
                                                        const statusIndex = Math.min(
                                                            Math.floor(clickPercentage / (100 / STATUS_STEPS.length)),
                                                            STATUS_STEPS.length - 1
                                                        );
                                                        const clickedStatus = STATUS_STEPS[statusIndex];
                                                        
                                                        if (clickedStatus && clickedStatus !== plan.status) {
                                                            handleStatusChangeWithAnimation(plan.id, clickedStatus);
                                                        }
                                                    }}
                                                >
                                                    <div
                                                        className={`h-full rounded-full ${statusColor} transition-all duration-700 ease-in-out`}
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>

                                                {/* Status Steps */}
                                                <div className="flex justify-between items-center gap-0.5 relative">
                                                    {STATUS_STEPS.map((step, idx) => {
                                                        const isCompleted = idx <= stepIndex;
                                                        const isCurrent = idx === stepIndex;
                                                        const stepColor = getStatusColor(step);
                                                        const canClick = step !== plan.status;
                                                        const isHovered = hoveredStatus?.planId === plan.id && hoveredStatus?.stepIndex === idx;
                                                        
                                                        return (
                                                            <div key={step} className="relative flex-1 flex flex-col items-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (canClick) {
                                                                            handleStatusChangeWithAnimation(plan.id, step);
                                                                        }
                                                                    }}
                                                                    onTouchStart={() => setHoveredStatus({ planId: plan.id, stepIndex: idx })}
                                                                    onTouchEnd={() => setHoveredStatus(null)}
                                                                    className={`
                                                                        w-full flex flex-col items-center gap-0.5
                                                                        transition-all duration-200
                                                                        ${canClick ? 'active:opacity-80' : ''}
                                                                    `}
                                                                >
                                                                    <div 
                                                                        className={`
                                                                            w-3 h-3 rounded-full transition-all duration-200
                                                                            ${isCompleted ? stepColor : 'bg-gray-300'}
                                                                            ${isCurrent ? 'ring-1 ring-offset-0.5 ring-gray-400' : ''}
                                                                        `} 
                                                                    />
                                                                    <span className={`
                                                                        text-[8px] text-center leading-tight
                                                                        ${isCurrent 
                                                                            ? 'font-bold text-gray-900' 
                                                                            : isCompleted 
                                                                            ? 'text-gray-700 font-medium' 
                                                                            : 'text-gray-400'
                                                                        }
                                                                    `}>
                                                                        {step.split(' ')[0]}
                                                                    </span>
                                                                </button>
                                                                {isHovered && (
                                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 bg-gray-900 text-white text-[8px] px-1.5 py-0.5 rounded shadow-lg z-[100] whitespace-nowrap pointer-events-none">
                                                                        {step}
                                                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-gray-900"></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Desktop Table Layout */}
                            <table className="hidden md:table w-full">
                                    <thead className="sticky top-0 bg-white z-10">
                                <tr className="bg-gray-50/50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                                    <th className={compact ? "px-2 py-2" : "px-3 py-2"}>Audit & Lead</th>
                                    <th className={compact ? "px-2 py-2" : "px-3 py-2"}>Progress</th>
                                    {!compact && <th className="px-3 py-2 text-center">Status</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                            {sortedPlans.length === 0 ? (
                                <tr>
                                    <td colSpan={colSpan} className={`${compact ? 'px-2 py-4' : 'px-3 py-8'} text-center text-gray-500`}>
                                        No audit plans found for the selected year.
                                    </td>
                                </tr>
                            ) : (
                                sortedPlans.map((plan, index) => renderTableRow(plan, index, compact, onView, handleStatusChangeWithAnimation, hoveredStatus, setHoveredStatus, recentlyChangedId, pendingStatusChange))
                            )}
                            </tbody>
                        </table>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
