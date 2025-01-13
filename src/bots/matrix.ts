import {Cli, Bridge, AppServiceRegistration} from "matrix-appservice-bridge";
import {Bot} from "./bota";
import {matrixBotConf} from "..";
import {Helper} from "../Helper";
export class Matrix implements Bot {
	private readonly helper: Helper;
	readonly name: string;
	readonly yaml: string;
	readonly homeServerURL: string;
	readonly domain: string;
	constructor(config: matrixBotConf, helper: Helper) {
		this.helper = helper;
		this.name = config.name;
		this.yaml = config.yaml;
		this.homeServerURL = config.homeServerURL;
		this.domain = config.domain;
	}
	async connect() {
		new Cli({
			registrationPath: this.yaml,
			generateRegistration: function (reg, callback) {
				reg.setId(AppServiceRegistration.generateToken());
				reg.setHomeserverToken(AppServiceRegistration.generateToken());
				reg.setAppServiceToken(AppServiceRegistration.generateToken());
				reg.setSenderLocalpart("_mathbridge_bot");
				reg.addRegexPattern("users", "@_mathbridge_.*", true);
				callback(reg);
			},
			run: (port, _config) => {
				const bridge = new Bridge({
					homeserverUrl: this.homeServerURL,
					domain: this.domain,
					registration: this.yaml,

					controller: {
						onUserQuery: function (_queriedUser) {
							return {}; // auto-provision users with no additonal data
						},

						onEvent: function (request, context) {
							const event = request.getData();
							console.log(event);
						},
					},
				});
				//port ??= 6693;
				if (port === null) {
					console.log("port null", this);
					return;
				}
				console.log("Matrix-side listening on port %s", port);
				bridge.run(port);
			},
		}).run();
	}
}
