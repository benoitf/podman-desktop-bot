import { inject, injectable, named } from 'inversify';

import { Logic } from '../api/logic';
import { PullRequestInfo } from '../info/pull-request-info';
import { ScheduleListener } from '../api/schedule-listener';
import { SlackHelper } from '../helpers/slack-helper';
import { StargazerHelper } from '../helpers/stargazer-helper';
import { PushListener } from '../api/push-listener';

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
    // grab recent stargazers
    const recentStargazers = await this.stargazerHelper.getRecentStargazers();
    console.log('recent stargazers length is', recentStargazers.length);
    await Promise.all(
      recentStargazers.map(async stargazer => {
        const elements: { type: string; text?: string; image_url?: string; alt_text?: string }[] = [];
        // build message

        // first, add the star
        elements.push({
          type: 'mrkdwn',
          text: ':star:',
        });

        // first, add the avatar
        elements.push({
          type: 'image',
          image_url: stargazer.avatarUrl,
          alt_text: stargazer.login,
        });

        // the name
        let markdownText = `*<${stargazer.url}|${stargazer.login}>*`;

        // company ?
        if (stargazer.company) {
          markdownText += ` working at *${stargazer.company}*`;
        }

        // email ?
        if (stargazer.email) {
          markdownText += ` (${stargazer.email})`;
        }

        if (stargazer.twitterUsername) {
          markdownText += ` (<https://twitter.com/${stargazer.twitterUsername}|@${stargazer.twitterUsername}>)`;
        }

        // bio ?
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
      })
    );
  }
}
