#!/usr/bin/env node
// Wrapper that strips --reset-cache from arguments before calling real Expo CLI.
// --reset-cache causes Metro to rebuild from scratch, using >4GB RAM on Windows,
// causing OOM. Without it, Metro reuses cached transforms and bundles in ~15s.
const path = require('path');
const { spawnSync } = require('child_process');

const realCli = require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] });
const args = process.argv.slice(2).filter(a => a !== '--reset-cache');

const result = spawnSync(process.execPath, [realCli, ...args], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=3072' },
});

process.exit(result.status ?? 0);
