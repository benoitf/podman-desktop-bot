import { injectable } from 'inversify';

@injectable()
export class PodmanDesktopVersionFetcher {
  public static readonly PODMAN_PACKAGE_JSON =
    'https://raw.githubusercontent.com/podman-desktop/podman-desktop/main/package.json';

  private version: Promise<string | undefined> | undefined;

  async init(): Promise<string | undefined> {
    const response = await fetch(PodmanDesktopVersionFetcher.PODMAN_PACKAGE_JSON);
    if (!response.ok) {
      throw new Error(`Failed to fetch package.json with status ${response.status}`);
    }
    const data = await response.json();
    return data.version;
  }

  public getVersion(): Promise<string | undefined> {
    this.version ??= this.init();

    return this.version;
  }
}
