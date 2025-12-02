import React, { useEffect, useState } from 'react';
import { Badge, Button, Loading } from './ui';
import { formatDate } from '@/utils/format';
import { jiraService } from '@/services/jira.service';

interface ActionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: string;
  auditYear?: string;
}

const ActionDetailsModal: React.FC<ActionDetailsModalProps> = ({
  isOpen,
  onClose,
  status,
  auditYear,
}) => {
  const [actions, setActions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && status) {
      fetchActions();
    }
  }, [isOpen, status, auditYear]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen, onClose]);

  const fetchActions = async () => {
    setIsLoading(true);
    try {
      const data = await jiraService.getActionsByStatus(status, auditYear);
      setActions(data);
    } catch (error) {
      setActions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredActions = actions.filter(action => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      action.key?.toLowerCase().includes(term) ||
      action.summary?.toLowerCase().includes(term) ||
      action.auditName?.toLowerCase().includes(term) ||
      action.actionResponsible?.toLowerCase().includes(term)
    );
  });

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('completed')) return 'bg-green-100 text-green-800 border-green-300';
    if (statusLower.includes('overdue')) return 'bg-red-100 text-red-800 border-red-300';
    if (statusLower.includes('risk')) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative w-full max-w-6xl max-h-[85vh] bg-white rounded-2xl shadow-2xl transform transition-all flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-lg ${getStatusColor(status)} border font-bold text-sm`}>
                  {status}
                </div>
                <div className="text-white">
                  <h2 className="text-xl font-bold">Finding Actions Details</h2>
                  <p className="text-blue-100 text-sm">
                    {filteredActions.length} {filteredActions.length === 1 ? 'action' : 'actions'} found
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-blue-200 transition-colors p-1.5 rounded-lg hover:bg-white/10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-6 py-2 border-b bg-gray-50 flex-shrink-0">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by action key, description, audit name, or responsible..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loading size="xl" text="Loading actions..." />
              </div>
            ) : filteredActions.length === 0 ? (
              <div className="text-center py-20">
                <svg
                  className="mx-auto h-16 w-16 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No actions found</h3>
                <p className="mt-2 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms' : 'No actions available for this status'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredActions.map((action, idx) => (
                  <div
                    key={action.key || idx}
                    className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all duration-200 hover:border-blue-300 bg-white"
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600 font-mono font-bold text-sm">{action.key}</span>
                        <Badge variant={
                          action.status?.toLowerCase().includes('completed') ? 'success' :
                          action.status?.toLowerCase().includes('overdue') ? 'danger' :
                          action.status?.toLowerCase().includes('risk') ? 'default' :
                          'info'
                        }>
                          {action.status}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`#`, '_blank')}
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Jira
                      </Button>
                    </div>

                    {/* Summary */}
                    <div className="mb-2">
                      <p className="text-gray-500 text-xs font-semibold mb-0.5">Action Summary</p>
                      <h4 className="text-gray-900 font-medium text-sm">
                        {action.summary}
                      </h4>
                    </div>
                    
                    {/* Description */}
                    <div className="mb-3">
                      <p className="text-gray-500 text-xs font-semibold mb-0.5">Action Description</p>
                      <p className="text-gray-700 text-xs line-clamp-2">
                        {action.description}
                      </p>
                    </div>

                    {/* Details Grid - Compact */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <p className="text-gray-500 font-semibold mb-0.5">Audit Name</p>
                        <p className="text-gray-900 truncate">{action.auditName}</p>
                      </div>

                      <div>
                        <p className="text-gray-500 font-semibold mb-0.5">Due Date</p>
                        <p className="text-gray-900">
                          {action.dueDate ? formatDate(action.dueDate, 'PP') : 'Not set'}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500 font-semibold mb-0.5">Responsible</p>
                        <p className="text-gray-900 truncate">{action.actionResponsible}</p>
                      </div>

                      <div>
                        <p className="text-gray-500 font-semibold mb-0.5">C-Level</p>
                        <p className="text-gray-900 truncate">{action.cLevel || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-gray-50 rounded-b-2xl border-t flex items-center justify-between flex-shrink-0">
            <div className="text-xs text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredActions.length}</span> of{' '}
              <span className="font-semibold text-gray-900">{actions.length}</span> actions
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionDetailsModal;

