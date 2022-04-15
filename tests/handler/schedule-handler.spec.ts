/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import { Container } from 'inversify';
import { Handler } from '../../src/api/handler';
import { ScheduleHandler } from '../../src/handler/schedule-handler';
import { ScheduleListener } from '../../src/api/schedule-listener';
import { bindMultiInjectProvider } from '../../src/api/multi-inject-provider';

describe('Test Schedule Handler', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    bindMultiInjectProvider(container, Handler);
    bindMultiInjectProvider(container, ScheduleListener);
    container.bind(Handler).to(ScheduleHandler).inSingletonScope();
  });

  test('test acceptance (true)', async () => {
    const scheduleHandler: Handler = container.get(Handler);
    expect(scheduleHandler.constructor.name).toEqual(ScheduleHandler.name);
    const supports = scheduleHandler.supports('schedule');
    expect(supports).toBeTruthy();
  });

  test('test acceptance (false)', async () => {
    const handler: Handler = container.get(Handler);
    expect(handler.constructor.name).toEqual(ScheduleHandler.name);
    const scheduleHandler: ScheduleHandler = handler as ScheduleHandler;
    const supports = scheduleHandler.supports('invalid-event');
    expect(supports).toBeFalsy();
  });

  test('test no listener', async () => {
    const handler: Handler = container.get(Handler);
    expect(handler.constructor.name).toEqual(ScheduleHandler.name);
    const scheduleHandler: ScheduleHandler = handler as ScheduleHandler;
    const context = {
      repo: {
        owner: 'foo',
        name: 'bar',
      },
    } as any;
    scheduleHandler.handle('schedule', context);
    expect(scheduleHandler['scheduleListeners'].getAll()).toEqual([]);
  });

  test('test call one listener', async () => {
    const listener: ScheduleListener = { execute: jest.fn() };
    container.bind(ScheduleListener).toConstantValue(listener);
    const handler: Handler = container.get(Handler);
    expect(handler.constructor.name).toEqual(ScheduleHandler.name);
    const scheduleHandler: ScheduleHandler = handler as ScheduleHandler;
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
