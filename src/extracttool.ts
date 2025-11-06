import { BrushSelect, ExtensionCategory, register, type IPointerEvent, type NodeData, type Point, type RectStyleProps } from "@antv/g6";
import { Rect as GRect } from "@antv/g";
import { getScApp } from "./index.js";
import type { ScImage, ScImageStyleProps } from "./imagenode.js";
import { getDatabase } from "./database.js";
import { makeImageNodeData, NodeProperty, type ImageNodeData } from "./entities.js";

export class ExtractTool extends BrushSelect {
    protected onPointerUp(event: IPointerEvent) { 
        const ctx = this.context;
        const node = getScApp().panel.currentNode;
        const rect: GRect = (this as any).rectShape;

        if (rect && node && node.type === "sc-image") {
            const bounds = ctx.graph.getElementRenderBounds(node.id);
            const rectBounds = rect.getBounds();
            rectBounds.setMinMax([rectBounds.min[0], rectBounds.min[1], bounds.min[2]], [rectBounds.max[0], rectBounds.max[1], bounds.max[2]]);
            const intersection = bounds.intersection(rectBounds);
            if (intersection) {
                const el = ctx.element!.getElement<ScImage>(node.id)!;
                const elStyle: RectStyleProps & ScImageStyleProps = el.attributes;
                console.log(el);
                const [x0, y0] = [(elStyle.x0 || 0) + intersection.min[0] - bounds.min[0], (elStyle.y0 || 0) + intersection.min[1] - bounds.min[1]];
                const [width, height] = [intersection.halfExtents[0] * 2, intersection.halfExtents[1] * 2]; 
                const position = ctx.graph.getViewportCenter();
               
                const sampleNode = makeImageNodeData({
                    id: crypto.randomUUID(),
                    style: {
                        size: [width, height],
                        x0: x0,
                        y0: y0,
                        source_id: elStyle.source_id!,
                        stroke: "#c5152f",
                        lineWidth: 4,
                        x: position[0],
                        y: position[1]
                    }, 
                    data: {
                        mimetype: new NodeProperty((node.data?.mimetype as string) || "application/octet-stream")
                    }

                });
                
                ctx.graph.addNodeData([sampleNode]);
                ctx.graph.addEdgeData([{ source: node.id, target: sampleNode.id }]);
                ctx.graph.frontElement(sampleNode.id);
                getDatabase().saveGraphData(ctx.graph.getData());
                ctx.graph.render();
            }
        }
        super.onPointerUp(event);
    }
};

register(ExtensionCategory.BEHAVIOR, "extract-tool", ExtractTool);


