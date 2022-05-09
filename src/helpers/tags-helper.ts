import { inject, injectable, named } from 'inversify';

import { graphql } from '@octokit/graphql';

export interface TagDefinition {
  committedDate: string;
  name: string;
}

@injectable()
export class TagsHelper {
  @inject('string')
  @named('GRAPHQL_READ_TOKEN')
  private graphqlReadToken: string;

  public async getLatestTags(): Promise<Map<string, TagDefinition[]>> {
    const latestTagSearch = await this.doGetLatestTags('repo:containers/podman-desktop');

    // received array of edges looking like:
    // [
    // {
    //     "refs": {
    //       "edges": [
    //         {
    //           "node": {
    //             "name": "7.17.0",
    //             "repository": {
    //               "nameWithOwner": "eclipse/che"
    //             },
    //             "target": {
    //               "oid": "37b2ab9eac6bcad6e5da29f8dbd94f91882d28f5",
    //               "commitUrl": "https://github.com/eclipse/che/commit/37b2ab9eac6bcad6e5da29f8dbd94f91882d28f5",
    //               "committedDate": "2020-08-05T13:39:46Z"
    //             }
    //           }
    //         },

    const mapping: Map<string, TagDefinition[]> = new Map();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    latestTagSearch.forEach((item: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      item.refs.edges.forEach((subitem: any) => {
        const name = subitem.node.name;
        const committedDate = subitem.node.target.committedDate;
        const nameWithOwner = subitem.node.repository.nameWithOwner;
        let tagDefinitions = mapping.get(nameWithOwner);
        if (!tagDefinitions) {
          tagDefinitions = [];
        }
        tagDefinitions.push({ name, committedDate });
        mapping.set(nameWithOwner, tagDefinitions);
      });
    });

    return mapping;
  }

  protected async doGetLatestTags(queryString: string, cursor?: string, previousMilestones?: unknown[]): Promise<unknown[]> {
    const query = `
    query getTags($queryString: String!, $cursorAfter: String) {
        rateLimit {
          cost
          remaining
          resetAt
        }
        search(query: $queryString, type: REPOSITORY, first: 50, after: $cursorAfter) {
          pageInfo {
            ... on PageInfo {
              endCursor
              hasNextPage
            }
          }
          nodes {
            ... on Repository {
              refs(refPrefix: "refs/tags/", first: 5, orderBy: {field: TAG_COMMIT_DATE, direction: DESC}) {
                edges {
                  node {
                    name
                    repository {
                      nameWithOwner
                    }
                    target {
                      oid
                      commitUrl
                      ... on Commit {
                        committedDate
                      }
                    }
                  }
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
      allGraphQlResponse = previousMilestones.concat(graphQlResponse.search.nodes);
    } else {
      allGraphQlResponse = graphQlResponse.search.nodes;
    }

    // need to loop again
    if (graphQlResponse.search.pageInfo.hasNextPage) {
      // needs to redo the search starting from the last search
      return await this.doGetLatestTags(queryString, graphQlResponse.search.pageInfo.endCursor, allGraphQlResponse);
    }

    return allGraphQlResponse;
  }
}
