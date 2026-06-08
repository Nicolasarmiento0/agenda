const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude dev-only top-level folders from the compiled app bundle.
// Patterns are anchored so they only match these exact root-level dirs,
// not node_modules that happen to contain similar substrings.
const root = path.resolve(__dirname);
config.resolver.blockList = [
  new RegExp(`^${root}/scripts/.*`),
  new RegExp(`^${root}/scratch/.*`),
  new RegExp(`^${root}/test/.*`),
];

module.exports = config;
