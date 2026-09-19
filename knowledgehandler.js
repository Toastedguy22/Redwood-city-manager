import { EmbedBuilder } from "discord.js";
import { searchKnowledge } from "./knowledge.js";


const cooldowns = new Map();


export async function handleKnowledgeMessage(message) {

  // Ignore bots
  if (message.author.bot) return;


  // Only work in ticket channels
  if (!message.channel.name.includes("ticket")) {
    return;
  }


  // Cooldown per channel
  const now = Date.now();

  const last = cooldowns.get(message.channel.id);

  if (last && now - last < 10000) {
    return;
  }


  const article = searchKnowledge(
    message.content
  );


  if (!article) return;


  cooldowns.set(
    message.channel.id,
    now
  );


  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📚 ${article.title}`)
    .setDescription(article.content)
    .setFooter({
      text: "AI Support • Knowledge Base"
    })
    .setTimestamp();


  await message.reply({
    embeds: [embed]
  });

}