import * as core from '@actions/core';
import * as github from '@actions/github';

import { Analysis } from './analysis';
import { InversifyBinding } from './inversify-binding';

export class Main {
  public static readonly WRITE_TOKEN: string = 'write_token';
  public static readonly READ_TOKEN: string = 'read_token';
  public static readonly SLACK_URL: string = 'slack_url';
  public static readonly LAST_STARGAZERS_CHECK: string = 'last_stargazers_check';

  protected async doStart(): Promise<void> {
    // github write token
    const writeToken = core.getInput(Main.WRITE_TOKEN);
    if (!writeToken) {
      throw new Error('No Write Token provided');
    }

    // github write token
    const readToken = core.getInput(Main.READ_TOKEN);
    if (!readToken) {
      throw new Error('No Read Token provided');
    }

    // slack URL
    const slackUrl = core.getInput(Main.SLACK_URL);
    if (!slackUrl) {
      throw new Error('No Slack Url provided');
    }

    // slack URL
    const lastStargazersCheck = core.getInput(Main.LAST_STARGAZERS_CHECK);
    if (!lastStargazersCheck) {
      throw new Error('No lastStargazersCheck provided');
    }

    const inversifyBinbding = new InversifyBinding(writeToken, readToken, slackUrl, lastStargazersCheck);
    const container = inversifyBinbding.initBindings();
    const analysis = container.get(Analysis);
    await analysis.analyze(github.context);
  }

  async start(): Promise<boolean> {
    try {
      await this.doStart();
      return true;
    } catch (error: any) {
      console.log(error);
      core.setFailed(error.message);
      return false;
    }
  }
}
