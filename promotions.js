import fs from "fs";
import { EmbedBuilder } from "discord.js";

const FILE = "./promotions.json";

// Rollen som får använda kommandot
const STAFF_ROLE = "1532146862004371707";

function loadData() {
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({}));
  }

  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export async function handlePromotionCommand(interaction) {

  if (interaction.commandName !== "promote") return;

  // Permission check
  if (!interaction.member.roles.cache.has(STAFF_ROLE)) {
    return interaction.reply({
      content: "❌ You don't have permission to use this command.",
      ephemeral: true
    });
  }

  const user = interaction.options.getUser("user");
  const rank = interaction.options.getString("rank");
  const reason = interaction.options.getString("reason");

  const data = loadData();

  if (!data[user.id]) {
    data[user.id] = [];
  }

  data[user.id].push({
    rank,
    reason,
    moderator: interaction.user.tag,
    date: new Date().toISOString()
  });

  saveData(data);

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle("📈 Promotion Logged")
    .addFields(
      {
        name: "User",
        value: `<@${user.id}>`,
        inline: true
      },
      {
        name: "New Rank",
        value: rank,
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