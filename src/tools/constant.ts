// node_modules 包对应的esm地址
export const ESM_PACKAGE_TYPE: any = {
  react: 'https://esm.sh/react@18.2.0',
  'react-dom': 'https://esm.sh/react-dom@18.2.0',
  lodash: 'https://esm.sh/lodash@4.17.21',
  // 'deeptwins-engine-3d': 'https://esm.sh/deeptwins-engine-3d@0.1.1',
  // 'deeptwins-engine-3d.css':
  //   'https://esm.sh/deeptwins-engine-3d@0.1.1/dist/assets/Build/Map3d/Widgets/widgets.css',
};

// node_modules 包对应的umd地址
export const UMD_PACKAGE_TYPE: any = {
  'deeptwins-engine-3d':
    'https://unpkg.com/deeptwins-engine-3d@0.1.1/dist/umd/deeptwins-engine-3d.min.js',
  'deeptwins-engine-3d.css':
    'https://unpkg.com/deeptwins-engine-3d@0.1.1/dist/umd/deeptwins-engine-3d.min.css',
};

// 文件后缀映射
export const EXTENSION_LANGUAGE: any = {
  js: 'javascript',
  ts: 'typescript',
  jsx: 'javascript',
  tsx: 'typescript',
  json: 'json',
  html: 'html',
  less: 'less',
  scss: 'scss',
  css: 'css',
  md: 'markdown',
};
