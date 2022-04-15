/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-null/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import * as fs from 'fs-extra';
import * as path from 'path';

import { Container } from 'inversify';
import { Octokit } from '@octokit/rest';
import { TagsHelper } from '../../src/helpers/tags-helper';
import axios from 'axios';
import { graphql } from '@octokit/graphql';

describe('Test Helper TagsHelper', () => {
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

  beforeEach(async () => {
    container = new Container();
    container.bind(TagsHelper).toSelf().inSingletonScope();
    octokit = {
      rest: {
        issues: { createMilestone: jest.fn(), updateMilestone: jest.fn() },
      }
    };

    container.bind('Octokit').toConstantValue(octokit);
    container.bind('string').toConstantValue('fooToken').whenTargetNamed('GRAPHQL_READ_TOKEN');
  });

  afterEach(() => {
    jest.resetModules();
  });

  test('test search tags', async () => {
    const tagsHelper = container.get(TagsHelper);
    jest.mock('@octokit/graphql');
    const json = await fs.readFile(path.join(__dirname, '..', '_data', 'helper', 'tags-helper.json'), 'utf8');
    const parsedJSON = JSON.parse(json);
    (graphql as any).__setDefaultExports(parsedJSON);

    const anotherJson = await fs.readFile(path.join(__dirname, '..', '_data', 'helper', 'tags-helper-next.json'), 'utf8');
    const anotherParsedJSON = JSON.parse(anotherJson);
    (graphql as any).__setDefaultExports(anotherParsedJSON);
    const map = await tagsHelper.getLatestTags();

    // should have 4 repositories with tags
    expect(map.size).toBe(4);

    const cheTags = map.get('eclipse/che');
    expect(cheTags).toBeDefined();
    expect(cheTags!.length).toBe(5);
    expect(cheTags![0].name).toBe('7.17.0');
    expect(cheTags![0].committedDate).toBe('2020-08-05T13:39:46Z');
  });
});
