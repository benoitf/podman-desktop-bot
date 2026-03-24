import { beforeEach, describe, expect, test } from 'vitest';
import { Container } from 'inversify';
import { IssueInfoBuilder } from './issue-info';

describe('test IssueInfo', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(IssueInfoBuilder).toSelf().inSingletonScope();
  });

  test('info', async () => {
    expect.assertions(4);

    const issueInfoBuilder = container.get(IssueInfoBuilder);

    expect(issueInfoBuilder).toBeDefined();

    const htmlLink = 'https://foo';

    const issueInfo = issueInfoBuilder.build().withHtmlLink(htmlLink).withLabels(['foobar']);

    expect(issueInfo.htmlLink).toBe(htmlLink);
    expect(issueInfo.hasLabel('foobar')).toBe(true);
    expect(issueInfo.hasLabel('baz')).toBe(false);
  });
});
