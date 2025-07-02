import * as Babel from '@babel/standalone';
import {
  css2Js,
  json2Js,
  beforeTransformCodeHandler,
  resolveImport,
  cssUrl2Js,
} from '@/tools/utils';
import { ESM_PACKAGE_TYPE, UMD_PACKAGE_TYPE } from '@/tools/constant';
import { merge } from 'lodash';

/**
 * 构建导入文件的完整路径
 * @param {string} formPath // 当前文件路径
 * @param {string} moduleName // 导入的模块名
 * @returns {string} 完整的导入文件路径
 */
function buildImportFilePath(formPath: string, moduleName: string): string {
  if (moduleName.startsWith('./')) {
    // 相对路径，需要基于当前文件路径计算
    const currentDir = formPath.split('/').slice(0, -1).join('/');
    const relativePath = moduleName.slice(2); // 去掉 './'
    return currentDir ? `${currentDir}/${relativePath}` : relativePath;
  }
  // 绝对路径
  return moduleName;
}

/**
 * 处理外部模块导入（node_modules）
 * @param {string} moduleName // 模块名
 * @param {object} importMap // 导入映射
 * @param {object} scriptSrcMap // UMD 脚本映射
 * @returns {string} 处理结果：'umd' 表示 UMD 模块，'esm' 表示 ESM 模块，'css' 表示 CSS 文件，'skip' 表示跳过
 */
function handleExternalModule(
  moduleName: string,
  importMap: any,
  scriptSrcMap: any,
): string {
  // 首先检查是否在 UMD_PACKAGE_TYPE 中有对应的地址
  if (UMD_PACKAGE_TYPE?.[moduleName]) {
    // 将 UMD 模块添加到 scriptSrcMap
    scriptSrcMap[moduleName] = UMD_PACKAGE_TYPE[moduleName];
    console.log(
      `UMD 模块 ${moduleName} 在 CDN 中存在，将使用地址: ${UMD_PACKAGE_TYPE[moduleName]}`,
    );
    return 'umd';
  }
  // 检查是否在 ESM_PACKAGE_TYPE 中有对应的地址
  if (ESM_PACKAGE_TYPE?.[moduleName]) {
    // 检查是否是 CSS 文件
    if (/\.css$/i.test(moduleName)) {
      // CSS 文件不应该添加到 importMap，但应该返回 true 以便后续处理
      console.log(
        `CSS 模块 ${moduleName} 在 CDN 中存在，将使用地址: ${ESM_PACKAGE_TYPE[moduleName]}`,
      );
      return 'css';
    }

    // 只有在 ESM_PACKAGE_TYPE 中存在的 JavaScript/Wasm 模块才添加到 importMap
    importMap[moduleName] = ESM_PACKAGE_TYPE[moduleName];
    return 'esm';
  } else {
    // 不在 ESM_PACKAGE_TYPE 中的模块，不添加到 importMap
    console.warn(`模块 ${moduleName} 不在支持的 CDN 包列表中`);
    return 'skip';
  }
}

/**
 * 处理样式文件导入
 * @param {string} resolvedCode // 解析的文件内容
 * @param {string} moduleName // 模块名
 * @returns {string} 生成的 Blob URL
 */
function handleStyleFile(resolvedCode: string, moduleName: string): string {
  return css2Js(resolvedCode, moduleName);
}

/**
 * 处理 JSON 文件导入
 * @param {string} resolvedCode // 解析的文件内容
 * @returns {string} 生成的 Blob URL
 */
function handleJsonFile(resolvedCode: string): string {
  return json2Js(resolvedCode);
}

/**
 * 处理 JavaScript/TypeScript 文件导入
 * @param {object} fileTree // 文件树
 * @param {string} importFilePath // 导入文件路径
 * @param {string} resolvedCode // 解析的文件内容
 * @param {object} importMap // 导入映射
 * @param {object} scriptSrcMap // UMD 脚本映射
 * @returns {string} 生成的 Blob URL
 */
function handleJsFile(
  fileTree: any,
  importFilePath: string,
  resolvedCode: string,
  importMap: any,
  scriptSrcMap: any,
): string {
  const result: any = transpile(fileTree, importFilePath, resolvedCode);
  merge(importMap, result.importMap);
  merge(scriptSrcMap, result.scriptSrcMap);
  return URL.createObjectURL(
    new Blob([result.transformCode], {
      type: 'application/javascript',
    }),
  );
}

/**
 * 替换导入语句
 * @param {string} resultCode // 原始代码
 * @param {string} importStatement // 导入语句
 * @param {string} moduleName // 模块名
 * @param {string} url // 替换的 URL
 * @returns {string} 替换后的代码
 */
function replaceImportStatement(
  resultCode: string,
  importStatement: string,
  moduleName: string,
  url: string,
): string {
  return resultCode.replace(
    importStatement,
    importStatement.replace(moduleName, url),
  );
}

