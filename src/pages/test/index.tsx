import { useEffect } from 'react';
import DeepTwinsEngine3D from 'deeptwins-engine-3d';
import './index.less';

const Test = () => {
  useEffect(() => {
    const map = new DeepTwinsEngine3D.Map('map3dContainer');
    map.setDefaultLayer(DeepTwinsEngine3D.DefaultBaseLayer.GAO_DE_IMG);
  }, []);

  return <div id="map3dContainer" />;
};

export default Test;
