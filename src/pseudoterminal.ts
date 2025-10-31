import * as vscode from 'vscode';
import { PseudoTerminalReadable, PseudoTerminalWritable } from './streams';
import { renderApp } from './cli';
import type { Instance } from 'ink';

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
	
	// Ink instance
	private inkInstance?: Instance;

	// Required event: output to terminal display
	public readonly onDidWrite = this.writeEmitter.event;
	
	// Optional event: signal terminal closure
	public readonly onDidClose = this.closeEmitter.event;

	/**
	 * Called when terminal is opened. This is where we initialize the Ink app.
	 */
	open(initialDimensions: vscode.TerminalDimensions | undefined): void {
		const dimensions = initialDimensions || { columns: 80, rows: 24 };

		// Create custom streams
		this.stdin = new PseudoTerminalReadable();
		this.stdout = new PseudoTerminalWritable(this.writeEmitter, dimensions);
		this.stderr = new PseudoTerminalWritable(this.writeEmitter, dimensions);

		// Render the Ink app with our custom streams
		try {
			this.inkInstance = renderApp(
				this.stdin,
				this.stdout,
				this.stderr,
				() => {
					// Called when user presses Escape
					this.handleExit();
				}
			);

			// Wait for Ink to finish (if it exits)
			this.inkInstance.waitUntilExit().then(() => {
				this.handleExit();
			});
		} catch (error) {
			console.error('Failed to start Ink app:', error);
			this.writeEmitter.fire(`Error: ${error}\r\n`);
			this.handleExit(1);
		}
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
		if (this.inkInstance) {
			try {
				this.inkInstance.unmount();
			} catch (error) {
				// Ignore errors during cleanup
			}
			this.inkInstance = undefined;
		}

		if (this.stdin) {
			this.stdin.close();
			this.stdin = undefined;
		}

		this.stdout = undefined;
		this.stderr = undefined;
	}
}

