import {
  createLambda,
  FileBlob,
  FileFsRef,
  Files,
  glob,
  Lambda,
} from '@vercel/build-utils/dist';
import * as nodeBridge from '@vercel/node-bridge';
import { makeVercelLauncher } from '@vercel/node-bridge/launcher';
import * as path from 'path';
import * as fs from 'fs-extra';

type ShadowBuildConfig = {
  name: string;
  target: string;
  assetPath: string;
  outputDir: string;
  outputTo: string;
};

async function buildStaticConfig(
  config: ShadowBuildConfig,
  workPath: string,
): Promise<Files> {
  const outputPath = config.outputDir.replace(config.assetPath, '');
  const files = await glob(path.join(outputPath, '**'), workPath);
  return files;
}

async function buildLambdaConfig(
  config: ShadowBuildConfig,
  workPath: string,
): Promise<Lambda> {
  const launcher = makeVercelLauncher({
    entrypointPath: require.resolve(path.join(workPath, config.outputTo)),
    bridgePath: require.resolve('@vercel/node-bridge'),
  });
  const preparedFiles = {
    'launcher.js': new FileBlob({ data: launcher }),
    'bridge.js': new FileFsRef({ fsPath: nodeBridge }),
    'index.js': new FileFsRef({
      fsPath: require.resolve(path.join(workPath, config.outputTo)),
    }),
  };
  return createLambda({
    files: { ...preparedFiles },
    handler: 'launcher.launcher',
    runtime: 'nodejs14.x',
  });
}

export default async function buildConfig(
  config: ShadowBuildConfig,
  workPath: string,
): Promise<Lambda | Files> {
  switch (config.target) {
    case 'browser':
      return buildStaticConfig(config, workPath);
    case 'node-library':
      return buildLambdaConfig(config, workPath);
    default:
      throw new Error(`Unknown build target type: ${config.target}`);
  }
}
