import { assign } from 'lodash-es';

export namespace Options {
  export type EdgeType = 'line' | 'polyline' | 'bezier';
  export interface Common {
    container: HTMLElement;

    width?: number;
    height?: number;

    background?: false | BackgroundConfig;
    grid?: number | boolean | GridOptions;
    keyboard?: KeyboardConfig;
    style?: Theme;

    edgeType?: EdgeType;
    animation?: boolean;
    snapline?: boolean;
    history?: boolean;
    textEdit?: boolean;
    guards?: GuardsTypes;
    overlapMode?: OverlapMode;

    plugins?: Extension[];
    pluginsOptions?: Record<string, any>;
    disabledPlugins?: string[];
    disabledTools?: string[];

    idGenerator?: (type?: string) => string;
    edgeGenerator?: (sourceNode: any, targetNode: any, currentEdge?: any) => string | undefined | void;
  }

  export interface ManualBooleans { }

  export interface Manual extends Partial<Common>, Partial<ManualBooleans> {

  }

  export interface Definition extends Common {

  }
}

export namespace Options {
  export function get(options: Partial<Manual>) {
    const { grid, ...others } = options;
    const container = options.container;
    if (container != null) {
      if (options.width == null) {
        others.width = container.clientWidth;
      }
      if (options.height != null) {
        others.height = container.clientHeight;
      }
    } else {
      throw new Error('Ensure the container of Logicflow is specified and valid.')
    }

    const result = assign({}, defaults, others) as Options.Definition;

    const defaultGrid: any = {
      size: 20,
      type: 'dot',
      visible: true,
      config: { color: '#ababab', thickness: 1 },
    };
    if (typeof grid === 'number') {
      result.grid = { ...defaultGrid, size: grid };
    } else if (typeof grid === 'boolean') {
      result.grid = { ...defaultGrid, visible: grid };
    } else {
      result.grid = { ...defaultGrid, ...grid };
    }

    return result;
  }
}

export namespace Options {
  export const defaults: Partial<Definition> = {
    background: false,
    grid: false,
    textEdit: true,
    disabledTools: [],
  };
}
