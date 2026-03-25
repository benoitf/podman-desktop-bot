import type { GitHub } from '@actions/github/lib/utils';
import { inject, injectable, named } from 'inversify';

type Octokit = InstanceType<typeof GitHub>;

@injectable()
export class RequiredChecksHelper {
  @inject('Octokit')
  @named('READ_TOKEN')
  private octokit: Octokit;

  async getRequiredChecks(owner: string, repo: string, branch: string): Promise<Set<string>> {
    try {
      const response = await this.octokit.rest.repos.getBranchProtection({
        owner,
        repo,
        branch,
      });
      const checks = response.data.required_status_checks?.checks ?? [];
      return new Set(checks.map(check => check.context));
    } catch {
      // Branch protection may not be configured or accessible
      return new Set();
    }
  }
}
