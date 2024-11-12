import type { interfaces } from 'inversify';
import { ContainerModule } from 'inversify';

import { AddLabelHelper } from './add-label-helper.js';
import { IssueMilestoneHelper } from './issue-milestone-helper.js';
import { IssuesHelper } from './issue-helper.js';
import { MilestoneHelper } from './milestone-helper.js';
import { ProjectsHelper } from './projects-helper.js';
import { PullRequestsHelper } from './pull-requests-helper.js';
import { SlackHelper } from './slack-helper.js';
import { StargazerHelper } from './stargazer-helper.js';
import { TagsHelper } from './tags-helper.js';

const helpersModule = new ContainerModule((bind: interfaces.Bind) => {
  bind(AddLabelHelper).toSelf().inSingletonScope();
  bind(IssuesHelper).toSelf().inSingletonScope();
  bind(IssueMilestoneHelper).toSelf().inSingletonScope();
  bind(MilestoneHelper).toSelf().inSingletonScope();
  bind(PullRequestsHelper).toSelf().inSingletonScope();
  bind(TagsHelper).toSelf().inSingletonScope();
  bind(StargazerHelper).toSelf().inSingletonScope();
  bind(SlackHelper).toSelf().inSingletonScope();
  bind(ProjectsHelper).toSelf().inSingletonScope();
});

export { helpersModule };
