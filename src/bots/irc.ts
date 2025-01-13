import {IRC} from "irc-framework";
import {Bot, Message} from "./bota";
import {ircBotConf} from "..";
import {Helper} from "../Helper";
class Irc implements Bot {
	readonly name: string;
	readonly nick: string;
	readonly port: number;
	readonly account: Readonly<undefined | {account: string; password: string}>;
	readonly url: string;
	readonly helper: Helper;
	constructor(conf: ircBotConf, helper: Helper) {
		this.name = conf.name;
		this.nick = conf.nick;
		this.port = conf.port;
		this.helper = helper;
		this.account = Object.freeze(conf.acount);
		this.url = conf.url;
	}
	//this is due to libary missing types lol
	connection?: any;
	newMessage?: (message: Message, bridgeID: number, botBID: number) => void;
	async connect() {
		this.connection = new IRC.client();
		await this.connection.connect({
			host: this.url,
			port: this.port,
			nick: this.nick,
			account: this.account,
		});
		this.connection.on("message", (event) => {
			if (this.newMessage) {
				console.log(event);
			}
		});
	}
}
