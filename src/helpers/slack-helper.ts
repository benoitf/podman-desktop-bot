import { inject, injectable, named } from 'inversify';

import { GitHub } from '@actions/github/lib/utils';
import axios from 'axios';

@injectable()
export class SlackHelper {
  @inject('slack-url')
  private slackurl: string;

  public async sendMessage(message: any): Promise<void> {
    const response = await axios.post(this.slackurl, message);
    const data = response.data;
    console.log('response is', data);

    // search if milestone is already defined
    console.log('sending the message', JSON.stringify(message, undefined, 2));
  }
}
