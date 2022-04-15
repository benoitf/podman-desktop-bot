import {getOctokit} from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';

type Octokit = InstanceType<typeof GitHub>;
import { injectable } from 'inversify';

@injectable()
export class OctokitBuilder {
  build(token: string): Octokit {
    return getOctokit(token);
  }
}
