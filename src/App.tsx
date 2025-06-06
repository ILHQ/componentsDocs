import { ModelProvider } from 'model-context';
import { RouterProvider } from 'react-router-dom';
import routes from './router';
import useCommon from '@/models/useCommon';

function App() {
  return (
    <ModelProvider
      models={{
        useCommon: useCommon(),
      }}
    >
      <RouterProvider router={routes} />
    </ModelProvider>
  );
}

export default App;
