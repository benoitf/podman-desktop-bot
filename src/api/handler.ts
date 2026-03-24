import type { context as githubContext } from '@actions/github/lib/utils';

type Context = typeof githubContext;

export const Handler = Symbol.for('Handler');
export interface Handler {
  supports(eventName: string): boolean;

  handle(eventName: string, context: Context, _webhookPayLoad?: unknown): Promise<void>;
}
