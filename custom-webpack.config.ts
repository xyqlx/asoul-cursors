import type { Configuration } from 'webpack';

module.exports = {
  entry: { background: 'src/background.ts' },
  optimization: {
    runtimeChunk: false
  }
} as Configuration;