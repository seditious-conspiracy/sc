import { type EdgeData, type GraphData, type NodeData } from "@antv/g6";
import type { ScDatabase } from "./database.js";
import type { ScApplication } from "./index.js";

export interface Conspiracy {
    id: string;
    name: string;
    last_modified: Date;
    created: Date;
};

export interface GraphDataWithId {
    id: string;
    data: GraphData;
};

export type ScWindow = Window & { 
    _conspiracy: Conspiracy | undefined;
    _dateFormat: Intl.DateTimeFormat;
    _db: ScDatabase;
    _app: ScApplication;
};

export function currentConspiracy() {
    return (window as any as ScWindow)._conspiracy!;
}

export function updateConspiracy(newConspiracy: Partial<Conspiracy>) {
    return (window as any as ScWindow)._conspiracy = { ...(window as any as ScWindow)._conspiracy!, ...newConspiracy };
}

export function createConspiracy(name: string): Conspiracy {
    return {
        id: crypto.randomUUID(),
        name: name,
        last_modified: new Date(Date.now()),
        created: new Date(Date.now()),
    }; 
}


