import { inject, injectable, named } from 'inversify';

import { Octokit } from '@octokit/rest';

@injectable()
export class AddLabelHelper {
  @inject('Octokit')
  @named('WRITE_TOKEN')
  private octokit: Octokit;

  // public async addLabel(labelsToAdd: string[], issueInfo: IssueInfo): Promise<void> {
  //   // filters labels already included
  //   const remainingLabelsToAdd = labelsToAdd.filter(label => !issueInfo.hasLabel(label));

  //   // if issue has already the label, do not trigger the add
  //   if (remainingLabelsToAdd.length === 0) {
  //     return;
  //   }

  //   const params: Octokit.IssuesAddLabelsParams = {
  //     // eslint-disable-next-line @typescript-eslint/camelcase
  //     issue_number: issueInfo.number,
  //     labels: remainingLabelsToAdd,
  //     owner: issueInfo.owner,
  //     repo: issueInfo.repo,
  //   };

  //   await this.octokit.issues.addLabels(params);
  // }
}
