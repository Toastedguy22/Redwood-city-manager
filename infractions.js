import fs from "fs";
import { EmbedBuilder } from "discord.js";

const FILE = "./infractions.json";
const STAFF_ROLE = "1532146862004371707";

function loadData() {
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({}, null, 2));
  }

  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export async function handleInfractionCommand(interaction) {

  if (interaction.commandName !== "infraction") return;

  if (!interaction.member.roles.cache.has(STAFF_ROLE)) {
    return interaction.reply({
      content: "❌ You don't have permission.",
      ephemeral: true
    });
  }

  const user = interaction.options.getUser("user");
  const type = interaction.options.getString("type");
  const reason = interaction.options.getString("reason");

  const data = loadData();

  if (!data[user.id]) {
    data[user.id] = [];
  }

  data[user.id].push({
    type,
    reason,
    moderator: interaction.user.tag,
    date: new Date().toISOString()
  });

  saveData(data);

  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle("⚠️ Staff Infraction")
    .addFields(
      {
        name: "User",
        value: `<@${user.id}>`,
        inline: true
      },
      {
        name: "Type",
        value: type,
        inline: true
      },
      {
        name: "Moderator",
        value: interaction.user.tag,
        inline: true
      },
      {
        name: "Reason",
        value: reason
      }
    )
    .setTimestamp();

  await interaction.reply({
    embeds: [embed]
  });
}