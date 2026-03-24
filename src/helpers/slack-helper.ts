import { inject, injectable, postConstruct } from 'inversify';

import { GitHubVariablesHelper } from './github-variables-helper';
import { WebClient } from '@slack/web-api';

import mappingJson from '/@slack-github-user-mapping.json' with { type: 'json' };

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

  @inject(GitHubVariablesHelper)
  private gitHubVariablesHelper: GitHubVariablesHelper;

  private mappingUserToChannel: Map<string, SlackMappingJson> = new Map<string, SlackMappingJson>();

  private userId: string;
  private teamId: string;
  private slackUrl: string;

  private slackAdminUserId: string;

  @postConstruct()
  async init(): Promise<void> {
    // Load the slack-github-user-mapping into the map
    for (const key in mappingJson) {
      this.mappingUserToChannel.set(key, (mappingJson as Record<string, SlackMappingJson>)[key]);
    }

    // Call ths slack api to get data about ourself
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

  public async sendMessage(message: Record<string, unknown>): Promise<void> {
    const response = await fetch(this.slackurl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    if (!response.ok) {
      throw new Error(`Slack webhook request failed with status ${response.status}`);
    }
  }

  public async createOrUpdateCanvas(
    slackUser: SlackMappingJson,
    canvasTitle: string,
    searchPatternExistingCanva: string,
    content: string,
  ): Promise<void> {
    // Do we have an existing canva for this user ?
    // List all canvases for the bot
    const response = await this.slackWebClient.files.list({ types: 'canvases', user: this.userId });
    if (!response.ok) {
      const errorMessage = `Cannot list the canvases for the user ${this.userId}`;
      console.error(errorMessage);
      await this.notifyAdmin(errorMessage);
      return;
    }

    // Check if we have a canvas with the title ending with searchPatternExistingCanva
    const existingCanvas = response.files?.find(file => file.title?.endsWith(searchPatternExistingCanva));

    let canvasId: string | undefined;
    if (!existingCanvas) {
      // Create a new canvas
      canvasId = await this.createCanvas(canvasTitle, slackUser);
    } else {
      canvasId = existingCanvas.id;
    }

    if (!canvasId) {
      const errorMessage = `Could not find the canvas id for the canvas with the title ${canvasTitle}`;
      console.error(errorMessage);
      await this.notifyAdmin(errorMessage);
      return;
    }

    // Set the content of the canvas
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

    // Now, need to notify the user but it depends on the timezone of the user
    const shouldNotify = await this.shouldNotifyUser(slackUser);
    if (shouldNotify) {
      await this.sendDirectMessage(
        slackUser.id,
        `Check the ${canvasTitle} <${this.slackUrl}docs/${this.teamId}/${canvasId}|Link to the canvas>`,
      );
    }
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  protected async shouldNotifyUser(slackUser: SlackMappingJson): Promise<boolean> {
    // Convert lastCheck to a date using the timezone of the user
    const lastSlackCheck = this.gitHubVariablesHelper.getLastCheck();

    // Get the timezone of the user to be within new york
    const timezone = slackUser.notify?.tz;
    if (timezone) {
      const lastSlackCheckDate = new Date(lastSlackCheck);
      const lastSlackCheckDateInUserTimeZone = new Date(
        lastSlackCheckDate.toLocaleString('en-US', { timeZone: timezone }),
      );
      const now = new Date();
      const nowInUserTimezone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

      // Within the same day ?
      const days = slackUser.notify?.days;
      if (days) {
        const day = nowInUserTimezone.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
        if (!days.includes(day)) {
          return false;
        }
      }

      //Now look at all the times
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

  // Create a new canvas
  public async createCanvas(title: string, slackUser: SlackMappingJson): Promise<string | undefined> {
    const response = await this.slackWebClient.canvases.create({ title });
    // Get the canvas id
    const canvasId = response.canvas_id;
    if (canvasId) {
      // Share it with the user and with the admin
      await this.slackWebClient.canvases.access.set({
        canvas_id: canvasId,
        access_level: 'read',
        user_ids: [slackUser.id],
      });
      await this.slackWebClient.canvases.access.set({
        canvas_id: canvasId,
        access_level: 'write',
        user_ids: [this.slackAdminUserId],
      });
    }
    // Notify the admin
    await this.notifyAdmin(
      `Created a new canvas with the title ${title} and id ${canvasId} <${this.slackUrl}docs/${this.teamId}/${canvasId}|Link to the canvas>`,
    );

    // Notify the user
    await this.sendDirectMessage(
      slackUser.id,
      `Created a new canvas: ${title} <${this.slackUrl}docs/${this.teamId}/${canvasId}|Link to the canvas>`,
    );

    return canvasId;
  }

  public async sendDirectMessage(userId: string, message: string): Promise<void> {
    await this.slackWebClient.chat.postMessage({ channel: userId, text: message });
  }

  async notifyAdmin(errorMessage: string): Promise<void> {
    await this.sendDirectMessage(this.slackAdminUserId, errorMessage);
  }
}
