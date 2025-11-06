import * as esbuild from 'esbuild';
import { createBuildSettings } from './settings.js';
import { cpSync } from 'node:fs';

const settings = createBuildSettings({ minify: true });

await esbuild.build(settings);
cpSync('src/index.html', 'dist/index.html');

