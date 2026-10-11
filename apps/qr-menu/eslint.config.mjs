import config from '@fastfood/eslint-config/react';

export default [
  ...config,
  { ignores: ['.next/**', 'next-env.d.ts'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // The QR menu is a customer-facing surface. It follows the same rule as
      // the Storefront: an independent visual system, no Admin/Operations
      // chrome and no Ops-only design tokens.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@fastfood/ui-web',
              message:
                'BURGER HOME QR Menü must not import Ops/Admin ui-web. Use an independent customer visual system.',
            },
            {
              name: '@fastfood/design-tokens',
              message:
                'BURGER HOME QR Menü uses an independent customer visual system, not Admin/Operations design tokens.',
            },
          ],
          patterns: [
            {
              group: ['**/admin-web/**', '**/courier-web/**'],
              message: 'QR Menü must not import Admin or Courier chrome.',
            },
          ],
        },
      ],
    },
  },
];