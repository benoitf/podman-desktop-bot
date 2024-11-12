import type { interfaces } from 'inversify';
import { ContainerModule } from 'inversify';

import { PushListener } from './push-listener.js';
import { ScheduleListener } from './schedule-listener.js';
import { bindMultiInjectProvider } from '../api/multi-inject-provider.js';

const apisModule = new ContainerModule((bind: interfaces.Bind) => {
  bindMultiInjectProvider(bind, ScheduleListener);
  bindMultiInjectProvider(bind, PushListener);
});

export { apisModule };
