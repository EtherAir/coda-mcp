import { promises as fs } from "node:fs";
import { join } from "node:path";
import { close, connect } from "mcp-testing-kit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as helpers from "./client/helpers";
import * as sdk from "./client/sdk.gen";
import { server as mcpServer } from "./server";

vi.mock("./client/sdk.gen");
vi.mock("./client/helpers");
vi.mock("axios");

const expectedToolNames = [
  "coda_list_documents",
  "coda_get_document",
  "coda_create_document",
  "coda_update_document",
  "coda_list_pages",
  "coda_create_page",
  "coda_delete_page",
  "coda_get_page_content",
  "coda_peek_page",
  "coda_replace_page_content",
  "coda_append_page_content",
  "coda_duplicate_page",
  "coda_rename_page",
  "coda_list_tables",
  "coda_get_table",
  "coda_get_table_summary",
  "coda_list_columns",
  "coda_get_column",
  "coda_list_rows",
  "coda_get_row",
  "coda_create_rows",
  "coda_update_row",
  "coda_delete_row",
  "coda_delete_rows",
  "coda_list_formulas",
  "coda_get_formula",
  "coda_list_controls",
  "coda_get_control",
  "coda_push_button",
  "coda_whoami",

  "coda_resolve_link",
  "coda_search_tables",
  "coda_search_pages",
  "coda_bulk_update_rows",
  "coda_get_document_stats",
];

const prettyJson = (value: unknown) => JSON.stringify(value, null, 2);

if (typeof Promise.withResolvers !== "function") {
  Object.defineProperty(Promise, "withResolvers", {
    configurable: true,
    writable: true,
    value: <T>() => {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: unknown) => void;

      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });

      return { promise, resolve, reject };
    },
  });
}

describe("MCP Server", () => {
  afterEach(async () => {
    await close(mcpServer.server);
    vi.clearAllMocks();
  });

  it("should have all tools", async () => {
    const client = await connect(mcpServer.server);
    const result = await client.listTools();
    expect(result.tools).toBeDefined();
    const toolNames = (result.tools ?? []).map(({ name }) => name);

    expect(toolNames).toEqual(expect.arrayContaining(expectedToolNames));
    expect(toolNames).toHaveLength(expectedToolNames.length);
  });

  it("should include all tools in the built artifact", async () => {
    const distPath = join(__dirname, "..", "dist", "server.js");
    await expect(fs.access(distPath)).resolves.toBeUndefined();

    const distContents = await fs.readFile(distPath, "utf8");
    const toolRegistrations = distContents.match(/server\.tool\(/g) ?? [];

    expect(toolRegistrations).toHaveLength(expectedToolNames.length);
    expectedToolNames.forEach((toolName) => {
      expect(distContents).toContain(toolName);
    });
  });
});


describe("CLI integration", () => {
  afterEach(async () => {
    vi.clearAllMocks();
  });

  it("should expose all tools when running the packaged server", async () => {
    const env: Record<string, string> = {
      ...process.env,
      API_KEY: process.env.API_KEY ?? "test-api-key",
    } as Record<string, string>;

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [join(__dirname, "..", "dist", "index.js")],
      env,
      cwd: join(__dirname, ".."),
    });

    const client = new Client({ name: "cli-integration-test", version: "0.0.0" });

    try {
      await client.connect(transport);

      const result = await client.listTools();
      const toolNames = (result.tools ?? []).map(({ name }) => name);

      expect(toolNames).toEqual(expect.arrayContaining(expectedToolNames));
      expect(toolNames).toHaveLength(expectedToolNames.length);
    } finally {
      await client.close();
      await transport.close();
    }
  });
});

