import { describe, expect, it } from 'vitest';

import { parseTestOutput } from './parseTestOutput';

const CARGO_OUTPUT = `
running 3 tests
test tests::test_hello ... ok
test tests::test_fails ... FAILED
test tests::test_slow ... ignored

failures:

---- tests::test_fails stdout ----
thread 'tests::test_fails' panicked at 'assertion failed'

test result: FAILED. 1 passed; 1 failed; 1 ignored; 0 measured; 2 filtered out; finished in 0.52s
`;

describe('parseTestOutput', () => {
    it('reads each test case and its result', () => {
        const { tests } = parseTestOutput(CARGO_OUTPUT);

        expect(tests).toEqual([
            { id: 'tests::test_hello-0', name: 'tests::test_hello', status: 'passed' },
            { id: 'tests::test_fails-1', name: 'tests::test_fails', status: 'failed' },
            { id: 'tests::test_slow-2', name: 'tests::test_slow', status: 'ignored' },
        ]);
    });

    it('reads the summary line', () => {
        const { summary } = parseTestOutput(CARGO_OUTPUT);

        expect(summary).toEqual({
            passed: 1,
            failed: 1,
            ignored: 1,
            filteredOut: 2,
            total: 3,
            durationMs: 520,
        });
    });

    it('adds up the summaries of several test binaries', () => {
        const output = [
            'test a ... ok',
            'test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.10s',
            'test b ... ok',
            'test c ... ok',
            'test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.25s',
        ].join('\n');

        const { tests, summary } = parseTestOutput(output);

        expect(tests).toHaveLength(3);
        expect(summary.passed).toBe(3);
        expect(summary.total).toBe(3);
        expect(summary.durationMs).toBeCloseTo(350);
    });

    it('leaves the duration unset when the output has none', () => {
        const { summary } = parseTestOutput(
            'test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out;',
        );

        expect(summary.passed).toBe(1);
        expect(summary.durationMs).toBeUndefined();
    });

    it('returns zeros for output without tests', () => {
        expect(parseTestOutput('Compiling hello-world v0.1.0')).toEqual({
            tests: [],
            summary: { passed: 0, failed: 0, ignored: 0, filteredOut: 0, total: 0, durationMs: undefined },
        });
    });

    it('gives the same result when called twice (no leftover regex state)', () => {
        expect(parseTestOutput(CARGO_OUTPUT)).toEqual(parseTestOutput(CARGO_OUTPUT));
    });
});
