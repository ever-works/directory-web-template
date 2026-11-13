const { loadEnvConfig } = require("@next/env");
const { resolveSiteGitToken, isGitHubRemote, gitHubOnlyOnAuth } = require("./site-git-token.cjs");
const git = require("isomorphic-git")
const http = require("isomorphic-git/http/node")
const fs = require("node:fs")
const path = require("node:path")
const os = require('node:os')

loadEnvConfig(process.cwd());

const url = process.env.DATA_REPOSITORY;

if (!url) {
  console.warn("Warning: 'DATA_REPOSITORY' environment variable is missing.");
  console.warn("Content repository will not be cloned. Some content may not be available.");
  process.exit(0); // Exit gracefully without error
}


function getContentPath() {
  const contentDir = '.content';
  // Always use project directory during build to ensure content is included in deployment
  return path.join(process.cwd(), contentDir);
}

const dest = getContentPath();

async function main() {
  const token = await resolveSiteGitToken();
  // The token only ever goes to https://github.com (spec 054): onAuth checks the
  // remote isomorphic-git is calling, not just DATA_REPOSITORY. Never log the URL
  // (it may carry credentials of its own).
  const onAuth = gitHubOnlyOnAuth(token);
  if (token && !isGitHubRemote(url)) {
    console.warn("DATA_REPOSITORY is not a plain https://github.com URL; the GitHub token is only sent to https://github.com.");
  }
  await fs.promises.mkdir(dest, { recursive: true });

  // If already cloned, pull the latest content instead of skipping.
  const gitDir = path.join(dest, '.git');
  if (fs.existsSync(gitDir)) {
    console.log("Content repo already present, pulling latest changes:", dest);

    const pullOptions = {
      fs,
      http,
      url,
      dir: dest,
      author: { name: "website" },
      singleBranch: true,
    };

    if (token) {
      pullOptions.onAuth = onAuth;
    }

    await git.pull(pullOptions);
    return;
  }

  console.log("Cloning content repository to", dest);

  const cloneOptions = {
    fs,
    http,
    url,
    dir: dest,
    singleBranch: true,
  }

  if (token) {
    cloneOptions.onAuth = onAuth;
  }

  await git.clone(cloneOptions);
}

main().catch(err => {
  console.warn("Continuing build without content repository.", err);
  process.exit(0);
});
