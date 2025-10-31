// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { RainbowPseudoterminal } from './pseudoterminal';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Rainbow Echo Terminal extension is now active!');

	// Register the command to open the rainbow terminal
	const openTerminalCommand = vscode.commands.registerCommand(
		'rainbow-echo-terminal.openTerminal',
		() => {
			// Create a pseudoterminal instance
			const pty = new RainbowPseudoterminal();

			// Create the terminal
			const terminal = vscode.window.createTerminal({
				name: '🌈 Rainbow Echo',
				pty,
			});

			// Show the terminal
			terminal.show();
		}
	);

	context.subscriptions.push(openTerminalCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}
