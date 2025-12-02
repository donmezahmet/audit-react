import { DepartmentAction } from '@/types/department-actions.types';

/**
 * Calculate total monetary impact from unique parent keys
 * This ensures each parent (finding) is only counted once
 */
export const calculateUniqueParentImpact = (actions: DepartmentAction[]): number => {
    if (!actions || !Array.isArray(actions)) return 0;

    // Get unique parent keys
    const uniqueParents = new Set(
        actions
            .map(a => a.parentKey)
            .filter((key): key is string => Boolean(key))
    );

    // Sum impact of unique parents
    return Array.from(uniqueParents).reduce((sum, parentKey) => {
        const action = actions.find(a => a.parentKey === parentKey);
        return sum + (action?.monetaryImpact || 0);
    }, 0);
};
