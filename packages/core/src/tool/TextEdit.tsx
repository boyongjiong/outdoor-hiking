import { Component, createElement as h, createRef } from 'preact/compat'
import { observer } from 'mobx-preact'
import { LogicFlow } from '../LogicFlow'
import { GraphModel } from '../model'
import { ElementState, ElementType, EventType, ModelType } from '../constant'

export interface ITextEditProps {
  logicFlow: LogicFlow
  graphModel: GraphModel
}

export interface ITextEditState {
  style: {
    left: number
    top: number
  }
}

export const TextEdit = observer(
  class TextEditTool extends Component<ITextEditProps, ITextEditState> {
    static toolName = 'textEdit'
    ref = createRef()
    __prevText = {
      type: '',
      text: '',
      id: '',
    }

    constructor(props: ITextEditProps) {
      super(props)
      this.state = {
        style: {
          left: 0,
          top: 0,
        },
      }
    }

    placeCareAtEnd = (el: Element) => {
      if (
        window.getSelection() !== undefined &&
        document.createRange !== undefined
      ) {
        const range = document.createRange()
        range.selectNodeContents(el)
        range.collapse(false)

        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
    }

    static getDerivedStateFromProps(props: ITextEditProps): ITextEditState {
      const { graphModel } = props
      const { textEditElement, transformModel, theme } = graphModel
      let extraStyle

      if (textEditElement) {
        // 由于边上的文本是依据现实的时候动态计算出来的
        // 所以不能再边创建的时候就初始化文本位置，而是在边上创建文本的时候创建
        if (!textEditElement.text?.value) {
          if (textEditElement.baseType === ElementType.EDGE) {
            const textConfig = textEditElement.text
            const { x, y } = textEditElement.textPosition
            textConfig.x = x
            textConfig.y = y
            textEditElement.setText(textConfig)
          }
        }

        // 自动换行节点边通用样式
        const commonTextStyle = {
          resize: 'auto',
          whiteSpace: 'normal',
          wordBreak: 'break-all',
        }

        if (textEditElement.baseType === ElementType.EDGE) {
          // 如果是边文案自动换行，设置编辑框的宽度
          const {
            edgeText: { overflowMode, lineHeight, wrapPadding, textWidth },
          } = theme
          if (textWidth && overflowMode === 'autoWrap') {
            extraStyle = {
              ...commonTextStyle,
              width: textWidth,
              minWidth: textWidth,
              lineHeight,
              padding: wrapPadding,
            }
          }
        } else if (textEditElement.baseType === ElementType.NODE) {
          // 如果节点文案自动换行，设置编辑框的宽度
          const {
            nodeText: { overflowMode, lineHeight, wrapPadding, textWidth },
          } = theme
          const { width, modelType, textWidth: nodeTextWidth } = textEditElement

          // fix: 当节点设置了 textWidth 时，优先使用节点的 textWidth，否则使用 theme 的 textWidth，最后再用节点的 width
          const finalTextWidth: number =
            (nodeTextWidth as number) || textWidth || width
          // 文本节点没有默认宽高，只有在设置了 textWidth 之后才能进行自动换行
          if (
            (modelType !== ModelType.TEXT_NODE &&
              overflowMode === 'autoWrap') ||
            (modelType === ModelType.TEXT_NODE && textWidth)
          ) {
            extraStyle = {
              ...commonTextStyle,
              width: finalTextWidth,
              minWidth: finalTextWidth,
              lineHeight,
              padding: wrapPadding,
            }
          }
        }

        const { x, y } = textEditElement.text
        const [left, top] = transformModel.cp2Hp([x, y])
        return {
          style: {
            left,
            top,
            ...extraStyle,
          },
        }
      }

      return {
        style: {
          left: 0,
          top: 0,
        },
      }
    }

    componentDidUpdate() {
      const { graphModel } = this.props
      if (this.ref.current) {
        this.ref.current.focus()
        this.placeCareAtEnd(this.ref.current)
      }

      if (this.__prevText.id !== '') {
        const { text, id } = this.__prevText
        graphModel.updateText(id, text)
        graphModel.eventCenter.emit(EventType.TEXT_UPDATE, {
          ...this.__prevText,
        })
        this.__prevText.id = ''
        this.__prevText.type = ''
        this.__prevText.text = ''
      }
    }

    keyupHandler = (evt: KeyboardEvent) => {
      const {
        graphModel: { textEditElement },
      } = this.props
      // 按下 alt + enter 表示输入完成
      if (evt.key === 'Enter' && evt.altKey) {
        textEditElement?.setElementState(ElementState.DEFAULT)
      }
    }

    // fix: #587, #760
    keydownHandler = (evt: KeyboardEvent) => {
      evt.stopPropagation()
    }

    inputHandler = (evt: Event) => {
      const { innerText: value } = evt.target as HTMLElement
      const {
        graphModel: { textEditElement },
      } = this.props
      if (textEditElement) {
        const { type, id } = textEditElement
        this.__prevText = {
          // fix #488: 文本后面的换行符不保留
          text: value.replace(/(\r\n)+$|(\n)+$/, ''),
          type,
          id,
        }
      }
    }

    render(): h.JSX.Element | null {
      const {
        graphModel: { textEditElement },
      } = this.props
      const { style } = this.state
      return textEditElement ? (
        <div
          ref={this.ref}
          contentEditable={true}
          className="lf-text-input"
          style={style}
          key={textEditElement.id}
          onInput={this.inputHandler}
          onKeyUp={this.keyupHandler}
          onKeyDown={this.keydownHandler}
          onKeyPress={this.keydownHandler}
        >
          {textEditElement.text?.value}
        </div>
      ) : null
    }
  },
)

export default TextEdit
