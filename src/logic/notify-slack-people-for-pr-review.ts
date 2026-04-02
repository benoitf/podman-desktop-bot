import { inject, injectable } from 'inversify';

import { IssuesHelper } from '/@/helpers/issue-helper';
import { Logic } from '/@/api/logic';
import { PullRequestInfo } from '/@/info/pull-request-info';
import { PullRequestReviewsHelper } from '/@/helpers/pr-review-helper';
import { PushListener } from '/@/api/push-listener';
import { ScheduleListener } from '/@/api/schedule-listener';
import { SlackHelper } from '/@/helpers/slack-helper';
import mustache from 'mustache';
import pullRequestsToReviewTemplate from '/@templates/pull-requests-to-review.mustache?raw';
import pullRequestsToReviewPrInfoTemplate from '/@templates/pull-requests-to-review-pr-info.mustache?raw';
import pullRequestsToReviewPrReviewStateTemplate from '/@templates/pull-requests-to-review-pr-review-state.mustache?raw';
import pullRequestsToReviewPrStatusStateTemplate from '/@templates/pull-requests-to-review-pr-status-state.mustache?raw';

interface PullRequestInfoForMustache {
  age: string;
  lastCommitDate: string;
  htmlLink: string;
  title: string;
  repo: string;
  shortRepo: string;
  author: string;
  isDependabot: boolean;
  reviewState: string;
  statusState: string;
}

@injectable()
export class NotifySlackPeoplePullRequestReviewLogic implements Logic, ScheduleListener, PushListener {
  @inject(IssuesHelper)
  private issuesHelper: IssuesHelper;

  @inject(PullRequestReviewsHelper)
  private pullRequestReviewsHelper: PullRequestReviewsHelper;

  @inject(SlackHelper)
  private slackHelper: SlackHelper;

  async wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  async execute(): Promise<void> {
    // Using graphql query, get all PR that a user needs to review
    // For each PR, get the user that needs to review it
    // Send a message to the user

    const githubUsernames = [
      'amisskii',
      'axel7083',
      'benoitf',
      'cbr7',
      'cdrage',
      'danivilla9',
      'deboer-tim',
      'dgolovin',
      'feloy',
      'gastoner',
      'jeffmaury',
      'jiridostal',
      'MarsKubeX',
      'nichjones1',
      'odockal',
      'serbangeorge-m',
      'simonrey1',
      'slemeur',
      'ScrewTSW',
      'SoniaSandler',
    ];

    for (const githubUsername of githubUsernames) {
      await this.createOrUpdateReport(githubUsername);
    }
  }

  // Add canvas or update the existing canvas for the user
  async createOrUpdateReport(githubUsername: string): Promise<void> {
    const slackUser = this.slackHelper.getMappedGitUserToSlackUser(githubUsername);

    if (!slackUser) {
      const errorMessage = `No slack user found for git username ${githubUsername}`;

      // Notify admin
      await this.slackHelper.notifyAdmin(errorMessage);
      console.error(errorMessage);
      return;
    }

    const allRawPrs = await this.pullRequestReviewsHelper.getPullRequestsToReview(githubUsername);

    // Need to adjust the age field to always have the same length
    // First, compute the max length of this field
    const maxAgeLength = allRawPrs.reduce((max, pr) => {
      return Math.max(max, pr.age.length);
    }, 0);

    // Then adjust the age field by adding spaces in front of the field to have maxAgeLength characters
    allRawPrs.forEach(pr => {
      const currentLength = pr.age.length;
      const diff = maxAgeLength - currentLength;
      if (diff > 0) {
        pr.withAge(' '.repeat(diff) + pr.age);
      }
    });

    // Sort by last time the PR was updated using the last commit date
    allRawPrs.sort((a, b) => {
      const dateA = new Date(a.lastCommitDate);
      const dateB = new Date(b.lastCommitDate);

      return dateA.getTime() - dateB.getTime();
    });

    // Extract dependabot and non-dependabot PRs
    const DEPENDABOT_AUTHOR = 'dependabot';
    const allPrs = allRawPrs.map(prInfo => this.enhancePr(prInfo));
    const dependabotPrs = allRawPrs
      .filter(pr => pr.author === DEPENDABOT_AUTHOR)
      .map(prInfo => mustache.render(pullRequestsToReviewPrInfoTemplate, this.enhancePr(prInfo)));
    const usersPrs = allRawPrs
      .filter(pr => pr.author !== DEPENDABOT_AUTHOR)
      .map(prInfo => mustache.render(pullRequestsToReviewPrInfoTemplate, this.enhancePr(prInfo)));

    const report = {
      username: githubUsername,
      allPrs,
      usersPrs,
      dependabotPrs,
    };

    // Create the report content from the template
    const reportContent = mustache.render(pullRequestsToReviewTemplate, { report });

    // Need to send the report to the user using canva

    await this.slackHelper.createOrUpdateCanvas(
      slackUser,
      `✨Pull Request Review Report for ${githubUsername}`,
      `for ${githubUsername}`,
      reportContent,
    );
  }

  // Try to make a short name from a repository name
  makeShortRepo(repo: string): string {
    if ('podman-desktop' === repo) {
      return 'PD';
    }

    // Replace the word 'podman-desktop-extension' by the word 'ext' in repo string
    let shortRepo = repo.replace('podman-desktop-extension', 'ext');

    // Replace the word 'podman-desktop-' by the word 'PD-' in repo string
    shortRepo = shortRepo.replace('podman-desktop-', 'PD-');

    // Replace the word 'extension' by the word 'ext' in repo string
    shortRepo = shortRepo.replace('extension', 'ext');

    return shortRepo;
  }

  enhancePr(pr: PullRequestInfo): PullRequestInfoForMustache {
    const prReviewStateData = {
      isApproved: pr.reviewState === 'APPROVED',
      isChangesRequested: pr.reviewState === 'CHANGES_REQUESTED',
      isReviewRequired: pr.reviewState === 'REVIEW_REQUIRED',
      isPending: pr.reviewState === 'PENDING',
    };
    const reviewState = mustache.render(pullRequestsToReviewPrReviewStateTemplate, prReviewStateData);

    const prStatusData = {
      isSuccess: pr.statusState === 'SUCCESS',
      isFailure: pr.statusState === 'FAILURE',
      isError: pr.statusState === 'ERROR',
      isPending: pr.statusState === 'PENDING',
      isExpected: pr.statusState === 'EXPECTED',
      isUnexpected: pr.statusState === 'UNEXPECTED',
      isUnknown: pr.statusState === 'UNKNOWN',
    };
    const statusState = mustache.render(pullRequestsToReviewPrStatusStateTemplate, prStatusData);

    const shortRepo = this.makeShortRepo(pr.repo);

    const pullRequestInfoForMustache: PullRequestInfoForMustache = {
      title: pr.title,
      htmlLink: pr.htmlLink,
      lastCommitDate: pr.lastCommitDate,
      repo: pr.repo,
      shortRepo,
      author: pr.author,
      age: pr.age,
      isDependabot: pr.author === 'dependabot',
      reviewState,
      statusState,
    };

    return pullRequestInfoForMustache;
  }
}
