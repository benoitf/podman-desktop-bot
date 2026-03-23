import { CheckContext, PullRequestInfo, PullRequestInfoBuilder } from '../info/pull-request-info';
import { inject, injectable, named } from 'inversify';

import { RepositoriesHelper } from './repositories-helper';
import { graphql } from '@octokit/graphql';

@injectable()
export class PullRequestReviewsHelper {
  private static readonly BOT_CHECK_NAMES_TO_EXCLUDE = ['Domain Review Status'];
  @inject('string')
  @named('GRAPHQL_READ_TOKEN')
  private graphqlReadToken: string;

  @inject('string')
  @named('GRAPHQL_WRITE_TOKEN')
  private graphqlWriteToken: string;

  @inject(PullRequestInfoBuilder)
  private pullRequestInfoBuilder: PullRequestInfoBuilder;

  @inject(RepositoriesHelper)
  private repositoriesHelper: RepositoriesHelper;

  public async getDependabotPullRequestsRequiringReviewAndPassingAllChecks(): Promise<PullRequestInfo[]> {
    const repositoriesQuery = this.repositoriesHelper
      .getRepositoriesToWatch()
      .map(repo => `repo:${repo}`)
      .join(' ');
    const organizationsQuery = this.repositoriesHelper
      .getOrganizationsToWatch()
      .map(org => `org:${org}`)
      .join(' ');

    // we want to get all dependabot PRs that are open, not draft, with dependabot as author
    // status:success is not used as it only checks the legacy commit status API, not check runs/check suites
    // instead, we filter by statusCheckRollup after fetching
    const queryString = `${organizationsQuery} ${repositoriesQuery} is:pr is:open draft:false author:dependabot[bot]`;

    const allPullRequests = await this.getPullRequests(queryString);
    return allPullRequests.filter(pr => this.areAllChecksPassingExcludingBotCheck(pr));
  }

  private areAllChecksPassingExcludingBotCheck(pr: PullRequestInfo): boolean {
    // if no individual check contexts available, fall back to the rollup state
    if (pr.checkContexts.length === 0) {
      return pr.statusState === 'SUCCESS';
    }

    const filteredChecks = pr.checkContexts.filter(
      check => !PullRequestReviewsHelper.BOT_CHECK_NAMES_TO_EXCLUDE.includes(check.name)
    );

    // if all checks were excluded, fall back to accepting
    if (filteredChecks.length === 0) {
      return true;
    }

    return filteredChecks.every(check => check.state === 'SUCCESS');
  }

  public async getPullRequestsToReview(username: string): Promise<PullRequestInfo[]> {
    const repositoriesQuery = this.repositoriesHelper
      .getRepositoriesToWatch()
      .map(repo => `repo:${repo}`)
      .join(' ');
    const organizationsQuery = this.repositoriesHelper
      .getOrganizationsToWatch()
      .map(org => `org:${org}`)
      .join(' ');

    const queryString = `${organizationsQuery} ${repositoriesQuery} is:pr is:open draft:false review-requested:${username}`;
    return this.getPullRequests(queryString);
  }

  protected async getPullRequests(queryString: string): Promise<PullRequestInfo[]> {
    const lastMergedPullRequestSearch = await this.doGetPullRequestsToReview(queryString);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pullRequests: PullRequestInfo[] = lastMergedPullRequestSearch.map((item: any) => {
      return this.pullRequestInfoBuilder
        .build()
        .withId(item.node.id)
        .withMergedAt(item.node.mergedAt)
        .withBody(item.node.body)
        .withNumber(item.node.number)
        .withRepo(item.node.repository.name)
        .withOwner(item.node.repository.owner.login)
        .withHtmlLink(item.node.url)
        .withTitle(item.node.title)
        .withMergingBranch(item.node.baseRefName)
        .withStatusState(item.node.statusCheckRollup?.state ?? 'UNKNOWN')
        .withCheckContexts(this.extractCheckContexts(item.node.statusCheckRollup?.contexts?.nodes))
        .withReviewState(item.node.reviewDecision)
        .withAuthor(item.node.author.login)
        .withAutoMergeEnabled(item.node.autoMergeRequest !== null)
        .withLastCommitDate(item.node.commits.nodes?.[0]?.commit?.committedDate)
        .computeAge();
    });

    return pullRequests;
  }

  public async approvePullRequest(pullRequest: PullRequestInfo): Promise<void> {
    const mutation = `
    mutation approvePullRequest($pullRequestId: ID!) {
      addPullRequestReview(input: { pullRequestId: $pullRequestId, event: APPROVE }) {
        pullRequestReview {
          state
        }
      }
    }
    `;

    await graphql(mutation, {
      pullRequestId: pullRequest.id,
      headers: {
        authorization: this.graphqlWriteToken,
      },
    });
  }

  public async setAutoMerge(pullRequest: PullRequestInfo, mergeMethod: 'MERGE' | 'SQUASH' | 'REBASE'): Promise<void> {
    const mutation = `
    mutation enableAutoMerge($pullRequestId: ID!, $mergeMethod: PullRequestMergeMethod!) {
      enablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId, mergeMethod: $mergeMethod }) {
        pullRequest {
          autoMergeRequest {
            enabledAt
          }
        }
      }
    }
    `;

    await graphql(mutation, {
      pullRequestId: pullRequest.id,
      mergeMethod,
      headers: {
        authorization: this.graphqlWriteToken,
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractCheckContexts(nodes: any[] | undefined): CheckContext[] {
    if (!nodes) {
      return [];
    }
    return nodes.map(node => {
      if (node.__typename === 'CheckRun') {
        return { name: node.name, state: node.conclusion ?? node.status, typename: node.__typename };
      }
      // StatusContext
      return { name: node.context, state: node.state, typename: node.__typename };
    });
  }

  protected async doGetPullRequestsToReview(queryString: string, cursor?: string, previousMilestones?: unknown[]): Promise<unknown[]> {
    const query = `
    query getPullRequestsToReview($queryString: String!, $cursorAfter: String) {
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
              id
              url
              mergedAt
              title
              number
              body
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
              statusCheckRollup {
                state
                contexts(first: 100) {
                  nodes {
                    ... on CheckRun {
                      __typename
                      name
                      conclusion
                      status
                    }
                    ... on StatusContext {
                      __typename
                      context
                      state
                    }
                  }
                }
              }
              commits (last:1) {
                nodes {
                  commit {
                    committedDate
                  }
                }
              }    
              author {
                login
              }     
              reviewDecision
              autoMergeRequest {
                enabledAt
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
      return await this.doGetPullRequestsToReview(queryString, graphQlResponse.search.pageInfo.endCursor, allGraphQlResponse);
    }

    return allGraphQlResponse;
  }
}
