/* eslint-disable @typescript-eslint/no-explicit-any */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Container } from 'inversify';
import { PullRequestInfoBuilder } from '/@/info/pull-request-info';
import { PullRequestInfoLinkedIssuesExtractor } from '/@/info/pull-request-info-linked-issues-extractor';
import { PullRequestReviewsHelper } from './pr-review-helper';
import { RepositoriesHelper } from './repositories-helper';
import { RequiredChecksHelper } from './required-checks-helper';
import { IssueInfoBuilder } from '/@/info/issue-info';
import { IssuesHelper } from './issue-helper';

const { graphqlMock } = vi.hoisted(() => ({ graphqlMock: vi.fn<(...args: unknown[]) => unknown>() }));
// @ts-expect-error partial mock factory
vi.mock(import('@octokit/graphql'), () => ({
  graphql: graphqlMock,
}));

describe(PullRequestReviewsHelper, () => {
  let container: Container;
  let requiredChecksHelper: any;
  let repositoriesHelper: any;

  beforeEach(() => {
    container = new Container();

    requiredChecksHelper = {
      getRequiredChecks: vi.fn<(...args: unknown[]) => unknown>(),
    };
    repositoriesHelper = {
      getRepositoriesToWatch: vi.fn<() => string[]>().mockReturnValue([]),
      getOrganizationsToWatch: vi.fn<() => string[]>().mockReturnValue(['podman-desktop']),
    };

    container.bind('string').toConstantValue('fooToken').whenNamed('GRAPHQL_READ_TOKEN');
    container.bind('string').toConstantValue('fooToken').whenNamed('GRAPHQL_WRITE_TOKEN');
    container.bind(PullRequestInfoBuilder).toSelf().inSingletonScope();
    container.bind(PullRequestInfoLinkedIssuesExtractor).toSelf().inSingletonScope();
    container.bind(IssueInfoBuilder).toSelf().inSingletonScope();
    container.bind(IssuesHelper).toSelf().inSingletonScope();
    container.bind('Octokit').toConstantValue({}).whenNamed('READ_TOKEN');
    container.bind(RepositoriesHelper).toConstantValue(repositoriesHelper);
    container.bind(RequiredChecksHelper).toConstantValue(requiredChecksHelper);
    container.bind(PullRequestReviewsHelper).toSelf().inSingletonScope();
  });

  function makeGraphqlResponse(prs: any[]): any {
    return {
      search: {
        pageInfo: { endCursor: 'cursor', hasNextPage: false },
        edges: prs.map(pr => ({ node: pr })),
      },
    };
  }

  function makePrNode(overrides: any = {}): any {
    return {
      id: 'PR_1',
      url: 'https://github.com/podman-desktop/podman-desktop/pull/1',
      mergedAt: undefined,
      title: 'chore(deps): bump foo from 1.0.0 to 1.0.1',
      number: 1,
      body: '',
      repository: { name: 'podman-desktop', owner: { login: 'podman-desktop' } },
      baseRepository: {
        url: 'https://github.com/podman-desktop/podman-desktop',
        nameWithOwner: 'podman-desktop/podman-desktop',
      },
      statusCheckRollup: { state: 'SUCCESS', contexts: { nodes: [] } },
      commits: { nodes: [{ commit: { committedDate: '2026-03-25T00:00:00Z' } }] },
      author: { login: 'dependabot[bot]' },
      reviewDecision: 'REVIEW_REQUIRED',
      autoMergeRequest: undefined,
      baseRefName: 'main',
      milestone: undefined,
      ...overrides,
    };
  }

  describe('extractCheckContexts deduplication', () => {
    test('should keep the most recent check run when duplicates exist by timestamp', async () => {
      expect.assertions(2);

      const prNode = makePrNode({
        statusCheckRollup: {
          state: 'SUCCESS',
          contexts: {
            nodes: [
              {
                __typename: 'CheckRun',
                name: 'Linux',
                conclusion: 'CANCELLED',
                status: 'COMPLETED',
                startedAt: '2026-03-25T03:06:39Z',
              },
              {
                __typename: 'CheckRun',
                name: 'Linux',
                conclusion: 'SUCCESS',
                status: 'COMPLETED',
                startedAt: '2026-03-25T03:06:49Z',
              },
            ],
          },
        },
      });

      graphqlMock.mockResolvedValueOnce(makeGraphqlResponse([prNode]));
      vi.mocked(requiredChecksHelper.getRequiredChecks).mockResolvedValue(new Set());

      const helper = container.get(PullRequestReviewsHelper);
      const result = await helper.getDependabotPullRequestsRequiringReviewAndPassingAllChecks();

      expect(result).toHaveLength(1);
      expect(result[0].checkContexts).toStrictEqual([{ name: 'Linux', state: 'SUCCESS', typename: 'CheckRun' }]);
    });

    test('should keep earlier successful run over later cancelled run', async () => {
      expect.assertions(2);

      const prNode = makePrNode({
        statusCheckRollup: {
          state: 'SUCCESS',
          contexts: {
            nodes: [
              {
                __typename: 'CheckRun',
                name: 'Linux',
                conclusion: 'SUCCESS',
                status: 'COMPLETED',
                startedAt: '2026-03-25T04:00:00Z',
              },
              {
                __typename: 'CheckRun',
                name: 'Linux',
                conclusion: 'CANCELLED',
                status: 'COMPLETED',
                startedAt: '2026-03-25T03:00:00Z',
              },
            ],
          },
        },
      });

      graphqlMock.mockResolvedValueOnce(makeGraphqlResponse([prNode]));
      vi.mocked(requiredChecksHelper.getRequiredChecks).mockResolvedValue(new Set());

      const helper = container.get(PullRequestReviewsHelper);
      const result = await helper.getDependabotPullRequestsRequiringReviewAndPassingAllChecks();

      expect(result).toHaveLength(1);
      expect(result[0].checkContexts).toStrictEqual([{ name: 'Linux', state: 'SUCCESS', typename: 'CheckRun' }]);
    });

    test('should deduplicate StatusContext entries by createdAt', async () => {
      expect.assertions(2);

      const prNode = makePrNode({
        statusCheckRollup: {
          state: 'SUCCESS',
          contexts: {
            nodes: [
              { __typename: 'StatusContext', context: 'DCO', state: 'PENDING', createdAt: '2026-03-25T03:00:00Z' },
              { __typename: 'StatusContext', context: 'DCO', state: 'SUCCESS', createdAt: '2026-03-25T03:05:00Z' },
            ],
          },
        },
      });

      graphqlMock.mockResolvedValueOnce(makeGraphqlResponse([prNode]));
      vi.mocked(requiredChecksHelper.getRequiredChecks).mockResolvedValue(new Set());

      const helper = container.get(PullRequestReviewsHelper);
      const result = await helper.getDependabotPullRequestsRequiringReviewAndPassingAllChecks();

      expect(result).toHaveLength(1);
      expect(result[0].checkContexts).toStrictEqual([{ name: 'DCO', state: 'SUCCESS', typename: 'StatusContext' }]);
    });
  });

  describe('required checks filtering', () => {
    test('should accept pr when non-required check fails but required checks pass', async () => {
      expect.assertions(1);

      const prNode = makePrNode({
        statusCheckRollup: {
          state: 'SUCCESS',
          contexts: {
            nodes: [
              {
                __typename: 'CheckRun',
                name: 'Linux',
                conclusion: 'SUCCESS',
                status: 'COMPLETED',
                startedAt: '2026-03-25T03:06:49Z',
              },
              {
                __typename: 'CheckRun',
                name: 'optional-check',
                conclusion: 'FAILURE',
                status: 'COMPLETED',
                startedAt: '2026-03-25T03:06:49Z',
              },
            ],
          },
        },
      });

      graphqlMock.mockResolvedValueOnce(makeGraphqlResponse([prNode]));
      vi.mocked(requiredChecksHelper.getRequiredChecks).mockResolvedValue(new Set(['Linux']));

      const helper = container.get(PullRequestReviewsHelper);
      const result = await helper.getDependabotPullRequestsRequiringReviewAndPassingAllChecks();

      expect(result).toHaveLength(1);
    });

    test('should reject pr when a required check fails', async () => {
      expect.assertions(1);

      const prNode = makePrNode({
        statusCheckRollup: {
          state: 'SUCCESS',
          contexts: {
            nodes: [
              {
                __typename: 'CheckRun',
                name: 'Linux',
                conclusion: 'FAILURE',
                status: 'COMPLETED',
                startedAt: '2026-03-25T03:06:49Z',
              },
              {
                __typename: 'CheckRun',
                name: 'optional-check',
                conclusion: 'SUCCESS',
                status: 'COMPLETED',
                startedAt: '2026-03-25T03:06:49Z',
              },
            ],
          },
        },
      });

      graphqlMock.mockResolvedValueOnce(makeGraphqlResponse([prNode]));
      vi.mocked(requiredChecksHelper.getRequiredChecks).mockResolvedValue(new Set(['Linux']));

      const helper = container.get(PullRequestReviewsHelper);
      const result = await helper.getDependabotPullRequestsRequiringReviewAndPassingAllChecks();

      expect(result).toHaveLength(0);
    });

    test('should fall back to all checks when required checks set is empty', async () => {
      expect.assertions(1);

      const prNode = makePrNode({
        statusCheckRollup: {
          state: 'SUCCESS',
          contexts: {
            nodes: [
              {
                __typename: 'CheckRun',
                name: 'Linux',
                conclusion: 'SUCCESS',
                status: 'COMPLETED',
                startedAt: '2026-03-25T03:06:49Z',
              },
              {
                __typename: 'CheckRun',
                name: 'other-check',
                conclusion: 'FAILURE',
                status: 'COMPLETED',
                startedAt: '2026-03-25T03:06:49Z',
              },
            ],
          },
        },
      });

      graphqlMock.mockResolvedValueOnce(makeGraphqlResponse([prNode]));
      vi.mocked(requiredChecksHelper.getRequiredChecks).mockResolvedValue(new Set());

      const helper = container.get(PullRequestReviewsHelper);
      const result = await helper.getDependabotPullRequestsRequiringReviewAndPassingAllChecks();

      // Falls back to checking all — other-check FAILURE blocks it
      expect(result).toHaveLength(0);
    });

    test('should cache required checks per owner/repo/branch', async () => {
      expect.assertions(1);

      const prNode1 = makePrNode({ id: 'PR_1', number: 1 });
      const prNode2 = makePrNode({ id: 'PR_2', number: 2 });

      graphqlMock.mockResolvedValueOnce(makeGraphqlResponse([prNode1, prNode2]));
      vi.mocked(requiredChecksHelper.getRequiredChecks).mockResolvedValue(new Set());

      const helper = container.get(PullRequestReviewsHelper);
      await helper.getDependabotPullRequestsRequiringReviewAndPassingAllChecks();

      // Both PRs target podman-desktop/podman-desktop/main, so only one call
      expect(requiredChecksHelper.getRequiredChecks).toHaveBeenCalledExactlyOnceWith(
        'podman-desktop',
        'podman-desktop',
        'main',
      );
    });
  });

  describe('edge cases', () => {
    test('should accept pr with no check contexts when rollup is SUCCESS', async () => {
      expect.assertions(1);

      const prNode = makePrNode({
        statusCheckRollup: { state: 'SUCCESS', contexts: { nodes: [] } },
      });

      graphqlMock.mockResolvedValueOnce(makeGraphqlResponse([prNode]));
      vi.mocked(requiredChecksHelper.getRequiredChecks).mockResolvedValue(new Set());

      const helper = container.get(PullRequestReviewsHelper);
      const result = await helper.getDependabotPullRequestsRequiringReviewAndPassingAllChecks();

      expect(result).toHaveLength(1);
    });

    test('should reject pr with no check contexts when rollup is not SUCCESS', async () => {
      expect.assertions(1);

      const prNode = makePrNode({
        statusCheckRollup: { state: 'PENDING', contexts: { nodes: [] } },
      });

      graphqlMock.mockResolvedValueOnce(makeGraphqlResponse([prNode]));
      vi.mocked(requiredChecksHelper.getRequiredChecks).mockResolvedValue(new Set());

      const helper = container.get(PullRequestReviewsHelper);
      const result = await helper.getDependabotPullRequestsRequiringReviewAndPassingAllChecks();

      expect(result).toHaveLength(0);
    });

    test('should exclude bot check names from evaluation', async () => {
      expect.assertions(1);

      const prNode = makePrNode({
        statusCheckRollup: {
          state: 'SUCCESS',
          contexts: {
            nodes: [
              {
                __typename: 'CheckRun',
                name: 'Domain Review Status',
                conclusion: 'FAILURE',
                status: 'COMPLETED',
                startedAt: '2026-03-25T03:06:49Z',
              },
              {
                __typename: 'CheckRun',
                name: 'Linux',
                conclusion: 'SUCCESS',
                status: 'COMPLETED',
                startedAt: '2026-03-25T03:06:49Z',
              },
            ],
          },
        },
      });

      graphqlMock.mockResolvedValueOnce(makeGraphqlResponse([prNode]));
      vi.mocked(requiredChecksHelper.getRequiredChecks).mockResolvedValue(new Set());

      const helper = container.get(PullRequestReviewsHelper);
      const result = await helper.getDependabotPullRequestsRequiringReviewAndPassingAllChecks();

      // Domain Review Status is excluded, only Linux is checked
      expect(result).toHaveLength(1);
    });

    test('should filter out prs with FAILURE rollup state', async () => {
      expect.assertions(1);

      const prNode = makePrNode({
        statusCheckRollup: { state: 'FAILURE', contexts: { nodes: [] } },
      });

      graphqlMock.mockResolvedValueOnce(makeGraphqlResponse([prNode]));
      vi.mocked(requiredChecksHelper.getRequiredChecks).mockResolvedValue(new Set());

      const helper = container.get(PullRequestReviewsHelper);
      const result = await helper.getDependabotPullRequestsRequiringReviewAndPassingAllChecks();

      expect(result).toHaveLength(0);
    });
  });
});
