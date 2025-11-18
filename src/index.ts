import { CanvasEvent, ContainerEvent, Graph, GraphEvent, NodeEvent, type BaseLayoutOptions, type GraphData, type Node, type RuntimeContext, iconfont, type LayoutOptions, type NodeData } from "@antv/g6";
import "./index.css";
import "./statusline.css";
import { InfoPanel } from "./info_panel.js";
import { NORMAL, type ScMode, ScModeEvent, SELECT, INSERT, EXTRACT } from "./modes.js";
import { ScStatusline } from "./statusline.js";
import { getDatabase, ScDatabase, type Asset } from "./database.js";
import { currentConspiracy, updateConspiracy, type ScWindow } from "./conspiracy.js";
import "./imagenode.js";
import "./extracttool.js";
import "./commands.js";
import "./helpdialog.css";
import { makeImageNodeData, makeTextNodeData, makeWWWNodeData, NodeProperty, type EntityNodeData } from "./entities.js";
import { CommandManager } from "./commands.js";
import type { EdgeDatum } from "@antv/layout/lib/d3-force/types.js";
import { layouts } from "./layouts.js";

export class ScApplication {
    container_id = "graph-container";
    mode: ScMode = NORMAL;
    graph: Graph;
    statusline: ScStatusline;
    commands: CommandManager;
    panel: InfoPanel;
    hoveredNode: Node | undefined;
    helpDialog: HTMLDialogElement | undefined;

    constructor(data: GraphData) {
        this.panel = new InfoPanel(document.getElementById("sc-info-panel") as HTMLDivElement);
        
        this.statusline = new ScStatusline();
        this.statusline.update({ left: currentConspiracy().name });

        this.commands = new CommandManager();
         
        const container = document.querySelector(`#${this.container_id}`);
        
        this.graph = new Graph({
            container: this.container_id,
            data: data,
            theme: "dark",
            background: "#000000",
            // layout: layouts.d3!,
            node: {
                style: {
                    label: true,
                    labelText: (n) => n.data?.name as string || n.data?.url as string || n.data?.notes as string || "",
                    iconText: (n) => (n.data?.icon || "?") as string,
                    iconFill: (n) => (n.data?.color || "#ffffff") as string,
                    iconStroke: (n) => (n.data?.color || "#ffffff") as string,
                    labelFill: (n) => (n.data?.color || "#ffffff") as string,
                    labelFontSize: 48,
                    labelLineHeight: 48,
                    fillOpacity: 0,
                    margin: 2,
                },
                state: {
                    selected: {
                        fill: (n) => (n.style?.stroke || "#ffffff") as string,
                        labelFontSize: 48,
                        stroke: (n) => (n.style?.stroke || "#ffffff"),
                        lineWidth: 8,
                    }
                }
            },
            edge: {
                style: {
                    label: false,
                    opacity: 0.9,
                    stroke: "#ffffff",
                    lineWidth: 4,
                    endArrow: true
                }
            },
            behaviors: [
                {
                    type: "zoom-canvas",
                    key: "zoom-canvas-1",
                    enable: true
                },
                /*{
                    type: "drag-element-force",
                    key: "drag-element-force-1",
                },*/
                {
                    type: "drag-element",
                    key: "drag-element-1",
                },
                "click-select",
                {
                    type: "focus-element",
                    key: "focus-element-1"
                },
                {
                    type: "drag-canvas",
                    key: "drag-canvas-1"
                }, 
                {
                    type: "brush-select",
                    key: "brush-select-1",
                    immediately: "true",
                    mode: "diff",
                    style: {
                        fill: "#c9d05c",
                        stroke: "#9faa00"
                    }
                }, 
                {
                    type: "create-edge",
                    key: "create-edge-1",
                    trigger: ["drag"]
                },
                {
                    type: "extract-tool",
                    key: "brush-extract",
                    immediately: "false",
                    enable: false,
                    enableElements: [],
                    style: {
                        lineDash: 6,
                        fill: "#f43753",
                        fillOpacity: 0.1,
                        stroke: "#c5152f"
                    },
                    trigger: ["drag"]
                }
            ]
        });
        
        window.addEventListener("resize", (ev) => { 
            this.graph.fitCenter();
            this.graph.resize();
        });

        this.graph.on(ContainerEvent.KEY_DOWN, (ev: KeyboardEvent) => {
             if (ev.key === "Alt") {
                this.updateMode(INSERT);
                ev.stopPropagation();
             } else if (this.mode === NORMAL && ev.key === ":") {
                this.commands.activate(":");
             }
        }); 

        this.graph.on(GraphEvent.AFTER_ELEMENT_UPDATE, (ev) => {
            this.statusline.update({ right: `v: ${this.graph.getNodeData().length} | e: ${this.graph.getEdgeData().length}` });
            getDatabase().saveGraphData(this.graph.getData());
        });

        window.addEventListener("scmode", ((ev: ScModeEvent) => {
            ev.next.behaviors.forEach((behavior) => {
                this.graph.updateBehavior(behavior);
            });
        }) as EventListener);

        this.graph.on(NodeEvent.CLICK, (ev: any) => {
            const data = this.graph.getNodeData(ev.target.id);
            if (data.states?.includes("selected")) {
                this.panel.focusNode();
            } else {
                this.panel.focusNode(data);
            }
        });
        
        this.graph.on(CanvasEvent.CLICK, (ev: any) => { 
            this.panel.focusNode()
            if (this.mode === INSERT) {
                const [x, y] = this.graph.getCanvasByViewport([ev.clientX, ev.clientY]);
                const n: EntityNodeData = {
                    id: crypto.randomUUID(),
                    type: "rect",
                    style: {
                        size: [128, 128],
                        iconFontFamily: "iconfont",
                        stroke: "#ffffff",
                        lineWidth: 2,
                        fillOpacity: 0,
                        x: ev.canvas.x,
                        y: ev.canvas.y
                    }, 
                    data: {
                        name: "", 
                        type: "",
                        icon: "👤",
                        notes: "",
                    }
                }
                this.graph.addNodeData([n]);
            }
        });

        this.graph.on(ContainerEvent.KEY_UP, (ev: KeyboardEvent) => { 
            if (ev.key === "Alt" || ev.key === "Escape") {
                this.updateMode(NORMAL);
            } else if (ev.key === "i") {
                this.updateMode(INSERT);
            } else if (ev.key === "s") {
                this.updateMode(SELECT);
            } else if (ev.key === "x") {
                this.updateMode(EXTRACT);
            }

            const handler = this.mode.keys?.filter(k => {
                return (k.shift || false == ev.shiftKey)
                        && (k.alt || false == ev.altKey)
                        && (k.ctrl || false == ev.altKey)
                        && ev.key === k.key;
            }).forEach(k => { k.callback(this, ev) });
        });
 
        window.addEventListener("dragover", (ev) => ev.preventDefault());
        window.addEventListener("drop", (ev: any) => {
            ev.preventDefault();
            this.processTransfer(ev.dataTransfer)
        });
        
        this.registerCommands();
        this.updateMode(NORMAL);
    }

