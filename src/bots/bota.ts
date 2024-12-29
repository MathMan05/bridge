/**
 * replying id and id must both be *internal* IDs, not those of the platform
 */
export type bridgeConfig = {
	name: string;
	guild: string;
	channel: string;
};
export type Message = {
	username: string;
	displayName: string;
	contents: string;
	pfpSrc?: string;
	replying: (string | null)[];
	id: string;
	attachments: string[];
	platform: string;
};
export interface Bot {
	readonly name: string;
	connect: () => Promise<void>;

	newMessage?: (message: Message, bridgeID: number, botBID: number) => void;
	createMessage: (
		message: Message,
		bridgeID: number,
		BotBID: number,
	) => Promise<string | undefined>;

	deleteMessage: (messageID: string, bridgeID: number, BotBID: number) => Promise<void>;
	newDeleteMessage?: (messageID: string, bridgeID: number, botBID: number) => Promise<void>;

	onEditMessage?: (message: Message, bridgeID: number, botBID: number) => Promise<void>;
	editMessage: (message: Message, bridgeID: number, botBID: number) => Promise<void>;

	addBridge: (bridge: bridgeConfig, bridgeID: number, botBID: number) => void;
	genUUID: (bridgeID: number, botBID: number) => number | void;
}
