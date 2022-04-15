import 'reflect-metadata';

import { Container } from 'inversify';
import { OctokitBuilder } from '../../src/github/octokit-builder';

describe('Test OctokitBuilder', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(OctokitBuilder).toSelf().inSingletonScope();
  });

  test('test able to create', async () => {
    const octokitBuilder = container.get(OctokitBuilder);

    const octokit = octokitBuilder.build('foo');
    expect(octokit).toBeDefined();
  });
});
