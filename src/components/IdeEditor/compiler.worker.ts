import * as Babel from '@babel/standalone';
import {
  beforeTransformCodeHandler,
  css2Js,
  getModuleFile,
  json2Js,
} from '@/tools/utils';
import { CND_PACKAGE_TYPE } from '@/tools/constant';

const customResolver = (code: any) => {
  return {
    visitor: {
      ImportDeclaration(path: any) {
        console.log(111, path);
        const moduleName: string = path.node.source.value;
        if (!moduleName.startsWith('.') && !moduleName.startsWith('/')) {
          // const module = getModuleFile(files, moduleName);
          // if (!module) return;
          // if (module.name.endsWith('.css')) {
          //   path.node.source.value = css2Js(module);
          // } else if (module.name.endsWith('.json')) {
          //   path.node.source.value = json2Js(module);
          // } else {
          //   path.node.source.value = URL.createObjectURL(
          //     new Blob([babelTransform(module.name, module.value, files)], {
          //       type: 'application/javascript',
          //     }),
          //   );
          // }
        }
      },
    },
  };
};

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
    'react-dom': "import ReactDOM from 'react-dom';",
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
      // 从代码中移除导入语句
      resultCode = resultCode.replace(importStatement, '');
      // 记录移除的语句
      importOrigin[moduleName] = importStatement;
    } else {
      // 本地路径
      console.log(moduleName);
      // const a = URL.createObjectURL(
      //   new Blob(
      //     [
      //       Babel.transform(code, {
      //         presets: ['react', 'typescript'],
      //         retainLines: true,
      //         filename: 'file1',
      //       }).code,
      //     ],
      //     {
      //       type: 'application/javascript',
      //     },
      //   ),
      // );
    }
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
        filename: 'file',
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
