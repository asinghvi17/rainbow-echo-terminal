import type { Readable, Writable } from 'stream';

/**
 * Render the app with custom streams (for VS Code extension integration)
 * Using dynamic imports to avoid ESM/CommonJS issues
 */
export async function renderApp(
	stdin: Readable,
	stdout: Writable,
	stderr: Writable,
	onExit?: () => void
) {
	// Import React and Ink - both are bundled together now
	const React = await import('react');
	const ink = await import('ink');
	const { useState, useEffect } = React;
	const { render, Box, Text, useInput } = ink;

	// Rainbow colors in order
	const RAINBOW_COLORS = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'] as const;
	type RainbowColor = typeof RAINBOW_COLORS[number];

	interface HistoryEntry {
		text: string;
		timestamp: number;
	}

	const RainbowText = ({ text }: { text: string }) => {
		return React.createElement(Text, {},
			text.split('').map((char, index) => {
				const colorIndex = index % RAINBOW_COLORS.length;
				const color = RAINBOW_COLORS[colorIndex];
				return React.createElement(Text, { key: `char-${index}`, color }, char);
			})
		);
	};

	interface AppProps {
		onExit?: () => void;
	}

	const App = ({ onExit }: AppProps) => {
		const [inputText, setInputText] = useState('');
		const [history, setHistory] = useState<HistoryEntry[]>([]);
		const [isExiting, setIsExiting] = useState(false);

		useInput((char: string, key: any) => {
			if (key.return) {
				// Submit the input
				if (inputText.trim()) {
					setHistory(prev => [...prev, { text: inputText, timestamp: Date.now() }]);
					setInputText('');
				}
			} else if (key.backspace || key.delete) {
				// Handle backspace
				setInputText(prev => prev.slice(0, -1));
			} else if (key.escape) {
				// Exit on Escape
				setIsExiting(true);
			} else if (!key.ctrl && !key.meta && char.length === 1) {
				// Regular character input
				setInputText(prev => prev + char);
			}
		});

		useEffect(() => {
			if (isExiting) {
				if (onExit) {
					onExit();
				} else {
					process.exit(0);
				}
			}
		}, [isExiting, onExit]);

		return React.createElement(Box, { flexDirection: 'column', padding: 1 }, [
			// Header
			React.createElement(Box, { key: 'header', flexDirection: 'column', marginBottom: 1 }, [
				React.createElement(Text, { key: 'title', bold: true, color: 'cyan' }, '🌈 Rainbow Echo Terminal 🌈'),
				React.createElement(Text, { key: 'instructions', dimColor: true }, 'Type something and press Enter. Press Esc to exit.')
			]),

			// History section
			React.createElement(Box, { key: 'history', flexDirection: 'column', marginBottom: 1 },
				history.length > 0 ? React.createElement(Box, { flexDirection: 'column' },
					React.createElement(Text, { key: 'history-title', bold: true, underline: true, color: 'gray' }, 'History:'),
					...history.map((entry, index) =>
						React.createElement(Box, { key: `history-item-${index}`, marginLeft: 1 },
							React.createElement(Text, { dimColor: true }, `${index + 1}. `),
							React.createElement(RainbowText, { text: entry.text })
						)
					)
				) : null
			),

			// Input section
			React.createElement(Box, { key: 'input' }, [
				React.createElement(Text, { key: 'prompt', bold: true, color: 'green' }, '> '),
				React.createElement(Text, { key: 'text' }, inputText),
				React.createElement(Text, { key: 'cursor', backgroundColor: 'white' }, ' ')
			])
		]);
	};

	// Type assertion: Our custom streams implement the necessary properties
	// that Ink needs (isTTY, columns, rows, setRawMode, etc.)
	return render(React.createElement(App, { onExit }), {
		stdin: stdin as NodeJS.ReadStream,
		stdout: stdout as NodeJS.WriteStream,
		stderr: stderr as NodeJS.WriteStream,
		debug: false,
		exitOnCtrlC: false, // We handle exit ourselves
		patchConsole: false, // Don't patch console in extension context
	});
}