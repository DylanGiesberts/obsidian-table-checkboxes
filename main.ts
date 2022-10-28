import { MarkdownView, Plugin } from 'obsidian';

export default class TableCheckboxesPlugin extends Plugin {
	async onload() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);

		// Add event listener to replace '-[]' with HTML checkbox inside a table.
		this.registerDomEvent(document, 'keyup', (evt: KeyboardEvent) => {
			// Check if no alt or ctrl key? https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event
			if (evt.key == "]" && view) {
				const location = view.editor.getCursor("anchor");
				const rowValue = view.editor.getLine(location.line);
				if (this.isMDCheckboxInTable(rowValue)) {
					const checkBox = this.getCheckboxLength(rowValue);					
					if (checkBox) {
						const start = {...location}; // Shallow copy
						start.ch -= checkBox[0].length; // Subtract the length from the location of ']'
						view.editor.setSelection(start, location); // Select '-[]'
						view.editor.replaceSelection('<input type="checkbox" unchecked> '); // Replace selection with unchecked HTML checkbox
					}
				}
			}		
		});

		this.registerDomEvent(document, "change", (evt: InputEvent) => {
			// Check for data-task attribute to ignore markdown checkboxes
			if (evt.target instanceof HTMLInputElement && view && evt.target.hasAttribute("data-task") == false) {
				const checkbox = evt.target
				if (checkbox.getAttribute("type") == "checkbox") {
					let page = view.getViewData();
					if (this.isHTMLCheckboxInTable(page)) {
						this.toggleCheckbox(page, checkbox, view);
					}
				}
			}
		})
	}

	onunload() {

	}

	private isMDCheckboxInTable(row: String): boolean {
		// Regex to check if markdown checkbox is inside table
		const tableRegex = /\|[\s]*-[\s]?\[[\s]?\].*\|/;
		if (row.match(tableRegex)) {
			return true;
		}
		return false;
	}

	private isHTMLCheckboxInTable(row: String): boolean {
		// Regex to check if HTML checkbox is inside table
		const tableRegex = /\|[\s]*<input type="checkbox" (un)?checked>.*\|/;
		if (row.match(tableRegex)) {
			return true;
		}
		return false;
	}

	// Allow for different amounts of whitespace
	private getCheckboxLength(row: String) {
		const checkboxRegex = /-[\s]?[[\s]?]/
		const checkBox = row.match(checkboxRegex);
		return checkBox
	}

	// Definitely could be done in a better way
	// I couldn't figure out a way to get the correct checkbox that is firing the event
	// So we're doing it by checking if it's inside a table, and then if the textcontent of the cell matches
	// Definitely doesn't work well on cells without textcontent...
	private toggleCheckbox(page: string, checkbox: HTMLInputElement, view: MarkdownView) {
		const textContent = checkbox.parentElement?.textContent;
		// Regex to check if HTML checkbox AND textContent are inside markdown table
		// Attempting to construct regex fills me with sorrow
		const regex = new RegExp(`\\|[\\s]*<input type="checkbox" (un)?checked>[\\s]*` + textContent + `[\\s]*\\|`);
		if (page.match(regex)) {
			if (checkbox.checked) {
				page = page.replace('<input type="checkbox" unchecked>' + textContent, '<input type="checkbox" checked>' + textContent);
			}
			else {
				page = page.replace('<input type="checkbox" checked>' + textContent, '<input type="checkbox" unchecked>' + textContent);
			}
			// Write to the file
			// I couldn't figure out another way to change it from preview mode
			this.app.vault.modify(view.file, page);
		}
	}
}