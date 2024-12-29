This is a simple bot meant to make bridging easier for users, to use this, simply install like any other nodejs program, and create a file called config.json at the root of the project in the following format
```json
{
	"bots": [
		{
			"type": "discord",
			"name": "Discord",
			"token": "token"
		},
		{
			"type": "spacebar",
			"name": "Spacebar",
			"token": "token",
			"url": "https://old.server.spacebar.chat/api/"
		}
	],
	"bridges": [
		{
			"channels":[
				{
					"name": "Discord",
					"guild": "guildid",
					"channel": "channelid"
				},
				{
					"name": "Discord",
					"guild": "guildid",
					"channel": "channelid"
				},
				{
					"name": "Discord",
					"guild": "guildid",
					"channel": "channelid"
				},
				{
					"name": "Spacebar",
					"guild": "guildid",
					"channel": "channelid"
				}
			]
		}
	],
	"mysql": {
		"host": "host",
		"user": "user",
		"password": "password",
		"database": "datebase"
	}
}
```
mysql is completly optional, it just provides as persistant mappings of ids, this bot will fall back to other methods if credtials are not provided
