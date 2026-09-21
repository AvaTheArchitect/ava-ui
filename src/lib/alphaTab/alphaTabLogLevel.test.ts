/**
 * Maestro.ai — alphaTab Log Level Resolver Tests
 * Version: V1.0.0
 * Date: September 21, 2026
 * Ticket: ALPHATAB-DEBUG-LOGLEVEL-DEVTOOLS-PERF-001
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import * as ts from 'typescript';
import {
    ALPHATAB_LOG_LEVEL_GLOBAL,
    ALPHATAB_LOG_LEVEL_KEYS,
    ALPHATAB_LOG_LEVEL_QUERY_PARAM,
    ALPHATAB_LOG_LEVEL_STORAGE_KEY,
    alphaTabLogLevelKey,
    resetAlphaTabLogLevelResolutionForTests,
    resolveAlphaTabLogLevel,
    type AlphaTabLogLevelName,
} from './alphaTabLogLevel';

type AlphaTabLogLevelModule = typeof import('./alphaTabLogLevel');

// jsdom's `window` global is non-configurable, so it cannot be hidden in-process. To
// exercise the real SSR path, transpile the module source and run it in a vm context
// that has no `window` at all. The returned context lets a test add a `window` later.
function loadResolverWithoutWindow(): {
    api: AlphaTabLogLevelModule;
    context: Record<string, unknown>;
} {
    const source = fs.readFileSync(path.join(__dirname, 'alphaTabLogLevel.ts'), 'utf8');
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
    return { api: moduleShim.exports as unknown as AlphaTabLogLevelModule, context };
}

function setQuery(value: string): void {
    window.history.replaceState(
        {},
        '',
        `/?${ALPHATAB_LOG_LEVEL_QUERY_PARAM}=${encodeURIComponent(value)}`,
    );
}

function setStored(value: string): void {
    window.localStorage.setItem(ALPHATAB_LOG_LEVEL_STORAGE_KEY, value);
}

function readGlobal(): unknown {
    return (window as any)[ALPHATAB_LOG_LEVEL_GLOBAL];
}

const VALID_LEVELS: AlphaTabLogLevelName[] = ['debug', 'info', 'warn', 'error', 'none'];

// Anything that is not exactly one of the five names must be rejected.
const INVALID_VALUES = [
    '1',
    'true',
    'DEBUG',
    'WARN',
    'Warn',
    'warning',
    '',
    ' warn',
    'warn ',
    ' debug',
    'debug ',
    'unknown',
    'toString',
    '__proto__',
];

describe('alphaTabLogLevel', () => {
    beforeEach(() => {
        resetAlphaTabLogLevelResolutionForTests();
        window.localStorage.clear();
        window.history.replaceState({}, '', '/');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // 1
    it('returns the default (warn) when there is no query param and no stored value', () => {
        expect(resolveAlphaTabLogLevel('warn', true)).toBe('warn');
    });

    it('returns a non-warn caller-supplied default when nothing is set', () => {
        expect(resolveAlphaTabLogLevel('error', true)).toBe('error');
    });

    // 2–6
    describe('valid query values', () => {
        it.each(VALID_LEVELS)('query %s returns %s', level => {
            setQuery(level);
            expect(resolveAlphaTabLogLevel('warn', true)).toBe(level);
        });
    });

    // 7
    it('returns debug for localStorage debug when no query exists', () => {
        setStored('debug');
        expect(resolveAlphaTabLogLevel('warn', true)).toBe('debug');
    });

    describe('valid stored values', () => {
        it.each(VALID_LEVELS)('stored %s returns %s when there is no query', level => {
            setStored(level);
            expect(resolveAlphaTabLogLevel('warn', true)).toBe(level);
        });
    });

    // 8
    it('lets query warn override localStorage debug', () => {
        setQuery('warn');
        setStored('debug');
        expect(resolveAlphaTabLogLevel('warn', true)).toBe('warn');
    });

    it('lets query debug override localStorage none', () => {
        setQuery('debug');
        setStored('none');
        expect(resolveAlphaTabLogLevel('warn', true)).toBe('debug');
    });

    // 9 — the URL is authoritative: an invalid query param fails safe to the default and
    // never falls through to localStorage.
    describe('an invalid query param fails safe to the default (ignores localStorage)', () => {
        it.each(INVALID_VALUES)('query value %j beats a stored debug', value => {
            setQuery(value);
            setStored('debug');
            expect(resolveAlphaTabLogLevel('warn', true)).toBe('warn');
        });

        it('treats a valueless ?alphaTabLogLevel as present-but-invalid', () => {
            window.history.replaceState({}, '', `/?${ALPHATAB_LOG_LEVEL_QUERY_PARAM}`);
            setStored('debug');
            expect(resolveAlphaTabLogLevel('warn', true)).toBe('warn');
        });

        it('returns the caller-supplied default (not a hardcoded warn)', () => {
            setQuery('DEBUG');
            setStored('debug');
            expect(resolveAlphaTabLogLevel('error', true)).toBe('error');
        });

        it('does not treat unrelated or differently-cased params as alphaTabLogLevel', () => {
            window.history.replaceState({}, '', '/?other=1&alphatabloglevel=info');
            setStored('debug');
            expect(resolveAlphaTabLogLevel('warn', true)).toBe('debug');
        });

        it('applies a valid stored value only when the query param is absent', () => {
            setStored('info');
            expect(resolveAlphaTabLogLevel('warn', true)).toBe('info');
        });
    });

    // 10
    describe('an invalid stored value is ignored', () => {
        it.each(INVALID_VALUES)('stored value %j returns the default (warn)', value => {
            setStored(value);
            expect(resolveAlphaTabLogLevel('warn', true)).toBe('warn');
        });
    });

    // 11
    describe('when localStorage throws', () => {
        it('returns the default when getItem throws', () => {
            jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('storage denied');
            });
            expect(resolveAlphaTabLogLevel('warn', true)).toBe('warn');
        });

        it('returns the default when the localStorage property access throws', () => {
            jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
                throw new Error('storage denied');
            });
            expect(resolveAlphaTabLogLevel('warn', true)).toBe('warn');
        });

        it('still honors a valid query param', () => {
            jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('storage denied');
            });
            setQuery('debug');
            expect(resolveAlphaTabLogLevel('warn', true)).toBe('debug');
        });
    });

    // 12 — if the URL cannot be read we cannot know whether it carries an override, so fail
    // safe to the default instead of consulting stored state.
    describe('when the URL cannot be read', () => {
        it('returns the default even if localStorage holds debug', () => {
            const { api, context } = loadResolverWithoutWindow();
            context.window = {
                get location(): never {
                    throw new Error('location denied');
                },
                localStorage: { getItem: () => 'debug' },
            };
            expect(api.resolveAlphaTabLogLevel('warn', true)).toBe('warn');
        });
    });

    // 13
    describe('without a window (SSR / prerender)', () => {
        it('runs in a context that really has no window', () => {
            const { context } = loadResolverWithoutWindow();
            expect(vm.runInContext('typeof window', vm.createContext(context))).toBe('undefined');
        });

        it('returns the caller-supplied default without throwing', () => {
            const { api } = loadResolverWithoutWindow();
            expect(api.resolveAlphaTabLogLevel('warn', true)).toBe('warn');
            expect(api.resolveAlphaTabLogLevel('error', true)).toBe('error');
        });

        it('does not cache, so a later client-side call still resolves', () => {
            const { api, context } = loadResolverWithoutWindow();
            expect(api.resolveAlphaTabLogLevel('warn', true)).toBe('warn');

            context.window = {
                location: { search: `?${ALPHATAB_LOG_LEVEL_QUERY_PARAM}=debug` },
                localStorage: { getItem: () => null },
            };
            expect(api.resolveAlphaTabLogLevel('warn', true)).toBe('debug');
        });
    });

    // 14
    describe('when overrideEnabled is false', () => {
        it('ignores query and localStorage and returns the default', () => {
            setQuery('debug');
            setStored('debug');
            expect(resolveAlphaTabLogLevel('warn', false)).toBe('warn');
        });

        it('ignores an invalid query param as well', () => {
            setQuery('DEBUG');
            setStored('debug');
            expect(resolveAlphaTabLogLevel('warn', false)).toBe('warn');
        });

        it('returns a non-warn default unchanged', () => {
            setQuery('warn');
            setStored('warn');
            expect(resolveAlphaTabLogLevel('info', false)).toBe('info');
        });
    });

    // 15
    describe('caching', () => {
        it('returns the cached value on the second call, even if inputs change', () => {
            expect(resolveAlphaTabLogLevel('warn', true)).toBe('warn');

            setQuery('debug');
            setStored('debug');
            expect(resolveAlphaTabLogLevel('warn', true)).toBe('warn');
            expect(resolveAlphaTabLogLevel('error', true)).toBe('warn');
        });

        it('resolves again after the test-only reset', () => {
            expect(resolveAlphaTabLogLevel('warn', true)).toBe('warn');

            resetAlphaTabLogLevelResolutionForTests();
            setQuery('debug');
            expect(resolveAlphaTabLogLevel('warn', true)).toBe('debug');
        });
    });

    // window.__maestroAlphaTabLogLevel
    describe('window.__maestroAlphaTabLogLevel', () => {
        it('is not set before resolution', () => {
            expect(readGlobal()).toBeUndefined();
        });

        it('is set to the default when nothing overrides it', () => {
            resolveAlphaTabLogLevel('warn', true);
            expect(readGlobal()).toBe('warn');
        });

        it('is set to the resolved override', () => {
            setQuery('debug');
            resolveAlphaTabLogLevel('warn', true);
            expect(readGlobal()).toBe('debug');
        });

        it('is set to the default when overrides are disabled', () => {
            setQuery('debug');
            resolveAlphaTabLogLevel('warn', false);
            expect(readGlobal()).toBe('warn');
        });

        it('is set to the default when the query param is invalid', () => {
            setQuery('DEBUG');
            setStored('debug');
            resolveAlphaTabLogLevel('warn', true);
            expect(readGlobal()).toBe('warn');
        });
    });

    // 16
    describe('name → alphaTab LogLevel enum member key', () => {
        it.each([
            ['debug', 'Debug'],
            ['info', 'Info'],
            ['warn', 'Warning'],
            ['error', 'Error'],
            ['none', 'None'],
        ] as const)('%s → %s', (name, key) => {
            expect(alphaTabLogLevelKey(name)).toBe(key);
        });

        it('covers exactly the five accepted names', () => {
            expect(Object.keys(ALPHATAB_LOG_LEVEL_KEYS).sort()).toEqual([...VALID_LEVELS].sort());
        });

        // Drift guard: alphaTab stays the source of truth for the numeric values, so every key
        // this module emits must be a real member of the installed alphaTab LogLevel enum.
        it('emits only member names that exist in the installed alphaTab LogLevel enum', () => {
            const dts = fs.readFileSync(
                path.resolve(
                    __dirname,
                    '../../../node_modules/@coderline/alphatab/dist/alphaTab.d.ts',
                ),
                'utf8',
            );
            const enumBlock = /export declare enum LogLevel \{([\s\S]*?)\n\}/.exec(dts);
            expect(enumBlock).not.toBeNull();
            const members = Array.from(
                (enumBlock as RegExpExecArray)[1].matchAll(/^\s+(\w+) = \d+,?$/gm),
                m => m[1],
            );
            expect(members.length).toBeGreaterThan(0);
            for (const name of VALID_LEVELS) {
                expect(members).toContain(alphaTabLogLevelKey(name));
            }
        });
    });
});
