import { useRef, useEffect } from 'react'
import LogicFlow, { Car } from '@logicflow/core';
import '@logicflow/core/es/index.css';

const config: Partial<LogicFlow.Options> = {
  isSilentMode: true,
  stopScrollGraph: true,
  stopZoomGraph: true,
  style: {
    rect: {
      width: 100,
      height: 50,
      rx: 2,
      ry: 2,
    },
  },
};

const data = {
  nodes: [
    {
      id: '10',
      type: 'rect',
      x: 150,
      y: 70,
      text: '矩形',
    },
  ],
};

export default function BasicNode() {
  const lfRef = useRef<LogicFlow>();
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const car = new Car()
    car.selfDestruct();

    if (!lfRef.current) {
      const lf = new LogicFlow({
        ...config,
        container: containerRef.current as HTMLElement,
        // container: document.querySelector('#graph') as HTMLElement,
        grid: {
          size: 10,
        },
      });

      lf.render(data);
      lfRef.current = lf;
    }
  }, []);


  return (
    <>
      <div>Basic Node Demo</div>
      <div ref={containerRef} id="graph" className="viewport"></div>
    </>
  );
}
