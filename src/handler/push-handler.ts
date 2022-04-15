import { inject, injectable, named } from 'inversify';

import { Context } from '@actions/github/lib/context';
import { Handler } from '../api/handler';
import { MultiInjectProvider } from '../api/multi-inject-provider';
import { PushListener } from '../api/push-listener';

@injectable()
export class PushHandler implements Handler {
  @inject(MultiInjectProvider)
  @named(PushListener)
  protected readonly pushListeners: MultiInjectProvider<PushListener>;

  supports(eventName: string): boolean {
    return 'push' === eventName;
  }

  async handle(_eventName: string, context: Context): Promise<void> {
    // no payload for push
    await Promise.all(this.pushListeners.getAll().map(async pushListener => pushListener.execute(context.repo)));
  }
}
