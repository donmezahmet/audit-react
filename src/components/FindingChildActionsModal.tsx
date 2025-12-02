import React, { useEffect, useState } from 'react';
import { Badge, Loading } from '@/components/ui';
import { api } from '@/services/api.client';
import { formatFinancialImpact } from '@/utils/format';

interface ChildAction {
  key: string;
  summary: string;
  status: string;
  auditLead?: string;
}

interface FindingChildActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  findingKey: string;
  findingSummary: string;
  findingData: any; // Complete finding data
}

const FindingChildActionsModal: React.FC<FindingChildActionsModalProps> = ({
  isOpen,
  onClose,
  findingKey,
  findingSummary,
  findingData,
}) => {
  const [childActions, setChildActions] = useState<ChildAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedActionKey, setSelectedActionKey] = useState<string | null>(null);
  const [actionDetail, setActionDetail] = useState<any>(null);
  const [loadingActionDetail, setLoadingActionDetail] = useState(false);

  useEffect(() => {
    if (isOpen && findingKey) {
      fetchChildActions();
      setSelectedActionKey(null); // Reset action detail when finding modal opens
      setActionDetail(null);
    }
  }, [isOpen, findingKey]);

  // Handle ESC key - only close the deepest modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        
        if (selectedActionKey) {
          // If viewing action detail, go back to finding
          handleBackToFinding();
        } else {
          // If viewing finding, close the modal
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc, { capture: true });
      return () => document.removeEventListener('keydown', handleEsc, { capture: true });
    }
  }, [isOpen, selectedActionKey, onClose]);

  const fetchChildActions = async () => {
    setLoading(true);
    try {
      const response = await api.get<ChildAction[]>(`/api/finding-child-actions/${findingKey}`);
      setChildActions(response);
    } catch (error) {
      console.error('Failed to fetch child actions:', error);
      setChildActions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchActionDetail = async (actionKey: string) => {
    setLoadingActionDetail(true);
    setSelectedActionKey(actionKey);
    try {
      const response = await api.get(`/api/action-detail/${actionKey}`);
      setActionDetail(response);
    } catch (error) {
      console.error('Failed to fetch action detail:', error);
      setActionDetail(null);
    } finally {
      setLoadingActionDetail(false);
    }
  };

  const handleActionClick = (actionKey: string) => {
    // Show action detail in this modal instead of redirecting to Jira
    fetchActionDetail(actionKey);
  };

  const handleBackToFinding = () => {
    setSelectedActionKey(null);
    setActionDetail(null);
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('completed')) return 'bg-green-100 text-green-800 border-green-300';
    if (statusLower.includes('overdue')) return 'bg-red-100 text-red-800 border-red-300';
    if (statusLower.includes('risk')) return 'bg-purple-100 text-purple-800 border-purple-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Critical':
        return 'bg-gray-900 text-white';
      case 'High':
        return 'bg-red-500 text-white';
      case 'Medium':
        return 'bg-orange-500 text-white';
      case 'Low':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={() => {
          if (selectedActionKey) {
            handleBackToFinding();
          } else {
            onClose();
          }
        }}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl transform transition-all flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - ActionDetailsModal style */}
          <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-4 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-lg ${getStatusColor(findingData?.status)} border font-bold text-sm`}>
                  {findingData?.status || 'Unknown'}
                </div>
                <div className="text-white">
                  <h2 className="text-xl font-bold">Finding Details</h2>
                  <p className="text-purple-100 text-sm">
                    {findingKey}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Back button if viewing action detail */}
            {selectedActionKey && (
              <button
                onClick={handleBackToFinding}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Finding
              </button>
            )}

            {loading || loadingActionDetail ? (
              <div className="py-12">
                <Loading />
              </div>
            ) : selectedActionKey && actionDetail ? (
              /* Action Detail View */
              <>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900 mb-2">Action Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 font-medium">Action Key:</span>
                      <p className="text-gray-900 mt-1 font-mono">{actionDetail.key}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Status:</span>
                      <div className="mt-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(actionDetail.status)}`}>
                          {actionDetail.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Summary:</span>
                      <p className="text-gray-900 mt-1">{actionDetail.summary}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Audit Lead:</span>
                      <p className="text-gray-900 mt-1">{actionDetail.auditLead || 'Unassigned'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Due Date:</span>
                      <p className="text-gray-900 mt-1">{actionDetail.dueDate || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Responsible:</span>
                      <p className="text-gray-900 mt-1">{actionDetail.responsibleEmail || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">C-Level:</span>
                      <p className="text-gray-900 mt-1">{actionDetail.cLevel || '-'}</p>
                    </div>
                  </div>
                  
                  {actionDetail.description && (
                    <div className="mt-3">
                      <span className="text-gray-500 font-medium">Action Description:</span>
                      <p className="text-gray-700 mt-1 text-sm">{actionDetail.description}</p>
                    </div>
                  )}
                </div>

                {/* Parent Finding Info */}
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-gray-900 mb-2">Parent Finding</h3>
                  <div className="text-sm">
                    <span className="text-gray-500 font-medium">Finding:</span>
                    <p className="text-gray-900 mt-1">{actionDetail.findingSummary}</p>
                  </div>
                  {actionDetail.findingDescription && (
                    <div className="text-sm">
                      <span className="text-gray-500 font-medium">Finding Description:</span>
                      <p className="text-gray-700 mt-1">{actionDetail.findingDescription}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Finding Information Card */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900 mb-2">Finding Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 font-medium">Summary:</span>
                      <p className="text-gray-900 mt-1">{findingSummary}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Audit:</span>
                      <p className="text-gray-900 mt-1">{findingData?.auditName || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Audit Year:</span>
                      <p className="text-gray-900 mt-1">{findingData?.auditYear || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Audit Lead:</span>
                      <p className="text-gray-900 mt-1">
                        {childActions[0]?.auditLead || findingData?.auditLead || 'Unassigned'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Risk Level:</span>
                      <div className="mt-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(findingData?.riskLevel || '')}`}>
                          {findingData?.riskLevel || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Financial Impact:</span>
                      <p className="text-gray-900 mt-1 font-semibold">
                        {formatFinancialImpact(findingData?.financialImpact || 0)}
                      </p>
                    </div>
                  </div>
                  
                  {findingData?.description && (
                    <div className="mt-3">
                      <span className="text-gray-500 font-medium">Description:</span>
                      <p className="text-gray-700 mt-1 text-sm">{findingData.description}</p>
                    </div>
                  )}
                </div>

                {/* Child Actions List */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Related Actions ({childActions.length})
                  </h3>
                  
                  {childActions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      No child actions found for this finding
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {childActions.map((action) => (
                        <button
                          key={action.key}
                          onClick={() => handleActionClick(action.key)}
                          className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-all cursor-pointer text-left group"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 group-hover:text-purple-600">
                              {action.summary}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{action.key}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={action.status === 'Completed' ? 'success' : action.status === 'Overdue' ? 'danger' : 'warning'}>
                              {action.status}
                            </Badge>
                            <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FindingChildActionsModal;

