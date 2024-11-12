import * as moment from 'moment';

import { IssueInfo, IssueInfoBuilder } from '../info/issue-info';
import { inject, injectable, named } from 'inversify';

import { GitHub } from '@actions/github/lib/utils';
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
import { graphql } from '@octokit/graphql';

type Octokit = InstanceType<typeof GitHub>;

@injectable()
export class IssuesHelper {
  @inject(IssueInfoBuilder)
  private issueInfoBuilder: IssueInfoBuilder;

  @inject('Octokit')
  @named('READ_TOKEN')
  private octokit: Octokit;

  @inject('string')
  @named('GRAPHQL_READ_TOKEN')
  private graphqlReadToken: string;

  public async isFirstTime(issueInfo: IssueInfo): Promise<boolean> {
    const issuesListParams: RestEndpointMethodTypes['issues']['listForRepo']['parameters'] = {
      creator: issueInfo.author,
      state: 'all',
      owner: issueInfo.owner,
      repo: issueInfo.repo,
    };

    const response = await this.octokit.rest.issues.listForRepo(issuesListParams);
    return response.data.length === 0;
  }

  public async getRecentIssues(duration: moment.Duration): Promise<IssueInfo[]> {
    const afterDate = moment(new Date()).utc().subtract(duration).toISOString();

    const queryString = `repo:podman-desktop/podman-desktop is:issue created:>=${afterDate}`;
    const lastNewIssuesSearch = await this.doGetRecentIssues(queryString);

    // received array of edges looking like:
    //
    // [
    //   {
    //     "node": {
    //       "url": "https://github.com/podman-desktop/podman-desktop/issues/514",
    //       "number": 514,
    //       "repository": {
    //         "name": "podman-desktop",
    //         "owner": {
    //           "login": "containers"
    //         }
    //       },
    // "projectItems": {
    //   "nodes": [
    //     {
    //       "project": {
    //         "id": "PVT_kwDOAFmk9s4ACTx2",
    //         "title": "Podman Desktop Planning"
    //       },
    //       "fieldValueByName": {
    //         "name": "📋 Backlog",
    //         "field": {
    //           "project": {
    //             "id": "PVT_kwDOAFmk9s4ACTx2",
    //             "number": 4
    //           }
    //         }
    //       }
    //     }
    //   ],
    //   "totalCount": 1
    // "labels": {
    //   "nodes": [
    //     {
    //       "name": "kind/epic",
    //       "color": "C9BB01"
    //     },
    //     {
    //       "name": "theme/kubernetes",
    //       "color": "4A802D"
    //     }
    //   ]
    // },
    //       "milestone": null
    //     }
    //   },
    // ]
    //"projectItems": {
    //   "nodes": [
    //     {
    //       "project": {
    //         "id": "PVT_kwDOAFmk9s4ACTx2",
    //         "title": "Podman Desktop Planning"
    //       },
    //       "fieldValueByName": {
    //         "name": "📋 Backlog",
    //         "field": {
    //           "project": {
    //             "id": "PVT_kwDOAFmk9s4ACTx2",
    //             "number": 4
    //           }
    //         }
    //       }
    //     }
    //   ],

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const issues: IssueInfo[] = lastNewIssuesSearch.map((item: any) =>
      this.issueInfoBuilder
        .build()
        .withCreatedAt(item.node.createdAt)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withLabels(item.node.labels?.nodes?.map((label: any) => label?.name))
        .withNumber(item.node.number)
        .withRepo(item.node.repository.name)
        .withOwner(item.node.repository.owner.login)
        .withHtmlLink(item.node.url)
        .withId(item.node.id)
        .withProjectItems(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          item.node.projectItems?.nodes?.map((nodeItem: any) => {
            return {
              name: nodeItem?.fieldValueByName?.name,
              projectId: nodeItem?.project.id,
              projectNumber: nodeItem?.fieldValueByName?.field.project.number,
            };
          }),
        ),
    );

    return issues;
  }

  protected async doGetRecentIssues(queryString: string, cursor?: string, previousMilestones?: unknown[]): Promise<unknown[]> {
    const query = `
      query getRecentIssues($queryString: String!, $cursorAfter: String) {
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
              ... on Issue {
                url
                id
                number
                createdAt
                labels(first: 100) {
                  nodes {
                    ... on Label {
                      name
                      color
                    }
                  }
                }
                repository {
                  name
                  owner {
                    login
                  }
                }
                projectItems(first: 10) {
                  nodes {
                    project {
                      id
                      title
                    }
                    fieldValueByName(name: "Status") {
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        field {
                          ... on ProjectV2SingleSelectField {
                            project {
                              ... on ProjectV2 {
                                id
                                number
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                  totalCount
                }
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
      return await this.doGetRecentIssues(queryString, graphQlResponse.search.pageInfo.endCursor, allGraphQlResponse);
    }

    return allGraphQlResponse;
  }

  public async getIssue(issueLink: string): Promise<IssueInfo | undefined> {
    // eslint-disable-next-line sonarjs/slow-regex
    const parsingRegexp = /(?:\/repos\/)(.*)\/(.*)(?:\/issues\/)(\d+)/g;

    const parsing = parsingRegexp.exec(issueLink);

    // eslint-disable-next-line no-null/no-null
    if (parsing === null || parsing.length !== 4) {
      return undefined;
    }

    const issueGetParam: RestEndpointMethodTypes['issues']['get']['parameters'] = {
      owner: parsing[1],
      repo: parsing[2],
      issue_number: parseInt(parsing[3]),
    };

    const response = await this.octokit.rest.issues.get(issueGetParam);
    const issueGetReponse = response.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const labels: string[] = issueGetReponse.labels.map((label: any) => label?.name);

    return this.issueInfoBuilder
      .build()
      .withBody(issueGetReponse.body ?? '')
      .withAuthor(issueGetReponse.user?.login ?? '')
      .withHtmlLink(issueGetReponse.html_url)
      .withNumber(issueGetReponse.number)
      .withOwner(issueGetParam.owner)
      .withRepo(issueGetParam.repo)
      .withLabels(labels);
  }
}
