import React from 'react';
import LogicFlow from '@logicflow/core';
import '@logicflow/core/es/index.css';
import './index.less';

// todo 首页demo
const data = {
  nodes: [
    {
      id: '1',
      type: 'rect',
      x: 100,
      y: 100,
      text: '节点1',
    },
    {
      id: '2',
      type: 'circle',
      x: 300,
      y: 100,
      text: '节点2',
    },
  ],
  edges: [
    {
      sourceNodeId: '1',
      targetNodeId: '2',
      type: 'polyline',
      text: '连线',
      startPoint: {
        x: 140,
        y: 100,
      },
      endPoint: {
        x: 250,
        y: 100,
      },
    },
  ],
};
const SilentConfig = {
  isSilentMode: true,
  stopScrollGraph: true,
  stopMoveGraph: true,
  stopZoomGraph: true,
  adjustNodePosition: true,
};
const styleConfig: Partial<LogicFlow.Options> = {
  style: {
    rect: {
      rx: 5,
      ry: 5,
      strokeWidth: 2,
    },
    circle: {
      fill: '#f5f5f5',
      stroke: '#fff',
    },
  },
};

export default class Example extends React.Component {
  private container: HTMLDivElement;

  componentDidMount() {
    const lf = new LogicFlow({
      container: this.container,
      grid: false,
      // background: {
      //   backgroundColor: '#f7f9fb',
      // },
      ...SilentConfig,
      ...styleConfig,
    });

    lf.render(data);
  }

  refContainer = (container: HTMLDivElement) => {
    this.container = container;
  };

  render() {
    return (
      <div className="helloworld-app demo">
        <div className="app-content" ref={this.refContainer} />
      </div>
    );
  }
}
