import * as moment from 'moment';
import * as semver from 'semver';

import { TagDefinition, TagsHelper } from '../helpers/tags-helper';
import { inject, injectable, named } from 'inversify';

import { AddLabelHelper } from '../helpers/add-label-helper';
import { IssueMilestoneHelper } from '../helpers/issue-milestone-helper';
import { IssuesHelper } from '../helpers/issue-helper';
import { Logic } from '../api/logic';
import { PodmanDesktopVersionFetcher } from '../fetchers/podman-desktop-version-fetcher';
import { ProjectsHelper } from '../helpers/projects-helper';
import { PullRequestInfo } from '../info/pull-request-info';
import { PullRequestsHelper } from '../helpers/pull-requests-helper';
import { PushListener } from '../api/push-listener';
import { ScheduleListener } from '../api/schedule-listener';

export interface MilestoneDefinition {
  pullRequestInfo: PullRequestInfo;
  milestone: string;
}

@injectable()
export class ApplyProjectsOnIssuesLogic implements Logic, ScheduleListener, PushListener {
  @inject('number')
  @named('MAX_SET_ISSUES_PER_RUN')
  private maxSetMIssuesPerRun: number;

  @inject(IssuesHelper)
  private issuesHelper: IssuesHelper;

  @inject(ProjectsHelper)
  private projectsHelper: ProjectsHelper;

  async wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  async execute(): Promise<void> {
    // get all recent issues
    const issues = await this.issuesHelper.getRecentIssues(moment.duration(1, 'hour'));

    // already in the planning project, skip it
    const filteredIssues = issues.filter(
      issue => !issue.projectItems.some(projectItem => projectItem.projectId === 'PVT_kwDOAFmk9s4ACTx2')
    );

    // now that we have issues
    // sets the project planning with backlog column
    console.log(`issues to set planning project: ${filteredIssues.length}`);

    if (filteredIssues.length > this.maxSetMIssuesPerRun) {
      filteredIssues.length = this.maxSetMIssuesPerRun;
      console.log(`issues to set planning project > ${this.maxSetMIssuesPerRun}, keep only ${this.maxSetMIssuesPerRun} for this run`);
    }

    if (filteredIssues.length > 0) {
      filteredIssues.length = 1;
    }

    // apply label
    // do update of milestones in all repositories
    for await (const entry of filteredIssues) {
      // do not flush too many calls at once on github
      await this.wait(500);
      await this.projectsHelper.setBacklogProjects(entry);
    }
  }
}