describe("coda_list_documents", () => {
  it("should list documents without query", async () => {
    vi.mocked(sdk.listDocs).mockResolvedValue({
      data: {
        items: [
          { id: "123", name: "Test Document" },
          { id: "456", name: "Another Document" },
        ],
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_documents", { query: "" });
    expect(result.content).toEqual([
      {
        type: "text",
        text: prettyJson({
          items: [
            { id: "123", name: "Test Document" },
            { id: "456", name: "Another Document" },
          ],
        }),

      },
    ]);
  });

  it("should list documents with query", async () => {
    vi.mocked(sdk.listDocs).mockResolvedValue({
      data: {
        items: [{ id: "123", name: "Test Document" }],
      },
    } as any);


    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_documents", { query: "test" });
    expect(result.content).toEqual([
      {
        type: "text",
        text: prettyJson({
          items: [{ id: "123", name: "Test Document" }],
        }),
      },
    ]);
  });


  it("should show error if list documents throws", async () => {
    vi.mocked(sdk.listDocs).mockRejectedValue(new Error("foo"));


    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_documents", { query: "test" });
    expect(result.content).toEqual([{ type: "text", text: "Failed to list documents : foo" }]);
  });
});


describe("coda_list_pages", () => {
  it("should list pages successfully without limit or nextPageToken", async () => {
    vi.mocked(sdk.listPages).mockResolvedValue({
      data: {
        items: [
          { id: "page-123", name: "Test Page 1" },
          { id: "page-456", name: "Test Page 2" },
        ],
      },
    } as any);


    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_pages", { docId: "doc-123" });
    expect(result.content).toEqual([
      {
        type: "text",
        text: prettyJson({
          items: [
            { id: "page-123", name: "Test Page 1" },
            { id: "page-456", name: "Test Page 2" },
          ],
        }),

      },
    ]);
    expect(sdk.listPages).toHaveBeenCalledWith({
      path: { docId: "doc-123" },
      query: { limit: undefined, pageToken: undefined },
      throwOnError: true,
    });
  });

  it("should list pages with limit", async () => {
    vi.mocked(sdk.listPages).mockResolvedValue({
      data: {
        items: [
          { id: "page-123", name: "Test Page 1" },
          { id: "page-456", name: "Test Page 2" },
        ],
        nextPageToken: "token-123",
      },
    } as any);


    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_pages", { docId: "doc-123", limit: 10 });
    expect(result.content).toEqual([
      {
        type: "text",
        text: prettyJson({
          items: [
            { id: "page-123", name: "Test Page 1" },
            { id: "page-456", name: "Test Page 2" },
          ],
          nextPageToken: "token-123",

        }),
      },
    ]);
    expect(sdk.listPages).toHaveBeenCalledWith({
      path: { docId: "doc-123" },
      query: { limit: 10, pageToken: undefined },
      throwOnError: true,
    });
  });

  it("should list pages with nextPageToken", async () => {
    vi.mocked(sdk.listPages).mockResolvedValue({
      data: {
        items: [
          { id: "page-789", name: "Test Page 3" },
          { id: "page-101", name: "Test Page 4" },
        ],
      },
    } as any);


    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_pages", {
      docId: "doc-123",
      nextPageToken: "token-123",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: prettyJson({
          items: [
            { id: "page-789", name: "Test Page 3" },
            { id: "page-101", name: "Test Page 4" },
          ],
        }),

      },
    ]);
    expect(sdk.listPages).toHaveBeenCalledWith({
      path: { docId: "doc-123" },
      query: { limit: undefined, pageToken: "token-123" },
      throwOnError: true,
    });
  });

  it("should prioritize nextPageToken over limit", async () => {
    vi.mocked(sdk.listPages).mockResolvedValue({
      data: {
        items: [{ id: "page-789", name: "Test Page 3" }],
      },
    } as any);


    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_pages", {
      docId: "doc-123",
      limit: 5,
      nextPageToken: "token-123",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: prettyJson({
          items: [{ id: "page-789", name: "Test Page 3" }],
        }),
      },
    ]);

    // When nextPageToken is provided, limit should be undefined
    expect(sdk.listPages).toHaveBeenCalledWith({
      path: { docId: "doc-123" },
      query: { limit: undefined, pageToken: "token-123" },
      throwOnError: true,
    });
  });

  it("should show error if list pages throws", async () => {

    vi.mocked(sdk.listPages).mockRejectedValue(new Error("Access denied"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_pages", { docId: "doc-123" });
    expect(result.content).toEqual([{ type: "text", text: "Failed to list pages : Access denied" }]);
  });
});


