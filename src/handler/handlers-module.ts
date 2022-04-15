import { ContainerModule, interfaces } from 'inversify';

import { Handler } from '../api/handler';
import { PushHandler } from './push-handler';
import { ScheduleHandler } from './schedule-handler';
import { bindMultiInjectProvider } from '../api/multi-inject-provider';

const handlersModule = new ContainerModule((bind: interfaces.Bind) => {
  bindMultiInjectProvider(bind, Handler);
  bind(Handler).to(ScheduleHandler).inSingletonScope();
  bind(Handler).to(PushHandler).inSingletonScope();
});

export { handlersModule };
