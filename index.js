const tmi = require('tmi.js');
const GIF = require('./gifLoader.js');

class Chat {
	/**
	 * @param {Object} config The configuration object.
	 * @param {Number} config[].maximumEmoteLimit The maximum number of emotes permitted for a single message.
	 * @param {Number} config[].maximumEmoteLimit_pleb The maximum number of emotes permitted for a single message from an unsubscribed user, defaults to maximumEmoteLimit.
	 * @param {Number} config[].duplicateEmoteLimit The number of duplicate emotes permitted for a single message.
	 * @param {Number} config[].duplicateEmoteLimit_pleb The number of duplicate emotes permitted for a single message from an unsubscribed user, defaults to duplicateEmoteLimit.
	 * @param {Number} config[].gifAPI Define the URL of your own GIF parsing server.
	 */
	constructor(config = {}) {
		const default_configuration = {
			duplicateEmoteLimit: 1,
			duplicateEmoteLimit_pleb: null,
			maximumEmoteLimit: 5,
			maximumEmoteLimit_pleb: null,
			gifAPI: "https://gif-emotes.opl.io",
		}

		this.config = Object.assign(default_configuration, config);

		if (this.config.maximumEmoteLimit_pleb === null) {
			this.config.maximumEmoteLimit_pleb = this.config.maximumEmoteLimit;
		}
		if (this.config.duplicateEmoteLimit_pleb === null) {
			this.config.duplicateEmoteLimit_pleb = this.config.duplicateEmoteLimit;
		}

		if (!this.config.channels) this.config.channels = ['moonmoon'];

		this.emotes = {};
		this.bttvEmotes = {};
		this.emoteMaterials = {};
		this.listeners = [];

		this.client = new tmi.Client({
			options: { debug: false },
			connection: {
				reconnect: true,
				secure: true
			},
			channels: this.config.channels
		});

		this.fetchBTTVEmotes();

		this.client.addListener('message', this.handleChat.bind(this));
		this.client.connect();
	}

	on(event, callback) {
		this.listeners.push(callback);
	}

	dispatch(e) {
		for (let index = 0; index < this.listeners.length; index++) {
			this.listeners[index](e);
		}
	}

	fetchBTTVEmotes() {
		for (let index = 0; index < this.config.channels.length; index++) {
			const channel = this.config.channels[index].replace('#', '');
			fetch(`${this.config.gifAPI}/channel/username/${channel}.js`)
				.then(json => json.json())
				.then(data => {
					if (!data.error && data !== 404) {
						for (let index = 0; index < data.length; index++) {
							const emote = data[index];
							this.bttvEmotes[emote.code] = emote.id;
						}
					}
				})
		}
	}

	handleChat(channel, user, message, self) {
		this.getEmoteArrayFromMessage(message, user.emotes, user.badges ? !!user.badges.subscriber : false);
	}

	getEmoteArrayFromMessage(text, emotes, subscriber) {
		const output = new Array();
		const stringArr = text.split(' ');
		let counter = 0;
		const emoteCache = {};
		for (let index = 0; index < stringArr.length; index++) {
			const string = stringArr[index];
			if (!emoteCache[string] || emoteCache[string] < subscriber ? this.config.duplicateEmoteLimit : this.config.duplicateEmoteLimit_pleb) {
				if (emotes !== null) {
					for (let i in emotes) {
						for (let index = 0; index < emotes[i].length; index++) {
							const arr = emotes[i][index].split('-');
							if (parseInt(arr[0]) === counter) {
								output.push({
									material: this.drawEmote('https://static-cdn.jtvnw.net/emoticons/v1/' + i + '/3.0'),
									id: i,
									sprite: undefined,
								});
								if (!emoteCache[string]) emoteCache[string] = 0;
								emoteCache[string]++;
								break;
							}
						}
					}
				}
				const bttvOutput = this.checkIfBTTVEmote(string);

				if (bttvOutput !== false) {
					output.push({
						material: bttvOutput,
						id: string,
						sprite: undefined,
					});
					if (!emoteCache[string]) emoteCache[string] = 0;
					emoteCache[string]++;
				}
			}
			counter += string.length + 1;
		}

		if (output.length > 0) {
			this.dispatch({
				progress: 0,
				x: Math.random(),
				y: Math.random(),
				emotes: this.config.maximumEmoteLimit ? output.splice(0, this.config.maximumEmoteLimit) : output,
			});
		}
	}

	checkIfBTTVEmote(string) {
		if (this.bttvEmotes[string] && !this.emotes[string]) {
			return this.drawEmote(this.bttvEmotes[string]);
		}
		return false;
	}

	drawEmote(url) {
		if (!this.emoteMaterials[url]) {
			const gif = new GIF(url, {gifAPI: this.config.gifAPI});
			this.emoteMaterials[url] = gif;
		}
		return this.emoteMaterials[url];
	}
}

export default Chat;