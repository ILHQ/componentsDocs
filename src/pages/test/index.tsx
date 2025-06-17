import React, { useEffect } from 'react';
import lodash from 'lodash';
import './index.less';
const Test = () => {
  useEffect(() => {
    console.log(lodash);
  }, []);
  return <div className="test">Hello World!</div>;
};

export default Test;
