import 'reflect-metadata';

import { Container } from 'inversify';
import { IssueInfoBuilder } from '../../src/info/issue-info';

describe('Test IssueInfo', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(IssueInfoBuilder).toSelf().inSingletonScope();
  });

  test('test info', async () => {
    const issueInfoBuilder = container.get(IssueInfoBuilder);
    expect(issueInfoBuilder).toBeDefined();

    const htmlLink = 'http://foo';

    const issueInfo = issueInfoBuilder.build().withHtmlLink(htmlLink).withLabels(['foobar']);

    expect(issueInfo.htmlLink).toBe(htmlLink);
    expect(issueInfo.hasLabel('foobar')).toBeTruthy();
    expect(issueInfo.hasLabel('baz')).toBeFalsy();
  });
});
