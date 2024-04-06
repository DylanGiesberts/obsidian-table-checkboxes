import { EditorPosition, MarkdownFileInfo, Plugin, TFile, WorkspaceWindow } from 'obsidian';

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
				location.ch += 1; // Increase char by one because Obsidian autocompletes checkboxes now
				const rowValue = view.editor.getLine(location.line);
				if (this.isMDCheckboxInTable(rowValue)) {
					return this.handleCheckboxReplacement(view, rowValue, location, false);
				} // else we add the ] manually and check again, just in case for other locales

				location.ch -= 1; // Reduce by 1 because we previously added it.
				const rowChars = rowValue.split(""); // In this case rowValue isn't up to date with the input event, we need to add ] manually.
				rowChars.splice(location.ch, 0, evt.data); // Luckily we know exactly where ] needs to go
				const newRowValue = rowChars.join("");
				if (this.isMDCheckboxInTable(newRowValue)) {
					this.handleCheckboxReplacement(view, newRowValue, location, true);
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

	private handleCheckboxReplacement (view: MarkdownFileInfo, rowValue: string, location: EditorPosition, manuallyAdded: boolean) {
		if (!view.editor) { return; }
		const checkBox = this.getCheckboxLength(rowValue);
		const start = {...location}; // Shallow copy
		start.ch -= checkBox.length; // Subtract the length from the location of ']'
		if (manuallyAdded) {
			start.ch += 1;
		}
		view.editor.setSelection(start, location); // Select '-[]'
		const checkboxId = this.generateUniqueCheckboxId(view.editor.getDoc().getValue());
		view.editor.replaceSelection(`<input type="checkbox" unchecked id="${checkboxId}">`); // Replace selection with unchecked HTML checkbox
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