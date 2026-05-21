// Metro configuration for ScaleTrek.
// `maxWorkers` is capped so a cold-cache release bundle doesn't spawn one
// worker per CPU core (16 here) and exhaust RAM on memory-constrained
// machines — that crashes the bundler with Windows exit 0xC0000409.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.maxWorkers = 3;

module.exports = config;
