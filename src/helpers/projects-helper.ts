import { inject, injectable, named } from 'inversify';

import { IssueInfo } from '../info/issue-info';
import { graphql } from '@octokit/graphql';

@injectable()
export class ProjectsHelper {
  @inject('string')
  @named('GRAPHQL_WRITE_TOKEN')
  private graphqlWriteToken: string;

  public async setBacklogProjects(issueInfo: IssueInfo): Promise<void> {
    // search if milestone is already defined

    // add the issue to the project
    const query = `
    mutation($projectId:ID!, $contentId:ID!) {
      addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
        item {
          id
        }
      }
    }
`;
    // id of projects planning
    const projectId = 'PVT_kwDOAFmk9s4ACTx2';
    const contentId = issueInfo.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graphQlResponse: any = await graphql(query, {
      projectId: projectId,
      contentId: contentId,
      headers: {
        authorization: this.graphqlWriteToken,
      },
    });

    const itemId = graphQlResponse.addProjectV2ItemById.item.id;

    const querySetProject = `
mutation (
  $projectId: ID!
  $itemId: ID!
  $statusField: ID!
  $statusValue: String!
) {
  set_status: updateProjectV2ItemFieldValue(input: {
    projectId: $projectId
    itemId: $itemId
    fieldId: $statusField
    value: { 
      singleSelectOptionId: $statusValue
      }
  }) {
    projectV2Item {
      id
      }
  }
}
`;

    await graphql(querySetProject, {
      projectId: projectId,
      itemId: itemId,
      // this is for Status
      statusField: 'PVTSSF_lADOAFmk9s4ACTx2zgBVZ0o',
      // this is for backlog
      statusValue: 'bd2b3a2d',
      headers: {
        authorization: this.graphqlWriteToken,
      },
    });
  }
}
