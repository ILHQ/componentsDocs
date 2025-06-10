import './index.less';
import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';
import { Splitter } from 'antd';
import CompilerWorker from './compiler.worker.ts?worker&inline';
import { EXTENSION_LANGUAGE } from '@/tools/constant';
import { DownOutlined } from '@ant-design/icons';
import { Tree } from 'antd';
import type { TreeDataNode } from 'antd';

// 文件系统
const filesMap: any = {
  'main.jsx': `import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
      
const root = ReactDOM.createRoot(document.getElementById('viewRoot'));
root.render(<App />);`,
  App: {
    'index.jsx': `import React, { useEffect } from 'react';
import lodash from 'lodash';
import './index.less';
const App = () => {
  useEffect(() => {
    console.log(lodash);
  }, []);
  return <div>Hello World!</div>;
};

export default App;
`,
    'index.less': `.a{}`,
  },
};

const treeData: TreeDataNode[] = [
  {
    title: 'App',
    key: 'App',
    isLeaf: false,
    children: [
      {
        title: 'index.jsx',
        key: 'App/index.jsx',
        isLeaf: true,
      },
      {
        title: 'index.less',
        key: 'App/index.less',
        isLeaf: true,
      },
    ],
  },
  {
    title: 'main.jsx',
    key: 'main.jsx',
    isLeaf: true,
  },
];

// 解析器
let compiler: any;
// 编辑器
let editor: any;
// 上一个树的选择
let prevSelect: any = null;
// 当前树的选择
let currentSelect: any = null;

const IdeEditor = () => {
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
      language: 'typescript',
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
      compiler?.postMessage(filesMap);
    });
    return () => {
      editor.dispose();
    };
  }, []);

  const load = () => {
    compiler = new CompilerWorker();
    compiler.addEventListener('message', ({ data }: { data: any }) => {
      if (data.type === 'UPDATE_FILE') {
        try {
          console.log(data);

          const html = `
            <html>
              <head></head>
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
          if (iframeRef.current) {
            iframeRef.current.srcdoc = html;
          }
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
  const saveToCatalogue = (path: string) => {
    if (path) {
      const pathArr = path.split('/');
      let catalogue = filesMap;
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
    }
  };

  // 根据路径,设置code到编辑器
  const setPathCode = (path: string) => {
    if (path) {
      const pathArr = path.split('/');
      let catalogue = filesMap;
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
      <Splitter>
        <Splitter.Panel defaultSize="180" min="0" max="200">
          <div className="menu-list">
            <Tree
              switcherIcon={<DownOutlined />}
              defaultExpandedKeys={['2']}
              defaultSelectedKeys={['3']}
              onSelect={onSelect}
              treeData={treeData}
            />
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
