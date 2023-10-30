import { LogicFlow } from '@logicflow/core'

export type MenuPosition = {
  top: number
  left: number
}

export const DEFAULT_OFFSET = 3

/**
 * 根据容器及浏览器视窗计算菜单的位置
 * @param container LogicFlow 容器
 * @param mousePosition 当前鼠标点击位置
 * @param menu 菜单 dom
 */
export const calculateMenuPosition = (
  container: HTMLElement,
  mousePosition: LogicFlow.Position,
  menu: HTMLElement,
): MenuPosition => {
  const windowWidth =
    window.innerWidth ||
    document.documentElement.clientWidth ||
    document.body.clientWidth
  const windowHeight =
    window.innerHeight ||
    document.documentElement.offsetHeight ||
    document.body.clientHeight

  // 计算菜单的横向位置
  let menuLeft = mousePosition.x
  // TODO：确认它在什么情况下会满足这个条件
  if (mousePosition.x + menu.offsetWidth > windowWidth) {
    menuLeft = windowWidth - menu.offsetWidth
  }

  if (
    menuLeft + menu.offsetWidth >
    container.offsetLeft + container.offsetWidth
  ) {
    // menuLeft = container.offsetLeft + container.offsetWidth - menu.offsetWidth
    menuLeft = menuLeft - menu.offsetWidth
  }

  if (menuLeft < container.offsetLeft) {
    menuLeft = container.offsetLeft
  }

  // 计算菜单的纵向位置
  let menuTop = mousePosition.y
  if (menuTop + menu.offsetHeight > windowHeight) {
    menuTop = windowHeight - menu.offsetHeight
  }

  if (
    menuTop + menu.offsetHeight >
    container.offsetTop + container.offsetHeight
  ) {
    // menuTop = container.offsetTop + container.offsetHeight - menu.offsetHeight
    menuTop = menuTop - menu.offsetHeight
  }

  if (menuTop < container.offsetTop) {
    menuTop = container.offsetTop
  }

  return {
    top: menuTop,
    left: menuLeft,
  }
}
