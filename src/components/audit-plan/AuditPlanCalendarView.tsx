import React, { useState, useRef, useEffect } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    startOfYear,
    endOfYear,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    addYears,
    subYears,
    isWithinInterval,
    startOfDay,
    differenceInDays,
    eachMonthOfInterval,
} from 'date-fns';
import { AuditPlan } from '../../hooks/useAuditPlans';
import Button from '../ui/Button';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';

interface AuditPlanCalendarViewProps {
    plans: AuditPlan[];
    onView: (plan: AuditPlan) => void;
    onCreate?: (startDate: string, endDate: string) => void;
}

type ViewMode = 'week' | 'month' | 'year';

export const AuditPlanCalendarView: React.FC<AuditPlanCalendarViewProps> = ({ plans, onView, onCreate }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectionStart, setSelectionStart] = useState<Date | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectedMobileDate, setSelectedMobileDate] = useState(new Date());
    const calendarRef = useRef<HTMLDivElement>(null);

    // Update selected date when switching months to keep context
    useEffect(() => {
        setSelectedMobileDate(currentDate);
    }, [currentDate]);

    const navigate = {
        next: () => {
            if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
            else if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
            else setCurrentDate(addYears(currentDate, 1));
        },
        prev: () => {
            if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
            else if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
            else setCurrentDate(subYears(currentDate, 1));
        },
    };

    const goToToday = () => setCurrentDate(new Date());

    // Get date range based on view mode
    const getDateRange = () => {
        if (viewMode === 'week') {
            const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
            const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
            return { start: weekStart, end: weekEnd };
        } else if (viewMode === 'month') {
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(monthStart);
            const start = startOfWeek(monthStart, { weekStartsOn: 1 });
            const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
            return { start, end };
        } else {
            const yearStart = startOfYear(currentDate);
            const yearEnd = endOfYear(currentDate);
            return { start: yearStart, end: yearEnd };
        }
    };

    const { start: rangeStart, end: rangeEnd } = getDateRange();
    const calendarDays = viewMode === 'year'
        ? eachMonthOfInterval({ start: rangeStart, end: rangeEnd })
        : eachDayOfInterval({ start: rangeStart, end: rangeEnd });

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Mouse selection handlers
    const handleMouseDown = (day: Date) => {
        if (viewMode === 'year') return; // No selection for year view
        setIsSelecting(true);
        setSelectionStart(startOfDay(day));
        setSelectionEnd(startOfDay(day));
    };

    const handleMouseEnter = (day: Date) => {
        if (isSelecting && selectionStart) {
            const dayStart = startOfDay(day);
            if (dayStart < selectionStart) {
                setSelectionStart(dayStart);
                setSelectionEnd(selectionStart);
            } else {
                setSelectionEnd(dayStart);
            }
        }
    };

    const handleMouseUp = () => {
        if (isSelecting && selectionStart && selectionEnd && onCreate) {
            const start = selectionStart < selectionEnd ? selectionStart : selectionEnd;
            const end = selectionStart < selectionEnd ? selectionEnd : selectionStart;

            // Only open form if selection spans at least 1 day
            if (differenceInDays(end, start) >= 0) {
                onCreate(
                    format(start, 'yyyy-MM-dd'),
                    format(end, 'yyyy-MM-dd')
                );
            }
        }
        setIsSelecting(false);
        setSelectionStart(null);
        setSelectionEnd(null);
    };

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isSelecting) {
                handleMouseUp();
            }
        };

        document.addEventListener('mouseup', handleGlobalMouseUp);
        return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [isSelecting, selectionStart, selectionEnd, onCreate]);

    // Plans are already filtered by parent component
    const filteredPlans = plans;

    // Helper to check if a plan is active on a given day
    const getPlansForDay = (day: Date) => {
        return filteredPlans.filter(plan => {
            if (!plan.start_date) return false;

            const planStart = new Date(plan.start_date);

            // If no end date, use start_date + duration
            let planEnd: Date;
            if (plan.end_date) {
                planEnd = new Date(plan.end_date);
            } else if (plan.audit_duration_weeks) {
                planEnd = new Date(planStart.getTime() + (plan.audit_duration_weeks * 7 * 24 * 60 * 60 * 1000));
            } else {
                // If no end date and no duration, show only on start date
                return isSameDay(day, planStart);
            }

            return isWithinInterval(day, { start: planStart, end: planEnd });
        });
    };

    const isDayInSelection = (day: Date) => {
        if (!selectionStart || !selectionEnd) return false;
        const dayStart = startOfDay(day);
        const start = selectionStart < selectionEnd ? selectionStart : selectionEnd;
        const end = selectionStart < selectionEnd ? selectionEnd : selectionStart;
        return dayStart >= start && dayStart <= end;
    };

    const getSelectionPosition = (day: Date) => {
        if (!selectionStart || !selectionEnd) return null;
        const dayStart = startOfDay(day);
        const start = selectionStart < selectionEnd ? selectionStart : selectionEnd;
        const end = selectionStart < selectionEnd ? selectionEnd : selectionStart;

        if (dayStart < start || dayStart > end) return null;

        const isStart = isSameDay(dayStart, start);
        const isEnd = isSameDay(dayStart, end);
        const isMiddle = !isStart && !isEnd;

        return { isStart, isEnd, isMiddle };
    };

    const getSelectionDuration = () => {
        if (!selectionStart || !selectionEnd) return null;
        const start = selectionStart < selectionEnd ? selectionStart : selectionEnd;
        const end = selectionStart < selectionEnd ? selectionEnd : selectionStart;
        const days = differenceInDays(end, start) + 1;
        return days;
    };



    const STATUS_LIST = [
        'Planned',
        'Fieldwork',
        'Pre Closing Meeting',
        'Closing Meeting',
        'Completed'
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Planned': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Fieldwork': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Pre Closing Meeting': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'Closing Meeting': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 relative" style={{ minHeight: 0 }}>
            {/* Header Controls */}
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-3 md:px-0">
                <div className="flex items-center justify-between md:justify-start md:gap-4 w-full md:w-auto">
                    <h2 className="text-lg md:text-xl font-bold text-gray-900 md:ml-1">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={navigate.prev}
                            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition-colors active:scale-95"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            onClick={navigate.next}
                            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition-colors active:scale-95"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-4">
                    {/* Status Legend */}
                    <div className="flex items-center gap-2.5">
                        {STATUS_LIST.map(status => {
                            const statusColors = getStatusColor(status);
                            const statusColorClasses = statusColors.split(' ');
                            const bgColor = statusColorClasses.find(c => c.startsWith('bg-')) || 'bg-gray-100';
                            return (
                                <div key={status} className="flex items-center gap-1.5">
                                    <div className={`w-3.5 h-3.5 rounded ${bgColor} border-2 border-gray-400 shadow-sm`} />
                                    <span className="text-[10px] font-medium text-gray-700">{status}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="h-6 w-px bg-gray-200 mx-2" />

                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {(['week', 'month', 'year'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`
                                    px-4 py-1.5 rounded-md text-sm font-medium transition-all
                                    ${viewMode === mode
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                    }
                                `}
                            >
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </button>
                        ))}
                    </div>

                    <Button variant="outline" size="sm" onClick={goToToday}>
                        Today
                    </Button>
                </div>
            </div>


            {viewMode === 'year' ? (
                <div className="grid grid-cols-4 gap-4 p-4 flex-1 overflow-y-auto">
                    {calendarDays.map((month) => {
                        const monthStart = startOfMonth(month);
                        const monthEnd = endOfMonth(monthStart);
                        const weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
                        const weekEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
                        const monthDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

                        return (
                            <div key={month.toString()} className="border border-gray-200 rounded-lg p-2 bg-white">
                                <div className="text-sm font-semibold text-gray-700 mb-2 text-center">
                                    {format(month, 'MMMM yyyy')}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {weekDays.map(day => (
                                        <div key={day} className="text-[9px] text-center text-gray-500 font-medium py-1">
                                            {day[0]}
                                        </div>
                                    ))}
                                    {monthDays.map((day) => {
                                        const isToday = isSameDay(day, new Date());
                                        const isMonthDay = isSameMonth(day, month);
                                        const dayPlans = getPlansForDay(day);

                                        return (
                                            <div
                                                key={day.toString()}
                                                className={`
                                                    text-[10px] p-0.5 min-h-[20px] rounded
                                                    ${!isMonthDay ? 'text-gray-300' : isToday ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-600'}
                                                    ${isDayInSelection(day) ? 'bg-indigo-200' : ''}
                                                `}
                                            >
                                                <div className="text-center">{format(day, 'd')}</div>
                                                {dayPlans.length > 0 && (
                                                    <div className="w-full h-1 bg-indigo-400 rounded mt-0.5" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <>
                    {/* Desktop Grid View */}
                    <div className="hidden md:grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                        {weekDays.map(day => (
                            <div key={day} className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div ref={calendarRef} className="hidden md:grid grid-cols-7 flex-1 overflow-y-auto overflow-x-hidden relative border border-gray-300" style={{ minHeight: 0, gridAutoRows: 'minmax(120px, 1fr)' }}>
                        {/* Selection duration indicator */}
                        {isSelecting && selectionStart && selectionEnd && (
                            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-full shadow-xl text-sm font-semibold backdrop-blur-sm">
                                {getSelectionDuration()} day{getSelectionDuration() !== 1 ? 's' : ''} selected
                            </div>
                        )}

                        {calendarDays.map((day) => {
                            const dayPlans = getPlansForDay(day);
                            const isToday = isSameDay(day, new Date());
                            const isCurrentMonth = viewMode === 'month' ? isSameMonth(day, currentDate) : true;
                            const selectionPos = getSelectionPosition(day);
                            const inSelection = !!selectionPos;

                            return (
                                <div
                                    key={day.toString()}
                                    onMouseDown={() => handleMouseDown(day)}
                                    onMouseEnter={() => handleMouseEnter(day)}
                                    className={`
                                        min-h-[120px] border border-gray-300 p-1.5 transition-all duration-200 relative select-none
                                        ${!isCurrentMonth ? 'bg-gray-50/30 text-gray-400' : 'bg-white'}
                                        ${inSelection
                                            ? 'bg-gradient-to-br from-indigo-50 to-purple-50'
                                            : isSelecting
                                                ? 'hover:bg-indigo-50/50'
                                                : 'hover:bg-gray-50'
                                        }
                                        ${isSelecting ? 'cursor-crosshair' : 'cursor-pointer'}
                                        overflow-hidden flex flex-col
                                        z-0
                                    `}
                                >
                                    {/* Modern selection border */}
                                    {selectionPos && (
                                        <div className={`
                                            absolute inset-0 pointer-events-none
                                            ${selectionPos.isStart ? 'border-l-4 border-indigo-500 rounded-l' : ''}
                                            ${selectionPos.isEnd ? 'border-r-4 border-indigo-500 rounded-r' : ''}
                                            ${selectionPos.isMiddle ? 'border-y-2 border-indigo-300' : ''}
                                        `} />
                                    )}

                                    <div className="flex justify-between items-start mb-1 relative z-10 flex-shrink-0">
                                        <span className={`
                                            text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-all select-none
                                            ${isToday && !inSelection ? 'bg-indigo-600 text-white' : ''}
                                            ${inSelection
                                                ? selectionPos?.isStart || selectionPos?.isEnd
                                                    ? 'bg-indigo-500 text-white ring-2 ring-indigo-300 ring-offset-1'
                                                    : 'bg-indigo-100 text-indigo-700'
                                                : ''
                                            }
                                        `}>
                                            {format(day, 'd')}
                                        </span>
                                        {/* Audit count badge */}
                                        {dayPlans.length > 0 && (
                                            <span className="text-[9px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                                {dayPlans.length}
                                            </span>
                                        )}
                                    </div>

                                    <div className="relative flex-1 min-h-0 overflow-hidden flex-shrink">
                                        <div
                                            className="flex flex-wrap gap-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 relative z-10"
                                            style={{ maxHeight: '100%' }}
                                            ref={(el) => {
                                                if (el) {
                                                    const checkScroll = () => {
                                                        const hasScroll = el.scrollHeight > el.clientHeight;
                                                        const isScrolledToBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 1;
                                                        const indicator = el.parentElement?.querySelector('.scroll-indicator') as HTMLElement;
                                                        if (indicator) {
                                                            indicator.style.opacity = hasScroll && !isScrolledToBottom ? '1' : '0';
                                                        }
                                                    };
                                                    el.addEventListener('scroll', checkScroll);
                                                    // Check on mount and when plans change
                                                    setTimeout(checkScroll, 0);
                                                    // Check when content changes
                                                    const resizeObserver = new ResizeObserver(checkScroll);
                                                    resizeObserver.observe(el);
                                                }
                                            }}
                                        >
                                            {dayPlans.map((plan) => {
                                                const statusColors = getStatusColor(plan.status);
                                                const statusColorClasses = statusColors.split(' ');
                                                const bgColor = statusColorClasses.find(c => c.startsWith('bg-')) || 'bg-gray-100';
                                                const textColor = statusColorClasses.find(c => c.startsWith('text-')) || 'text-gray-700';
                                                const borderColor = statusColorClasses.find(c => c.startsWith('border-')) || 'border-gray-200';

                                                return (
                                                    <div
                                                        key={plan.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onView(plan);
                                                        }}
                                                        className={`
                                                        text-[9px] px-1 py-0.5 rounded border-l-3 border cursor-pointer
                                                        ${bgColor} ${textColor} ${borderColor}
                                                        hover:shadow-md hover:scale-[1.01] transition-all
                                                        group relative
                                                        shadow-sm
                                                        flex-shrink-0
                                                        min-w-[120px] max-w-[48%]
                                                        overflow-visible
                                                    `}
                                                        style={{
                                                            borderLeftWidth: '3px',
                                                            borderTopWidth: '1px',
                                                            borderRightWidth: '1px',
                                                            borderBottomWidth: '1px',
                                                        }}
                                                        title={`${plan.audit_name || plan.audit_type} - ${plan.audit_lead_name || plan.audit_lead_email.split('@')[0]} - ${plan.status}`}
                                                    >
                                                        {/* Status badge on hover - top right corner */}
                                                        <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[9999] pointer-events-none">
                                                            <span className={`
                                                            text-[8px] font-semibold px-1.5 py-0.5 rounded-full
                                                            ${bgColor} ${textColor} border ${borderColor}
                                                            shadow-lg whitespace-nowrap
                                                            block
                                                            bg-white
                                                        `}>
                                                                {plan.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-1">
                                                            <div className={`font-semibold text-[10px] truncate flex-1 min-w-0 ${textColor}`}>
                                                                {plan.audit_name || plan.audit_type}
                                                            </div>
                                                            <div className={`flex items-center gap-0.5 text-[8px] ${textColor} opacity-80 flex-shrink-0`}>
                                                                <User className="h-2 w-2 flex-shrink-0 opacity-70" />
                                                                <span className="truncate max-w-[35px]">
                                                                    {plan.audit_lead_name || plan.audit_lead_email.split('@')[0]}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {/* Scroll indicator - gradient fade at bottom */}
                                        <div className="scroll-indicator absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent pointer-events-none z-20 opacity-0 transition-opacity duration-200" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Mobile: Mini-Grid Calendar + Detail View */}
                    <div className="md:hidden flex flex-col h-full bg-white">
                        {/* Days Header */}
                        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
                            {weekDays.map(day => (
                                <div key={day} className="py-2 text-center text-[10px] font-semibold text-gray-400 uppercase">
                                    {day[0]}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 border-gray-200">
                            {calendarDays.map((day) => {
                                const dayPlans = getPlansForDay(day);
                                const isToday = isSameDay(day, new Date());
                                const isCurrentMonth = isSameMonth(day, currentDate);
                                const isSelected = isSameDay(day, selectedMobileDate);

                                return (
                                    <div
                                        key={day.toString()}
                                        onClick={() => setSelectedMobileDate(day)}
                                        className={`
                                            aspect-square border-b border-r border-gray-50 relative flex flex-col items-center justify-center cursor-pointer transition-colors
                                            ${!isCurrentMonth ? 'bg-gray-50/30 text-gray-300' : 'bg-white text-gray-700'}
                                            ${isSelected ? 'bg-indigo-50 ring-inset ring-2 ring-indigo-500 z-10' : ''}
                                        `}
                                    >
                                        <span className={`
                                            text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-0.5
                                            ${isToday ? 'bg-indigo-600 text-white' : ''}
                                            ${isSelected && !isToday ? 'text-indigo-700 font-bold' : ''}
                                        `}>
                                            {format(day, 'd')}
                                        </span>

                                        {/* Dots for plans */}
                                        <div className="flex gap-0.5 h-1.5 px-1 justify-center w-full">
                                            {dayPlans.slice(0, 3).map((plan, i) => {
                                                const statusColors = getStatusColor(plan.status);
                                                const bgColor = statusColors.split(' ').find(c => c.startsWith('bg-')) || 'bg-gray-400';
                                                return (
                                                    <div key={i} className={`w-1 h-1 rounded-full ${bgColor}`} />
                                                );
                                            })}
                                            {dayPlans.length > 3 && (
                                                <div className="w-1 h-1 rounded-full bg-gray-300" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Selected Day Details */}
                        <div className="flex-1 overflow-y-auto bg-white px-3 pt-3 pb-4">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-xs font-bold text-gray-900">
                                    {format(selectedMobileDate, 'EEEE, d MMMM')}
                                </h3>
                                {isSameDay(selectedMobileDate, new Date()) && (
                                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                        TODAY
                                    </span>
                                )}
                            </div>

                            {getPlansForDay(selectedMobileDate).length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-24 text-gray-400">
                                    <p className="text-[10px] font-medium">No audits planned</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {getPlansForDay(selectedMobileDate).map((plan) => {
                                        const statusColors = getStatusColor(plan.status);
                                        const statusColorClasses = statusColors.split(' ');
                                        const bgColor = statusColorClasses.find(c => c.startsWith('bg-')) || 'bg-gray-100';
                                        const textColor = statusColorClasses.find(c => c.startsWith('text-')) || 'text-gray-700';

                                        return (
                                            <div
                                                key={plan.id}
                                                onClick={() => onView(plan)}
                                                className="group flex items-center gap-2 p-2 active:bg-gray-50 transition-colors cursor-pointer"
                                            >
                                                {/* Compact status indicator */}
                                                <div className={`flex-shrink-0 w-1.5 h-8 rounded-full ${bgColor.replace('bg-', 'bg-').replace('100', '500').replace('200', '500')}`} />

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-1.5 mb-0.5">
                                                        <h4 className="text-[11px] font-semibold text-gray-900 leading-tight line-clamp-1">
                                                            {plan.audit_name || plan.audit_type}
                                                        </h4>
                                                        <span className={`flex-shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded ${bgColor} ${textColor}`}>
                                                            {plan.status}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1 text-[9px] text-gray-500">
                                                        <User className="h-2.5 w-2.5 text-gray-400 flex-shrink-0" />
                                                        <span className="truncate">
                                                            {plan.audit_lead_name || plan.audit_lead_email.split('@')[0]}
                                                        </span>
                                                    </div>
                                                </div>

                                                <ChevronRight className="h-3 w-3 text-gray-300 group-active:text-gray-400 transition-colors flex-shrink-0" />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
