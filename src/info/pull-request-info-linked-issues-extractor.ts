import { PullRequestInfo } from './pull-request-info';
import { injectable } from 'inversify';

@injectable()
export class PullRequestInfoLinkedIssuesExtractor {
  extract(pullRequestInfo: PullRequestInfo): string[] {
    const regexpBlock = /### What issues does this PR fix or reference\?.*?###/s;
    const result: RegExpExecArray | null = regexpBlock.exec(pullRequestInfo.body);
    // eslint-disable-next-line no-null/no-null
    if (result === null) {
      return [];
    }

    const txtBlock = result[0];

    const issuesFound: string[] = [];

    // now extract github issues from this block with full format
    const issueLongMatch = /https:\/\/github\.com\/.*?\/issues\/\d*/gm;
    let issueLongMatchResult: RegExpExecArray | null;

    // eslint-disable-next-line no-null/no-null
    while ((issueLongMatchResult = issueLongMatch.exec(txtBlock)) !== null) {
      issuesFound.push(issueLongMatchResult[0].replace('https://github.com/', 'https://api.github.com/repos/'));
    }

    // now extract github issues from short format
    const issueShortMatch = /#(\d+)/gm;
    let issueShortMatchResult: RegExpExecArray | null;

    // eslint-disable-next-line no-null/no-null
    while ((issueShortMatchResult = issueShortMatch.exec(txtBlock)) !== null) {
      const issue = `https://api.github.com/repos/${pullRequestInfo.owner}/${pullRequestInfo.repo}/issues/${issueShortMatchResult[1]}`;
      issuesFound.push(issue);
    }
    return issuesFound;
  }
}
