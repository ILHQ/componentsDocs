// json转js文件引入
export const json2Js = (fileCode: string) => {
  const js = `export default ${fileCode}`;
  return URL.createObjectURL(
    new Blob([js], { type: 'application/javascript' }),
  );
};

// css转js文件引入
export const css2Js = (fileCode: string, fileName: string) => {
  const randomId = new Date().getTime();
  const js = `
          (() => {
            let stylesheet = document.getElementById('style_${randomId}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}');
            if (!stylesheet) {
              stylesheet = document.createElement('style');
              stylesheet.setAttribute('id', 'style_${randomId}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}');
              document.head.appendChild(stylesheet);
            }
            const styles = document.createTextNode(\`${fileCode}\`);
            stylesheet.innerHTML = '';
            stylesheet.appendChild(styles);
          })();
        `;
  return URL.createObjectURL(
    new Blob([js], { type: 'application/javascript' }),
  );
};

// CSS URL转js文件引入
export const cssUrl2Js = (cssUrl: string, fileName: string) => {
  const randomId = new Date().getTime();
  const js = `
          (() => {
            let stylesheet = document.getElementById('style_${randomId}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}');
            if (!stylesheet) {
              stylesheet = document.createElement('link');
              stylesheet.rel = 'stylesheet';
              stylesheet.href = '${cssUrl}';
              stylesheet.setAttribute('id', 'style_${randomId}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}');
              document.head.appendChild(stylesheet);
            }
          })();
        `;
  return URL.createObjectURL(
    new Blob([js], { type: 'application/javascript' }),
  );
};

// 编辑前对代码处理
export const beforeTransformCodeHandler = (fileCode: string) => {
  let _code = fileCode;
  // 如果没有引入React，开头添加React引用
  const regexReact = /import\s+React/g;
  if (!regexReact.test(fileCode)) {
    _code = `import React from 'react';\n${fileCode}`;
  }
  return _code;
};

// 在文件树中查找
export function resolveImport(
  fileTree: any,
  fromPath: string,
  importPath: string,
) {
  // 简单处理路径，支持 ./ 和 ../
  function normalizePath(parts: any) {
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

  function getFileAtPath(obj: any, parts: any[]) {
    let current = obj;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }
    return current;
  }

  // 处理 fromPath，确保它是有效的路径
  let fromDirParts: string[];
  if (fromPath.includes('/')) {
    // 如果 fromPath 包含路径分隔符，需要判断是文件还是目录
    const pathParts = fromPath.split('/');
    const lastPart = pathParts[pathParts.length - 1];

    // 检查最后一部分是否包含文件扩展名
    if (lastPart.includes('.')) {
      // 包含扩展名，说明是文件路径，去掉最后一部分
      fromDirParts = pathParts.slice(0, -1);
    } else {
      // 不包含扩展名，说明是目录路径，保留所有部分
      fromDirParts = pathParts;
    }
  } else {
    // 如果 fromPath 不包含路径分隔符，需要判断是文件还是目录
    // 检查 fromPath 是否包含文件扩展名
    if (fromPath.includes('.')) {
      // 包含扩展名，说明是文件，目录部分为空
      fromDirParts = [];
    } else {
      // 不包含扩展名，说明是目录，应该包含在路径中
      fromDirParts = [fromPath];
    }
  }

  // 处理 importPath
  let importParts: string[];
  if (importPath.startsWith('./')) {
    // 相对路径，去掉 './'
    importParts = importPath.slice(2).split('/');
  } else if (importPath.startsWith('../')) {
    // 上级目录路径
    importParts = importPath.split('/');
  } else if (importPath.startsWith('/')) {
    // 绝对路径，去掉开头的 '/'
    importParts = importPath.slice(1).split('/');
  } else {
    // 相对路径（没有 ./ 前缀）
    importParts = importPath.split('/');
  }

  // 拼接路径并归一化
  const fullPathParts = normalizePath([...fromDirParts, ...importParts]);

  // 尝试不同的文件扩展名
  const extensions = ['index.tsx', 'index.jsx', 'index.js', 'index.ts'];

  // 首先尝试在目录下查找 index 文件
  for (const ext of extensions) {
    const target = getFileAtPath(fileTree, [...fullPathParts, ext]);
    if (typeof target === 'string') {
      return target;
    }
  }

  // 如果没找到 index 文件，尝试直接查找文件
  // 检查最后一个部分是否包含扩展名
  const lastPart = fullPathParts[fullPathParts.length - 1];
  if (lastPart && (lastPart.includes('.') || fullPathParts.length === 1)) {
    // 直接查找文件
    const target = getFileAtPath(fileTree, fullPathParts);
    if (typeof target === 'string') {
      return target;
    }
  } else {
    // 尝试添加常见扩展名（包括样式文件）
    const commonExtensions = [
      '.tsx',
      '.jsx',
      '.ts',
      '.js',
      '.less',
      '.css',
      '.scss',
    ];
    for (const ext of commonExtensions) {
      const target = getFileAtPath(fileTree, [
        ...fullPathParts,
        lastPart + ext,
      ]);
      if (typeof target === 'string') {
        return target;
      }
    }
  }

  console.log('No file found for path:', fullPathParts);
  return null;
}
