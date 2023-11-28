import * as React from 'react';
import '../../index/components/Introduction.less';

const locales = [
  {
    icon: '🛠',
    title: 'high expandability',
    desc: 'Compatible with a variety of products to customize the process of editing needs, the vast majority of modules in the form of plug-ins to achieve, support for the free insertion and removal of the modules.',
  },
  {
    icon: '🚀',
    title: 'high expandability',
    desc: 'Compatible with a variety of products to customize the process of editing needs, the vast majority of modules in the form of plug-ins to achieve, support for the free insertion and removal of the modules.',
  },
  {
    icon: '🎯',
    title: 'high expandability',
    desc: 'Compatible with a variety of products to customize the process of editing needs, the vast majority of modules in the form of plug-ins to achieve, support for the free insertion and removal of the modules.',
  },
];

export default function Introduction() {
  const inner = locales;
  return (
    <div className="intro-container">
      <div className="title-part">
        <h1>Design language and development framework</h1>
        <div>
          upporting ecology that allows you to quickly build web applications
        </div>
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
