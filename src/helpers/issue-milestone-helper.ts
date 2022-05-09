import { inject, injectable, named } from 'inversify';

import { GitHub } from '@actions/github/lib/utils';
import { IssueInfo } from '../info/issue-info';
import { PullRequestInfo } from '../info/pull-request-info';
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
type Octokit = InstanceType<typeof GitHub>;

@injectable()
export class IssueMilestoneHelper {
  @inject('Octokit')
  @named('WRITE_TOKEN')
  private octokitWrite: Octokit;

  @inject('Octokit')
  @named('READ_TOKEN')
  private octokitRead: Octokit;

  public async setMilestone(milestone: string, issueInfo: IssueInfo | PullRequestInfo): Promise<void> {
    // search if milestone is already defined

    // search milestone on the repo
    const issuesGetMilestonesParams: RestEndpointMethodTypes['issues']['listMilestones']['parameters'] = {
      per_page: 100,
      state: 'all',
      direction: 'desc',
      owner: issueInfo.owner,
      repo: issueInfo.repo,
    };

    const response = await this.octokitRead.rest.issues.listMilestones(issuesGetMilestonesParams);
    let githubMilestone = response.data.find(milestoneResponse => milestoneResponse.title === milestone);

    // not defined, create it
    if (!githubMilestone) {
      const issuesCreateMilestoneParams = {
        owner: issueInfo.owner,
        repo: issueInfo.repo,
        title: milestone,
      };
      const createMilestoneResponse = await this.octokitWrite.rest.issues.createMilestone(issuesCreateMilestoneParams);
      githubMilestone = createMilestoneResponse.data;
    }

    // Grab the number
    const milestoneNumber = githubMilestone?.number;

    // sets the milestone from the number
    const issuesUpdateParams = {
      // eslint-disable-next-line @typescript-eslint/camelcase
      owner: issueInfo.owner,
      repo: issueInfo.repo,
      milestone: milestoneNumber,
      // eslint-disable-next-line @typescript-eslint/camelcase
      issue_number: issueInfo.number,
    };
    await this.octokitWrite.rest.issues.update(issuesUpdateParams);
    console.log(`Set milestone to ${milestone} for pull request ${issueInfo.htmlLink}`);
  }
}
