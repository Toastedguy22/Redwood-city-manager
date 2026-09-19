import fs from "fs";
import { EmbedBuilder } from "discord.js";

const FILE = "staffdata.json";
const STAFF_ROLE = "1486751968499073196";

function loadData() {
  if (!fs.existsSync(FILE)) {
    return {
      promotions: [],
      infractions: []
    };
  }

  return JSON.parse(fs.readFileSync(FILE));
}

function saveData(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export async function handleStaffCommand(interaction) {

  if (interaction.commandName !== "promote") return;

  if (!interaction.member.roles.cache.has(STAFF_ROLE)) {
    return interaction.reply({
      content: "❌ You don't have permission.",
      ephemeral: true
    });
  }

  const user = interaction.options.getUser("user");
  const rank = interaction.options.getString("rank");
  const reason = interaction.options.getString("reason");

  const data = loadData();

  data.promotions.push({
    user: user.id,
    rank,
    reason,
    moderator: interaction.user.id,
    date: Date.now()
  });

  saveData(data);

  const embed = new EmbedBuilder()
    .setColor("Green")
    .setTitle("🎉 Staff Promotion")
    .addFields(
      {
        name: "User",
        value: `<@${user.id}>`
      },
      {
        name: "New Rank",
        value: rank
      },
      {
        name: "Reason",
        value: reason
      },
      {
        name: "Promoted By",
        value: `<@${interaction.user.id}>`
      }
    )
    .setTimestamp();

  await interaction.reply({
    embeds: [embed]
  });

}