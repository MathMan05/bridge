import {Client, GatewayIntentBits} from "discord.js";
import {spacebarBotConf} from "..";
import {Helper} from "../Helper.js";
import {Discord} from "./discord.js";

class Spacebar extends Discord {
	private readonly apiURL: string;
	constructor(info: spacebarBotConf, helper: Helper) {
		super(info, helper);
		this.apiURL = info.url;
	}
	async createClient() {
		const urls = await (await fetch(this.apiURL + "policies/instance/domains")).json();
		this.client = new Client({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildPresences,
			],
			rest: {
				api: urls.apiEndpoint,
				cdn: urls.cdn,
				version: "9",
			},
			ws: {
				version: urls.defaultApiVersion,
			},
		});
	}
}
export {Spacebar};
