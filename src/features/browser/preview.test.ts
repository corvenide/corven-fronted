import { describe, expect, it } from 'vitest';

import { parseWorkspacePortUrl } from './preview';

describe('parseWorkspacePortUrl', () => {
    it('reads the port and path of localhost URLs', () => {
        expect(parseWorkspacePortUrl('http://localhost:5173')).toEqual({ port: 5173, path: '/' });
        expect(parseWorkspacePortUrl('localhost:3000/app?x=1#top')).toEqual({ port: 3000, path: '/app?x=1#top' });
        expect(parseWorkspacePortUrl('http://127.0.0.1:8080/')).toEqual({ port: 8080, path: '/' });
    });

    it('ignores everything else', () => {
        expect(parseWorkspacePortUrl('https://example.com')).toBeNull();
        expect(parseWorkspacePortUrl('workspace://frontend/index.html')).toBeNull();
        expect(parseWorkspacePortUrl('http://localhost:99999')).toBeNull();
        expect(parseWorkspacePortUrl('http://localhost')).toBeNull();
    });
});
