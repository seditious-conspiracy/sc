import type { EdgeDirection, NodeData } from "@antv/g6";
import "./info_panel.css";
import { getScApp } from "./index.js";
import { getNodeImageUrl } from "./imagenode.js";
import { INSERT, type ScModeEvent } from "./modes.js";
import { NodeProperty } from "./entities.js";

export class InfoPanel {
    container: HTMLDivElement;
    nameInput: HTMLInputElement;
    picture: HTMLImageElement;
    propList: HTMLDivElement;
    neighborButtons: { in: HTMLButtonElement, out: HTMLButtonElement };
    neighborList: HTMLDivElement;
    currentNode: NodeData | undefined;

    constructor(_container: HTMLDivElement) {
        this.container = _container;
        this.nameInput = this.container.querySelector(".sc-entity-info-name-input")!;
        this.picture = this.container.querySelector(".sc-entity-info-picture")!;
        this.propList = this.container.querySelector(".sc-entity-info-prop-list")!;
        this.neighborButtons = {
            in: this.container.querySelector(".sc-entity-info-neighbor-filter #filter-in")!,
            out: this.container.querySelector(".sc-entity-info-neighbor-filter #filter-out")!
        };

        this.neighborButtons.in.className = "sc-active";
        this.neighborButtons.in.onclick = () => { 
            this.neighborButtons.in.className === "sc-active" ? this.neighborButtons.in.className = "sc-inactive" : this.neighborButtons.in.className = "sc-active"; 
            this.makeNeighborList(this.currentNode);
        };
        this.neighborButtons.out.className = "sc-active";
        this.neighborButtons.out.onclick = () => { 
            this.neighborButtons.out.className === "sc-active" ? this.neighborButtons.out.className = "sc-inactive" : this.neighborButtons.out.className = "sc-active"; 
            this.makeNeighborList(this.currentNode);
        };

        this.neighborList = this.container.querySelector(".sc-entity-info-neighbor-list")!;

        window.addEventListener("scmode", ((ev: ScModeEvent) => {
            if (ev.next == INSERT && getScApp().mode != INSERT) {
                
            }
        }) as EventListener);
    }

    private updateProperties() {
        if (this.currentNode && getScApp().graph.hasNode(this.currentNode.id)) {
            getScApp().graph.updateNodeData([{
                id: this.currentNode.id,
                data: Object.fromEntries([["name", this.nameInput.value], ...[...this.propList.children].filter(prop => prop.id !== "id").map(prop => { return [prop.id, (prop.querySelector("input,textarea") as any).value] })])
            }]);
        }
    }
    
    makeShortProperty(key: string, value: string | NodeProperty<string>, readonly?: boolean) {
        const propBox = document.createElement("div");
        propBox.className = "sc-short-property";
        propBox.id = key;

        const label = document.createElement("span");
        label.className = "sc-short-property-label";
        label.textContent = key;
        propBox.appendChild(label);

        const valueBox = document.createElement("input");
        valueBox.className = `sc-short-property-value sc-short-property-${key}`;
        valueBox.type = "text";
        valueBox.disabled = readonly || false;
        valueBox.value = (value instanceof NodeProperty) ? value.value : value;
        valueBox.onchange = () => this.updateProperties();
        propBox.appendChild(valueBox);

        return propBox;
    }
    
    makeLongProperty(key: string, value: string | NodeProperty<string>, lines: number, readonly?: boolean) {

        if (value instanceof NodeProperty) {
            readonly = true;
        }
        
        const propBox = document.createElement("div");
        propBox.className = "sc-long-property";
        propBox.id = key;

        const label = document.createElement("span");
        label.className = "sc-long-property-label";
        label.textContent = key;
        propBox.appendChild(label);

        const valueBox = document.createElement("textarea");
        valueBox.className = `sc-long-property-value sc-long-property-${key}`;
        valueBox.rows = lines;
        valueBox.disabled = readonly || false;
        valueBox.value = (value instanceof NodeProperty) ? value.value : value;
        valueBox.onchange = () => this.updateProperties();
        propBox.appendChild(valueBox);
        
        return propBox;
    }

