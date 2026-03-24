/* eslint-disable @typescript-eslint/no-explicit-any */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Container } from 'inversify';
import { Handler } from '/@/api/handler';
import { PushHandler } from './push-handler';
import { PushListener } from '/@/api/push-listener';

describe('test Push Handler', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(Container).toConstantValue(container);
    container.bind(Handler).to(PushHandler).inSingletonScope();
  });

  test('acceptance (true)', async () => {
    expect.assertions(2);

    const pushHandler: Handler = container.get(Handler);

    expect(pushHandler.constructor.name).toStrictEqual(PushHandler.name);

    const supports = pushHandler.supports('push');

    expect(supports).toBe(true);
  });

  test('acceptance (false)', async () => {
    expect.assertions(2);

    const handler: Handler = container.get(Handler);

    expect(handler.constructor.name).toStrictEqual(PushHandler.name);

    const scheduleHandler: PushHandler = handler as PushHandler;
    const supports = scheduleHandler.supports('invalid-event');

    expect(supports).toBe(false);
  });

  test('no listener', async () => {
    expect.assertions(1);

    const handler: Handler = container.get(Handler);

    expect(handler.constructor.name).toStrictEqual(PushHandler.name);

    const pushHandler: PushHandler = handler as PushHandler;
    const context = {
      repo: {
        owner: 'foo',
        name: 'bar',
      },
    } as any;
    await pushHandler.handle('push', context);
  });

  test('call one listener', async () => {
    expect.assertions(2);

    const listener: PushListener = { execute: vi.fn<(...args: unknown[]) => Promise<void>>() };
    container.bind(PushListener).toConstantValue(listener);
    const handler: Handler = container.get(Handler);

    expect(handler.constructor.name).toStrictEqual(PushHandler.name);

    const pushHandler: PushHandler = handler as PushHandler;
    const context = {
      repo: {
        owner: 'foo',
        name: 'bar',
      },
    } as any;
    await pushHandler.handle('push', context);

    expect(listener.execute).toHaveBeenCalledWith(context.repo);
  });
});
