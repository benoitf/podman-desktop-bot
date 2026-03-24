import { inject, injectable } from 'inversify';

import { Logic } from '/@/api/logic';
import { PushListener } from '/@/api/push-listener';
import { ScheduleListener } from '/@/api/schedule-listener';
import { SlackHelper } from '/@/helpers/slack-helper';
import { StargazerHelper } from '/@/helpers/stargazer-helper';

@injectable()
export class NotifyLatestStargazersLogic implements Logic, ScheduleListener, PushListener {
  @inject(StargazerHelper)
  private stargazerHelper: StargazerHelper;

  @inject(SlackHelper)
  private slackHelper: SlackHelper;

  async wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  async execute(): Promise<void> {
    // Grab recent stargazers
    const recentStargazers = await this.stargazerHelper.getRecentStargazers();
    console.log('recent stargazers length is', recentStargazers.length);
    await Promise.all(
      recentStargazers.map(async stargazer => {
        const elements: { type: string; text?: string; image_url?: string; alt_text?: string }[] = [];
        // Build message

        // First, add the star
        elements.push({
          type: 'mrkdwn',
          text: ':star:',
        });

        // First, add the avatar
        elements.push({
          type: 'image',
          image_url: stargazer.avatarUrl,
          alt_text: stargazer.login,
        });

        // The name
        let markdownText = `*<${stargazer.url}|${stargazer.login}>*`;

        // Company ?
        if (stargazer.company) {
          markdownText += ` working at *${stargazer.company}*`;
        }

        // Email ?
        if (stargazer.email) {
          markdownText += ` (${stargazer.email})`;
        }

        if (stargazer.twitterUsername) {
          markdownText += ` (<https://twitter.com/${stargazer.twitterUsername}|@${stargazer.twitterUsername}>)`;
        }

        // Bio ?
        if (stargazer.bio) {
          markdownText += `${stargazer.bio}`;
        }

        elements.push({
          type: 'mrkdwn',
          text: markdownText,
        });

        const message = {
          blocks: [
            {
              type: 'context',
              elements,
            },
          ],
        };
        await this.slackHelper.sendMessage(message);
      }),
    );
  }
}
