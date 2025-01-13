import {Helper} from "../Helper.js";
import {Client, GatewayIntentBits, Message as DMessage, PartialMessage} from "discord.js";
import {Bot, bridgeConfig, Message} from "./bota.js";
import fs from "fs";
class Discord implements Bot {
	private readonly token: string;
	readonly name: string;
	readonly helper: Helper;
	client?: Client;
	newMessage?: (message: Message, bridgeId: number, bid: number) => void;
	newDeleteMessage?: (messageID: string, bridgeID: number, botBID: number) => Promise<void>;
	readonly userConcsent: boolean;
	readonly bridgedUsers = new Set<string>();
	constructor(info: {token: string; name: string; consent?: boolean}, helper: Helper) {
		this.token = info.token;
		this.name = info.name;
		this.helper = helper;
		this.userConcsent = info.consent || false;
		if (this.userConcsent) {
			const dir = __dirname + "/../../" + this.name + ".json";
			if (fs.existsSync(dir)) {
				const messages = JSON.parse(fs.readFileSync(dir).toString());
				this.bridgedUsers = new Set(messages as string[]);
			}
		}
	}
	async createClient() {
		this.client = new Client({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildPresences,
			],
		});
	}
	async connect() {
		return new Promise<void>(async (res) => {
			await this.createClient();
			if (!this.client) return;
			this.client.on("ready", () => {
				res();
			});
			this.client.on("messageCreate", (message: DMessage) => this.messageConvert(message));
			this.client.login(this.token);
			this.client.on("messageDelete", (message) => {
				this.messageDConvert(message.id, message.channel.id, message.author?.id || "");
			});
			this.client.on("messageUpdate", (_, message) => this.messageEditConvert(message));
		});
	}
	/**
	 * it's bridgeID then BotID
	 */
	readonly bridges = new Map<string, [number, number]>();
	/**
	 * it's bridgeID then BotID
	 */
	readonly cbridges = new Map<number, Map<number, [string, string]>>();
	addBridge(bridge: bridgeConfig, bridgeID: number, BBID: number) {
		this.bridges.set(bridge.channel, [bridgeID, BBID]);
		let m = this.cbridges.get(bridgeID);
		if (!m) {
			m = this.cbridges.set(bridgeID, new Map()).get(bridgeID);
		}
		if (!m) {
			throw new Error("HOW?");
		}
		m.set(BBID, [bridge.channel, bridge.guild]);
	}
	genUUID(bridgeID: number, BotBID: number) {
		//console.log(bridgeID, BotBID, this.cbridges);
		const bid = this.cbridges.get(bridgeID);
		if (!bid) return;
		const cid = bid.get(BotBID);
		//console.log(bid, BotBID);
		if (cid === undefined) return;
		//console.log(+cid[0]);
		return +cid[0];
	}
	async messageDConvert(messageId: string, channelId: string, aid: string) {
		if (aid === this.client?.user?.id) return;
		//console.log(messageId, channelId, "delete");
		const bridge = this.bridges.get(channelId);
		if (bridge === undefined) return;
		const uuid = this.genUUID(...bridge);
		if (!uuid) return;
		//console.log(messageId, uuid);
		const iid = await this.convertExternalToInternal(messageId, uuid);
		//console.log(messageId, channelId, iid, "delete");
		if (iid && this.newDeleteMessage) {
			this.newDeleteMessage(iid, ...bridge);
		}
	}
	async messageEditConvert(message: DMessage | PartialMessage) {
		//console.log(message);
		if (!("author" in message) || message.author == null) return;
		if (message.author.id == this.client?.user?.id) return;
		if (!message.content && !message.attachments.size) return;
		const bridge = this.bridges.get(message.channel.id);
		if (bridge === undefined) return;
		const cmessage: Message = {
			username: message.author.username,
			displayName: message.author.displayName,
			contents: message.content || "",
			attachments: [...message.attachments].map((_) => _[1].url),
			replying: message.reference
				? [
						await this.convertExternalToInternal(
							message.reference.messageId || "",
							this.genUUID(...bridge),
						),
					]
				: [],
			id: (await this.convertExternalToInternal(message.id, this.genUUID(...bridge))) || "",
			pfpSrc: message.author.avatarURL() || undefined,
			platform: "discord",
		};
		if (cmessage.id == "") {
			return;
		}
		if (this.onEditMessage) {
			this.onEditMessage(cmessage, ...bridge);
		}
	}
	async syncAuthors() {
		const dir = __dirname + "/../../" + this.name + ".json";
		fs.writeFile(dir, JSON.stringify([...this.bridgedUsers]), console.log);
	}
	async messageConvert(message: DMessage) {
		if (message.author.id == this.client?.user?.id) return;
		if (this.userConcsent && !this.bridgedUsers.has(message.author.id)) {
			if (message.content === "!bridge true") {
				this.bridgedUsers.add(message.author.id);
				this.syncAuthors();
			} else {
				return;
			}
		}
		if (message.content === "!bridge false") {
			this.bridgedUsers.delete(message.author.id);
			this.syncAuthors();
			return;
		}
		if (!message.content && !message.attachments.size) return;
		const bridge = this.bridges.get(message.channel.id);
		if (bridge === undefined) return;

		const cmessage: Message = {
			username: message.author.username,
			displayName: message.author.displayName,
			contents: message.content,
			attachments: [...message.attachments].map((_) => _[1].url),
			replying: message.reference
				? [
						await this.convertExternalToInternal(
							message.reference.messageId || "",
							this.genUUID(...bridge),
						),
					]
				: [],
			id: this.helper.createNewMessage(this.name, this.genUUID(...bridge) as number, message.id),
			pfpSrc: message.author.avatarURL() || undefined,
			platform: "discord",
		};

		if (this.newMessage) {
			this.newMessage(cmessage, bridge[0], bridge[1]);
		}
	}
	async createMessage(message: Message, bridgeID: number, BotBID: number) {
		const bid = this.cbridges.get(bridgeID);
		if (!bid) return;
		const cid = bid.get(BotBID);
		if (cid === undefined) return;
		if (!this.client) return;
		const channel = await this.client.channels.fetch(cid[0]);
		if (!channel) {
			console.error("channel does not exist to this bot for some reason");
			return;
		}
		if (!("send" in channel)) return;
		if (!channel.isSendable) {
			console.error("Can't send messages in the channel");
			return;
		}

		const m = await channel.send(await this.messageToEmbed(message, bridgeID, BotBID));
		return m.id;
	}
	async messageToEmbed(message: Message, bridgeID: number, BotBID: number) {
		let replying = await this.convertInternalToExternal(
			message.replying[0],
			this.genUUID(bridgeID, BotBID),
		);
		return {
			embeds: [
				{
					author: {
						name: message.displayName,
						icon_url: message.pfpSrc,
					},
					description: message.contents,
				},
			],
			reply: replying
				? {
						messageReference: replying,
					}
				: undefined,
		};
	}
	async deleteMessage(messageID: string, bridgeID: number, BotBID: number): Promise<void> {
		const uuid = this.genUUID(bridgeID, BotBID);
		const mid = await this.convertInternalToExternal(messageID, uuid);
		if (!mid) return;
		if (this.client) {
			const cmid = this.cbridges.get(bridgeID);
			if (!cmid) return;
			const cid = cmid.get(BotBID);
			if (!cid) return;
			const channel = await this.client.channels.fetch(cid[0]);
			if (!channel) return;
			if ("send" in channel) {
				try {
					const message = await channel.messages.fetch(mid);
					if (!message) return;
					if (message.deletable) {
						await message.delete();
					}
				} catch (e) {
					return;
				}
			}
		}
	}
	onEditMessage?: (message: Message, bridgeID: number, botBID: number) => Promise<void>;
	async editMessage(message: Message, bridgeID: number, BotBID: number): Promise<void> {
		const uuid = this.genUUID(bridgeID, BotBID);
		const mid = await this.convertInternalToExternal(message.id, uuid);
		if (!mid) return;
		if (this.client) {
			const cmid = this.cbridges.get(bridgeID);
			if (!cmid) return;
			const cid = cmid.get(BotBID);
			if (!cid) return;
			const channel = await this.client.channels.fetch(cid[0]);
			if (!channel) return;
			if ("send" in channel) {
				const m = await channel.messages.fetch(mid);
				if (!m) return;
				if (m.editable) {
					m.edit(await this.messageToEmbed(message, bridgeID, BotBID));
				}
			}
		}
	}
	async convertExternalToInternal(id: string | null, uuid: number | undefined) {
		const temp = await this.helper.convertExternalToInternal(this.name, uuid, id);
		return temp;
	}
	async convertInternalToExternal(id: string | null, uuid: number | undefined) {
		const temp = await this.helper.convertInternalToExternal(this.name, uuid, id);
		return temp;
	}
}

export {Discord};
