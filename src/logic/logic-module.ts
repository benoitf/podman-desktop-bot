import { ContainerModule, interfaces } from 'inversify';

import { ApplyMilestoneOnPullRequestsLogic } from './apply-milestone-on-pull-requests-logic';
import { ApplyProjectsOnIssuesLogic } from './apply-issue-in-backlog-projects';
import { ApplyTriageOnIssuesLogic } from './apply-triage-on-issues-logic';
import { Logic } from '../api/logic';
import { NotifyLatestStargazersLogic } from './notify-latest-stargazers-logic';
import { NotifySlackPeoplePullRequestReviewLogic } from './notify-slack-people-for-pr-review';
import { PushListener } from '../api/push-listener';
import { ScheduleListener } from '../api/schedule-listener';
import { bindMultiInjectProvider } from '../api/multi-inject-provider';

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

  bind(NotifySlackPeoplePullRequestReviewLogic).to(NotifySlackPeoplePullRequestReviewLogic).inSingletonScope();
  bind(ScheduleListener).toService(NotifySlackPeoplePullRequestReviewLogic);
  bind(PushListener).toService(NotifySlackPeoplePullRequestReviewLogic);
  bind(Logic).toService(NotifySlackPeoplePullRequestReviewLogic);
});

export { logicModule };
