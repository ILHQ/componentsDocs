import './index.less';
import * as monaco from 'monaco-editor';
import { useEffect, useRef, useState } from 'react';
import { Splitter, Tree } from 'antd';
import CompilerWorker from './compiler.worker.ts?worker&inline';
import { merge } from 'lodash';
import { EXTENSION_LANGUAGE } from '@/tools/constant';
import { DownOutlined } from '@ant-design/icons';

const allModules = import.meta.glob('/src/pages/**/*.*', { as: 'raw' });

function buildTreeAndNestedFiles(baseDir: string) {
  const root: any[] = [];
  const nestedFiles: any = {};

  // 工具函数：查找/创建子节点
  function findOrCreateChild(
    children: any[],
    name: string,
    key: string,
    isFile: boolean,
  ) {
    let child = children.find((c) => c.title === name);
    if (!child) {
      child = {
        title: name,
        key,
        isLeaf: isFile,
        ...(isFile ? {} : { children: [] }),
      };
      children.push(child);
    }
    return child;
  }

  // 过滤出匹配 baseDir 的模块
  const filteredEntries = Object.entries(allModules).filter(([path]) =>
    path.startsWith(baseDir),
  );

  // 构建 tree 和 files
  const loadPromises = filteredEntries.map(async ([fullPath, loader]) => {
    const raw = await loader();
    const relativePath = fullPath.replace('/src/pages/', '');
    const parts = relativePath.split('/');

    let currentTree = root;
    let currentFiles = nestedFiles;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = i === parts.length - 1;
      currentPath += currentPath ? `/${name}` : name;

      const node = findOrCreateChild(currentTree, name, currentPath, isFile);

      if (isFile) {
        currentFiles[name] = raw;
      } else {
        currentFiles[name] = currentFiles[name] || {};
        currentFiles = currentFiles[name];
        currentTree = node.children;
      }
    }
  });

  // 排序函数
  function sortTree(tree: any[]) {
    tree.sort((a, b) => {
      if (a.isLeaf !== b.isLeaf) return a.isLeaf ? 1 : -1;
      return a.title.localeCompare(b.title);
    });
    for (const node of tree) {
      if (!node.isLeaf && Array.isArray(node.children)) {
        sortTree(node.children);
      }
    }
  }

  return Promise.all(loadPromises).then(() => {
    sortTree(root);
    return {
      tree: root,
      files: nestedFiles,
    };
  });
}

const getMain = (catalog: string) => ({
  'main.jsx': `import React from 'react';
import ReactDOM from 'react-dom';
import App from './${catalog.split('/').pop()}';
const root = ReactDOM.createRoot(document.getElementById('viewRoot'));
root.render(<App />);`,
});

// 解析器
let compiler: any;
// 编辑器
let editor: any;
// 上一个树的选择
let prevSelect: any = null;
// 当前树的选择
let currentSelect: any = null;

