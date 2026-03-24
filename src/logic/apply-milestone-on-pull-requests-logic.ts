import moment from 'moment';
import semver from 'semver';

import { TagDefinition, TagsHelper } from '/@/helpers/tags-helper';
import { inject, injectable, named } from 'inversify';

import { IssueMilestoneHelper } from '/@/helpers/issue-milestone-helper';
import { Logic } from '/@/api/logic';
import { PodmanDesktopVersionFetcher } from '/@/fetchers/podman-desktop-version-fetcher';
import { PullRequestInfo } from '/@/info/pull-request-info';
import { PullRequestsHelper } from '/@/helpers/pull-requests-helper';
import { PushListener } from '/@/api/push-listener';
import { ScheduleListener } from '/@/api/schedule-listener';

export interface MilestoneDefinition {
  pullRequestInfo: PullRequestInfo;
  milestone: string;
}

@injectable()
export class ApplyMilestoneOnPullRequestsLogic implements Logic, ScheduleListener, PushListener {
  @inject('number')
  @named('MAX_SET_MILESTONE_PER_RUN')
  private maxSetMilestonePerRun: number;

  @inject(IssueMilestoneHelper)
  private issueMilestoneHelper: IssueMilestoneHelper;

  @inject(PullRequestsHelper)
  private pullRequestsHelper: PullRequestsHelper;

  @inject(PodmanDesktopVersionFetcher)
  private podmanDesktopVersionFetcher: PodmanDesktopVersionFetcher;

  @inject(TagsHelper)
  private tagsHelper: TagsHelper;

  async wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  async execute(): Promise<void> {
    const milestonesToSet: MilestoneDefinition[] = [];

    // Grab current milestone
    const currentMilestone = await this.podmanDesktopVersionFetcher.getVersion();
    if (!currentMilestone) {
      console.log('Aborting as currentMilestone is not defined');
      return;
    }

    // Get all PR without milestone
    const recentPullRequestsWithoutMilestone: PullRequestInfo[] = await this.pullRequestsHelper.getRecentMerged(
      moment.duration(1, 'hour'),
    );

    const latestTags: Map<string, TagDefinition[]> = await this.tagsHelper.getLatestTags();

    // Now that we have, pull request
    recentPullRequestsWithoutMilestone.forEach(pullRequest => {
      const entry: MilestoneDefinition = {
        pullRequestInfo: pullRequest,
        milestone: '',
      };

      const targetBranch = pullRequest.mergingBranch;
      const nameWithOwner = `${pullRequest.owner}/${pullRequest.repo}`;

      if (targetBranch === 'main') {
        // Check if tag exists (for example during the day of the release it might happen that repo is  not sync)
        const tagDefinitions = latestTags.get(nameWithOwner);
        let tagDefinition;
        if (tagDefinitions) {
          // Use tag with version or with v prefix
          tagDefinition = tagDefinitions.find(tag => {
            if (tag.name.startsWith('v')) {
              return tag.name.substring(1) === currentMilestone;
            } else {
              return tag.name === currentMilestone;
            }
          });
        }

        const podmanDesktopSemverVersion = semver.coerce(currentMilestone);
        // eslint-disable-next-line no-null/no-null
        if (podmanDesktopSemverVersion === null) {
          console.log(
            `Ignore pull request ${pullRequest.htmlLink} as podman desktop version is not semver ${currentMilestone}`,
          );
          return;
        }

        if (tagDefinition) {
          // Grab date of milestone tag
          const tagDate = moment(tagDefinition.committedDate);
          const mergedDate = moment(pullRequest.mergedAt);

          // Merged before the tag
          if (mergedDate < tagDate) {
            // Set milestone to version of the tag
            entry.milestone = `${podmanDesktopSemverVersion.major}.${podmanDesktopSemverVersion.minor}`;
          } else {
            // Merged after the tag in master : milestone = version + 1
            entry.milestone = `${podmanDesktopSemverVersion.major}.${podmanDesktopSemverVersion.minor + 1}`;
          }
          milestonesToSet.push(entry);
        } else {
          // Main branch is not being tagged, can apply current milestone
          const targetMilestone = `${podmanDesktopSemverVersion.major}.${podmanDesktopSemverVersion.minor}.${podmanDesktopSemverVersion.patch}`;
          entry.milestone = targetMilestone;
          milestonesToSet.push(entry);
        }
      } else {
        // It's in a branch
        const firstDigitBranch = targetBranch[0];
        const intVal = Number(firstDigitBranch);
        const coerceVersion = semver.coerce(targetBranch);
        console.log('coeceVersion', coerceVersion);
        // eslint-disable-next-line no-null/no-null
        if (isNaN(intVal) || intVal < 7 || !targetBranch.endsWith('.x') || coerceVersion === null) {
          console.log(`Ignore pull request ${pullRequest.htmlLink} with target branch ${targetBranch}`);
          return;
        }

        // It's a semver branch
        // Grab major and minor
        const targetMilestone = `${coerceVersion.major}.${coerceVersion.minor}.${coerceVersion.patch}`;
        entry.milestone = targetMilestone;
        milestonesToSet.push(entry);
      }
    });
    console.log(`Milestones to set: ${milestonesToSet.length}`);

    if (milestonesToSet.length > this.maxSetMilestonePerRun) {
      milestonesToSet.length = this.maxSetMilestonePerRun;
      console.log(
        `Milestones to set > ${this.maxSetMilestonePerRun}, keep only ${this.maxSetMilestonePerRun} for this run`,
      );
    }

    // Apply milestones
    // Do update of milestones in all repositories
    for (const entry of milestonesToSet) {
      // Do not flush too many calls at once on github
      await this.wait(500);
      await this.issueMilestoneHelper.setMilestone(entry.milestone, entry.pullRequestInfo);
    }
  }
}
