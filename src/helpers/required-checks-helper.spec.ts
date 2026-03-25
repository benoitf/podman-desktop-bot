/* eslint-disable @typescript-eslint/no-explicit-any */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Container } from 'inversify';
import { RequiredChecksHelper } from './required-checks-helper';

describe(RequiredChecksHelper, () => {
  let container: Container;
  let octokit: any;

  beforeEach(() => {
    container = new Container();
    octokit = {
      rest: {
        repos: {
          getBranchProtection: vi.fn<(...args: unknown[]) => unknown>(),
        },
      },
    };
    container.bind('Octokit').toConstantValue(octokit).whenNamed('READ_TOKEN');
    container.bind(RequiredChecksHelper).toSelf().inSingletonScope();
  });

  test('should return required check names from branch protection', async () => {
    expect.assertions(2);

    vi.mocked(octokit.rest.repos.getBranchProtection).mockResolvedValue({
      data: {
        required_status_checks: {
          checks: [
            { context: 'Linux', app_id: 15368 },
            { context: 'macOS', app_id: 15368 },
            { context: 'DCO', app_id: 1861 },
          ],
        },
      },
    });

    const helper = container.get(RequiredChecksHelper);
    const result = await helper.getRequiredChecks('podman-desktop', 'podman-desktop', 'main');

    expect(result).toStrictEqual(new Set(['Linux', 'macOS', 'DCO']));

    expect(octokit.rest.repos.getBranchProtection).toHaveBeenCalledExactlyOnceWith({
      owner: 'podman-desktop',
      repo: 'podman-desktop',
      branch: 'main',
    });
  });

  test('should return empty set when branch protection has no required checks', async () => {
    expect.assertions(1);

    vi.mocked(octokit.rest.repos.getBranchProtection).mockResolvedValue({
      data: {
        required_status_checks: undefined,
      },
    });

    const helper = container.get(RequiredChecksHelper);
    const result = await helper.getRequiredChecks('owner', 'repo', 'main');

    expect(result).toStrictEqual(new Set());
  });

  test('should return empty set when api call fails', async () => {
    expect.assertions(1);

    vi.mocked(octokit.rest.repos.getBranchProtection).mockRejectedValue(new Error('Not Found'));

    const helper = container.get(RequiredChecksHelper);
    const result = await helper.getRequiredChecks('owner', 'repo', 'main');

    expect(result).toStrictEqual(new Set());
  });
});
