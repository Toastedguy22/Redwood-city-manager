# Redwood City Discord Bot

A Discord.js bot with suggestions, counting, applications, reminders, tasks,
levels, knowledge replies, chatbot support, logging, and other server tools.

## Run on GitHub or any Node.js host

### Requirements

- Node.js 20 or newer
- A Discord application with a bot token
- The `bot` and `applications.commands` scopes when inviting the bot
- Discord intents enabled in the Developer Portal:
  - Server Members Intent, if using welcome/member features
  - Message Content Intent

### Setup

```bash
git clone <your-repository-url>
cd <your-repository-folder>
npm install
cp .env.example .env
```

Open `.env` and add the values from your hosting provider or Discord Developer
Portal. Never commit `.env`; it is ignored by Git.

Register the slash commands:

```bash
npm run register
```

Start the bot:

```bash
npm start
```

The HTTP healthcheck listens on `PORT` and defaults to `3000`.

## Environment variables

Required:

- `DISCORD_TOKEN` — Discord bot token
- `DISCORD_CLIENT_ID` — Discord application ID

Optional:

- `DISCORD_GUILD_ID` — server ID for instant command registration; if blank,
  commands are registered globally
- `OPENROUTER_API_KEY` — enables the OpenRouter-powered chatbot
- `OPENROUTER_MODEL` — optional OpenRouter model override
- `OPENROUTER_SITE_URL` — optional OpenRouter request metadata
- `PORT` — healthcheck port, defaults to `3000`
- `SUGGESTIONS_CHANNEL` — configured suggestions channel ID
- `SUGGESTION_CENTER_CHANNEL` — suggestion center channel name
- `SESSION_SECRET` — retained for compatibility with the original deployment

## Main commands

- `/suggest` — submit a suggestion
- `/suggestion-delete` — delete one of your suggestions
- `/startcounting` — start counting in the current channel
- `/apply` — begin an application
- `/assign`, `/tasks`, `/mytasks`, `/done` — manage tasks
- `/task-reminders` — send unfinished-task reminders
- `/chatbot` and `/chatbot-sync` — chatbot features
- `/peakcount` — view the peak counter

## Counting

Run `/startcount` in the channel that should be used for counting. Members
must send the next whole number in sequence. The bot reacts with ✅ for a
correct number and ❌ for an incorrect number. A wrong number, or counting
twice in a row, resets the channel to 1.

## Checks

Run the syntax checks without connecting to Discord:

```bash
npm run check
```

## Moving from Replit

This repository contains the application source and persisted JSON data. The
export does not include `.env`, `node_modules`, Replit metadata, or generated
ZIP files. Add the environment variables through GitHub Actions secrets or
your hosting provider's environment-variable settings.