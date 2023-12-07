import { HtmlNode, HtmlNodeModel, h } from '@logicflow/core';

class TypeNodeView extends HtmlNode {
  setHtml(rootEl: HTMLElement) {
    const { properties } = this.props.model;

    const el = document.createElement('div');
    el.className = 'color-wrapper';
    const changeType = (event: Event) => {
      if (event.target.checked) {
        this.props.model.properties.type = (event.target as any).value;
      }
    };
    const html = `
      <div>
        <div class="color-head">Shape Type</div>
        <div class="color-body">
          <div>
            <input type="radio" id="cube" name="domeType" value="cube" ${
              properties.type === 'cube' ? 'checked' : ''
            } />
            <label for="cube">cube</label>
          </div>
          <div>
            <input type="radio" id="pyramid" name="domeType" value="pyramid" ${
              properties.type === 'pyramid' ? 'checked' : ''
            }/>
            <label for="pyramid">pyramid</label>
          </div>
        </div>
      </div>
    `;

    el.innerHTML = html;
    // 需要先把之前渲染的子节点清除掉。
    rootEl.innerHTML = '';
    rootEl.appendChild(el);
    const cubeDom = document.getElementById('cube');
    const pyramidDom = document.getElementById('pyramid');
    cubeDom?.removeEventListener('change', changeType, false);
    cubeDom?.addEventListener('change', changeType, false);
    pyramidDom?.removeEventListener('change', changeType, false);
    pyramidDom?.addEventListener('change', changeType, false);
  }
}

class TypeNodeModel extends HtmlNodeModel {
  setAttributes() {
    this.width = 150;
    this.height = 105;
    this.properties.type = 'cube'; // 初始样式
    this.text = '';
  }
}

export default {
  type: 'TypeNode',
  model: TypeNodeModel,
  view: TypeNodeView,
};
