import { MarkdownView, Plugin } from 'obsidian';

export default class TableCheckboxesPlugin extends Plugin {
	async onload() {

		let view: MarkdownView | null = this.app.workspace.getActiveViewOfType(MarkdownView);
		this.app.workspace.onLayoutReady(() => view = this.app.workspace.getActiveViewOfType(MarkdownView));

		this.registerDomEvent(document, 'keyup', (evt: KeyboardEvent): void => {
			if (evt.key == "]" && view) {
				const location = view.editor.getCursor("anchor");
				const rowValue = view.editor.getLine(location.line);
				if (this.isMDCheckboxInTable(rowValue)) {
					const checkBox = this.getCheckboxLength(rowValue);
					const start = {...location}; // Shallow copy
					start.ch -= checkBox.length; // Subtract the length from the location of ']'
					view.editor.setSelection(start, location); // Select '-[]'
					const checkboxId = this.generateUniqueCheckboxId(view);
					view.editor.replaceSelection(`<input type="checkbox" unchecked id="${checkboxId}">`); // Replace selection with unchecked HTML checkbox
				}
			}
		});

		this.registerDomEvent(document, "change", (evt: InputEvent): void => {
			// Check for data-task attribute to ignore markdown checkboxes
			if (evt.target instanceof HTMLInputElement && view && evt.target.id && evt.target.hasAttribute("data-task") == false) {
				const checkbox = evt.target;
				if (checkbox.getAttribute("type") == "checkbox") {
					const page = view.getViewData();
					const id = evt.target.id;
					this.toggleCheckbox(page, view, checkbox.checked, id);
				}
			}
		})
	}

	private generateUniqueCheckboxId(view: MarkdownView): string {
		let id = crypto.randomUUID().slice(-6);
		while (this.idExistsInFile(id, view)) {
			id = crypto.randomUUID();
		}
		return id;
	}

	private idExistsInFile(id: string, view: MarkdownView): boolean {
		const page = view.getViewData();
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

	private toggleCheckbox(page: string, view: MarkdownView, isChecked: boolean, checkboxId: string): void {
		page = page.replace(new RegExp(`<input type="checkbox" (un)?checked id="${checkboxId}">`), `<input type="checkbox" ${isChecked ? "" : "un"}checked id="${checkboxId}">`);
		this.app.vault.modify(view.file, page);
	}
}