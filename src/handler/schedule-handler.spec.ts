/* eslint-disable @typescript-eslint/no-explicit-any */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Container } from 'inversify';
import { Handler } from '/@/api/handler';
import { ScheduleHandler } from './schedule-handler';
import { ScheduleListener } from '/@/api/schedule-listener';

describe('test Schedule Handler', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(Container).toConstantValue(container);
    container.bind(Handler).to(ScheduleHandler).inSingletonScope();
  });

  test('acceptance (true)', async () => {
    expect.assertions(2);

    const scheduleHandler: Handler = container.get(Handler);

    expect(scheduleHandler.constructor.name).toStrictEqual(ScheduleHandler.name);

    const supports = scheduleHandler.supports('schedule');

    expect(supports).toBe(true);
  });

  test('acceptance (false)', async () => {
    expect.assertions(2);

    const handler: Handler = container.get(Handler);

    expect(handler.constructor.name).toStrictEqual(ScheduleHandler.name);

    const scheduleHandler: ScheduleHandler = handler as ScheduleHandler;
    const supports = scheduleHandler.supports('invalid-event');

    expect(supports).toBe(false);
  });

  test('no listener', async () => {
    expect.assertions(1);

    const handler: Handler = container.get(Handler);

    expect(handler.constructor.name).toStrictEqual(ScheduleHandler.name);

    const scheduleHandler: ScheduleHandler = handler as ScheduleHandler;
    const context = {
      repo: {
        owner: 'foo',
        name: 'bar',
      },
    } as any;
    await scheduleHandler.handle('schedule', context);
  });

  test('call one listener', async () => {
    expect.assertions(2);

    const listener: ScheduleListener = { execute: vi.fn<(...args: unknown[]) => Promise<void>>() };
    container.bind(ScheduleListener).toConstantValue(listener);
    const handler: Handler = container.get(Handler);

    expect(handler.constructor.name).toStrictEqual(ScheduleHandler.name);

    const scheduleHandler: ScheduleHandler = handler as ScheduleHandler;
    const context = {
      repo: {
        owner: 'foo',
        name: 'bar',
      },
    } as any;
    await scheduleHandler.handle('schedule', context);

    expect(listener.execute).toHaveBeenCalledWith(context.repo);
  });
});
