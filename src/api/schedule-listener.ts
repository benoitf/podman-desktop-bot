export const ScheduleListener = Symbol.for('ScheduleListener');
export interface ScheduleListenerParam {
  repo: string;
  owner: string;
}

export interface ScheduleListener {
  execute(repo: ScheduleListenerParam): Promise<void>;
}
