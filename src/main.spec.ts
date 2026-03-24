import { afterEach, describe, expect, test, vi } from 'vitest';
import * as core from '@actions/core';

import { Main } from './main';

// @ts-expect-error partial mock factory
vi.mock(import('@actions/core'), () => {
  const inputs = new Map<string, string>();
  return {
    getInput: (name: string): string => inputs.get(name) ?? '',
    setFailed: vi.fn<(message: string) => void>(),
    info: vi.fn<(message: string) => void>(),
    warning: vi.fn<(message: string) => void>(),
    __setInput: (name: string, value: string): void => {
      inputs.set(name, value);
    },
  };
});

// @ts-expect-error partial mock factory
vi.mock(import('./inversify-binding'), () => ({
  InversifyBinding: class {
    async initBindings(): Promise<{ getAsync: ReturnType<typeof vi.fn> }> {
      return {
        getAsync: vi
          .fn<() => Promise<{ analyze: ReturnType<typeof vi.fn> }>>()
          .mockResolvedValue({ analyze: vi.fn<() => void>() }),
      };
    }
  },
}));

describe('test Main', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('missing write token', async () => {
    expect.assertions(1);

    const main = new Main();
    await main.start();

    expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('No Write Token provided'));
  });

  test('missing read token', async () => {
    expect.assertions(1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (core as any).__setInput(Main.WRITE_TOKEN, 'foo');

    const main = new Main();
    await main.start();

    expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('No Read Token provided'));
  });

  test('with token', async () => {
    expect.assertions(1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (core as any).__setInput(Main.WRITE_TOKEN, 'foo');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (core as any).__setInput(Main.READ_TOKEN, 'bar');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (core as any).__setInput(Main.SLACK_URL, 'https://slack');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (core as any).__setInput(Main.SLACK_TOKEN, 'slack-token');

    const main = new Main();
    await main.start();

    expect(core.setFailed).toHaveBeenCalledTimes(0);
  });
});
