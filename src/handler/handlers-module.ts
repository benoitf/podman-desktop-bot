import type { interfaces } from 'inversify';
import { ContainerModule } from 'inversify';

import { Handler } from '../api/handler.js';
import { PushHandler } from './push-handler.js';
import { ScheduleHandler } from './schedule-handler.js';
import { bindMultiInjectProvider } from '../api/multi-inject-provider.js';

const handlersModule = new ContainerModule((bind: interfaces.Bind) => {
  bindMultiInjectProvider(bind, Handler);
  bind(Handler).to(ScheduleHandler).inSingletonScope();
  bind(Handler).to(PushHandler).inSingletonScope();
});

export { handlersModule };
