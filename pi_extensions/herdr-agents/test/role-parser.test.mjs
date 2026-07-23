import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { discoverRoles, filteredRoleTools, ORCHESTRATION_TOOLS, parseRoleFile, roleNameFromFilename, roleToPiArgs } from '../role-parser.js';

describe('role compatibility', () => {
  it('rejects every unsupported role key with its path and key name', () => {
    assert.throws(() => parseRoleFile('---\ndescription: unknown\nretry_count: 3\n---\nPrompt', '/roles/unknown.md'), /\/roles\/unknown\.md: unsupported role key 'retry_count'/);
    assert.throws(() => parseRoleFile('---\ndescription: background\nrun_in_background: true\n---\nPrompt', '/roles/bg.md'), /\/roles\/bg\.md: unsupported role key 'run_in_background'/);
  });

  it('accepts installed extension tool identifiers while excluding only herdr_agent', () => {
    const role = parseRoleFile('---\ndescription: extension tools\ntools: read, ext:pi-web-access/web_search, herdr_agent\n---\nPrompt', '/roles/ext.md');
    assert.deepEqual(filteredRoleTools(role), ['read', 'ext:pi-web-access/web_search']);
  });

  it('preserves wildcard semantics with Pi exclude-tools orchestration denylist', () => {
    const role = parseRoleFile('---\ndescription: wildcard\ntools: "*"\n---\nPrompt', '/roles/wild.md');
    assert.deepEqual(filteredRoleTools(role), ['*']);
    const args = roleToPiArgs(role);
    assert.ok(!args.includes('--tools'));
    assert.deepEqual(args.slice(args.indexOf('--exclude-tools') + 1, args.indexOf('--exclude-tools') + 2), [ORCHESTRATION_TOOLS.join(',')]);
  });

  it('uses an allowlist for explicit roles while removing herdr_agent', () => {
    const role = parseRoleFile('---\ndescription: explicit\ntools: read, herdr_agent, bash\n---\nPrompt', '/roles/explicit.md');
    assert.deepEqual(roleToPiArgs(role).slice(0, 2), ['--tools', 'read,bash']);
  });

  it('denies all tools when tools are omitted or orchestration filtering empties the allowlist', () => {
    for (const content of [
      '---\ndescription: omitted\n---\nPrompt',
      '---\ndescription: one orchestrator\ntools: herdr_agent\n---\nPrompt',
    ]) {
      const args = roleToPiArgs(parseRoleFile(content, '/roles/no-tools.md'));
      assert.ok(args.includes('--no-tools'));
      assert.ok(!args.includes('--tools'));
    }
  });

  it('retains a path-specific malformed-role error', () => {
    assert.throws(() => parseRoleFile('---\ndescription: bad\ntools: ext:bad tool\n---\nPrompt', '/roles/bad.md'), /\/roles\/bad\.md: unsafe characters/);
  });

  it('requires delimiter-only opening and closing frontmatter lines', () => {
    for (const content of [
      '---trailing\ndescription: bad\n---\nPrompt',
      '----\ndescription: bad\n---\nPrompt',
      '---\ndescription: bad\n---trailing\nPrompt',
      '---\ndescription: bad\n----\nPrompt',
    ]) assert.throws(() => parseRoleFile(content, '/roles/delimiter.md'), /frontmatter delimiter|unterminated frontmatter/);
    assert.equal(parseRoleFile('\uFEFF---\r\ndescription: valid\r\n---\r\nPrompt', '/roles/crlf.md').description, 'valid');
  });
});

describe('discoverRoles', () => {
  const roleContent = (description) => `---\ndescription: ${description}\n---\nBody`;
  const fakeIo = (files) => ({
    existsSync: (dir) => Object.keys(files).some((p) => p.startsWith(dir + '/')),
    readdir: async (dir) => Object.keys(files).filter((p) => p.startsWith(dir + '/')).map((p) => p.slice(dir.length + 1)),
    readFile: async (path) => files[path],
  });

  it('merges directories in order so a later (project) dir overrides an earlier (global) one', async () => {
    const globalDir = '/global/agents';
    const projectDir = '/project/.pi/agents';
    const io = fakeIo({
      [`${globalDir}/plan.md`]: roleContent('global plan'),
      [`${globalDir}/grill.md`]: roleContent('global grill'),
      [`${projectDir}/plan.md`]: roleContent('project plan'),
    });
    const { roles, errors } = await discoverRoles([globalDir, projectDir], io);
    assert.equal(roles.get('plan').role.description, 'project plan');
    assert.equal(roles.get('plan').filePath, `${projectDir}/plan.md`);
    assert.equal(roles.get('grill').role.description, 'global grill');
    assert.equal(errors.size, 0);
  });

  it('skips missing directories', async () => {
    const io = { existsSync: () => false, readdir: async () => ['role.md'], readFile: async () => roleContent('x') };
    const { roles } = await discoverRoles(['/absent'], io);
    assert.equal(roles.size, 0);
  });

  it('records a per-file parse error without aborting the remaining files', async () => {
    const dir = '/agents';
    const io = fakeIo({
      [`${dir}/bad.md`]: '---\n---\nno description',
      [`${dir}/good.md`]: roleContent('ok'),
    });
    const { roles, errors } = await discoverRoles([dir], io);
    assert.equal(roles.get('good').role.description, 'ok');
    assert.ok(errors.has('bad'));
    assert.ok(!roles.has('bad'));
  });
});
