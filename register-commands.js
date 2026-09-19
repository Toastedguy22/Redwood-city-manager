import "dotenv/config";
import {
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { knowledgeCommand } from "./knowledgecommands.js";
import {
  chatbotCommand,
  chatbotSyncCommand,
} from "./chatbot.js";
import { peakCountCommand } from "./peakcount.js";
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error("❌ DISCORD_TOKEN and DISCORD_CLIENT_ID must be set.");
  process.exit(1);
}

const commands = [
  knowledgeCommand,
  chatbotCommand,
  chatbotSyncCommand,
  peakCountCommand,
  new SlashCommandBuilder()
  .setName("apply")
  .setDescription("Apply to join a Redwood City team")
  .addStringOption(option =>
    option
      .setName("type")
      .setDescription("Choose an application")
      .setRequired(true)
      .addChoices(
        {
          name: "Staff Team",
          value: "staff"
        },
        {
          name: "Development Team",
          value: "development"
        },
        {
          name: "Game Tester",
          value: "tester"
        }
      )
  ),
  
  new SlashCommandBuilder()
  .setName("infraction")
  .setDescription("Issue a staff infraction")

  .addUserOption(option =>
  option
  .setName("user")
  .setDescription("Staff member")
  .setRequired(true)
  )

  .addStringOption(option =>
  option
  .setName("type")
  .setDescription("Infraction type")
  .setRequired(true)
  .addChoices(
    { name: "Warning", value: "Warning" },
    { name: "Strike", value: "Strike" },
    { name: "Demotion", value: "Demotion" },
    { name: "Suspension", value: "Suspension" },
    { name: "Termination", value: "Termination" }
  )
  )

  .addStringOption(option =>
  option
  .setName("reason")
  .setDescription("Reason")
  .setRequired(true)
  ),
  new SlashCommandBuilder()
  .setName("promote")
  .setDescription("Promote a staff member")

  .addUserOption(option =>
  option
  .setName("user")
  .setDescription("Staff member")
  .setRequired(true)
  )

  .addStringOption(option =>
  option
  .setName("rank")
  .setDescription("New rank")
  .setRequired(true)
  )

  .addStringOption(option =>
  option
  .setName("reason")
  .setDescription("Reason")
  .setRequired(true)
  ),
  
  new SlashCommandBuilder()
  .setName("sticky")
  .setDescription("Manage sticky messages")

  .addSubcommand(sub =>
    sub
      .setName("set")
      .setDescription("Create a sticky message")
      .addChannelOption(option =>
        option
          .setName("channel")
          .setDescription("Channel")
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName("message")
          .setDescription("Sticky message")
          .setRequired(true)
      )
  )

  .addSubcommand(sub =>
    sub
      .setName("remove")
      .setDescription("Remove a sticky message")
      .addChannelOption(option =>
        option
          .setName("channel")
          .setDescription("Channel")
          .setRequired(true)
      )
  ),
  
  new SlashCommandBuilder()

  .setName("leaderboard")

  .setDescription("Show level leaderboard"),
  new SlashCommandBuilder()

  .setName("rank")

  .setDescription("Show level")

  .addUserOption(option =>
   option
   .setName("user")
   .setDescription("Check another user")
   .setRequired(false)
  ),
  new SlashCommandBuilder()
  .setName("remind")
  .setDescription("Create a reminder")

  .addUserOption(option =>
   option
   .setName("user")
   .setDescription("Who gets reminded")
   .setRequired(true)
  )

  .addStringOption(option =>
   option
   .setName("type")
   .setDescription("once or weekly")
   .addChoices(
     {
      name: "Once",
      value: "once"
     },
     {
      name: "Weekly",
      value: "weekly"
     }
   )
   .setRequired(true)
  )

  .addStringOption(option =>
   option
   .setName("time")
   .setDescription("Time (18:00)")
   .setRequired(true)
  )

  .addStringOption(option =>
   option
   .setName("message")
   .setDescription("Reminder text")
   .setRequired(true)
  )

  .addStringOption(option =>
   option
   .setName("day")
   .setDescription("Day for weekly reminders")
   .addChoices(
    {name:"Monday",value:"1"},
    {name:"Tuesday",value:"2"},
    {name:"Wednesday",value:"3"},
    {name:"Thursday",value:"4"},
    {name:"Friday",value:"5"},
    {name:"Saturday",value:"6"},
    {name:"Sunday",value:"0"}
   )
   .setRequired(false)
  ),
  new SlashCommandBuilder()
  .setName("newlog")
  .setDescription("Create a new log")
  .addStringOption(option =>
    option
      .setName("type")
      .setDescription("Log type")
      .setRequired(true)
      .addChoices(
        {
          name: "Warning",
          value: "warning"
        },
        {
          name: "Event",
          value: "event"
        },
        {
          name: "Ban",
          value: "ban"
        },
        {
          name: "Note",
          value: "note"
        }
      )
  )
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("User this log is about")
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("reason")
      .setDescription("What happened?")
      .setRequired(true)
  ),
  
  new SlashCommandBuilder()
  .setName("assign")
  .setDescription("Assign a task to a user")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("The user receiving the task")
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("task")
      .setDescription("Task description")
      .setRequired(true)
  ),

  new SlashCommandBuilder()
    .setName("done")
    .setDescription("Mark a task as completed")
    .addIntegerOption(option =>
      option
        .setName("number")
        .setDescription("The task ID number")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("tasks")
    .setDescription("Show all tasks"),

  new SlashCommandBuilder()
    .setName("mytasks")
    .setDescription("Show your assigned tasks"),

  new SlashCommandBuilder()
    .setName("task-reminders")
    .setDescription("Send reminders for all unfinished tasks")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Submit a suggestion for the game")
    .addStringOption(option =>
      option
        .setName("suggestion")
        .setDescription("Your suggestion")
        .setRequired(true)
        .setMaxLength(1000)
    ),

  new SlashCommandBuilder()
    .setName("suggestion-delete")
    .setDescription("Delete one of your own suggestions")
    .addIntegerOption(option =>
      option
        .setName("number")
        .setDescription("The suggestion number to delete")
        .setRequired(true)
        .setMinValue(1)
    ),

  new SlashCommandBuilder()
  .setName("startcounting")
  .setDescription("Start counting in this channel."),

].map(command => command.toJSON());


const rest = new REST({ version: "10" })
  .setToken(token);


async function register() {
  try {
    console.log("🔄 Registering slash commands...");

    if (guildId) {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        {
          body: commands
        }
      );

      console.log("✅ Guild commands registered instantly!");
    } else {
      await rest.put(
        Routes.applicationCommands(clientId),
        {
          body: commands
        }
      );

      console.log("✅ Global commands registered!");
    }

  } catch (error) {
    console.error("❌ Failed registering commands:");
    console.error(error);
  }
}

register();