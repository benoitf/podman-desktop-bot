/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-null/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import * as fs from 'fs-extra';
import * as path from 'path';

import { PullRequestInfo, PullRequestInfoBuilder } from '../../src/info/pull-request-info';
import { TagDefinition, TagsHelper } from '../../src/helpers/tags-helper';

import { ApplyMilestoneOnPullRequestsLogic } from '../../src/logic/apply-milestone-on-pull-requests-logic';
import { Container } from 'inversify';
import { IssueMilestoneHelper } from '../../src/helpers/issue-milestone-helper';
import { MilestoneHelper } from '../../src/helpers/milestone-helper';
import { Octokit } from '@octokit/rest';
import { PodmanDesktopVersionFetcher } from '../../src/fetchers/podman-desktop-version-fetcher';
import { PullRequestsHelper } from '../../src/helpers/pull-requests-helper';
import axios from 'axios';
import { graphql } from '@octokit/graphql';

describe('Test Apply Milestone Logic', () => {
  let container: Container;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let octokit: {
    rest: {
      issues: {
        createMilestone: jest.Mock<any, any>;
        updateMilestone: jest.Mock<any, any>;
      };
    };
  };

  let issueMilestoneHelper: any;
  let pullRequestsHelper: any;
  let podmanDesktopVersionFetcher: any;
  let tagsHelper: any;

  beforeEach(() => {
    container = new Container();

    issueMilestoneHelper = {
      setMilestone: jest.fn(),
    } as any;
    pullRequestsHelper = {
      getRecentMerged: jest.fn(),
    } as any;
    podmanDesktopVersionFetcher = {
      getVersion: jest.fn(),
    } as any;

    tagsHelper = {
      getLatestTags: jest.fn(),
    } as any;

    container.bind(PodmanDesktopVersionFetcher).toConstantValue(podmanDesktopVersionFetcher);
    container.bind(IssueMilestoneHelper).toConstantValue(issueMilestoneHelper);
    container.bind(PullRequestsHelper).toConstantValue(pullRequestsHelper);
    container.bind(TagsHelper).toConstantValue(tagsHelper);
    container.bind(ApplyMilestoneOnPullRequestsLogic).toSelf().inSingletonScope();
    octokit = {
      rest: {
        issues: { createMilestone: jest.fn(), updateMilestone: jest.fn() },
      },
    };

    container.bind('Octokit').toConstantValue(octokit);
    container.bind('string').toConstantValue('fooToken').whenTargetNamed('GRAPHQL_READ_TOKEN');
  });

  afterEach(() => {
    jest.resetModules();
  });

  test('test no che milestone', async () => {
    container.bind('number').toConstantValue(50).whenTargetNamed('MAX_SET_MILESTONE_PER_RUN');

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();
    expect(podmanDesktopVersionFetcher.getVersion).toHaveBeenCalled();
  });

  test('test limit set to 0', async () => {
    // limit the number to zero
    container.bind('number').toConstantValue(0).whenTargetNamed('MAX_SET_MILESTONE_PER_RUN');

    (podmanDesktopVersionFetcher.getVersion as jest.Mock).mockReturnValue('7.17.0');

    const pullRequestInfos: PullRequestInfo[] = [];

    const firstPullRequestInfo = new PullRequestInfo();
    firstPullRequestInfo.withMergingBranch('master');
    firstPullRequestInfo.withOwner('eclipse');
    firstPullRequestInfo.withRepo('che-theia');

    pullRequestInfos.push(firstPullRequestInfo);
    (pullRequestsHelper.getRecentMerged as jest.Mock).mockReturnValue(pullRequestInfos);

    (tagsHelper.getLatestTags as jest.Mock).mockReturnValue(new Map());

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();

    // check we never call setMilestone as we limit the number of milestones
    expect(issueMilestoneHelper.setMilestone).toHaveBeenCalledTimes(0);
  });

  test('test merged into master', async () => {
    // limit the number to zero
    container.bind('number').toConstantValue(10).whenTargetNamed('MAX_SET_MILESTONE_PER_RUN');

    (podmanDesktopVersionFetcher.getVersion as jest.Mock).mockReturnValue('7.17.0');

    const pullRequestInfos: PullRequestInfo[] = [];

    const firstPullRequestInfo = new PullRequestInfo();
    firstPullRequestInfo.withMergingBranch('master');
    firstPullRequestInfo.withOwner('eclipse');
    firstPullRequestInfo.withRepo('che-theia');

    pullRequestInfos.push(firstPullRequestInfo);
    (pullRequestsHelper.getRecentMerged as jest.Mock).mockReturnValue(pullRequestInfos);

    (tagsHelper.getLatestTags as jest.Mock).mockReturnValue(new Map());

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();

    expect(issueMilestoneHelper.setMilestone).toHaveBeenCalled();

    // get milestone
    const call = (issueMilestoneHelper.setMilestone as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('7.17');
    expect(call[1]).toBe(firstPullRequestInfo);
  });

  test('test merged into master but no che milestone found', async () => {
    // limit the number to zero
    container.bind('number').toConstantValue(10).whenTargetNamed('MAX_SET_MILESTONE_PER_RUN');

    (podmanDesktopVersionFetcher.getVersion as jest.Mock).mockReturnValue('a.b.c');

    const pullRequestInfos: PullRequestInfo[] = [];

    const firstPullRequestInfo = new PullRequestInfo();
    firstPullRequestInfo.withMergingBranch('master');
    firstPullRequestInfo.withOwner('eclipse');
    firstPullRequestInfo.withRepo('che-theia');

    pullRequestInfos.push(firstPullRequestInfo);
    (pullRequestsHelper.getRecentMerged as jest.Mock).mockReturnValue(pullRequestInfos);

    (tagsHelper.getLatestTags as jest.Mock).mockReturnValue(new Map());

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();

    expect(issueMilestoneHelper.setMilestone).toHaveBeenCalledTimes(0);
  });

  test('test merged into master after tag (so milestone = tag + 1 minor)', async () => {
    // limit the number to zero
    container.bind('number').toConstantValue(10).whenTargetNamed('MAX_SET_MILESTONE_PER_RUN');

    (podmanDesktopVersionFetcher.getVersion as jest.Mock).mockReturnValue('7.17.0');

    const pullRequestInfos: PullRequestInfo[] = [];

    const firstPullRequestInfo = new PullRequestInfo();
    firstPullRequestInfo.withMergingBranch('master');
    firstPullRequestInfo.withOwner('eclipse');
    firstPullRequestInfo.withRepo('che-theia');

    pullRequestInfos.push(firstPullRequestInfo);
    (pullRequestsHelper.getRecentMerged as jest.Mock).mockReturnValue(pullRequestInfos);

    const tagDefinitionsMap = new Map<string, TagDefinition[]>();
    const tagDefinitions: TagDefinition[] = [
      {
        committedDate: '2020-07-04',
        name: '7.17.0',
      },
    ];
    tagDefinitionsMap.set('eclipse/che-theia', tagDefinitions);

    (tagsHelper.getLatestTags as jest.Mock).mockReturnValue(tagDefinitionsMap);

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();

    expect(issueMilestoneHelper.setMilestone).toHaveBeenCalled();

    // get milestone
    const call = (issueMilestoneHelper.setMilestone as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('7.18');
    expect(call[1]).toBe(firstPullRequestInfo);
  });

  test('test merged into master before tag (so milestone = tag )', async () => {
    // limit the number to zero
    container.bind('number').toConstantValue(10).whenTargetNamed('MAX_SET_MILESTONE_PER_RUN');

    (podmanDesktopVersionFetcher.getVersion as jest.Mock).mockReturnValue('7.17.0');

    const pullRequestInfos: PullRequestInfo[] = [];

    const firstPullRequestInfo = new PullRequestInfo()
      .withMergingBranch('master')
      .withOwner('eclipse')
      .withRepo('che-theia')
      .withMergedAt('2020-06-04');

    pullRequestInfos.push(firstPullRequestInfo);
    (pullRequestsHelper.getRecentMerged as jest.Mock).mockReturnValue(pullRequestInfos);

    const tagDefinitionsMap = new Map<string, TagDefinition[]>();
    const tagDefinitions: TagDefinition[] = [
      {
        committedDate: '2020-07-04',
        name: '7.17.0',
      },
    ];
    tagDefinitionsMap.set('eclipse/che-theia', tagDefinitions);

    (tagsHelper.getLatestTags as jest.Mock).mockReturnValue(tagDefinitionsMap);

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();

    expect(issueMilestoneHelper.setMilestone).toHaveBeenCalled();

    // get milestone
    const call = (issueMilestoneHelper.setMilestone as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('7.17');
    expect(call[1]).toBe(firstPullRequestInfo);
  });

  test('test merged into master after tag (so milestone = tag + 1 minor) but different layout of tags', async () => {
    // limit the number to zero
    container.bind('number').toConstantValue(10).whenTargetNamed('MAX_SET_MILESTONE_PER_RUN');

    (podmanDesktopVersionFetcher.getVersion as jest.Mock).mockReturnValue('7.17.0');

    const pullRequestInfos: PullRequestInfo[] = [];

    const firstPullRequestInfo = new PullRequestInfo();
    firstPullRequestInfo.withMergingBranch('master');
    firstPullRequestInfo.withOwner('eclipse');
    firstPullRequestInfo.withRepo('che-operator');

    pullRequestInfos.push(firstPullRequestInfo);
    (pullRequestsHelper.getRecentMerged as jest.Mock).mockReturnValue(pullRequestInfos);

    const tagDefinitionsMap = new Map<string, TagDefinition[]>();
    const tagDefinitions: TagDefinition[] = [
      {
        committedDate: '2020-07-04',
        name: 'v7.17.0',
      },
    ];
    tagDefinitionsMap.set('eclipse/che-operator', tagDefinitions);

    (tagsHelper.getLatestTags as jest.Mock).mockReturnValue(tagDefinitionsMap);

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();

    expect(issueMilestoneHelper.setMilestone).toHaveBeenCalled();

    // get milestone
    const call = (issueMilestoneHelper.setMilestone as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('7.18');
    expect(call[1]).toBe(firstPullRequestInfo);
  });

  test('test merged into master before tag (so milestone = tag)', async () => {
    // limit the number to zero
    container.bind('number').toConstantValue(10).whenTargetNamed('MAX_SET_MILESTONE_PER_RUN');

    (podmanDesktopVersionFetcher.getVersion as jest.Mock).mockReturnValue('7.17.0');

    const pullRequestInfos: PullRequestInfo[] = [];

    const firstPullRequestInfo = new PullRequestInfo();
    firstPullRequestInfo.withMergingBranch('master');
    firstPullRequestInfo.withOwner('eclipse');
    firstPullRequestInfo.withRepo('che-operator');

    pullRequestInfos.push(firstPullRequestInfo);
    (pullRequestsHelper.getRecentMerged as jest.Mock).mockReturnValue(pullRequestInfos);

    const tagDefinitionsMap = new Map<string, TagDefinition[]>();
    const tagDefinitions: TagDefinition[] = [
      {
        committedDate: '2020-09-04',
        name: '7.17.0',
      },
    ];
    tagDefinitionsMap.set('eclipse/che-theia', tagDefinitions);

    (tagsHelper.getLatestTags as jest.Mock).mockReturnValue(tagDefinitionsMap);

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();

    expect(issueMilestoneHelper.setMilestone).toHaveBeenCalled();

    // get milestone
    const call = (issueMilestoneHelper.setMilestone as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('7.17');
    expect(call[1]).toBe(firstPullRequestInfo);
  });

  test('test merged into 7.16.x branch (so milestone = branch tag)', async () => {
    // limit the number to zero
    container.bind('number').toConstantValue(10).whenTargetNamed('MAX_SET_MILESTONE_PER_RUN');

    (podmanDesktopVersionFetcher.getVersion as jest.Mock).mockReturnValue('7.18.0');

    const pullRequestInfos: PullRequestInfo[] = [];

    const firstPullRequestInfo = new PullRequestInfo();
    firstPullRequestInfo.withMergingBranch('7.16.x');
    firstPullRequestInfo.withOwner('eclipse');
    firstPullRequestInfo.withRepo('che-theia');

    pullRequestInfos.push(firstPullRequestInfo);
    (pullRequestsHelper.getRecentMerged as jest.Mock).mockReturnValue(pullRequestInfos);

    const tagDefinitionsMap = new Map<string, TagDefinition[]>();
    const tagDefinitions: TagDefinition[] = [
      {
        committedDate: '2020-07-04',
        name: '7.17.0',
      },
      {
        committedDate: '2020-07-04',
        name: '7.16.0',
      },
      {
        committedDate: '2020-07-04',
        name: '7.16.1',
      },
    ];
    tagDefinitionsMap.set('eclipse/che-theia', tagDefinitions);

    (tagsHelper.getLatestTags as jest.Mock).mockReturnValue(tagDefinitionsMap);

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();

    expect(issueMilestoneHelper.setMilestone).toHaveBeenCalled();

    // get milestone
    const call = (issueMilestoneHelper.setMilestone as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('7.16');
    expect(call[1]).toBe(firstPullRequestInfo);
  });

  test('test merged into custom name branch (so no milestone set)', async () => {
    // limit the number to zero
    container.bind('number').toConstantValue(10).whenTargetNamed('MAX_SET_MILESTONE_PER_RUN');

    (podmanDesktopVersionFetcher.getVersion as jest.Mock).mockReturnValue('7.18.0');

    const pullRequestInfos: PullRequestInfo[] = [];

    const firstPullRequestInfo = new PullRequestInfo();
    firstPullRequestInfo.withMergingBranch('foobar');
    firstPullRequestInfo.withOwner('eclipse');
    firstPullRequestInfo.withRepo('che-theia');

    pullRequestInfos.push(firstPullRequestInfo);
    (pullRequestsHelper.getRecentMerged as jest.Mock).mockReturnValue(pullRequestInfos);

    const tagDefinitionsMap = new Map<string, TagDefinition[]>();
    const tagDefinitions: TagDefinition[] = [
      {
        committedDate: '2020-07-04',
        name: '7.17.0',
      },
      {
        committedDate: '2020-07-04',
        name: '7.16.0',
      },
      {
        committedDate: '2020-07-04',
        name: '7.16.1',
      },
    ];
    tagDefinitionsMap.set('eclipse/che-theia', tagDefinitions);

    (tagsHelper.getLatestTags as jest.Mock).mockReturnValue(tagDefinitionsMap);

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();

    expect(issueMilestoneHelper.setMilestone).toHaveBeenCalledTimes(0);
  });
});