describe("coda_create_page", () => {
  it("should create page with content", async () => {
    vi.mocked(sdk.createPage).mockResolvedValue({
      data: {
        id: "page-new",
        requestId: "req-123",
      },
    } as any);

    const client = await connect(mcpServer.server);

    const result = await client.callTool("coda_create_page", {
      docId: "doc-123",
      name: "New Page",
      content: "# Hello World",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: prettyJson({
          id: "page-new",
          requestId: "req-123",
        }),
      },
    ]);
    expect(sdk.createPage).toHaveBeenCalledWith({
      path: { docId: "doc-123" },
      body: {
        name: "New Page",
        subtitle: undefined,
        iconName: undefined,
        parentPageId: undefined,
        pageContent: {
          type: "canvas",
          canvasContent: { format: "markdown", content: "# Hello World" },
        },
      },
      throwOnError: true,
    });
  });

  it("should create page without content", async () => {

    vi.mocked(sdk.createPage).mockResolvedValue({
      data: {
        id: "page-new",
        requestId: "req-124",
      },
    } as any);

    const client = await connect(mcpServer.server);

    await client.callTool("coda_create_page", {
      docId: "doc-123",
      name: "Empty Page",
    });
    expect(sdk.createPage).toHaveBeenCalledWith({
      path: { docId: "doc-123" },
      body: {
        name: "Empty Page",
        subtitle: undefined,
        iconName: undefined,
        parentPageId: undefined,
        pageContent: {
          type: "canvas",
          canvasContent: { format: "markdown", content: " " },
        },
      },
      throwOnError: true,
    });
  });

  it("should create page with parent page id and content", async () => {

    vi.mocked(sdk.createPage).mockResolvedValue({
      data: {
        id: "page-sub",
        requestId: "req-125",
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_create_page", {
      docId: "doc-123",
      name: "Subpage",

      parentPageId: "page-456",
      content: "## Subheading",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: prettyJson({ id: "page-sub", requestId: "req-125" }),
      },
    ]);
    expect(sdk.createPage).toHaveBeenCalledWith({
      path: { docId: "doc-123" },
      body: {
        name: "Subpage",
        subtitle: undefined,
        iconName: undefined,
        parentPageId: "page-456",
        pageContent: {
          type: "canvas",
          canvasContent: { format: "markdown", content: "## Subheading" },
        },
      },
      throwOnError: true,
    });
  });

  it("should show error if create page throws", async () => {

    vi.mocked(sdk.createPage).mockRejectedValue(new Error("Insufficient permissions"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_create_page", {

      docId: "doc-123",
      name: "New Page",
    });
    expect(result.content).toEqual([
      { type: "text", text: "Failed to create page : Insufficient permissions" },
    ]);
  });
});


describe("coda_get_page_content", () => {
  it("should get page content successfully", async () => {
    vi.mocked(helpers.getPageContent).mockResolvedValue("# Page Title\n\nThis is the content.");

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_get_page_content", {
      docId: "doc-123",
      pageIdOrName: "page-456",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: "# Page Title\n\nThis is the content.",
      },
    ]);
    expect(helpers.getPageContent).toHaveBeenCalledWith("doc-123", "page-456");
  });

  it("should handle empty page content", async () => {
    vi.mocked(helpers.getPageContent).mockResolvedValue("");

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_get_page_content", {
      docId: "doc-123",
      pageIdOrName: "page-456",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: "",
      },
    ]);
  });

  it("should show error if getPageContent returns undefined", async () => {
    vi.mocked(helpers.getPageContent).mockResolvedValue(undefined as any);

    const client = await connect(mcpServer.server);

    const result = await client.callTool("coda_get_page_content", {
      docId: "doc-123",
      pageIdOrName: "page-456",
    });
    expect(result.content).toEqual([
      { type: "text", text: "Failed to get page content : Unknown error has occurred" },
    ]);
  });

  it("should show error if getPageContent throws", async () => {
    vi.mocked(helpers.getPageContent).mockRejectedValue(new Error("Export failed"));


    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_get_page_content", {

      docId: "doc-123",
      pageIdOrName: "page-456",
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to get page content : Export failed" }]);
  });
});


