import fs from "fs";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

const DATA_FILE = "./peak-count.json";
const STARTING_COUNT = 77;
const TARGET_NAME = "dionmisty";

export const peakCountCommand = new SlashCommandBuilder()
  .setName("peakcount")
  .setDescription("Show how many times Dionmisty has said peak");

function loadCount() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      return Number.isFinite(data.count) ? data.count : STARTING_COUNT;
    }
  } catch (error) {
    console.error("❌ Failed loading peak count:", error);
  }
  return STARTING_COUNT;
}

function saveCount(count) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ count }, null, 2));
}

function isDionmisty(user) {
  return [
    user.username,
    user.globalName,
    user.displayName,
    user.tag?.split("#")[0],
  ]
    .filter(Boolean)
    .some(name => name.toLowerCase() === TARGET_NAME);
}

export function countPeakMessage(message) {
  if (message.author.bot || !isDionmisty(message.author)) return false;

  // Match "peak" as a complete word, including punctuation such as "peak!".
  const peakMatches = message.content.match(/\bpeak\b/gi);
  if (!peakMatches?.length) return false;

  const count = loadCount() + peakMatches.length;
  saveCount(count);
  console.log(`📈 Dionmisty said "peak" ${peakMatches.length} time(s). Total: ${count}`);
  return true;
}

export async function handlePeakCountCommand(interaction) {
  if (!interaction.isChatInputCommand()) return false;
  if (interaction.commandName !== "peakcount") return false;

  const count = loadCount();
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📈 Peak Counter")
    .setDescription(`Dionmisty has said **peak** **${count}** times.`)
    .setFooter({ text: `Counting started at ${STARTING_COUNT}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
  return true;
}