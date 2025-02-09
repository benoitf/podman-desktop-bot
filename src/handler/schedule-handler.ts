import { inject, injectable, named } from 'inversify';

import { Context } from '@actions/github/lib/context';
import { Handler } from '../api/handler';
import { MultiInjectProvider } from '../api/multi-inject-provider';
import { ScheduleListener } from '../api/schedule-listener';

@injectable()
export class ScheduleHandler implements Handler {
  @inject(MultiInjectProvider)
  @named(ScheduleListener)
  protected readonly scheduleListeners: MultiInjectProvider<ScheduleListener>;

  supports(eventName: string): boolean {
    return 'schedule' === eventName;
  }

  async handle(_eventName: string, context: Context): Promise<void> {
    const allServices = await this.scheduleListeners.getAsyncAll();
    // no payload for schedule
    await Promise.all(allServices.map(async listener => listener.execute(context.repo)));
  }
}
