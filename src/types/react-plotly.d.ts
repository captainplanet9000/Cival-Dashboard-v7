declare module 'react-plotly.js' {
  import { Component } from 'react';
  import { PlotData, Layout, Config } from 'plotly.js';

  interface PlotParams {
    data: PlotData[];
    layout?: Partial<Layout>;
    config?: Partial<Config>;
    style?: React.CSSProperties;
    className?: string;
    useResizeHandler?: boolean;
    debug?: boolean;
    onInitialized?: (figure: PlotParams, graphDiv: HTMLElement) => void;
    onUpdate?: (figure: PlotParams, graphDiv: HTMLElement) => void;
    onPurge?: (figure: PlotParams, graphDiv: HTMLElement) => void;
    onError?: (err: Error) => void;
    onRedraw?: () => void;
    onRelayout?: (eventData: any) => void;
    onRestyle?: (eventData: any) => void;
    onClick?: (eventData: any) => void;
    onHover?: (eventData: any) => void;
    onUnhover?: (eventData: any) => void;
    onSelected?: (eventData: any) => void;
    onDeselect?: () => void;
    onDoubleClick?: () => void;
    divId?: string;
    revision?: number;
  }

  export default class Plot extends Component<PlotParams> {}
} 