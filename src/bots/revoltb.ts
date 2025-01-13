import {Helper} from "../Helper.js";
import {Client, Message as DMessage} from "revolt.js";
import {Bot, bridgeConfig, Message} from "./bota.js";
import {revoltBotConf} from "../index.js";
class Revolt implements Bot {
	private readonly token: string;
	readonly name: string;
	readonly helper: Helper;
	client?: Client;
	newMessage?: (message: Message, bridgeId: number, bid: number) => void;
	newDeleteMessage?: (messageID: string, bridgeID: number, botBID: number) => Promise<void>;
	readonly url: string;
	constructor(info: revoltBotConf, helper: Helper) {
		this.token = info.token;
		this.name = info.name;
		this.helper = helper;
		this.url = info.url;
		this.url ??= "https://revolt.chat";
	}
	async createClient() {
		this.client = new Client({});
	}
	async connect() {
		return new Promise<void>(async (res) => {
			await this.createClient();
			if (!this.client) return;
			this.client.on("ready", () => {
				res();
			});
			this.client.on("messageCreate", (message) => this.messageConvert(message));
			this.client.loginBot(this.token);
			this.client.on("messageDelete", (m) => {
				if (!m || !m.authorId) return;
				this.messageDConvert(m.id, m.channelId, m.authorId);
			});
			this.client.on("messageUpdate", (message) => this.messageEditConvert(message));
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
		let build = 0;
		for (const char of cid[0]) {
			build *= 32;
			build += "0123456789ABCDEFGHJKMNPQRSTVWXYZ".indexOf(char);
			if (build >= Number.MAX_SAFE_INTEGER / 32) {
				break;
			}
		}
		return build;
	}
	async messageDConvert(messageId: string, channelId: string, aid: string) {
		if (this.client?.user?.id == aid) {
			return;
		}
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
	async messageEditConvert(message: DMessage) {
		//console.log(message);
		if (!this.client) return;
		if (message.author?.id == this.client.user?.id) return;
		if (!message.content && !message.attachments?.length) return;
		const bridge = this.bridges.get(message.channelId);
		if (bridge === undefined) return;
		const author = message.author;
		if (!author) return;
		const cmessage: Message = {
			username: author.username,
			displayName: author.username,
			contents: message.content || "",
			attachments: (message.attachments || []).map((_) => _.url),
			replying: message.replyIds
				? await Promise.all(
						message.replyIds.map((_) => this.convertExternalToInternal(_, this.genUUID(...bridge))),
					)
				: [],
			id: (await this.convertExternalToInternal(message.id, this.genUUID(...bridge))) || "",
			pfpSrc: author.avatarURL || undefined,
			platform: "revolt",
		};
		if (cmessage.id == "") {
			return;
		}
		if (this.onEditMessage) {
			this.onEditMessage(cmessage, ...bridge);
		}
	}
	async messageConvert(message: DMessage) {
		if (!message.author || !message.channel) return;
		if (message.author.id == this.client?.user?.id) return;
		if (!message.content && !message.attachments?.length) return;
		const bridge = this.bridges.get(message.channel.id);
		if (bridge === undefined) return;

		const cmessage: Message = {
			username: message.author.username,
			displayName: message.author.username,
			contents: message.content || "",
			attachments: (message.attachments || []).map((_) => _.url),
			replying: message.replyIds?.length
				? (
						await Promise.all(
							message.replyIds.map((_) =>
								this.convertExternalToInternal(_, this.genUUID(...bridge)),
							),
						)
					).filter((_) => _ !== null)
				: [],
			id: this.helper.createNewMessage(this.name, this.genUUID(...bridge) as number, message.id),
			pfpSrc: message.author.avatarURL || undefined,
			platform: "revolt",
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
		if (!channel.havePermission("SendMessage")) {
			console.error("Can't send messages in the channel");
			return;
		}
		try {
			if (channel.havePermission("Masquerade")) {
				const m = await channel.sendMessage(await this.messageToEmbed(message, bridgeID, BotBID));
				return m.id;
			} else {
				const m = await channel.sendMessage("bot is missing permission Masquerade");
				return m.id;
			}
		} catch (e) {
			console.error(e);
		}
		return "";
	}
	async messageToEmbed(message: Message, bridgeID: number, BotBID: number, edit = false) {
		console.log("mte");
		let replying = (
			await Promise.all(
				message.replying.map((_) =>
					this.convertInternalToExternal(_, this.genUUID(bridgeID, BotBID)),
				),
			)
		)
			.filter((_) => _ != null)
			.map((id) => {
				return {id, mention: true};
			});
		return edit
			? {
					content: message.contents,
				}
			: {
					masquerade: {
						name: message.displayName,
						avatar: message.pfpSrc,
					},
					content: message.contents,
					replies: replying,
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

			const message = await channel.fetchMessage(mid);
			if (!message) return;
			if (message.author?.id === this.client?.user?.id) {
				await message.delete();
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

			const m = await channel.fetchMessage(mid);
			if (!m) return;
			if (m.author?.id === this.client?.user?.id) {
				m.edit(await this.messageToEmbed(message, bridgeID, BotBID, true));
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

export {Revolt};
