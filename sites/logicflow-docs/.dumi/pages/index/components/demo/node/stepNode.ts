import { HtmlNode, HtmlNodeModel, h } from '@logicflow/core';

class StepNodeView extends HtmlNode {
  setHtml(rootEl: HTMLElement) {
    const { properties } = this.props.model;
    const text: any = properties.text;
    const innerText = text.value;

    const el = document.createElement('div');
    el.className = 'step-wrapper spin';
    const html = `<div class='text'>${innerText}</div>`;
    el.innerHTML = html;
    rootEl.appendChild(el);
  }
}

class StepNodeModel extends HtmlNodeModel {
  setAttributes() {
    this.width = 150;
    this.height = 85;
    this.properties.text = this.text;
    this.text = '';
  }
}

export default {
  type: 'StepNode',
  model: StepNodeModel,
  view: StepNodeView,
};
