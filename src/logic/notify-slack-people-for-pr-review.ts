import { inject, injectable } from 'inversify';

import { IssuesHelper } from '../helpers/issue-helper';
import { Logic } from '../api/logic';
import { PullRequestInfo } from '../info/pull-request-info';
import { PullRequestReviewsHelper } from '../helpers/pr-review-helper';
import { PushListener } from '../api/push-listener';
import { ScheduleListener } from '../api/schedule-listener';
import { SlackHelper } from '../helpers/slack-helper';
import { readFile } from 'node:fs/promises';
import { render } from 'mustache';
import { resolve } from 'node:path';

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

  private pullRequestsToReviewMustacheTemplate: string | undefined;
  private pullRequestsToReviewMustacheInfoTemplate: string | undefined;
  private pullRequestsToReviewMustacheReviewStateTemplate: string | undefined;
  private pullRequestsToReviewMustacheStatusStateTemplate: string | undefined;

  async wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  async execute(): Promise<void> {
    if (!this.pullRequestsToReviewMustacheTemplate) {
      const filePath = resolve(__dirname, '../../templates/pull-requests-to-review.mustache');
      this.pullRequestsToReviewMustacheTemplate = await readFile(filePath, 'utf-8');
    }
    if (!this.pullRequestsToReviewMustacheInfoTemplate) {
      const filePath = resolve(__dirname, '../../templates/pull-requests-to-review-pr-info.mustache');
      this.pullRequestsToReviewMustacheInfoTemplate = await readFile(filePath, 'utf-8');
    }
    if (!this.pullRequestsToReviewMustacheReviewStateTemplate) {
      const filePath = resolve(__dirname, '../../templates/pull-requests-to-review-pr-review-state.mustache');
      this.pullRequestsToReviewMustacheReviewStateTemplate = await readFile(filePath, 'utf-8');
    }
    if (!this.pullRequestsToReviewMustacheStatusStateTemplate) {
      const filePath = resolve(__dirname, '../../templates/pull-requests-to-review-pr-status-state.mustache');
      this.pullRequestsToReviewMustacheStatusStateTemplate = await readFile(filePath, 'utf-8');
    }

    // using graphql query, get all PR that a user needs to review
    // for each PR, get the user that needs to review it
    // send a message to the user

    const githubUsernames = ['amisskii', 'axel7083', 'benoitf', 'cbr7', 'cdrage', 'danivilla9', 'dgolovin', 'feloy', 'gastoner', 'jeffmaury', 'odockal', 'slemeur', 'ScrewTSW', 'SoniaSandler'];

    for (const githubUsername of githubUsernames) {
      await this.createOrUpdateReport(githubUsername);
    }
  }

  // add canvas or update the existing canvas for the user
  async createOrUpdateReport(githubUsername: string): Promise<void> {
    if (!this.pullRequestsToReviewMustacheTemplate) {
      console.error('Could not load the mustache templates');
      return;
    }
    const infoTemplate = this.pullRequestsToReviewMustacheInfoTemplate;
    if (!infoTemplate) {
      console.error('Could not load the mustache info template');
      return;
    }

    const slackUser = this.slackHelper.getMappedGitUserToSlackUser(githubUsername);

    if (!slackUser) {
      const errorMessage = `No slack user found for git username ${githubUsername}`;

      // notify admin
      await this.slackHelper.notifyAdmin(errorMessage);
      console.error(errorMessage);
      return;
    }

    const allRawPrs = await this.pullRequestReviewsHelper.getPullRequestsToReview(githubUsername);

    // need to adjust the age field to always have the same length
    // first, compute the max length of this field
    const maxAgeLength = allRawPrs.reduce((max, pr) => {
      return Math.max(max, pr.age.length);
    }, 0);

    // then adjust the age field by adding spaces in front of the field to have maxAgeLength characters
    allRawPrs.forEach(pr => {
      const currentLength = pr.age.length;
      const diff = maxAgeLength - currentLength;
      if (diff > 0) {
        pr.withAge(' '.repeat(diff) + pr.age);
      }
    });

    // sort by last time the PR was updated using the last commit date
    allRawPrs.sort((a, b) => {
      const dateA = new Date(a.lastCommitDate);
      const dateB = new Date(b.lastCommitDate);

      return dateA.getTime() - dateB.getTime();
    });

    // extract dependabot and non-dependabot PRs
    const DEPENDABOT_AUTHOR = 'dependabot';
    const allPrs = allRawPrs.map(prInfo => this.enhancePr(prInfo));
    const dependabotPrs = allRawPrs
      .filter(pr => pr.author === DEPENDABOT_AUTHOR)
      .map(prInfo => render(infoTemplate, this.enhancePr(prInfo)));
    const usersPrs = allRawPrs.filter(pr => pr.author !== DEPENDABOT_AUTHOR).map(prInfo => render(infoTemplate, this.enhancePr(prInfo)));

    const report = {
      username: githubUsername,
      allPrs,
      usersPrs,
      dependabotPrs,
    };

    // create the report content from the template
    const reportContent = render(this.pullRequestsToReviewMustacheTemplate, { report });

    // need to send the report to the user using canva

    await this.slackHelper.createOrUpdateCanvas(
      slackUser,
      `✨Pull Request Review Report for ${githubUsername}`,
      `for ${githubUsername}`,
      reportContent
    );
  }

  // try to make a short name from a repository name
  makeShortRepo(repo: string): string {
    if ('podman-desktop' === repo) {
      return 'PD';
    }

    // replace the word 'podman-desktop-extension' by the word 'ext' in repo string
    let shortRepo = repo.replace('podman-desktop-extension', 'ext');

    // replace the word 'podman-desktop-' by the word 'PD-' in repo string
    shortRepo = shortRepo.replace('podman-desktop-', 'PD-');

    // replace the word 'extension' by the word 'ext' in repo string
    shortRepo = shortRepo.replace('extension', 'ext');

    return shortRepo;
  }

  enhancePr(pr: PullRequestInfo): PullRequestInfoForMustache {
    const reviewStateTemplate = this.pullRequestsToReviewMustacheReviewStateTemplate;
    if (!reviewStateTemplate) {
      throw new Error('Could not load the mustache review state template');
    }

    const prReviewStateData = {
      isApproved: pr.reviewState === 'APPROVED',
      isChangesRequested: pr.reviewState === 'CHANGES_REQUESTED',
      isReviewRequired: pr.reviewState === 'REVIEW_REQUIRED',
      isPending: pr.reviewState === 'PENDING',
    };
    const reviewState = render(reviewStateTemplate, prReviewStateData);

    const statusStateTemplate = this.pullRequestsToReviewMustacheStatusStateTemplate;
    if (!statusStateTemplate) {
      throw new Error('Could not load the mustache status state template');
    }

    const prStatusData = {
      isSuccess: pr.statusState === 'SUCCESS',
      isFailure: pr.statusState === 'FAILURE',
      isError: pr.statusState === 'ERROR',
      isPending: pr.statusState === 'PENDING',
      isExpected: pr.statusState === 'EXPECTED',
      isUnexpected: pr.statusState === 'UNEXPECTED',
      isUnknown: pr.statusState === 'UNKNOWN',
    };
    const statusState = render(statusStateTemplate, prStatusData);

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
