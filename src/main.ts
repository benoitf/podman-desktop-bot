import * as core from '@actions/core';
import * as github from '@actions/github';

import { Analysis } from './analysis';
import { InversifyBinding } from './inversify-binding';

export class Main {
  public static readonly WRITE_TOKEN: string = 'write_token';
  public static readonly READ_TOKEN: string = 'read_token';

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

    const inversifyBinbding = new InversifyBinding(writeToken, readToken);
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
