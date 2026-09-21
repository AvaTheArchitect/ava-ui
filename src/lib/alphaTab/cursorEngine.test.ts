/**
 * Maestro.ai — Cursor Engine Selector Tests
 * Version: V1.0.0
 * Date: September 21, 2026
 * Ticket: CURSOR3-RAF-AB-REPLACEMENT-001
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import * as ts from 'typescript';
import {
    CURSOR_ENGINE_GLOBAL,
    CURSOR_ENGINE_QUERY_PARAM,
    CURSOR_ENGINE_STORAGE_KEY,
    resetCursorEngineResolutionForTests,
    resolveCursorEngine,
} from './cursorEngine';

type CursorEngineModule = typeof import('./cursorEngine');

// jsdom's `window` global is non-configurable, so it cannot be hidden in-process. To
// exercise the real SSR path, transpile the module source and run it in a vm context
// that has no `window` at all. The returned context lets a test add a `window` later.
function loadCursorEngineWithoutWindow(): {
    api: CursorEngineModule;
    context: Record<string, unknown>;
} {
    const source = fs.readFileSync(path.join(__dirname, 'cursorEngine.ts'), 'utf8');
    const { outputText } = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
    });
    const moduleShim: { exports: Record<string, unknown> } = { exports: {} };
    const context: Record<string, unknown> = {
        module: moduleShim,
        exports: moduleShim.exports,
        URLSearchParams,
    };
    vm.runInContext(outputText, vm.createContext(context));
    return { api: moduleShim.exports as unknown as CursorEngineModule, context };
}

function setQuery(value: string): void {
    window.history.replaceState(
        {},
        '',
        `/?${CURSOR_ENGINE_QUERY_PARAM}=${encodeURIComponent(value)}`,
    );
}

function setStored(value: string): void {
    window.localStorage.setItem(CURSOR_ENGINE_STORAGE_KEY, value);
}

function readGlobal(): unknown {
    return (window as any)[CURSOR_ENGINE_GLOBAL];
}

describe('cursorEngine', () => {
    beforeEach(() => {
        resetCursorEngineResolutionForTests();
        window.localStorage.clear();
        window.history.replaceState({}, '', '/');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // 1
    it('returns cursor2 when there is no query param and no stored value', () => {
        expect(resolveCursorEngine('cursor2', true)).toBe('cursor2');
    });

    it('returns the caller-supplied default when nothing is set', () => {
        expect(resolveCursorEngine('cursor3', true)).toBe('cursor3');
    });

    // 2
    it('returns cursor3 for query cursorEngine=cursor3', () => {
        setQuery('cursor3');
        expect(resolveCursorEngine('cursor2', true)).toBe('cursor3');
    });

    // 3
    it('returns cursor3 for localStorage maestro_cursor_engine=cursor3', () => {
        setStored('cursor3');
        expect(resolveCursorEngine('cursor2', true)).toBe('cursor3');
    });

    // 4
    it('lets query cursor2 override localStorage cursor3', () => {
        setQuery('cursor2');
        setStored('cursor3');
        expect(resolveCursorEngine('cursor2', true)).toBe('cursor2');
    });

    it('lets query cursor3 override localStorage cursor2', () => {
        setQuery('cursor3');
        setStored('cursor2');
        expect(resolveCursorEngine('cursor2', true)).toBe('cursor3');
    });

    // 5
    describe('rejects anything but the exact values cursor2 / cursor3', () => {
        const INVALID_VALUES = ['1', 'true', 'CURSOR3', '', 'unknown', ' cursor3', 'cursor3 '];

        it.each(INVALID_VALUES)('query value %j leaves the default (cursor2)', value => {
            setQuery(value);
            expect(resolveCursorEngine('cursor2', true)).toBe('cursor2');
        });

        it.each(INVALID_VALUES)('stored value %j leaves the default (cursor2)', value => {
            setStored(value);
            expect(resolveCursorEngine('cursor2', true)).toBe('cursor2');
        });

    });

    // 5b — the URL is authoritative: an invalid query param fails safe to the default
    // and never falls through to localStorage.
    describe('an invalid query param fails safe to the default (ignores localStorage)', () => {
        const INVALID_VALUES = ['1', 'true', 'CURSOR3', 'CURSOR2', '', 'unknown', ' cursor3', 'cursor3 '];

        it.each(INVALID_VALUES)('query value %j beats a stored cursor3', value => {
            setQuery(value);
            setStored('cursor3');
            expect(resolveCursorEngine('cursor2', true)).toBe('cursor2');
        });

        it('treats a valueless ?cursorEngine as present-but-invalid', () => {
            window.history.replaceState({}, '', `/?${CURSOR_ENGINE_QUERY_PARAM}`);
            setStored('cursor3');
            expect(resolveCursorEngine('cursor2', true)).toBe('cursor2');
        });

        it('returns the caller-supplied default (not a hardcoded cursor2)', () => {
            setQuery('CURSOR2');
            setStored('cursor2');
            expect(resolveCursorEngine('cursor3', true)).toBe('cursor3');
        });

        it('does not treat unrelated query params as a cursorEngine param', () => {
            window.history.replaceState({}, '', '/?other=1&cursorengine=cursor2');
            setStored('cursor3');
            expect(resolveCursorEngine('cursor2', true)).toBe('cursor3');
        });

        it('lets a valid query param still win over a stored value', () => {
            setQuery('cursor2');
            setStored('cursor3');
            expect(resolveCursorEngine('cursor2', true)).toBe('cursor2');
        });

        it('applies a valid stored value only when the query param is absent', () => {
            setStored('cursor3');
            expect(resolveCursorEngine('cursor2', true)).toBe('cursor3');
        });
    });

    // 6
    describe('when localStorage throws', () => {
        it('returns the default when getItem throws', () => {
            jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('storage denied');
            });
            expect(resolveCursorEngine('cursor2', true)).toBe('cursor2');
        });

        it('returns the default when the localStorage property access throws', () => {
            jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
                throw new Error('storage denied');
            });
            expect(resolveCursorEngine('cursor2', true)).toBe('cursor2');
        });

        it('still honors a valid query param', () => {
            jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('storage denied');
            });
            setQuery('cursor3');
            expect(resolveCursorEngine('cursor2', true)).toBe('cursor3');
        });
    });

    // 7
    describe('without a window (SSR / prerender)', () => {
        it('runs in a context that really has no window', () => {
            const { context } = loadCursorEngineWithoutWindow();
            expect(vm.runInContext('typeof window', vm.createContext(context))).toBe('undefined');
        });

        it('returns the caller-supplied default without throwing', () => {
            const { api } = loadCursorEngineWithoutWindow();
            expect(api.resolveCursorEngine('cursor2', true)).toBe('cursor2');
            expect(api.resolveCursorEngine('cursor3', true)).toBe('cursor3');
        });

        it('does not cache, so a later client-side call still resolves', () => {
            const { api, context } = loadCursorEngineWithoutWindow();
            expect(api.resolveCursorEngine('cursor2', true)).toBe('cursor2');

            context.window = {
                location: { search: `?${CURSOR_ENGINE_QUERY_PARAM}=cursor3` },
                localStorage: { getItem: () => null },
            };
            expect(api.resolveCursorEngine('cursor2', true)).toBe('cursor3');
        });
    });

    // 7b — if the URL cannot be read we cannot know whether it carries an override, so
    // fail safe to the default instead of consulting stored state.
    describe('when the URL cannot be read', () => {
        it('returns the default even if localStorage holds cursor3', () => {
            const { api, context } = loadCursorEngineWithoutWindow();
            context.window = {
                get location(): never {
                    throw new Error('location denied');
                },
                localStorage: { getItem: () => 'cursor3' },
            };
            expect(api.resolveCursorEngine('cursor2', true)).toBe('cursor2');
        });
    });

    // 8
    describe('when overrideEnabled is false', () => {
        it('ignores query and localStorage and returns the default', () => {
            setQuery('cursor3');
            setStored('cursor3');
            expect(resolveCursorEngine('cursor2', false)).toBe('cursor2');
        });

        it('ignores an invalid query param as well', () => {
            setQuery('CURSOR3');
            setStored('cursor3');
            expect(resolveCursorEngine('cursor2', false)).toBe('cursor2');
        });

        it('returns a non-cursor2 default unchanged', () => {
            setQuery('cursor2');
            setStored('cursor2');
            expect(resolveCursorEngine('cursor3', false)).toBe('cursor3');
        });
    });

    // 9
    describe('caching', () => {
        it('returns the cached value on the second call, even if inputs change', () => {
            expect(resolveCursorEngine('cursor2', true)).toBe('cursor2');

            setQuery('cursor3');
            setStored('cursor3');
            expect(resolveCursorEngine('cursor2', true)).toBe('cursor2');
            expect(resolveCursorEngine('cursor3', true)).toBe('cursor2');
        });

        it('resolves again after the test-only reset', () => {
            expect(resolveCursorEngine('cursor2', true)).toBe('cursor2');

            resetCursorEngineResolutionForTests();
            setQuery('cursor3');
            expect(resolveCursorEngine('cursor2', true)).toBe('cursor3');
        });
    });

    // 10
    describe('window.__maestroCursorEngine', () => {
        it('is not set before resolution', () => {
            expect(readGlobal()).toBeUndefined();
        });

        it('is set to the default when nothing overrides it', () => {
            resolveCursorEngine('cursor2', true);
            expect(readGlobal()).toBe('cursor2');
        });

        it('is set to the resolved override', () => {
            setQuery('cursor3');
            resolveCursorEngine('cursor2', true);
            expect(readGlobal()).toBe('cursor3');
        });

        it('is set to the default when overrides are disabled', () => {
            setQuery('cursor3');
            resolveCursorEngine('cursor2', false);
            expect(readGlobal()).toBe('cursor2');
        });
    });
});
