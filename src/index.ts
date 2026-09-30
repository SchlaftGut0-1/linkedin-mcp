#!/usr/bin/env node
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createServer } from './server.js';
const directory = resolve(process.env.LINKEDIN_MCP_DATA_DIR ?? resolve(homedir(), '.linkedin-mcp'));
serveStdio(() => createServer(directory));
