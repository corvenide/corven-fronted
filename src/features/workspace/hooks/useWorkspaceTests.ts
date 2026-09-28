// frontend hook - useWorkspaceTests.ts
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
    TestErrorEvent,
    TestFinishedEvent,
    TestOutputEvent,
    TestRunStatus,
    TestStartedEvent,
    WorkspaceTestRun,
} from '../types/test.types';
import { parseTestOutput } from '../utils/parseTestOutput';
import { tokenStorage } from '../../../lib/token-storage';
import { terminalServiceOrigin } from '../../../config/env';

const TEST_SERVICE_URL = terminalServiceOrigin;

const EMPTY_RUN: WorkspaceTestRun = {
    runId: null,
    status: 'idle',
    startedAt: null,
    finishedAt: null,
    output: '',
    tests: [],
    summary: { passed: 0, failed: 0, ignored: 0, filteredOut: 0, total: 0 },
};

function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return tokenStorage.get();
}

interface UseWorkspaceTestsResult {
    run: WorkspaceTestRun;
    status: TestRunStatus;
    isRunning: boolean;
    projectPath: string;
    projects: string[];
    loadingProjects: boolean;
    setProjectPath: (path: string) => void;
    runTests: () => void;
    cancelTests: () => void;
    clearResults: () => void;
    refreshProjects: () => void;
}

