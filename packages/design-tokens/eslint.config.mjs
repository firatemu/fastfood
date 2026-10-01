import config from '@fastfood/eslint-config/node';

export default [...config, { ignores: ['dist/**', 'src/web.generated.css'] }];
