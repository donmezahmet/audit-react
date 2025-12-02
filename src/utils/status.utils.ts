// Status utility functions and constants

export const STATUS_MAPPING: Record<string, string> = {
    'COMPLETED': 'Completed',
    'Completed': 'Completed',
    'RISK ACCEPTED': 'Risk Accepted',
    'Risk Accepted': 'Risk Accepted',
    'Open': 'Open',
    'Overdue': 'Overdue',
    'In Progress': 'In Progress',
} as const;

export const normalizeStatus = (status: string): string => {
    return STATUS_MAPPING[status] || status;
};

export const STATUS_COLORS: Record<string, string> = {
    'Open': 'rgba(59, 130, 246, 0.8)',        // Blue
    'Overdue': 'rgba(239, 68, 68, 0.8)',      // Red
    'Completed': 'rgba(34, 197, 94, 0.8)',    // Green
    'Risk Accepted': 'rgba(147, 51, 234, 0.8)', // Purple
    'In Progress': 'rgba(59, 130, 246, 0.8)', // Blue
} as const;

export const STATUS_BADGE_VARIANTS: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'default'> = {
    'COMPLETED': 'success',
    'Completed': 'success',
    'Open': 'danger',
    'Overdue': 'warning',
    'In Progress': 'info',
    'RISK ACCEPTED': 'default',
    'Risk Accepted': 'default',
} as const;

export const getStatusBadgeVariant = (status: string): 'success' | 'danger' | 'warning' | 'info' | 'default' => {
    return STATUS_BADGE_VARIANTS[status] || 'default';
};
