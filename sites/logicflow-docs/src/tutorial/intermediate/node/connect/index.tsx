import React from 'react';
import LogicFlow from '@logicflow/core';
import '@logicflow/core/es/index.css';
import CustomHexagon from './customHexagon';

import data from './connectData';
import './index.less';

const SilentConfig = {
  stopScrollGraph: true,
  stopMoveGraph: true,
  stopZoomGraph: true,
};

export default class Example extends React.Component {
  private container: HTMLDivElement;

  componentDidMount() {
    const lf = new LogicFlow({
      container: this.container,
      grid: true,
      ...SilentConfig,
    });

    lf.register(CustomHexagon);

    lf.setTheme({
      nodeText: {
        color: '#000000',
        overflowMode: 'ellipsis',
        lineHeight: 1.2,
        fontSize: 12,
      },
    });

    lf.render(data);
  }

  refContainer = (container: HTMLDivElement) => {
    this.container = container;
  };

  render() {
    return (
      <div className="helloworld-app">
        <div className="app-content" ref={this.refContainer} />
      </div>
    );
  }
}
