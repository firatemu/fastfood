import config from '@fastfood/eslint-config/react-native';

export default [
  ...config,
  { ignores: ['.expo/**', 'expo-env.d.ts', 'android/**', 'ios/**'] },
  {
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@fastfood/ui-native',
              message:
                'BURGER HOME Mobile must not import Ops/Admin ui-native. Use the independent Mobile Stitch visual system (ADR-008).',
            },
            {
              name: '@fastfood/ui-web',
              message: 'BURGER HOME Mobile must not import Web React DOM ui-web components.',
            },
            {
              name: '@fastfood/design-tokens',
              message:
                'BURGER HOME Mobile uses an independent Stitch-derived visual system, not Admin/Operations design tokens.',
            },
          ],
          patterns: [
            {
              group: ['**/admin-web/**', '**/storefront-web/**', '**/ui-web/**', '**/ui-native/**'],
              message:
                'BURGER HOME Mobile customer UI must not import Admin/Storefront Web visuals or retired native chrome.',
            },
          ],
        },
      ],
    },
  },
];
