import { BuildOptions, download, File } from '@vercel/build-utils';
import getWritableDirectory from '@vercel/build-utils/dist/fs/get-writable-directory';
import * as execa from 'execa';
import doBuild from './build';
import {
  installJava,
  installDependencies,
  parseConfig,
  javaVersion,
} from './helpers';

export const version = 3;

export async function build({
  files,
  entrypoint,
  workPath,
  config = {},
  meta = {},
}: BuildOptions) {
  if (meta.isDev) {
    console.log(`
      🐘 vercel dev is not supported right now.
    `);
    process.exit(255);
  }
  const userFiles: { [filePath: string]: File } = await download(
    files,
    workPath,
    meta,
  );

  await installJava();
  await installDependencies(userFiles, workPath);

  const buildCfgs = await parseConfig(userFiles);
  try {
    await execa(
      'npx',
      ['shadow-cljs', 'release', ...buildCfgs.map((cfg) => cfg.name)],
      {
        env: {
          JAVA_HOME: `${getWritableDirectory()}/amazon-corretto-${javaVersion}-linux-x64`,
          PATH: `${
            process.env.PATH
          }:${getWritableDirectory()}/amazon-corretto-${javaVersion}-linux-x64/bin`,
          M2: `${workPath}.m2`,
        },
        cwd: workPath,
        stdio: 'inherit',
      },
    );
  } catch (err) {
    console.error('Failed to build with shadow-cljs');
    throw err;
  }

  const lambdaCfg = buildCfgs.filter((cfg) => cfg.target === 'node-library')[0];
  return {
    output: await doBuild(lambdaCfg, workPath),
  };
}
