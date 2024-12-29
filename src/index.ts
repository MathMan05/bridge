import {Bot, bridgeConfig, Message} from "./bots/bota.js";
import {Discord} from "./bots/discord.js";
import {Spacebar} from "./bots/spacebar.js";
import {Helper} from "./Helper.js";
import fs from "fs";
export type discordBotConf = {
	type: "discord";
	name: string;
	token: string;
};
export type spacebarBotConf = {
	type: "spacebar";
	name: string;
	token: string;
	url: string;
};

type config = {
	bots: (discordBotConf | spacebarBotConf)[];
	bridges: {channels: bridgeConfig[]}[];
	mysql: void | {
		host: string;
		user: string;
		password: string;
		database: string;
	};
};
const config = JSON.parse(fs.readFileSync(__dirname + "/../config.json", "utf-8")) as config;
//console.log(config);
const bots = new Map<string, Bot>();

const helper = new Helper(config.mysql);
async function onDelete(messageID: string, bridgeID: number, botBID: number) {
	//console.log(messageID, bridgeID, botBID);
	const bridges = bridgess[bridgeID];
	if (!bridges) return;
	let i = 0;
	for (const b of bridges) {
		if (i !== botBID) {
			const j = i;
			await b.deleteMessage(messageID, bridgeID, j);
		}
		i++;
	}
	await helper.deleteIID(messageID);
}
function onMessage(message: Message, bridgeID: number, botBID: number) {
	//console.log(message);
	const bridges = bridgess[bridgeID];
	if (!bridges) return;
	let i = 0;
	for (const b of bridges) {
		if (i !== botBID) {
			const j = i;
			b.createMessage(message, bridgeID, j).then((_) => {
				if (!_) return;
				const uuid = b.genUUID(bridgeID, j);
				//console.log(uuid);
				helper.setEIDtoIID(b.name, uuid, _, message.id);
			});
		}
		i++;
	}
}
async function onEdit(message: Message, bridgeID: number, botBID: number) {
	//console.log(message);
	const bridges = bridgess[bridgeID];
	if (!bridges) return;
	let i = 0;
	for (const b of bridges) {
		if (i !== botBID) {
			const j = i;
			b.editMessage(message, bridgeID, j);
		}
		i++;
	}
}
for (const bot of config.bots) {
	let boty: Bot | undefined = undefined;
	if (bot.type === "discord") {
		boty = new Discord(bot, helper);
		bots.set(bot.name, boty);
	} else if (bot.type === "spacebar") {
		boty = new Spacebar(bot, helper);
		bots.set(bot.name, boty);
	}
	if (boty) {
		boty.newMessage = onMessage;
		boty.newDeleteMessage = onDelete;
		boty.onEditMessage = onEdit;
	}
}
let bridgeID = 0;

const bridgess = config.bridges.map((bridges) => {
	const botarr: Bot[] = [];
	let botBID = 0;
	for (const bridge of bridges.channels) {
		const bot = bots.get(bridge.name);
		if (bot) {
			bot.addBridge(bridge, bridgeID, botBID);
			botarr.push(bot);
			botBID++;
		}
	}
	bridgeID++;
	return botarr;
});

await Promise.all(bots.values().map((_) => _.connect()));
console.log("connected bots");
