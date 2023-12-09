import { Plugin, TFile, WorkspaceWindow } from 'obsidian';

export default class TableCheckboxesPlugin extends Plugin {
	async onload() {
		this.app.workspace.on("window-open", this.setupWindowHandlers);
		this.setupWindowHandlers(undefined as never, activeWindow);
	}

	async onunload() {
		this.app.workspace.off("window-open", this.setupWindowHandlers);
	}

	private setupWindowHandlers = (_workspaceWindow: WorkspaceWindow, win: Window) => {
		this.registerDomEvent(win, "input", (evt: InputEvent): void => {
			if (evt.data === "]") {
				const view = this.app.workspace.activeEditor;
				if (!view || !view.editor) {
					return;
				}
				const location = view.editor.getCursor("anchor");
				let rowValue = view.editor.getLine(location.line);
				const rowChars = rowValue.split(""); // rowValue isn't up to date with the input event, we need to add ] manually.
				rowChars.splice(location.ch, 0, evt.data); // Luckily we know exactly where ] needs to go
				rowValue = rowChars.join("");
				if (this.isMDCheckboxInTable(rowValue)) {
					const checkBox = this.getCheckboxLength(rowValue);
					const start = {...location}; // Shallow copy
					start.ch -= checkBox.length; // Subtract the length from the location of ']'
					view.editor.setSelection(start, location); // Select '-[]'
					const checkboxId = this.generateUniqueCheckboxId(view.editor.getDoc().getValue());
					view.editor.replaceSelection(`<input type="checkbox" unchecked id="${checkboxId}">`); // Replace selection with unchecked HTML checkbox
				}
			}
		});

		this.registerDomEvent(win, "change", async (evt: InputEvent): Promise<void> => {
			// Check for data-task attribute to ignore markdown checkboxes
			const changeEl = evt.target as Element;
			if (changeEl.instanceOf(HTMLInputElement) && changeEl.id && changeEl.hasAttribute("data-task") === false) {
				const view = this.app.workspace.activeEditor;
				if (!view || !view.editor || !view.file) {
					return;
				}
				if (changeEl.getAttribute("type") === "checkbox") {
					const page = await this.app.vault.read(view.file);
					const id = changeEl.id;
					this.toggleCheckbox(page, view.file, changeEl.checked, id);
				}
			}
		});
	}

	private generateUniqueCheckboxId(page: string): string {
		let id = crypto.randomUUID().slice(-6);
		while (this.idExistsInFile(id, page)) {
			id = crypto.randomUUID();
		}
		return id;
	}

	private idExistsInFile(id: string, page: string): boolean {
		const idIndex = page.search(id);
		return idIndex !== -1;
	}

	private isMDCheckboxInTable(viewData: string): boolean {
		// Regex to check if markdown checkbox is inside table
		const tableRegex = /^(\s|>)*\|.*-[\s]?\[[\s]?\].*/m;
		if (viewData.match(tableRegex)) {
			return true;
		}
		return false;
	}

	// Allow for different amounts of whitespace
	private getCheckboxLength(viewData: string): string {
		const checkboxRegex = /-[\s]?\[[\s]?\]/;
		const checkboxMatch = viewData.match(checkboxRegex);
		return checkboxMatch![0];
	}

	private toggleCheckbox(page: string, file: TFile, isChecked: boolean, checkboxId: string): void {
		page = page.replace(new RegExp(`<input type="checkbox" (un)?checked id="${checkboxId}">`), `<input type="checkbox" ${isChecked ? "" : "un"}checked id="${checkboxId}">`);
		this.app.vault.modify(file, page);
	}
}