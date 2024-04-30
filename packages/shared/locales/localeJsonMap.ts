import enUS from './en.json';

export const LOCALES = {
    'en-US': enUS,
    'zh-CN': () => import('./zh.json'),
};

export { enUS };
