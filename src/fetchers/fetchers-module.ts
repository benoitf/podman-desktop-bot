import { ContainerModule } from 'inversify';

import { PodmanDesktopVersionFetcher } from './podman-desktop-version-fetcher';

const fetchersModule = new ContainerModule(({ bind }) => {
  bind(PodmanDesktopVersionFetcher).toSelf().inSingletonScope();
});

export { fetchersModule };
