import { ContainerModule, interfaces } from 'inversify';

import { ApplyMilestoneOnPullRequestsLogic } from './apply-milestone-on-pull-requests-logic';
import { Logic } from '../api/logic';
import { PushListener } from '../api/push-listener';
import { ScheduleListener } from '../api/schedule-listener';
import { bindMultiInjectProvider } from '../api/multi-inject-provider';

const logicModule = new ContainerModule((bind: interfaces.Bind) => {
  bindMultiInjectProvider(bind, Logic);

  bind(ApplyMilestoneOnPullRequestsLogic).to(ApplyMilestoneOnPullRequestsLogic).inSingletonScope();
  bind(ScheduleListener).toService(ApplyMilestoneOnPullRequestsLogic);
  bind(PushListener).toService(ApplyMilestoneOnPullRequestsLogic);
  bind(Logic).toService(ApplyMilestoneOnPullRequestsLogic);
});

export { logicModule };