/**
 * 获取递归中的文件树
 * @param {object} fileTree // 原始文件树
 * @param {string} currentPath // 当前文件路径
 * @returns {object} 当前路径下的文件树
 */
function getCurrentFileTree(fileTree: any, currentPath: string): any {
  if (!currentPath || currentPath === 'main.jsx') {
    return fileTree;
  }

  const pathParts = currentPath.split('/');
  let currentTree = fileTree;

  for (const part of pathParts) {
    if (currentTree && typeof currentTree === 'object' && part in currentTree) {
      currentTree = currentTree[part];
    } else {
      return fileTree; // 如果路径不存在，返回原始文件树
    }
  }

  return currentTree;
}

/**
 * 匹配code中的import
 * @param {object} fileTree // 文件树
 * @param {string} formPath // 当前路径
 * @param {string} code // 代码
 ***/
function parseImports(fileTree: any, formPath: string, code: string) {
  // 匹配导入语句的正则表达式
  // 支持以下格式：
  // import 'module'
  // import * as name from 'module'
  // import { name } from 'module'
  // import defaultName from 'module'
  const importRegex =
    /import\s+(?:(?:\*|\{[^}]*\}|\w+)(?:\s+as\s+\w+)?\s+from\s+)?['"]([^'"]+)['"]\s*;?/g;

  // 需要导入的esm的地址
  const importMap: any = {};
  // 需要导入的umd的地址
  const scriptSrcMap: any = {};
  let resultCode = code;

  // 遍历所有匹配的导入语句
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const importStatement = match[0];
    const moduleName = match[1];

    // 检查是否是外部模块（node_modules）
    if (!moduleName.startsWith('.') && !moduleName.startsWith('/')) {
      const handleResult = handleExternalModule(
        moduleName,
        importMap,
        scriptSrcMap,
      );
      if (handleResult === 'umd') {
        // UMD 模块：去掉 import 语句，因为会通过 script 标签全局加载
        resultCode = resultCode.replace(importStatement, '');
        continue;
      } else if (handleResult === 'css') {
        // CSS 文件在 ESM_PACKAGE_TYPE 中存在，使用该地址
        const cssUrl = ESM_PACKAGE_TYPE[moduleName];
        // 使用 cssUrl2Js 函数生成动态加载代码
        const url = cssUrl2Js(cssUrl, moduleName);
        resultCode = replaceImportStatement(
          resultCode,
          importStatement,
          moduleName,
          url,
        );
        continue;
      } else if (handleResult === 'esm') {
        // ESM 模块：保持 import 语句，通过 importmap 解析
        continue;
      } else if (handleResult === 'skip') {
        // 不在支持的包列表中的模块，需要特殊处理或跳过
        if (/\.css$/i.test(moduleName)) {
          // 为 CSS 文件生成动态加载代码
          const cssUrl = `https://esm.sh/${moduleName}@latest`;
          // 使用 cssUrl2Js 函数生成动态加载代码
          const url = cssUrl2Js(cssUrl, moduleName);
          resultCode = replaceImportStatement(
            resultCode,
            importStatement,
            moduleName,
            url,
          );
        } else {
          // 其他静态资源，暂时跳过
          console.warn(`不支持的静态资源类型: ${moduleName}`);
          resultCode = resultCode.replace(importStatement, '');
        }
        continue;
      }
    }

    // 处理本地文件导入
    const importFilePath = buildImportFilePath(formPath, moduleName);
    const resolvedCode = resolveImport(fileTree, formPath, moduleName);

    if (!resolvedCode) {
      console.warn(`无法解析模块: ${moduleName}`);
      continue;
    }
    let url: string;

    // 根据文件类型处理
    if (/\.(less|css|scss)$/.test(moduleName)) {
      // 样式文件
      url = handleStyleFile(resolvedCode, moduleName);
    } else if (/\.(json)$/.test(moduleName)) {
      // JSON 文件
      url = handleJsonFile(resolvedCode);
    } else {
      // JavaScript/TypeScript 文件
      const transformCode = beforeTransformCodeHandler(resolvedCode);
      // 使用当前路径的文件树进行递归处理
      const currentFileTree = getCurrentFileTree(fileTree, formPath);
      url = handleJsFile(
        currentFileTree,
        importFilePath,
        transformCode,
        importMap,
        scriptSrcMap,
      );
    }

    // 替换导入语句
    resultCode = replaceImportStatement(
      resultCode,
      importStatement,
      moduleName,
      url,
    );
  }

  // 移除多余的空白行
  resultCode = resultCode.replace(/^\s*\n/gm, '').trim();

  return {
    code: resultCode,
    importMap,
    scriptSrcMap,
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
        scriptSrcMap: parseResult.scriptSrcMap,
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
