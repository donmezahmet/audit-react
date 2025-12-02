import { useState } from 'react';
import { jiraService } from '@/services/jira.service';
import { useUIStore } from '@/store/ui.store';

export function useExport() {
  const [isExporting, setIsExporting] = useState(false);
  const { addNotification } = useUIStore();

  const exportFindingActions = async (filters?: any) => {
    try {
      setIsExporting(true);
      const blob = await jiraService.exportFindingActions(filters);
      
      // Validate blob
      if (!blob || blob.size === 0) {
        throw new Error('Invalid or empty Excel file received');
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finding-actions-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      addNotification({
        type: 'success',
        message: 'Finding actions exported successfully',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to export finding actions',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportAgingData = async () => {
    try {
      setIsExporting(true);
      const blob = await jiraService.exportFindingActionsAging();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finding-actions-aging-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      addNotification({
        type: 'success',
        message: 'Aging data exported successfully',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to export aging data',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return {
    isExporting,
    exportFindingActions,
    exportAgingData,
  };
}

