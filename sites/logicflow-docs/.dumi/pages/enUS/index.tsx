import React from 'react';
import Introduction from './components/Introduction';
import Demo from '../index/components/demo';
import '../index/index.less';

const Homepage: React.FC = () => {
  const scrollDown = () => {
    window.scrollTo(0, 650);
  };

  return (
    <section className="home-page">
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
        <p>Visualize your logic and enhance your workflow</p>
        <div className="dumi-default-hero-actions">
          <a href="/tutorial">Start</a>
          <a href="https://github.com/didi/LogicFlow" target="_blank">
            Github
          </a>
        </div>
        <span className="more-icon" onClick={scrollDown}></span>
      </div>
      <Demo></Demo>
      <Introduction></Introduction>
    </section>
  );
};

export default Homepage;