export function useWorkspaceTests(workspaceId: string): UseWorkspaceTestsResult {
    const socketRef = useRef<Socket | null>(null);
    const outputRef = useRef('');
    /*
     * Track the current run ID in a ref so event handlers can always
     * read the latest value without being listed as effect dependencies
     * (which would cause the socket to disconnect/reconnect on every run).
     */
    const runIdRef = useRef<string | null>(null);
    const [run, setRun] = useState<WorkspaceTestRun>(EMPTY_RUN);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [projectPath, setProjectPath] = useState<string>('.');
    const [projects, setProjects] = useState<string[]>(['.']);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [isSocketReady, setIsSocketReady] = useState(false);

    const applyParsedOutput = useCallback((output: string) => {
        const parsed = parseTestOutput(output);
        setRun((current) => ({
            ...current,
            output,
            tests: parsed.tests,
            summary: parsed.summary,
        }));
    }, []);

    // Keep runIdRef in sync with the latest run state.
    useEffect(() => {
        runIdRef.current = run.runId;
    }, [run.runId]);

    const refreshProjects = useCallback(() => {
        if (!socketRef.current?.connected) {
            console.warn('Cannot refresh projects: socket not connected');
            return;
        }
        if (!isAuthenticated) {
            console.warn('Cannot refresh projects: not authenticated');
            return;
        }

        console.log(`[Projects] Requesting project list for workspace: ${workspaceId}`);
        setLoadingProjects(true);
        socketRef.current.emit('projects:list', { workspaceId });
    }, [workspaceId, isAuthenticated]);

    useEffect(() => {
        const token = getAccessToken();
        console.log('[Socket] Creating socket connection');
        const socket = io(`${TEST_SERVICE_URL}/terminal`, {
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
            console.log('[Socket] Connected to test service');
            setIsSocketReady(true);
            setRun((current) => ({ ...current, status: 'idle' }));
        });

        // Listen for authentication - this is the key event
        socket.on('terminal:authenticated', (data) => {
            console.log('[Socket] Authentication response:', data);
            if (data?.success) {
                console.log('[Socket] Authentication successful');
                setIsAuthenticated(true);
                // Refresh projects after authentication
                console.log('[Socket] Scheduling project list request after auth');
                // (Don't check the isAuthenticated state here: this closure
                // only ever sees its initial value, false.)
                setTimeout(() => {
                    console.log('[Socket] Requesting project list after auth delay');
                    if (socket.connected) {
                        socket.emit('projects:list', { workspaceId });
                        setLoadingProjects(true);
                    }
                }, 500);
            } else {
                console.warn('[Socket] Authentication failed:', data);
            }
        });

        socket.on('projects:list:response', (data) => {
            console.log('[Socket] Projects list response received:', data);
            setLoadingProjects(false);
            if (data && data.projects) {
                console.log(`[Socket] Received ${data.projects.length} projects:`, data.projects);
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
                    console.log('[Socket] No projects found, using default');
                    setProjects(['.']);
                }
            } else {
                console.warn('[Socket] Invalid projects response:', data);
                setProjects(['.']);
            }
        });

        socket.on('projects:error', (error) => {
            console.error('[Socket] Projects error:', error);
            setLoadingProjects(false);
            setProjects(['.']);
        });

        socket.on('connect_error', (connectionError: Error) => {
            console.error('[Socket] Connection error:', connectionError);
            setIsSocketReady(false);
            setIsAuthenticated(false);
            setRun((current) => ({
                ...current,
                status: 'error',
                output: `Connection error: ${connectionError.message}`,
            }));
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
            setIsSocketReady(false);
            setIsAuthenticated(false);
        });

        socket.on('reconnect', () => {
            console.log('[Socket] Reconnected');
            setIsSocketReady(true);
        });

        const handleStarted = (event: TestStartedEvent) => {
            console.log('[Socket] Test started event:', event);
            if (event.workspaceId !== workspaceId) return;
            outputRef.current = '';
            setRun({
                ...EMPTY_RUN,
                runId: event.runId,
                status: 'running',
                startedAt: event.startedAt,
            });
        };

        const handleOutput = (event: TestOutputEvent) => {
            // Use runIdRef so this handler doesn't need to be re-registered
            // (and the socket rebuilt) every time run.runId changes.
            if (event.workspaceId !== workspaceId || event.runId !== runIdRef.current) return;
            outputRef.current += event.data;
            applyParsedOutput(outputRef.current);
        };

        const handleFinished = (event: TestFinishedEvent) => {
            console.log('[Socket] Test finished event:', event);
            if (event.workspaceId !== workspaceId) return;
            const parsed = parseTestOutput(outputRef.current);
            setRun((current) => ({
                ...current,
                runId: event.runId,
                status: event.exitCode === 0 ? 'passed' : 'failed',
                finishedAt: event.finishedAt,
                tests: parsed.tests,
                summary: parsed.summary,
            }));
        };

        const handleCancelled = ({ workspaceId: cancelledWorkspaceId, runId }: { workspaceId: string; runId: string }) => {
            console.log('[Socket] Test cancelled event:', { cancelledWorkspaceId, runId });
            if (cancelledWorkspaceId !== workspaceId) return;
            setRun((current) => ({
                ...current,
                runId,
                status: 'cancelled',
                finishedAt: new Date().toISOString(),
            }));
        };

        const handleError = (event: TestErrorEvent) => {
            console.error('[Socket] Test error event:', event);
            if (event.workspaceId !== workspaceId) return;
            setRun((current) => ({
                ...current,
                status: 'error',
                finishedAt: new Date().toISOString(),
                output: [current.output, `\nTest runner error: ${event.message}\n`].join(''),
            }));
        };

        socket.on('test:started', handleStarted);
        socket.on('test:output', handleOutput);
        socket.on('test:finished', handleFinished);
        socket.on('test:cancelled', handleCancelled);
        socket.on('test:error', handleError);

        // Cleanup function
        return () => {
            console.log('[Socket] Cleaning up socket listeners');
            socket.off('connect');
            socket.off('terminal:authenticated');
            socket.off('projects:list:response');
            socket.off('projects:error');
            socket.off('connect_error');
            socket.off('disconnect');
            socket.off('reconnect');
            socket.off('test:started', handleStarted);
            socket.off('test:output', handleOutput);
            socket.off('test:finished', handleFinished);
            socket.off('test:cancelled', handleCancelled);
            socket.off('test:error', handleError);
            socket.disconnect();
            socketRef.current = null;
        };
    }, [applyParsedOutput, workspaceId]); // runId is read via runIdRef to avoid socket rebuilds

    const runTests = useCallback(() => {
        if (!socketRef.current?.connected) {
            console.warn('[Tests] Cannot run tests: socket not connected');
            return;
        }
        if (!isAuthenticated) {
            console.warn('[Tests] Cannot run tests: not authenticated');
            return;
        }
        console.log(`[Tests] Running tests for workspace ${workspaceId} at path ${projectPath}`);
        outputRef.current = '';
        const runId = crypto.randomUUID();
        setRun({ ...EMPTY_RUN, status: 'queued', runId });
        socketRef.current.emit('test:run', {
            workspaceId,
            command: 'make test',
            cwd: projectPath,
            runId,
        });
    }, [workspaceId, projectPath, isAuthenticated]);

    const cancelTests = useCallback(() => {
        if (!run.runId) {
            console.warn('[Tests] Cannot cancel: no run ID');
            return;
        }
        console.log(`[Tests] Cancelling test run ${run.runId}`);
        socketRef.current?.emit('test:cancel', { workspaceId, runId: run.runId });
    }, [run.runId, workspaceId]);

    const clearResults = useCallback(() => {
        console.log('[Tests] Clearing results');
        outputRef.current = '';
        setRun(EMPTY_RUN);
    }, []);

    const isRunning = useMemo(() => run.status === 'queued' || run.status === 'running', [run.status]);

    return {
        run,
        status: run.status,
        isRunning,
        projectPath,
        projects,
        loadingProjects,
        setProjectPath,
        runTests,
        cancelTests,
        clearResults,
        refreshProjects,
    };
}
