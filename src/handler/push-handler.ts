import { Container, inject, injectable } from 'inversify';

import { context } from '@actions/github/lib/utils';
import { Handler } from '/@/api/handler';
import { PushListener } from '/@/api/push-listener';

type Context = typeof context;

@injectable()
export class PushHandler implements Handler {
  @inject(Container)
  protected readonly container: Container;

  supports(eventName: string): boolean {
    return 'push' === eventName;
  }

  async handle(_eventName: string, context: Context): Promise<void> {
    const listeners = this.container.isBound(PushListener)
      ? await this.container.getAllAsync<PushListener>(PushListener)
      : [];
    // No payload for push
    await Promise.all(listeners.map(async pushListener => pushListener.execute(context.repo)));
  }
}
