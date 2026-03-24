import { beforeEach, describe, expect, test } from 'vitest';
import { Container } from 'inversify';
import { OctokitBuilder } from './octokit-builder';

describe('test OctokitBuilder', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(OctokitBuilder).toSelf().inSingletonScope();
  });

  test('able to create', async () => {
    expect.assertions(1);

    const octokitBuilder = container.get(OctokitBuilder);

    const octokit = octokitBuilder.build('foo');

    expect(octokit).toBeDefined();
  });
});
