import * as vscode from 'vscode';
import { PseudoTerminalReadable, PseudoTerminalWritable } from './streams';
// Defer ink imports to avoid module initialization issues
// import { renderApp } from './cli';
// import type { Instance } from 'ink';

/**
 * Pseudoterminal implementation that runs the Ink-based Rainbow Echo Terminal
 * inside a VS Code terminal.
 */
export class RainbowPseudoterminal implements vscode.Pseudoterminal {
	private writeEmitter = new vscode.EventEmitter<string>();
	private closeEmitter = new vscode.EventEmitter<number | void>();

	// Streams for Ink
	private stdin?: PseudoTerminalReadable;
	private stdout?: PseudoTerminalWritable;
	private stderr?: PseudoTerminalWritable;

	// Ink instance (type will be loaded dynamically)
	private inkInstance?: any;

	// Test mode flag - when true, don't actually start Ink
	private testMode: boolean;

	// Required event: output to terminal display
	public readonly onDidWrite = this.writeEmitter.event;

	// Optional event: signal terminal closure
	public readonly onDidClose = this.closeEmitter.event;

	constructor(testMode: boolean = false) {
		this.testMode = testMode;
	}

	/**
	 * Called when terminal is opened. This is where we initialize the Ink app.
	 */
	open(initialDimensions: vscode.TerminalDimensions | undefined): void {
		const dimensions = initialDimensions || { columns: 80, rows: 24 };

		// Create custom streams
		this.stdin = new PseudoTerminalReadable();
		this.stdout = new PseudoTerminalWritable(this.writeEmitter, dimensions);
		this.stderr = new PseudoTerminalWritable(this.writeEmitter, dimensions);

		// In test mode, just show a message and return immediately
		if (this.testMode) {
			this.writeEmitter.fire('🌈 Rainbow Echo Terminal (Test Mode)\r\n');
			this.writeEmitter.fire('Terminal created successfully in test mode.\r\n');
			return;
		}

		// Render the Ink app with our custom streams (async due to dynamic imports)
		(async () => {
			try {
				// Lazy load the compiled cli module to avoid loading ink at extension startup
				// This loads from dist/cli.js which is built separately
				const { renderApp } = require('../dist/cli');
				// renderApp is now async due to dynamic imports
				this.inkInstance = await renderApp(
					this.stdin,
					this.stdout,
					this.stderr,
					() => {
						// Called when user presses Escape
						this.handleExit();
					}
				);

				// Wait for Ink to finish (if it exits)
				// Add error handling to prevent unhandled promise rejections
				this.inkInstance.waitUntilExit()
					.then(() => {
						// Only handle exit if not already cleaned up
						if (this.inkInstance) {
							this.handleExit();
						}
					})
					.catch((error: Error) => {
						// Ignore errors if we're already cleaning up
						if (this.inkInstance) {
							console.error('Ink app error:', error);
						}
					});
			} catch (error) {
				console.error('Failed to start Ink app:', error);
				this.writeEmitter.fire(`Error: ${error}\r\n`);
				this.handleExit(1);
			}
		})();
	}

	/**
	 * Called when user closes the terminal
	 */
	close(): void {
		this.cleanup();
	}

	/**
	 * Called when user types in the terminal
	 */
	handleInput(data: string): void {
		if (this.stdin) {
			// Convert VS Code key codes to terminal sequences
			// VS Code sends raw characters, but we need to handle special keys
			const processedData = this.processInput(data);
			this.stdin.feedInput(processedData);
		}
	}

	/**
	 * Optional: Called when terminal is resized
	 */
	setDimensions(dimensions: vscode.TerminalDimensions): void {
		if (this.stdout) {
			this.stdout.updateDimensions(dimensions);
		}
		if (this.stderr) {
			this.stderr.updateDimensions(dimensions);
		}
		
		// Ink will automatically handle the resize through the stream properties
	}

	/**
	 * Process input to handle special keys
	 */
	private processInput(data: string): string {
		// VS Code sends these control characters:
		// - Enter: '\r' (we might need to convert to '\n' or keep as is)
		// - Backspace: '\x7f' (DEL character)
		// - Ctrl+C: '\x03'
		
		// Ink's useInput expects standard terminal sequences
		// In most cases, we can pass data through as-is since VS Code
		// already sends the correct sequences
		
		return data;
	}

	/**
	 * Handle exit (either user-initiated or error)
	 */
	private handleExit(exitCode: number = 0): void {
		this.cleanup();
		this.closeEmitter.fire(exitCode);
	}

	/**
	 * Cleanup resources
	 */
	private cleanup(): void {
		// Store reference and clear immediately to prevent double cleanup
		const inkInstanceToCleanup = this.inkInstance;
		const stdinToCleanup = this.stdin;

		this.inkInstance = undefined;
		this.stdin = undefined;
		this.stdout = undefined;
		this.stderr = undefined;

		// Cleanup Ink instance
		if (inkInstanceToCleanup) {
			try {
				// Unmount the Ink app to stop React rendering
				inkInstanceToCleanup.unmount();
			} catch (error) {
				// Ignore errors during cleanup
				// The instance might already be unmounted
			}
		}

		// Close stdin stream
		if (stdinToCleanup) {
			try {
				stdinToCleanup.close();
			} catch (error) {
				// Ignore errors during cleanup
			}
		}
	}
}

