import axios from 'axios';
import { injectable } from 'inversify';

@injectable()
export class PodmanDesktopVersionFetcher {
  public static readonly PODMAN_PACKAGE_JSON = 'https://raw.githubusercontent.com/containers/podman-desktop/main/package.json';

  private version: Promise<string | undefined>;

  async init(): Promise<string | undefined> {

    const response = await axios.get(PodmanDesktopVersionFetcher.PODMAN_PACKAGE_JSON);
    const data = response.data;
    return data.version;
  }

  public getVersion(): Promise<string | undefined> {
    if (!this.version) {
      this.version = this.init();
    }

    return this.version;
  }
}
