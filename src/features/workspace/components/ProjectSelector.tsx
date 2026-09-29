// frontend/src/components/ProjectSelector.tsx
import React, { useEffect, useState } from 'react';
import { FolderOpen, Folder } from 'lucide-react';

interface Project {
    name: string;
    path: string;
    type?: string;
}

interface ProjectSelectorProps {
    workspaceId: string;
    onProjectSelect: (projectPath: string | undefined) => void;
    selectedProject: string | undefined;
}

export function ProjectSelector({
    workspaceId,
    onProjectSelect,
    selectedProject,
}: ProjectSelectorProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch projects from the workspace
        const fetchProjects = async () => {
            try {
                // You'll need to implement an API endpoint to list projects
                const response = await fetch(`/api/workspaces/${workspaceId}/projects`);
                const data = await response.json();
                setProjects(data.projects || []);
            } catch (error) {
                console.error('Failed to fetch projects:', error);
                setProjects([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, [workspaceId]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Loading projects...</span>
            </div>
        );
    }

    if (projects.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-2">
            <Folder className="h-3.5 w-3.5 text-gray-500" />

            <select
                value={selectedProject || ''}
                onChange={(e) => onProjectSelect(e.target.value || undefined)}
                className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-[#58a6ff]"
            >
                <option value="">Root (/workspace)</option>
                {projects.map((project) => (
                    <option key={project.path} value={project.path}>
                        {project.name}
                    </option>
                ))}
            </select>
        </div>
    );
}