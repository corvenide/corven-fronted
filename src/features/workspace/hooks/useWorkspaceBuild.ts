// src/features/workspace/hooks/useWorkspaceBuild.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { tokenStorage } from '../../../lib/token-storage';
import { terminalServiceOrigin } from '../../../config/env';

export interface BuildEntry {
    status: 'idle' | 'running' | 'success' | 'error' | 'cancelled';
    output: string;
    error?: string | null;
    timestamp?: string;
    durationMs?: number;
    projectPath?: string;
}

interface BuildStartedEvent {
    workspaceId: string;
    buildId: string;
    target: string;
    cwd: string;
    startedAt: string;
}

interface BuildOutputEvent {
    workspaceId: string;
    buildId: string;
    stream: 'stdout' | 'stderr';
    data: string;
}

interface BuildFinishedEvent {
    workspaceId: string;
    buildId: string;
    exitCode: number;
    status: 'success' | 'error';
    error: string | null;
    output: string;
    cwd: string;
    durationMs: number;
    finishedAt: string;
}

interface BuildErrorEvent {
    workspaceId: string;
    buildId?: string;
    message: string;
}

interface BuildCancelledEvent {
    workspaceId: string;
    buildId: string;
}

interface ProjectsListResponse {
    workspaceId: string;
    projects: string[];
}

interface UseWorkspaceBuildResult {
    status: 'idle' | 'running' | 'success' | 'error' | 'cancelled';
    isBuilding: boolean;
    currentOutput: string;
    history: BuildEntry[];
    duration?: number;
    error?: string | null;
    buildTarget: string;
    projectPath: string;
    projects: string[];
    loadingProjects: boolean;
    buildProject: () => Promise<void>;
    cancelBuild: () => Promise<void>;
    clearHistory: () => void;
    setBuildTarget: (target: string) => void;
    setProjectPath: (path: string) => void;
    refreshProjects: () => void;
}

const BUILD_SERVICE_URL = terminalServiceOrigin;

function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return tokenStorage.get();
}

