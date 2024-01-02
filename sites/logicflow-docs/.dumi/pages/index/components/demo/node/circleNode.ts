import { HtmlNode, HtmlNodeModel, h } from '@logicflow/core';

class CircleNodeView extends HtmlNode {
  setHtml(rootEl: HTMLElement) {
    const { properties } = this.props.model;
    const text: any = properties.text;
    const innerText = text.value;

    const el = document.createElement('div');
    el.className = 'step-wrapper circle-wrapper spin';
    const html = `<div class='text'>${innerText}</div>`;
    el.innerHTML = html;
    rootEl.appendChild(el);
  }
}

class CircleNodeModel extends HtmlNodeModel {
  setAttributes() {
    this.width = 80;
    this.height = 80;
    this.properties.text = this.text;
    this.text = '';
  }
}

export default {
  type: 'CircleNode',
  model: CircleNodeModel,
  view: CircleNodeView,
};
