import { ModelProvider } from 'model-context';
import { RouterProvider } from 'react-router-dom';
import routes from './router';
import useCommon from '@/models/useCommon';
import { ConfigProvider } from 'antd';

function App() {
  return (
    <ConfigProvider
      theme={{
        components: {
          Tree: {
            directoryNodeSelectedBg: '#1677ff',
            nodeSelectedBg: '#1677ff',
            nodeHoverBg: '#1e1e1e',
            nodeHoverColor: '#ffffff',
            nodeSelectedColor: '#ffffff',
            indentSize: 10,
            titleHeight: 22,
          },
        },
      }}
    >
      <ModelProvider
        models={{
          useCommon: useCommon(),
        }}
      >
        <RouterProvider router={routes} />
      </ModelProvider>
    </ConfigProvider>
  );
}

export default App;
