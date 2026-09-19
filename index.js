import "dotenv/config";

import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
} from "discord.js";

import fs from "fs";
import http from "http";

// ============================================================
// IMPORTS
// ============================================================

import {
  handleTaskCommand,
  sendTaskReminders,
  startTaskReminderSystem,
} from "./tasks.js";
import { handleLogCommand } from "./logs.js";
import { setupDiscordLogs } from "./discordlogs.js";
import { setupSuggestionReactions } from "./suggest2.js";

import {
  handleReminderCommand,
  startReminderSystem,
} from "./reminders.js";

import { setupLevels } from "./levels.js";
import { handleLevelCommand } from "./levelcommands.js";

import {
  handleStickyCommand,
  setupSticky,
} from "./sticky.js";

import {
  handleKnowledgeCommand,
} from "./knowledgecommands.js";

import {
  handleKnowledgeMessage,
} from "./knowledgehandler.js";
import {
  handleChatbotCommand,
} from "./chatbot.js";
import {
  countPeakMessage,
  handlePeakCountCommand,
} from "./peakcount.js";

import { handleStaffCommand } from "./staffsystem.js";
import { handlePromotionCommand } from "./promotions.js";
import { handleInfractionCommand } from "./infractions.js";
import {
    startCounting,
    handleCountingMessage,
} from "./counting.js";
import { handleWelcomeMember } from "./welcome.js";
import { handleAIHelpMessage } from "./aihelp.js";
// ============================================================
// APPLICATION SYSTEM
// ============================================================

import {
  startApplication,
  handleApplicationCommand,
  handleApplicationButton,
  handleApplicationInteraction,
  handleApplicationMessage,
} from "./applications.js";


// ============================================================
// CONFIG
// ============================================================

const token =
  process.env.DISCORD_TOKEN;

if (!token) {
  console.error(
    "❌ DISCORD_TOKEN is not set."
  );

  process.exit(1);
}


// ============================================================
// SUGGESTIONS
// ============================================================

const UPVOTE_EMOJI = "👍";
const DOWNVOTE_EMOJI = "👎";
const BUG_REPORT_CHANNEL_ID = "1457471626554904659";

const THRESHOLD_PCT = 0.10;

const DATA_FILE =
  "suggestions.json";


// ============================================================
// SUGGESTION DATA
// ============================================================

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(
        fs.readFileSync(
          DATA_FILE,
          "utf8"
        )
      );
    }
  } catch (error) {
    console.error(
      "❌ Failed to load suggestion data:",
      error
    );
  }

  return {
    forwarded: [],
    counter: 0,
    suggestions: {},
  };
}


function saveData(data) {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        data,
        null,
        2
      )
    );
  } catch (error) {
    console.error(
      "❌ Failed to save suggestion data:",
      error
    );
  }
}


// ============================================================
// SUGGESTION HELPERS
// ============================================================

function progressBar(
  current,
  needed,
  length = 10
) {
  const pct =
    needed > 0
      ? Math.min(
          current / needed,
          1
        )
      : 0;

  const filled =
    Math.round(
      pct * length
    );

  return (
    "🟩".repeat(filled) +
    "⬛".repeat(
      length - filled
    )
  );
}


function threshold(guild) {
  return Math.max(
    1,
    Math.ceil(
      guild.memberCount *
        THRESHOLD_PCT
    )
  );
}


