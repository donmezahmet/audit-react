import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMockData, mockAuditPlans } from '@/services/mockData.service';

export interface AuditPlan {
    id: number;
    audit_year: number;
    audit_type: string;
    audit_name: string;
    audit_lead_name: string;
    audit_lead_email: string;
    business_unit?: string;
    department?: string;
    process?: string;
    start_date?: string;
    end_date?: string;
    audit_duration_weeks?: number;
    report_release_date?: string;
    audit_report_rating?: string;
    status: 'Planned' | 'Fieldwork' | 'Pre Closing Meeting' | 'Closing Meeting' | 'Completed';
    created_at: string;
    updated_at: string;
    created_by?: string;
}

export interface AuditPlanHistory {
    id: number;
    plan_id: number;
    event_type: 'CREATE' | 'UPDATE';
    field_name?: string;
    old_value?: string;
    new_value?: string;
    changed_by: string;
    changed_at: string;
}

export const useAuditPlans = (year?: string) => {
    return useQuery({
        queryKey: ['auditPlans', year],
        queryFn: async () => {
            let filtered = [...mockAuditPlans];
            if (year && year !== 'All Years') {
                filtered = filtered.filter(p => p.audit_year.toString() === year);
            }
            return getMockData('audit-plans', filtered) as Promise<AuditPlan[]>;
        },
    });
};

export const useAuditPlan = (id: number) => {
    return useQuery({
        queryKey: ['auditPlan', id],
        queryFn: async () => {
            const plan = mockAuditPlans.find(p => p.id === id);
            if (!plan) throw new Error('Plan not found');
            return getMockData('audit-plan', plan) as Promise<AuditPlan>;
        },
        enabled: !!id,
    });
};

export const useAuditPlanHistory = (id: number) => {
    return useQuery({
        queryKey: ['auditPlanHistory', id],
        queryFn: async () => {
            return getMockData('audit-plan-history', []) as Promise<AuditPlanHistory[]>;
        },
        enabled: !!id,
    });
};

export const useCreateAuditPlan = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newPlan: Partial<AuditPlan>) => {
            const plan: AuditPlan = {
                id: mockAuditPlans.length + 1,
                audit_year: newPlan.audit_year || new Date().getFullYear(),
                audit_type: newPlan.audit_type || 'Financial',
                audit_name: newPlan.audit_name || 'New Audit',
                audit_lead_name: newPlan.audit_lead_name || 'John Doe',
                audit_lead_email: newPlan.audit_lead_email || 'john.doe@example.com',
                business_unit: newPlan.business_unit,
                department: newPlan.department,
                process: newPlan.process,
                start_date: newPlan.start_date,
                end_date: newPlan.end_date,
                audit_duration_weeks: newPlan.audit_duration_weeks,
                report_release_date: newPlan.report_release_date,
                audit_report_rating: newPlan.audit_report_rating,
                status: newPlan.status || 'Planned',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            mockAuditPlans.push(plan);
            return getMockData('create-audit-plan', plan) as Promise<AuditPlan>;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['auditPlans'] });
        },
    });
};

export const useUpdateAuditPlan = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: number; updates: Partial<AuditPlan> }) => {
            const index = mockAuditPlans.findIndex(p => p.id === id);
            if (index === -1) throw new Error('Plan not found');
            mockAuditPlans[index] = { ...mockAuditPlans[index], ...updates, updated_at: new Date().toISOString() };
            return getMockData('update-audit-plan', mockAuditPlans[index]) as Promise<AuditPlan>;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['auditPlans'] });
            queryClient.invalidateQueries({ queryKey: ['auditPlan', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['auditPlanHistory', variables.id] });
        },
    });
};

export const useUpdateAuditPlanStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: number; status: string }) => {
            const index = mockAuditPlans.findIndex(p => p.id === id);
            if (index === -1) throw new Error('Plan not found');
            mockAuditPlans[index] = { ...mockAuditPlans[index], status: status as AuditPlan['status'], updated_at: new Date().toISOString() };
            return getMockData('update-audit-plan-status', mockAuditPlans[index]) as Promise<AuditPlan>;
        },
        onSuccess: () => {
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['auditPlans'] });
            }, 500);
        },
    });
};

export const useDeleteAuditPlan = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const index = mockAuditPlans.findIndex(p => p.id === id);
            if (index !== -1) mockAuditPlans.splice(index, 1);
            await getMockData('delete-audit-plan', null);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['auditPlans'] });
        },
    });
};
