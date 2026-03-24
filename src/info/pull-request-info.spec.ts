/* eslint-disable @typescript-eslint/no-explicit-any */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Container } from 'inversify';
import { IssueInfoBuilder } from './issue-info';
import { IssuesHelper } from '/@/helpers/issue-helper';
import { PullRequestInfoBuilder } from './pull-request-info';
import { PullRequestInfoLinkedIssuesExtractor } from './pull-request-info-linked-issues-extractor';

describe('test PullRequestInfo', () => {
  let container: Container;

  let pullRequestInfoLinkedIssuesExtractor: PullRequestInfoLinkedIssuesExtractor;
  let issuesHelper: IssuesHelper;

  beforeEach(() => {
    container = new Container();
    pullRequestInfoLinkedIssuesExtractor = {
      extract: vi.fn<(...args: unknown[]) => unknown>(),
    } as any;
    container.bind(PullRequestInfoLinkedIssuesExtractor).toConstantValue(pullRequestInfoLinkedIssuesExtractor);

    issuesHelper = {
      getIssue: vi.fn<(...args: unknown[]) => unknown>(),
    } as any;
    container.bind(IssuesHelper).toConstantValue(issuesHelper);

    container.bind(PullRequestInfoBuilder).toSelf().inSingletonScope();
  });

  test('info', async () => {
    expect.assertions(3);

    const pullRequestInfoBuilder = container.get(PullRequestInfoBuilder);

    expect(pullRequestInfoBuilder).toBeDefined();

    const mergingBranch = 'my-custom-branch';
    const mergedState = true;

    const pullRequestInfo = pullRequestInfoBuilder
      .build()
      .withMergingBranch(mergingBranch)
      .withMergedState(mergedState);

    expect(pullRequestInfo.mergingBranch).toBe(mergingBranch);
    expect(pullRequestInfo.merged).toBe(mergedState);
  });

  test('resolve info', async () => {
    expect.assertions(6);

    const pullRequestInfoBuilder = container.get(PullRequestInfoBuilder);

    expect(pullRequestInfoBuilder).toBeDefined();

    const mergingBranch = 'my-custom-branch';
    const mergedState = true;

    const issueInfo = new IssueInfoBuilder().build().withOwner('owner').withRepo('repo').withNumber(1234);

    const linkedIssue = 'https://api.github.com/repos/test/test/issues/123';
    vi.mocked(pullRequestInfoLinkedIssuesExtractor.extract).mockReturnValue([linkedIssue]);
    vi.mocked(issuesHelper.getIssue).mockResolvedValue(issueInfo);

    const pullRequestInfo = pullRequestInfoBuilder
      .build()
      .withMergingBranch(mergingBranch)
      .withMergedState(mergedState);

    // Before, no linked issues
    expect(pullRequestInfo.linkedIssues).toStrictEqual([]);

    await pullRequestInfoBuilder.resolve(pullRequestInfo);

    // After resolve, linked issue
    expect(pullRequestInfoLinkedIssuesExtractor.extract).toHaveBeenCalledWith(pullRequestInfo);
    expect(issuesHelper.getIssue).toHaveBeenCalledWith(linkedIssue);
    expect(pullRequestInfo.linkedIssues).toHaveLength(1);
    expect(pullRequestInfo.linkedIssues).toStrictEqual([issueInfo]);
  });

  test('resolve info with no getIssue', async () => {
    expect.assertions(6);

    const pullRequestInfoBuilder = container.get(PullRequestInfoBuilder);

    expect(pullRequestInfoBuilder).toBeDefined();

    const mergingBranch = 'my-custom-branch';
    const mergedState = true;

    const linkedIssue = 'https://api.github.com/repos/test/test/issues/123';
    vi.mocked(pullRequestInfoLinkedIssuesExtractor.extract).mockReturnValue([linkedIssue]);
    vi.mocked(issuesHelper.getIssue).mockResolvedValue(undefined);

    const pullRequestInfo = pullRequestInfoBuilder
      .build()
      .withMergingBranch(mergingBranch)
      .withMergedState(mergedState);

    // Before, no linked issues
    expect(pullRequestInfo.linkedIssues).toStrictEqual([]);

    await pullRequestInfoBuilder.resolve(pullRequestInfo);

    // After resolve, linked issue
    expect(pullRequestInfoLinkedIssuesExtractor.extract).toHaveBeenCalledWith(pullRequestInfo);
    expect(issuesHelper.getIssue).toHaveBeenCalledWith(linkedIssue);
    expect(pullRequestInfo.linkedIssues).toHaveLength(0);
    expect(pullRequestInfo.linkedIssues).toStrictEqual([]);
  });
});
