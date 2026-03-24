import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Analysis } from './analysis';
import { Container } from 'inversify';
import { GitHubVariablesHelper } from './helpers/github-variables-helper';
import { Handler } from './api/handler';

describe('test Analysis', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(Container).toConstantValue(container);
    const mockGitHubVariablesHelper = {
      getLastCheck: vi.fn<() => string>().mockReturnValue(''),
      updateLastCheck: vi.fn<() => Promise<undefined>>().mockResolvedValue(undefined),
    } as unknown as GitHubVariablesHelper;
    container.bind(GitHubVariablesHelper).toConstantValue(mockGitHubVariablesHelper);
    container.bind(Analysis).toSelf().inSingletonScope();
  });

  test('handle accepted', async () => {
    expect.assertions(2);

    const handler1: Handler = {
      supports: vi.fn<(...args: unknown[]) => boolean>(),
      handle: vi.fn<(...args: unknown[]) => Promise<void>>(),
    };
    // First handler supports the call
    vi.mocked(handler1.supports).mockReturnValue(true);

    container.bind(Handler).toConstantValue(handler1);

    const eventName1 = 'eventName1';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const context1: any = {
      eventName: eventName1,
      payload: vi.fn<(...args: unknown[]) => unknown>(),
    };

    const analysis = container.get(Analysis);
    await analysis.analyze(context1);

    expect(handler1.supports).toHaveBeenCalledWith(eventName1);
    expect(handler1.handle).toHaveBeenCalledWith(eventName1, context1, context1.payload);
  });

  test('handle refused', async () => {
    expect.assertions(2);

    const handler1: Handler = {
      supports: vi.fn<(...args: unknown[]) => boolean>(),
      handle: vi.fn<(...args: unknown[]) => Promise<void>>(),
    };
    // Handler does not support the call
    vi.mocked(handler1.supports).mockReturnValue(false);

    container.bind(Handler).toConstantValue(handler1);

    const eventName1 = 'eventName1';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const context1: any = {
      eventName: eventName1,
      payload: vi.fn<(...args: unknown[]) => unknown>(),
    };

    const analysis = container.get(Analysis);
    await analysis.analyze(context1);

    expect(handler1.supports).toHaveBeenCalledWith(eventName1);
    expect(handler1.handle).toHaveBeenCalledTimes(0);
  });
});
