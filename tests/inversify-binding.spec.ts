import 'reflect-metadata';

import { AddLabelHelper } from '../src/helpers/add-label-helper';
import { Analysis } from '../src/analysis';
import { ApplyMilestoneOnPullRequestsLogic } from '../src/logic/apply-milestone-on-pull-requests-logic';
import { Container } from 'inversify';
import { Handler } from '../src/api/handler';
import { InversifyBinding } from '../src/inversify-binding';
import { IssueInfoBuilder } from '../src/info/issue-info';
import { IssuesHelper } from '../src/helpers/issue-helper';
import { Logic } from '../src/api/logic';
import { MilestoneHelper } from '../src/helpers/milestone-helper';
import { OctokitBuilder } from '../src/github/octokit-builder';
import { PodmanDesktopVersionFetcher } from '../src/fetchers/podman-desktop-version-fetcher';
import { PullRequestInfoBuilder } from '../src/info/pull-request-info';
import { PushHandler } from '../src/handler/push-handler';
import { PushListener } from '../src/api/push-listener';
import { ScheduleHandler } from '../src/handler/schedule-handler';
import { ScheduleListener } from '../src/api/schedule-listener';

describe('Test InversifyBinding', () => {
  test('test bindings', async () => {
    const inversifyBinding = new InversifyBinding('foo', 'bar');
    const container: Container = inversifyBinding.initBindings();

    expect(inversifyBinding).toBeDefined();

    // Handler
    const handlers: Handler[] = container.getAll(Handler);
    expect(handlers.find(handler => handler.constructor.name === ScheduleHandler.name)).toBeTruthy();
    expect(handlers.find(handler => handler.constructor.name === PushHandler.name)).toBeTruthy();

    const pushListeners: PushListener[] = container.getAll(PushListener);
    expect(pushListeners).toBeDefined();
    expect(pushListeners.find(listener => listener.constructor.name === ApplyMilestoneOnPullRequestsLogic.name)).toBeTruthy();

    // fetcher
    expect(container.get(PodmanDesktopVersionFetcher)).toBeDefined();

    // helpers
    expect(container.get(AddLabelHelper)).toBeDefined();
    expect(container.get(MilestoneHelper)).toBeDefined();
    expect(container.get(IssuesHelper)).toBeDefined();

    // check all info
    expect(container.get(IssueInfoBuilder)).toBeDefined();
    expect(container.get(PullRequestInfoBuilder)).toBeDefined();

    // logic
    const logics: Logic[] = container.getAll(Logic);
    expect(logics).toBeDefined();
    expect(logics.find(logic => logic.constructor.name === ApplyMilestoneOnPullRequestsLogic.name)).toBeTruthy();

    const octokitBuilder = container.get(OctokitBuilder);
    expect(octokitBuilder).toBeDefined();

    const analysis = container.get(Analysis);
    expect(analysis).toBeDefined();
  });
});
