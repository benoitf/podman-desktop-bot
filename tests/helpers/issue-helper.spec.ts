/* eslint-disable @typescript-eslint/no-explicit-any */

import 'reflect-metadata';

import * as fs from 'fs-extra';
import * as path from 'path';
import {RestEndpointMethodTypes} from '@octokit/plugin-rest-endpoint-methods';

import { IssueInfo, IssueInfoBuilder } from '../../src/info/issue-info';

import { Container } from 'inversify';
import { IssuesHelper } from '../../src/helpers/issue-helper';
import { Octokit } from '@octokit/rest';

describe('Test Helper IssueHelper', () => {
  let container: Container;
  let issueInfoBuilder: IssueInfoBuilder;

  beforeEach(() => {
    container = new Container();
    issueInfoBuilder = {} as any;
    container.bind(IssueInfoBuilder).toConstantValue(issueInfoBuilder);

    container.bind(IssuesHelper).toSelf().inSingletonScope();
  });

  test('test isFirstTime true', async () => {
    const octokit = { rest: {issues: { listForRepo: jest.fn() } }};

    container.bind('Octokit').toConstantValue(octokit);
    const issueHelper = container.get(IssuesHelper);

    const issueInfo: IssueInfo = new IssueInfoBuilder()
      .build()
      .withNumber(123)
      .withAuthor('author')
      .withOwner('my-owner')
      .withRepo('repository')
      .withNumber(1234);

    // empty response
    const response: any = { data: [] };

    (octokit.rest.issues.listForRepo as jest.Mock).mockReturnValue(response);

    const isFirstTime: boolean = await issueHelper.isFirstTime(issueInfo);

    expect(octokit.rest.issues.listForRepo).toBeCalled();
    const params: RestEndpointMethodTypes["issues"]["listForRepo"]["parameters"] = octokit.rest.issues.listForRepo.mock.calls[0][0];

    expect(params.creator).toBe(issueInfo.author);
    expect(params.state).toBe('all');
    expect(params.repo).toBe(issueInfo.repo);
    expect(params.owner).toBe(issueInfo.owner);

    expect(isFirstTime).toBeTruthy();
  });

  test('test isFirstTime false', async () => {
    const octokit = { rest: {issues: { listForRepo: jest.fn() } }};

    container.bind('Octokit').toConstantValue(octokit);
    const issueHelper = container.get(IssuesHelper);

    const issueInfo: IssueInfo = new IssueInfoBuilder()
      .build()
      .withNumber(123)
      .withAuthor('author')
      .withOwner('my-owner')
      .withRepo('repository')
      .withNumber(1234);

    // got some results in the response so firstTime = false
    const response: any = { data: ['something', 'another-thing'] };

    (octokit.rest.issues.listForRepo as jest.Mock).mockReturnValue(response);

    const isFirstTime: boolean = await issueHelper.isFirstTime(issueInfo);

    expect(octokit.rest.issues.listForRepo).toBeCalled();
    const params:  RestEndpointMethodTypes["issues"]["listForRepo"]["parameters"] = octokit.rest.issues.listForRepo.mock.calls[0][0];

    expect(params.creator).toBe(issueInfo.author);
    expect(params.state).toBe('all');
    expect(params.repo).toBe(issueInfo.repo);
    expect(params.owner).toBe(issueInfo.owner);

    expect(isFirstTime).toBeFalsy();
  });

  test('test getIssue undefined invalid string', async () => {
    const octokit: any = {};
    container.bind('Octokit').toConstantValue(octokit);
    const issueHelper = container.get(IssuesHelper);

    const result: IssueInfo | undefined = await issueHelper.getIssue('issueInfo');
    expect(result).toBeUndefined();
  });

  test('test getIssue valid', async () => {
    issueInfoBuilder = new IssueInfoBuilder();
    jest.spyOn(issueInfoBuilder, 'build');

    container.rebind(IssueInfoBuilder).toConstantValue(issueInfoBuilder);

    const octokit = { rest: {issues: { get: jest.fn() } }};

    container.bind('Octokit').toConstantValue(octokit);
    const issueHelper = container.get(IssuesHelper);

    const json = await fs.readJSON(path.join(__dirname, '..', '_data', 'issue-helper', 'get-issue.json'));

    // empty response
    const response: any = { data: json };

    (octokit.rest.issues.get as jest.Mock).mockReturnValue(response);

    const issueInfo: IssueInfo | undefined = await issueHelper.getIssue('/repos/benoitf/demo-gh-event/issues/24');
    expect(issueInfo).toBeDefined();

    expect(octokit.rest.issues.get).toBeCalled();
    const params: RestEndpointMethodTypes["issues"]["get"]["parameters"] = octokit.rest.issues.get.mock.calls[0][0];

    expect(params.owner).toBe('benoitf');
    expect(params.repo).toBe('demo-gh-event');
    expect(params.issue_number).toBe(24);

    expect(issueInfoBuilder.build).toBeCalled();
    expect(issueInfo?.body).toMatch('### What does this PR do');
    expect(issueInfo?.author).toBe('benoitf');
    expect(issueInfo?.htmlLink).toBe('https://github.com/benoitf/demo-gh-event/pull/24');
    expect(issueInfo?.number).toBe(24);
    expect(issueInfo?.owner).toBe('benoitf');
    expect(issueInfo?.repo).toBe('demo-gh-event');
    expect(issueInfo?.labels).toEqual(['kind/bar', 'kind/baz', 'kind/dummy', 'kind/foo']);
  });
});
