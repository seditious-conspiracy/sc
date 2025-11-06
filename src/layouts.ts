import type { BaseLayoutOptions, LayoutOptions, NodeData } from "@antv/g6";
import { getScApp } from "./index.js";

const rectangleNodeRadius = (d: any) => {
    const size = d.data.style?.size || d.style.size;
    if (Array.isArray(size)) {
        // return Math.max(size[0], size[1]);
        return Math.hypot(size[0], size[1]);
    } else {
        return (size as number) || 64;
    }
};

// for compact layout
const nodeWidth = (n: NodeData) => {
    const d: any = getScApp().graph.getNodeData(n.id);
    const size = d.style.size;
    if (Array.isArray(size)) {
        return size[0]; 
    } else {
        return size;
    }
}

const nodeHeight = (n: NodeData) => {
    const d: any = getScApp().graph.getNodeData(n.id);
    const size = d.style.size;
    if (Array.isArray(size)) {
        return size[1]; 
    } else {
        return size;
    }
}

type LayoutList = Record<string, LayoutOptions & BaseLayoutOptions>;;

export const layouts: LayoutList = {
    d3: {
        type: "d3-force",
        link: {
            distance: (d: any) => {
                const sourceSize: [number, number] = (d.source as any).style.size;
                const targetSize: [number, number] = (d.target as any).style.size;
                return 0.25 * Math.hypot(sourceSize[0], sourceSize[1]) + Math.hypot(targetSize[0], targetSize[1]);
                // return 0.5 * (Math.max(sourceSize[0], targetSize[0]) + Math.max(sourceSize[1], targetSize[1]));
            },
            strength: 0.1
        },
        collide: {
            strength: 0.5,
            radius: d => 0.5 * rectangleNodeRadius(d)
        },
        // alphaDecay: 0.06
    },
    radial: {
        type: "radial",
        nodeSpacing: (d: any) => { 0.5 * rectangleNodeRadius(d); },
        nodeSize: (d: any) => { 2 * rectangleNodeRadius(d); },
        preventOverlap: true,
        strictRadial: true,
        maxPreventOverlapIteration: 300,
        sortBy: "topology-directed",
        unitRadius: 1024,
        linkDistance: 10
    },
    atlas: {
        type: "force-atlas2",
        preventOverlap: true,
        nodeSize: (d: any) => 2 * rectangleNodeRadius(d)
    },
    circle: {
        type: "circular",
        nodeSize: (d: any) => 0.5 * rectangleNodeRadius(d),
        // nodeSpacing: (d: any) => 2 * rectangleNodeRadius(d),
        ordering: "topology-directed",
        preventOverlap: true
    }
};

