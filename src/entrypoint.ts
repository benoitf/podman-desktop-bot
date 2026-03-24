import 'reflect-metadata';

import { Main } from './main';

const MAX_DURATION_MS = 5 * 60 * 60 * 1000; // 5 hours
const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

let shuttingDown = false;

process.on('SIGTERM', () => {
  shuttingDown = true;
  console.log('SIGTERM received, finishing current iteration...');
});
process.on('SIGINT', () => {
  shuttingDown = true;
  console.log('SIGINT received, finishing current iteration...');
});

(async (): Promise<void> => {
  const isPush = process.env.GITHUB_EVENT_NAME === 'push';
  const startTime = Date.now();
  let iteration = 0;

  do {
    iteration++;
    console.log(`--- Iteration ${iteration} starting ---`);

    await new Main().start();

    if (isPush || shuttingDown) break;

    const elapsed = Date.now() - startTime;
    const remaining = MAX_DURATION_MS - elapsed;
    if (remaining <= INTERVAL_MS) {
      console.log('Not enough time for another iteration, exiting.');
      break;
    }

    console.log(`Sleeping ${INTERVAL_MS / 60000} minutes until next iteration...`);
    await new Promise<void>(resolve => {
      const timer = setTimeout(resolve, INTERVAL_MS);
      const checkShutdown = (): void => {
        if (shuttingDown) {
          clearTimeout(timer);
          resolve();
        } else {
          setTimeout(checkShutdown, 1000);
        }
      };
      setTimeout(checkShutdown, 1000);
    });
  } while (!shuttingDown && (Date.now() - startTime) < MAX_DURATION_MS);

  console.log(`Bot loop ended after ${iteration} iteration(s).`);
})();
