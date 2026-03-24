import { inject, injectable, named } from 'inversify';

import { GitHub } from '@actions/github/lib/utils';
import { IssueInfo } from '/@/info/issue-info';
import { PullRequestInfo } from '/@/info/pull-request-info';
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
    // Search if milestone is already defined

    // Search milestone on the repo
    const issuesGetMilestonesParams: RestEndpointMethodTypes['issues']['listMilestones']['parameters'] = {
      per_page: 100,
      state: 'all',
      direction: 'desc',
      owner: issueInfo.owner,
      repo: issueInfo.repo,
    };

    const response = await this.octokitRead.rest.issues.listMilestones(issuesGetMilestonesParams);
    let githubMilestone = response.data.find(milestoneResponse => milestoneResponse.title === milestone);

    // Not defined, create it
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

    // Sets the milestone from the number
    const issuesUpdateParams = {
      owner: issueInfo.owner,
      repo: issueInfo.repo,
      milestone: milestoneNumber,
      issue_number: issueInfo.number,
    };
    await this.octokitWrite.rest.issues.update(issuesUpdateParams);
    console.log(`Set milestone to ${milestone} for pull request ${issueInfo.htmlLink}`);
  }
}
