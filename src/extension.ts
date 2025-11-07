// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Rainbow Echo Terminal extension is now active!');

	// Register the command to open the rainbow terminal
	const openTerminalCommand = vscode.commands.registerCommand(
		'rainbow-echo-terminal.openTerminal',
		async () => {
			try {
				// Lazy load the pseudoterminal module only when command is executed
				// This ensures ink and its dependencies aren't loaded at extension startup
				const { RainbowPseudoterminal } = require('./pseudoterminal');

				// Detect test mode - check if we're running in a test environment
				// VS Code test runner sets VSCODE_TEST environment variable
				const isTestMode = process.env.VSCODE_TEST === 'true' ||	
				                   process.env.NODE_ENV === 'test';

				console.log('Opening Rainbow Echo Terminal, test mode:', isTestMode);
				console.log('Environment:', {
					VSCODE_TEST: process.env.VSCODE_TEST,
					NODE_ENV: process.env.NODE_ENV
				});

				// Create a pseudoterminal instance
				const pty = new RainbowPseudoterminal(isTestMode);

				// Create the terminal
				const terminal = vscode.window.createTerminal({
					name: '🌈 Rainbow Echo',
					pty,
				});

				// Show the terminal
				terminal.show();
			} catch (error) {
				console.error('Failed to load Rainbow Echo Terminal:', error);
				vscode.window.showErrorMessage(`Failed to open Rainbow Echo Terminal: ${error}`);
			}
		}
	);

	context.subscriptions.push(openTerminalCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}
