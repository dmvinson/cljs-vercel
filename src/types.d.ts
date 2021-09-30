type Headers = { [k: string]: string | string[] | undefined };

interface UserFiles {
  [filePath: string]: import('@vercel/build-utils').File;
}

interface RuntimeFiles {
  [filePath: string]: import('@vercel/build-utils').File;
}

interface IncludedFiles {
  [filePath: string]: import('@vercel/build-utils').File;
}

interface MetaOptions {
  meta: import('@vercel/build-utils').Meta;
}

