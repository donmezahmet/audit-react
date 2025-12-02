export const DEPARTMENT_ACTIONS_CONFIG = {
    columnWidths: {
        key: 120,
        summary: 250,
        description: 280,
        status: 120,
        audit: 200,
        dueDate: 120,
        riskLevel: 100,
        responsible: 180,
        actions: 120,
    },
    defaultColumnOrder: [
        'key',
        'summary',
        'description',
        'status',
        'audit',
        'dueDate',
        'riskLevel',
        'responsible',
        'actions',
    ],
    localStorage: {
        columnOrderKey: 'department-actions-column-order',
        columnWidthsKey: 'department-actions-columns',
    },
    pagination: {
        defaultItemsPerPage: 25,
    },
} as const;
