import { afterEach, describe, expect, test, vi } from 'vitest';
import * as core from '@actions/core';

vi.mock(import('@actions/core'), () => {
  const inputs = new Map<string, string>();
  return {
    getInput: (name: string): string => inputs.get(name) ?? '',
    setFailed: vi.fn<(...args: unknown[]) => void>(),
    info: vi.fn<(...args: unknown[]) => void>(),
    warning: vi.fn<(...args: unknown[]) => void>(),
    __setInput: (name: string, value: string): void => {
      inputs.set(name, value);
    },
  };
});

describe('test Entrypoint', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  test('entrypoint', async () => {
    expect.assertions(1);

    await import('./entrypoint');

    expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('No Write Token provided'));
  });
});
