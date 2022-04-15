// eslint-disable-next-line @typescript-eslint/no-explicit-any
const graphql: any = jest.genMockFromModule('@octokit/graphql');

module.exports = graphql;
// allow to mock value
module.exports.graphql.__setDefaultExports = (value: string): void => {
  graphql.graphql.mockReturnValueOnce(value);
};
