/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-null/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from 'vitest';
import { PullRequestInfo } from '/@/info/pull-request-info';
import type { TagDefinition } from '/@/helpers/tags-helper';
import { TagsHelper } from '/@/helpers/tags-helper';

import { ApplyMilestoneOnPullRequestsLogic } from './apply-milestone-on-pull-requests-logic';
import { Container } from 'inversify';
import { IssueMilestoneHelper } from '/@/helpers/issue-milestone-helper';
import { PodmanDesktopVersionFetcher } from '/@/fetchers/podman-desktop-version-fetcher';
import { PullRequestsHelper } from '/@/helpers/pull-requests-helper';

describe('test Apply Milestone Logic', () => {
  let container: Container;
  let octokit: {
    rest: {
      issues: {
        createMilestone: Mock;
        updateMilestone: Mock;
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
      setMilestone: vi.fn<(...args: unknown[]) => unknown>(),
    } as any;
    pullRequestsHelper = {
      getRecentMerged: vi.fn<(...args: unknown[]) => unknown>(),
    } as any;
    podmanDesktopVersionFetcher = {
      getVersion: vi.fn<(...args: unknown[]) => unknown>(),
    } as any;

    tagsHelper = {
      getLatestTags: vi.fn<(...args: unknown[]) => unknown>(),
    } as any;

    container.bind(PodmanDesktopVersionFetcher).toConstantValue(podmanDesktopVersionFetcher);
    container.bind(IssueMilestoneHelper).toConstantValue(issueMilestoneHelper);
    container.bind(PullRequestsHelper).toConstantValue(pullRequestsHelper);
    container.bind(TagsHelper).toConstantValue(tagsHelper);
    container.bind(ApplyMilestoneOnPullRequestsLogic).toSelf().inSingletonScope();
    octokit = {
      rest: {
        issues: {
          createMilestone: vi.fn<(...args: unknown[]) => unknown>(),
          updateMilestone: vi.fn<(...args: unknown[]) => unknown>(),
        },
      },
    };

    container.bind('Octokit').toConstantValue(octokit);
    container.bind('string').toConstantValue('fooToken').whenNamed('GRAPHQL_READ_TOKEN');
  });

  afterEach(() => {
    vi.resetModules();
  });

  test('no che milestone', async () => {
    expect.assertions(1);

    container.bind('number').toConstantValue(50).whenNamed('MAX_SET_MILESTONE_PER_RUN');

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();

    expect(podmanDesktopVersionFetcher.getVersion).toHaveBeenCalledWith();
  });

  test('limit set to 0', async () => {
    expect.assertions(1);

    // Limit the number to zero
    container.bind('number').toConstantValue(0).whenNamed('MAX_SET_MILESTONE_PER_RUN');

    vi.mocked(podmanDesktopVersionFetcher.getVersion).mockReturnValue('7.17.0');

    const pullRequestInfos: PullRequestInfo[] = [];

    const firstPullRequestInfo = new PullRequestInfo();
    firstPullRequestInfo.withMergingBranch('main');
    firstPullRequestInfo.withOwner('eclipse');
    firstPullRequestInfo.withRepo('che-theia');

    pullRequestInfos.push(firstPullRequestInfo);
    vi.mocked(pullRequestsHelper.getRecentMerged).mockReturnValue(pullRequestInfos);

    vi.mocked(tagsHelper.getLatestTags).mockReturnValue(new Map());

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();

    // Check we never call setMilestone as we limit the number of milestones
    expect(issueMilestoneHelper.setMilestone).toHaveBeenCalledTimes(0);
  });

  test('merged into main', async () => {
    expect.assertions(1);

    // Limit the number to zero
    container.bind('number').toConstantValue(10).whenNamed('MAX_SET_MILESTONE_PER_RUN');

    vi.mocked(podmanDesktopVersionFetcher.getVersion).mockReturnValue('7.17.0');

    const pullRequestInfos: PullRequestInfo[] = [];

    const firstPullRequestInfo = new PullRequestInfo();
    firstPullRequestInfo.withMergingBranch('main');
    firstPullRequestInfo.withOwner('eclipse');
    firstPullRequestInfo.withRepo('che-theia');

    pullRequestInfos.push(firstPullRequestInfo);
    vi.mocked(pullRequestsHelper.getRecentMerged).mockReturnValue(pullRequestInfos);

    vi.mocked(tagsHelper.getLatestTags).mockReturnValue(new Map());

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();

    expect(issueMilestoneHelper.setMilestone).toHaveBeenCalledWith('7.17.0', firstPullRequestInfo);
  });

  test('merged into main but no che milestone found', async () => {
    expect.assertions(1);

    // Limit the number to zero
    container.bind('number').toConstantValue(10).whenNamed('MAX_SET_MILESTONE_PER_RUN');

    vi.mocked(podmanDesktopVersionFetcher.getVersion).mockReturnValue('a.b.c');

    const pullRequestInfos: PullRequestInfo[] = [];

    const firstPullRequestInfo = new PullRequestInfo();
    firstPullRequestInfo.withMergingBranch('main');
    firstPullRequestInfo.withOwner('eclipse');
    firstPullRequestInfo.withRepo('che-theia');

    pullRequestInfos.push(firstPullRequestInfo);
    vi.mocked(pullRequestsHelper.getRecentMerged).mockReturnValue(pullRequestInfos);

    vi.mocked(tagsHelper.getLatestTags).mockReturnValue(new Map());

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();

    expect(issueMilestoneHelper.setMilestone).toHaveBeenCalledTimes(0);
  });

  test('merged into main after tag (so milestone = tag + 1 minor)', async () => {
    expect.assertions(1);

    // Limit the number to zero
    container.bind('number').toConstantValue(10).whenNamed('MAX_SET_MILESTONE_PER_RUN');

    vi.mocked(podmanDesktopVersionFetcher.getVersion).mockReturnValue('7.17.0');

    const pullRequestInfos: PullRequestInfo[] = [];

    const firstPullRequestInfo = new PullRequestInfo();
    firstPullRequestInfo.withMergingBranch('main');
    firstPullRequestInfo.withOwner('eclipse');
    firstPullRequestInfo.withRepo('che-theia');

    pullRequestInfos.push(firstPullRequestInfo);
    vi.mocked(pullRequestsHelper.getRecentMerged).mockReturnValue(pullRequestInfos);

    const tagDefinitionsMap = new Map<string, TagDefinition[]>();
    const tagDefinitions: TagDefinition[] = [
      {
        committedDate: '2020-07-04',
        name: '7.17.0',
      },
    ];
    tagDefinitionsMap.set('eclipse/che-theia', tagDefinitions);

    vi.mocked(tagsHelper.getLatestTags).mockReturnValue(tagDefinitionsMap);

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();

    expect(issueMilestoneHelper.setMilestone).toHaveBeenCalledWith('7.18', firstPullRequestInfo);
  });

  test('merged into main before tag (so milestone = tag )', async () => {
    expect.assertions(1);

    // Limit the number to zero
    container.bind('number').toConstantValue(10).whenNamed('MAX_SET_MILESTONE_PER_RUN');

    vi.mocked(podmanDesktopVersionFetcher.getVersion).mockReturnValue('7.17.0');

    const pullRequestInfos: PullRequestInfo[] = [];

    const firstPullRequestInfo = new PullRequestInfo()
      .withMergingBranch('main')
      .withOwner('eclipse')
      .withRepo('che-theia')
      .withMergedAt('2020-06-04');

    pullRequestInfos.push(firstPullRequestInfo);
    vi.mocked(pullRequestsHelper.getRecentMerged).mockReturnValue(pullRequestInfos);

    const tagDefinitionsMap = new Map<string, TagDefinition[]>();
    const tagDefinitions: TagDefinition[] = [
      {
        committedDate: '2020-07-04',
        name: '7.17.0',
      },
    ];
    tagDefinitionsMap.set('eclipse/che-theia', tagDefinitions);

    vi.mocked(tagsHelper.getLatestTags).mockReturnValue(tagDefinitionsMap);

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();

    expect(issueMilestoneHelper.setMilestone).toHaveBeenCalledWith('7.17', firstPullRequestInfo);
  });

  test('merged into main after tag (so milestone = tag + 1 minor) but different layout of tags', async () => {
    expect.assertions(1);

    // Limit the number to zero
    container.bind('number').toConstantValue(10).whenNamed('MAX_SET_MILESTONE_PER_RUN');

    vi.mocked(podmanDesktopVersionFetcher.getVersion).mockReturnValue('7.17.0');

    const pullRequestInfos: PullRequestInfo[] = [];

    const firstPullRequestInfo = new PullRequestInfo();
    firstPullRequestInfo.withMergingBranch('main');
    firstPullRequestInfo.withOwner('eclipse');
    firstPullRequestInfo.withRepo('che-operator');

    pullRequestInfos.push(firstPullRequestInfo);
    vi.mocked(pullRequestsHelper.getRecentMerged).mockReturnValue(pullRequestInfos);

    const tagDefinitionsMap = new Map<string, TagDefinition[]>();
    const tagDefinitions: TagDefinition[] = [
      {
        committedDate: '2020-07-04',
        name: 'v7.17.0',
      },
    ];
    tagDefinitionsMap.set('eclipse/che-operator', tagDefinitions);

    vi.mocked(tagsHelper.getLatestTags).mockReturnValue(tagDefinitionsMap);

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();

    expect(issueMilestoneHelper.setMilestone).toHaveBeenCalledWith('7.18', firstPullRequestInfo);
  });

  test('merged into main before tag (so milestone = tag)', async () => {
    expect.assertions(1);

    // Limit the number to zero
    container.bind('number').toConstantValue(10).whenNamed('MAX_SET_MILESTONE_PER_RUN');

    vi.mocked(podmanDesktopVersionFetcher.getVersion).mockReturnValue('7.17.0');

    const pullRequestInfos: PullRequestInfo[] = [];

    const firstPullRequestInfo = new PullRequestInfo()
      .withMergingBranch('main')
      .withOwner('eclipse')
      .withRepo('che-operator')
      .withMergedAt('2020-08-01');

    pullRequestInfos.push(firstPullRequestInfo);
    vi.mocked(pullRequestsHelper.getRecentMerged).mockReturnValue(pullRequestInfos);

    const tagDefinitionsMap = new Map<string, TagDefinition[]>();
    const tagDefinitions: TagDefinition[] = [
      {
        committedDate: '2020-09-04',
        name: '7.17.0',
      },
    ];
    tagDefinitionsMap.set('eclipse/che-operator', tagDefinitions);

    vi.mocked(tagsHelper.getLatestTags).mockReturnValue(tagDefinitionsMap);

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();

    expect(issueMilestoneHelper.setMilestone).toHaveBeenCalledWith('7.17', firstPullRequestInfo);
  });

  test('merged into 7.16.x branch (so milestone = branch tag)', async () => {
    expect.assertions(1);

    // Limit the number to zero
    container.bind('number').toConstantValue(10).whenNamed('MAX_SET_MILESTONE_PER_RUN');

    vi.mocked(podmanDesktopVersionFetcher.getVersion).mockReturnValue('7.18.0');

    const pullRequestInfos: PullRequestInfo[] = [];

    const firstPullRequestInfo = new PullRequestInfo();
    firstPullRequestInfo.withMergingBranch('7.16.x');
    firstPullRequestInfo.withOwner('eclipse');
    firstPullRequestInfo.withRepo('che-theia');

    pullRequestInfos.push(firstPullRequestInfo);
    vi.mocked(pullRequestsHelper.getRecentMerged).mockReturnValue(pullRequestInfos);

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

    vi.mocked(tagsHelper.getLatestTags).mockReturnValue(tagDefinitionsMap);

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();

    expect(issueMilestoneHelper.setMilestone).toHaveBeenCalledWith('7.16.0', firstPullRequestInfo);
  });

  test('merged into custom name branch (so no milestone set)', async () => {
    expect.assertions(1);

    // Limit the number to zero
    container.bind('number').toConstantValue(10).whenNamed('MAX_SET_MILESTONE_PER_RUN');

    vi.mocked(podmanDesktopVersionFetcher.getVersion).mockReturnValue('7.18.0');

    const pullRequestInfos: PullRequestInfo[] = [];

    const firstPullRequestInfo = new PullRequestInfo();
    firstPullRequestInfo.withMergingBranch('foobar');
    firstPullRequestInfo.withOwner('eclipse');
    firstPullRequestInfo.withRepo('che-theia');

    pullRequestInfos.push(firstPullRequestInfo);
    vi.mocked(pullRequestsHelper.getRecentMerged).mockReturnValue(pullRequestInfos);

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

    vi.mocked(tagsHelper.getLatestTags).mockReturnValue(tagDefinitionsMap);

    const syncMilestoneLogic = container.get(ApplyMilestoneOnPullRequestsLogic);

    await syncMilestoneLogic.execute();

    expect(issueMilestoneHelper.setMilestone).toHaveBeenCalledTimes(0);
  });
});
