import { ContainerModule, interfaces } from 'inversify';

import { PodmanDesktopVersionFetcher } from './podman-desktop-version-fetcher';

const fetchersModule = new ContainerModule((bind: interfaces.Bind) => {
  bind(PodmanDesktopVersionFetcher).toSelf().inSingletonScope();
});

export { fetchersModule };
