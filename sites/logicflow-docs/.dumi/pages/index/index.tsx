import React from 'react';
import Introduction from './components/Introduction';

const Homepage: React.FC = () => {
  return (
    <section>
      <div className="dumi-default-hero">
        <h1 className="dumi-default-hero-title">
          <span
            style={{
              background: 'linear-gradient(30deg, #3eaefd 30%, #2b65fa)',
              backgroundClip: 'revert-layer',
            }}
          >
            LogicFlow
          </span>
        </h1>
        <p>可视化您的逻辑，增强您的工作流程</p>
        <div className="dumi-default-hero-actions">
          <a href="/tutorial">开始使用</a>
          <a href="https://github.com/didi/LogicFlow" target="_blank">
            Github
          </a>
        </div>
      </div>
      <Introduction></Introduction>
      <div> TODO 样例 </div>
    </section>
  );
};

export default Homepage;
