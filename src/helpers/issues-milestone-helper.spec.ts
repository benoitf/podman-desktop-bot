/* eslint-disable @typescript-eslint/no-explicit-any */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { PullRequestInfo } from '/@/info/pull-request-info';
import { PullRequestInfoBuilder } from '/@/info/pull-request-info';

import { Container } from 'inversify';
import { IssueMilestoneHelper } from './issue-milestone-helper';
import { IssuesHelper } from './issue-helper';
import { PullRequestInfoLinkedIssuesExtractor } from '/@/info/pull-request-info-linked-issues-extractor';

describe('test Helper IssuesMilestoneHelper', () => {
  let container: Container;

  let pullRequestInfoLinkedIssuesExtractor: PullRequestInfoLinkedIssuesExtractor;
  let issuesHelper: IssuesHelper;

  beforeEach(() => {
    container = new Container();
    container.bind(IssueMilestoneHelper).toSelf().inSingletonScope();

    pullRequestInfoLinkedIssuesExtractor = {} as any;
    container.bind(PullRequestInfoLinkedIssuesExtractor).toConstantValue(pullRequestInfoLinkedIssuesExtractor);

    issuesHelper = {} as any;
    container.bind(IssuesHelper).toConstantValue(issuesHelper);

    container.bind(PullRequestInfoBuilder).toSelf().inSingletonScope();
  });

  // Check with label existing
  test('call correct API if milestone exists', async () => {
    expect.assertions(3);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const octokit = {
      rest: {
        issues: {
          listMilestones: vi.fn<(...args: unknown[]) => unknown>(),
          update: vi.fn<(...args: unknown[]) => unknown>(),
          createMilestone: vi.fn<(...args: unknown[]) => unknown>(),
        },
      },
    };

    container.bind('Octokit').toConstantValue(octokit);
    const addMilestoneHelper = container.get(IssueMilestoneHelper);

    const milestoneToAdd = 'milestone-to-add';
    const milestoneNumber = 2503;
    // Merged = true
    const issueInfo: PullRequestInfo = container
      .get(PullRequestInfoBuilder)
      .build()
      .withOwner('my-owner')
      .withRepo('repository')
      .withNumber(123)
      .withMergedState(true);

    const firstItem = { title: 'foo', number: milestoneNumber };
    const secondItem = { title: milestoneToAdd, number: milestoneNumber };
    const mockListResponse = { data: [firstItem, secondItem] };
    vi.mocked(octokit.rest.issues.listMilestones).mockReturnValue(mockListResponse);

    await addMilestoneHelper.setMilestone(milestoneToAdd, issueInfo);

    expect(octokit.rest.issues.listMilestones).toHaveBeenCalledWith(
      expect.objectContaining({ owner: issueInfo.owner, repo: issueInfo.repo }),
    );

    // Do not create as it exists
    expect(octokit.rest.issues.createMilestone).toHaveBeenCalledTimes(0);

    expect(octokit.rest.issues.update).toHaveBeenCalledWith(
      expect.objectContaining({
        milestone: milestoneNumber,
        repo: issueInfo.repo,
        owner: issueInfo.owner,
        issue_number: issueInfo.number,
      }),
    );
  });

  // Check if label does not exist on the issue
  test('call correct API if milestone does not exist', async () => {
    expect.assertions(3);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const octokit = {
      rest: {
        issues: {
          listMilestones: vi.fn<(...args: unknown[]) => unknown>(),
          update: vi.fn<(...args: unknown[]) => unknown>(),
          createMilestone: vi.fn<(...args: unknown[]) => unknown>(),
        },
      },
    };

    container.bind('Octokit').toConstantValue(octokit);
    const addMilestoneHelper = container.get(IssueMilestoneHelper);

    const milestoneToAdd = 'milestone-to-add';
    const milestoneNumber = 2503;
    // Merged = true
    const issueInfo: PullRequestInfo = container
      .get(PullRequestInfoBuilder)
      .build()
      .withOwner('my-owner')
      .withRepo('repository')
      .withNumber(123)
      .withMergedState(true);

    const firstItem = { title: 'foo', number: 1 };
    const secondItem = { title: 'bar', number: 2 };
    const mockListResponse = { data: [firstItem, secondItem] };
    vi.mocked(octokit.rest.issues.listMilestones).mockReturnValue(mockListResponse);

    const createMilestoneResponse = { data: { number: milestoneNumber } };
    vi.mocked(octokit.rest.issues.createMilestone).mockReturnValue(createMilestoneResponse);

    await addMilestoneHelper.setMilestone(milestoneToAdd, issueInfo);

    expect(octokit.rest.issues.listMilestones).toHaveBeenCalledWith(
      expect.objectContaining({ owner: issueInfo.owner, repo: issueInfo.repo }),
    );

    expect(octokit.rest.issues.createMilestone).toHaveBeenCalledWith(
      expect.objectContaining({ title: milestoneToAdd, owner: issueInfo.owner, repo: issueInfo.repo }),
    );

    expect(octokit.rest.issues.update).toHaveBeenCalledWith(
      expect.objectContaining({
        milestone: milestoneNumber,
        repo: issueInfo.repo,
        owner: issueInfo.owner,
        issue_number: issueInfo.number,
      }),
    );
  });
});
