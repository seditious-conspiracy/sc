import { Subject } from "./entity.js";


const personA = new Subject({
    id: crypto.randomUUID(),
    name: "Person A",
    icon: "A",
    color: "#f4c501"
});

const personB = new Subject({
    id: crypto.randomUUID(),
    name: "Person B",
    icon: "B"
});

export const data: any = {
    "nodes": [
        { id: personA.id, data: personA },
        { id: personB.id, data: personB }
    ],
    "edges": [
        {
            "source": personA.id,
            "target": personB.id
        }
    ]
};

