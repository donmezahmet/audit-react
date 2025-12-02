import React, { useState, useEffect } from 'react';
import { Button, Card, Loading } from '@/components/ui';
import { jiraService } from '@/services/jira.service';
import { useUIStore } from '@/store/ui.store';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RecipientInfo {
  email: string;
  name: string;
  actionCount: number;
}

const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose }) => {
  const [reportingTarget, setReportingTarget] = useState<'' | 'action_responsible' | 'clevel' | 'vp'>('');
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [recipientList, setRecipientList] = useState<RecipientInfo[]>([]); // For "To:" dropdown (hardcoded test data)
  const [filterList, setFilterList] = useState<RecipientInfo[]>([]); // For "Filter" dropdown (real data)
  const [filterValue, setFilterValue] = useState<string>('all');
  const [bulkEmail, setBulkEmail] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [sendingProgress, setSendingProgress] = useState({ current: 0, total: 0 });
  const [isCancelling, setIsCancelling] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const { addNotification } = useUIStore();

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setReportingTarget('');
      setSelectedRecipient('');
      setRecipientList([]);
      setFilterList([]);
      setFilterValue('all');
      setBulkEmail(false);
      setSendingProgress({ current: 0, total: 0 });
      setIsCancelling(false);
      setShowPreview(false);
      setPreviewData(null);
      setIsLoadingPreview(false);
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen, isSending, bulkEmail]);

  // Fetch recipient lists when reporting target changes
  useEffect(() => {
    const fetchRecipients = async () => {
      if (!reportingTarget) {
        setRecipientList([]);
        setFilterList([]);
        return;
      }

      try {
        setIsLoadingRecipients(true);
        
        if (reportingTarget === 'action_responsible') {
          // Fetch hardcoded list for "To:" dropdown (test data)
          const recipientsResponse = await jiraService.getActionResponsibleList();
          
          // Fetch full list for "Filter" dropdown (real data from database)
          const filterResponse = await jiraService.getAllActionResponsibleList();
          
          if (recipientsResponse.success && recipientsResponse.data) {
            setRecipientList(recipientsResponse.data);
            // Auto-select first recipient if only one exists
            if (recipientsResponse.data.length === 1) {
              setSelectedRecipient(recipientsResponse.data[0].email);
            }
          }
          
          if (filterResponse.success && filterResponse.data) {
            console.log('📧 Filter list data from backend:', filterResponse.data);
            setFilterList(filterResponse.data);
          }
        } else if (reportingTarget === 'vp') {
          // For VP, use same hardcoded list as Action Responsible for "To:" dropdown
          const recipientsResponse = await jiraService.getActionResponsibleList();
          
          // Fetch management role users for "Filter" dropdown (real data from database)
          const filterResponse = await jiraService.getVPList();
          
          if (recipientsResponse.success && recipientsResponse.data) {
            setRecipientList(recipientsResponse.data);
            // Auto-select first recipient if only one exists
            if (recipientsResponse.data.length === 1) {
              setSelectedRecipient(recipientsResponse.data[0].email);
            }
          }
          
          if (filterResponse.success && filterResponse.data) {
            console.log('📧 VP Filter list data from backend:', filterResponse.data);
            setFilterList(filterResponse.data);
          }
        } else {
          // For C-Level, use same list for both (hardcoded)
          const response = await jiraService.getCLevelList();
          
          if (response.success && response.data) {
            setRecipientList(response.data);
            setFilterList(response.data);
            // Auto-select first recipient if only one exists
            if (response.data.length === 1) {
              setSelectedRecipient(response.data[0].email);
            }
          }
        }
      } catch (error) {
        addNotification({
          type: 'error',
          message: 'Failed to load recipient list',
        });
      } finally {
        setIsLoadingRecipients(false);
      }
    };

    fetchRecipients();
  }, [reportingTarget, addNotification]);

  // Prepare email data with action tables and financial impact
  const prepareEmailData = async (recipientEmail: string, recipientName: string, filterEmail?: string) => {
    try {
      // Use filterEmail if provided, otherwise use recipientEmail
      // This allows sending test emails to hardcoded addresses while fetching real action data
      const actionOwnerEmail = filterEmail || recipientEmail;
      
      // Validate reportingTarget
      if (!reportingTarget || (reportingTarget !== 'action_responsible' && reportingTarget !== 'clevel' && reportingTarget !== 'vp')) {
        throw new Error('Invalid reporting target');
      }
      
      // Fetch action data for the filtered user (not necessarily the email recipient)
      const actionDataResponse = await jiraService.getActionDataForEmail(
        actionOwnerEmail,
        reportingTarget,
        '2024+'
      );
      
      if (!actionDataResponse.success || !actionDataResponse.data) {
        throw new Error('Failed to fetch action data');
      }
      
      const actionData = actionDataResponse.data;
      
      // Determine chartType based on reportingTarget
      let chartType = 'both-actions';
      if (reportingTarget === 'clevel') {
        chartType = 'clevel-actions';
      } else if (reportingTarget === 'vp') {
        chartType = 'vp-actions';
      }
      
      // Prepare payload for backend template selection
      const payload = {
        to: recipientEmail,
        subject: `Audit Finding Actions - ${recipientName}`,
        emailType: 'template',
        actionResponsible: actionOwnerEmail, // Use the action owner's email for backend stats
        auditYear: '2024+',
        chartType: chartType,
        content: `Dear ${recipientName}, Please review your pending audit finding actions.`,
        
        // Template selection data (backend will choose template based on these)
        overdueTableHTML: actionData.overdueTableHTML,
        overdueTableHTML2: actionData.upcomingTableHTML,
        riskAcceptedTableHTML: actionData.riskAcceptedTableHTML,
        openFinancialImpact: actionData.openFinancialImpact,
        overdueFinancialImpact: actionData.overdueFinancialImpact,
        
        // Action counts for template selection (more reliable than HTML parsing)
        overdueCount: actionData.overdueCount,
        upcomingCount: actionData.upcomingCount,
        riskAcceptedCount: actionData.riskAcceptedCount,
        
        // Chart HTML - generated by backend with status distribution
        chartHTML: actionData.chartHTML,
        
        // VP için Team Action Ownership Breakdown tablosu
        ownershipBreakdownHTML: actionData.ownershipBreakdownHTML || '',
        
        // VP için Team Overdue/Upcoming Actions (Template 7 için)
        teamOverdueTableHTML: actionData.teamOverdueTableHTML || '',
        teamUpcomingTableHTML: actionData.teamUpcomingTableHTML || '',
      };
      
      return payload;
    } catch (error) {
      throw error;
    }
  };

  const handleSendEmail = async () => {
    // Validate: both reporting target and recipient are always required
    if (!reportingTarget || !selectedRecipient) {
      addNotification({
        type: 'warning',
        message: 'Please select a reporting target and recipient',
      });
      return;
    }

    try {
      setIsSending(true);
      setIsCancelling(false);

      if (bulkEmail) {
        // Bulk email mode - send multiple emails with different data
        // All emails go to the same address (selectedRecipient) for testing
        // But each email contains different user's action data
        const recipients = filterValue === 'all' 
          ? filterList 
          : filterList.filter(r => r.email === filterValue);

        if (recipients.length === 0) {
          addNotification({
            type: 'warning',
            message: 'No recipients selected',
          });
          return;
        }

        // Confirm bulk send
        if (!confirm(`Send ${recipients.length} separate personalized emails to ${selectedRecipient}?\n\nEach email will contain a different Action Responsible's data for testing.`)) {
          setIsSending(false);
          return;
        }

        setSendingProgress({ current: 0, total: recipients.length });
        
        let successCount = 0;
        let errorCount = 0;
        const failedRecipients: string[] = [];

        for (let i = 0; i < recipients.length; i++) {
          if (isCancelling) {
            addNotification({
              type: 'info',
              message: `Cancelled. Sent ${successCount} of ${recipients.length} emails`,
            });
            break;
          }

          setSendingProgress({ current: i + 1, total: recipients.length });
          const recipient = recipients[i];

          if (!recipient) {
            errorCount++;
            continue;
          }

          try {
            console.log(`📧 Sending email ${i + 1}/${recipients.length} for ${recipient.name}'s data to ${selectedRecipient}...`);
            
            // Prepare email data with action tables
            // Email goes to selectedRecipient (To: field) but contains recipient's data
            const emailPayload = await prepareEmailData(
              selectedRecipient,  // To: address (test email - same for all)
              recipient.name,     // Recipient name (whose data is shown)
              recipient.email     // Filter: use this person's email for their action data
            );
            
            // Send email with prepared data
            await jiraService.sendEmail(emailPayload);
            successCount++;
            console.log(`✅ Email sent successfully with ${recipient.name}'s data`);
          } catch (error) {
            console.error(`❌ Failed to send email for ${recipient.name}:`, error);
            errorCount++;
            failedRecipients.push(recipient.name);
          }

          // Small delay between emails to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (!isCancelling) {
          const message = successCount > 0 
            ? `Successfully sent ${successCount} of ${recipients.length} emails to ${selectedRecipient}${errorCount > 0 ? `\n\nFailed for: ${failedRecipients.join(', ')}` : ''}`
            : 'Failed to send any emails';
            
          addNotification({
            type: successCount > 0 ? 'success' : 'error',
            message,
          });
          onClose();
        }
      } else {
        // Single email mode
        const recipient = recipientList.find(r => r.email === selectedRecipient);
        const recipientName = recipient?.name || selectedRecipient;
        
        // Determine whose action data to fetch based on filter
        // If filter is 'all' or not set, use selectedRecipient
        // Otherwise, use the specific filtered email
        const actionDataEmail = (filterValue && filterValue !== 'all') ? filterValue : selectedRecipient;
        
        // Prepare email data with action tables
        const emailPayload = await prepareEmailData(
          selectedRecipient,  // To: address (test email)
          recipientName,      // Recipient name
          actionDataEmail     // Filter: whose action data to fetch
        );
        
        // Send email with prepared data
        await jiraService.sendEmail(emailPayload);
        
        addNotification({
          type: 'success',
          message: `Email sent successfully to ${selectedRecipient}`,
        });
        onClose();
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to send email',
      });
    } finally {
      setIsSending(false);
      setSendingProgress({ current: 0, total: 0 });
    }
  };

  const handlePreview = async () => {
    if (!reportingTarget || !selectedRecipient) {
      addNotification({
        type: 'warning',
        message: 'Please select a reporting target and recipient',
      });
      return;
    }

    // Skip preview for "all" filter
    if (filterValue === 'all') {
      addNotification({
        type: 'info',
        message: 'Preview is not available for "all" filter. Please select a specific recipient.',
      });
      return;
    }

    try {
      setIsLoadingPreview(true);
      
      const recipient = recipientList.find(r => r.email === selectedRecipient);
      const recipientName = recipient?.name || selectedRecipient;
      const actionDataEmail = (filterValue && filterValue !== 'all') ? filterValue : selectedRecipient;
      
      // Prepare email data
      const emailPayload = await prepareEmailData(
        selectedRecipient,
        recipientName,
        actionDataEmail
      );
      
      // Get preview from server
      const previewResponse = await jiraService.previewEmail(emailPayload);
      
      console.log('🔍 Preview response:', previewResponse);
      
      // Response structure from server: { success: true, preview: {...} }
      // But ApiResponse wraps it as: { success: true, data: { success: true, preview: {...} } }
      const responseData = (previewResponse as any).data || previewResponse;
      
      if (responseData && responseData.success && responseData.preview) {
        setPreviewData(responseData.preview);
        setShowPreview(true);
        console.log('✅ Preview data set:', responseData.preview);
      } else {
        console.error('❌ Preview response invalid:', previewResponse);
        addNotification({
          type: 'error',
          message: 'Failed to preview email',
        });
      }
    } catch (error) {
      console.error('Preview error:', error);
      addNotification({
        type: 'error',
        message: 'Failed to preview email',
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleCancel = () => {
    if (isSending && bulkEmail) {
      setIsCancelling(true);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Both reportingTarget and selectedRecipient are always required (even in bulk mode)
  const isSendDisabled = !reportingTarget || !selectedRecipient || isSending;
  const recipientTypeLabel = reportingTarget === 'action_responsible' 
    ? 'Action Responsible' 
    : reportingTarget === 'vp' 
    ? 'VP' 
    : 'C-Level';

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <Card className="max-w-xl w-full max-h-[90vh] overflow-y-auto" variant="elevated">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          <h2 className="text-xl font-bold text-gray-900">Send Email</h2>
          </div>
          <button
            onClick={handleCancel}
            disabled={isSending && bulkEmail}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Email Type - Fixed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Type:
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-700 font-medium">Use SendGrid Template</span>
            </div>
          </div>

          {/* Reporting Target */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <svg className="w-4 h-4 inline mr-1 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Select Reporting Target:
            </label>
            <select
              value={reportingTarget}
              onChange={(e) => {
                setReportingTarget(e.target.value as any);
                setSelectedRecipient('');
                setFilterValue('all');
                setBulkEmail(false);
              }}
              disabled={isSending}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
            >
              <option value="">Please select...</option>
              <option value="action_responsible">Action Responsible</option>
              {/* <option value="vp">VP</option> */}
              {/* <option value="clevel">C-Level</option> */}
            </select>
          </div>

          {/* Recipient Selection */}
          {reportingTarget && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  To:
                </label>
                {isLoadingRecipients ? (
                  <div className="flex items-center justify-center py-6">
                    <Loading size="md" />
                  </div>
                ) : recipientList.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-500">
                    No recipients found with open actions
                  </div>
                ) : (
                  <select
                    value={selectedRecipient}
                    onChange={(e) => setSelectedRecipient(e.target.value)}
                    disabled={isSending}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                  >
                    <option value="">Select recipient...</option>
                    {recipientList.map((recipient) => (
                      <option key={recipient.email} value={recipient.email}>
                        {recipient.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Filter (for bulk email targeting) */}
              {filterList.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <svg className="w-4 h-4 inline mr-1 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Filter by {recipientTypeLabel}:
                  </label>
                  <select
                    value={filterValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilterValue(value);
                      // If we're in Action Responsible flow, mirror selection to To: field
                      if (reportingTarget === 'action_responsible' && value !== 'all') {
                        // Ensure the selected email exists in the To list; if not, add it
                        const existsInToList = recipientList.some(r => r.email === value);
                        if (!existsInToList) {
                          const match = filterList.find(r => r.email === value);
                          const entry = {
                            email: value,
                            name: match?.name || value,
                            actionCount: match?.actionCount || 0,
                          } as RecipientInfo;
                          setRecipientList(prev => [entry, ...prev]);
                        }
                        setSelectedRecipient(value);
                      }
                    }}
                    disabled={isSending}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                  >
                    <option value="all">All {recipientTypeLabel}s ({filterList.length} users)</option>
                    {filterList.map((recipient) => (
                      <option key={recipient.email} value={recipient.email}>
                        {recipient.name} ({recipient.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Bulk Email Checkbox */}
              {filterList.length > 0 && (
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                  <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                id="bulkEmail"
                checked={bulkEmail}
                onChange={(e) => setBulkEmail(e.target.checked)}
                      disabled={isSending}
                      className="mt-0.5 w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <label htmlFor="bulkEmail" className="text-sm font-medium text-gray-900 cursor-pointer">
                        <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Send separate emails for each {recipientTypeLabel}'s data
              </label>
                      <p className="text-xs text-gray-600 mt-0.5">
                        All emails will be sent to the address above, but each contains different user's data
                      </p>
                    </div>
                  </div>
            </div>
          )}
            </>
          )}

          {/* Info Box */}
          {reportingTarget && selectedRecipient && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 font-medium">
                {bulkEmail ? `Each email to ${selectedRecipient} will include:` : 'Email will include:'}
              </p>
              <ul className="text-xs text-blue-700 mt-1.5 space-y-0.5 list-disc list-inside">
                <li>Dashboard report with audit findings</li>
                <li>Open and overdue actions tables</li>
                <li>Upcoming actions summary</li>
                <li>Financial impact data</li>
                {bulkEmail && <li className="font-semibold">✨ Different data for each selected user</li>}
              </ul>
            </div>
          )}

          {/* Sending Progress */}
          {isSending && bulkEmail && sendingProgress.total > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-purple-900">
                  Sending emails...
                </span>
                <span className="text-sm text-purple-700">
                  {sendingProgress.current} / {sendingProgress.total}
                </span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(sendingProgress.current / sendingProgress.total) * 100}%` }}
                  />
                </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2.5 justify-end pt-3 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={isSending && bulkEmail && !isCancelling}
            >
              {isSending && bulkEmail ? 'Cancel' : 'Close'}
            </Button>
            {!bulkEmail && filterValue !== 'all' && (
              <Button 
                variant="outline" 
                onClick={handlePreview}
                isLoading={isLoadingPreview}
                disabled={isSendDisabled || isLoadingPreview}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </Button>
            )}
            <Button 
              variant="primary" 
              onClick={handleSendEmail} 
              isLoading={isSending}
              disabled={isSendDisabled}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {isSending 
                ? bulkEmail 
                  ? `Sending ${sendingProgress.current}/${sendingProgress.total}...`
                  : 'Sending...'
                : 'Send Email'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Email Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Email Preview</h2>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewData(null);
                  }}
                >
                  Close
                </Button>
              </div>

              <div className="space-y-4">
                {/* To */}
                <div className="border-b pb-3">
                  <label className="text-sm font-semibold text-gray-600 mb-1 block">To:</label>
                  <p className="text-gray-800">{previewData.to}</p>
                </div>

                {/* CC */}
                {previewData.cc && previewData.cc.length > 0 ? (
                  <div className="border-b pb-3">
                    <label className="text-sm font-semibold text-gray-600 mb-1 block">CC:</label>
                    <div className="space-y-1">
                      {previewData.cc.map((email: string, index: number) => (
                        <p key={index} className="text-gray-800">{email}</p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border-b pb-3">
                    <label className="text-sm font-semibold text-gray-600 mb-1 block">CC:</label>
                    <p className="text-gray-400 italic">No CC recipients</p>
                  </div>
                )}

                {/* Subject */}
                <div className="border-b pb-3">
                  <label className="text-sm font-semibold text-gray-600 mb-1 block">Subject:</label>
                  <p className="text-gray-800">{previewData.subject}</p>
                </div>

                {/* Action Responsible Info */}
                <div className="border-b pb-3">
                  <label className="text-sm font-semibold text-gray-600 mb-1 block">Action Responsible:</label>
                  <p className="text-gray-800">{previewData.actionResponsibleName || 'N/A'}</p>
                  {previewData.actionResponsibleDepartment && (
                    <p className="text-sm text-gray-600 mt-1">Department: {previewData.actionResponsibleDepartment}</p>
                  )}
                </div>

                {/* Email Content Summary */}
                {previewData.hasTemplateData && (
                  <div className="border-b pb-3">
                    <label className="text-sm font-semibold text-gray-600 mb-2 block">Email Content Summary:</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="text-xs font-semibold text-blue-600 mb-1">Overdue Actions</p>
                        <p className="text-lg font-bold text-blue-800">{previewData.overdueCount || 0}</p>
                        <p className="text-xs text-blue-600 mt-1">Impact: {previewData.overdueFinancialImpact || '€0'}</p>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded">
                        <p className="text-xs font-semibold text-yellow-600 mb-1">Upcoming Actions</p>
                        <p className="text-lg font-bold text-yellow-800">{previewData.upcomingCount || 0}</p>
                      </div>
                      <div className="bg-red-50 p-3 rounded">
                        <p className="text-xs font-semibold text-red-600 mb-1">Risk Accepted</p>
                        <p className="text-lg font-bold text-red-800">{previewData.riskAcceptedCount || 0}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded">
                        <p className="text-xs font-semibold text-green-600 mb-1">Open Financial Impact</p>
                        <p className="text-lg font-bold text-green-800">{previewData.openFinancialImpact || '€0'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Send Button */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPreview(false);
                      setPreviewData(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={async () => {
                      setShowPreview(false);
                      // Send email
                      try {
                        setIsSending(true);
                        const recipient = recipientList.find(r => r.email === selectedRecipient);
                        const recipientName = recipient?.name || selectedRecipient;
                        const actionDataEmail = (filterValue && filterValue !== 'all') ? filterValue : selectedRecipient;
                        const emailPayload = await prepareEmailData(
                          selectedRecipient,
                          recipientName,
                          actionDataEmail
                        );
                        await jiraService.sendEmail(emailPayload);
                        addNotification({
                          type: 'success',
                          message: `Email sent successfully to ${selectedRecipient}`,
                        });
                        onClose();
                      } catch (error) {
                        addNotification({
                          type: 'error',
                          message: 'Failed to send email',
                        });
                      } finally {
                        setIsSending(false);
                      }
                    }}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send Email
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

export default EmailModal;
