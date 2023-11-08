import React from 'react';
import LogicFlow from '@logicflow/core';
import '@logicflow/core/es/index.css';
// import {
//   DndPanel,
//   SelectionSelect,
//   Control,
// } from '@logicflow/extension';
import { data, patternItems, SilentConfig } from './pluginData';
import '../index.less';

export default class Example extends React.Component {
  private container: HTMLDivElement;

  componentDidMount() {
    const lf = new LogicFlow({
      container: this.container,
      grid: true,
      ...SilentConfig,
      // plugins: [DndPanel, SelectionSelect, Control]
    });

    // 设置节点面板
    console.log('patternItems', patternItems);
    // lf.setPatternItems(patternItems);

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
