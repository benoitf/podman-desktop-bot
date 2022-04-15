import 'reflect-metadata';

import * as core from '@actions/core';

jest.mock('@actions/core');

describe('Test Entrypoint', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
  });

  test('test entrypoint', async () => {
    await require('../src/entrypoint');

    expect(core.setFailed).toBeCalled();
    const call = (core.setFailed as jest.Mock).mock.calls[0];
    expect(call[0]).toMatch('No Write Token provided');
  });
});
