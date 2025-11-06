import { type Group, Image as GImage } from '@antv/g';
import { getDatabase } from './database.js';
import { ExtensionCategory, Rect, register, type IconStyleProps, type ImageStyleProps, type RectStyleProps } from '@antv/g6';
import type { LabelStyleProps, NodeData } from '@antv/g6';
import { getScApp } from './index.js';

export interface ScImageStyleProps {
    source_id?: string,
    x0?: number,
    y0?: number,
};

export class ScImage extends Rect {
    blobUrl?: string;

    getComputedSize(attributes: Required<RectStyleProps>): [number, number] {
        const [w, h] = this.getSize(attributes) as [number, number, number];
        return [w, h];
    }

    public geomMeanLength(attributes: Required<RectStyleProps>) {
        const [ width, height ] = this.getComputedSize(attributes);
        return Math.sqrt(width * height);
    }

    public destroy(): void {
        if (this.blobUrl) {
            URL.revokeObjectURL(this.blobUrl);
        }
        super.destroy();
    }
    
    protected getIconStyle(attributes: Required<RectStyleProps>): false | IconStyleProps {
        const [width, height] = this.getComputedSize(attributes);
        let style = super.getIconStyle(attributes);
        if (!this.blobUrl) {
             style = { text: "?", fill: "#ffffff", ...style };
        }
        return style ? { width: width * 0.8, height: height * 0.8 } : false;
    }

    protected getLabelStyle(attributes: Required<RectStyleProps>): false | LabelStyleProps {
        const parentStyle = super.getLabelStyle(attributes);
        if (parentStyle) {
            return { ...parentStyle, fontSize: Math.max(this.geomMeanLength(attributes) / 24, 24) };
        }
        return false;
    }

    protected getImageStyle(attributes: Required<RectStyleProps> & ScImageStyleProps): false | ImageStyleProps {
        const [width, height] = this.getComputedSize(attributes);

        if (this.blobUrl) {
            return { src: this.blobUrl, x: -width / 2, y: -height / 2 };
        } else {
            getDatabase().makeImageSample(this.id, attributes.source_id || "", attributes.x0 || 0, attributes.y0 || 0, width, height, (url) => {
                this.blobUrl = url;
                this.render();
            });
        }
        return false;
    }

    protected drawImageShape(attributes: Required<RectStyleProps>, container: Group): void {
        this.upsert("image", GImage, this.getImageStyle(attributes), container);
    }

    public render(attributes = this.parsedAttributes, container: Group = this) {
        super.render(attributes, container);
        this.drawImageShape(attributes, container);
    }

};

register(ExtensionCategory.NODE, "sc-image", ScImage);

export function getNodeImageUrl(id: string): string | undefined {
    return getScApp().graphRuntimeElement(id, ScImage)?.blobUrl;
}

