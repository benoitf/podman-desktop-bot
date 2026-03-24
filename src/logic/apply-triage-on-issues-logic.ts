import moment from 'moment';

import { inject, injectable, named } from 'inversify';

import { AddLabelHelper } from '/@/helpers/add-label-helper';
import { IssuesHelper } from '/@/helpers/issue-helper';
import { Logic } from '/@/api/logic';
import { PullRequestInfo } from '/@/info/pull-request-info';
import { PushListener } from '/@/api/push-listener';
import { ScheduleListener } from '/@/api/schedule-listener';

export interface MilestoneDefinition {
  pullRequestInfo: PullRequestInfo;
  milestone: string;
}

@injectable()
export class ApplyTriageOnIssuesLogic implements Logic, ScheduleListener, PushListener {
  @inject('number')
  @named('MAX_SET_ISSUES_PER_RUN')
  private maxSetMIssuesPerRun: number;

  @inject(IssuesHelper)
  private issuesHelper: IssuesHelper;

  @inject(AddLabelHelper)
  private addLabelHelper: AddLabelHelper;

  async wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  async execute(): Promise<void> {
    // Get all recent issues
    const issues = await this.issuesHelper.getRecentIssues(moment.duration(1, 'hour'));

    // If they already have an area, skip it
    // If it contains needs/triage, skip it as well
    const filteredIssues = issues.filter(issue => {
      const labels = issue.labels;
      const hasArea = labels.find(label => label.startsWith('area/'));
      const hasNeedsTriage = labels.find(label => label === 'status/need-triage');
      return !hasArea && !hasNeedsTriage;
    });

    // Now that we have, issues
    // Add the status/need-triage label
    console.log(`status/need-triage issues to set: ${filteredIssues.length}`);

    if (filteredIssues.length > this.maxSetMIssuesPerRun) {
      filteredIssues.length = this.maxSetMIssuesPerRun;
      console.log(
        `status/need-triage issues to set > ${this.maxSetMIssuesPerRun}, keep only ${this.maxSetMIssuesPerRun} for this run`,
      );
    }

    // Apply label
    // Do update of milestones in all repositories
    for (const entry of filteredIssues) {
      // Do not flush too many calls at once on github
      await this.wait(500);
      await this.addLabelHelper.addLabel(['status/need-triage'], entry);
    }
  }
}
