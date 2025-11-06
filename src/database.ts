import type { GraphData, NodeData } from "@antv/g6";
import { createConspiracy, currentConspiracy, updateConspiracy, type Conspiracy, type GraphDataWithId, type ScWindow } from "./conspiracy.js";
import JSZip from "jszip";

type AssetCallback = (req: IDBRequest, err?: Event) => void;
type BlobCallback = (url: string, err?: Event) => void;

const DB_NAME = "sc";
const DB_VERSION = 1;
const DB_CONSPIRACY_STORE = "conspiracies";
const DB_ASSET_STORE = "assets";
const DB_GRAPH_STORE = "graphs";

export interface Asset {
    id: string;
    name?: string;
    type: string;
    data: ArrayBuffer;
};

export class UpdateNodeReqEvent extends Event {
    nodes: NodeData[];

    constructor(nodes: NodeData[]) {
        super("updatenodereq")
        this.nodes = nodes;
    }
}

export class ScDatabase {
    errorHandler = (ev: any) => { console.log("database error: " + ev.target.errorCode); }
    db?: IDBDatabase;
   
    constructor(cid?: string) {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onsuccess = (ev: Event) => {
            this.db = (ev.target as any).result;
            this.db!.onerror = this.errorHandler;

            if (cid) {
                this.getConspiracy(cid, (c) => {
                    (window as unknown as ScWindow)._conspiracy = c;
                    window.dispatchEvent(new Event("conspiracyload"));
                });
            } else { 
                this.getMostRecentConspiracy(c => {
                    (window as unknown as ScWindow)._conspiracy = c;
                    window.location.href = `?${c.id}`;
                });
            }
        };
        req.onerror = this.errorHandler;

        req.onupgradeneeded = (ev: Event) => {
            this.db = (ev.target as any).result;
            
            const conspiracyStore = this.db?.createObjectStore(DB_CONSPIRACY_STORE, { keyPath: "id" });
            conspiracyStore?.createIndex("name", "name", { unique: false });

            const graphStore = this.db?.createObjectStore(DB_GRAPH_STORE, { keyPath: "id" });

            const assetStore = this.db?.createObjectStore(DB_ASSET_STORE, { keyPath: "id" });
            assetStore?.createIndex("name", "name", { unique: false });
        };
    }
   
    conspiracyStore(mode: IDBTransactionMode) { 
        const t = this.db?.transaction(DB_CONSPIRACY_STORE, mode);
        return t?.objectStore(DB_CONSPIRACY_STORE);
    }
   
    assetStore(mode: IDBTransactionMode) {
        const t = this.db?.transaction(DB_ASSET_STORE, mode);
        return t?.objectStore(DB_ASSET_STORE);
    }

    graphStore(mode: IDBTransactionMode) {
        const t = this.db?.transaction(DB_GRAPH_STORE, mode);
        return t?.objectStore(DB_GRAPH_STORE);
    }

    getConspiracyList(callback: (conspiracies: Conspiracy[]) => unknown) {
        const store = this.conspiracyStore("readonly");
        const req = store?.getAll();
        if (req) {
            req.onerror = this.errorHandler;
            req.onsuccess = (ev: any) => { callback(ev.target.result) };
        }
    }
    
    getConspiracy(id: string, callback: (conspiracy?: Conspiracy) => unknown) {
        const store = this.conspiracyStore("readonly");
        const req = store?.get(id);
        if (req) {
            req.onerror = this.errorHandler;
            req.onsuccess = (ev: any) => { callback(ev.target.result) };
        }
    }
   
    getMostRecentConspiracy(callback: (conspiracy: Conspiracy) => unknown) {
        const store = this.conspiracyStore("readwrite");
        const req = store?.openCursor(null, "prev");
        if (req) {
            req.onsuccess = (ev: any) => { 
                const cursor: IDBCursorWithValue | undefined = ev.target.result;
                if (cursor) {
                    callback(cursor.value);
                } else {
                    const newConspiracy = createConspiracy("new conspiracy");
                    store!.add(newConspiracy).onsuccess = (ev2) => { 
                        const graphStore = this.graphStore("readwrite");
                        graphStore!.add({ 
                            id: newConspiracy.id,
                            data: {
                                nodes: [],
                                edges: [],
                                combos: []
                            }
                        } as GraphDataWithId).onsuccess = (ev3) => { callback(newConspiracy); };
                    };
                }
            };
        }
    }

