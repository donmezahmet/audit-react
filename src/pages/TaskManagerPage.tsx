import React, { useState, useEffect } from 'react';
import { Button, Card, Badge } from '@/components/ui';
import { SearchInput } from '@/components/forms';
import { taskService } from '@/services/task.service';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import type { Task } from '@/types';
import { formatRelativeDate } from '@/utils/format';

const TaskManagerPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { permissions } = useAuthStore();
  const { addNotification } = useUIStore();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await taskService.getTasks();
      if (response.success && response.data) {
        setTasks(response.data);
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to load tasks',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeVariant = (status: Task['status']) => {
    switch (status) {
      case 'done':
        return 'success';
      case 'in_progress':
        return 'info';
      case 'blocked':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getPriorityBadgeVariant = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'danger';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'default';
    }
  };

  const statusCounts = {
    all: tasks.length,
    to_do: tasks.filter(t => t.status === 'to_do').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-gray-900">Task Manager</h1>
          <p className="text-gray-600 mt-1">Manage and track your tasks</p>
        </div>
        {permissions?.tasks?.can_create && (
          <Button variant="primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-[12.8px]">
        <Card variant="elevated" padding="sm">
          <div className="text-center">
            <p className="text-[24px] font-bold text-purple-600">{statusCounts.all}</p>
            <p className="text-xs text-gray-600 mt-1">Total Tasks</p>
          </div>
        </Card>
        <Card variant="elevated" padding="sm">
          <div className="text-center">
            <p className="text-[24px] font-bold text-gray-600">{statusCounts.to_do}</p>
            <p className="text-xs text-gray-600 mt-1">To Do</p>
          </div>
        </Card>
        <Card variant="elevated" padding="sm">
          <div className="text-center">
            <p className="text-[24px] font-bold text-blue-600">{statusCounts.in_progress}</p>
            <p className="text-xs text-gray-600 mt-1">In Progress</p>
          </div>
        </Card>
        <Card variant="elevated" padding="sm">
          <div className="text-center">
            <p className="text-[24px] font-bold text-green-600">{statusCounts.done}</p>
            <p className="text-xs text-gray-600 mt-1">Done</p>
          </div>
        </Card>
        <Card variant="elevated" padding="sm">
          <div className="text-center">
            <p className="text-[24px] font-bold text-red-600">{statusCounts.blocked}</p>
            <p className="text-xs text-gray-600 mt-1">Blocked</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-[12.8px]">
          <div className="flex-1">
            <SearchInput
              placeholder="Search tasks..."
              onSearch={setSearchTerm}
            />
          </div>
          <div className="flex gap-2">
            {['all', 'to_do', 'in_progress', 'done', 'blocked'].map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status)}
              >
                {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Tasks List */}
      {loading ? (
        <Card>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-purple-600" />
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-[12.8px]">
          {filteredTasks.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <h3 className="mt-2 text-xs font-medium text-gray-900">No tasks found</h3>
                <p className="mt-1 text-xs text-gray-500">Get started by creating a new task.</p>
              </div>
            </Card>
          ) : (
            filteredTasks.map((task) => (
              <Card key={task.id} variant="elevated" className="hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-gray-900">{task.title}</h3>
                      <Badge variant={getStatusBadgeVariant(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant={getPriorityBadgeVariant(task.priority)}>
                        {task.priority}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-gray-600 mb-3">{task.description}</p>
                    )}
                    <div className="flex items-center gap-[12.8px] text-xs text-gray-500">
                      {task.assignee && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {task.assignee}
                        </span>
                      )}
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                      <span>Created {formatRelativeDate(task.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {permissions?.tasks?.can_edit && (
                      <Button variant="ghost" size="sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                    )}
                    {permissions?.tasks?.can_delete && (
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TaskManagerPage;