function buildSuggestionEmbed(opts) {
  const {
    number,
    text,
    authorTag,
    avatarURL,
    upvotes,
    downvotes,
    needed,
    approved,
  } = opts;

  const net =
    upvotes - downvotes;

  const bar =
    progressBar(
      Math.max(net, 0),
      needed
    );

  const pct =
    needed > 0
      ? Math.min(
          Math.round(
            (Math.max(
              net,
              0
            ) /
              needed) *
              100
          ),
          100
        )
      : 0;

  const statusLine =
    approved
      ? "✅ **Approved** — added to the suggestion center!"
      : `⏳ **Pending** — needs ${needed} upvotes (10% of server)`;

  return new EmbedBuilder()
    .setColor(
      approved
        ? 0x57f287
        : 0xfee75c
    )
    .setAuthor({
      name:
        `${authorTag} · Suggestion #${number}`,
      iconURL: avatarURL,
    })
    .setDescription(
      `> ${text}`
    )
    .addFields(
      {
        name: "Votes",
        value:
          `${UPVOTE_EMOJI} **${upvotes}** upvotes  · ` +
          `${DOWNVOTE_EMOJI} **${downvotes}** downvotes`,
      },
      {
        name:
          `Progress ${pct}%`,
        value:
          `\`${bar}\` **${Math.max(net, 0)}** / **${needed}** net upvotes needed`,
      },
      {
        name: "Status",
        value: statusLine,
      }
    )
    .setFooter({
      text:
        `Suggestion #${number} · React with 👍 or 👎 to vote`,
    })
    .setTimestamp();
}


function buildApprovedEmbed(opts) {
  const {
    number,
    text,
    authorId,
    authorTag,
    avatarURL,
    upvotes,
    downvotes,
    msgUrl,
  } = opts;

  return new EmbedBuilder()
    .setColor(0x57f287)
    .setAuthor({
      name:
        `${authorTag} · Suggestion #${number}`,
      iconURL: avatarURL,
    })
    .setDescription(
      `> ${text}`
    )
    .addFields(
      {
        name: "Final Votes",
        value:
          `${UPVOTE_EMOJI} **${upvotes}** upvotes  · ` +
          `${DOWNVOTE_EMOJI} **${downvotes}** downvotes`,
      },
      {
        name: "Submitted by",
        value:
          `<@${authorId}>`,
        inline: true,
      },
      {
        name: "Original",
        value:
          `[Jump to suggestion](${msgUrl})`,
        inline: true,
      }
    )
    .setFooter({
      text:
        "This suggestion reached 10% server upvotes and has been queued for the game!",
    })
    .setTimestamp();
}


// ============================================================
// CLIENT
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],

  partials: [
    Partials.Message,
    Partials.Reaction,
    Partials.Channel,
  ],
});

// ============================================================
// HEALTHCHECK
// Start before Discord systems so deployment checks never race
// against the slower bot initialization.
// ============================================================

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });

  res.end(JSON.stringify({
    status: "online",
    bot: client.user?.tag || "connecting...",
    uptime: Math.floor(process.uptime()),
  }));
});

server.on("error", error => {
  if (error.code === "EADDRINUSE") {
    console.warn(
      `⚠️ Healthcheck port ${PORT} is already in use; continuing without a second server.`
    );
    return;
  }

  console.error("❌ Healthcheck server error:", error);
});

server.listen(PORT, () => {
  console.log(`🌐 Healthcheck server listening on port ${PORT}`);
});


// ============================================================
// READY
// ============================================================

client.once(
  "clientReady",
  () => {
    console.log(
      `✅ Logged in as ${client.user.tag}`
    );

    console.log(
      "🚀 Redwood City bot is online!"
    );

    console.log(
      "📋 Application system ready."
    );
  }
);


// ============================================================
// INTERACTIONS
// ============================================================

