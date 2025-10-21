/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    'postcss-flexbugs-fixes': {},
    'postcss-hover-media-feature': {},
    'postcss-nested': {},
    'postcss-preset-env': {
      autoprefixer: {
        flexbox: 'no-2009',
      },
      stage: 3,
      features: {
        'custom-properties': false,
      },
    },
  },
}

export default config
