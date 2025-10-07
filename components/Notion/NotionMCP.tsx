import React, { useState, useEffect } from 'react';
import { notionService, createTaskFromCommand, createTask, createProject, listTasks } from '../../services/notionService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

interface NotionResponse {
  success: boolean;
  message?: string;
  type?: 'task' | 'project';
  notionId?: string;
  url?: string;
  error?: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  url: string;
}

export const NotionMCP: React.FC = () => {
  const [command, setCommand] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<NotionResponse | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Check if Notion is configured on component mount
  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      const config = await notionService.checkConfiguration();
      setIsConfigured(config.configured);
    } catch (error) {
      console.error('Error checking configuration:', error);
      setIsConfigured(false);
    }
  };

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    setIsLoading(true);
    setResponse(null);

    try {
      const result = await createTaskFromCommand(command.trim());
      setResponse(result);

      // Refresh tasks list if successful
      if (result.success) {
        await loadTasks();
      }
    } catch (error) {
      setResponse({
        success: false,
        error: 'Failed to process command'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const result = await listTasks();
      if (result.success && result.tasks) {
        setTasks(result.tasks);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const handleCreateTask = async () => {
    const taskData = {
      title: 'Sample Task',
      description: 'This is a sample task created via the Notion MCP',
      status: 'Todo',
      priority: 'Medium'
    };

    setIsLoading(true);
    try {
      const result = await createTask(taskData);
      setResponse(result);
      if (result.success) {
        await loadTasks();
      }
    } catch (error) {
      setResponse({
        success: false,
        error: 'Failed to create task'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    const projectData = {
      name: 'Sample Project',
      description: 'This is a sample project created via the Notion MCP',
      status: 'Planning'
    };

    setIsLoading(true);
    try {
      const result = await createProject(projectData);
      setResponse(result);
      if (result.success) {
        await loadTasks(); // Projects also appear in the tasks list
      }
    } catch (error) {
      setResponse({
        success: false,
        error: 'Failed to create project'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isConfigured === false) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Notion MCP Setup Required</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Notion integration is not configured. Please add the following environment variables to your backend:
              <br />
              <code>NOTION_API_TOKEN</code> - Your Notion API token
              <br />
              <code>NOTION_DATABASE_ID</code> - Your Notion database ID
              <br />
              <br />
              To get these values:
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Go to <a href="https://developers.notion.com/" target="_blank" rel="noopener noreferrer" className="underline">Notion Developers</a></li>
                <li>Create a new integration</li>
                <li>Copy the Internal Integration Token</li>
                <li>Create a database in Notion and share it with your integration</li>
                <li>Copy the database ID from the URL</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notion MCP - Create Tasks & Projects</CardTitle>
          <p className="text-sm text-gray-600">
            Use natural language commands to create tasks and projects in your Notion workspace
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCommandSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Try: 'Create a task to review the quarterly budget by Friday' or 'Start a new project called Website Redesign'"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="flex space-x-2">
              <Button type="submit" disabled={isLoading || !command.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? 'Hide' : 'Show'} Examples
              </Button>
            </div>
          </form>

          {showAdvanced && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Example Commands</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div><strong>Tasks:</strong></div>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>"Create a task to review the quarterly budget"</li>
                    <li>"Add task: Call client about project update due tomorrow"</li>
                    <li>"Remind me to finish the report by Friday high priority"</li>
                    <li>"Need to schedule team meeting next week"</li>
                  </ul>
                  <div className="mt-4"><strong>Projects:</strong></div>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>"Create a new project called Website Redesign"</li>
                    <li>"Start project: Mobile App Development"</li>
                    <li>"Make project Marketing Campaign with high priority"</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex space-x-2">
            <Button
              onClick={handleCreateTask}
              variant="outline"
              disabled={isLoading}
            >
              Create Sample Task
            </Button>
            <Button
              onClick={handleCreateProject}
              variant="outline"
              disabled={isLoading}
            >
              Create Sample Project
            </Button>
            <Button
              onClick={loadTasks}
              variant="outline"
              disabled={isLoading}
            >
              Refresh Tasks
            </Button>
          </div>
        </CardContent>
      </Card>

      {response && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              {response.success ? (
                <>
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  Success
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-5 w-5 text-red-500" />
                  Error
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {response.success ? (
              <div className="space-y-2">
                <p>{response.message}</p>
                {response.url && (
                  <a
                    href={response.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800"
                  >
                    Open in Notion <ExternalLink className="ml-1 h-4 w-4" />
                  </a>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertDescription>{response.error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Tasks & Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-medium">{task.title}</span>
                    <span className="ml-2 text-sm text-gray-500">({task.status})</span>
                    {task.dueDate && (
                      <span className="ml-2 text-sm text-blue-600">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <a
                    href={task.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
