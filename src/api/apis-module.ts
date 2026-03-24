import { ContainerModule } from 'inversify';

const apisModule = new ContainerModule(() => {
  // Listeners are bound via logic-module service bindings
});

export { apisModule };
