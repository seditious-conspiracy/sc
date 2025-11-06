import "./statusline.css";
import { type ScMode, ScModeEvent } from "./modes.js";

export interface ScStatuslineText {
    mode?: string;
    left?: string;
    midLeft?: string;
    midRight?: string;
    right?: string;
};

export class ScStatusline {
    text: ScStatuslineText;
    mode: HTMLSpanElement;
    left: HTMLSpanElement;
    midLeft: HTMLSpanElement;
    midRight: HTMLSpanElement;
    right: HTMLSpanElement;

    constructor() {
        this.text = { mode: "", left: "", midLeft: "", midRight: "", right: "" };
        this.mode = document.querySelector(".sc-statusline-mode")!;
        this.left = document.querySelector(".sc-statusline-left")!;
        this.midLeft = document.querySelector(".sc-statusline-mid-left")!;
        this.midRight = document.querySelector(".sc-statusline-mid-right")!;
        this.right = document.querySelector(".sc-statusline-right")!;

        window.addEventListener("scmode", ((ev: ScModeEvent) => {
            this.mode.className = "sc-statusline-mode sc-statusline-" + ev.next.name;
            this.left.className = "sc-statusline-left sc-statusline-" + ev.next.name;
            this.midLeft.className = "sc-statusline-mid-left sc-statusline-" + ev.next.name;
            this.midRight.className = "sc-statusline-mid-right sc-statusline-" + ev.next.name;
            this.right.className = "sc-statusline-right sc-statusline-" + ev.next.name;
            this.update({ mode: ev.next.name });
        }) as EventListener);
    }

    update(newText: ScStatuslineText) {
        this.text = { ...this.text, ...newText };
        this.mode.textContent = this.text.mode || "";
        this.left.textContent = this.text.left || "";
        this.midLeft.textContent = this.text.midLeft || "";
        this.midRight.textContent = this.text.midRight || "";
        this.right.textContent = this.text.right || "";
    }

    private msgTimeout?: number | undefined;
    
    message(msgText: string, timeout = 10000) {
        if (this.msgTimeout) { 
            window.clearTimeout(this.msgTimeout); 
        }
        this.update({ midLeft: msgText });
        this.msgTimeout = window.setTimeout(() => { 
            this.update({ midLeft: "" });
            this.msgTimeout = undefined;
        }, timeout);
    }
};

