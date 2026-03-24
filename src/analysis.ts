import { Container, inject, injectable } from 'inversify';

import { context } from '@actions/github/lib/utils';
import { GitHubVariablesHelper } from './helpers/github-variables-helper';
import { Handler } from './api/handler';

type Context = typeof context;

@injectable()
export class Analysis {
  @inject(Container)
  protected readonly container: Container;

  @inject(GitHubVariablesHelper)
  private gitHubVariablesHelper: GitHubVariablesHelper;

  async analyze(context: Context): Promise<void> {
    const handlers = await this.container.getAllAsync<Handler>(Handler);
    for (const handler of handlers) {
      if (handler.supports(context.eventName)) {
        await handler.handle(context.eventName, context, context.payload);
      }
    }

    // Update timestamp after all handlers have run
    await this.gitHubVariablesHelper.updateLastCheck();
  }
}
