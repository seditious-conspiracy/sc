import type { BehaviorOptions, UpdateBehaviorOption } from "@antv/g6/lib/spec/behavior.js";
import { getScApp, type ScApplication } from "./index.js";
import { idOf, type BaseLayoutOptions, type IEvent } from "@antv/g6";
import { getDatabase } from "./database.js";

export interface ModeColor {
    fg: string;
    bg: string;
};

export interface KeyMapping {
    key: string,
    callback: (app: ScApplication, ev: KeyboardEvent) => unknown;
    shift?: boolean,
    alt?: boolean,
    ctrl?: boolean,
};

export interface ScMode {
    name: string;
    behaviors: (UpdateBehaviorOption)[];
    keys?: KeyMapping[]
};

export const NORMAL: ScMode = {
    name: "NORMAL",
    behaviors: [
        { key: "drag-canvas-1", enable: (ev: any) =>  ev.targetType && ev.targetType === "canvas" && !ev.shiftKey },
        { key: "brush-select-1", enable: true, trigger: ["shift"] },
        { key: "drag-element-1", enable: (ev: any) => { return !ev.shiftKey } },
        // { key: "drag-element-force-1", enable: (ev: any) => { return !ev.shiftKey; } },
        { key: "focus-element-1", enable: true },
        { key: "create-edge-1", enable: false },
        { key: "brush-extract", enable: false }
    ],
    keys: [
        { key: "Delete", callback: (app, ev) => {
            app.graph.stopLayout();
            const edges = app.graph.getElementDataByState("edge", "selected").map(edge => idOf(edge));  
            const nodes = app.graph.getElementDataByState("node", "selected").map(node => {
                return node.id;
            });
            app.panel.focusNode();
            app.graph.removeData({ nodes: nodes, edges: edges });
            app.graph.render();
        } },
        { key: "Escape", callback: (app, ev) => {
            app.graph.updateData({
                nodes: app.graph.getNodeData().map(data => { return { id: data.id, states: [] } }),
                edges: app.graph.getEdgeData().map(data => { return { id: idOf(data), states: [] } }),
            });
            app.hoveredNode = undefined;
            app.panel.focusNode();
            // app.graph.render();
        } },
        { key: "=", callback: (app, ev) => {
            app.graph.zoomTo(1);
        } }
    ]
};

export const SELECT: ScMode = {
    name: "SELECT",
    behaviors: [
        { key: "drag-canvas-1", enable: (ev: any) => ev.targetType && ev.targetType === "canvas" && ev.shiftKey },
        { key: "brush-select-1", enable: true, trigger: ["drag"] },
        { key: "focus-element-1", enable: true },
        { key: "create-edge-1", enable: false },
        { key: "brush-extract", enable: false },
        { key: "drag-element-1", enable: false }
    ]
};

export const INSERT: ScMode = {
    name: "INSERT",
    behaviors: [
        { key: "drag-canvas-1", enable: (ev: any) =>  ev.targetType && ev.targetType === "canvas" && ev.shiftKey },
        { key: "create-edge-1", enable: true, trigger: ["drag", "click"] },
        { key: "brush-select-1", enable: false },
        { key: "focus-element-1", enable: false },
        { key: "brush-extract", enable: false },
        { key: "drag-element-1", enable: false }
    ]
};

export const EXTRACT: ScMode = {
    name: "EXTRACT",
    behaviors: [
        { key: "drag-canvas-1", enable: (ev: any) =>  ev.targetType && ev.targetType === "canvas" && ev.shiftKey },
        { key: "focus-element-1", enable: true },
        { key: "brush-select-1", enable: false },
        { key: "create-edge-1", enable: (ev: any) => ev.shiftKey, trigger: ["drag", "click"] },
        { key: "drag-element-1", enable: false },
        { key: "brush-extract", enable: true }
    ]
};

export class ScModeEvent extends Event {
    readonly current: ScMode;
    readonly next: ScMode;
    readonly app: ScApplication;

    constructor(_app: ScApplication, _current: ScMode, _next: ScMode) {
        super("scmode");
        this.app = _app;
        this.current = _current;
        this.next = _next;
    }
};

