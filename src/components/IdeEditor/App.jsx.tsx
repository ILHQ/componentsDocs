import { useEffect } from 'react';

const App = () => {
  useEffect(() => {
    console.log(123);
  }, []);
  return <div>Hello JSX!</div>;
};

export default App;
