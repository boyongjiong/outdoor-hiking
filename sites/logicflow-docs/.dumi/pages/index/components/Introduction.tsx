import * as React from 'react';
import { Link, useLocation } from 'dumi';
import * as utils from '../../../theme/utils';
import './Introduction.less';

const locales = {
  cn: [
    {
      icon: '🛠',
      title: '高拓展性',
      desc: '兼容各种产品自定义的流程编辑需求，绝大部分模块以插件的形式实现，支持各模块自由插拔。',
    },
    {
      icon: '🚀',
      title: '高拓展性',
      desc: '兼容各种产品自定义的流程编辑需求，绝大部分模块以插件的形式实现，支持各模块自由插拔。',
    },
    {
      icon: '🎯',
      title: '高拓展性',
      desc: '兼容各种产品自定义的流程编辑需求，绝大部分模块以插件的形式实现，支持各模块自由插拔。',
    },
  ],
  en: [],
};

export default function Introduction() {
  const { pathname, search } = useLocation();
  const isENUS = utils.isENUS(pathname);
  const inner = isENUS ? locales.en : locales.cn;

  return (
    <div className="intro-container">
      <div className="title-part">
        <h1>设计语言与研发框架</h1>
        <div>配套生态，让你快速搭建网站应用</div>
      </div>
      <div className="dumi-default-features intro-inner" data-cols="3">
        {inner.map((domItem, domIdx) => {
          return (
            <div
              className="dumi-default-features-item intro-item"
              key={`intro-item${domIdx}`}
            >
              <i>{domItem.icon}</i>
              <h3>{domItem.title}</h3>
              <p>{domItem.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
