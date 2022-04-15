export const PushListener = Symbol.for('PushListener');
export interface PushListenerParam {
  repo: string;
  owner: string;
}

export interface PushListener {
  execute(repo: PushListenerParam): Promise<void>;
}
