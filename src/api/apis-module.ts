import { ContainerModule, interfaces } from 'inversify';

import { PushListener } from './push-listener';
import { ScheduleListener } from './schedule-listener';
import { bindMultiInjectProvider } from '../api/multi-inject-provider';

const apisModule = new ContainerModule((bind: interfaces.Bind) => {
  bindMultiInjectProvider(bind, ScheduleListener);
  bindMultiInjectProvider(bind, PushListener);
});

export { apisModule };
