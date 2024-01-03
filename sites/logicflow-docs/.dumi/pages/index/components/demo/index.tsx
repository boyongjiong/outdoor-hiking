import React from 'react';
import LogicFlow from '@logicflow/core';
import '@logicflow/core/es/index.css';
import './index.less';

import StepNode from './node/stepNode';
import CircleNode from './node/circleNode';

const data = {
  nodes: [
    {
      id: '1',
      type: 'CircleNode',
      text: '开始',
      x: 100,
      y: 200,
    },
    {
      id: '2',
      type: 'StepNode',
      text: '拖拽元素',
      x: 280,
      y: 200,
    },
    {
      id: '3',
      type: 'StepNode',
      text: '连接元素',
      x: 480,
      y: 200,
    },
    {
      id: '4',
      type: 'StepNode',
      text: '逻辑设置',
      x: 680,
      y: 200,
    },
    {
      id: '5',
      type: 'CircleNode',
      text: '完成',
      x: 860,
      y: 200,
    },
  ],
  edges: [
    {
      sourceNodeId: '1',
      targetNodeId: '2',
      type: 'polyline',
      startPoint: {
        x: 140,
        y: 200,
      },
      endPoint: {
        x: 205,
        y: 200,
      },
    },
    {
      sourceNodeId: '2',
      targetNodeId: '3',
      type: 'polyline',
      startPoint: {
        x: 355,
        y: 200,
      },
      endPoint: {
        x: 405,
        y: 200,
      },
    },
    {
      sourceNodeId: '3',
      targetNodeId: '4',
      type: 'polyline',
      startPoint: {
        x: 555,
        y: 200,
      },
      endPoint: {
        x: 605,
        y: 200,
      },
    },
    {
      sourceNodeId: '4',
      targetNodeId: '5',
      type: 'polyline',
      startPoint: {
        x: 755,
        y: 200,
      },
      endPoint: {
        x: 820,
        y: 200,
      },
    },
  ],
};
const SilentConfig = {
  isSilentMode: true,
  stopScrollGraph: true,
  // stopMoveGraph: true,
  stopZoomGraph: true,
  adjustNodePosition: false,
  allowRotation: false,
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
    edgeAnimation: {
      stroke: '#d2d2d2',
    },
    polyline: {
      stroke: '#d2d2d2',
    },
  },
};

export default class Example extends React.Component {
  private container!: HTMLDivElement;
  lf!: LogicFlow;
  timer: NodeJS.Timer | undefined;

  componentDidMount() {
    const lf = new LogicFlow({
      container: this.container,
      grid: true,
      ...SilentConfig,
      ...styleConfig,
    });

    this.lf = lf;
    lf.register(StepNode);
    lf.register(CircleNode);

    lf.render(data);
    lf.translateCenter();
  }

  edgeAnimation = () => {
    const lf = this.lf;
    const { edges } = lf.getGraphRawData();
    edges.forEach(({ id }) => {
      lf.openEdgeAnimation(id);
    });
  };

  stopEdgeAnimation = () => {
    const lf = this.lf;
    const { edges } = lf.getGraphRawData();
    edges.forEach(({ id }) => {
      lf.closeEdgeAnimation(id);
    });
  };

  refContainer = (container: HTMLDivElement) => {
    this.container = container;
  };

  componentWillUnmount() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  render() {
    return (
      <div className="helloworld-app demo">
        <div className="app-content" ref={this.refContainer} />
        <div className="run-btn">
          <span onClick={this.edgeAnimation}>run</span>
          <span onClick={this.stopEdgeAnimation}>stop</span>
        </div>
      </div>
    );
  }
}
