// A fake Corven API for Playwright. It answers every request the app sends
// to the backend and keeps workspaces in memory, so creating or deleting one
// changes what the next list request returns. Tests read `requests` to check
// what the app sent.

import type { Page, Request, Route } from '@playwright/test';

import { API_URL } from '../../playwright.config';

const APP_ORIGIN = 'http://localhost:4173';

export interface MockWorkspace {
    id: string;
    name: string;
    status: 'PENDING' | 'PROVISIONING' | 'RUNNING' | 'IDLE' | 'STOPPED' | 'FAILED';
    templateId?: string | null;
    provisionError?: string | null;
    createdAt?: string;
}

export interface RecordedRequest {
    method: string;
    path: string;
    body: unknown;
    authorization: string | null;
}

export const TEST_USER = {
    id: 'user-1',
    name: 'Ada',
    email: null,
    walletAddress: 'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwgx292hnvmn68xf779vmzrshpmm6epn4c0cgwga',
    role: 'USER',
    authProvider: 'CKB_WALLET',
    createdAt: '2026-01-01T00:00:00.000Z',
};

export const TEMPLATES = [
    {
        id: 'hello-world',
        name: 'Hello world',
        description: 'A minimal contract to start from.',
        contracts: ['hello-world'],
    },
    {
        id: 'xudt',
        name: 'Token (xUDT)',
        description: 'A fungible token contract.',
        contracts: ['xudt'],
    },
];

/** Unsigned JWT; the app only reads `exp`. */
function accessToken(): string {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const exp = Math.floor(Date.now() / 1000) + 15 * 60;
    return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: TEST_USER.id, exp })}.test`;
}

function fullWorkspace(workspace: MockWorkspace) {
    const now = new Date().toISOString();

    return {
        userId: TEST_USER.id,
        templateId: null,
        runtimeNetwork: null,
        runtimeVolume: null,
        lastStartedAt: null,
        lastStoppedAt: null,
        lastActivityAt: null,
        provisionStage: null,
        provisionError: null,
        createdAt: now,
        updatedAt: now,
        ...workspace,
    };
}

export class MockApi {
    /** Whether the refresh cookie holds a valid session. */
    signedIn = false;
    workspaces: MockWorkspace[] = [];
    /** Status to answer GET /workspaces with instead of the list (e.g. 500). */
    listFailure: number | null = null;
    /** Answer every authenticated request with 401 (a revoked session). */
    revoked = false;

    readonly requests: RecordedRequest[] = [];
    private nextId = 1;

    constructor(private readonly page: Page) {}

    async install(): Promise<void> {
        // Keep tests offline: block fonts, images and anything else external.
        await this.page.route(
            (url) => url.hostname !== 'localhost' && !url.href.startsWith(API_URL),
            (route) => route.abort(),
        );

        await this.page.route(`${API_URL}/**`, (route, request) => this.handle(route, request));
    }

    /** Requests with the given method and path (path relative to /api). */
    sent(method: string, path: string): RecordedRequest[] {
        return this.requests.filter((request) => request.method === method && request.path === path);
    }

    private async handle(route: Route, request: Request): Promise<void> {
        const cors = {
            'Access-Control-Allow-Origin': APP_ORIGIN,
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        };

        if (request.method() === 'OPTIONS') {
            await route.fulfill({ status: 204, headers: cors });
            return;
        }

        const path = new URL(request.url()).pathname.replace(/^\/api/, '');
        const body = request.postData() ? safeJson(request.postData()!) : undefined;

        this.requests.push({
            method: request.method(),
            path,
            body,
            authorization: request.headers()['authorization'] ?? null,
        });

        const [status, payload] = this.respond(request.method(), path, body);

        await route.fulfill({
            status,
            headers: { ...cors, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload ?? {}),
        });
    }

    private respond(method: string, path: string, body: any): [number, unknown] {
        if (method === 'POST' && path === '/auth/refresh') {
            return this.signedIn && !this.revoked
                ? [200, { accessToken: accessToken(), user: TEST_USER }]
                : [401, { statusCode: 401, message: 'No session' }];
        }

        if (method === 'POST' && path === '/auth/logout') {
            this.signedIn = false;
            return [201, { success: true }];
        }

        if (this.revoked) {
            return [401, { statusCode: 401, message: 'Unauthorized' }];
        }

        if (method === 'GET' && path === '/auth/me') return [200, TEST_USER];
        if (method === 'GET' && path === '/workspace-templates') return [200, TEMPLATES];
        if (method === 'GET' && path === '/ai/status') return [200, { enabled: false, defaultModel: '', models: [] }];

        if (method === 'GET' && path === '/workspaces') {
            if (this.listFailure) {
                return [this.listFailure, { statusCode: this.listFailure, message: 'Server error' }];
            }
            return [200, this.workspaces.map(fullWorkspace)];
        }

        if (method === 'POST' && path === '/workspaces') {
            if (!body?.name) {
                return [400, { statusCode: 400, message: ['name should not be empty'] }];
            }
            const workspace: MockWorkspace = {
                id: `ws-new-${this.nextId++}`,
                name: body.name,
                status: 'PENDING',
                templateId: body.templateId ?? null,
            };
            this.workspaces.push(workspace);
            return [201, fullWorkspace(workspace)];
        }

        const match = path.match(/^\/workspaces\/([^/]+)(\/.*)?$/);

        if (match) {
            const [, id, action = ''] = match;
            const workspace = this.workspaces.find((item) => item.id === id);

            if (!workspace) return [404, { statusCode: 404, message: 'Workspace not found' }];

            if (method === 'GET' && action === '') return [200, fullWorkspace(workspace)];

            if (method === 'DELETE' && action === '') {
                this.workspaces = this.workspaces.filter((item) => item.id !== id);
                return [200, { success: true }];
            }

            if (method === 'POST' && action === '/start') {
                workspace.status = 'RUNNING';
                return [201, { workspaceId: id, status: 'RUNNING', containers: [] }];
            }

            if (method === 'POST' && action === '/stop') {
                workspace.status = 'STOPPED';
                return [201, { workspaceId: id, status: 'STOPPED', containers: [] }];
            }
        }

        return [404, { statusCode: 404, message: `No mock for ${method} ${path}` }];
    }
}

function safeJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}
