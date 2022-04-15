/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import { Container } from 'inversify';
import { Handler } from '../../src/api/handler';
import { PushHandler } from '../../src/handler/push-handler';
import { PushListener } from '../../src/api/push-listener';
import { bindMultiInjectProvider } from '../../src/api/multi-inject-provider';

describe('Test Push Handler', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    bindMultiInjectProvider(container, Handler);
    bindMultiInjectProvider(container, PushListener);
    container.bind(Handler).to(PushHandler).inSingletonScope();
  });

  test('test acceptance (true)', async () => {
    const pushHandler: Handler = container.get(Handler);
    expect(pushHandler.constructor.name).toEqual(PushHandler.name);
    const supports = pushHandler.supports('push');
    expect(supports).toBeTruthy();
  });

  test('test acceptance (false)', async () => {
    const handler: Handler = container.get(Handler);
    expect(handler.constructor.name).toEqual(PushHandler.name);
    const scheduleHandler: PushHandler = handler as PushHandler;
    const supports = scheduleHandler.supports('invalid-event');
    expect(supports).toBeFalsy();
  });

  test('test no listener', async () => {
    const handler: Handler = container.get(Handler);
    expect(handler.constructor.name).toEqual(PushHandler.name);
    const scheduleHandler: PushHandler = handler as PushHandler;
    const context = {
      repo: {
        owner: 'foo',
        name: 'bar',
      },
    } as any;
    scheduleHandler.handle('push', context);
    expect(scheduleHandler['pushListeners'].getAll()).toEqual([]);
  });

  test('test call one listener', async () => {
    const listener: PushListener = { execute: jest.fn() };
    container.bind(PushListener).toConstantValue(listener);
    const handler: Handler = container.get(Handler);
    expect(handler.constructor.name).toEqual(PushHandler.name);
    const scheduleHandler: PushHandler = handler as PushHandler;
    const context = {
      repo: {
        owner: 'foo',
        name: 'bar',
      },
    } as any;
    scheduleHandler.handle('schedule', context);
    expect(listener.execute).toBeCalled();
    const call = (listener.execute as jest.Mock).mock.calls[0];
    expect(call).toBeDefined();
    expect(call[0]).toEqual(context.repo);
  });
});