    saveConspiracy() {
        this.conspiracyStore("readwrite")?.put(updateConspiracy({ last_modified: new Date(Date.now()) }));
    }

    makeImageSample(nodeId: string, assetId: string, x0: number, y0: number, width: number, height: number, callback: (url: string) => unknown) {
        const assetStore = this.assetStore("readonly");
        assetStore!.get(assetId).onsuccess = async (ev) => {
            const asset: Asset = (ev.target as IDBRequest).result;
            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext("bitmaprenderer");
            const bitmap = await window.createImageBitmap(new Blob([asset.data], { type: asset.type }), x0, y0, width, height);
            ctx!.transferFromImageBitmap(bitmap);
            const blob = await canvas.convertToBlob();
            const url = URL.createObjectURL(blob);
            
            callback(url);
        };
    } 

    loadGraphData(callback: (graphData: GraphData) => unknown) {
        this.graphStore("readonly")!.get(currentConspiracy().id).onsuccess = (ev: any) => {
            const graphData: GraphData = ev.target.result.data;
            callback(graphData);   
        };
    }

    saveGraphData(graphData: GraphData) {
        this.graphStore("readwrite")!.put({ id: currentConspiracy().id, data: { 
            combos: graphData.combos,
            edges: graphData.edges,
            nodes: graphData.nodes/*?.map(node => {
                //const { x, y, z, ...style } = node.style as any;
                //return { ...node, style: style };
            })*/
        }});
        this.conspiracyStore("readwrite")?.put(updateConspiracy({ last_modified: new Date(Date.now()) }));
    }

    saveAsset(asset: Asset) {
        this.assetStore("readwrite")?.put(asset);
        this.conspiracyStore("readwrite")?.put(updateConspiracy({ last_modified: new Date(Date.now()) }));
    }

    makeSaveUrl(callback: (url: string) => unknown) {
        this.loadGraphData(data => {
            this.getConspiracy(currentConspiracy().id, conspiracy => {
                const zip = new JSZip();
                zip.file("conspiracy.json", JSON.stringify(conspiracy))
                zip.file("graph.json", JSON.stringify(data));

                const assetIds = new Set(data.nodes?.map(data => data.style?.source_id));

                const cursorReq = this.assetStore("readonly")?.openCursor();
                if (cursorReq) {
                    cursorReq.onsuccess = (ev: any) => {
                        let cursor: IDBCursorWithValue | undefined = ev.target.result;
                        if (cursor) {
                            if(assetIds.has(cursor.key)) {
                                const asset: Asset = cursor.value;
                                zip.file(cursor.key + ".json", JSON.stringify({
                                    id: asset.id,
                                    name: asset.name || "",
                                    type: asset.type, 
                                }));
                                zip.file(cursor.key as string, asset.data);
                            }
                            cursor.continue();
                        } else {
                            zip.generateAsync({ type: "blob" }).then(blob => {callback(URL.createObjectURL(blob))});
                        }
                    }
                }
            });
        });
    }

    async loadSave(f: File) {
        const zip = await JSZip.loadAsync(f);
        const cfile = zip.file("conspiracy.json");
        const graphfile = zip.file("graph.json");
        if (!cfile || !graphfile) {
            throw new Error();
        }
        const cjson = await cfile.async("string");
        const conspiracy = JSON.parse(cjson);

        const graphjson = await graphfile.async("string");
        const graph = JSON.parse(graphjson);

        this.conspiracyStore("readwrite")!.put(conspiracy).onsuccess = () => {
            this.graphStore("readwrite")!.put({ id: conspiracy.id, data: graph }).onsuccess = async () => {
                let assets = [];
                for (const file of zip.filter((name) => name.endsWith(".json"))) {
                    if (file.name !== "conspiracy.json" && file.name !== "graph.json") {
                        const contents = await file.async("string");
                        const json = JSON.parse(contents);
                        const data = await zip.file(json.id)?.async("arraybuffer");
                        if (data) {
                            assets.push({ ...json, data: data }); 
                        }
                    }
                }
                const req = this.assetStore("readwrite")!;
                assets.forEach(asset => req.put(asset));
                req.transaction.oncomplete = () => { window.location.href = `?${conspiracy.id}` };
            };
        };
    }
};

export function getDatabase() {
    return (window as unknown as ScWindow)._db;
}

