import { inject, injectable, named } from 'inversify';

import { Context } from '@actions/github/lib/context';
import { Handler } from './api/handler.js';
import { MultiInjectProvider } from './api/multi-inject-provider.js';

@injectable()
export class Analysis {
  @inject(MultiInjectProvider)
  @named(Handler)
  protected readonly handlers: MultiInjectProvider<Handler>;

  async analyze(context: Context): Promise<void> {
    for (const handler of this.handlers.getAll()) {
      if (handler.supports(context.eventName)) {
        await handler.handle(context.eventName, context, context.payload);
      }
    }
  }
}
