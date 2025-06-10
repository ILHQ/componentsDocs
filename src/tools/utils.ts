export const getModuleFile = (files: any, moduleName: string) => {
  let _moduleName = moduleName.split('./').pop() || '';
  if (!_moduleName.includes('.')) {
    const realModuleName = Object.keys(files).find((key) =>
      key.split('.').includes(_moduleName),
    );
    if (realModuleName) _moduleName = realModuleName;
  }
  return files[_moduleName];
};

export const json2Js = (file: any) => {
  const js = `export default ${file.value}`;
  return URL.createObjectURL(
    new Blob([js], { type: 'application/javascript' }),
  );
};

export const css2Js = (file: any) => {
  const randomId = new Date().getTime();
  const js = `
                  (() => {
                    let stylesheet = document.getElementById('style_${randomId}_${file.name}');
                    if (!stylesheet) {
                      stylesheet = document.createElement('style')
                      stylesheet.setAttribute('id', 'style_${randomId}_${file.name}')
                      document.head.appendChild(stylesheet)
                    }
                    const styles = document.createTextNode(\`${file.value}\`)
                    stylesheet.innerHTML = ''
                    stylesheet.appendChild(styles)
                  })()
                  `;
  return URL.createObjectURL(
    new Blob([js], { type: 'application/javascript' }),
  );
};

// 编辑前对代码处理
export const beforeTransformCodeHandler = (filename: string, code: string) => {
  let _code = code;
  // 如果没有引入React，开头添加React引用
  const regexReact = /import\s+React/g;
  if (
    (filename.endsWith('.jsx') || filename.endsWith('.tsx')) &&
    !regexReact.test(code)
  ) {
    _code = `import React from 'react';\n${code}`;
  }
  return _code;
};

// 在文件树中查找
export function resolveImport(fileTree, fromPath, importPath) {
  // 简单处理路径，支持 ./ 和 ../
  function normalizePath(parts) {
    const stack = [];
    for (const part of parts) {
      if (part === '' || part === '.') continue;
      if (part === '..') {
        stack.pop();
      } else {
        stack.push(part);
      }
    }
    return stack;
  }

  function getFileAtPath(obj, parts) {
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }
    return current;
  }

  // fromPath 的目录
  const fromDirParts = fromPath.split('/').slice(0, -1);
  // importPath 拆分，去掉开头的 ./
  const importPartsRaw = importPath.startsWith('./')
    ? importPath.slice(2)
    : importPath;
  const importParts = importPartsRaw.split('/');

  // 拼接路径并归一化
  const fullPathParts = normalizePath([...fromDirParts, ...importParts]);

  // 优先找 index.jsx
  let target = getFileAtPath(fileTree, [...fullPathParts, 'index.jsx']);
  if (typeof target === 'string') {
    return target;
  }

  // 再找 index.js
  target = getFileAtPath(fileTree, [...fullPathParts, 'index.js']);
  if (typeof target === 'string') {
    return target;
  }

  // 直接找对应文件
  target = getFileAtPath(fileTree, fullPathParts);
  if (typeof target === 'string') {
    return target;
  }

  return null;
}
