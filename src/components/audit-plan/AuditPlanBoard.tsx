import React, { useMemo } from 'react';
import {
    DndContext,
    rectIntersection,
    CollisionDetection,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    useDroppable,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AuditPlan } from '../../hooks/useAuditPlans';
import Badge from '../ui/Badge';
import { User, Clock, CheckCircle2, Circle, PlayCircle, Users, ChevronDown } from 'lucide-react';

interface AuditPlanBoardProps {
    plans: AuditPlan[];
    onStatusChange: (id: number, status: string) => void;
    onView: (plan: AuditPlan) => void;
}

const STATUS_COLUMNS = [
    'Planned',
    'Fieldwork',
    'Pre Closing Meeting',
    'Closing Meeting',
    'Completed'
];

const getStatusConfig = (status: string) => {
    switch (status) {
        case 'Planned':
            return {
                borderColor: 'border-l-blue-400',
                gradient: 'from-blue-50/60 to-blue-50/30',
                headerGradient: 'from-blue-400/90 to-blue-500/90',
                icon: Circle,
                dotColor: 'bg-blue-400/90',
                textColor: 'text-blue-600',
            };
        case 'Fieldwork':
            return {
                borderColor: 'border-l-amber-400',
                gradient: 'from-amber-50/60 to-amber-50/30',
                headerGradient: 'from-amber-400/90 to-amber-500/90',
                icon: PlayCircle,
                dotColor: 'bg-amber-400/90',
                textColor: 'text-amber-600',
            };
        case 'Pre Closing Meeting':
            return {
                borderColor: 'border-l-orange-400',
                gradient: 'from-orange-50/60 to-orange-50/30',
                headerGradient: 'from-orange-400/90 to-orange-500/90',
                icon: Users,
                dotColor: 'bg-orange-400/90',
                textColor: 'text-orange-600',
            };
        case 'Closing Meeting':
            return {
                borderColor: 'border-l-indigo-400',
                gradient: 'from-indigo-50/60 to-indigo-50/30',
                headerGradient: 'from-indigo-400/90 to-indigo-500/90',
                icon: Clock,
                dotColor: 'bg-indigo-400/90',
                textColor: 'text-indigo-600',
            };
        case 'Completed':
            return {
                borderColor: 'border-l-emerald-400',
                gradient: 'from-emerald-50/60 to-emerald-50/30',
                headerGradient: 'from-emerald-400/90 to-emerald-500/90',
                icon: CheckCircle2,
                dotColor: 'bg-emerald-400/90',
                textColor: 'text-emerald-600',
            };
        default:
            return {
                borderColor: 'border-l-gray-400',
                gradient: 'from-gray-50/60 to-gray-50/30',
                headerGradient: 'from-gray-400/90 to-gray-500/90',
                icon: Circle,
                dotColor: 'bg-gray-400/90',
                textColor: 'text-gray-600',
            };
    }
};

