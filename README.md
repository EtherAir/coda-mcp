# Coda MCP Server

This project implements a Model Context Protocol (MCP) server that acts as a bridge to interact with the [Coda](https://coda.io/) API. It allows an MCP client (like an AI assistant) to perform actions on Coda pages, such as listing, creating, reading, updating, duplicating, and renaming.

## Features

The server exposes the following tools to the MCP client:

### Document Operations
- **`coda_list_documents`**: List or search available documents with optional filtering
- **`coda_get_document`**: Get detailed information about a specific document
- **`coda_create_document`**: Create a new document, optionally from a template
- **`coda_update_document`**: Update document properties like title and icon
- **`coda_get_document_stats`**: Get comprehensive statistics and insights about a document

### Page Operations
- **`coda_list_pages`**: List pages in a document with pagination support
- **`coda_create_page`**: Create a new page, optionally under a parent page with initial content
- **`coda_delete_page`**: Delete a page from the document
- **`coda_get_page_content`**: Retrieve the content of a page as markdown
- **`coda_peek_page`**: Get a preview of the beginning of a page (limited lines)
- **`coda_replace_page_content`**: Replace the entire content of a page with new markdown
- **`coda_append_page_content`**: Append new markdown content to the end of a page
- **`coda_duplicate_page`**: Create a copy of an existing page with a new name
- **`coda_rename_page`**: Rename an existing page and optionally update its subtitle
- **`coda_search_pages`**: Search for pages by name or content within a document

### Table Operations
- **`coda_list_tables`**: List all tables and views in a document
- **`coda_get_table`**: Get detailed information about a specific table or view
- **`coda_get_table_summary`**: Get a comprehensive summary including row count, columns, and sample data
- **`coda_search_tables`**: Search for tables by name across a document

### Column Operations
- **`coda_list_columns`**: List all columns in a table with optional visibility filtering
- **`coda_get_column`**: Get detailed information about a specific column

### Row Operations
- **`coda_list_rows`**: List rows in a table with filtering, pagination, and sorting
- **`coda_get_row`**: Get detailed information about a specific row
- **`coda_create_rows`**: Create or update multiple rows in a table (upsert)
- **`coda_update_row`**: Update a specific row in a table
- **`coda_delete_row`**: Delete a specific row from a table
- **`coda_delete_rows`**: Delete multiple rows from a table
- **`coda_bulk_update_rows`**: Update multiple rows with different values in batch

### Formula Operations
- **`coda_list_formulas`**: List all named formulas in a document
- **`coda_get_formula`**: Get detailed information about a specific formula

### Control Operations
- **`coda_list_controls`**: List all controls (buttons, sliders, etc.) in a document
- **`coda_get_control`**: Get detailed information about a specific control
- **`coda_push_button`**: Push a button control in a table row

### User Operations
- **`coda_whoami`**: Get information about the current authenticated user

**Note**: This MCP server provides comprehensive CRUD operations for existing Coda elements but cannot create new tables or other canvas elements due to Coda API limitations. Total: **34 tools** available.

## Usage

Add the MCP server to Cursor/Claude Desktop/etc. like so:

```json
{
  "mcpServers": {
    "coda": {
      "command": "npx",
      "args": ["-y", "coda-mcp@latest"],
      "env": {
        "API_KEY": "..."
      }
    }
  }
}
```

Required environment variables:

- `API_KEY`: Your Coda API key. You can generate one from your Coda account settings.


## Local Setup

1.  **Prerequisites:**

    - Node.js
    - pnpm

2.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd coda-mcp
    ```

3.  **Install dependencies:**

    ```bash
    pnpm install
    ```

4.  **Build the project:**
    ```bash
    pnpm build
    ```
    This compiles the TypeScript code to JavaScript in the `dist/` directory.

## Running the Server

The MCP server communicates over standard input/output (stdio). To run it, set the environment variables and run the compiled JavaScript file - `dist/index.js`.
