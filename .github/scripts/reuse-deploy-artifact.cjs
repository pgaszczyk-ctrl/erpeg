// Reuse only successful artifacts from this repository's deployment workflow.
// A workflow change invalidates reuse, except this explicitly reviewed migration:
// it adds reuse without changing either build command, Node version or VITE_TEST.
const LEGACY_WORKFLOW = '19f9e21c236780cec069f558307680815f657e81';
const REUSE_WORKFLOW = '0c26fea7896ecf21ed0651112d2a4bf091bc7e67';
const nonBuildFile = p => p.startsWith('docs/') || p.startsWith('.github/') || p === 'CLAUDE.md' || p === 'AGENTS.md';
const productionInput = p => p === 'PRODUKCJA' || p.startsWith('produkcja/');

module.exports = async function reuseArtifact({ github, context, core, kind }) {
  if (!['production', 'test'].includes(kind)) throw new Error('Unknown artifact kind');
  core.setOutput('run_id', '');
  const { owner, repo } = context.repo;
  const path = '.github/workflows/deploy.yml';
  try {
    const current = (await github.rest.repos.getContent({ owner, repo, path, ref: context.sha })).data.sha;
    if (!/^[a-f0-9]{40}$/.test(current)) throw new Error('Missing workflow fingerprint');
    const runs = (await github.rest.actions.listWorkflowRuns({ owner, repo, workflow_id: 'deploy.yml',
      branch: context.ref.replace(/^refs\/heads\//, ''), event: 'push', per_page: 20 })).data.workflow_runs;
    for (const run of runs) {
      if (run.id >= context.runId || (kind === 'production' && run.conclusion !== 'success')) continue;
      const artifacts = (await github.rest.actions.listWorkflowRunArtifacts({ owner, repo, run_id: run.id })).data.artifacts;
      if (!artifacts.some(a => a.name === kind && !a.expired && a.size_in_bytes > 0)) continue;
      const recipe = (await github.rest.repos.getContent({ owner, repo, path, ref: run.head_sha })).data.sha;
      if (recipe !== current && !(recipe === LEGACY_WORKFLOW && current === REUSE_WORKFLOW)) continue;
      const diff = (await github.rest.repos.compareCommitsWithBasehead({ owner, repo, basehead: `${run.head_sha}...${context.sha}` })).data;
      // GitHub truncates changed files at 300: an incomplete comparison cannot establish reuse.
      if (!['ahead', 'identical'].includes(diff.status) || !Array.isArray(diff.files) || diff.files.length >= 300) continue;
      const paths = diff.files.flatMap(f => [f.filename, f.previous_filename].filter(Boolean));
      if (kind === 'production' ? paths.some(productionInput) : paths.some(p => !nonBuildFile(p))) continue;
      const jobs = (await github.rest.actions.listJobsForWorkflowRun({ owner, repo, run_id: run.id, per_page: 100 })).data.jobs;
      if (!jobs.some(j => j.name === kind && j.status === 'completed' && j.conclusion === 'success')) continue;
      core.info(`Reusing checked ${kind} artifact from deployment ${run.id}; build inputs are unchanged.`);
      core.setOutput('run_id', String(run.id));
      return run.id;
    }
  } catch (error) {
    // A missing/expired artifact or API failure must fall back to the ordinary build.
    core.warning(`Artifact reuse unavailable; using the ordinary build: ${error.message}`);
  }
  return null;
};
