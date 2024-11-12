export const ScheduleListener = Symbol.for('ScheduleListener');
export interface ScheduleListenerParam {
  repo: string;
  owner: string;
}

// eslint-disable-next-line sonarjs/no-redeclare
export interface ScheduleListener {
  execute(repo: ScheduleListenerParam): Promise<void>;
}
