/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import { Container } from 'inversify';
import { IssueInfoBuilder } from '../../src/info/issue-info';
import { IssuesHelper } from '../../src/helpers/issue-helper';
import { PullRequestInfoBuilder } from '../../src/info/pull-request-info';
import { PullRequestInfoLinkedIssuesExtractor } from '../../src/info/pull-request-info-linked-issues-extractor';

describe('Test PullRequestInfo', () => {
  let container: Container;

  let pullRequestInfoLinkedIssuesExtractor: PullRequestInfoLinkedIssuesExtractor;
  let issuesHelper: IssuesHelper;

  beforeEach(() => {
    container = new Container();
    pullRequestInfoLinkedIssuesExtractor = {
      extract: jest.fn(),
    } as any;
    container.bind(PullRequestInfoLinkedIssuesExtractor).toConstantValue(pullRequestInfoLinkedIssuesExtractor);

    issuesHelper = {
      getIssue: jest.fn(),
    } as any;
    container.bind(IssuesHelper).toConstantValue(issuesHelper);

    container.bind(PullRequestInfoBuilder).toSelf().inSingletonScope();
  });

  test('test info', async () => {
    const pullRequestInfoBuilder = container.get(PullRequestInfoBuilder);
    expect(pullRequestInfoBuilder).toBeDefined();

    const mergingBranch = 'my-custom-branch';
    const mergedState = true;

    const pullRequestInfo = pullRequestInfoBuilder.build().withMergingBranch(mergingBranch).withMergedState(mergedState);

    expect(pullRequestInfo.mergingBranch).toBe(mergingBranch);
    expect(pullRequestInfo.merged).toBe(mergedState);
  });

  test('test resolve info', async () => {
    const pullRequestInfoBuilder = container.get(PullRequestInfoBuilder);
    expect(pullRequestInfoBuilder).toBeDefined();

    const mergingBranch = 'my-custom-branch';
    const mergedState = true;

    const issueInfo = new IssueInfoBuilder().build().withOwner('owner').withRepo('repo').withNumber(1234);

    const linkedIssue = 'https://api.github.com/repos/test/test/issues/123';
    (pullRequestInfoLinkedIssuesExtractor.extract as jest.Mock).mockReturnValue([linkedIssue]);
    (issuesHelper.getIssue as jest.Mock).mockReturnValue(issueInfo);

    const pullRequestInfo = pullRequestInfoBuilder.build().withMergingBranch(mergingBranch).withMergedState(mergedState);

    // before, no linked issues
    expect(pullRequestInfo.linkedIssues).toEqual([]);
    await pullRequestInfoBuilder.resolve(pullRequestInfo);

    // after resolve, linked issue
    expect(pullRequestInfoLinkedIssuesExtractor.extract).toBeCalled();
    expect(issuesHelper.getIssue).toBeCalled();
    expect(pullRequestInfo.linkedIssues.length).toBe(1);
    expect(pullRequestInfo.linkedIssues).toEqual([issueInfo]);
  });

  test('test resolve info with no getIssue', async () => {
    const pullRequestInfoBuilder = container.get(PullRequestInfoBuilder);
    expect(pullRequestInfoBuilder).toBeDefined();

    const mergingBranch = 'my-custom-branch';
    const mergedState = true;

    const linkedIssue = 'https://api.github.com/repos/test/test/issues/123';
    (pullRequestInfoLinkedIssuesExtractor.extract as jest.Mock).mockReturnValue([linkedIssue]);
    (issuesHelper.getIssue as jest.Mock).mockReturnValue(undefined);

    const pullRequestInfo = pullRequestInfoBuilder.build().withMergingBranch(mergingBranch).withMergedState(mergedState);

    // before, no linked issues
    expect(pullRequestInfo.linkedIssues).toEqual([]);
    await pullRequestInfoBuilder.resolve(pullRequestInfo);

    // after resolve, linked issue
    expect(pullRequestInfoLinkedIssuesExtractor.extract).toBeCalled();
    expect(issuesHelper.getIssue).toBeCalled();
    expect(pullRequestInfo.linkedIssues.length).toBe(0);
    expect(pullRequestInfo.linkedIssues).toEqual([]);
  });
});
