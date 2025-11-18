import type { NodeData } from "@antv/g6";

export class NodeProperty<T> {
    value: T;
    editable: boolean;

    constructor(t: T, editable = true) {
        this.value = t;
        this.editable = true;
    }
};

export interface EntityNodeProps {
    type: "rect",
    style: {
        size: [number, number],
    },
    data: {
        name?: string,
        icon: string,
        type: string,
        notes: string
    }
};

export type EntityNodeData = EntityNodeProps & NodeData;

export interface WorldWideWebNodeProps {
    type: "circle",
    data: {
        name?: string,
        icon: string,
        url: string,
        mimetype: string
    }
};

export type WorldWideWebNodeData = WorldWideWebNodeProps & NodeData;

export function makeTextNodeData(item: DataTransferItem) {
    return new Promise((resolve, reject) => { item.getAsString(s => resolve(s)); }).then(s => {
        let data: WorldWideWebNodeData = {
            type: "circle",
            id: crypto.randomUUID(),
            style: {
                size: 128,
                labelPlacement: "right",
                labelMaxLines: 24,
                labelMaxWidth: "1000%",
                iconFontFamily: "iconfont",
                stroke: "#d3b987",
                lineWidth: 2,
                fillOpacity: 0
            },
            data: {
                name: "",
                icon: "+",
                url: "",
                mimetype: "text/plain",
                color: "#d3b987",
                notes: s
            }
        };
        return data;
    });
}

export function makeWWWNodeData(item: DataTransferItem) {
    return new Promise((resolve, reject) => { item.getAsString(s => resolve(s)); }).then(s => {
        let data: WorldWideWebNodeData = {
            type: "circle",
            id: crypto.randomUUID(),
            style: {
                size: 128,
                labelPlacement: "right",
                labelMaxLines: 4,
                labelWordWrap: true,
                labelMaxWidth: "1000%",
                iconFontFamily: "iconfont",
                stroke: "#6a6b3f",
                lineWidth: 2,
                fillOpacity: 0
            },
            data: {
                name: "",
                icon: "🔗",
                url: "",
                mimetype: item.type,
                color: "#c9d05c",
                notes: ""
            }
        };
        
        if (item.type === "text/uri-list") {
            data.data.url = s as string;
        }
        return data;
    });
}

export interface ImageNodeProps {
    type: "sc-image",
    style: {
        size: [number, number],
        source_id: string,
        stroke?: string,
        x0?: number,
        y0?: number,
    };
    data: {
        name?: string,
        mimetype: NodeProperty<string>
    }
};

export type ImageNodeData = ImageNodeProps & NodeData;

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

