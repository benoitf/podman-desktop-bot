import type { interfaces } from 'inversify';
import { ContainerModule } from 'inversify';

import { PodmanDesktopVersionFetcher } from './podman-desktop-version-fetcher.js';

const fetchersModule = new ContainerModule((bind: interfaces.Bind) => {
  bind(PodmanDesktopVersionFetcher).toSelf().inSingletonScope();
});

export { fetchersModule };
