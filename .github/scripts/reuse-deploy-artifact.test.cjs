const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const reuse = require('./reuse-deploy-artifact.cjs');
const source = fs.readFileSync('.github/scripts/reuse-deploy-artifact.cjs', 'utf8');
const current = /const REUSE_WORKFLOW = '([^']+)'/.exec(source)[1];
const legacy = /const LEGACY_WORKFLOW = '([^']+)'/.exec(source)[1];
const workflow = fs.readFileSync('.github/workflows/deploy.yml');
assert.equal(crypto.createHash('sha1').update(`blob ${workflow.length}\0`).update(workflow).digest('hex'), current, 'reviewed migration must match the exact workflow');

async function check(kind, options = {}) {
  const output = {};
  const github = { rest: {
    repos: {
      getContent: async ({ ref }) => ({ data: { sha: ref === 'new' ? current : options.recipe ?? legacy } }),
      compareCommitsWithBasehead: async () => ({ data: { status: options.status ?? 'ahead', files: options.files ?? [] } }),
    },
    actions: {
      listWorkflowRuns: async () => ({ data: { workflow_runs: [{ id: 10, head_sha: 'old', conclusion: options.conclusion ?? 'success' }] } }),
      listWorkflowRunArtifacts: async () => ({ data: { artifacts: [{ name: kind, expired: !!options.expired, size_in_bytes: 100 }] } }),
      listJobsForWorkflowRun: async () => ({ data: { jobs: [{ name: kind, status: 'completed', conclusion: options.job ?? 'success' }] } }),
    },
  } };
  const result = await reuse({ github, kind, context: { repo: { owner: 'owner', repo: 'game' }, sha: 'new', runId: 20, ref: 'refs/heads/test' },
    core: { setOutput: (k, v) => output[k] = v, info() {}, warning() {} } });
  assert.equal(output.run_id, result ? String(result) : '');
  return result;
}
(async () => {
  assert.equal(await check('test', { files: [{ filename: 'docs/result.md' }, { filename: '.github/workflows/deploy.yml' }] }), 10);
  assert.equal(await check('production', { files: [{ filename: 'src/scenes/GameScene.ts' }] }), 10);
  assert.equal(await check('test', { recipe: current }), 10, 'same workflow recipe can reuse artifacts');
  for (const filename of ['src/scenes/GameScene.ts', 'public/map-input.json', 'scripts/build-maps.mjs', 'package-lock.json'])
    assert.equal(await check('test', { files: [{ filename }] }), null);
  for (const filename of ['PRODUKCJA', 'produkcja/release.patch'])
    assert.equal(await check('production', { files: [{ filename }] }), null);
  assert.equal(await check('test', { files: [{ filename: 'docs/moved.md', previous_filename: 'src/code.ts' }] }), null);
  assert.equal(await check('test', { files: Array.from({ length: 300 }, (_, i) => ({ filename: `docs/${i}.md` })) }), null);
  assert.equal(await check('test', { recipe: 'unreviewed-change' }), null);
  assert.equal(await check('test', { expired: true }), null);
  assert.equal(await check('test', { job: 'failure' }), null);
  assert.equal(await check('test', { status: 'diverged' }), null);
  assert.equal(await check('production', { conclusion: 'cancelled' }), null);
  assert.equal(await check('test', { conclusion: 'cancelled' }), 10, 'completed test survives cancellation of the unrelated production build');
  console.log('PASS artifact provenance, exact recipe, changed inputs, renamed inputs, incomplete diff, expiry and failed jobs');
})().catch(e => { console.error(e); process.exitCode = 1; });
