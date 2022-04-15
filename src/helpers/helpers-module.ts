import { ContainerModule, interfaces } from 'inversify';

import { AddLabelHelper } from './add-label-helper';
import { IssueMilestoneHelper } from './issue-milestone-helper';
import { IssuesHelper } from './issue-helper';
import { MilestoneHelper } from './milestone-helper';
import { PullRequestsHelper } from './pull-requests-helper';
import { TagsHelper } from './tags-helper';

const helpersModule = new ContainerModule((bind: interfaces.Bind) => {
  bind(AddLabelHelper).toSelf().inSingletonScope();
  bind(IssuesHelper).toSelf().inSingletonScope();
  bind(IssueMilestoneHelper).toSelf().inSingletonScope();
  bind(MilestoneHelper).toSelf().inSingletonScope();
  bind(PullRequestsHelper).toSelf().inSingletonScope();
  bind(TagsHelper).toSelf().inSingletonScope();
});

export { helpersModule };
