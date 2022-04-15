// eslint-disable-next-line @typescript-eslint/no-explicit-any
const axios: any = jest.genMockFromModule('axios');

// map between URL and content
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const __content: Map<string, any> = new Map();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function __setContent(url: string, content: string): void {
  __content.set(url, content);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function get(url: string): any {
  return Promise.resolve({ data: __content.get(url) });
}

axios.get = jest.fn(get);
axios.__setContent = __setContent;
module.exports = axios;
