import config from '@fastfood/eslint-config/react';

export default [
  ...config,
  { ignores: ['.next/**', 'next-env.d.ts'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@fastfood/ui-web',
              message:
                'BURGER HOME Storefront must not import Ops/Admin ui-web. Use the independent Stitch-derived Storefront design foundation.',
            },
            {
              name: '@fastfood/design-tokens',
              message:
                'BURGER HOME Storefront uses an independent Stitch-derived visual system, not Admin/Operations design tokens.',
            },
          ],
          patterns: [
            {
              group: [
                '**/admin-web/**',
                '**/components/smash/**',
                '**/components/stitch/**',
                '**/stitch/**',
              ],
              message:
                'Storefront customer UI must not import Admin chrome or retired Stitch runtime kits.',
            },
          ],
        },
      ],
    },
  },
];
