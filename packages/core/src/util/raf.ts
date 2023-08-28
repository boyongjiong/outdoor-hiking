type RafCallback = (timestamp: number) => void

export interface RafInstance {
  start: () => void
  stop: () => void
}

function createRaf(callback: RafCallback): RafInstance {
  let rafId: number | null = null

  const raf: FrameRequestCallback = (timestamp: number) => {
    callback(timestamp)
    rafId = requestAnimationFrame(raf)
  }

  const start = (): void => {
    if (!rafId) {
      rafId = requestAnimationFrame(raf)
    }
  }

  const stop = (): void => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  return {
    start,
    stop,
  }
}

export { createRaf }

// 使用示例
// const animation = createRaf((timestamp: number) => {
//   // 在此处执行你的动画或更新操作
//   console.log('Timestamp:', timestamp);
// });

// 启动动画
// animation.start();

// 停止动画
// animation.stop();
