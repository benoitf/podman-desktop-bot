import { GitHub } from '@actions/github/lib/utils';
import { getOctokit } from '@actions/github';
import { injectable } from 'inversify';

type Octokit = InstanceType<typeof GitHub>;

@injectable()
export class OctokitBuilder {
  build(token: string): Octokit {
    return getOctokit(token);
  }
}
