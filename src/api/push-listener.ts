export const PushListener = Symbol.for('PushListener');
export interface PushListenerParam {
  repo: string;
  owner: string;
}

// eslint-disable-next-line sonarjs/no-redeclare
export interface PushListener {
  execute(repo: PushListenerParam): Promise<void>;
}
