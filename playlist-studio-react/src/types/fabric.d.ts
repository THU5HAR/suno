declare module 'fabric' {
  export interface IObjectOptions {
    type?: string;
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    scaleX?: number;
    scaleY?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
    visible?: boolean;
    selectable?: boolean;
    evented?: boolean;
    lockMovementX?: boolean;
    lockMovementY?: boolean;
    lockRotation?: boolean;
    lockScalingX?: boolean;
    lockScalingY?: boolean;
    lockUniScaling?: boolean;
    hasControls?: boolean;
    hasBorders?: boolean;
    hasRotatingPoint?: boolean;
    transparentCorners?: boolean;
    perPixelTargetFind?: boolean;
    targetFindTolerance?: number;
    shadow?: any;
    clipTo?: any;
    transformMatrix?: number[];
    skewX?: number;
    skewY?: number;
    originX?: string;
    originY?: string;
    angle?: number;
    flipX?: boolean;
    flipY?: boolean;
    rx?: number;
    ry?: number;
  }

  export class Object {
    type?: string;
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    scaleX?: number;
    scaleY?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
    visible?: boolean;
    selectable?: boolean;
    evented?: boolean;
    lockMovementX?: boolean;
    lockMovementY?: boolean;
    lockRotation?: boolean;
    lockScalingX?: boolean;
    lockScalingY?: boolean;
    lockUniScaling?: boolean;
    hasControls?: boolean;
    hasBorders?: boolean;
    hasRotatingPoint?: boolean;
    transparentCorners?: boolean;
    perPixelTargetFind?: boolean;
    targetFindTolerance?: number;
    shadow?: any;
    clipTo?: any;
    transformMatrix?: number[];
    skewX?: number;
    skewY?: number;
    originX?: string;
    originY?: string;
    angle?: number;
    flipX?: boolean;
    flipY?: boolean;
    rx?: number;
    ry?: number;

    constructor(options?: IObjectOptions);

    set(options: Partial<IObjectOptions>): Object;
    set(key: string, value: any): Object;
    get(key: string): any;
    clone(): Object;
    toObject(): any;
    toJSON(): any;
    render(ctx: CanvasRenderingContext2D): void;
    containsPoint(point: { x: number; y: number }): boolean;
    intersectsWithRect(selectionTL: { x: number; y: number }, selectionBR: { x: number; y: number }): boolean;
    intersectsWithObject(other: Object): boolean;
    isContainedWithinObject(other: Object): boolean;
    isType(type: string): boolean;
    animate(property: string, value: any, options?: any): Object;
    bringToFront(): Object;
    bringForward(): Object;
    sendToBack(): Object;
    sendBackwards(): Object;
    moveTo(index: number): Object;
  }

  export interface IRectOptions extends IObjectOptions {
    rx?: number;
    ry?: number;
  }

  export class Rect extends Object {
    rx?: number;
    ry?: number;

    constructor(options?: IRectOptions);
  }

  export interface ICircleOptions extends IObjectOptions {
    radius?: number;
    startAngle?: number;
    endAngle?: number;
  }

  export class Circle extends Object {
    radius?: number;
    startAngle?: number;
    endAngle?: number;

    constructor(options?: ICircleOptions);
  }

  export interface ITextOptions extends IObjectOptions {
    text?: string;
    fontSize?: number;
    fontWeight?: string | number;
    fontFamily?: string;
    fontStyle?: string;
    lineHeight?: number;
    textDecoration?: string;
    textAlign?: string;
    textBackgroundColor?: string;
    charSpacing?: number;
    styles?: any;
    path?: any;
    useNative?: boolean;
    pathSide?: string;
    pathStartOffset?: number;
  }

  export class Text extends Object {
    text?: string;
    fontSize?: number;
    fontWeight?: string | number;
    fontFamily?: string;
    fontStyle?: string;
    lineHeight?: number;
    textDecoration?: string;
    textAlign?: string;
    textBackgroundColor?: string;
    charSpacing?: number;
    styles?: any;
    path?: any;
    useNative?: boolean;
    pathSide?: string;
    pathStartOffset?: number;

    constructor(text: string, options?: ITextOptions);
  }

  export interface IImageOptions extends IObjectOptions {
    crossOrigin?: string;
    filters?: any[];
    resizeFilter?: any;
  }

  export class Image extends Object {
    crossOrigin?: string;
    filters?: any[];
    resizeFilter?: any;

    constructor(element: HTMLImageElement, options?: IImageOptions);
    static fromURL(url: string, callback?: (img: Image, isError?: boolean) => void, imgOptions?: IImageOptions): Image;
  }

  export interface ICanvasOptions {
    width?: number;
    height?: number;
    backgroundColor?: string | any;
    backgroundImage?: Image | string;
    overlayColor?: string | any;
    overlayImage?: Image | string;
    includeDefaultValues?: boolean;
    stateful?: boolean;
    renderOnAddRemove?: boolean;
    skipOffscreen?: boolean;
    clipTo?: any;
    allowTouchScrolling?: boolean;
    imageSmoothingEnabled?: boolean;
    viewportTransform?: number[];
    backgroundVpt?: boolean;
    overlayVpt?: boolean;
    enableRetinaScaling?: boolean;
    selection?: boolean;
    selectionBorderColor?: string;
    selectionColor?: string;
    selectionDashArray?: number[];
    selectionLineWidth?: number;
    selectionKey?: string | string[];
    altSelectionKey?: string;
    selectionFullyContained?: boolean;
    hoverCursor?: string;
    moveCursor?: string;
    defaultCursor?: string;
    freeDrawingCursor?: string;
    rotationCursor?: string;
    containerClass?: string;
    perPixelTargetFind?: boolean;
    targetFindTolerance?: number;
    skipTargetFind?: boolean;
    preserveObjectStacking?: boolean;
    uniformScaling?: boolean;
    uniScaleTransform?: boolean;
    centeredScaling?: boolean;
    centeredRotation?: boolean;
    allowTouchScrolling?: boolean;
    fireRightClick?: boolean;
    fireMiddleClick?: boolean;
    stopContextMenu?: boolean;
    snapAngle?: number;
    snapThreshold?: number;
    controls?: any;
    fontSize?: number;
    fontWeight?: string | number;
    fontFamily?: string;
    fontStyle?: string;
    textAlign?: string;
    path?: any;
    strokeDashArray?: number[];
    strokeLineCap?: string;
    strokeLineJoin?: string;
    strokeMiterLimit?: number;
    shadow?: any;
    transformMatrix?: number[];
    fillRule?: string;
    globalCompositeOperation?: string;
    clipPath?: Object;
    inverted?: boolean;
    absolutePositioned?: boolean;
    lockMovementX?: boolean;
    lockMovementY?: boolean;
    lockRotation?: boolean;
    lockScalingX?: boolean;
    lockScalingY?: boolean;
    lockUniScaling?: boolean;
    hasControls?: boolean;
    hasBorders?: boolean;
    hasRotatingPoint?: boolean;
    transparentCorners?: boolean;
    hoverCursor?: string;
    moveCursor?: string;
    defaultCursor?: string;
    freeDrawingCursor?: string;
    rotationCursor?: string;
    containerClass?: string;
    perPixelTargetFind?: boolean;
    targetFindTolerance?: number;
    skipTargetFind?: boolean;
    isDrawingMode?: boolean;
    freeDrawingBrush?: any;
  }

  export class Canvas {
    width?: number;
    height?: number;
    backgroundColor?: string | any;
    backgroundImage?: Image | string;
    overlayColor?: string | any;
    overlayImage?: Image | string;
    includeDefaultValues?: boolean;
    stateful?: boolean;
    renderOnAddRemove?: boolean;
    skipOffscreen?: boolean;
    clipTo?: any;
    allowTouchScrolling?: boolean;
    imageSmoothingEnabled?: boolean;
    viewportTransform?: number[];
    backgroundVpt?: boolean;
    overlayVpt?: boolean;
    enableRetinaScaling?: boolean;
    selection?: boolean;
    selectionBorderColor?: string;
    selectionColor?: string;
    selectionDashArray?: number[];
    selectionLineWidth?: number;
    selectionKey?: string | string[];
    altSelectionKey?: string;
    selectionFullyContained?: boolean;
    hoverCursor?: string;
    moveCursor?: string;
    defaultCursor?: string;
    freeDrawingCursor?: string;
    rotationCursor?: string;
    containerClass?: string;
    perPixelTargetFind?: boolean;
    targetFindTolerance?: number;
    skipTargetFind?: boolean;
    preserveObjectStacking?: boolean;
    uniformScaling?: boolean;
    uniScaleTransform?: boolean;
    centeredScaling?: boolean;
    centeredRotation?: boolean;
    allowTouchScrolling?: boolean;
    fireRightClick?: boolean;
    fireMiddleClick?: boolean;
    stopContextMenu?: boolean;
    snapAngle?: number;
    snapThreshold?: number;
    controls?: any;
    fontSize?: number;
    fontWeight?: string | number;
    fontFamily?: string;
    fontStyle?: string;
    textAlign?: string;
    path?: any;
    strokeDashArray?: number[];
    strokeLineCap?: string;
    strokeLineJoin?: string;
    strokeMiterLimit?: number;
    shadow?: any;
    transformMatrix?: number[];
    fillRule?: string;
    globalCompositeOperation?: string;
    clipPath?: Object;
    inverted?: boolean;
    absolutePositioned?: boolean;
    lockMovementX?: boolean;
    lockMovementY?: boolean;
    lockRotation?: boolean;
    lockScalingX?: boolean;
    lockScalingY?: boolean;
    lockUniScaling?: boolean;
    hasControls?: boolean;
    hasBorders?: boolean;
    hasRotatingPoint?: boolean;
    transparentCorners?: boolean;
    hoverCursor?: string;
    moveCursor?: string;
    defaultCursor?: string;
    freeDrawingCursor?: string;
    rotationCursor?: string;
    containerClass?: string;
    perPixelTargetFind?: boolean;
    targetFindTolerance?: number;
    skipTargetFind?: boolean;
    isDrawingMode?: boolean;
    freeDrawingBrush?: any;

    constructor(element: HTMLCanvasElement, options?: ICanvasOptions);

    add(...object: Object[]): Canvas;
    insertAt(object: Object, index: number, nonSplicing?: boolean): Canvas;
    remove(...object: Object[]): Canvas;
    forEachObject(callback: (obj: Object, index: number, array: Object[]) => void, context?: any): Canvas;
    getObjects(type?: string): Object[];
    item(index: number): Object;
    isEmpty(): boolean;
    size(): number;
    contains(object: Object): boolean;
    sendToBack(object: Object): Canvas;
    bringToFront(object: Object): Canvas;
    sendBackwards(object: Object, intersecting?: boolean): Canvas;
    bringForward(object: Object, intersecting?: boolean): Canvas;
    moveTo(object: Object, index: number): Canvas;
    dispose(): void;
    renderAll(): Canvas;
    calcOffset(): Canvas;
    setBackgroundColor(backgroundColor: string | any, callback?: () => void): Canvas;
    setBackgroundImage(image: Image | string, callback?: () => void, options?: any): Canvas;
    setOverlayColor(overlayColor: string | any, callback?: () => void): Canvas;
    setOverlayImage(image: Image | string, callback?: () => void, options?: any): Canvas;
    getWidth(): number;
    getHeight(): number;
    setWidth(value: number, options?: any): Canvas;
    setHeight(value: number, options?: any): Canvas;
    getZoom(): number;
    setZoom(value: number): Canvas;
    getCenter(): { x: number; y: number };
    setViewportTransform(vpt: number[]): Canvas;
    zoomToPoint(point: { x: number; y: number }, value: number): Canvas;
    setCursor(value: string): void;
    findTarget(e: Event, skipGroup?: boolean): Object | undefined;
    getPointer(e: Event, ignoreZoom?: boolean): { x: number; y: number };
    getSelectionContext(): CanvasRenderingContext2D;
    getSelectionElement(): HTMLCanvasElement;
    setActiveObject(object: Object, e?: Event): Canvas;
    getActiveObject(): Object | undefined;
    getActiveObjects(): Object[];
    discardActiveObject(e?: Event): Canvas;
    renderTop(): Canvas;
    clear(): Canvas;
    toDataURL(options?: any): string;
    toJSON(): any;
    loadFromJSON(json: any, callback?: () => void, reviver?: (key: string, value: any) => any): Canvas;
    clone(callback?: (clone: Canvas) => void): Canvas;
    cloneWithoutData(callback?: (clone: Canvas) => void): Canvas;
    on(eventName: string, handler: (...args: any[]) => void): Canvas;
    off(eventName?: string, handler?: (...args: any[]) => void): Canvas;
    fire(eventName: string, options?: any): Canvas;
    __onMouseDown(e: Event): void;
    __onMouseMove(e: Event): void;
    __onMouseUp(e: Event): void;
    __onMouseOver(e: Event): void;
    __onMouseOut(e: Event): void;
    __onMouseWheel(e: Event): void;
    __onKeyDown(e: Event): void;
    __onKeyUp(e: Event): void;
    __onGesture(e: Event, self: Canvas): void;
    __onDragOver(e: Event): void;
    __onDragEnter(e: Event): void;
    __onDragLeave(e: Event): void;
    __onDrop(e: Event): void;
  }

  export const version: string;
}