import { useState } from 'react';

function useCommon() {
  const [count, setCount] = useState(0);

  return {
    count,
    setCount,
  };
}

export default useCommon;
