import { inject, injectable, named, postConstruct } from 'inversify';

import { GitHub } from '@actions/github/lib/utils';

const REPO_OWNER = 'benoitf';
const REPO_NAME = 'podman-desktop-bot';

@injectable()
export class GitHubVariablesHelper {
  @inject('Octokit')
  @named('WRITE_TOKEN')
  private octokitWrite: InstanceType<typeof GitHub>;

  private lastCheck: string = '';

  @postConstruct()
  async init(): Promise<void> {
    try {
      const response = await this.octokitWrite.rest.actions.getRepoVariable({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        name: 'LAST_CHECK',
      });
      this.lastCheck = response.data.value;
    } catch (error: any) {
      if (error.status !== 404) {
        throw error;
      }
    }
    console.log(`LAST_CHECK=${this.lastCheck}`);
  }

  getLastCheck(): string {
    return this.lastCheck;
  }

  async updateLastCheck(): Promise<void> {
    const value = new Date().toISOString();
    console.log(`Updating LAST_CHECK to ${value}`);
    try {
      await this.octokitWrite.rest.actions.updateRepoVariable({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        name: 'LAST_CHECK',
        value,
      });
    } catch (error: any) {
    console.log(`Error updating LAST_CHECK,`, error);
      if (error.status === 404) {
        await this.octokitWrite.rest.actions.createRepoVariable({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          name: 'LAST_CHECK',
          value,
        });
      } else {
        throw error;
      }
    }
  }
}
