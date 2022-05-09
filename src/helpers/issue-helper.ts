import { IssueInfo, IssueInfoBuilder } from '../info/issue-info';
import { inject, injectable, named } from 'inversify';

import { GitHub } from '@actions/github/lib/utils';
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
type Octokit = InstanceType<typeof GitHub>;

@injectable()
export class IssuesHelper {
  @inject(IssueInfoBuilder)
  private issueInfoBuilder: IssueInfoBuilder;

  @inject('Octokit')
  @named('READ_TOKEN')
  private octokit: Octokit;

  public async isFirstTime(issueInfo: IssueInfo): Promise<boolean> {
    const issuesListParams: RestEndpointMethodTypes['issues']['listForRepo']['parameters'] = {
      creator: issueInfo.author,
      state: 'all',
      owner: issueInfo.owner,
      repo: issueInfo.repo,
    };

    const response = await this.octokit.rest.issues.listForRepo(issuesListParams);
    return response.data.length === 0;
  }

  public async getIssue(issueLink: string): Promise<IssueInfo | undefined> {
    const parsingRegexp = /(?:\/repos\/)(.*)\/(.*)(?:\/issues\/)(\d+)/g;

    const parsing = parsingRegexp.exec(issueLink);

    // eslint-disable-next-line no-null/no-null
    if (parsing === null || parsing.length !== 4) {
      return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/camelcase
    const issueGetParam: RestEndpointMethodTypes['issues']['get']['parameters'] = {
      owner: parsing[1],
      repo: parsing[2],
      // eslint-disable-next-line @typescript-eslint/camelcase
      issue_number: parseInt(parsing[3]),
    };

    const response = await this.octokit.rest.issues.get(issueGetParam);
    const issueGetReponse = response.data;

    const labels: string[] = issueGetReponse.labels.map((label: any) => label?.name);

    return this.issueInfoBuilder
      .build()
      .withBody(issueGetReponse.body || '')
      .withAuthor(issueGetReponse.user?.login || '')
      .withHtmlLink(issueGetReponse.html_url)
      .withNumber(issueGetReponse.number)
      .withOwner(issueGetParam.owner)
      .withRepo(issueGetParam.repo)
      .withLabels(labels);
  }
}
