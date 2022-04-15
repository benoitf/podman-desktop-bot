/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import * as fs from 'fs-extra';
import * as path from 'path';

import { CheVersionFetcher } from '../../src/fetchers/che-version-fetcher';
import { Container } from 'inversify';
import axios from 'axios';

describe('Test CheVersionFetcher', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(CheVersionFetcher).toSelf().inSingletonScope();
  });

  test('test get version', async () => {
    // mock got
    const xml = await fs.readFile(path.join(__dirname, '..', '_data', 'fetcher', 'che-version-fetcher-pom.xml'), 'utf8');
    jest.mock('axios');
    (axios as any).__setContent(CheVersionFetcher.CHE_POM_XML, xml);

    const cheVersionFetcher = await container.get(CheVersionFetcher);

    const foundVersion = await cheVersionFetcher.getVersion();
    expect(foundVersion).toBeDefined();
    expect(foundVersion).toBe('7.31.0');

    // Change the content, so it shouldn't be call it anymore
    (axios as any).__setContent(CheVersionFetcher.CHE_POM_XML, 'invalid');

    expect(axios.get).toBeCalled();
    const anotherGetVersion = await cheVersionFetcher.getVersion();
    expect(anotherGetVersion).toBeDefined();
    // should be the same than previous version
    expect(anotherGetVersion).toEqual(foundVersion);
  });

  test('test unable to get version', async () => {
    // mock got
    jest.mock('axios');
    (axios as any).__setContent(CheVersionFetcher.CHE_POM_XML, 'empty');

    const cheVersionFetcher = await container.get(CheVersionFetcher);

    const foundVersion = await cheVersionFetcher.getVersion();
    expect(foundVersion).toBeUndefined();
  });
});