describe("coda_peek_page", () => {
  it("should peek page content successfully", async () => {
    vi.mocked(helpers.getPageContent).mockResolvedValue("# Title\nLine 1\nLine 2\nLine 3");

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_peek_page", {
      docId: "doc-123",
      pageIdOrName: "page-456",
      numLines: 2,
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: "# Title\nLine 1",
      },
    ]);
    expect(helpers.getPageContent).toHaveBeenCalledWith("doc-123", "page-456");
  });

  it("should show error if getPageContent returns undefined", async () => {
    vi.mocked(helpers.getPageContent).mockResolvedValue(undefined as any);

    const client = await connect(mcpServer.server);

    const result = await client.callTool("coda_peek_page", {
      docId: "doc-123",
      pageIdOrName: "page-456",
      numLines: 1,
    });
    expect(result.content).toEqual([
      { type: "text", text: "Failed to peek page : Unknown error has occurred" },
    ]);
  });

  it("should show error if getPageContent throws", async () => {
    vi.mocked(helpers.getPageContent).mockRejectedValue(new Error("Export failed"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_peek_page", {

      docId: "doc-123",
      pageIdOrName: "page-456",
      numLines: 3,
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to peek page : Export failed" }]);
  });
});


describe("coda_replace_page_content", () => {
  it("should replace page content successfully", async () => {
    vi.mocked(sdk.updatePage).mockResolvedValue({
      data: {
        id: "page-456",
        requestId: "req-125",
      },
    } as any);

    const client = await connect(mcpServer.server);

    const result = await client.callTool("coda_replace_page_content", {
      docId: "doc-123",
      pageIdOrName: "page-456",
      content: "# New Content\n\nReplaced content.",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: prettyJson({
          id: "page-456",
          requestId: "req-125",
        }),
      },
    ]);

    expect(sdk.updatePage).toHaveBeenCalledWith({
      path: { docId: "doc-123", pageIdOrName: "page-456" },
      body: {
        contentUpdate: {
          insertionMode: "replace",
          canvasContent: { format: "markdown", content: "# New Content\n\nReplaced content." },
        },
      },
      throwOnError: true,
    });
  });

  it("should show error if replace page content throws", async () => {
    vi.mocked(sdk.updatePage).mockRejectedValue(new Error("Update failed"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_replace_page_content", {

      docId: "doc-123",
      pageIdOrName: "page-456",
      content: "# New Content",
    });
    expect(result.content).toEqual([
      { type: "text", text: "Failed to replace page content : Update failed" },
    ]);
  });
});


describe("coda_append_page_content", () => {
  it("should append page content successfully", async () => {
    vi.mocked(sdk.updatePage).mockResolvedValue({
      data: {
        id: "page-456",
        requestId: "req-126",
      },
    } as any);

    const client = await connect(mcpServer.server);

    const result = await client.callTool("coda_append_page_content", {
      docId: "doc-123",
      pageIdOrName: "page-456",
      content: "\n\n## Appended Section\n\nNew content.",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: prettyJson({
          id: "page-456",
          requestId: "req-126",
        }),
      },
    ]);

    expect(sdk.updatePage).toHaveBeenCalledWith({
      path: { docId: "doc-123", pageIdOrName: "page-456" },
      body: {
        contentUpdate: {
          insertionMode: "append",
          canvasContent: { format: "markdown", content: "\n\n## Appended Section\n\nNew content." },
        },
      },
      throwOnError: true,
    });
  });

  it("should show error if append page content throws", async () => {
    vi.mocked(sdk.updatePage).mockRejectedValue(new Error("Append failed"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_append_page_content", {

      docId: "doc-123",
      pageIdOrName: "page-456",
      content: "Additional content",
    });
    expect(result.content).toEqual([
      { type: "text", text: "Failed to append page content : Append failed" },
    ]);
  });
});


