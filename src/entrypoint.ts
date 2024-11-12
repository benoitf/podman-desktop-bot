import 'reflect-metadata';

import { Main } from './main';

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async (): Promise<void> => {
  await new Main().start();
})();
