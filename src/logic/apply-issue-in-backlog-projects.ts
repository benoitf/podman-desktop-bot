import * as moment from 'moment';
import { inject, injectable, named } from 'inversify';

import { IssuesHelper } from '../helpers/issue-helper.js';
import { Logic } from '../api/logic.js';
import { ProjectsHelper } from '../helpers/projects-helper.js';
import { PullRequestInfo } from '../info/pull-request-info.js';
import { PushListener } from '../api/push-listener.js';
import { ScheduleListener } from '../api/schedule-listener.js';

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
      issue => !issue.projectItems.some(projectItem => projectItem.projectId === 'PVT_kwDOAFmk9s4ACTx2'),
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
    for (const entry of filteredIssues) {
      // do not flush too many calls at once on github
      await this.wait(500);
      await this.projectsHelper.setBacklogProjects(entry);
    }
  }
}
