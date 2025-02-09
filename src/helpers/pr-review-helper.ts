import { PullRequestInfo, PullRequestInfoBuilder } from '../info/pull-request-info';
import { inject, injectable, named } from 'inversify';

import { graphql } from '@octokit/graphql';

@injectable()
export class PullRequestReviewsHelper {
  @inject('string')
  @named('GRAPHQL_READ_TOKEN')
  private graphqlReadToken: string;

  @inject(PullRequestInfoBuilder)
  private pullRequestInfoBuilder: PullRequestInfoBuilder;

  public async getPullRequestsToReview(username: string): Promise<PullRequestInfo[]> {
    const repositories = [
      'containers/podman-desktop-extension-ai-lab',
      'containers/podman-desktop-extension-ai-lab-playground-images',
      'containers/podman-desktop-internal',
      'containers/podman-desktop-media',
      'redhat-developer/podman-desktop-redhat-account-ext',
      'redhat-developer/podman-desktop-sandbox-ext',
      'redhat-developer/podman-desktop-rhel-ext',
      'redhat-developer/podman-desktop-demo',
      'redhat-developer/podman-desktop-image-checker-openshift-ext',
      'redhat-developer/podman-desktop-redhat-pack-ext',
      'crc-org/crc-extension',
    ];
    const repositoriesQuery = repositories.map(repo => `repo:${repo}`).join(' ');

    const organizations = ['podman-desktop'];
    const organizationsQuery = organizations.map(org => `org:${org}`).join(' ');

    const queryString = `${organizationsQuery} ${repositoriesQuery} is:pr is:open draft:false review-requested:${username}`;
    const lastMergedPullRequestSearch = await this.doGetPullRequestsToReview(queryString);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pullRequests: PullRequestInfo[] = lastMergedPullRequestSearch.map((item: any) => {
      return this.pullRequestInfoBuilder
        .build()
        .withMergedAt(item.node.mergedAt)
        .withNumber(item.node.number)
        .withRepo(item.node.repository.name)
        .withOwner(item.node.repository.owner.login)
        .withHtmlLink(item.node.url)
        .withTitle(item.node.title)
        .withMergingBranch(item.node.baseRefName)
        .withStatusState(item.node.statusCheckRollup.state)
        .withReviewState(item.node.reviewDecision)
        .withAuthor(item.node.author.login)
        .withLastCommitDate(item.node.commits.nodes?.[0]?.commit?.committedDate)
        .computeAge();
    });

    return pullRequests;
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
              url
              mergedAt
              title
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
              statusCheckRollup {
                state
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
