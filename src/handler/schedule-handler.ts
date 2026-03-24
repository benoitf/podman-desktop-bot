import { Container, inject, injectable } from 'inversify';

import { context } from '@actions/github/lib/utils';
import { Handler } from '/@/api/handler';
import { ScheduleListener } from '/@/api/schedule-listener';

type Context = typeof context;

@injectable()
export class ScheduleHandler implements Handler {
  @inject(Container)
  protected readonly container: Container;

  supports(eventName: string): boolean {
    return 'schedule' === eventName || 'workflow_dispatch' === eventName;
  }

  async handle(_eventName: string, context: Context): Promise<void> {
    const allServices = this.container.isBound(ScheduleListener)
      ? await this.container.getAllAsync<ScheduleListener>(ScheduleListener)
      : [];
    // No payload for schedule
    await Promise.all(allServices.map(async listener => listener.execute(context.repo)));
  }
}
