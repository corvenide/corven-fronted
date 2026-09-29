export function normalizeWorkspaceProjectPath(path: unknown): string {
    if (path && typeof path === 'object') {
        const record = path as Record<string, unknown>;
        if (typeof record.path === 'string') {
            return normalizeWorkspaceProjectPath(record.path);
        }
        if (typeof record.name === 'string') {
            return normalizeWorkspaceProjectPath(record.name);
        }
        return '.';
    }

    if (typeof path !== 'string') return '.';

    let value = path.trim().replace(/\\/g, '/');
    if (!value) return '.';

    value = value.replace(/^\/workspace\/?/i, '');
    value = value.replace(/^\.\//, '');
    value = value.replace(/^\/+/, '');
    value = value.replace(/\/+$/, '');

    if (!value || value === '.') return '.';
    return value;
}

export function parseProjectsList(projects: unknown): string[] {
    if (!Array.isArray(projects)) return [];

    const seen = new Set<string>();
    const result: string[] = [];

    for (const project of projects) {
        const normalized = normalizeWorkspaceProjectPath(project);
        if (normalized === '.' || seen.has(normalized)) continue;
        seen.add(normalized);
        result.push(normalized);
    }

    return result;
}

export function cwdForCommand(projectPath: string): string | undefined {
    const normalized = normalizeWorkspaceProjectPath(projectPath);
    return normalized === '.' ? undefined : normalized;
}

export function getRootDirectories(
    entries: { path: string; type: string }[] | undefined,
): { name: string; path: string; count: number }[] {
    if (!entries || entries.length === 0) return [];

    const dirSet = new Set<string>();
    const result: { name: string; path: string; count: number }[] = [];

    entries.forEach((entry) => {
        if (entry.type !== 'directory') return;

        const rootDir = normalizeWorkspaceProjectPath(entry.path.split('/')[0]);
        if (rootDir === '.' || dirSet.has(rootDir)) return;

        dirSet.add(rootDir);
        const itemCount = entries.filter(
            (e) => e.path === rootDir || e.path.startsWith(`${rootDir}/`),
        ).length;

        result.push({
            name: rootDir,
            path: rootDir,
            count: itemCount,
        });
    });

    return result.slice(0, 10);
}

export function mergeProjectOptions(
    detectedProjects: string[],
    directories: { path: string }[],
): string[] {
    const seen = new Set<string>();
    const result: string[] = ['.'];

    const add = (path: string) => {
        const normalized = normalizeWorkspaceProjectPath(path);
        if (seen.has(normalized) || normalized === '.') return;
        seen.add(normalized);
        result.push(normalized);
    };

    directories.forEach((directory) => add(directory.path));
    detectedProjects.forEach(add);

    return result;
}
