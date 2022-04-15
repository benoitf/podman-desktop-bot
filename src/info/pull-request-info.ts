import { inject, injectable } from 'inversify';

import { IssueInfo } from './issue-info';
import { IssuesHelper } from '../helpers/issue-helper';
import { PullRequestInfoLinkedIssuesExtractor } from './pull-request-info-linked-issues-extractor';

export class PullRequestInfo extends IssueInfo {
  private __merged: boolean;
  private __mergingBranch: string;
  private __mergedAt: string;

  private __linkedIssues: IssueInfo[] = [];

  public withLinkedIssues(linkedIssues: IssueInfo[]): PullRequestInfo {
    this.__linkedIssues = linkedIssues;
    return this;
  }

  public withMergedState(merged: boolean): PullRequestInfo {
    this.__merged = merged;
    return this;
  }

  public withMergingBranch(mergingBranch: string): PullRequestInfo {
    this.__mergingBranch = mergingBranch;
    return this;
  }

  public withMergedAt(mergedAt: string): PullRequestInfo {
    this.__mergedAt = mergedAt;
    return this;
  }

  public get linkedIssues(): IssueInfo[] {
    return this.__linkedIssues;
  }

  public get mergingBranch(): string {
    return this.__mergingBranch;
  }

  public get mergedAt(): string {
    return this.__mergedAt;
  }

  public get merged(): boolean {
    return this.__merged;
  }
}

@injectable()
export class PullRequestInfoBuilder {
  @inject(PullRequestInfoLinkedIssuesExtractor)
  private pullRequestInfoLinkedIssuesExtractor: PullRequestInfoLinkedIssuesExtractor;

  @inject(IssuesHelper)
  private issuesHelper: IssuesHelper;

  async resolve(pullRequestInfo: PullRequestInfo): Promise<void> {
    const extractedLinkedIssues = this.pullRequestInfoLinkedIssuesExtractor.extract(pullRequestInfo);
    const linkedIssues: IssueInfo[] = [];
    // grab labels on the linked issues
    for await (const extractedLinkedIssue of extractedLinkedIssues) {
      const linkedIssueInfo = await this.issuesHelper.getIssue(extractedLinkedIssue);
      if (linkedIssueInfo) {
        linkedIssues.push(linkedIssueInfo);
      }
    }
    pullRequestInfo.withLinkedIssues(linkedIssues);
  }

  build(): PullRequestInfo {
    return new PullRequestInfo();
  }
}
