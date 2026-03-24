/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-null/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as fs from 'node:fs/promises';
import moment from 'moment';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Container } from 'inversify';
import { IssueInfoBuilder } from '/@/info/issue-info';
import { IssuesHelper } from './issue-helper';
import { PullRequestInfoBuilder } from '/@/info/pull-request-info';
import { PullRequestInfoLinkedIssuesExtractor } from '/@/info/pull-request-info-linked-issues-extractor';
import { PullRequestsHelper } from './pull-requests-helper';

const { graphqlMock } = vi.hoisted(() => ({ graphqlMock: vi.fn<(...args: unknown[]) => unknown>() }));
// @ts-expect-error partial mock factory
vi.mock(import('@octokit/graphql'), () => ({
  graphql: graphqlMock,
}));

describe('test Helper PullRequestHelper', () => {
  let container: Container;
  let octokit: any;

  beforeEach(async () => {
    container = new Container();
    container.bind(IssuesHelper).toSelf().inSingletonScope();
    container.bind(PullRequestsHelper).toSelf().inSingletonScope();
    container.bind(IssueInfoBuilder).toSelf().inSingletonScope();
    container.bind(PullRequestInfoBuilder).toSelf().inSingletonScope();
    container.bind(PullRequestInfoLinkedIssuesExtractor).toSelf().inSingletonScope();
    octokit = {
      issues: {
        createMilestone: vi.fn<(...args: unknown[]) => unknown>(),
        updateMilestone: vi.fn<(...args: unknown[]) => unknown>(),
      },
    };

    container.bind('Octokit').toConstantValue(octokit);
    container.bind('string').toConstantValue('fooToken').whenNamed('GRAPHQL_READ_TOKEN');
  });

  afterEach(() => {
    vi.resetModules();
  });

  test('search tags', async () => {
    expect.assertions(6);

    const pullRequestsHelper = container.get(PullRequestsHelper);
    const json = await fs.readFile(path.join(__dirname, '..', '_data', 'helper', 'pulls-request-helper.json'), 'utf8');
    const parsedJSON = JSON.parse(json);
    graphqlMock.mockReturnValueOnce(parsedJSON);

    const anotherJson = await fs.readFile(
      path.join(__dirname, '..', '_data', 'helper', 'pulls-request-helper-next.json'),
      'utf8',
    );
    const anotherParsedJSON = JSON.parse(anotherJson);
    graphqlMock.mockReturnValueOnce(anotherParsedJSON);
    const pullRequestInfos = await pullRequestsHelper.getRecentMerged(moment.duration(1, 'days'));

    // Should have 4 pull requests
    expect(pullRequestInfos).toHaveLength(20);

    expect(pullRequestInfos[0].repo).toBe('che-docs');
    expect(pullRequestInfos[0].owner).toBe('eclipse');
    expect(pullRequestInfos[0].mergedAt).toBe('2020-08-06T12:52:47Z');
    expect(pullRequestInfos[0].htmlLink).toBe('https://github.com/eclipse/che-docs/pull/1450');
    expect(pullRequestInfos[0].mergingBranch).toBe('master');
  });
});
