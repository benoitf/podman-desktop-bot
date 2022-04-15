import * as moment from 'moment';

import { PullRequestInfo, PullRequestInfoBuilder } from '../info/pull-request-info';
import { inject, injectable, named } from 'inversify';

import { graphql } from '@octokit/graphql';

@injectable()
export class PullRequestsHelper {
  @inject('string')
  @named('GRAPHQL_READ_TOKEN')
  private graphqlReadToken: string;

  @inject(PullRequestInfoBuilder)
  private pullRequestInfoBuilder: PullRequestInfoBuilder;

  public async getRecentMerged(duration: moment.Duration): Promise<PullRequestInfo[]> {

    const afterDate = moment(new Date()).utc().subtract(duration).toISOString();

    const queryString = `repo:containers/podman-desktop is:pr merged:>=${afterDate} is:merged no:milestone`;
    console.log('Query String =', queryString);
    const lastMergedPullRequestSearch = await this.doGetRecentMerged(queryString);

    // received array of edges looking like:
    //
    // [
    //       {
    //         "node": {
    //           "url": "https://github.com/eclipse/che-docs/pull/1450",
    //           "mergedAt": "2020-08-06T12:52:47Z",
    //           "repository": {
    //             "name": "che-docs",
    //             "owner": {
    //               "login": "eclipse"
    //             }
    //           },
    //           "baseRepository": {
    //             "url": "https://github.com/eclipse/che-docs",
    //             "nameWithOwner": "eclipse/che-docs"
    //           },
    //           "baseRefName": "master",
    //           "milestone": null
    //         }
    //       },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pullRequests: PullRequestInfo[] = lastMergedPullRequestSearch.map((item: any) =>
      this.pullRequestInfoBuilder
        .build()
        .withMergedAt(item.node.mergedAt)
        .withNumber(item.node.number)
        .withRepo(item.node.repository.name)
        .withOwner(item.node.repository.owner.login)
        .withHtmlLink(item.node.url)
        .withMergingBranch(item.node.baseRefName)
    );

    return pullRequests;
  }

  protected async doGetRecentMerged(queryString: string, cursor?: string, previousMilestones?: unknown[]): Promise<unknown[]> {
    const query = `
    query getMergedPRs($queryString: String!, $cursorAfter: String) {
      rateLimit {
        cost
        remaining
        resetAt
      }
      search(query: $queryString, type: ISSUE, first: 100, after: $cursorAfter) {
        pageInfo {
          ... on PageInfo {
            endCursor
            hasNextPage
          }
        }
        edges {
          node {
            ... on PullRequest {
              url
              mergedAt
              number
              repository {
                name
                owner {
                  login
                }
              }
              baseRepository {
                url
                nameWithOwner
              }
              baseRefName
              milestone {
                number
              }
            }
          }
        }
      }
    }
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graphQlResponse: any = await graphql(query, {
      queryString: queryString,
      cursorAfter: cursor,
      headers: {
        authorization: this.graphqlReadToken,
      },
    });

    let allGraphQlResponse;
    if (previousMilestones) {
      allGraphQlResponse = previousMilestones.concat(graphQlResponse.search.edges);
    } else {
      allGraphQlResponse = graphQlResponse.search.edges;
    }

    // need to loop again
    if (graphQlResponse.search.pageInfo.hasNextPage) {
      // needs to redo the search starting from the last search
      return await this.doGetRecentMerged(queryString, graphQlResponse.search.pageInfo.endCursor, allGraphQlResponse);
    }

    return allGraphQlResponse;
  }
}
