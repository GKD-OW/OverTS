#!/usr/bin/env node

const fs = require('fs');
const { resolve, dirname } = require('path');
const root = process.cwd();

function error(message) {
  console.error(message);
  process.exit(1);
}

function mkdir(dir) {
  if (!fs.existsSync(resolve(dir, '..'))) {
    mkdir(resolve(dir, '..'));
  }
  fs.mkdirSync(dir);
}

const defaultConfig = {
  entry: './src/index.ts',
  output: './dist.ow'
}

let config = { ...defaultConfig };

const configFile = resolve(root, 'overts.config.js');
if (fs.existsSync(configFile)) {
  config = {
    ...config,
    ...require(configFile)
  };
}

const action = process.argv[2];

function build() {
  const entryFile = resolve(root, config.entry);
  if (!fs.existsSync(entryFile)) {
    error(`Entry file ${entryFile} not found`);
  }
  
  const outputFile = resolve(root, config.output);
  if (fs.existsSync(outputFile)) {
    fs.unlinkSync(outputFile);
  }
  if (!fs.existsSync(dirname(outputFile))) {
    mkdir(path.dirname(outputFile));
  }
  
  // 开始编译
  const Transformer = require('overts/lib').default;
  const Generator = require('overts/lib/owcode/generator').default;
  
  const transformer = new Transformer(
    fs.readFileSync(entryFile, { encoding: 'UTF8' }),
    dirname(entryFile)
  );
  const gen = new Generator(transformer.getResult());
  const result = gen.gen();
  fs.writeFileSync(outputFile, result, { encoding: 'UTF8' });
  console.log('Build finish');
}

switch (action) {
  case 'build':
  default:
    build();
    break;
}