import { ContainerModule, interfaces } from 'inversify';

import { AddLabelHelper } from './add-label-helper';
import { IssueMilestoneHelper } from './issue-milestone-helper';
import { IssuesHelper } from './issue-helper';
import { MilestoneHelper } from './milestone-helper';
import { ProjectsHelper } from './projects-helper';
import { PullRequestReviewsHelper } from './pr-review-helper';
import { PullRequestsHelper } from './pull-requests-helper';
import { SlackHelper } from './slack-helper';
import { StargazerHelper } from './stargazer-helper';
import { TagsHelper } from './tags-helper';

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
  bind(PullRequestReviewsHelper).toSelf().inSingletonScope();
});

export { helpersModule };
