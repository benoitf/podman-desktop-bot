import * as core from '@actions/core';
import * as github from '@actions/github';

import { Analysis } from './analysis';
import { InversifyBinding } from './inversify-binding';

export class Main {
  public static readonly WRITE_TOKEN: string = 'write_token';
  public static readonly READ_TOKEN: string = 'read_token';
  public static readonly SLACK_URL: string = 'slack_url';
  public static readonly SLACK_TOKEN: string = 'slack_token';

  protected async doStart(): Promise<void> {
    // Github write token
    const writeToken = core.getInput(Main.WRITE_TOKEN);
    if (!writeToken) {
      throw new Error('No Write Token provided');
    }

    // Github read token
    const readToken = core.getInput(Main.READ_TOKEN);
    if (!readToken) {
      throw new Error('No Read Token provided');
    }

    // Slack URL
    const slackUrl = core.getInput(Main.SLACK_URL);
    if (!slackUrl) {
      throw new Error('No Slack Url provided');
    }

    // Slack Token
    const slackToken = core.getInput(Main.SLACK_TOKEN);
    if (!slackToken) {
      throw new Error('No Slack token provided');
    }

    const inversifyBinbding = new InversifyBinding(writeToken, readToken, slackUrl, slackToken);
    const container = await inversifyBinbding.initBindings();
    const analysis = await container.getAsync(Analysis);
    await analysis.analyze(github.context);
  }

  async start(): Promise<boolean> {
    try {
      await this.doStart();
      return true;
    } catch (error: unknown) {
      console.log(error);
      core.setFailed(error instanceof Error ? error.message : String(error));
      return false;
    }
  }
}
