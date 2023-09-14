# Obsidian Tables Checkboxes
This plugin for [Obsidian](https://obsidian.md) replaces markdown checkboxes `-[]` inside markdown tables with HTML checkboxes.

## Example
https://github.com/DylanGiesberts/obsidian-table-checkboxes/assets/66573865/7a218dd4-2575-41e8-b615-01f97c0a9bdb

## Installing the plugin 
1. Navigate to the plugins folder (Settings => Community plugins -> Click the folder icon next to 'Installed plugins')
2. Create a folder for the plugin files, like `obsidian-table-checkboxes`
3. Download `main.js` and `manifest.json` from the releases tab and drop them in `obsidian-table-checkboxes`

## Installing the plugin using BRAT
1. Scroll to the Beta Plugin List section
2. Add Beta Plugin
3. Specify this repository: git@github.com:DylanGiesberts/obsidian-table-checkboxes.git

## How to use
- Simply enable the plugin and type a markdown checkbox inside a table. It will get converted to a HTML checkbox.
- In either live preview or view mode, (un)check the checkbox and the state will be reflected in your file.

## How it works
- Whenever a closing bracket `]` is typed to close a checkbox, it will be replaced by an HTML checkbox `<input type="checkbox" unchecked id="...">`.
- When the checkbox is clicked in the preview, the checkbox in the file is found by its ID.
- The `checked` state of the checkbox gets toggled.
