const { loadEnvConfig } = require("@next/env");
const git = require("isomorphic-git")
const http = require("isomorphic-git/http/node")
const fs = require("node:fs")
const path = require("node:path")
const os = require('node:os')

loadEnvConfig(process.cwd());

const token = process.env.GH_TOKEN;
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

const auth = { username: "x-access-token", password: token };
const dest = getContentPath();

async function main() {
  // If already cloned, skip to avoid wiping local content
  const gitDir = path.join(dest, '.git');
  if (fs.existsSync(gitDir)) {
    console.log("Content repo already present, skipping clone:", dest);
    return;
  }

  await fs.promises.mkdir(dest, { recursive: true });

  console.log("Cloning content repository to", dest);

  const cloneOptions = {
    fs,
    http,
    url,
    dir: dest,
    singleBranch: true,
  }

  if (token) {
    cloneOptions.onAuth = () => auth;
  }

  await git.clone(cloneOptions);
}

main().catch(err => {
  console.warn("Continuing build without content repository.", err);
  process.exit(0);
});