const IdeEditor = ({ catalog }: any) => {
  // 文件code树
  const [filesCodeTree, setFilesCodeTree] = useState<any>({
    ...getMain(catalog),
  });
  const filesCodeTreeRef = useRef(null);
  filesCodeTreeRef.current = filesCodeTree;
  // 文件目录树
  const [fileCatalogueTree, setFileCatalogueTree] = useState<any[]>([]);
  // 默认展开
  const [defaultExpandedKeys, setDefaultExpandedKeys] = useState<any[]>([]);
  // 默认选中
  const [defaultSelectedKeys, setDefaultSelectedKeys] = useState<any[]>([]);
  const iframeRef: any = useRef(null);

  useEffect(() => {
    const el: any = document.getElementById('ideEditor');
    // 设置 JSX/TSX 编译选项
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      jsx: monaco.languages.typescript.JsxEmit.React,
      jsxFactory: 'React.createElement',
      reactNamespace: 'React',
      allowJs: true,
      noEmit: true,
    });
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    editor = monaco.editor.create(el, {
      value: '',
      theme: 'vs-dark',
      language: 'javascript',
      readOnly: false,
      automaticLayout: true,
      fontSize: 18,
    });
    // 开启 TypeScript 诊断和语法检查
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    load();
    // command + S 保存
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveToCatalogue(currentSelect);
      compiler?.postMessage(filesCodeTreeRef.current);
    });

    getFilesAndPath();
    return () => {
      editor && editor.dispose();
    };
  }, []);

  // 获取文件
  const getFilesAndPath = async () => {
    const { tree, files } = await buildTreeAndNestedFiles(catalog);
    setFilesCodeTree((file: any) => merge(file, files));
    setFileCatalogueTree(tree);
    setDefaultExpandedKeys([tree?.[0]?.key]);
    const defaultKey = tree?.[0]?.children?.find((t: any) =>
      ['index.jsx', 'index.tsx'].includes(t.title),
    )?.key;
    setDefaultSelectedKeys([defaultKey]);
    currentSelect = defaultKey;
    setPathCode(defaultKey, files);
    compiler?.postMessage(filesCodeTreeRef.current);
    console.log('目录结构树:', tree);
    console.log('文件内容映射:', files);
  };

  const load = () => {
    compiler = new CompilerWorker();
    compiler.addEventListener('message', ({ data }: { data: any }) => {
      if (data.type === 'UPDATE_FILE') {
        try {
          console.log(data);

          // 生成 UMD 脚本标签
          const umdScripts = Object.entries(data.data.scriptSrcMap || {})
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .map(([_, scriptUrl]) => {
              // 检查是否是 CSS 文件
              if (typeof scriptUrl === 'string' && /\.css$/i.test(scriptUrl)) {
                return `<link rel="stylesheet" href="${scriptUrl}" />`;
              }
              // JavaScript 文件
              return `<script src="${scriptUrl}"></script>`;
            })
            .join('\n');

          const html = `
            <html>
              <head>
                ${umdScripts}
              </head>
              <style>
                html,body,#viewRoot {
                  padding: 0;
                  margin: 0;
                  width: 100%;
                  height: 100%;
                }
              </style>
              <body>
                <div id="viewRoot"></div>
                <script type="importmap">
                  {
                    "imports": ${JSON.stringify(data.data.importMap)}
                  }
                </script>
                <script type="module">
                  ${data.data.transformCode}
                </script>
              </body>
            </html>
          `;
          console.log(html);

          localStorage.setItem('preview-html', html);
          iframeRef.current.src = location.origin + '/public/index.html';
        } catch (error) {
          console.error('importmap 解析错误:', error);
        }
      }
      if (data.type === 'ERROR') {
        console.log('error', data);
      }
    });
  };

  // 选择
  const onSelect = (keys: any[], e: any) => {
    if (!e.node.isLeaf) return;
    if (keys.length === 0) return;
    prevSelect = currentSelect;
    currentSelect = keys[0];
    saveToCatalogue(prevSelect);
    // 文件后缀
    const ext = currentSelect.split('.').pop().toLowerCase();
    monaco.editor.setModelLanguage(
      editor.getModel(),
      EXTENSION_LANGUAGE[ext] || 'plaintext',
    );
    setPathCode(currentSelect);
  };

  // 根据路径,保存code到目录
  const saveToCatalogue = (path: string, files?: any) => {
    if (path) {
      const pathArr = path.split('/').filter((t) => !!t);
      let catalogue = files || filesCodeTree;
      pathArr.forEach((t: string, i: number) => {
        if (i === pathArr.length - 1) {
          catalogue[t] = editor.getValue();
        } else {
          if (!catalogue[t]) {
            catalogue[t] = {};
          }
          catalogue = catalogue[t];
        }
      });
      setFilesCodeTree({ ...(files || filesCodeTree) });
    }
  };

  // 根据路径,设置code到编辑器
  const setPathCode = (path: string, files?: any) => {
    if (path) {
      const pathArr = path.split('/').filter((t) => !!t);
      let catalogue = files || filesCodeTree;
      pathArr.forEach((t: string, i: number) => {
        if (i === pathArr.length - 1) {
          editor.setValue(catalogue[t] || '');
        } else {
          if (!catalogue[t]) {
            catalogue[t] = {};
          }
          catalogue = catalogue[t];
        }
      });
    }
  };

  return (
    <div className="ide-editor">
      <div className="tips">control/command + s 保存</div>
      <Splitter>
        <Splitter.Panel defaultSize="180" min="50" max="200">
          <div className="menu-list">
            {defaultExpandedKeys?.length && defaultSelectedKeys?.length && (
              <Tree
                switcherIcon={<DownOutlined />}
                defaultExpandedKeys={defaultExpandedKeys}
                defaultSelectedKeys={defaultSelectedKeys}
                onSelect={onSelect}
                treeData={fileCatalogueTree}
              />
            )}
          </div>
        </Splitter.Panel>
        <Splitter.Panel defaultSize="40%" min="20%" max="70%">
          <div id="ideEditor" className="idea" />
        </Splitter.Panel>
        <Splitter.Panel>
          <iframe ref={iframeRef} className="view" />
        </Splitter.Panel>
      </Splitter>
    </div>
  );
};

export default IdeEditor;
