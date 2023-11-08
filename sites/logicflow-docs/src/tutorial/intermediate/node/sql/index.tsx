import React from 'react';
import LogicFlow from '@logicflow/core';
import '@logicflow/core/es/index.css';
import sqlNode from './sqlNode';
import sqlEdge from './sqlEdge';

import data from './sqlData';
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

    lf.register(sqlNode);
    lf.register(sqlEdge);

    lf.render(data);

    // TODO
    // 1.1.28新增，可以自定义锚点显示时机了
    // lf.on('anchor:dragstart', ({ data, nodeModel }) => {
    //   if (nodeModel.type === 'sql-node') {
    //     lf.graphModel.nodes.forEach((node) => {
    //       if (node.type === 'sql-node' && nodeModel.id !== node.id) {
    //         node.isShowAnchor = true;
    //         node.setProperties({
    //           isConnection: true,
    //         });
    //       }
    //     });
    //   }
    // });
    // lf.on('anchor:dragend', ({ data, nodeModel }) => {
    //   if (nodeModel.type === 'sql-node') {
    //     lf.graphModel.nodes.forEach((node) => {
    //       if (node.type === 'sql-node' && nodeModel.id !== node.id) {
    //         node.isShowAnchor = false;
    //         lf.deleteProperty(node.id, 'isConnection');
    //       }
    //     });
    //   }
    // });

    // document.querySelector('#js_add-field').addEventListener('click', () => {
    //   lf.getNodeModelById('node_id_1').addField({
    //     key: Math.random().toString(36).substring(2, 7),
    //     type: ['integer', 'long', 'string', 'boolean'][
    //       Math.floor(Math.random() * 4)
    //     ],
    //   });
    // });

    // document.querySelector('#js_save').addEventListener('click', () => {
    //   const data = lf.getGraphData();
    //   console.log(data);
    // });
  }

  refContainer = (container: HTMLDivElement) => {
    this.container = container;
  };

  render() {
    return (
      <div className="helloworld-app">
        <button id="js_add-field">添加字段</button>
        <button id="js_save">保存数据</button>
        <div className="app-content" ref={this.refContainer} />
      </div>
    );
  }
}