client.on(
  "interactionCreate",
  async interaction => {

    try {

      // ======================================================
      // BUTTONS
      // ======================================================

      if (
        interaction.isButton()
      ) {

        // APPLICATION START
        if (
          interaction.customId.startsWith(
            "application_start_"
          )
        ) {

          await handleApplicationButton(
            interaction
          );

          return;
        }


        // APPLICATION ACCEPT
        if (
          interaction.customId.startsWith(
            "application_accept_"
          )
        ) {

          await handleApplicationInteraction(
            interaction
          );

          return;
        }


        // APPLICATION DENY
        if (
          interaction.customId.startsWith(
            "application_deny_"
          )
        ) {

          await handleApplicationInteraction(
            interaction
          );

          return;
        }


        // Other buttons
        return;
      }
      if (interaction.commandName === "startcounting") {
          startCounting(interaction.channel.id);

          await interaction.reply(
              "🔢 **Counting has started!**\nThe next number is **1**."
          );

          return;
      }


      // ======================================================
      // CHAT INPUT
      // ======================================================

      if (
        !interaction.isChatInputCommand()
      ) {
        return;
      }


      // ======================================================
      // APPLY
      // ======================================================

      if (
        interaction.commandName ===
        "apply"
      ) {

        await handleApplicationCommand(
          interaction
        );

        return;
      }

      // ======================================================
      // AI CHATBOT
      // ======================================================

      if (
        interaction.commandName === "chatbot" ||
        interaction.commandName === "chatbot-sync"
      ) {
        await handleChatbotCommand(interaction);
        return;
      }

      // ======================================================
      // PEAK COUNTER
      // ======================================================

      if (interaction.commandName === "peakcount") {
        await handlePeakCountCommand(interaction);
        return;
      }

      // ======================================================
      // TASK REMINDERS
      // ======================================================

      if (interaction.commandName === "task-reminders") {
        await interaction.deferReply({ ephemeral: true });
        const count = await sendTaskReminders(
          interaction.client,
          interaction.guildId,
          true
        );
        await interaction.editReply(
          count
            ? `⏰ Sent reminders for **${count} unfinished task(s)**. Each reminder included the task ID and description.`
            : "✅ There are no unfinished tasks to remind users about."
        );
        return;
      }


      // ======================================================
      // EXISTING SYSTEMS
      // ======================================================

      await handleTaskCommand(
        interaction
      );

      await handleLogCommand(
        interaction
      );

      await handleReminderCommand(
        interaction
      );

      await handleLevelCommand(
        interaction
      );

      await handleStickyCommand(
        interaction
      );

      await handleStaffCommand(
        interaction
      );

      await handlePromotionCommand(
        interaction
      );

      await handleInfractionCommand(
        interaction
      );


      // ======================================================
      // KNOWLEDGE
      // ======================================================

      if (
        interaction.commandName ===
        "knowledge"
      ) {

        await handleKnowledgeCommand(
          interaction
        );

        return;
      }


      // ======================================================
      // SUGGEST
      // ======================================================

      if (
        interaction.commandName ===
        "suggest"
      ) {

        const text =
          interaction.options.getString(
            "suggestion"
          );

        if (!text) {
          await interaction.reply({
            content:
              "❌ Please provide a suggestion.",
            ephemeral: true,
          });

          return;
        }

        const channelId =
          process.env.SUGGESTIONS_CHANNEL ||
          "1446928004700704789";

        const channel =
          interaction.guild?.channels.cache.get(
            channelId
          );

        if (!channel) {
          await interaction.reply({
            content:
              `❌ Suggestions channel <#${channelId}> was not found.`,
            ephemeral: true,
          });

          return;
        }

        const data =
          loadData();

        data.counter =
          (data.counter || 0) + 1;

        const number =
          data.counter;

        const needed =
          threshold(
            interaction.guild
          );

        const user =
          interaction.user;

        const embed =
          buildSuggestionEmbed({
            number,
            text,
            authorTag:
              user.tag,
            avatarURL:
              user.displayAvatarURL(),
            upvotes: 0,
            downvotes: 0,
            needed,
            approved: false,
          });

        const msg =
          await channel.send({
            embeds: [embed],
          });

        await msg.react(
          UPVOTE_EMOJI
        );

        await msg.react(
          DOWNVOTE_EMOJI
        );

        let thread = null;

        try {
          thread =
            await msg.startThread({
              name:
                `💬 Suggestion #${number} — Discussion`,
              autoArchiveDuration:
                1440,
              reason:
                `Discussion for suggestion #${number}`,
            });

          await thread.send({
            embeds: [
              new EmbedBuilder()
                .setColor(
                  0x5865f2
                )
                .setDescription(
                  `👋 **Welcome to the discussion for Suggestion #${number}!**\n\n` +
                  `> ${text}\n\n` +
                  `Share your thoughts, ideas, or feedback here.`
                )
                .setFooter({
                  text:
                    `Suggested by ${user.tag}`,
                }),
            ],
          });

        } catch (error) {
          console.warn(
            "⚠️ Could not create suggestion thread:",
            error.message
          );
        }

        data.suggestions =
          data.suggestions || {};

        data.suggestions[
          msg.id
        ] = {
          number,
          text,
          authorId:
            user.id,
          authorTag:
            user.tag,
          avatarURL:
            user.displayAvatarURL(),
          threadId:
            thread?.id || null,
        };

        saveData(data);

        await interaction.reply({
          content:
            `✅ Suggestion **#${number}** posted in <#${channel.id}>!`,
          ephemeral: true,
        });

        console.log(
          `📝 Suggestion #${number} created by ${user.tag}`
        );

        return;
      }


      // ======================================================
      // DELETE SUGGESTION
      // ======================================================

      if (
        interaction.commandName ===
        "suggestion-delete"
      ) {

        const targetNumber =
          interaction.options.getInteger(
            "number"
          );

        const data =
          loadData();

        const entry =
          Object.entries(
            data.suggestions || {}
          ).find(
            ([, meta]) =>
              meta.number ===
                targetNumber &&
              meta.authorId ===
                interaction.user.id
          );

        if (!entry) {
          await interaction.reply({
            content:
              `❌ No suggestion **#${targetNumber}** found that belongs to you.`,
            ephemeral: true,
          });

          return;
        }

        const messageId =
          entry[0];

        const channelId =
          process.env.SUGGESTIONS_CHANNEL ||
          "1446928004700704789";

        const channel =
          interaction.guild?.channels.cache.get(
            channelId
          );

        if (channel) {
          try {
            const msg =
              await channel.messages.fetch(
                messageId
              );

            await msg.delete();
          } catch {
            // Already deleted.
          }
        }

        delete data.suggestions[
          messageId
        ];

        data.forwarded =
          (data.forwarded || [])
            .filter(
              id =>
                id !== messageId
            );

        saveData(data);

        await interaction.reply({
          content:
            `🗑️ Suggestion **#${targetNumber}** has been deleted.`,
          ephemeral: true,
        });

        return;
      }

    } catch (error) {

      console.error(
        "❌ Interaction error:",
        error
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ Something went wrong while processing this interaction.",
          ephemeral: true,
        }).catch(() => {});
      }
    }
  }
);