const SortableItem = ({ plan, onClick, onLongPress }: { plan: AuditPlan; onClick: () => void; onLongPress?: (plan: AuditPlan) => void }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: plan.id,
        animateLayoutChanges: () => true,
    });

    const statusConfig = getStatusConfig(plan.status);
    const [isLongPressing, setIsLongPressing] = React.useState(false);
    const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging
            ? undefined
            : (transition || 'transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'),
        opacity: isDragging ? 0.4 : 1,
        willChange: isDragging ? 'transform' : 'auto',
    };

    const handleTouchStart = (_: React.TouchEvent) => {
        // Only on mobile
        if (window.innerWidth >= 768 || !onLongPress) return;

        setIsLongPressing(true);
        longPressTimer.current = setTimeout(() => {
            setIsLongPressing(false);
            onLongPress(plan);
        }, 500);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        setIsLongPressing(false);
    };

    const handleTouchMove = () => {
        // Cancel long press if user moves finger (scrolling)
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        setIsLongPressing(false);
    };

    // Desktop: use drag & drop listeners. Mobile: use long press (no drag listeners)
    const desktopProps = typeof window !== 'undefined' && window.innerWidth >= 768 ? listeners : {};

    return (
        <div
            ref={setNodeRef}
            style={{ ...style, WebkitTouchCallout: 'none' }}
            {...attributes}
            {...desktopProps}
            className={`mb-2 cursor-grab active:cursor-grabbing group w-full relative transition-transform duration-200 select-none ${isLongPressing ? 'scale-95' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
        >
            <div
                className={`
                    bg-white rounded-md md:rounded-lg shadow-sm border-l-2 md:border-l-4 ${statusConfig.borderColor}
                    hover:shadow-lg hover:scale-[1.01] hover:-translate-y-0.5
                    transition-all duration-200 ease-out
                    border border-gray-100
                    group-hover:border-gray-200
                    w-full
                    relative
                `}
                onClick={(e) => {
                    // Only trigger onClick if not dragging
                    if (!isDragging) {
                        e.stopPropagation();
                        onClick();
                    }
                }}
            >
                {/* Year badge - positioned absolutely in top-right corner */}
                <Badge
                    variant="purple"
                    className="absolute top-0.5 right-0.5 text-[4px] md:text-[10px] px-0.5 md:px-2 py-0 md:py-1 leading-none font-bold"
                >
                    {plan.audit_year}
                </Badge>


                <div className="p-1.5 md:p-3">
                    <div className="mb-0.5 md:mb-2">
                        <h4 className="font-semibold text-xs md:text-sm text-gray-900 line-clamp-2 leading-tight pr-8">
                            {plan.audit_name || plan.audit_type}
                        </h4>
                    </div>

                    <div className={`
                        text-[9px] md:text-xs font-medium mb-0.5 md:mb-2.5 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md inline-block
                        bg-gradient-to-r ${statusConfig.gradient} ${statusConfig.textColor}
                    `}>
                        {plan.department}
                    </div>

                    <div className="flex items-center gap-1 md:gap-2 text-[9px] md:text-[11px] text-gray-500 pt-1 md:pt-2 border-t border-gray-100">
                        <User className="h-2.5 w-2.5 md:h-3.5 md:w-3.5 flex-shrink-0 text-gray-400" />
                        <span className="truncate">{plan.audit_lead_name || plan.audit_lead_email.split('@')[0]}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DroppableColumn = ({ id, title, plans, onCardClick }: { id: string; title: string; plans: AuditPlan[]; onCardClick: (plan: AuditPlan) => void }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    const statusConfig = getStatusConfig(title);
    const Icon = statusConfig.icon;

    return (
        <>
            {/* Mobile: Horizontal layout */}
            <div className="md:hidden space-y-1.5">
                {/* Status header */}
                <div className={`
                    bg-gradient-to-r ${statusConfig.headerGradient}
                    rounded-md px-2.5 py-1.5
                    shadow-sm
                    flex items-center justify-between
                `}>
                    <div className="flex items-center gap-1.5">
                        <Icon className="h-3 w-3 text-white" />
                        <h3 className="font-semibold text-[11px] text-white leading-tight">
                            {title}
                        </h3>
                    </div>
                    <span className={`
                        ${statusConfig.dotColor} text-white text-[10px] font-bold
                        px-1.5 py-0.5 rounded-full min-w-[18px] text-center
                    `}>
                        {plans.length}
                    </span>
                </div>

                {/* Horizontal scrollable cards with droppable area */}
                <div
                    ref={setNodeRef}
                    className={`
                        overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
                        ${isOver ? 'ring-2 ring-offset-1 ring-indigo-300/60 bg-indigo-50/20' : ''}
                    `}
                    style={{ minHeight: '120px', touchAction: 'manipulation' }}
                >
                    <div className="flex gap-2 min-w-max">
                        {plans.length === 0 ? (
                            <div className="flex items-center justify-center w-full h-24 text-gray-400">
                                <div className="text-center">
                                    <Icon className="h-6 w-6 text-gray-300 mx-auto mb-1" />
                                    <p className="text-[10px] font-medium">No audits</p>
                                </div>
                            </div>
                        ) : (
                            <SortableContext items={plans.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                <div className="flex gap-2">
                                    {plans.map((plan) => (
                                        <SortableItem
                                            key={plan.id}
                                            plan={plan}
                                            onClick={() => onCardClick(plan)}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        )}
                    </div>
                </div>
            </div>

            {/* Desktop: Vertical column layout */}
            <div
                ref={setNodeRef}
                className={`
                    hidden md:flex
                    flex-shrink-0 md:flex-1 md:min-w-[320px] md:w-auto h-auto self-start
                    bg-gradient-to-b from-gray-50/40 to-white
                    rounded-xl p-4 flex flex-col
                    border border-gray-200/40
                    transition-all duration-200 ease-out
                    min-h-[600px]
                    ${isOver ? 'ring-2 ring-offset-2 ring-indigo-300/60 shadow-xl scale-[1.01] bg-gradient-to-b from-indigo-50/30 to-white' : ''}
                `}
            >
                <div className={`
                    bg-gradient-to-r ${statusConfig.headerGradient}
                    rounded-lg px-4 py-3 mb-4
                    shadow-sm backdrop-blur-sm
                    flex items-center justify-between
                    group
                    transition-all duration-300
                    pointer-events-none
                `}>
                    <div className="flex items-center gap-2.5">
                        <Icon className="h-4.5 w-4.5 text-white" />
                        <h3 className="font-semibold text-base text-white">
                            {title}
                        </h3>
                    </div>
                    <span className={`
                        ${statusConfig.dotColor} text-white text-xs font-bold
                        px-2.5 py-1 rounded-full
                        min-w-[28px] text-center
                        shadow-sm
                        transition-all duration-200
                        ${plans.length > 0 ? 'scale-110' : 'scale-100'}
                    `}>
                        {plans.length}
                    </span>
                </div>

                <div
                    className="overflow-x-hidden pr-1 flex-1 relative"
                    style={{ minHeight: '100%' }}
                >
                    {plans.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                                <Icon className="h-6 w-6 text-gray-300" />
                            </div>
                            <p className="text-xs font-medium">No audits</p>
                        </div>
                    ) : (
                        <SortableContext items={plans.map(p => p.id)} strategy={verticalListSortingStrategy}>
                            {plans.map((plan) => (
                                <SortableItem
                                    key={plan.id}
                                    plan={plan}
                                    onClick={() => onCardClick(plan)}
                                />
                            ))}
                        </SortableContext>
                    )}
                </div>
            </div>
        </>
    );
};

// Mobile Status Section Component (separate to use hooks properly)
const MobileStatusSection = ({
    status,
    plans,
    isExpanded,
    onToggle,
    onCardClick,
    onLongPress,
    overId
}: {
    status: string;
    plans: AuditPlan[];
    isExpanded: boolean;
    onToggle: () => void;
    onCardClick: (plan: AuditPlan) => void;
    onLongPress: (plan: AuditPlan) => void;
    overId: string | null;
}) => {
    const { setNodeRef } = useDroppable({ id: status });
    const statusConfig = getStatusConfig(status);
    const Icon = statusConfig.icon;

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Collapsible Header */}
            <button
                onClick={onToggle}
                className={`
                    w-full flex items-center justify-between p-3
                    bg-gradient-to-r ${statusConfig.headerGradient}
                    transition-all duration-200
                `}
            >
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-white" />
                    <h3 className="font-semibold text-sm text-white">{status}</h3>
                    <Badge variant="default" className="text-xs px-2 py-0.5 bg-white/20 text-white border-white/40">
                        {plans.length}
                    </Badge>
                </div>
                <ChevronDown
                    className={`h-4 w-4 text-white transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'
                        }`}
                />
            </button>

            {/* Droppable Card Area */}
            {isExpanded && (
                <div
                    ref={setNodeRef}
                    className={`
                        p-2 min-h-[120px] transition-colors duration-200
                        ${overId === status ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : 'bg-gray-50'}
                    `}
                >
                    {plans.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-24 text-gray-400">
                            <Icon className="h-8 w-8 text-gray-300 mb-1" />
                            <p className="text-xs font-medium">No audits</p>
                        </div>
                    ) : (
                        <SortableContext items={plans.map(p => p.id)} strategy={verticalListSortingStrategy}>
                            {plans.map((plan) => (
                                <SortableItem
                                    key={plan.id}
                                    plan={plan}
                                    onClick={() => onCardClick(plan)}
                                    onLongPress={onLongPress}
                                />
                            ))}
                        </SortableContext>
                    )}
                </div>
            )}
        </div>
    );
};


// Custom collision detection: if 50% or more of the card is over a column, it's droppable
const customCollisionDetection: CollisionDetection = (args) => {
    const { active, droppableContainers } = args;

    // Get the active element's rect
    const activeRect = active.rect.current.translated;
    if (!activeRect) return [];

    const activeArea = activeRect.width * activeRect.height;

    // Calculate intersection with each droppable container
    const collisions = droppableContainers
        .map((container) => {
            const rect = container.rect.current;
            if (!rect) return null;

            // Calculate intersection
            const left = Math.max(activeRect.left, rect.left);
            const right = Math.min(activeRect.right, rect.right);
            const top = Math.max(activeRect.top, rect.top);
            const bottom = Math.min(activeRect.bottom, rect.bottom);

            if (left >= right || top >= bottom) return null;

            const intersectionArea = (right - left) * (bottom - top);
            const intersectionRatio = intersectionArea / activeArea;

            // If 50% or more of the card is over the column, it's a valid drop
            if (intersectionRatio >= 0.5) {
                return {
                    id: container.id,
                    data: {
                        droppableContainer: container,
                        value: intersectionRatio,
                    },
                };
            }

            return null;
        })
        .filter((collision) => collision !== null) as any[];

    // Sort by intersection ratio (highest first)
    collisions.sort((a, b) => (b.data?.value || 0) - (a.data?.value || 0));

    // If no collision meets the 50% threshold, fallback to rectIntersection
    if (collisions.length === 0) {
        return rectIntersection(args);
    }

    return collisions;
};

export const AuditPlanBoard: React.FC<AuditPlanBoardProps> = ({
    plans,
    onStatusChange,
    onView
}) => {
    const [activeId, setActiveId] = React.useState<number | null>(null);
    const [overId, setOverId] = React.useState<string | null>(null);
    const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>(
        STATUS_COLUMNS.reduce((acc, status) => ({ ...acc, [status]: true }), {})
    );

    // State for mobile long-press menu
    const [selectedPlanForStatus, setSelectedPlanForStatus] = React.useState<AuditPlan | null>(null);
    const [showStatusMenu, setShowStatusMenu] = React.useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const toggleSection = (status: string) => {
        setExpandedSections(prev => ({ ...prev, [status]: !prev[status] }));
    };

    const handleLongPress = (plan: AuditPlan) => {
        // Vibrate if supported
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(50);
        }
        setSelectedPlanForStatus(plan);
        setShowStatusMenu(true);
    };

    const handleStatusSelect = (status: string) => {
        if (selectedPlanForStatus) {
            onStatusChange(selectedPlanForStatus.id, status);
        }
        setShowStatusMenu(false);
        setSelectedPlanForStatus(null);
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as number);
        // Prevent body scroll during drag on mobile
        if (typeof window !== 'undefined' && typeof document !== 'undefined' && window.innerWidth < 768) {
            document.body.style.overflow = 'hidden';
        }
    };

    const handleDragOver = (event: any) => {
        if (event.over) {
            setOverId(event.over.id as string);
        } else {
            setOverId(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const targetId = over?.id as string || overId;

        if (targetId && active.id !== targetId) {
            if (STATUS_COLUMNS.includes(targetId)) {
                onStatusChange(active.id as number, targetId);
            }
        }

        setActiveId(null);
        setOverId(null);

        if (typeof window !== 'undefined' && typeof document !== 'undefined' && window.innerWidth < 768) {
            document.body.style.overflow = '';
        }
    };

    const activePlan = useMemo(() => {
        if (!activeId) return null;
        return plans.find(p => p.id === activeId);
    }, [activeId, plans]);

    const dragStatusConfig = activePlan ? getStatusConfig(activePlan.status) : null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            {/* Mobile: Vertical Kanban with collapsible sections */}
            <div className="md:hidden space-y-2 px-1">
                {/* UX Hint - Sleek & Modern */}
                <div className="flex justify-center mb-3">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-900/5 backdrop-blur-sm rounded-full border border-white/20 shadow-sm">
                        <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[10px] font-medium text-gray-600 tracking-wide uppercase">
                            Long press to change status
                        </span>
                    </div>
                </div>

                {STATUS_COLUMNS.map((status) => {
                    const statusPlans = plans.filter(p => p.status === status);

                    return (
                        <MobileStatusSection
                            key={status}
                            status={status}
                            plans={statusPlans}
                            isExpanded={expandedSections[status] ?? true}
                            onToggle={() => toggleSection(status)}
                            onCardClick={onView}
                            onLongPress={handleLongPress}
                            overId={overId}
                        />
                    );
                })}
            </div>

            {/* Desktop: Horizontal Kanban columns */}
            <div className="hidden md:flex gap-4 items-start overflow-x-auto pb-4 px-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                {STATUS_COLUMNS.map((status) => (
                    <DroppableColumn
                        key={status}
                        id={status}
                        title={status}
                        plans={plans.filter(p => p.status === status)}
                        onCardClick={onView}
                    />
                ))}
            </div>

            {/* DragOverlay - desktop only */}
            <DragOverlay
                dropAnimation={{
                    duration: 300,
                    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                }}
                className="hidden md:block"
            >
                {activePlan && dragStatusConfig ? (
                    <div className={`
                        bg-white rounded-lg shadow-2xl border-l-4 ${dragStatusConfig.borderColor}
                        w-[320px] rotate-1 scale-105
                        border border-gray-200
                        relative
                    `}
                        style={{
                            willChange: 'transform',
                        }}
                    >
                        {/* Year badge */}
                        <Badge
                            variant="purple"
                            className="absolute top-0.5 right-0.5 text-[10px] px-2 py-1 leading-none font-bold"
                        >
                            {activePlan.audit_year}
                        </Badge>

                        <div className="p-3">
                            <div className="mb-2">
                                <h4 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight pr-8">
                                    {activePlan.audit_name || activePlan.audit_type}
                                </h4>
                            </div>
                            <div className={`
                                text-xs font-medium mb-2.5 px-2 py-1 rounded-md inline-block
                                bg-gradient-to-r ${dragStatusConfig.gradient} ${dragStatusConfig.textColor}
                            `}>
                                {activePlan.department}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                                <User className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                                <span className="truncate">{activePlan.audit_lead_name || activePlan.audit_lead_email.split('@')[0]}</span>
                            </div>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>

            {/* Mobile Status Selection Bottom Sheet */}
            {showStatusMenu && selectedPlanForStatus && (
                <>
                    {/* Backdrop */}
                    <div
                        className="md:hidden fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
                        onClick={() => {
                            setShowStatusMenu(false);
                            setSelectedPlanForStatus(null);
                        }}
                    />

                    {/* Bottom Sheet - Ultra Compact & Colorful */}
                    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 animate-in slide-in-from-bottom duration-300 select-none pb-safe">
                        <div className="p-4 pb-8">
                            {/* Handle bar */}
                            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />

                            {/* Title & Plan Name */}
                            <div className="text-center mb-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                    Change Status
                                </h3>
                                <p className="text-sm font-semibold text-gray-900 line-clamp-1 px-4">
                                    {selectedPlanForStatus.audit_name || selectedPlanForStatus.audit_type}
                                </p>
                            </div>

                            {/* Status Options - 3 Column Grid */}
                            <div className="grid grid-cols-3 gap-2">
                                {STATUS_COLUMNS.map((status) => {
                                    const config = getStatusConfig(status);
                                    const Icon = config.icon;
                                    const isCurrent = selectedPlanForStatus.status === status;

                                    // Extract color name from border class (e.g., 'border-l-blue-400' -> 'blue')
                                    const colorName = config.borderColor.split('-')[2]; // blue, amber, orange, etc.

                                    // Define color styles based on the extracted color name
                                    // We use style objects for dynamic class construction to avoid Tailwind purging issues if we just concatenated strings
                                    const getStyle = () => {
                                        switch (colorName) {
                                            case 'blue':
                                                return isCurrent
                                                    ? 'bg-blue-500 text-white shadow-blue-200'
                                                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
                                            case 'amber':
                                                return isCurrent
                                                    ? 'bg-amber-500 text-white shadow-amber-200'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
                                            case 'orange':
                                                return isCurrent
                                                    ? 'bg-orange-500 text-white shadow-orange-200'
                                                    : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100';
                                            case 'indigo':
                                                return isCurrent
                                                    ? 'bg-indigo-500 text-white shadow-indigo-200'
                                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100';
                                            case 'emerald':
                                                return isCurrent
                                                    ? 'bg-emerald-500 text-white shadow-emerald-200'
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
                                            default:
                                                return isCurrent
                                                    ? 'bg-gray-800 text-white'
                                                    : 'bg-gray-50 text-gray-700 border-gray-200';
                                        }
                                    };

                                    return (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusSelect(status)}
                                            className={`
                                                relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200
                                                border ${isCurrent ? 'border-transparent scale-[1.02] shadow-lg ring-2 ring-offset-1 ring-transparent' : 'border'}
                                                ${getStyle()}
                                            `}
                                        >
                                            {/* Icon */}
                                            <div className={`
                                                mb-1.5 p-1.5 rounded-full
                                                ${isCurrent ? 'bg-white/20' : 'bg-white/60'}
                                            `}>
                                                <Icon className="h-4 w-4" />
                                            </div>

                                            {/* Text */}
                                            <span className="text-[10px] font-bold text-center leading-tight">
                                                {status}
                                            </span>

                                            {/* Checkmark for active */}
                                            {isCurrent && (
                                                <div className="absolute -top-1 -right-1 bg-white text-green-600 rounded-full p-0.5 shadow-sm ring-1 ring-black/5">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </DndContext>
    );
};
