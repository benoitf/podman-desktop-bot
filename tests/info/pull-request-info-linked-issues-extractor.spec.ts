/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import * as fs from 'fs-extra';
import * as path from 'path';

import { Container } from 'inversify';
import { PullRequestInfoLinkedIssuesExtractor } from '../../src/info/pull-request-info-linked-issues-extractor';

describe('Test PullRequestInfoLinkedIssuesExtractor', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(PullRequestInfoLinkedIssuesExtractor).toSelf().inSingletonScope();
  });

  test('test extract with several links in full format (http://github.....)', async () => {
    const pullRequestInfoLinkedIssuesExtractor = container.get(PullRequestInfoLinkedIssuesExtractor);
    expect(pullRequestInfoLinkedIssuesExtractor).toBeDefined();

    const txt: string = await fs.readFile(path.join(__dirname, '..', '_data', 'pull-request-info', 'multiple-links.md'), 'utf8');

    const pullRequestInfo = jest.fn() as any;
    pullRequestInfo.body = txt;
    const issues = pullRequestInfoLinkedIssuesExtractor.extract(pullRequestInfo);

    expect(issues).toEqual([
      'https://api.github.com/repos/eclipse/che/issues/16045',
      'https://api.github.com/repos/eclipse/che/issues/16046',
    ]);
  });

  test('test extract with several links in short format #5', async () => {
    const pullRequestInfoLinkedIssuesExtractor = container.get(PullRequestInfoLinkedIssuesExtractor);
    expect(pullRequestInfoLinkedIssuesExtractor).toBeDefined();

    const txt: string = await fs.readFile(
      path.join(__dirname, '..', '_data', 'pull-request-info', 'multiple-links-short-format.md'),
      'utf8'
    );

    const pullRequestInfo = jest.fn() as any;
    pullRequestInfo.body = txt;
    pullRequestInfo.owner = 'eclipse';
    pullRequestInfo.repo = 'che';
    const issues = pullRequestInfoLinkedIssuesExtractor.extract(pullRequestInfo);

    expect(issues).toEqual(['https://api.github.com/repos/eclipse/che/issues/15', 'https://api.github.com/repos/eclipse/che/issues/16']);
  });

  test('test empty text', async () => {
    const pullRequestInfoLinkedIssuesExtractor = container.get(PullRequestInfoLinkedIssuesExtractor);
    expect(pullRequestInfoLinkedIssuesExtractor).toBeDefined();

    const pullRequestInfo = jest.fn() as any;
    pullRequestInfo.body = 'dummy content';
    const issues = pullRequestInfoLinkedIssuesExtractor.extract(pullRequestInfo);

    expect(issues).toEqual([]);
  });
});
