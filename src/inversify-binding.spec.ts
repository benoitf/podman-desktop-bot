import { describe, expect, test, vi } from 'vitest';
import { AddLabelHelper } from './helpers/add-label-helper';
import { Analysis } from './analysis';
import { ApplyMilestoneOnPullRequestsLogic } from './logic/apply-milestone-on-pull-requests-logic';
import type { Container } from 'inversify';
import { Handler } from './api/handler';
import { InversifyBinding } from './inversify-binding';
import { IssueInfoBuilder } from './info/issue-info';
import { IssuesHelper } from './helpers/issue-helper';
import { Logic } from './api/logic';
import { MilestoneHelper } from './helpers/milestone-helper';
import { OctokitBuilder } from './github/octokit-builder';
import { PodmanDesktopVersionFetcher } from './fetchers/podman-desktop-version-fetcher';
import { PullRequestInfoBuilder } from './info/pull-request-info';
import { PushHandler } from './handler/push-handler';
import { PushListener } from './api/push-listener';
import { ScheduleHandler } from './handler/schedule-handler';

// @ts-expect-error partial mock factory
vi.mock(import('@slack/web-api'), () => ({
  WebClient: class {
    auth = {
      test: vi.fn<(...args: unknown[]) => unknown>().mockResolvedValue({
        user_id: 'test-user',
        bot_id: 'test-bot',
        team_id: 'test-team',
        url: 'https://slack.test/',
      }),
    };
    chat = { postMessage: vi.fn<(...args: unknown[]) => unknown>() };
  },
}));

// @ts-expect-error partial mock factory
vi.mock(import('@actions/github'), () => ({
  getOctokit: vi.fn<(...args: unknown[]) => unknown>().mockReturnValue({
    rest: {
      actions: {
        getRepoVariable: vi.fn<(...args: unknown[]) => unknown>().mockResolvedValue({ data: { value: '' } }),
        updateRepoVariable: vi.fn<(...args: unknown[]) => unknown>().mockResolvedValue({}),
        createRepoVariable: vi.fn<(...args: unknown[]) => unknown>().mockResolvedValue({}),
      },
      issues: {
        createMilestone: vi.fn<(...args: unknown[]) => unknown>(),
        updateMilestone: vi.fn<(...args: unknown[]) => unknown>(),
        listForRepo: vi.fn<(...args: unknown[]) => unknown>(),
        get: vi.fn<(...args: unknown[]) => unknown>(),
      },
    },
  }),
  context: {},
}));

describe('test InversifyBinding', () => {
  test('bindings', async () => {
    expect.assertions(15);

    const inversifyBinding = new InversifyBinding('foo', 'bar', 'https://slack', 'slack-token');
    const container: Container = await inversifyBinding.initBindings();

    expect(inversifyBinding).toBeDefined();

    // Handler
    const handlers: Handler[] = await container.getAllAsync(Handler);

    expect(handlers.find(handler => handler.constructor.name === ScheduleHandler.name)).toBeDefined();
    expect(handlers.find(handler => handler.constructor.name === PushHandler.name)).toBeDefined();

    const pushListeners: PushListener[] = await container.getAllAsync(PushListener);

    expect(pushListeners).toBeDefined();
    expect(
      pushListeners.find(listener => listener.constructor.name === ApplyMilestoneOnPullRequestsLogic.name),
    ).toBeDefined();

    // Fetcher
    await expect(container.getAsync(PodmanDesktopVersionFetcher)).resolves.toBeDefined();

    // Helpers
    await expect(container.getAsync(AddLabelHelper)).resolves.toBeDefined();
    await expect(container.getAsync(MilestoneHelper)).resolves.toBeDefined();
    await expect(container.getAsync(IssuesHelper)).resolves.toBeDefined();

    // Check all info
    await expect(container.getAsync(IssueInfoBuilder)).resolves.toBeDefined();
    await expect(container.getAsync(PullRequestInfoBuilder)).resolves.toBeDefined();

    // Logic
    const logics: Logic[] = await container.getAllAsync(Logic);

    expect(logics).toBeDefined();
    expect(logics.find(logic => logic.constructor.name === ApplyMilestoneOnPullRequestsLogic.name)).toBeDefined();

    const octokitBuilder = await container.getAsync(OctokitBuilder);

    expect(octokitBuilder).toBeDefined();

    const analysis = await container.getAsync(Analysis);

    expect(analysis).toBeDefined();
  });
});