describe("coda_duplicate_page", () => {
  it("should duplicate page successfully", async () => {
    vi.mocked(helpers.getPageContent).mockResolvedValue("# Original Page\n\nOriginal content.");
    vi.mocked(sdk.createPage).mockResolvedValue({
      data: {
        id: "page-duplicate",
        requestId: "req-127",
      },
    } as any);

    const client = await connect(mcpServer.server);

    const result = await client.callTool("coda_duplicate_page", {
      docId: "doc-123",
      pageIdOrName: "page-456",
      newName: "Duplicated Page",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: prettyJson({
          id: "page-duplicate",
          requestId: "req-127",
        }),
      },
    ]);

    expect(helpers.getPageContent).toHaveBeenCalledWith("doc-123", "page-456");
    expect(sdk.createPage).toHaveBeenCalledWith({
      path: { docId: "doc-123" },
      body: {
        name: "Duplicated Page",
        pageContent: {
          type: "canvas",
          canvasContent: { format: "markdown", content: "# Original Page\n\nOriginal content." },
        },
      },
      throwOnError: true,
    });
  });

  it("should show error if getPageContent fails during duplication", async () => {
    vi.mocked(helpers.getPageContent).mockRejectedValue(new Error("Content fetch failed"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_duplicate_page", {
      docId: "doc-123",

      pageIdOrName: "page-456",
      newName: "Duplicated Page",
    });
    expect(result.content).toEqual([
      { type: "text", text: "Failed to duplicate page : Content fetch failed" },
    ]);
  });

  it("should show error if createPage fails during duplication", async () => {
    vi.mocked(helpers.getPageContent).mockResolvedValue("# Original Page");
    vi.mocked(sdk.createPage).mockRejectedValue(new Error("Create failed"));


    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_duplicate_page", {
      docId: "doc-123",

      pageIdOrName: "page-456",
      newName: "Duplicated Page",
    });
    expect(result.content).toEqual([
      { type: "text", text: "Failed to duplicate page : Create failed" },
    ]);
  });
});


describe("coda_rename_page", () => {
  it("should rename page successfully", async () => {
    vi.mocked(sdk.updatePage).mockResolvedValue({
      data: {
        id: "page-456",
        requestId: "req-128",
      },
    } as any);

    const client = await connect(mcpServer.server);

    const result = await client.callTool("coda_rename_page", {
      docId: "doc-123",
      pageIdOrName: "page-456",
      newName: "Renamed Page",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: prettyJson({
          id: "page-456",
          requestId: "req-128",
        }),
      },
    ]);

    expect(sdk.updatePage).toHaveBeenCalledWith({
      path: { docId: "doc-123", pageIdOrName: "page-456" },
      body: {
        name: "Renamed Page",
      },
      throwOnError: true,
    });
  });

  it("should show error if rename page throws", async () => {
    vi.mocked(sdk.updatePage).mockRejectedValue(new Error("Rename failed"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_rename_page", {

      docId: "doc-123",
      pageIdOrName: "page-456",
      newName: "Renamed Page",
    });
    expect(result.content).toEqual([
      { type: "text", text: "Failed to rename page : Rename failed" },
    ]);
  });
});


describe("coda_resolve_link", () => {
  it("should resolve a browser link successfully", async () => {
    vi.mocked(sdk.resolveBrowserLink).mockResolvedValue({
      data: {
        resource: {
          type: "table",
          id: "tbl-789",
          browserLink: "https://coda.io/d/doc-123/Test-Table_ttable789",
        },
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_resolve_link", {
      url: "https://coda.io/d/doc-123/Test-Table_ttable789",
    });

    expect(result.content).toEqual([
      {
        type: "text",
        text: prettyJson({
          resource: {
            type: "table",
            id: "tbl-789",
            browserLink: "https://coda.io/d/doc-123/Test-Table_ttable789",
          },
        }),
      },
    ]);
    expect(sdk.resolveBrowserLink).toHaveBeenCalledWith({
      query: { url: "https://coda.io/d/doc-123/Test-Table_ttable789" },
      throwOnError: true,
    });
  });

  it("should show error if resolve link throws", async () => {
    vi.mocked(sdk.resolveBrowserLink).mockRejectedValue(new Error("Resource not found"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_resolve_link", {
      url: "https://coda.io/d/nonexistent-doc-456",
    });

    expect(result.content).toEqual([
      { type: "text", text: "Failed to resolve link : Resource not found" },
    ]);
  });
});

