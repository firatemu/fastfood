import config from '@fastfood/eslint-config/node';

export default [...config, { ignores: ['dist/**', 'prisma/generated/**'] }];
