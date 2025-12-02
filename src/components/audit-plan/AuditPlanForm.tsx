import React, { useState, useEffect } from 'react';
import { AuditPlan } from '../../hooks/useAuditPlans';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { X } from 'lucide-react';
import axios from 'axios';
import { auditFindingService } from '../../services/auditFinding.service';
import type { DropdownOption } from '../../types';

interface AuditPlanFormProps {
    initialData?: Partial<AuditPlan>;
    onSubmit: (data: Partial<AuditPlan>) => void;
    onCancel: () => void;
    isOpen: boolean;
}

interface User {
    id: number;
    name: string;
    email: string;
    role_name: string;
}

const AUDIT_TYPES = [
    'Technology Audit',
    'Process Audit',
    'Financial Audit'
];

const RATINGS = [
    'Critical Deficiency',
    'Significant Improvement',
    'Moderate Improvement Potential',
    'Limited Improvement Potential',
    'Good'
];

export const AuditPlanForm: React.FC<AuditPlanFormProps> = ({
    initialData,
    onSubmit,
    onCancel,
    isOpen
}) => {
    const [formData, setFormData] = useState<Partial<AuditPlan>>({
        audit_year: new Date().getFullYear(),
        audit_type: '',
        audit_name: '',
        audit_lead_name: '',
        audit_lead_email: '',
        business_unit: '',
        department: '',
        process: '',
        start_date: '',
        end_date: '',
        audit_duration_weeks: undefined,
        report_release_date: '',
        audit_report_rating: '',
        status: 'Planned'
    });

    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [businessUnits, setBusinessUnits] = useState<DropdownOption[]>([]);
    const [departments, setDepartments] = useState<DropdownOption[]>([]);
    const [departmentProcesses, setDepartmentProcesses] = useState<DropdownOption[]>([]);
    const [loadingBusinessUnits, setLoadingBusinessUnits] = useState(false);
    const [loadingDepartments, setLoadingDepartments] = useState(false);
    const [loadingDepartmentProcesses, setLoadingDepartmentProcesses] = useState(false);

    // Fetch users with admin or team_manager roles
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoadingUsers(true);
                const response = await axios.get('/api/users/by-role?roles=admin,team_manager');
                // API returns { success: true, data: [...] }, so we need response.data.data
                setUsers(response.data.data || []);
            } catch (error) {
                console.error('Error fetching users:', error);
                setUsers([]); // Set to empty array on error to prevent map error
            } finally {
                setLoadingUsers(false);
            }
        };

        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    // Fetch business units from database
    useEffect(() => {
        const fetchBusinessUnits = async () => {
            try {
                setLoadingBusinessUnits(true);
                const options = await auditFindingService.getDropdownOptionsFull('business_unit');
                setBusinessUnits(options || []);
            } catch (error) {
                console.error('Error fetching business units:', error);
                setBusinessUnits([]);
            } finally {
                setLoadingBusinessUnits(false);
            }
        };

        if (isOpen) {
            fetchBusinessUnits();
        }
    }, [isOpen]);

    // Fetch departments from database
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                setLoadingDepartments(true);
                const options = await auditFindingService.getDropdownOptionsFull('department');
                setDepartments(options || []);
            } catch (error) {
                console.error('Error fetching departments:', error);
                setDepartments([]);
            } finally {
                setLoadingDepartments(false);
            }
        };

        if (isOpen) {
            fetchDepartments();
        }
    }, [isOpen]);

    // Fetch processes based on selected department
    useEffect(() => {
        const fetchProcesses = async () => {
            if (!formData.department) {
                setDepartmentProcesses([]);
                return;
            }

            try {
                setLoadingDepartmentProcesses(true);
                const options = await auditFindingService.getDropdownOptionsByParent(
                    'process',
                    formData.department
                );
                setDepartmentProcesses(options || []);
            } catch (error) {
                console.error('Error fetching processes:', error);
                setDepartmentProcesses([]);
            } finally {
                setLoadingDepartmentProcesses(false);
            }
        };

        if (isOpen) {
            fetchProcesses();
        }
    }, [formData.department, isOpen]);

    // Auto-calculate duration when dates change
    useEffect(() => {
        if (formData.start_date && formData.end_date) {
            const startDate = new Date(formData.start_date);
            const endDate = new Date(formData.end_date);

            if (startDate <= endDate) {
                const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const weeks = Math.ceil(diffDays / 7);

                setFormData(prev => ({
                    ...prev,
                    audit_duration_weeks: weeks
                }));
            }
        }
    }, [formData.start_date, formData.end_date]);

    useEffect(() => {
        if (!isOpen) return;
        
        if (initialData && initialData.id) {
            // Full audit plan data (editing)
            setFormData({
                ...initialData,
                business_unit: initialData.business_unit || '',
                department: initialData.department || '',
                process: initialData.process || '',
                report_release_date: initialData.report_release_date ? initialData.report_release_date.split('T')[0] : '',
                start_date: initialData.start_date ? initialData.start_date.split('T')[0] : '',
                end_date: initialData.end_date ? initialData.end_date.split('T')[0] : ''
            });
        } else if (initialData) {
            // Partial data (from calendar selection or just year)
            setFormData(prev => ({
                ...prev,
                audit_year: initialData.audit_year || prev.audit_year || new Date().getFullYear(),
                start_date: initialData.start_date ? initialData.start_date.split('T')[0] : prev.start_date || '',
                end_date: initialData.end_date ? initialData.end_date.split('T')[0] : prev.end_date || '',
            }));
        } else {
            // New audit plan (no initial data) - use current year as default
            setFormData({
                audit_year: new Date().getFullYear(),
                audit_type: '',
                audit_name: '',
                audit_lead_name: '',
                audit_lead_email: '',
                business_unit: '',
                department: '',
                process: '',
                start_date: '',
                end_date: '',
                audit_duration_weeks: undefined,
                report_release_date: '',
                audit_report_rating: '',
                status: 'Planned'
            });
        }
    }, [initialData?.id, initialData?.start_date, initialData?.end_date, isOpen]);

    if (!isOpen) return null;

    const handleChange = (field: keyof AuditPlan, value: any) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };

            // Reset process if department changes
            if (field === 'department') {
                newData.process = '';
            }

            // If audit lead changes, update both name and email
            if (field === 'audit_lead_email') {
                const selectedUser = users.find(u => u.email === value);
                if (selectedUser) {
                    newData.audit_lead_name = selectedUser.name;
                    newData.audit_lead_email = selectedUser.email;
                }
            }

            return newData;
        });

        // Clear error
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.audit_year) newErrors.audit_year = 'Year is required';
        if (!formData.audit_type) newErrors.audit_type = 'Type is required';
        if (!formData.audit_name) newErrors.audit_name = 'Audit name is required';
        if (!formData.audit_lead_email) newErrors.audit_lead_email = 'Audit lead is required';
        if (!formData.business_unit) newErrors.business_unit = 'Business Unit is required';
        if (!formData.department) newErrors.department = 'Department is required';
        if (!formData.process) newErrors.process = 'Process is required';

        if (formData.start_date && formData.end_date) {
            const startDate = new Date(formData.start_date);
            const endDate = new Date(formData.end_date);
            if (startDate > endDate) {
                newErrors.end_date = 'End date must be after start date';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            // Clean data: remove empty strings and convert to null/undefined for optional fields
            const cleanedData: Partial<AuditPlan> = {};
            for (const [key, value] of Object.entries(formData)) {
                if (value === undefined) continue; // Skip undefined (shouldn't happen now)
                
                if (value === '') {
                    // Convert empty strings to undefined for optional fields
                    const optionalFields = ['report_release_date', 'audit_report_rating'];
                    if (optionalFields.includes(key)) {
                        // Don't include empty optional fields
                        continue;
                    }
                }
                
                // Handle null for audit_duration_weeks
                if (key === 'audit_duration_weeks' && value === null) {
                    continue; // Don't send null, just skip it
                }
                
                cleanedData[key as keyof AuditPlan] = value as any;
            }
            onSubmit(cleanedData);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-xl">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            {initialData?.id ? 'Edit Audit Detail' : 'Create Audit'}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Fill in the details below to {initialData?.id ? 'update' : 'create'} an audit.
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-white/50 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Required Fields */}
                        <div className="space-y-1">
                            <Select
                                label="Audit Year"
                                required
                                value={formData.audit_year?.toString() || new Date().getFullYear().toString()}
                                onChange={(e) => handleChange('audit_year', parseInt(e.target.value))}
                                options={[2023, 2024, 2025, 2026, 2027].map(year => ({ value: year, label: year.toString() }))}
                                error={errors.audit_year}
                            />
                        </div>

                        <div className="space-y-1">
                            <Select
                                label="Audit Type"
                                required
                                value={formData.audit_type}
                                onChange={(e) => handleChange('audit_type', e.target.value)}
                                options={[
                                    { value: '', label: 'Select Type', disabled: true },
                                    ...AUDIT_TYPES.map(type => ({ value: type, label: type }))
                                ]}
                                error={errors.audit_type}
                            />
                        </div>

                        <div className="space-y-1">
                            <Select
                                label="Audit Lead"
                                required
                                value={formData.audit_lead_email}
                                onChange={(e) => handleChange('audit_lead_email', e.target.value)}
                                options={[
                                    { value: '', label: loadingUsers ? 'Loading...' : 'Select Audit Lead', disabled: true },
                                    ...users.map(user => ({
                                        value: user.email,
                                        label: `${user.name} (${user.role_name})`
                                    }))
                                ]}
                                error={errors.audit_lead_email}
                                disabled={loadingUsers}
                            />
                        </div>

                        <div className="space-y-1 md:col-span-3">
                            <Input
                                label="Audit Name"
                                required
                                type="text"
                                value={formData.audit_name}
                                onChange={(e) => handleChange('audit_name', e.target.value)}
                                placeholder="e.g. Q1 Technology Security Audit"
                                error={errors.audit_name}
                            />
                        </div>

                        {/* Required Fields */}
                        <div className="space-y-1">
                            <Select
                                label="Business Unit"
                                required
                                value={formData.business_unit || ''}
                                onChange={(e) => handleChange('business_unit', e.target.value)}
                                disabled={loadingBusinessUnits}
                                options={[
                                    { value: '', label: loadingBusinessUnits ? 'Loading...' : 'Select Business Unit', disabled: true },
                                    ...businessUnits
                                        .filter(opt => opt.is_active !== false)
                                        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                                        .map(unit => ({ value: unit.option_value, label: unit.option_value }))
                                ]}
                                error={errors.business_unit}
                            />
                        </div>

                        <div className="space-y-1">
                            <Select
                                label="Department"
                                required
                                value={formData.department || ''}
                                onChange={(e) => handleChange('department', e.target.value)}
                                disabled={loadingDepartments}
                                options={[
                                    { value: '', label: loadingDepartments ? 'Loading...' : 'Select Department', disabled: true },
                                    ...departments
                                        .filter(opt => opt.is_active !== false)
                                        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                                        .map(dept => ({ value: dept.option_value, label: dept.option_value }))
                                ]}
                                error={errors.department}
                            />
                        </div>

                        <div className="space-y-1">
                            <Select
                                label="Process"
                                required
                                value={formData.process || ''}
                                onChange={(e) => handleChange('process', e.target.value)}
                                disabled={!formData.department || loadingDepartmentProcesses}
                                options={[
                                    { value: '', label: loadingDepartmentProcesses ? 'Loading...' : 'Select Process', disabled: true },
                                    ...departmentProcesses
                                        .filter(opt => opt.is_active !== false)
                                        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                                        .map(dept => ({ value: dept.option_value, label: dept.option_value }))
                                ]}
                                error={errors.process}
                            />
                        </div>

                        <div className="space-y-1">
                            <Input
                                label="Start Date"
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => handleChange('start_date', e.target.value)}
                                error={errors.start_date}
                            />
                        </div>

                        <div className="space-y-1">
                            <Input
                                label="End Date"
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => handleChange('end_date', e.target.value)}
                                error={errors.end_date}
                            />
                        </div>

                        <div className="space-y-1">
                            <Input
                                label="Duration (Weeks)"
                                type="number"
                                min="1"
                                value={formData.audit_duration_weeks || ''}
                                onChange={(e) => handleChange('audit_duration_weeks', parseInt(e.target.value))}
                                placeholder="Auto-calculated"
                                disabled={!!(formData.start_date && formData.end_date)}
                            />
                            {formData.start_date && formData.end_date && (
                                <p className="text-xs text-gray-500 mt-0.5">Auto-calculated from dates</p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <Input
                                label="Report Release Date"
                                type="date"
                                value={formData.report_release_date}
                                onChange={(e) => handleChange('report_release_date', e.target.value)}
                            />
                        </div>

                        <div className="space-y-1">
                            <Select
                                label="Report Rating"
                                value={formData.audit_report_rating}
                                onChange={(e) => handleChange('audit_report_rating', e.target.value)}
                                options={[
                                    { value: '', label: 'Select Rating', disabled: true },
                                    ...RATINGS.map(rating => ({ value: rating, label: rating }))
                                ]}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100 mt-3">
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            {initialData?.id ? 'Save Changes' : 'Create Audit'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
