import { getScApp, type ScApplication } from "./index.js";
import "./commandline.css";

export interface Command {
    cmd: string[],
    desc: string,
    callback: (args: string[]) => unknown;
};

export class CommandManager {
    commands = new Map<string, Command>();
    commandLineElement: HTMLInputElement;

    constructor() {
        this.commandLineElement = document.querySelector(".sc-commandline")!;
        this.commandLineElement.onkeydown = (ev: KeyboardEvent) => {
            if (ev.key === "Enter") {
                this.execute();
                this.deactivate();
            } else if (ev.key === "Escape") {
                this.deactivate();
            }
        };
    }

    execute() {
        const text = this.commandLineElement.value;
        const [baseCmd, ...args] = text.split(" ");
        if (baseCmd) {
            const cmd = this.commands.get(baseCmd);
            if (cmd) {
                cmd.callback(args);
            } else {
                getScApp().statusline.message(`unknown command ${text}`);
            }
        }
    }

    activate(prefix: string) {
        this.commandLineElement.style = "display: block;";
        this.commandLineElement.focus();
        // this.commandLineElement.value = prefix;
    }

    deactivate() {
        this.commandLineElement.value = "";
        this.commandLineElement.style = "";
        this.commandLineElement.blur();
    }

    register(cmd: string[], desc: string, callback: (args: string[]) => unknown) {
        cmd.forEach(alias => this.commands.set(alias, { cmd: cmd, desc: desc, callback: callback }));
    }
};