    updateMode(newMode: ScMode) {
        const event = new ScModeEvent(this, this.mode, newMode);
        window.dispatchEvent(event);
        this.mode = newMode;
    }

    async processFile(f: File) {
        const ab = await f.arrayBuffer();
        const hashBytes = await crypto.subtle.digest("SHA-1", ab);
        const hashView = new Uint8Array(hashBytes);
        const hashString = Array.from(hashView).map((b) => b.toString(16).padStart(2, "0"))
.join("");
        const a: Asset = {
            id: hashString,
            name: f.name,
            type: f.type,
            data: ab,
        };
        
        const bitmap = await createImageBitmap(f);
        getDatabase().saveAsset(a);
        const id = crypto.randomUUID();
       
        return makeImageNodeData({
            id: id,
            type: "sc-image",
            style: {
                size: [bitmap.width, bitmap.height],
                source_id: hashString,
                x0: 0,
                y0: 0
            },
            data: {
                name: f.name,
                mimetype: new NodeProperty(f.type)
            }
        });
    }
 
    async processTransfer(transfer: DataTransfer) {
        let data: NodeData[] = [];
        for (const i of transfer.items) {
            if (i.type.match(/^image/)) {
                data.push(await this.processFile(i.getAsFile()!));
            }

            if (i.type === "text/uri-list") {
                data.push(await makeWWWNodeData(i));
                break;
            } else if (i.type === "text/plain") {
                data.push(await makeTextNodeData(i));
                break;
            }
        }

        this.graph.addNodeData(data);
        getDatabase().saveGraphData(this.graph.getData());
        this.graph.render();    
    }

    async setLayout(layout: LayoutOptions) {
        this.graph.stopLayout();
        this.graph.setLayout(layout);
        return this.graph.layout();
    }
    
    graphRuntimeContext(): RuntimeContext {
        return (this.graph as any).context;
    }

    graphRuntimeElement<T>(id: string, ctor: new (...args: any[]) => T): T | undefined {
        const elementController = this.graphRuntimeContext().element!;
        const elementMap = (elementController as any).elementMap;
        const el = elementMap[id];
        if (el && el instanceof ctor) {
            return el;
        }
    }