// ============================================================
// SUGGESTION REACTIONS
// ============================================================

async function handleReaction(
  reaction,
  user
) {

  try {

    if (reaction.partial) {
      await reaction.fetch();
    }

    if (
      reaction.message.partial
    ) {
      await reaction.message.fetch();
    }

  } catch (error) {

    console.error(
      "❌ Failed to fetch reaction:",
      error
    );

    return;
  }

  if (user.bot) {
    return;
  }

  const {
    emoji,
    message,
  } = reaction;

  if (
    emoji.name !==
      UPVOTE_EMOJI &&
    emoji.name !==
      DOWNVOTE_EMOJI
  ) {
    return;
  }

  const channelId =
    process.env.SUGGESTIONS_CHANNEL ||
    "1446928004700704789";

  if (
    message.channel.id !==
    channelId
  ) {
    return;
  }

  const data =
    loadData();

  const meta =
    data.suggestions?.[
      message.id
    ];

  if (!meta) {
    return;
  }

  const upvoteReaction =
    message.reactions.cache.get(
      UPVOTE_EMOJI
    );

  const downvoteReaction =
    message.reactions.cache.get(
      DOWNVOTE_EMOJI
    );

  const upvotes =
    Math.max(
      0,
      (upvoteReaction?.count || 1) - 1
    );

  const downvotes =
    Math.max(
      0,
      (downvoteReaction?.count || 1) - 1
    );

  const net =
    upvotes - downvotes;

  const needed =
    threshold(
      message.guild
    );

  const approved =
    net >= needed;

  const embed =
    buildSuggestionEmbed({
      ...meta,
      upvotes,
      downvotes,
      needed,
      approved,
    });

  await message.edit({
    embeds: [embed],
  }).catch(() => {});

  if (!approved) {
    return;
  }

  if (
    (data.forwarded || [])
      .includes(message.id)
  ) {
    return;
  }

  const centerName =
    process.env.SUGGESTION_CENTER_CHANNEL ||
    "suggestion-center";

  const centerChannel =
    message.guild.channels.cache.find(
      channel =>
        channel.name ===
        centerName
    );

  if (!centerChannel) {
    console.warn(
      `⚠️ Channel #${centerName} not found`
    );

    return;
  }

  const approvedEmbed =
    buildApprovedEmbed({
      ...meta,
      upvotes,
      downvotes,
      needed,
      msgUrl:
        message.url,
    });

  await centerChannel.send({
    embeds: [
      approvedEmbed,
    ],
  });

  data.forwarded =
    data.forwarded || [];

  data.forwarded.push(
    message.id
  );

  saveData(data);

  console.log(
    `🏆 Suggestion #${meta.number} approved`
  );
}

