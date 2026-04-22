/**
 * @file server.ts
 * @description MCP server factory for moodle-mcp.
 *
 * Registered capabilities:
 *
 *   Tools:
 *     - init_moodle_context
 *     - generate_plugin_context
 *     - plugin_batch
 *     - update_indexes + watch_plugins
 *     - search_plugins, search_api, get_plugin_info, list_dev_plugins
 *     - doctor
 *     - explain_plugin
 *     - release_plugin
 *
 *   Resources:
 *     - moodle://context, index, workspace, api-index, events-index,
 *       tasks-index, services-index, db-tables, classes-index,
 *       capabilities-index, plugin-index, dev-rules, plugin-guide
 *     - moodle://plugins/with-context
 *     - moodle://plugin/{component}[/section]
 *
 *   Prompts:
 *     - scaffold_plugin, review_plugin, debug_plugin
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerInitTool }        from "./tools/init.js";
import { registerPluginTool }      from "./tools/plugin.js";
import { registerBatchTool }       from "./tools/batch.js";
import { registerUpdateTool }      from "./tools/update.js";
import { registerSearchTools }     from "./tools/search.js";
import { registerDoctorTool }      from "./tools/doctor.js";
import { registerExplainTool }     from "./tools/explain.js";
import { registerReleaseTool }     from "./tools/release.js";

import { registerMoodleResources } from "./resources/moodle.js";
import { registerPluginResources } from "./resources/plugin.js";

import { registerScaffoldPrompt }  from "./prompts/scaffold.js";
import { registerReviewPrompt }    from "./prompts/review.js";
import { registerDebugPrompt }     from "./prompts/debug.js";

const SERVER_NAME    = "moodle-mcp";
const SERVER_VERSION = "1.0.0";

export async function createServer(): Promise<McpServer> {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { resources: {}, tools: {}, prompts: {} } }
  );

  // Tools
  registerInitTool(server);
  registerPluginTool(server);
  registerBatchTool(server);
  registerUpdateTool(server);   // registers update_indexes + watch_plugins
  registerSearchTools(server);
  registerDoctorTool(server);
  registerExplainTool(server);
  registerReleaseTool(server);

  // Resources
  registerMoodleResources(server);
  await registerPluginResources(server);

  // Prompts
  registerScaffoldPrompt(server);
  registerReviewPrompt(server);
  registerDebugPrompt(server);

  return server;
}

export { SERVER_NAME, SERVER_VERSION };
