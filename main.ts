import { Plugin, TFile } from 'obsidian';

export default class TableCheckboxesPlugin extends Plugin {
	async onload() {

		this.registerDomEvent(activeWindow, "keyup", (evt: KeyboardEvent): void => {
			if (evt.key == "]") {
				const view = this.app.workspace.activeEditor;
				if (!view || !view.editor) {
					return;
				}
				const location = view.editor.getCursor("anchor");
				const rowValue = view.editor.getLine(location.line);
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

		this.registerDomEvent(activeWindow, "change", (evt: InputEvent): void => {
			// Check for data-task attribute to ignore markdown checkboxes
			const changeEl = evt.target as Element;
			if (changeEl.instanceOf(HTMLInputElement) && changeEl.id && changeEl.hasAttribute("data-task") === false) {
				const view = this.app.workspace.activeEditor;
				if (!view || !view.editor || !view.file) {
					return;
				}
				if (changeEl.getAttribute("type") === "checkbox") {
					const page = view.editor.getDoc().getValue();
					const id = changeEl.id;
					this.toggleCheckbox(page, view.file, changeEl.checked, id);
				}
			}
		})
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