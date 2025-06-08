import './index.less';
import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';
import { Splitter } from 'antd';
import CompilerWorker from './compiler.worker.ts?worker&inline';
import { DownOutlined } from '@ant-design/icons';
import { Tree } from 'antd';
import type { TreeDataNode } from 'antd';

const treeData: TreeDataNode[] = [
  {
    title: 'App',
    key: '2',
    children: [
      {
        title: 'index.jsx',
        key: '3',
      },
      {
        title: 'index.less',
        key: '3',
      },
    ],
  },
  {
    title: 'main.jsx',
    key: '1',
  },
];

let compiler: any;
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
    const editor = monaco.editor.create(el, {
      value: `import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
      
const root = ReactDOM.createRoot(document.getElementById('viewRoot'));
root.render(<App />);`,
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
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      compiler?.postMessage(editor.getValue());
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
            ${Object.values(data.data.importOrigin).join('\n')}
            try {
              ${data.data.transformCode}
              const root = ReactDOM.createRoot(document.getElementById('viewRoot'));
              root.render(React.createElement(App));
            } catch (e) {
              document.body.innerHTML = '<pre style="color:red;">' + e + '</pre>';
            }
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

  return (
    <div className="ide-editor">
      <Splitter>
        <Splitter.Panel defaultSize="180" min="0" max="200">
          <div className="menu-list">
            <Tree
              switcherIcon={<DownOutlined />}
              defaultExpandedKeys={['0-0-0']}
              // onSelect={onSelect}
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
