import { useMemo } from 'react';
import { DepartmentAction, DepartmentStats } from '@/types/department-actions.types';
import { calculateUniqueParentImpact } from '@/utils/financial.utils';

/**
 * Custom hook to calculate department statistics
 * Extracts business logic for easier testing
 */
export const useDepartmentStats = (actions: DepartmentAction[] | null | undefined): DepartmentStats => {
    return useMemo(() => {
        if (!actions || !Array.isArray(actions)) {
            return { total: 0, open: 0, overdue: 0, completed: 0, moneyOpen: 0, moneyOverdue: 0 };
        }

        // Filter actions by status
        const openActions = actions.filter(a => a.status === 'Open');
        const overdueActions = actions.filter(a => a.status === 'Overdue');
        const completedActions = actions.filter(a =>
            a.status === 'COMPLETED' || a.status === 'Completed'
        );

        // Calculate financial impact (unique parents only)
        const moneyOpen = calculateUniqueParentImpact(openActions);
        const moneyOverdue = calculateUniqueParentImpact(overdueActions);

        return {
            total: actions.length,
            open: openActions.length,
            overdue: overdueActions.length,
            completed: completedActions.length,
            moneyOpen,
            moneyOverdue,
        };
    }, [actions]);
};
