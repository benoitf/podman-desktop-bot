/* eslint-disable @typescript-eslint/no-explicit-any */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { IssueInfo } from '/@/info/issue-info';
import { IssueInfoBuilder } from '/@/info/issue-info';

import { Container } from 'inversify';
import { IssuesHelper } from './issue-helper';

describe('test Helper IssueHelper', () => {
  let container: Container;
  let issueInfoBuilder: IssueInfoBuilder;

  beforeEach(() => {
    container = new Container();
    issueInfoBuilder = {} as any;
    container.bind(IssueInfoBuilder).toConstantValue(issueInfoBuilder);

    container.bind('string').toConstantValue('fooToken').whenNamed('GRAPHQL_READ_TOKEN');
    container.bind(IssuesHelper).toSelf().inSingletonScope();
  });

  test('isFirstTime true', async () => {
    expect.assertions(2);

    const octokit = { rest: { issues: { listForRepo: vi.fn<(...args: unknown[]) => unknown>() } } };

    container.bind('Octokit').toConstantValue(octokit).whenNamed('READ_TOKEN');
    const issueHelper = container.get(IssuesHelper);

    const issueInfo: IssueInfo = new IssueInfoBuilder()
      .build()
      .withNumber(123)
      .withAuthor('author')
      .withOwner('my-owner')
      .withRepo('repository')
      .withNumber(1234);

    // Empty response
    const response: any = { data: [] };

    vi.mocked(octokit.rest.issues.listForRepo).mockReturnValue(response);

    const isFirstTime: boolean = await issueHelper.isFirstTime(issueInfo);

    expect(octokit.rest.issues.listForRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        creator: issueInfo.author,
        state: 'all',
        repo: issueInfo.repo,
        owner: issueInfo.owner,
      }),
    );

    expect(isFirstTime).toBe(true);
  });

  test('isFirstTime false', async () => {
    expect.assertions(2);

    const octokit = { rest: { issues: { listForRepo: vi.fn<(...args: unknown[]) => unknown>() } } };

    container.bind('Octokit').toConstantValue(octokit).whenNamed('READ_TOKEN');
    const issueHelper = container.get(IssuesHelper);

    const issueInfo: IssueInfo = new IssueInfoBuilder()
      .build()
      .withNumber(123)
      .withAuthor('author')
      .withOwner('my-owner')
      .withRepo('repository')
      .withNumber(1234);

    // Got some results in the response so firstTime = false
    const response: any = { data: ['something', 'another-thing'] };

    vi.mocked(octokit.rest.issues.listForRepo).mockReturnValue(response);

    const isFirstTime: boolean = await issueHelper.isFirstTime(issueInfo);

    expect(octokit.rest.issues.listForRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        creator: issueInfo.author,
        state: 'all',
        repo: issueInfo.repo,
        owner: issueInfo.owner,
      }),
    );

    expect(isFirstTime).toBe(false);
  });

  test('getIssue undefined invalid string', async () => {
    expect.assertions(1);

    const octokit: any = {};
    container.bind('Octokit').toConstantValue(octokit).whenNamed('READ_TOKEN');
    const issueHelper = container.get(IssuesHelper);

    const result: IssueInfo | undefined = await issueHelper.getIssue('issueInfo');

    expect(result).toBeUndefined();
  });

  test('getIssue valid', async () => {
    expect.assertions(10);

    issueInfoBuilder = new IssueInfoBuilder();
    vi.spyOn(issueInfoBuilder, 'build');

    container.rebind(IssueInfoBuilder).toConstantValue(issueInfoBuilder);

    const octokit = { rest: { issues: { get: vi.fn<(...args: unknown[]) => unknown>() } } };

    container.bind('Octokit').toConstantValue(octokit).whenNamed('READ_TOKEN');
    const issueHelper = container.get(IssuesHelper);

    const json = JSON.parse(
      await fs.readFile(path.join(__dirname, '..', '_data', 'issue-helper', 'get-issue.json'), 'utf8'),
    );

    // Empty response
    const response: any = { data: json };

    vi.mocked(octokit.rest.issues.get).mockReturnValue(response);

    const issueInfo: IssueInfo | undefined = await issueHelper.getIssue('/repos/benoitf/demo-gh-event/issues/24');

    expect(issueInfo).toBeDefined();

    expect(octokit.rest.issues.get).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'benoitf', repo: 'demo-gh-event', issue_number: 24 }),
    );

    expect(issueInfoBuilder.build).toHaveBeenCalledWith();
    expect(issueInfo?.body).toMatch('### What does this PR do');
    expect(issueInfo?.author).toBe('benoitf');
    expect(issueInfo?.htmlLink).toBe('https://github.com/benoitf/demo-gh-event/pull/24');
    expect(issueInfo?.number).toBe(24);
    expect(issueInfo?.owner).toBe('benoitf');
    expect(issueInfo?.repo).toBe('demo-gh-event');
    expect(issueInfo?.labels).toStrictEqual(['kind/bar', 'kind/baz', 'kind/dummy', 'kind/foo']);
  });
});
