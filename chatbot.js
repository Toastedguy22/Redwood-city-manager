import fs from "fs";
import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

const KNOWLEDGE_FILE = "./chatbot-knowledge.json";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const MAX_MESSAGES_PER_CHANNEL = 250;
const MAX_CONTEXT_CHARS = 30000;

export const chatbotCommand = new SlashCommandBuilder()
  .setName("chatbot")
  .setDescription("Ask the AI about the server rules and information")
  .addStringOption(option =>
    option
      .setName("question")
      .setDescription("Your question about the server")
      .setRequired(true)
      .setMaxLength(1000)
  );

export const chatbotSyncCommand = new SlashCommandBuilder()
  .setName("chatbot-sync")
  .setDescription("Index the server rules and information channels")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption(option =>
    option
      .setName("channel")
      .setDescription("Optional: sync one specific text channel")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  );

function loadIndex() {
  try {
    if (fs.existsSync(KNOWLEDGE_FILE)) {
      const data = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, "utf8"));
      return data && typeof data === "object" ? data : { guilds: {} };
    }
  } catch (error) {
    console.error("❌ Failed loading chatbot knowledge:", error);
  }
  return { guilds: {} };
}

function saveIndex(data) {
  fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(data, null, 2));
}

async function fetchChannelMessages(channel) {
  const messages = [];
  let before;

  while (messages.length < MAX_MESSAGES_PER_CHANNEL) {
    const batch = await channel.messages.fetch({
      limit: Math.min(100, MAX_MESSAGES_PER_CHANNEL - messages.length),
      ...(before ? { before } : {}),
    });

    if (batch.size === 0) break;
    messages.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }

  return messages
    .filter(message => !message.author.bot && message.content?.trim())
    .map(message => ({
      channelId: channel.id,
      channelName: channel.name,
      messageId: message.id,
      content: message.content.trim(),
      url: message.url,
      createdAt: message.createdTimestamp,
    }))
    .reverse();
}

export async function syncChatbotKnowledge(guild, targetChannel = null) {
  const channels = targetChannel
    ? [targetChannel]
    : guild.channels.cache
        .filter(channel =>
          channel.type === ChannelType.GuildText
        )
        .map(channel => channel);

  const sources = [];
  for (const channel of channels) {
    try {
      sources.push(...await fetchChannelMessages(channel));
    } catch (error) {
      console.warn(`⚠️ Could not index #${channel.name}:`, error.message);
    }
  }

  const data = loadIndex();
  data.guilds[guild.id] = {
    guildName: guild.name,
    syncedAt: new Date().toISOString(),
    sources,
  };
  saveIndex(data);
  return { channelCount: channels.length, messageCount: sources.length };
}

function buildContext(guildId) {
  const index = loadIndex().guilds?.[guildId];
  if (!index?.sources?.length) return null;

  return { index, sources: index.sources };
}

function tokenize(text = "") {
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(word => word.length > 2)
  );
}

function rankSources(sources, question) {
  const questionWords = tokenize(question);
  const priorityChannel = /rule|info|faq|guide|handbook|welcome|announc|how[-_ ]?to|application/i;

  return sources
    .map((source, index) => {
      const sourceWords = tokenize(`${source.channelName} ${source.content}`);
      const overlap = [...questionWords].filter(word => sourceWords.has(word)).length;
      const priority = priorityChannel.test(source.channelName) ? 3 : 0;
      return { source, score: overlap * 4 + priority, index };
    })
    .sort((a, b) => b.score - a.score || b.source.createdAt - a.source.createdAt || a.index - b.index);
}

function buildRelevantContext(sources, question) {
  let used = 0;
  const lines = [];
  const ranked = rankSources(sources, question);

  for (const { source } of ranked) {
    const line = `[${source.channelName}] ${source.content}\nSource: ${source.url}`;
    if (used + line.length > MAX_CONTEXT_CHARS) break;
    lines.push(line);
    used += line.length;
  }

  return lines.join("\n\n");
}

async function askOpenRouter(question, context) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured.");

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://replit.com",
      "X-Title": "Redwood City Discord Support",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
      temperature: 0.15,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content:
            "You are the Redwood City server support assistant. Answer only from the provided server information. " +
            "Never invent rules, permissions, dates, links, or requirements. If the sources do not answer the question, " +
            "say that you could not find it and direct the user to staff. Be concise, clear, and friendly. " +
            "At the end, include a Sources line with the relevant Discord source links.",
        },
        {
          role: "user",
          content: `SERVER INFORMATION:\n${context}\n\nQUESTION:\n${question}`,
        },
      ],
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message || `OpenRouter returned HTTP ${response.status}`);
  }

  const answer = body?.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("The AI returned an empty answer.");
  return answer;
}

export async function handleChatbotCommand(interaction) {
  if (!interaction.isChatInputCommand()) return false;
  if (interaction.commandName !== "chatbot" && interaction.commandName !== "chatbot-sync") {
    return false;
  }

  if (interaction.commandName === "chatbot-sync") {
    const target = interaction.options.getChannel("channel");
    await interaction.deferReply({ ephemeral: true });
    try {
      const result = await syncChatbotKnowledge(interaction.guild, target);
      await interaction.editReply(
        `✅ Chatbot knowledge synced: **${result.messageCount} messages** from **${result.channelCount} channel(s)**.`
      );
    } catch (error) {
      console.error("❌ Chatbot sync error:", error);
      await interaction.editReply("❌ I could not sync the server information.");
    }
    return true;
  }

  const question = interaction.options.getString("question");
  const context = buildContext(interaction.guild.id);
  if (!context) {
    await interaction.reply({
      content: "❌ The server knowledge has not been synced yet. Ask an administrator to run `/chatbot-sync`.",
      ephemeral: true,
    });
    return true;
  }

  await interaction.deferReply();
  try {
    const answer = await askOpenRouter(
      question,
      buildRelevantContext(context.sources, question)
    );
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🤖 Redwood City Support")
      .setDescription(answer.slice(0, 4096))
      .setFooter({ text: `Server knowledge synced ${new Date(context.index.syncedAt).toLocaleString()}` })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("❌ Chatbot answer error:", error);
    await interaction.editReply(
      "❌ I couldn't generate an answer right now. Please ask a staff member or try again later."
    );
  }
  return true;
}