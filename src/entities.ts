import type { NodeData } from "@antv/g6";

export class NodeProperty<T> {
    value: T;
    editable: boolean;

    constructor(t: T, editable = true) {
        this.value = t;
        this.editable = true;
    }
};

export interface EntityNodeData {
    id: string,
    style: {
        size: [number, number],
        [key: string]: any
    },
    data: {
        name?: string,
        icon: string
    }
};

export interface ImageNodeData {
    id: string,
    style: {
        size: [number, number],
        source_id: string,
        stroke?: string,
        x0?: number,
        y0?: number,
        lineWidth?: number | string,
        [key: string]: any
    };
    data: {
        name?: string,
        mimetype: NodeProperty<string>
    }
};

export function makeImageNodeData(data: ImageNodeData): NodeData {
    return {
        id: data.id,
        type: "sc-image",
        style: {
            stroke: "#ffffff",
            lineWidth: 4,
            ...data.style,
            fillOpacity: 0,
        },
        data: {
            ...data.data
        }
    };
}

