import { useState, useEffect } from 'react';
import { render, Box, Text, useInput, type Key } from 'ink';
import type { Readable, Writable } from 'stream';

// Rainbow colors in order
const RAINBOW_COLORS = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'] as const;
type RainbowColor = typeof RAINBOW_COLORS[number];

interface HistoryEntry {
	text: string;
	timestamp: number;
}

const RainbowText = ({ text }: { text: string }) => {
	return (
		<Text>
			{text.split('').map((char, index) => {
				const colorIndex = index % RAINBOW_COLORS.length;
				const color = RAINBOW_COLORS[colorIndex];
				return (
					<Text key={index} color={color}>
						{char}
					</Text>
				);
			})}
		</Text>
	);
};

interface AppProps {
	onExit?: () => void;
}

const App = ({ onExit }: AppProps) => {
	const [inputText, setInputText] = useState('');
	const [history, setHistory] = useState<HistoryEntry[]>([]);
	const [isExiting, setIsExiting] = useState(false);

	useInput((char: string, key: Key) => {
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

	return (
		<Box flexDirection="column" padding={1}>
			<Box flexDirection="column" marginBottom={1}>
				<Text bold color="cyan">
					🌈 Rainbow Echo Terminal 🌈
				</Text>
				<Text dimColor>
					Type something and press Enter. Press Esc to exit.
				</Text>
			</Box>

			{/* History section */}
			<Box flexDirection="column" marginBottom={1}>
				{history.length > 0 && (
					<Box flexDirection="column">
						<Text bold underline color="gray">
							History:
						</Text>
						{history.map((entry, index) => (
							<Box key={entry.timestamp} marginLeft={1}>
								<Text dimColor>{index + 1}. </Text>
								<RainbowText text={entry.text} />
							</Box>
						))}
					</Box>
				)}
			</Box>

			{/* Input section */}
			<Box>
				<Text bold color="green">
					&gt;{' '}
				</Text>
				<Text>{inputText}</Text>
				<Text backgroundColor="white"> </Text>
			</Box>
		</Box>
	);
};

/**
 * Render the app with custom streams (for VS Code extension integration)
 */
export function renderApp(
	stdin: Readable,
	stdout: Writable,
	stderr: Writable,
	onExit?: () => void
) {
	// Type assertion: Our custom streams implement the necessary properties
	// that Ink needs (isTTY, columns, rows, setRawMode, etc.)
	return render(<App onExit={onExit} />, {
		stdin: stdin as NodeJS.ReadStream,
		stdout: stdout as NodeJS.WriteStream,
		stderr: stderr as NodeJS.WriteStream,
		debug: false,
		exitOnCtrlC: false, // We handle exit ourselves
		patchConsole: false, // Don't patch console in extension context
	});
}

// When run directly as a CLI (not from the extension)
if (require.main === module) {
	render(<App />);
}
