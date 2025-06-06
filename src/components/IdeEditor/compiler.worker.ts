import * as Babel from '@babel/standalone';
import {
  beforeTransformCodeHandler,
  css2Js,
  getModuleFile,
  json2Js,
} from '@/tools/utils';
import { CND_PACKAGE_TYPE } from '@/tools/constant';

// const babelTransform = (filename: string, code: string, files: any) => {
//   const _code = beforeTransformCodeHandler(filename, code);
//   let result = '';
//   try {
//     result = transform(_code, {
//       presets: ['react', 'typescript'],
//       filename,
//       plugins: [customResolver(files)],
//     }).code!;
//   } catch (e) {
//     self.postMessage({ type: 'ERROR', error: e });
//   }
//   return result;
// };

// const customResolver = (files: any) => {
//   return {
//     visitor: {
//       ImportDeclaration(path: any) {
//         const moduleName: string = path.node.source.value;
//         if (moduleName.startsWith('.')) {
//           const module = getModuleFile(files, moduleName);
//           if (!module) return;
//           if (module.name.endsWith('.css')) {
//             path.node.source.value = css2Js(module);
//           } else if (module.name.endsWith('.json')) {
//             path.node.source.value = json2Js(module);
//           } else {
//             console.log(moduleName);
//             path.node.source.value = URL.createObjectURL(
//               new Blob([babelTransform(module.name, module.value, files)], {
//                 type: 'application/javascript',
//               }),
//             );
//           }
//         }
//       },
//     },
//   };
// };
//
// const compile = (files: any) => {
//   const main = files[ENTRY_FILE_NAME];
//   const compileCode = babelTransform(ENTRY_FILE_NAME, main.value, files);
//   return { compileCode };
// };

// self.addEventListener('message', async ({ data }) => {
//   try {
//     if (typeof data === 'string') {
//       self.postMessage({
//         type: 'UPDATE_FILE',
//         data: transform(data, {
//           presets: ['react', 'typescript'],
//           retainLines: true,
//           filename: 'tempFileName',
//         }).code,
//       });
//       return;
//     }
//
//     self.postMessage({
//       type: 'UPDATE_FILES',
//       data: compile(data),
//     });
//   } catch (e) {
//     self.postMessage({ type: 'ERROR', error: e });
//   }
// });

// 匹配code中的来自node_models的import
function parseImports(code: string) {
  // 匹配导入语句的正则表达式
  const importRegex = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?/g;

  const importMap: any = {
    react: 'https://esm.sh/react@18.2.0',
    'react-dom': 'https://esm.sh/react-dom@18.2.0',
  };
  const importOrigin: any = {
    react: "import React from 'react';",
    'react-dom': "import ReactDom from 'react-dom';",
  };
  let resultCode = code;

  // 遍历所有匹配的导入语句
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const importStatement = match[0];
    const moduleName = match[2];

    // 检查是否是 node_modules 中的模块（不是相对路径或绝对路径）
    if (!moduleName.startsWith('.') && !moduleName.startsWith('/')) {
      // 构建 ESM URL
      importMap[moduleName] = CND_PACKAGE_TYPE?.[moduleName]
        ? CND_PACKAGE_TYPE[moduleName]
        : `https://esm.sh/${moduleName}@latest`;
    }

    // 从代码中移除导入语句
    resultCode = resultCode.replace(importStatement, '');
    importOrigin[moduleName] = importStatement;
  }

  // 移除多余的空白行
  resultCode = resultCode.replace(/^\s*\n/gm, '').trim();

  return {
    code: resultCode,
    importOrigin,
    importMap,
  };
}

// 解析code
const transpile = (code: string) => {
  const parseResult = parseImports(code);
  try {
    return {
      transformCode: Babel.transform(parseResult.code, {
        presets: ['react', 'typescript'],
        retainLines: true,
        filename: 'reactFile',
      }).code,
      importMap: parseResult.importMap,
      importOrigin: parseResult.importOrigin,
    };
  } catch (e: any) {
    return `document.body.innerHTML = '<pre style="color:red;">' + ${JSON.stringify(
      e.message,
    )} + '</pre>'`;
  }
};

self.addEventListener('message', async ({ data }) => {
  try {
    self.postMessage({
      type: 'UPDATE_FILE',
      data: transpile(data),
    });
  } catch (e) {
    self.postMessage({ type: 'ERROR', error: e });
  }
});
