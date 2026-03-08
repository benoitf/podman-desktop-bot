import * as semver from 'semver';

import { inject, injectable } from 'inversify';

import { Logic } from '../api/logic';
import { PullRequestInfo } from '../info/pull-request-info';
import { PullRequestReviewsHelper } from '../helpers/pr-review-helper';
import { PushListener } from '../api/push-listener';
import { ScheduleListener } from '../api/schedule-listener';

type Update = {
  component: string;
  from: string;
  to: string;
};

@injectable()
export class ApproveAndMergeDependabotPRLogic implements Logic, ScheduleListener, PushListener {
  @inject(PullRequestReviewsHelper)
  private pullRequestReviewsHelper: PullRequestReviewsHelper;

  async wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  async execute(): Promise<void> {
    // get all dependabot PRs that are open, not draft, with dependabot as author and that are green
    const pullRequests = await this.pullRequestReviewsHelper.getDependabotPullRequestsRequiringReviewAndPassingAllChecks();

    const validPullRequests: PullRequestInfo[] = [];
    console.log('+ Checking PRs to approve and merge, found', pullRequests.length, 'PRs in the need of a review and passing all checks');
    // now, use a regexp to get from /to from the title of the PR, and if it matches, approve and merge the PR
    for (const pullRequest of pullRequests) {
      const updates = this.parseDependabotUpdates(pullRequest);

      // if all updates are about a bugfix/patch or minor version updates, approve and merge the PR
      // use the semver package to check if the update is a patch or minor update
      if (
        updates.every(update => {
          const from = semver.parse(update.from);
          const to = semver.parse(update.to);
          if (!from || !to) {
            return false;
          }
          return semver.diff(from, to) === 'patch' || semver.diff(from, to) === 'minor';
        })
      ) {
        // approve and merge the PR
        console.log(
          ` -> Approving and merging PR ${pullRequest.htmlLink} as it includes only patch or minor updates ${updates
            .map(update => `${update.component} from ${update.from} to ${update.to}`)
            .join(', ')}`
        );
        validPullRequests.push(pullRequest);
      } else {
        console.log(
          ` -> Not approving PR ${pullRequest.htmlLink} as it includes major updates ${updates
            .map(update => `${update.component} from ${update.from} to ${update.to}`)
            .join(', ')}`
        );
      }
    }

    // ok now we have an array of valid pull requests, we can approve and merge them
    // but we should only approve it once per repository to avoid to have merge conflicts if
    // we approve multiple PRs on the same repository too quickly
    // so randomize the order of the PRs and only consolidate an array one at least 1 PR per repository, and approve and merge them with a delay of 1 minute between each approval/merge to give time to github to process the merge and avoid merge conflicts

    const shuffledPullRequests = validPullRequests.sort(() => 0.5 - Math.random());
    const pullRequestsToApproveAndMerge: PullRequestInfo[] = [];
    const repositories = new Set<string>();

    console.log('before PRs are', validPullRequests.length);

    for (const pullRequest of shuffledPullRequests) {
      if (!repositories.has(pullRequest.repo)) {
        pullRequestsToApproveAndMerge.push(pullRequest);
        repositories.add(pullRequest.repo);
      }
    }

    console.log(` -> Approving and merging ${pullRequestsToApproveAndMerge.length} PRs`);

    for (const pullRequest of pullRequestsToApproveAndMerge) {
      console.log(`   --> Approving PR ${pullRequest.htmlLink} : ${pullRequest.title}`);

      try {
        // set rebase auto merge method if not already in auto-merge mode
        if (!pullRequest.autoMergeEnabled) {
          console.log(`     --> Setting PR ${pullRequest.htmlLink} in auto-merge mode with rebase method`);
          await this.pullRequestReviewsHelper.setAutoMerge(pullRequest, 'REBASE');
        } else {
          console.log(`     --> PR ${pullRequest.htmlLink} is already in auto-merge mode, skipping setting auto-merge again`);
        }

        // approve the PR
        await this.pullRequestReviewsHelper.approvePullRequest(pullRequest);
        console.log(`     --> Approved PR ${pullRequest.htmlLink}`);
      } catch (error: unknown) {
        console.error(`   -->Error while setting auto-merge for PR ${pullRequest.htmlLink}:`, error);
      }
    }
  }

  parseDependabotUpdates(pullRequest: PullRequestInfo): Update[] {
    // if title is matching single pattern (not a group)
    // like: chore(deps): bump electron from 40.4.1 to 40.8.0
    // or deps-dev: chore(deps-dev): bump @biomejs/biome from 2.4.4 to 2.4.6

    const singleGroupPattern = /[Bb]ump ([^ ]+) from ([^ ]+) to ([^ ]+)$/;

    // return single Update from the component
    if (pullRequest.title.match(singleGroupPattern)) {
      const match = pullRequest.title.match(singleGroupPattern);
      if (match) {
        return [
          {
            component: match[1],
            from: match[2],
            to: match[3],
          },
        ];
      }
    }

    // if it's a group of updates
    if (pullRequest.title.includes(' group with ')) {
      const regex = /Updates\s+`([^`]+)`\s+from\s+([^\s]+)\s+to\s+([^\s]+)/g;

      const results: Update[] = [];

      for (const match of pullRequest.body.matchAll(regex)) {
        results.push({
          component: match[1],
          from: match[2],
          to: match[3],
        });
      }

      return results;
    } else {
      console.log(`PR ${pullRequest.htmlLink} has a title that does not match the expected patterns for dependabot updates`);
      return [];
    }
  }
}
