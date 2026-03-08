import { inject, injectable, named } from 'inversify';

@injectable()
export class RepositoriesHelper {
  getRepositoriesToWatch(): string[] {
    return [
      'containers/podman-desktop-extension-ai-lab',
      'containers/podman-desktop-extension-ai-lab-playground-images',
      'containers/podman-desktop-internal',
      'containers/podman-desktop-media',
      'redhat-developer/podman-desktop-redhat-account-ext',
      'redhat-developer/podman-desktop-ibmcloud-account-ext',
      'redhat-developer/podman-desktop-hummingbird-ext',
      'redhat-developer/podman-desktop-sandbox-ext',
      'redhat-developer/podman-desktop-rhel-ext',
      'redhat-developer/podman-desktop-demo',
      'redhat-developer/podman-desktop-catalog',
      'redhat-developer/podman-desktop-image-checker-openshift-ext',
      'redhat-developer/podman-desktop-redhat-lightspeed-ext',
      'redhat-developer/podman-desktop-redhat-pack-ext',
      'crc-org/crc-extension',
      'minc-org/minc-extension'
    ];
  }

  getOrganizationsToWatch(): string[] {
    const organizations = ['podman-desktop'];
    return organizations;
  }
}
