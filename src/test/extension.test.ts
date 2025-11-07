import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Rainbow Echo Terminal Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start Rainbow Echo Terminal tests.');

	test('Extension should be present', () => {
		assert.ok(vscode.extensions.getExtension('undefined_publisher.rainbow-echo-terminal'));
	});

	test('Command should be registered', async () => {
		// Get all commands
		const allCommands = await vscode.commands.getCommands(true);

		// Check if our command is registered
		const commandExists = allCommands.includes('rainbow-echo-terminal.openTerminal');
		assert.ok(commandExists, 'Command rainbow-echo-terminal.openTerminal should be registered');
	});
});
