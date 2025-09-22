export type Config = {
  apiKey: string;
};

export const getConfig = (): Config => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error(
      "The API_KEY environment variable is required to start the Coda MCP server. Please set API_KEY to your Coda API token.",
    );
  }

  return { apiKey };
};
