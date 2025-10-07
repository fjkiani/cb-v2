import { request } from './api/request';

export interface TaskData {
  title: string;
  description?: string;
  status?: string;
  dueDate?: string;
  priority?: string;
}

export interface ProjectData {
  name: string;
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface NotionResponse {
  success: boolean;
  message?: string;
  type?: 'task' | 'project';
  notionId?: string;
  url?: string;
  error?: string;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  url: string;
}

class NotionService {
  private baseUrl = '/api/notion';

  /**
   * Process a natural language command to create tasks or projects
   */
  async processCommand(command: string): Promise<NotionResponse> {
    try {
      const response = await request.post(`${this.baseUrl}/command`, { command });
      return response;
    } catch (error: any) {
      console.error('Error processing Notion command:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to process command'
      };
    }
  }

  /**
   * Create a task directly
   */
  async createTask(taskData: TaskData): Promise<NotionResponse> {
    try {
      const response = await request.post(`${this.baseUrl}/tasks`, taskData);
      return response;
    } catch (error: any) {
      console.error('Error creating task:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to create task'
      };
    }
  }

  /**
   * Create a project directly
   */
  async createProject(projectData: ProjectData): Promise<NotionResponse> {
    try {
      const response = await request.post(`${this.baseUrl}/projects`, projectData);
      return response;
    } catch (error: any) {
      console.error('Error creating project:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to create project'
      };
    }
  }

  /**
   * List tasks with optional filtering
   */
  async listTasks(filter?: { status?: string }): Promise<{ success: boolean; tasks?: Task[]; error?: string }> {
    try {
      const params = filter ? new URLSearchParams(filter) : undefined;
      const url = params ? `${this.baseUrl}/tasks?${params}` : `${this.baseUrl}/tasks`;
      const response = await request.get(url);
      return response;
    } catch (error: any) {
      console.error('Error listing tasks:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to list tasks'
      };
    }
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, updates: Partial<TaskData>): Promise<NotionResponse> {
    try {
      const response = await request.put(`${this.baseUrl}/tasks/${taskId}`, updates);
      return response;
    } catch (error: any) {
      console.error('Error updating task:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to update task'
      };
    }
  }

  /**
   * Check if Notion integration is configured
   */
  async checkConfiguration(): Promise<{ configured: boolean; error?: string }> {
    try {
      const healthResponse = await request.get('/api/health');
      return {
        configured: healthResponse.services?.notion || false
      };
    } catch (error: any) {
      console.error('Error checking Notion configuration:', error);
      return {
        configured: false,
        error: error.response?.data?.error || error.message || 'Failed to check configuration'
      };
    }
  }
}

// Export singleton instance
export const notionService = new NotionService();

// Export convenience functions for common operations
export const createTaskFromCommand = (command: string) => notionService.processCommand(command);
export const createTask = (taskData: TaskData) => notionService.createTask(taskData);
export const createProject = (projectData: ProjectData) => notionService.createProject(projectData);
export const listTasks = (filter?: { status?: string }) => notionService.listTasks(filter);
export const updateTask = (taskId: string, updates: Partial<TaskData>) => notionService.updateTask(taskId, updates);
