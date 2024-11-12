import type { Context } from '@actions/github/lib/context';
import type { WebhookPayload } from '@actions/github/lib/interfaces';

export const Handler = Symbol.for('Handler');
// eslint-disable-next-line sonarjs/no-redeclare
export interface Handler {
  supports(eventName: string): boolean;

  handle(eventName: string, context: Context, _webhookPayLoad?: WebhookPayload): Promise<void>;
}
