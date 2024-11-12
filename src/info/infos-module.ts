import type { interfaces } from 'inversify';
import { ContainerModule } from 'inversify';

import { IssueInfoBuilder } from './issue-info';
import { PullRequestInfoBuilder } from './pull-request-info';
import { PullRequestInfoLinkedIssuesExtractor } from './pull-request-info-linked-issues-extractor';
import { StargazerInfoBuilder } from './stargazer-info';

const infosModule = new ContainerModule((bind: interfaces.Bind) => {
  bind(IssueInfoBuilder).toSelf().inSingletonScope();
  bind(PullRequestInfoBuilder).toSelf().inSingletonScope();
  bind(PullRequestInfoLinkedIssuesExtractor).toSelf().inSingletonScope();
  bind(StargazerInfoBuilder).toSelf().inSingletonScope();
});

export { infosModule };