client.on(
  "messageReactionAdd",
  handleReaction
);

client.on(
  "messageReactionRemove",
  handleReaction
);


// ============================================================
// BUG REPORT REACTIONS
// ============================================================

client.on(
  "messageCreate",
  async message => {
    // Only add voting reactions in the dedicated bug-report channel.
    // Ignore bot messages so bots cannot trigger a reaction loop.
    if (
      message.channel.id !== BUG_REPORT_CHANNEL_ID ||
      message.author.bot
    ) {
      return;
    }

    try {
      await message.react(UPVOTE_EMOJI);
      await message.react(DOWNVOTE_EMOJI);

      console.log(
        `🐛 Added bug report reactions to message ${message.id}`
      );
    } catch (error) {
      console.error(
        `❌ Could not add bug report reactions to ${message.id}:`,
        error.message
      );
    }
  }
);


// ============================================================
// MESSAGE CREATE
// ============================================================

client.on(
  "messageCreate",
  async message => {

    try {
      await handleAIHelpMessage(message);
    } catch (error) {
      console.error(
          "❌ AI help handler error:",
          error
      );
    }
    // COUNTING
    try {
      await handleCountingMessage(message);
    } catch (error) {
      console.error("❌ Counting system error:", error);
    }
    // PEAK COUNTER
    try {
      countPeakMessage(message);
    } catch (error) {
      console.error(
        "❌ Peak counter error:",
        error
      );
    }

    // APPLICATION DMs
    try {
      await handleApplicationMessage(
        message
      );
    } catch (error) {
      console.error(
        "❌ Application message error:",
        error
      );
    }

    // KNOWLEDGE
    try {
      await handleKnowledgeMessage(
        message
      );
    } catch (error) {
      console.error(
        "❌ Knowledge handler error:",
        error
      );
    }
  }
);


client.on("guildMemberAdd", async (member) => {
    await handleWelcomeMember(member);
});

// ============================================================
// START SYSTEMS
// ============================================================

try {

  startReminderSystem(
    client
  );

  setupDiscordLogs(
    client
  );

  setupSuggestionReactions(
    client
  );

  setupLevels(
    client
  );

  setupSticky(
    client
  );

  startApplication(
    client
  );

  startTaskReminderSystem(
    client
  );

} catch (error) {

  console.error(
    "❌ Failed to start a bot system:",
    error
  );
}


// ============================================================
// LOGIN
// ============================================================

client.login(token)
  .then(() => {
    console.log(
      "🔐 Discord login successful."
    );
  })
  .catch(error => {
    console.error(
      "❌ Discord login failed:",
      error
    );

    process.exit(1);
  });


// ============================================================
// SHUTDOWN
// ============================================================

process.on(
  "SIGTERM",
  () => {
    console.log(
      "⚠️ Received SIGTERM."
    );
  }
);

process.on(
  "SIGINT",
  () => {
    console.log(
      "⚠️ Received SIGINT."
    );
  }
);