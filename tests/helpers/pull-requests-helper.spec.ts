/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-null/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import * as fs from 'fs-extra';
import * as moment from 'moment';
import * as path from 'path';

import { CheRepositoriesFetcher } from '../../src/fetchers/che-repositories-fetcher';
import { Container } from 'inversify';
import { IssueInfoBuilder } from '../../src/info/issue-info';
import { IssuesHelper } from '../../src/helpers/issue-helper';
import { Octokit } from '@octokit/rest';
import { PullRequestInfoBuilder } from '../../src/info/pull-request-info';
import { PullRequestInfoLinkedIssuesExtractor } from '../../src/info/pull-request-info-linked-issues-extractor';
import { PullRequestsHelper } from '../../src/helpers/pull-requests-helper';
import axios from 'axios';
import { graphql } from '@octokit/graphql';

describe('Test Helper PullRequestHelper', () => {
  let container: Container;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let octokit: any;

  beforeEach(async () => {
    container = new Container();
    container.bind(IssuesHelper).toSelf().inSingletonScope();
    container.bind(PullRequestsHelper).toSelf().inSingletonScope();
    container.bind(IssueInfoBuilder).toSelf().inSingletonScope();
    container.bind(PullRequestInfoBuilder).toSelf().inSingletonScope();
    container.bind(PullRequestInfoLinkedIssuesExtractor).toSelf().inSingletonScope();
    container.bind(CheRepositoriesFetcher).toSelf().inSingletonScope();
    octokit = {
      issues: { createMilestone: jest.fn(), updateMilestone: jest.fn() },
    };

    // mock got
    const yaml = await fs.readFile(path.join(__dirname, '..', '_data', 'fetcher', 'che-repositories-fetcher.yaml'), 'utf8');
    jest.mock('axios');
    (axios as any).__setContent(CheRepositoriesFetcher.CHE_REPOSITORIES_YAML, yaml);

    container.bind(Octokit).toConstantValue(octokit);
    container.bind('string').toConstantValue('fooToken').whenTargetNamed('GRAPHQL_READ_TOKEN');
  });

  afterEach(() => {
    jest.resetModules();
  });

  test('test search tags', async () => {
    const pullRequestsHelper = container.get(PullRequestsHelper);
    jest.mock('@octokit/graphql');
    const json = await fs.readFile(path.join(__dirname, '..', '_data', 'helper', 'pulls-request-helper.json'), 'utf8');
    const parsedJSON = JSON.parse(json);
    (graphql as any).__setDefaultExports(parsedJSON);

    const anotherJson = await fs.readFile(path.join(__dirname, '..', '_data', 'helper', 'pulls-request-helper-next.json'), 'utf8');
    const anotherParsedJSON = JSON.parse(anotherJson);
    (graphql as any).__setDefaultExports(anotherParsedJSON);
    const pullRequestInfos = await pullRequestsHelper.getRecentMerged(moment.duration(1, 'days'));

    // should have 4 pull requests
    expect(pullRequestInfos.length).toBe(20);

    expect(pullRequestInfos[0].repo).toBe('che-docs');
    expect(pullRequestInfos[0].owner).toBe('eclipse');
    expect(pullRequestInfos[0].mergedAt).toBe('2020-08-06T12:52:47Z');
    expect(pullRequestInfos[0].htmlLink).toBe('https://github.com/eclipse/che-docs/pull/1450');
    expect(pullRequestInfos[0].mergingBranch).toBe('master');
  });
});
