import React, { useState } from 'react';
import { AuditPlan, useAuditPlanHistory } from '../../hooks/useAuditPlans';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { X, Calendar, User, Activity, FileText, Edit } from 'lucide-react';
import { format } from 'date-fns';

interface AuditPlanDetailModalProps {
    plan: AuditPlan;
    onClose: () => void;
    onEdit: (plan: AuditPlan) => void;
    viewOnly?: boolean; // If true, hide edit button and make it view-only
}

export const AuditPlanDetailModal: React.FC<AuditPlanDetailModalProps> = ({
    plan,
    onClose,
    onEdit,
    viewOnly = false
}) => {
    const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
    const { data: history, isLoading: historyLoading } = useAuditPlanHistory(plan.id);

    // Handle ESC key to close modal
    React.useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm md:items-center md:justify-center">
            <div className="bg-white md:rounded-xl shadow-2xl w-full h-full md:h-auto md:max-w-3xl md:max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-3 md:p-6 border-b border-gray-100 bg-white">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 md:gap-3 mb-1 flex-wrap">
                            <h2 className="text-base md:text-xl font-bold text-gray-900 truncate">{plan.audit_name || plan.audit_type}</h2>
                            <Badge variant="purple" className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1">{plan.audit_year}</Badge>
                            <Badge variant={
                                plan.status === 'Completed' ? 'success' :
                                    plan.status === 'Planned' ? 'info' : 'warning'
                            } className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1">
                                {plan.status}
                            </Badge>
                        </div>
                        <p className="text-xs md:text-sm text-gray-500 truncate">
                            {plan.audit_type} • {plan.department} • {plan.process || 'No Process'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 md:p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 ml-2"
                    >
                        <X className="h-4 w-4 md:h-5 md:w-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-3 md:px-6">
                    <button
                        className={`py-2 md:py-3 px-3 md:px-4 text-xs md:text-sm font-medium border-b-2 transition-colors ${activeTab === 'details'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        onClick={() => setActiveTab('details')}
                    >
                        Details
                    </button>
                    <button
                        className={`py-2 md:py-3 px-3 md:px-4 text-xs md:text-sm font-medium border-b-2 transition-colors ${activeTab === 'history'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        onClick={() => setActiveTab('history')}
                    >
                        History
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3 md:p-6 bg-gray-50/50">
                    {activeTab === 'details' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                            <div className="bg-white p-3 md:p-4 rounded-lg border border-gray-100 shadow-sm">
                                <h3 className="text-xs md:text-sm font-semibold text-gray-900 mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2">
                                    <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-500" />
                                    Responsibility
                                </h3>
                                <div className="space-y-2.5 md:space-y-3">
                                    <div>
                                        <label className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">Audit Lead</label>
                                        <p className="text-xs md:text-sm font-medium text-gray-900 mt-0.5">{plan.audit_lead_name || plan.audit_lead_email}</p>
                                        <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">{plan.audit_lead_email}</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">Department</label>
                                        <p className="text-xs md:text-sm font-medium text-gray-900 mt-0.5">{plan.department || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">Process</label>
                                        <p className="text-xs md:text-sm font-medium text-gray-900 mt-0.5">{plan.process || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-3 md:p-4 rounded-lg border border-gray-100 shadow-sm">
                                <h3 className="text-xs md:text-sm font-semibold text-gray-900 mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2">
                                    <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-500" />
                                    Timeline
                                </h3>
                                <div className="space-y-2.5 md:space-y-3">
                                    <div className="grid grid-cols-2 gap-2 md:gap-4">
                                        <div>
                                            <label className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">Start Date</label>
                                            <p className="text-xs md:text-sm font-medium text-gray-900 mt-0.5">
                                                {plan.start_date ? format(new Date(plan.start_date), 'MMM d, yyyy') : '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">End Date</label>
                                            <p className="text-xs md:text-sm font-medium text-gray-900 mt-0.5">
                                                {plan.end_date ? format(new Date(plan.end_date), 'MMM d, yyyy') : '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">Duration</label>
                                        <p className="text-xs md:text-sm font-medium text-gray-900 mt-0.5">{plan.audit_duration_weeks ? `${plan.audit_duration_weeks} weeks` : '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">Report Release Date</label>
                                        <p className="text-xs md:text-sm font-medium text-gray-900 mt-0.5">
                                            {plan.report_release_date ? format(new Date(plan.report_release_date), 'MMM d, yyyy') : '-'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-3 md:p-4 rounded-lg border border-gray-100 shadow-sm md:col-span-2">
                                <h3 className="text-xs md:text-sm font-semibold text-gray-900 mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2">
                                    <Activity className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-500" />
                                    Outcome
                                </h3>
                                <div>
                                    <label className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">Report Rating</label>
                                    <div className="mt-1">
                                        {plan.audit_report_rating ? (
                                            <Badge variant="default" className="text-[10px] md:text-xs">{plan.audit_report_rating}</Badge>
                                        ) : (
                                            <span className="text-xs md:text-sm text-gray-400">Not rated yet</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2.5 md:space-y-4">
                            {historyLoading ? (
                                <div className="text-center py-6 md:py-8 text-gray-500 text-xs md:text-sm">Loading history...</div>
                            ) : history && history.length > 0 ? (
                                history.map((item) => (
                                    <div key={item.id} className="flex gap-2.5 md:gap-4 bg-white p-3 md:p-4 rounded-lg border border-gray-100 shadow-sm">
                                        <div className={`
                      w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0
                      ${item.event_type === 'CREATE' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}
                    `}>
                                            {item.event_type === 'CREATE' ? <FileText className="h-3 w-3 md:h-4 md:w-4" /> : <Edit className="h-3 w-3 md:h-4 md:w-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-2">
                                                <p className="text-xs md:text-sm font-medium text-gray-900">
                                                    {item.event_type === 'CREATE' ? 'Audit Plan Created' : `Updated ${item.field_name}`}
                                                </p>
                                                <span className="text-[10px] md:text-xs text-gray-400 flex-shrink-0">
                                                    {format(new Date(item.changed_at), 'MMM d, HH:mm')}
                                                </span>
                                            </div>
                                            <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">
                                                by {item.changed_by}
                                            </p>
                                            {item.event_type === 'UPDATE' && (
                                                <div className="mt-1.5 md:mt-2 text-[10px] md:text-xs bg-gray-50 p-1.5 md:p-2 rounded border border-gray-100">
                                                    <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                                                        <span className="text-red-500 line-through">{item.old_value || 'Empty'}</span>
                                                        <span className="text-gray-400">→</span>
                                                        <span className="text-green-600 font-medium">{item.new_value || 'Empty'}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 md:py-8 text-gray-500 text-xs md:text-sm">No history available</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 md:p-6 border-t border-gray-100 bg-white flex flex-col md:flex-row gap-2 md:gap-0 md:justify-end">
                    {!viewOnly && (
                        <Button variant="outline" onClick={() => onEdit(plan)} className="w-full md:w-auto md:mr-2 text-xs md:text-sm py-2 md:py-1.5">
                            Edit Audit Detail
                        </Button>
                    )}
                    <Button variant="primary" onClick={onClose} className="w-full md:w-auto text-xs md:text-sm py-2 md:py-1.5">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};
