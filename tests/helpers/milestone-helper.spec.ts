/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-null/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import {RestEndpointMethodTypes} from '@octokit/plugin-rest-endpoint-methods';
import * as fs from 'fs-extra';
import * as path from 'path';

import { MilestoneDefinition, MilestoneHelper } from '../../src/helpers/milestone-helper';

import { Container } from 'inversify';
import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';

describe('Test Helper MilestoneHelper', () => {
  let container: Container;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let octokit: {
    rest: {
      issues: {
        createMilestone: jest.Mock<any, any>,
        updateMilestone: jest.Mock<any, any>,
      }
    }
  };

  beforeEach(() => {
    container = new Container();
    container.bind(MilestoneHelper).toSelf().inSingletonScope();
    octokit = {
      rest: {
        issues: { createMilestone: jest.fn(), updateMilestone: jest.fn() },
      }
    };

    container.bind('Octokit').toConstantValue(octokit);
    container.bind('string').toConstantValue('fooToken').whenTargetNamed('GRAPHQL_READ_TOKEN');
  });

  test('test call correct API for create milestone', async () => {
    const addMilestoneHelper = container.get(MilestoneHelper);

    const milestoneToAdd = 'milestone-to-add';
    const milestoneDescription = 'my-description';
    const milestoneNumber = 2503;
    const milestoneDueOn = '2020-10-07T00:00:00Z';
    const milestoneState = 'open';

    const repoOwner = 'eclipse';
    const repoName = 'che';

    const milestoneDetails: MilestoneDefinition = {
      title: milestoneToAdd,
      number: milestoneNumber,
      description: milestoneDescription,
      dueOn: milestoneDueOn,
      state: milestoneState,
    };
    await addMilestoneHelper.createMilestone(repoOwner, repoName, milestoneDetails);

    expect(octokit.rest.issues.createMilestone).toBeCalled();
    const createMilestoneParams: RestEndpointMethodTypes["issues"]["createMilestone"]["parameters"] = octokit.rest.issues.createMilestone.mock.calls[0][0];
    expect(createMilestoneParams.title).toBe(milestoneToAdd);
    expect(createMilestoneParams.due_on).toBe(milestoneDueOn);
    expect(createMilestoneParams.description).toBe(milestoneDescription);
    expect(createMilestoneParams.state).toBe(milestoneState);
    expect(createMilestoneParams.repo).toBe(repoName);
    expect(createMilestoneParams.repo).toBe(repoName);
  });

  test('test call correct API for create milestone with null', async () => {
    const addMilestoneHelper = container.get(MilestoneHelper);

    const milestoneToAdd = 'milestone-to-add';
    const milestoneDescription = null;
    const milestoneNumber = 2503;
    const milestoneDueOn = null;
    const milestoneState = 'open';

    const repoOwner = 'eclipse';
    const repoName = 'che';

    const milestoneDetails: MilestoneDefinition = {
      title: milestoneToAdd,
      number: milestoneNumber,
      description: milestoneDescription,
      dueOn: milestoneDueOn,
      state: milestoneState,
    };
    await addMilestoneHelper.createMilestone(repoOwner, repoName, milestoneDetails);

    expect(octokit.rest.issues.createMilestone).toBeCalled();
    const createMilestoneParams: RestEndpointMethodTypes["issues"]["createMilestone"]["parameters"] = octokit.rest.issues.createMilestone.mock.calls[0][0];
    expect(createMilestoneParams.title).toBe(milestoneToAdd);
    expect(createMilestoneParams.due_on).toBeUndefined();
    expect(createMilestoneParams.description).toBeUndefined();
    expect(createMilestoneParams.state).toBe(milestoneState);
    expect(createMilestoneParams.repo).toBe(repoName);
    expect(createMilestoneParams.repo).toBe(repoName);
  });

  test('test call correct API for update milestone', async () => {
    const addMilestoneHelper = container.get(MilestoneHelper);

    const milestoneToAdd = 'milestone-to-update';
    const milestoneDescription = 'my-description';
    const milestoneNumber = 2503;
    const milestoneDueOn = '2020-10-07T00:00:00Z';
    const milestoneState = 'open';

    const repoOwner = 'eclipse';
    const repoName = 'che';

    const milestoneDetails: MilestoneDefinition = {
      title: milestoneToAdd,
      number: milestoneNumber,
      description: milestoneDescription,
      dueOn: milestoneDueOn,
      state: milestoneState,
    };
    await addMilestoneHelper.updateMilestone(repoOwner, repoName, milestoneDetails);

    expect(octokit.rest.issues.updateMilestone).toBeCalled();
    const createMilestoneParams: RestEndpointMethodTypes["issues"]["createMilestone"]["parameters"] = octokit.rest.issues.updateMilestone.mock.calls[0][0];
    expect(createMilestoneParams.title).toBe(milestoneToAdd);
    expect(createMilestoneParams.milestone_number).toBe(milestoneNumber);
    expect(createMilestoneParams.due_on).toBe(milestoneDueOn);
    expect(createMilestoneParams.description).toBe(milestoneDescription);
    expect(createMilestoneParams.state).toBe(milestoneState);
    expect(createMilestoneParams.repo).toBe(repoName);
    expect(createMilestoneParams.repo).toBe(repoName);
  });

  test('test call correct API for update milestone with null', async () => {
    const addMilestoneHelper = container.get(MilestoneHelper);

    const milestoneToAdd = 'milestone-to-update';
    const milestoneDescription = null;
    const milestoneNumber = 2503;
    const milestoneDueOn = null;
    const milestoneState = 'open';

    const repoOwner = 'eclipse';
    const repoName = 'che';

    const milestoneDetails: MilestoneDefinition = {
      title: milestoneToAdd,
      number: milestoneNumber,
      description: milestoneDescription,
      dueOn: milestoneDueOn,
      state: milestoneState,
    };
    await addMilestoneHelper.updateMilestone(repoOwner, repoName, milestoneDetails);

    expect(octokit.rest.issues.updateMilestone).toBeCalled();
    const createMilestoneParams: RestEndpointMethodTypes["issues"]["createMilestone"]["parameters"] = octokit.rest.issues.updateMilestone.mock.calls[0][0];
    expect(createMilestoneParams.title).toBe(milestoneToAdd);
    expect(createMilestoneParams.milestone_number).toBe(milestoneNumber);
    expect(createMilestoneParams.due_on).toBeUndefined();
    expect(createMilestoneParams.description).toBeUndefined();
    expect(createMilestoneParams.state).toBe(milestoneState);
    expect(createMilestoneParams.repo).toBe(repoName);
    expect(createMilestoneParams.repo).toBe(repoName);
  });

  test('search milestone', async () => {
    const milestoneHelper = container.get(MilestoneHelper);
    jest.mock('@octokit/graphql');
    const json = await fs.readFile(path.join(__dirname, '..', '_data', 'helper', 'search-milestone.json'), 'utf8');
    const parsedJSON = JSON.parse(json);
    (graphql as any).__setDefaultExports(parsedJSON);

    const anotherSON = JSON.parse(json);
    anotherSON.search.pageInfo.hasNextPage = false;
    (graphql as any).__setDefaultExports(anotherSON);
    const map = await milestoneHelper.searchMilestones(['eclipse/che']);

    // should have 3 repositories with milestones
    expect(map.size).toBe(3);

    const cheMilestones = map.get('eclipse/che');

    expect(cheMilestones).toBeDefined();
    const milestone760 = cheMilestones!.get('7.6.0');
    expect(milestone760).toBeDefined();
    expect(milestone760!.description).toBe('');
    expect(milestone760!.number).toBe(107);
    expect(milestone760!.title).toEqual('7.6.0');
    expect(milestone760!.state).toEqual('closed');
    expect(milestone760!.dueOn).toEqual('2019-12-18T00:00:00Z');
  });

  test('search milestone with additional entries', async () => {
    const milestoneHelper = container.get(MilestoneHelper);
    jest.mock('@octokit/graphql');
    const json = await fs.readFile(path.join(__dirname, '..', '_data', 'helper', 'search-milestone-additional-entries.json'), 'utf8');
    const parsedJSON = JSON.parse(json);
    (graphql as any).__setDefaultExports(parsedJSON);

    const anotherSON = JSON.parse(json);
    anotherSON.search.edges[0].node.milestones.pageInfo.hasNextPage = false;
    (graphql as any).__setDefaultExports(anotherSON);
    const map = await milestoneHelper.searchMilestones(['eclipse/che']);

    // should have 1 repositories with milestones
    expect(map.size).toBe(1);

    const cheMilestones = map.get('eclipse/che');

    expect(cheMilestones).toBeDefined();
    const milestone760 = cheMilestones!.get('7.6.0');
    expect(milestone760).toBeDefined();
    expect(milestone760!.description).toBe('');
    expect(milestone760!.number).toBe(107);
    expect(milestone760!.title).toEqual('7.6.0');
    expect(milestone760!.state).toEqual('closed');
    expect(milestone760!.dueOn).toEqual('2019-12-18T00:00:00Z');
  });
});
