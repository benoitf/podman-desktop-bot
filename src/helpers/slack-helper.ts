import { inject, injectable, named, postConstruct } from 'inversify';

import { WebClient } from '@slack/web-api';
import axios from 'axios';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface SlackMappingJson {
  id: string;
  notify?: {
    tz: string;
    times: string[];
    days: string[];
  };
}

@injectable()
export class SlackHelper {
  @inject('slack-url')
  private slackurl: string;

  @inject('SlackWebClient')
  private slackWebClient: WebClient;

  @inject('string')
  @named('LAST_SLACK_CHECK')
  private lastSlackCheck: string;

  private mappingUserToChannel: Map<string, SlackMappingJson> = new Map<string, SlackMappingJson>();

  private userId: string;
  private teamId: string;
  private slackUrl: string;

  private slackAdminUserId: string;

  @postConstruct()
  async init(): Promise<void> {
    // read the file slack-github-user-mapping.json and add the content to the map
    const mappingPath = resolve(__dirname, '../../slack-github-user-mapping.json');
    const content = await readFile(mappingPath, 'utf8');

    const slackUserMapping = JSON.parse(content);
    for (const key in slackUserMapping) {
      this.mappingUserToChannel.set(key, slackUserMapping[key]);
    }

    // call ths slack api to get data about ourself
    const authData = await this.slackWebClient.auth.test();

    if (!authData.user_id) {
      throw new Error('Unable to get the user id from the slack api');
    }
    if (!authData.team_id) {
      throw new Error('Unable to get the team id from the slack api');
    }
    if (!authData.url) {
      throw new Error('Unable to get the url from the slack api');
    }

    this.userId = authData.user_id;
    this.teamId = authData.team_id;
    this.slackUrl = authData.url;

    this.slackAdminUserId = this.mappingUserToChannel.get('benoitf')?.id ?? '';
  }

  getMappedGitUserToSlackUser(gitUser: string): SlackMappingJson | undefined {
    return this.mappingUserToChannel.get(gitUser);
  }

  public async sendMessage(message: any): Promise<void> {
    await axios.post(this.slackurl, message);
  }

  public async createOrUpdateCanvas(
    slackUser: SlackMappingJson,
    canvasTitle: string,
    searchPatternExistingCanva: string,
    content: string
  ): Promise<void> {
    // do we have an existing canva for this user ?
    // list all canvases for the bot
    const response = await this.slackWebClient.files.list({ types: 'canvases', user: this.userId });
    if (!response.ok) {
      const errorMessage = `Cannot list the canvases for the user ${this.userId}`;
      console.error(errorMessage);
      this.notifyAdmin(errorMessage);
      return;
    }

    // check if we have a canvas with the title ending with searchPatternExistingCanva
    const existingCanvas = response.files?.find(file => file.title?.endsWith(searchPatternExistingCanva));

    let canvasId: string | undefined;
    if (!existingCanvas) {
      // create a new canvas
      canvasId = await this.createCanvas(canvasTitle, slackUser);
    } else {
      canvasId = existingCanvas.id;
    }

    if (!canvasId) {
      const errorMessage = `Could not find the canvas id for the canvas with the title ${canvasTitle}`;
      console.error(errorMessage);
      this.notifyAdmin(errorMessage);
      return;
    }

    // set the content of the canvas
    await this.slackWebClient.canvases.edit({
      canvas_id: canvasId,
      changes: [
        {
          operation: 'replace',
          document_content: {
            type: 'markdown',
            markdown: content,
          },
        },
      ],
    });

    // now, need to notify the user but it depends on the timezone of the user
    const shouldNotify = await this.shouldNotifyUser(slackUser);
    if (shouldNotify) {
      await this.sendDirectMessage(
        slackUser.id,
        `Check the ${canvasTitle} <${this.slackUrl}docs/${this.teamId}/${canvasId}|Link to the canvas>`
      );
    }
  }

  protected async shouldNotifyUser(slackUser: SlackMappingJson): Promise<boolean> {
    // convert lastSlackCheck to a date using the timezone of the user

    // get the timezone of the user to be within new york
    const timezone = slackUser.notify?.tz;
    if (timezone) {

      const lastSlackCheckDate = new Date(this.lastSlackCheck);
      const lastSlackCheckDateInUserTimeZone = new Date(lastSlackCheckDate.toLocaleString('en-US', { timeZone: timezone }));
      const now = new Date();
      const nowInUserTimezone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

      // within the same day ?
      const days = slackUser.notify?.days;
      if (days) {
        const day = nowInUserTimezone.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
        if (!days.includes(day)) {
          return false;
        }
      }

      //now look at all the times
      const times = slackUser.notify?.times;
      if (times) {
        for (const time of times) {
          const [hour, minute] = time.split(':');
          const date = new Date(nowInUserTimezone);
          date.setHours(parseInt(hour));
          date.setMinutes(parseInt(minute));
          date.setSeconds(0);
          date.setMilliseconds(0);

          if (date > lastSlackCheckDateInUserTimeZone && date <= nowInUserTimezone) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // create a new canvas
  public async createCanvas(title: string, slackUser: SlackMappingJson): Promise<string | undefined> {
    const response = await this.slackWebClient.canvases.create({ title });
    // get the canvas id
    const canvasId = response.canvas_id;
    if (canvasId) {
      // share it with the user and with the admin
      await this.slackWebClient.canvases.access.set({ canvas_id: canvasId, access_level: 'read', user_ids: [slackUser.id] });
      await this.slackWebClient.canvases.access.set({ canvas_id: canvasId, access_level: 'write', user_ids: [this.slackAdminUserId] });
    }
    // notify the admin
    await this.notifyAdmin(
      `Created a new canvas with the title ${title} and id ${canvasId} <${this.slackUrl}docs/${this.teamId}/${canvasId}|Link to the canvas>`
    );

    // notify the user
    await this.sendDirectMessage(
      slackUser.id,
      `Created a new canvas: ${title} <${this.slackUrl}docs/${this.teamId}/${canvasId}|Link to the canvas>`
    );

    return canvasId;
  }

  public async sendDirectMessage(userId: string, message: string) {
    await this.slackWebClient.chat.postMessage({ channel: userId, text: message });
  }

  async notifyAdmin(errorMessage: string): Promise<void> {
    await this.sendDirectMessage(this.slackAdminUserId, errorMessage);
  }
}
