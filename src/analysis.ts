import { inject, injectable, named } from 'inversify';

import { Context } from '@actions/github/lib/context';
import { GitHubVariablesHelper } from './helpers/github-variables-helper';
import { Handler } from './api/handler';
import { MultiInjectProvider } from './api/multi-inject-provider';

@injectable()
export class Analysis {
  @inject(MultiInjectProvider)
  @named(Handler)
  protected readonly handlers: MultiInjectProvider<Handler>;

  @inject(GitHubVariablesHelper)
  private gitHubVariablesHelper: GitHubVariablesHelper;

  async analyze(context: Context): Promise<void> {
    const handlers = await this.handlers.getAsyncAll();
    for await (const handler of handlers) {
      if (handler.supports(context.eventName)) {
        await handler.handle(context.eventName, context, context.payload);
      }
    }

    // Update timestamp after all handlers have run
    await this.gitHubVariablesHelper.updateLastCheck();
  }
}
