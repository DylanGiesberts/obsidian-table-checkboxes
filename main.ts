import { htmlToMarkdown, MarkdownView, Plugin } from 'obsidian';

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
						const table = this.findTableInPath(evt);
						const allTables = this.getAllTables(page);
						const tableLoc = this.getTableLocation(page, allTables!, table);
						const cellLoc = this.getCellLocation(evt, tableLoc);
						this.toggleCheckbox(page, view, checkbox, cellLoc);
					}
				}
			}
		})
	}

	onunload() {

	}

	// Gets all markdown tables in the file to loop over and compare to HTML table
	// The most painful regex I've ever had the displeasure of dealing with.
	// Massive thanks to https://stackoverflow.com/a/32723711, all I had to do was
	// remove the first '/r?' and it worked.
	private getAllTables(page: string) {
		const tableHeaderRegex = /(?<=(\n){2}|^)([^\r\n]*\|[^\r\n]*(\r?\n)?)+(?=(\r?\n){2}|$)/gm;
		const allTables = page.match(tableHeaderRegex);
		return allTables;
	}

	// Gets the row which the table is on by getting the values from every cell.
	// Gets rid of empty/whitespace only cells, cells with only dashes and
	// replace encoded pipes with normal ones.
	// Compares all the leftover values (pure text, no whitespace).
	// If they all match, the correct table is found and we find its row index in the file.
	// Definitely could be unhandled edgecases. Please open an issue or PR!
	// It also probably doesn't work 
	private getTableLocation(page: string, allTables: RegExpMatchArray, table: string): Number {
		let tableInFile: string;

		allTables.forEach((mdTable) => {
			const htmlValues = htmlToMarkdown(table).split("\n").map(element => {
				// Handling edgecases is not pretty
				return element.trim().replace("-","").replace("\\","|").replace(/\s/g,"");
			}).filter(element => {
				return element !== "";
			});

			const mdValues = mdTable.split("|").map(element => {
				// Even more edgecases due to char encoding
				return element.trim().replace("<input type=\"checkbox\" checked>","").replace("<input type=\"checkbox\" unchecked>","").replace("\\","|").replace(/\s/g,"");
			}).filter(element => {
				return element !== "" && element !== "\n" && element.match(new RegExp("[^-]"));
			})
			
			let result = true;
			for (let i = 0; i < htmlValues.length; i++) {
				if (htmlValues[i] !== mdValues[i]) {
					result = false;
					break;
				}
			}
			
			if (result) {
				tableInFile = mdTable
			}
		})

		const rowNumber = page.split("\n").indexOf(tableInFile!.split("\n")[0]);
		return rowNumber;
	}

	// Gets the row in the file, and column in table.
	private getCellLocation(evt: InputEvent, rowNumber: Number) {
		try { // If the checkbox is in a row (below separator)
			const columnIndex = evt.composedPath().find(td => td.nodeName.toLowerCase() === "td")!.cellIndex+1 // +1 to account for empty string
			const rowIndex = evt.composedPath().find(tr => tr.nodeName.toLowerCase() === "tr")!.rowIndex+rowNumber+1; // +1 to account for the separator, +rowNumber to account for table location in file
			return [rowIndex, columnIndex]
		}
		catch (error) { // If the checkbox is in the header (above separator)
			const columnIndex = evt.composedPath().find(th => th.nodeName.toLowerCase() === "th")!.cellIndex+1 // +1 to account for empty string
			const rowIndex = evt.composedPath().find(tr => tr.nodeName.toLowerCase() === "tr")!.rowIndex+rowNumber; // +rowNumber to account for table location in file
			return [rowIndex, columnIndex]
		} 
	}

	// Simply returns the <table></table> as an HTMLElement to use later.
	private findTableInPath(evt: InputEvent) {
		const path = evt.composedPath();
		const table = path.find(table => table.nodeName.toLowerCase() === "table");
		return table;
	}

	private isMDCheckboxInTable(row: string): boolean {
		// Regex to check if markdown checkbox is inside table
		const tableRegex = /\|[\s]*-[\s]?\[[\s]?\].*\|/;
		if (row.match(tableRegex)) {
			return true;
		}
		return false;
	}

	private isHTMLCheckboxInTable(row: string): boolean {
		// Regex to check if HTML checkbox is inside table
		const tableRegex = /\|[\s]*<input type="checkbox" (un)?checked>.*\|/;
		if (row.match(tableRegex)) {
			return true;
		}
		return false;
	}

	// Allow for different amounts of whitespace
	private getCheckboxLength(row: string) {
		const checkboxRegex = /-[\s]?[[\s]?]/
		const checkBox = row.match(checkboxRegex);
		return checkBox
	}

	// Split page into rows, take the correct row and
	// change the checkbox state. Then write to file.
	private toggleCheckbox(page: string, view: MarkdownView, checkbox: HTMLInputElement, cellLoc: number[]) {
		// console.log(page);

		const columnRegex = /(?<!\\)\|/g;
		let lines = page.split("\n");
		let row = lines[cellLoc[0]];

		const cells = row.split(columnRegex);
		if (checkbox.checked) {
			cells[cellLoc[1]] = cells[cellLoc[1]].replace('<input type="checkbox" unchecked>', '<input type="checkbox" checked>');
		}
		else {
			cells[cellLoc[1]] = cells[cellLoc[1]].replace('<input type="checkbox" checked>', '<input type="checkbox" unchecked>')
		}
		row = cells.join("|");
		lines[cellLoc[0]] = row;
		this.app.vault.modify(view.file, lines.join("\n"));
	}
}