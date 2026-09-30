import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
const profile = { name: 'Example Developer', headline: 'Developer', about: '', experience: [], skills: ['TypeScript'] };
test('stdio workflow persists profile, previews proposals and rejects invalid writes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'linkedin-mcp-test-'));
  const connect = async () => {
    const client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: ['dist/index.js'], env: { ...process.env, LINKEDIN_MCP_DATA_DIR: directory } }));
    return client;
  };
  let client;
  const call = async (name, args = {}) => {
    const response = await client.callTool({ name, arguments: args });
    assert.ok(!response.isError, JSON.stringify(response));
    return JSON.parse(response.content[0].text);
  };
  try {
    client = await connect();
    assert.equal((await client.listTools()).tools.length, 6);
    assert.equal((await call('get_capabilities')).linkedin.edit, false);
    await call('import_profile', { profile });
    const proposal = await call('propose_changes', { changes: { headline: 'TypeScript Developer' }, rationale: 'Reflect the supplied skill.' });
    const preview = await call('preview_changes', { proposalId: proposal.id });
    assert.equal(preview.before.headline, 'Developer');
    assert.equal(preview.after.headline, 'TypeScript Developer');
    assert.equal((await call('get_profile')).profile.headline, 'Developer');
    assert.equal((await call('export_changes', { proposalId: proposal.id })).application, 'manual');
    assert.equal((await client.callTool({ name: 'import_profile', arguments: { profile } })).isError, true);
    assert.equal((await client.callTool({ name: 'propose_changes', arguments: { changes: {}, rationale: 'Empty' } })).isError, true);
    assert.equal((await client.callTool({ name: 'import_profile', arguments: { profile: { ...profile, name: '' } } })).isError, true);
    await client.close();
    client = await connect();
    assert.equal((await call('get_profile')).profile.name, profile.name);
    await call('import_profile', { profile, replace: true });
    assert.equal((await client.callTool({ name: 'preview_changes', arguments: { proposalId: proposal.id } })).isError, true);
  } finally { await client?.close(); await rm(directory, { recursive: true, force: true }); }
});
