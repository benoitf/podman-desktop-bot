/* eslint-disable @typescript-eslint/no-explicit-any */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Container } from 'inversify';
import { PullRequestInfoLinkedIssuesExtractor } from './pull-request-info-linked-issues-extractor';

describe('test PullRequestInfoLinkedIssuesExtractor', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(PullRequestInfoLinkedIssuesExtractor).toSelf().inSingletonScope();
  });

  test('extract with several links in full format (http://github.....)', async () => {
    expect.assertions(2);

    const pullRequestInfoLinkedIssuesExtractor = container.get(PullRequestInfoLinkedIssuesExtractor);

    expect(pullRequestInfoLinkedIssuesExtractor).toBeDefined();

    const txt: string = await fs.readFile(
      path.join(__dirname, '..', '_data', 'pull-request-info', 'multiple-links.md'),
      'utf8',
    );

    const pullRequestInfo = vi.fn<(...args: unknown[]) => unknown>() as any;
    pullRequestInfo.body = txt;
    const issues = pullRequestInfoLinkedIssuesExtractor.extract(pullRequestInfo);

    expect(issues).toStrictEqual([
      'https://api.github.com/repos/eclipse/che/issues/16045',
      'https://api.github.com/repos/eclipse/che/issues/16046',
    ]);
  });

  test('extract with several links in short format #5', async () => {
    expect.assertions(2);

    const pullRequestInfoLinkedIssuesExtractor = container.get(PullRequestInfoLinkedIssuesExtractor);

    expect(pullRequestInfoLinkedIssuesExtractor).toBeDefined();

    const txt: string = await fs.readFile(
      path.join(__dirname, '..', '_data', 'pull-request-info', 'multiple-links-short-format.md'),
      'utf8',
    );

    const pullRequestInfo = vi.fn<(...args: unknown[]) => unknown>() as any;
    pullRequestInfo.body = txt;
    pullRequestInfo.owner = 'eclipse';
    pullRequestInfo.repo = 'che';
    const issues = pullRequestInfoLinkedIssuesExtractor.extract(pullRequestInfo);

    expect(issues).toStrictEqual([
      'https://api.github.com/repos/eclipse/che/issues/15',
      'https://api.github.com/repos/eclipse/che/issues/16',
    ]);
  });

  test('empty text', async () => {
    expect.assertions(2);

    const pullRequestInfoLinkedIssuesExtractor = container.get(PullRequestInfoLinkedIssuesExtractor);

    expect(pullRequestInfoLinkedIssuesExtractor).toBeDefined();

    const pullRequestInfo = vi.fn<(...args: unknown[]) => unknown>() as any;
    pullRequestInfo.body = 'dummy content';
    const issues = pullRequestInfoLinkedIssuesExtractor.extract(pullRequestInfo);

    expect(issues).toStrictEqual([]);
  });
});
