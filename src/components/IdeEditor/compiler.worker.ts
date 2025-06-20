import * as Babel from '@babel/standalone';
import { resolveImport } from '@/tools/utils';
import { CND_PACKAGE_TYPE } from '@/tools/constant';
import { merge } from 'lodash';

/**
 * 匹配code中的import
 * @param {object} fileTree // 文件树
 * @param {string} formPath // 当前路径
 * @param {string} code // 代码
 ***/
function parseImports(fileTree: any, formPath: string, code: string) {
  // 匹配导入语句的正则表达式
  // const importRegex = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?/g;
  const importRegex = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]\s*;?/g;

  let importMap: any = {
    react: 'https://esm.sh/react@18.2.0',
    'react-dom': 'https://esm.sh/react-dom@18.2.0',
  };
  let resultCode = code;

  // 遍历所有匹配的导入语句
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const importStatement = match[0];
    const moduleName = match[1];

    // console.log(importStatement);
    // console.log(moduleName);
    // console.log(!moduleName.startsWith('.') && !moduleName.startsWith('/'));
    // 检查是否是 node_modules 中的模块（不是相对路径或绝对路径）
    if (!moduleName.startsWith('.') && !moduleName.startsWith('/')) {
      // 构建 ESM URL
      importMap[moduleName] = CND_PACKAGE_TYPE?.[moduleName]
        ? CND_PACKAGE_TYPE[moduleName]
        : `https://esm.sh/${moduleName}@latest`;
    } else {
      // 本地路径
      // 递归
      const result: any = transpile(
        fileTree,
        formPath,
        resolveImport(fileTree, formPath, moduleName),
      );
      importMap = merge(importMap, result.importMap);
      const url = URL.createObjectURL(
        new Blob([result.transformCode], {
          type: 'application/javascript',
        }),
      );
      // 从代码中替换导入语句
      resultCode = resultCode.replace(
        importStatement,
        importStatement.replace(moduleName, url),
      );
    }
  }

  // 移除多余的空白行
  resultCode = resultCode.replace(/^\s*\n/gm, '').trim();

  return {
    code: resultCode,
    importMap,
  };
}

/**
 * 解析code
 * @param {object} fileTree // 文件树
 * @param {string} formPath // 当前路径
 * @param {string} code // 代码
 ***/
const transpile = (fileTree: any, formPath: string, code: any) => {
  if (code) {
    const parseResult = parseImports(fileTree, formPath, code);
    try {
      return {
        transformCode: Babel.transform(parseResult.code, {
          presets: ['react', 'typescript'],
          retainLines: true,
          filename: 'file',
        }).code,
        importMap: parseResult.importMap,
      };
    } catch (e: any) {
      return `document.body.innerHTML = '<pre style="color:red;">' + ${JSON.stringify(
        e.message,
      )} + '</pre>'`;
    }
  } else {
    throw new Error('code is null');
  }
};

self.addEventListener('message', async ({ data }) => {
  try {
    self.postMessage({
      type: 'UPDATE_FILE',
      data: transpile(data, 'main.jsx', data['main.jsx']),
    });
  } catch (e) {
    self.postMessage({ type: 'ERROR', error: e });
  }
});
