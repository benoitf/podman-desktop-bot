import * as moment from 'moment';

import { StargazerInfo, StargazerInfoBuilder } from '../info/stargazer-info';
import { inject, injectable, named } from 'inversify';

import { graphql } from '@octokit/graphql';

/**
 * Monitor the stars on the repository
 */
@injectable()
export class StargazerHelper {
  @inject('string')
  @named('GRAPHQL_READ_TOKEN')
  private graphqlReadToken: string;

  @inject('string')
  @named('LAST_STARGAZERS_CHECK')
  private lastStargazersCheck: string;

  @inject(StargazerInfoBuilder)
  private stargazerInfoBuilder: StargazerInfoBuilder;

  public async getRecentStargazers(): Promise<StargazerInfo[]> {
    // last check performed
    const lastCheck = moment(this.lastStargazersCheck);
    const recentStargazers = await this.doGetRecentStargazers(lastCheck);

    // received array of edges looking like:
    //
    // [
    // {
    //   "starredAt": "2022-05-03T14:37:48Z",
    //   "node": {
    //     "id": "--",
    //     "login": "abcdef",
    //     "name": null,
    //     "company": null,
    //     "bio": null,
    //     "email": "",
    //     "websiteUrl": null,
    //     "twitterUsername": null,
    //     "url": "https://github.com/abcdef"
    //   }
    // }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const starGazers: StargazerInfo[] = recentStargazers.map((item: any) =>
      this.stargazerInfoBuilder
        .build()
        .withStarredAt(item.starredAt)
        .withId(item.node.id)
        .withLogin(item.node.login)
        .withName(item.node.name)
        .withCompany(item.node.company)
        .withBio(item.node.bio)
        .withEmail(item.node.email)
        .withWebsiteUrl(item.node.websiteUrl)
        .withTwitterUsername(item.node.twitterUsername)
        .withUrl(item.node.url)
        .withAvatarUrl(item.node.avatarUrl)
    );
    return starGazers;
  }

  protected async doGetRecentStargazers(lastTimeCheck: moment.Moment, cursor?: string, previousStargazers?: unknown[]): Promise<unknown[]> {
    const query = `
    query getRecentStargazers($cursorAfter: String) {
      rateLimit {
        cost
        remaining
        resetAt
      }
      repository(owner: "containers", name:"desktop") { 
        stargazers(first: 10 , after: $cursorAfter, orderBy: { field: STARRED_AT, direction: DESC }) {
          totalCount
          pageInfo {
            startCursor
            endCursor
            hasNextPage
          }
          edges {
            starredAt
            node {
              id
              login
              name
              company
              bio
              email
              websiteUrl
              twitterUsername
              url
              avatarUrl
            }
          }
        }
      }
    }
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graphQlResponse: any = await graphql(query, {
      cursorAfter: cursor,
      headers: {
        authorization: this.graphqlReadToken,
      },
    });

    let allGraphQlResponse;
    if (previousStargazers) {
      allGraphQlResponse = previousStargazers.concat(graphQlResponse.repository.stargazers.edges);
    } else {
      allGraphQlResponse = graphQlResponse.repository.stargazers.edges;
    }

    // last check in the current request
    const currentCheck = moment(allGraphQlResponse[allGraphQlResponse.length - 1].starredAt);
    let isOlder = false;
    if (currentCheck.isBefore(lastTimeCheck)) {
      isOlder = true;
    }

    // filter out all results that are old
    allGraphQlResponse = allGraphQlResponse.filter((item: any) => moment(item.starredAt).isAfter(lastTimeCheck));

    // need to loop again if there are more and that last check has been performed after the current date
    if (graphQlResponse.repository.stargazers.pageInfo.hasNextPage && !isOlder) {
      // needs to redo the search starting from the last search
      return await this.doGetRecentStargazers(lastTimeCheck, graphQlResponse.repository.stargazers.pageInfo.endCursor, allGraphQlResponse);
    }

    return allGraphQlResponse;
  }
}
