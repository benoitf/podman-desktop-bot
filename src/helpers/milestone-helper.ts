import { inject, injectable, named } from 'inversify';

import { GitHub } from '@actions/github/lib/utils';
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
import { graphql } from '@octokit/graphql';

export interface MilestoneDefinition {
  //
  // {
  // "title": "7.20",
  // "number": 125,
  // "description": "Release (7.y.0) runs on Wednesday after the sprint ends, with weekly 7.y.z releases (as needed) for the 2 weeks thereafter, also on Wednesday.",
  // "dueOn": "2020-10-07T00:00:00Z",
  // "state": "OPEN"
  // }
  title: string;
  number: number;
  description: string | null;
  dueOn: string | null;
  state: 'open' | 'closed';
}

@injectable()
export class MilestoneHelper {
  @inject('string')
  @named('GRAPHQL_READ_TOKEN')
  private graphqlReadToken: string;

  @inject('Octokit')
  @named('WRITE_TOKEN')
  private octokitWrite: InstanceType<typeof GitHub>;

  public async createMilestone(
    repoOwner: string,
    repoName: string,
    milestoneDefinition: MilestoneDefinition,
  ): Promise<void> {
    // Create milestone on the repo
    const issuesCreateMilestoneParams: RestEndpointMethodTypes['issues']['createMilestone']['parameters'] = {
      owner: repoOwner,
      repo: repoName,
      title: milestoneDefinition.title,
      state: milestoneDefinition.state,
    };
    // eslint-disable-next-line no-null/no-null
    if (milestoneDefinition.description !== null) {
      issuesCreateMilestoneParams.description = milestoneDefinition.description;
    }

    // eslint-disable-next-line no-null/no-null
    if (milestoneDefinition.dueOn !== null) {
      issuesCreateMilestoneParams.due_on = milestoneDefinition.dueOn;
    }

    console.log('Create milestone with params', issuesCreateMilestoneParams);
    await this.octokitWrite.rest.issues.createMilestone(issuesCreateMilestoneParams);
  }

  public async updateMilestone(
    repoOwner: string,
    repoName: string,
    milestoneDefinition: MilestoneDefinition,
  ): Promise<void> {
    // Create milestone on the repo
    const issuesUpdateMilestoneParams: RestEndpointMethodTypes['issues']['updateMilestone']['parameters'] = {
      owner: repoOwner,
      repo: repoName,
      milestone_number: milestoneDefinition.number,
      title: milestoneDefinition.title,
      state: milestoneDefinition.state,
    };

    // eslint-disable-next-line no-null/no-null
    if (milestoneDefinition.description !== null) {
      issuesUpdateMilestoneParams.description = milestoneDefinition.description;
    }

    // eslint-disable-next-line no-null/no-null
    if (milestoneDefinition.dueOn !== null) {
      issuesUpdateMilestoneParams.due_on = milestoneDefinition.dueOn;
    }
    console.log('Update milestone with params', issuesUpdateMilestoneParams);
    await this.octokitWrite.rest.issues.updateMilestone(issuesUpdateMilestoneParams);
  }

  public async searchMilestones(repositories: string[]): Promise<Map<string, Map<string, MilestoneDefinition>>> {
    // Add repo: prefix on repositories
    const queryRepositories = repositories.map(repository => `repo:${repository}`).join(' ');
    const milestoneSearch = await this.doSearchMilestones(queryRepositories);

    // Received array of edges looking like:
    //
    // [
    //   {
    //     "node": {
    //       "name": "che",
    //       "url": "https://github.com/eclipse/che",
    //       "owner": {
    //         "login": "eclipse"
    //       },
    //       "milestones": {
    //         "nodes": [
    //           {
    //             "title": "8.x",
    //             "id": "MDk6TWlsZXN0b25lNTY0OTcwMA==",
    //             "closed": false,
    //             "dueOn": null
    //           },

    const milestones: Map<string, Map<string, MilestoneDefinition>> = new Map();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    milestoneSearch.forEach((item: any) => {
      // Get short repository name
      const repoName = `${item.node.owner.login}/${item.node.name}`;

      // Create map
      const milestoneMap: Map<string, MilestoneDefinition> = new Map();

      // For every nodes, add milestone
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      item.node.milestones.nodes.forEach((milestoneNode: any) => {
        milestoneNode.state = milestoneNode.state.toLowerCase();
        milestoneMap.set(milestoneNode.title, milestoneNode as MilestoneDefinition);
      });
      const existing = milestones.get(repoName) ?? new Map();
      milestones.set(repoName, new Map([...milestoneMap, ...existing]));
    });

    return milestones;
  }

  protected async doSearchMilestones(
    queryRepositories: string,
    cursorRepository?: string,
    cursorMilestones?: string,
    previousMilestones?: unknown[],
  ): Promise<unknown[]> {
    const query = `
    query getMilestones($queryRepositories: String!, $cursorRepositoryAfter: String, $cursorMilestoneAfter: String){
      rateLimit{
       cost
       remaining
       resetAt
      }
      search(query:$queryRepositories, type:REPOSITORY, first:100, after: $cursorRepositoryAfter){  
       pageInfo {
               ... on PageInfo {
                 endCursor
                 hasNextPage
               }
             }
       repositoryCount
       edges{
        node{
         ... on Repository{
          name
          url
          owner{
           login
          }
          milestones(first:50, after: $cursorMilestoneAfter, orderBy: {field: CREATED_AT, direction: DESC}) {
            totalCount
            pageInfo {
              ... on PageInfo {
                endCursor
                hasNextPage
              }
            }
            nodes {
             ... on Milestone {
               title,
               number,
               description,
               state,
               dueOn,
               
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
      queryRepositories: queryRepositories,
      cursorRepositoryAfter: cursorRepository,
      cursorMilestoneAfter: cursorMilestones,
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

    // Need to loop again on milestones before looping on repositories
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const milestonesWithNextCursors: Array<string | undefined> = graphQlResponse.search.edges
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((edge: Record<string, any>) => {
        if (edge.node.milestones.pageInfo?.hasNextPage) {
          return edge.node.milestones.pageInfo.endCursor;
        } else {
          return undefined;
        }
      })
      .filter((value: string | undefined): value is string => !!value);
    let nextCursorMilestone;
    if (milestonesWithNextCursors.length > 0) {
      nextCursorMilestone = milestonesWithNextCursors[0];
    }

    if (nextCursorMilestone) {
      // Needs to redo the search starting from the last search
      return await this.doSearchMilestones(
        queryRepositories,
        cursorRepository,
        nextCursorMilestone,
        allGraphQlResponse,
      );
    } else if (graphQlResponse.search.pageInfo.hasNextPage) {
      // Needs to redo the search starting from the last search
      return await this.doSearchMilestones(
        queryRepositories,
        graphQlResponse.search.pageInfo.endCursor,
        cursorMilestones,
        allGraphQlResponse,
      );
    }

    // From reverse order
    return allGraphQlResponse.reverse();
  }
}
