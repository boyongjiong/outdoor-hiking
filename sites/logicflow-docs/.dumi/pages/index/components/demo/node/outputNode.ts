import { HtmlNode, HtmlNodeModel, h } from '@logicflow/core';

class OutputNodeView extends HtmlNode {
  setHtml(rootEl: HTMLElement) {
    const { properties } = this.props.model;

    const el = document.createElement('div');
    el.className = 'color-wrapper';
    const html = `
      <div>
        <div class="color-head">Output</div>
        <div class="color-body">
          <div>hhh</div>
        </div>
      </div>
    `;

    el.innerHTML = html;
    // 需要先把之前渲染的子节点清除掉。
    rootEl.innerHTML = '';
    rootEl.appendChild(el);
  }
}

class OutputNodeModel extends HtmlNodeModel {
  setAttributes() {
    this.width = 300;
    this.height = 260;
    this.text = '';
  }
}

export default {
  type: 'OutputNode',
  model: OutputNodeModel,
  view: OutputNodeView,
};
