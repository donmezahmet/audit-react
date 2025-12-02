export type ActionStatus =
    | 'Open'
    | 'Overdue'
    | 'Completed'
    | 'COMPLETED'
    | 'In Progress'
    | 'Risk Accepted'
    | 'RISK ACCEPTED';

export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'Unassigned';

export interface DepartmentAction {
    key: string;
    summary: string;
    description?: string;
    status: ActionStatus;
    displayStatus?: string;
    auditName?: string;
    auditYear?: string;
    dueDate?: string;
    riskLevel?: RiskLevel;
    responsibleEmail?: string;
    parentKey?: string;
    monetaryImpact?: number;
    cLevel?: string; // For modal display
    parentDescription?: string; // For modal display
}

export interface DepartmentStats {
    total: number;
    open: number;
    overdue: number;
    completed: number;
    moneyOpen: number;
    moneyOverdue: number;
}
