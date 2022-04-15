import 'reflect-metadata';

import * as core from '@actions/core';

import { Main } from '../src/main';

jest.mock('@actions/core');

describe('Test Main', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('test missing write token', async () => {
    const main = new Main();
    await main.start();
    expect(core.setFailed).toBeCalled();
    const call = (core.setFailed as jest.Mock).mock.calls[0];
    expect(call[0]).toMatch('No Write Token provided');
  });

  test('test missing read token', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (core as any).__setInput(Main.WRITE_TOKEN, 'foo');

    const main = new Main();
    await main.start();
    expect(core.setFailed).toBeCalled();
    const call = (core.setFailed as jest.Mock).mock.calls[0];
    expect(call[0]).toMatch('No Read Token provided');
  });

  test('test with token', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (core as any).__setInput(Main.WRITE_TOKEN, 'foo');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (core as any).__setInput(Main.READ_TOKEN, 'bar');

    jest.mock('../src/inversify-binding');
    const main = new Main();
    await main.start();
    expect(core.setFailed).toBeCalledTimes(0);
  });
});
