import { getMockData } from './mockData.service';
import type { Task, ApiResponse, PaginatedResponse, TaskAuditLog, TaskPermissions } from '@/types';

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  assignee?: string;
  due_date?: string;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  id: number;
}

export interface TaskFilters {
  search?: string;
  status?: string[];
  priority?: string[];
  assignee?: string[];
  dateFrom?: string;
  dateTo?: string;
}

const mockTasks: Task[] = [
  {
    id: 1,
    title: 'Review Financial Controls',
    description: 'Review and update financial control procedures',
    status: 'in_progress',
    priority: 'high',
    assignee: 'john.doe@example.com',
    due_date: '2025-03-15',
    created_by: 'mahmut@turan.com',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
  },
  {
    id: 2,
    title: 'Update IT Security Policies',
    description: 'Review and update IT security documentation',
    status: 'to_do',
    priority: 'medium',
    assignee: 'jane.smith@example.com',
    due_date: '2025-02-28',
    created_by: 'mahmut@turan.com',
    created_at: '2024-02-10T00:00:00Z',
    updated_at: '2024-02-10T00:00:00Z',
  },
];

export const taskService = {
  // Get all tasks with optional filters
  getTasks: async (filters?: TaskFilters): Promise<ApiResponse<Task[]>> => {
    let filtered = [...mockTasks];
    if (filters?.status?.length) {
      filtered = filtered.filter(t => filters.status!.includes(t.status));
    }
    if (filters?.priority?.length) {
      filtered = filtered.filter(t => filters.priority!.includes(t.priority));
    }
    if (filters?.assignee?.length) {
      filtered = filtered.filter(t => t.assignee && filters.assignee!.includes(t.assignee));
    }
    return getMockData('tasks', { success: true, data: filtered });
  },

  // Get paginated tasks
  getPaginatedTasks: async (page: number = 1, limit: number = 10, filters?: TaskFilters): Promise<PaginatedResponse<Task>> => {
    let filtered = [...mockTasks];
    if (filters?.status?.length) {
      filtered = filtered.filter(t => filters.status!.includes(t.status));
    }
    const start = (page - 1) * limit;
    const end = start + limit;
    return getMockData('paginated-tasks', {
      data: filtered.slice(start, end),
      total: filtered.length,
      page,
      limit,
      hasMore: end < filtered.length,
    });
  },

  // Get single task
  getTask: async (id: number): Promise<ApiResponse<Task>> => {
    const task = mockTasks.find(t => t.id === id);
    if (!task) throw new Error('Task not found');
    return getMockData('task', { success: true, data: task });
  },

  // Create task
  createTask: async (data: CreateTaskData): Promise<ApiResponse<Task>> => {
    const task: Task = {
      id: mockTasks.length + 1,
      title: data.title,
      description: data.description,
      status: data.status || 'to_do',
      priority: data.priority || 'medium',
      assignee: data.assignee,
      due_date: data.due_date,
      created_by: 'mahmut@turan.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockTasks.push(task);
    return getMockData('create-task', { success: true, data: task });
  },

  // Update task
  updateTask: async (id: number, data: Partial<UpdateTaskData>): Promise<ApiResponse<Task>> => {
    const index = mockTasks.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Task not found');
    const existingTask = mockTasks[index] as Task;
    const updatedTask: Task = { ...existingTask, ...data, updated_at: new Date().toISOString() } as Task;
    (mockTasks as any[])[index] = updatedTask;
    return getMockData('update-task', { success: true, data: updatedTask as any }) as Promise<ApiResponse<Task>>;
  },

  // Delete task
  deleteTask: async (id: number): Promise<ApiResponse<void>> => {
    const index = mockTasks.findIndex(t => t.id === id);
    if (index !== -1) mockTasks.splice(index, 1);
    return getMockData('delete-task', { success: true });
  },

  // Get task audit log
  getTaskAuditLog: async (_taskId: number): Promise<ApiResponse<TaskAuditLog[]>> => {
    return getMockData('task-audit-log', { success: true, data: [] });
  },

  // Get task permissions
  getTaskPermissions: async (): Promise<ApiResponse<TaskPermissions>> => {
    return getMockData('task-permissions', {
      success: true,
      data: { can_view: true, can_create: true, can_edit: true, can_delete: true },
    });
  },

  // Export tasks to Excel
  exportTasks: async (_filters?: TaskFilters): Promise<Blob> => {
    await getMockData('export-tasks', null, 200);
    return new Blob(['Mock export data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  },
};