    private registerCommands() { 
        this.commands.register([":layout"], "[layout name or ?] set an automatic layout", (args: string[]) => {
            if (args[0]) {
                const layout = layouts[args[0]];
                if (layout) {
                    this.statusline.message(`layout ${layout.type}`)
                    this.setLayout(layout);
                } else {
                    this.statusline.message(`available layouts: ${Object.keys(layouts).join(", ")}`);
                }
            } else {
                if (this.graph.getLayout()) {
                    this.graph.stopLayout();
                    this.statusline.message(`layout ${(this.graph.getLayout() as BaseLayoutOptions).type}`);
                    this.graph.layout();
                } else {
                    this.setLayout(layouts.radial!).then(() => {
                        this.setLayout(layouts.d3!);
                    });
                }
            }
        });

        this.commands.register([":stoplayout"], "stop iterative layout", (args: string[]) => {
            this.graph.stopLayout();
        });

        this.commands.register([":write"], "<name> save the conspiracy with the specified name", (nameParts: string[]) => {
            const name = nameParts.join(" ");
            updateConspiracy({ name: name! });
            getDatabase().saveConspiracy();
            this.statusline.update({ left: name! });
        });

        this.commands.register([":export"], "export the conspiracy as an image", async () => {
            await this.graph.render();
            const dataURL = await this.graph.toDataURL({ mode: "overall" });
            
                  const [head, content] = dataURL.split(',');
                  const contentType = head!.match(/:(.*?);/)![1];

                  const bstr = atob(content!);
                  let length = bstr.length;
                  const u8arr = new Uint8Array(length);

                  while (length--) {
                    u8arr[length] = bstr.charCodeAt(length);
                  }

                  const blob = new Blob([u8arr], { type: contentType! });

                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = currentConspiracy().name;
                  a.click();
            
        });

        this.commands.register([":upload"], "upload images to the graph", () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/png, image/jpeg, image.gif";
            input.multiple = true;
            input.onchange = (ev) => {
                const files: FileList | null = input.files;
                if (files && files.length > 0) {
                    Promise.all([...files].map(f => {
                        return this.processFile(f);
                    })).then(() => {
                        getDatabase().saveGraphData(this.graph.getData());
                        this.graph.render(); 
                    });
                }
            };

            input.click();
        });

        this.commands.register([":save"], "save and download the graph data", () => {
            getDatabase().makeSaveUrl((url) => {
                const a = document.createElement("a");
                a.href = url;
                a.download = currentConspiracy().name + ".zip";
                a.click();
                URL.revokeObjectURL(url);
            });
        });

        this.commands.register([":load"], "load graph data", () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "application/zip";
            input.multiple = false;
            input.onchange = (ev => {
                if (input.files) {
                    const file = input.files[0];
                    if (file) {
                        this.statusline.message("loading " + file.name);
                        getDatabase().loadSave(file);
                    }
                }
            });
            input.click();
        });

        this.commands.register([":help"], "display this help message", () => {
            console.log(this.helpDialog);
            this.helpDialog!.open = true;
        });
        
        this.addHelpDialog();
    }

    addHelpDialog() {
        const dialog: HTMLDialogElement = document.querySelector(".sc-help")!;

        const normalModeHelp = document.createElement("span");
        normalModeHelp.className = "sc-statusline-mid-left sc-statusline-NORMAL";
        normalModeHelp.innerText = "NORMAL (press <escape>) to move the graph around";
        dialog.appendChild(normalModeHelp);
        
        dialog.append("u can drag image files into the graph from your computer (hopefully)");
        
        const insertModeHelp = document.createElement("span");
        insertModeHelp.className = "sc-statusline-mid-left sc-statusline-INSERT";
        insertModeHelp.innerText = "INSERT (press <i>) to add new vertices (click) and edges (drag)";
        dialog.appendChild(insertModeHelp);

        const selectModeHelp = document.createElement("span");
        selectModeHelp.className = "sc-statusline-mid-left sc-statusline-SELECT";
        selectModeHelp.innerText = "SELECT (press <s>) to select multiple vertices at once";
        dialog.appendChild(selectModeHelp);
        
        const extractModeHelp = document.createElement("span");
        extractModeHelp.className = "sc-statusline-mid-left sc-statusline-EXTRACT";
        extractModeHelp.innerText = "EXTRACT (press <x>) to clip parts of images";
        dialog.appendChild(extractModeHelp);

        const cmdHelp = document.createElement("table");
        new Set(this.commands.commands.values()).forEach((cmd) => {
            const tr = document.createElement("tr");

            const aliases = document.createElement("td");
            aliases.className = "sc-help-command";
            aliases.innerText = cmd.cmd.join(", ");
            tr.appendChild(aliases);

            const desc = document.createElement("td");
            desc.innerText = cmd.desc;
            tr.appendChild(desc);
            cmdHelp.appendChild(tr);

            return tr;
        } );
        dialog.appendChild(cmdHelp);
       
        dialog.append("everything is saved on your computer (nothing is uploaded anywhere). u maybe need to reload the page a lot because things break. remember that i love u.");
        
        const closeButton = document.createElement("button");
        closeButton.autofocus = true;
        closeButton.innerText = "close <3";
        closeButton.onclick = () => dialog.close();
        dialog.appendChild(closeButton);   
        
        this.helpDialog = dialog;
        this.statusline.message("type :help for information <3", 20000);
    }
};

export function getScApp() {
    return (window as unknown as ScWindow)._app;
}

window.addEventListener("conspiracyload", (ev) => {
    getDatabase().loadGraphData(data => {
        (window as unknown as ScWindow)._app = new ScApplication(data);

        getScApp().graph.render();
    })
});

window.addEventListener("load", (ev) => {
    const params = [...new URLSearchParams(window.location.search).keys()];
    const cid: string | undefined = params[0];
    (window as unknown as ScWindow)._db = new ScDatabase(cid);
});

function rectangleNodeRadius(d: EdgeDatum): number {
    throw new Error("Function not implemented.");
}
