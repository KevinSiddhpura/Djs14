# Djs14

## Prerequisites
- Node.js v20+
## Features
- Efficient command and event handling tailored for Discord.js v14.
- **Addon System**: Load, enable, disable, and manage plugins dynamically
- **Admin Management**: Addon manager command for admin control
## Included Commands
- Slash: `/help`, `/ping`, `/server`, `/ui`, `/feedback`, `/eval` (dev only)
- Admin: `/addon-manager` (manage addons)
## Builder API
Use the built-in builders from `src/lib/builders`:

```js
const { CreateMessage, CreateEmbed, CreateComponents, CreateModal } = require("../src/lib/builders");

const embed = new CreateEmbed()
	.title("Hello")
	.description("Fluent message API")
	.timestamp()
	.build();

await new CreateMessage({
	content: "Example response",
	embeds: [
		embed,
		{ title: "Or plain object embeds", description: "Fast and IDE friendly" }
	],
	components: [[
		CreateComponents.button({ customId: "example:click", label: "Click Me" })
	]],
}).send(interaction);
```

`CreateMessage` supports content, embeds, components, files, allowed mentions, and context-aware sending (`reply`, `followUp`, or `send`).
`CreateComponents` supports button + all select menu builders, and `CreateModal` supports modal creation with Discord's label-component model.

Constructor payload style is fully supported:

```js
new CreateMessage({
	content: "Xyz",
	embeds: [{ title: "Sample" }],
	components: [[CreateComponents.button({ customId: "demo", label: "Demo" })]],
	attachments: [],
	files: [],
	ephemeral: true,
});
```

Modal example:

```js
const modal = new CreateModal(`feedback:submit:${interaction.user.id}`, "Feedback")
	.textInput({
		customId: "topic",
		label: "Topic",
		style: TextInputStyle.Short,
		minLength: 3,
		maxLength: 80,
	})
	.textInput({
		customId: "details",
		label: "Details",
		style: TextInputStyle.Paragraph,
		minLength: 10,
		maxLength: 1000,
	});

await modal.show(interaction);
```

2. Clone the repository:
```
git clone https://github.com/KevinSidd/Djs14.git
```
3. Navigate to the bot directory and install dependencies:
```
npm i
```
4. Copy `example.env` to `.env` and set `DISCORD_TOKEN`.
5. Copy `src/example.config.js` to `src/config.js` and update values.
6. To start the bot
```
node src/index.js
```
- Alternative
```
npm start
```
- Development mode (uses local guild registration when `commandRegistration.scope` is `auto`):
```
npm run dev
```

## Configuration
- Store the bot token in a `.env` file.
- Configure bot settings in `src/config.js`:
- `dev_guild`: guild ID for dev command registration.
- `devs`: developer user IDs for dev-only commands.
- `clientIntents`: keep minimal intents by default.
- `commandRegistration.scope`: `auto`, `guild`, or `global`.

## Resources
- [Discord.js Guide](https://discordjs.guide/#before-you-begin)
- [Discord.js Documentation](https://discord.js.org/docs/packages/discord.js/main)
- [Better-Sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md)

## Acknowledgments
This project is a continuous effort. I will appreciate your feedbacks.