export function useWorkspaceBuild(workspaceId: string): UseWorkspaceBuildResult {
    const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error' | 'cancelled'>('idle');
    const [currentOutput, setCurrentOutput] = useState<string>('');
    const [history, setHistory] = useState<BuildEntry[]>([]);
    const [duration, setDuration] = useState<number | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [buildTarget, setBuildTarget] = useState<string>('Default Build');
    const [projectPath, setProjectPath] = useState<string>('.');
    const [projects, setProjects] = useState<string[]>(['.']);
    const [loadingProjects, setLoadingProjects] = useState(false);

    const socketRef = useRef<Socket | null>(null);
    const outputRef = useRef<string>('');
    const buildIdRef = useRef<string | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const currentBuildRef = useRef<BuildEntry | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isSocketReady, setIsSocketReady] = useState(false);

    // Socket connection
    useEffect(() => {
        const token = getAccessToken();
        console.log('[Build] Creating socket connection');
        const socket = io(`${BUILD_SERVICE_URL}/terminal`, {
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000,
            auth: (cb: (data: object) => void) => cb({ token: getAccessToken() }),
            query: { workspaceId },
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Build] Connected to service');
            setIsSocketReady(true);
        });

        socket.on('terminal:authenticated', (data) => {
            console.log('[Build] Authentication response:', data);
            if (data?.success) {
                console.log('[Build] Authentication successful');
                setIsAuthenticated(true);
                // Refresh projects after authentication. (Don't check the
                // isAuthenticated state here: this closure only ever sees
                // its initial value, false.)
                setTimeout(() => {
                    if (socket.connected) {
                        socket.emit('projects:list', { workspaceId });
                        setLoadingProjects(true);
                    }
                }, 500);
            } else {
                console.warn('[Build] Authentication failed:', data);
                setIsAuthenticated(false);
            }
        });

        socket.on('projects:list:response', (data: ProjectsListResponse) => {
            console.log('[Build] Projects list response received:', data);
            setLoadingProjects(false);
            if (data && data.projects) {
                console.log(`[Build] Received ${data.projects.length} projects:`, data.projects);
                if (data.projects.length > 0) {
                    const projectList = ['.', ...data.projects];
                    setProjects(projectList);
                    // If current projectPath is not in the list, reset to '.'
                    setProjectPath((current) => {
                        if (current !== '.' && !data.projects.includes(current)) {
                            return '.';
                        }
                        return current;
                    });
                } else {
                    console.log('[Build] No projects found, using default');
                    setProjects(['.']);
                }
            } else {
                console.warn('[Build] Invalid projects response:', data);
                setProjects(['.']);
            }
        });

        socket.on('projects:error', (error) => {
            console.error('[Build] Projects error:', error);
            setLoadingProjects(false);
            setProjects(['.']);
        });

        socket.on('connect_error', (connectionError: Error) => {
            console.error('[Build] Connection error:', connectionError);
            setIsSocketReady(false);
            setIsAuthenticated(false);
            setError(`Connection error: ${connectionError.message}`);
        });

        socket.on('disconnect', (reason) => {
            console.log('[Build] Disconnected:', reason);
            setIsSocketReady(false);
            setIsAuthenticated(false);
        });

        socket.on('reconnect', () => {
            console.log('[Build] Reconnected');
            setIsSocketReady(true);
        });

        // Build event handlers
        const handleStarted = (event: BuildStartedEvent) => {
            console.log('[Build] Started event:', event);
            if (event.workspaceId !== workspaceId) return;

            buildIdRef.current = event.buildId;
            startTimeRef.current = Date.now();
            outputRef.current = '';
            setCurrentOutput('');
            setStatus('running');
            setError(null);
            setDuration(undefined);

            const project = event.cwd ? event.cwd.replace('/workspace/', '') : '.';
            currentBuildRef.current = {
                status: 'running',
                output: '',
                timestamp: event.startedAt,
                projectPath: project,
            };
        };

        const handleOutput = (event: BuildOutputEvent) => {
            if (event.workspaceId !== workspaceId || event.buildId !== buildIdRef.current) return;

            outputRef.current += event.data;
            setCurrentOutput(outputRef.current);
        };

        const handleFinished = (event: BuildFinishedEvent) => {
            console.log('[Build] Finished event:', event);
            if (event.workspaceId !== workspaceId || event.buildId !== buildIdRef.current) return;

            const finalStatus = event.status === 'success' ? 'success' : 'error';
            setStatus(finalStatus);
            setDuration(event.durationMs);

            if (event.error) {
                setError(event.error);
            } else if (event.exitCode !== 0) {
                setError(`Build failed with exit code ${event.exitCode}`);
            } else {
                setError(null);
            }

            // Update the final output
            if (event.output) {
                outputRef.current = event.output;
                setCurrentOutput(event.output);
            }

            // Add to history
            if (currentBuildRef.current) {
                const project = event.cwd ? event.cwd.replace('/workspace/', '') : '.';
                const entry: BuildEntry = {
                    ...currentBuildRef.current,
                    status: finalStatus,
                    output: event.output || outputRef.current,
                    durationMs: event.durationMs,
                    timestamp: event.finishedAt,
                    error: event.error || (event.exitCode !== 0 ? `Exit code: ${event.exitCode}` : null),
                    projectPath: project,
                };
                setHistory(prev => [...prev, entry]);
                currentBuildRef.current = null;
            }

            buildIdRef.current = null;
            startTimeRef.current = null;
        };

        const handleCancelled = (event: BuildCancelledEvent) => {
            console.log('[Build] Cancelled event:', event);
            if (event.workspaceId !== workspaceId) return;

            setStatus('cancelled');
            setDuration(Date.now() - (startTimeRef.current || Date.now()));
            startTimeRef.current = null;

            if (currentBuildRef.current) {
                currentBuildRef.current.status = 'cancelled';
                const entry = { ...currentBuildRef.current };
                setHistory(prev => [...prev, entry]);
                currentBuildRef.current = null;
            }

            buildIdRef.current = null;
        };

        const handleError = (event: BuildErrorEvent) => {
            console.error('[Build] Error event:', event);
            if (event.workspaceId !== workspaceId) return;

            setStatus('error');
            setError(event.message);
            setDuration(Date.now() - (startTimeRef.current || Date.now()));
            startTimeRef.current = null;

            if (currentBuildRef.current) {
                currentBuildRef.current.status = 'error';
                currentBuildRef.current.error = event.message;
                const entry = { ...currentBuildRef.current };
                setHistory(prev => [...prev, entry]);
                currentBuildRef.current = null;
            }

            buildIdRef.current = null;
        };

        socket.on('build:started', handleStarted);
        socket.on('build:output', handleOutput);
        socket.on('build:finished', handleFinished);
        socket.on('build:cancelled', handleCancelled);
        socket.on('build:error', handleError);

        return () => {
            console.log('[Build] Cleaning up socket listeners');
            socket.off('connect');
            socket.off('terminal:authenticated');
            socket.off('projects:list:response');
            socket.off('projects:error');
            socket.off('connect_error');
            socket.off('disconnect');
            socket.off('reconnect');
            socket.off('build:started', handleStarted);
            socket.off('build:output', handleOutput);
            socket.off('build:finished', handleFinished);
            socket.off('build:cancelled', handleCancelled);
            socket.off('build:error', handleError);
            socket.disconnect();
            socketRef.current = null;
        };
    }, [workspaceId]);

    const refreshProjects = useCallback(() => {
        if (!socketRef.current?.connected) {
            console.warn('[Build] Cannot refresh projects: socket not connected');
            return;
        }
        if (!isAuthenticated) {
            console.warn('[Build] Cannot refresh projects: not authenticated');
            return;
        }

        console.log(`[Build] Requesting project list for workspace: ${workspaceId}`);
        setLoadingProjects(true);
        socketRef.current.emit('projects:list', { workspaceId });
    }, [workspaceId, isAuthenticated]);

    const buildProject = useCallback(async () => {
        if (status === 'running') {
            console.warn('[Build] Build already in progress');
            return;
        }

        if (!socketRef.current?.connected) {
            console.warn('[Build] Cannot run build: socket not connected');
            setError('Not connected to build service');
            return;
        }

        if (!isAuthenticated) {
            console.warn('[Build] Cannot run build: not authenticated');
            setError('Not authenticated');
            return;
        }

        const projectPathToUse = projectPath === '.' ? '' : projectPath;
        console.log(`[Build] Starting build for workspace ${workspaceId} with target ${buildTarget} at path ${projectPathToUse || 'root'}`);

        // Reset state
        setStatus('running');
        setCurrentOutput('');
        setError(null);
        setDuration(undefined);
        startTimeRef.current = Date.now();
        outputRef.current = '';

        // Create initial build entry
        currentBuildRef.current = {
            status: 'running',
            output: '',
            timestamp: new Date().toISOString(),
            projectPath: projectPath,
        };

        const buildId = crypto.randomUUID();
        buildIdRef.current = buildId;

        socketRef.current.emit('build:start', {
            workspaceId,
            target: buildTarget,
            cwd: projectPathToUse || undefined,
            buildId,
        });
    }, [workspaceId, buildTarget, projectPath, isAuthenticated, status]);

    const cancelBuild = useCallback(async () => {
        if (!buildIdRef.current) {
            console.warn('[Build] Cannot cancel: no build ID');
            return;
        }

        console.log(`[Build] Cancelling build ${buildIdRef.current}`);
        socketRef.current?.emit('build:cancel', {
            workspaceId,
            buildId: buildIdRef.current
        });
    }, [workspaceId]);

    const clearHistory = useCallback(() => {
        console.log('[Build] Clearing history');
        setHistory([]);
        setCurrentOutput('');
        setError(null);
        setDuration(undefined);
        setStatus('idle');
        currentBuildRef.current = null;
        outputRef.current = '';
    }, []);

    return {
        status,
        isBuilding: status === 'running',
        currentOutput,
        history,
        duration,
        error,
        buildTarget,
        projectPath,
        projects,
        loadingProjects,
        buildProject,
        cancelBuild,
        clearHistory,
        setBuildTarget,
        setProjectPath,
        refreshProjects,
    };
}