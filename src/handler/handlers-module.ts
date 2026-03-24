import { ContainerModule } from 'inversify';

import { Handler } from '/@/api/handler';
import { PushHandler } from './push-handler';
import { ScheduleHandler } from './schedule-handler';

const handlersModule = new ContainerModule(({ bind }) => {
  bind(Handler).to(ScheduleHandler).inSingletonScope();
  bind(Handler).to(PushHandler).inSingletonScope();
});

export { handlersModule };
