import './index.less';
import IdeEditor from '@/components/IdeEditor';

const Home = () => {
  return (
    <div className="home">
      <IdeEditor catalog="/src/pages/test" />
    </div>
  );
};

export default Home;
