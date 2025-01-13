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
		if ((urls.apiEndpoint as string).endsWith("/v9")) {
			const api = urls.apiEndpoint as string;
			const l = api.split("/v9");
			l.pop();
			urls.apiEndpoint = l.join("/v9");
		}
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
