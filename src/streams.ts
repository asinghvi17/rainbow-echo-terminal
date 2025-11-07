import { Readable, Writable } from 'stream';
import { EventEmitter } from 'events';
import * as vscode from 'vscode';

/**
 * Custom readable stream that receives input from VS Code's pseudoterminal
 * and makes it available to Ink as stdin
 */
export class PseudoTerminalReadable extends Readable {
	private buffer: string[] = [];
	private isClosed = false;

	constructor() {
		super();
		// Set to raw mode to receive individual characters
		(this as any).setRawMode = (mode: boolean) => {
			// VS Code handles raw mode for us
			return this;
		};
		(this as any).isTTY = true;

		// Add ref/unref methods that Node.js ReadStream has
		// These are used by ink to manage the event loop
		(this as any).ref = () => this;
		(this as any).unref = () => this;
	}

	_read() {
		// Push any buffered data
		while (this.buffer.length > 0 && !this.isClosed) {
			const data = this.buffer.shift();
			if (!this.push(data)) {
				break;
			}
		}
	}

	/**
	 * Called by the pseudoterminal when user types
	 */
	feedInput(data: string) {
		if (this.isClosed) {
			return;
		}
		
		this.buffer.push(data);
		this._read();
	}

	/**
	 * Called when the terminal is closing
	 */
	close() {
		this.isClosed = true;
		this.push(null); // Signal EOF
	}
}

/**
 * Custom writable stream that captures Ink's output
 * and forwards it to VS Code's pseudoterminal display
 */
export class PseudoTerminalWritable extends Writable {
	public columns: number;
	public rows: number;
	private writeEmitter: vscode.EventEmitter<string>;

	constructor(
		writeEmitter: vscode.EventEmitter<string>,
		dimensions: { columns: number; rows: number }
	) {
		super();
		this.writeEmitter = writeEmitter;
		this.columns = dimensions.columns;
		this.rows = dimensions.rows;
		(this as any).isTTY = true;
	}

	_write(
		chunk: any,
		encoding: BufferEncoding,
		callback: (error?: Error | null) => void
	) {
		try {
			const data = chunk.toString();
			this.writeEmitter.fire(data);
			callback();
		} catch (error) {
			callback(error as Error);
		}
	}

	/**
	 * Update dimensions when terminal is resized
	 */
	updateDimensions(dimensions: { columns: number; rows: number }) {
		this.columns = dimensions.columns;
		this.rows = dimensions.rows;
	}
}

