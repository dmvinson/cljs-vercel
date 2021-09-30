import { getWriteableDirectory, runNpmInstall } from '@vercel/build-utils';
import tar from 'tar';
import fetch from 'node-fetch';
import * as fs from 'fs-extra';
import { parseEDNString } from 'edn-data';

export const javaVersion = '17.0.0.35.1';
const javaUrl = `https://corretto.aws/downloads/resources/${javaVersion}/amazon-corretto-${javaVersion}-linux-x64.tar.gz`;
const shadowBuildTypes = ['node-library'];

export async function installJava() {
  const res = await fetch(javaUrl);
  const tempDir = await getWriteableDirectory();
  if (!res.ok) {
    throw new Error(`Failed to down: ${javaUrl}`);
  }

  return new Promise((resolve, reject) => {
    res.body
      .on('error', reject)
      .pipe(tar.extract({ cwd: tempDir }))
      .on('finish', () => resolve(null));
  });
}

export async function installDependencies(userFiles, workPath) {
  const hasPackageJSON = Boolean(userFiles['package.json']);
  if (!hasPackageJSON) {
    throw new Error('Missing package.json file');
  }
  console.log('Installing dependencies from package.json');
  await runNpmInstall(workPath, []);
}

async function parseShadowConfig(configFile: string) {
  const entrypointFile = await fs.readFile(configFile, 'utf8');
  const parsedCfg = parseEDNString(entrypointFile, {
    mapAs: 'object',
    keywordAs: 'string',
  });
  const cfgsForDeploy = Object.entries(parsedCfg).filter(([, cfg]) => shadowBuildTypes.includes(cfg.target));
  return cfgsForDeploy.map(([name, cfg]) => ({
    name,
    target: cfg.target,
    assetPath: cfg['asset-path'],
    outputDir: cfg['output-dir'],
    outputTo: cfg['output-to'],
  }));
}

export async function parseConfig(userFiles) {
  const hasShadowCfg = Boolean(userFiles['shadow-cljs.edn']);
  if (!hasShadowCfg) {
    throw new Error('Missing shadow-cljs configuration file');
  }
  return parseShadowConfig(userFiles['shadow-cljs.edn'].fsPath);
}
