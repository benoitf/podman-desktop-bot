import type { interfaces } from 'inversify';
import { ContainerModule } from 'inversify';

import { ApplyMilestoneOnPullRequestsLogic } from './apply-milestone-on-pull-requests-logic.js';
import { ApplyProjectsOnIssuesLogic } from './apply-issue-in-backlog-projects.js';
import { ApplyTriageOnIssuesLogic } from './apply-triage-on-issues-logic.js';
import { Logic } from '../api/logic.js';
import { NotifyLatestStargazersLogic } from './notify-latest-stargazers-logic.js';
import { PushListener } from '../api/push-listener.js';
import { ScheduleListener } from '../api/schedule-listener.js';
import { bindMultiInjectProvider } from '../api/multi-inject-provider.js';

const logicModule = new ContainerModule((bind: interfaces.Bind) => {
  bindMultiInjectProvider(bind, Logic);

  bind(ApplyProjectsOnIssuesLogic).to(ApplyProjectsOnIssuesLogic).inSingletonScope();
  bind(ScheduleListener).toService(ApplyProjectsOnIssuesLogic);
  bind(PushListener).toService(ApplyProjectsOnIssuesLogic);
  bind(Logic).toService(ApplyProjectsOnIssuesLogic);

  bind(ApplyTriageOnIssuesLogic).to(ApplyTriageOnIssuesLogic).inSingletonScope();
  bind(ScheduleListener).toService(ApplyTriageOnIssuesLogic);
  bind(PushListener).toService(ApplyTriageOnIssuesLogic);
  bind(Logic).toService(ApplyTriageOnIssuesLogic);

  bind(ApplyMilestoneOnPullRequestsLogic).to(ApplyMilestoneOnPullRequestsLogic).inSingletonScope();
  bind(ScheduleListener).toService(ApplyMilestoneOnPullRequestsLogic);
  bind(PushListener).toService(ApplyMilestoneOnPullRequestsLogic);
  bind(Logic).toService(ApplyMilestoneOnPullRequestsLogic);

  bind(NotifyLatestStargazersLogic).to(NotifyLatestStargazersLogic).inSingletonScope();
  bind(ScheduleListener).toService(NotifyLatestStargazersLogic);
  bind(PushListener).toService(NotifyLatestStargazersLogic);
  bind(Logic).toService(NotifyLatestStargazersLogic);
});

export { logicModule };
