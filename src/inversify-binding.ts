import 'reflect-metadata';

import { Analysis } from './analysis';
import { Container } from 'inversify';
import { Logic } from './api/logic';
import { OctokitBuilder } from './github/octokit-builder';
import { WebClient } from '@slack/web-api';
import { apisModule } from './api/apis-module';
import { fetchersModule } from './fetchers/fetchers-module';
import { handlersModule } from './handler/handlers-module';
import { helpersModule } from './helpers/helpers-module';
import { infosModule } from './info/infos-module';
import { logicModule } from './logic/logic-module';

export class InversifyBinding {
  private container: Container;

  constructor(
    private writeToken: string,
    private readToken: string,
    private slackUrl: string,
    private slackToken: string,
  ) {}

  public async initBindings(): Promise<Container> {
    this.container = new Container();
    this.container.bind(Container).toConstantValue(this.container);

    this.container.load(apisModule);
    this.container.load(fetchersModule);
    this.container.load(handlersModule);
    this.container.load(helpersModule);
    this.container.load(infosModule);
    this.container.load(logicModule);

    // Token
    this.container.bind(OctokitBuilder).toSelf().inSingletonScope();
    const writeOctokit = this.container.get(OctokitBuilder).build(this.writeToken);
    this.container.bind('Octokit').toConstantValue(writeOctokit).whenNamed('WRITE_TOKEN');

    const readOctokit = this.container.get(OctokitBuilder).build(this.readToken);
    this.container.bind('Octokit').toConstantValue(readOctokit).whenNamed('READ_TOKEN');
    this.container.bind('string').toConstantValue(`token ${this.readToken}`).whenNamed('GRAPHQL_READ_TOKEN');
    this.container.bind('string').toConstantValue(`token ${this.writeToken}`).whenNamed('GRAPHQL_WRITE_TOKEN');

    this.container.bind('slack-url').toConstantValue(this.slackUrl);
    const webClient = new WebClient(this.slackToken);
    this.container.bind('SlackWebClient').toConstantValue(webClient);

    this.container.bind('number').toConstantValue(50).whenNamed('MAX_SET_MILESTONE_PER_RUN');
    this.container.bind('number').toConstantValue(50).whenNamed('MAX_CREATE_MILESTONE_PER_RUN');
    this.container.bind('number').toConstantValue(50).whenNamed('MAX_UPDATE_MILESTONE_PER_RUN');

    this.container.bind('number').toConstantValue(50).whenNamed('MAX_SET_ISSUES_PER_RUN');

    // Analyze
    this.container.bind(Analysis).toSelf().inSingletonScope();

    // Resolve all logics to create instances
    await this.container.getAllAsync(Logic);

    return this.container;
  }
}
