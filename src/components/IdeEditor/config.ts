// 指定引用的固定依赖的版本 防止版本不一致
export const DEPS = {
  react: 'react@18.2.0',
  'react-dom': 'react-dom@18.2.0',
  antd: 'antd@5.26.0',
};

// node_modules 包对应的esm地址
export const ESM_PACKAGE_TYPE = {
  react: 'https://esm.sh/react@18.2.0',
  'react-dom': 'https://esm.sh/react-dom@18.2.0',
  '@deepinnet-components/upload-images':
    'https://esm.sh/@deepinnet-components/upload-images@0.0.7?bundle=true',
  '@deepinnet-components/upload-images.css':
    'https://esm.sh/@deepinnet-components/upload-images@0.0.7/dist/esm/UploadImages/index.css',
};

// node_modules 包对应的umd地址
export const UMD_PACKAGE_TYPE: any = {
  'deeptwins-engine-3d':
    'https://unpkg.com/deeptwins-engine-3d@0.1.50/dist/umd/deeptwins-engine-3d.min.js',
  'deeptwins-engine-3d.css':
    'https://unpkg.com/deeptwins-engine-3d@0.1.50/dist/umd/deeptwins-engine-3d.min.css',
  // cesium:
  //   'https://cesium.com/downloads/cesiumjs/releases/1.131/Build/Cesium/Cesium.js',
  // 'cesium.css':
  //   'https://cesium.com/downloads/cesiumjs/releases/1.131/Build/Cesium/Widgets/widgets.css',
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