    makeNeighbor(node: NodeData) {
        const div = document.createElement("div");
        div.className = "sc-neighbor";
        
        const picture = document.createElement("img");
        picture.className = "sc-neighbor-picture";
        picture.src = getNodeImageUrl(node.id) || "";
        picture.alt = (node.data?.icon as string) || "\u2002?";
        div.appendChild(picture);

        const desc = document.createElement("span");
        desc.className = "sc-neighbor-desc";
        
        const name = node.data?.name as string;
        const color = node.style?.stroke || "#f4c753";

        if (name) {
            desc.innerText = name;
            desc.style = `color: ${color}`;

        } else {
            desc.innerText = node.id;
            desc.style = `color: ${color}; opacity: 0.6`;
        }

        div.appendChild(desc);

        div.onclick = async () => {
            this.focusNode();
            await getScApp().graph.focusElement(node.id);
            getScApp().graph.setElementState(node.id, ["selected"]);
            this.focusNode(node);
            const [cx, cy] = getScApp().graph.getCanvas().getSize();
            const [bx, by] = [cx * 0.8, cy * 0.8];
            const [nx, ny] = (node.style?.size as [number, number]) || [1, 1];
            const zoom = Math.min(bx / nx, by / ny, 2.0);
            getScApp().graph.zoomTo(zoom);
        };
        
        return div;
    }

    makeNeighborList(root?: NodeData) {
        const showIn = this.neighborButtons.in.className === "sc-active";
        const showOut = this.neighborButtons.out.className === "sc-active";
        [...this.neighborList.children].forEach(c => this.neighborList.removeChild(c));
        
        if (root) {
            const inNeighbors = getScApp().graph.getRelatedEdgesData(root.id, "in").map(edge => edge.source);
            const outNeighbors = getScApp().graph.getRelatedEdgesData(root.id, "out").map(edge => edge.target);
            if (showIn) {
                const inNodes = getScApp().graph.getNodeData(inNeighbors);
                inNodes.map(node => this.makeNeighbor(node)).forEach(element => this.neighborList.appendChild(element));
            }

            if (showOut) {
                const outNodes = getScApp().graph.getNodeData(outNeighbors);
                outNodes.map(node => this.makeNeighbor(node)).forEach(element => this.neighborList.appendChild(element));
            }
        }
    }
    
    focusNode(node?: NodeData) {
        this.updateProperties();
        [...this.propList.children].forEach(c => this.propList.removeChild(c));
        this.makeNeighborList(node);
         
        if (node) {
            // getScApp().graph.setElementState(node.id, ["selected"]);
            const { name, ...props } = node.data as any;
            this.container.style = "display: flex;";
            this.nameInput.value = (name as string) || "";
            this.picture.src = getNodeImageUrl(node.id) || "";

            this.picture.alt = (node.data?.icon as string) || "\u2002?";
            
            this.propList.appendChild(this.makeShortProperty("id", node.id, true));
            console.log(node);
            Object.entries(props).forEach(([key, value]) => {
                if (key === "notes") {
                    this.propList.appendChild(this.makeLongProperty(key, value as string, 6, false));
                } else {
                    this.propList.appendChild(this.makeShortProperty(key, value as string, false));
                }
            });
            getScApp().statusline.update({ midRight: `in: ${getScApp().graph.getRelatedEdgesData(node.id, "in").length} | out ${getScApp().graph.getRelatedEdgesData(node.id, "out").length}` });
        } else {
            if (this.currentNode) {
                getScApp().graph.setElementState(this.currentNode.id, []);
            }
            this.container.style = "display: none;";
            getScApp().statusline.update({ midRight: "" });
        }
        this.currentNode = node;
    }
};

