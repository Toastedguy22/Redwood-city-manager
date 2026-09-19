import fs from "fs";
import { EmbedBuilder } from "discord.js";

const FILE = "sticky.json";

function loadSticky() {
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({}, null, 2));
  }

  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function saveSticky(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export async function handleStickyCommand(interaction) {

  if (interaction.commandName !== "sticky")
    return;

  const sub = interaction.options.getSubcommand();

  const data = loadSticky();

  // /sticky set
  if (sub === "set") {

    const channel = interaction.options.getChannel("channel");
    const message = interaction.options.getString("message");

    data[channel.id] = {
      message,
      lastMessage: null
    };

    saveSticky(data);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle("📌 Sticky Created")
          .setDescription(
            `Sticky message enabled in ${channel}`
          )
          .addFields({
            name: "Message",
            value: message
          })
          .setTimestamp()
      ],
      flags: 64
    });

  }

  // /sticky remove
  if (sub === "remove") {

    const channel = interaction.options.getChannel("channel");

    if (!data[channel.id]) {
      return interaction.reply({
        content: "❌ No sticky exists in that channel.",
        flags: 64
      });
    }

    try {

      if (data[channel.id].lastMessage) {

        const msg =
          await channel.messages.fetch(
            data[channel.id].lastMessage
          );

        await msg.delete().catch(() => {});

      }

    } catch {}

    delete data[channel.id];

    saveSticky(data);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle("🗑️ Sticky Removed")
          .setDescription(
            `Sticky removed from ${channel}`
          )
      ],
      flags: 64
    });

  }

}

export function setupSticky(client) {

  const timers = new Map();

  client.on("messageCreate", async message => {

    if (message.author.bot)
      return;

    const data = loadSticky();

    const sticky = data[message.channel.id];

    if (!sticky)
      return;

    if (timers.has(message.channel.id))
      clearTimeout(timers.get(message.channel.id));

    timers.set(

      message.channel.id,

      setTimeout(async () => {

        const latest = loadSticky();

        const current = latest[message.channel.id];

        if (!current)
          return;

        try {

          if (current.lastMessage) {

            const old =
              await message.channel.messages.fetch(
                current.lastMessage
              );

            await old.delete().catch(() => {});

          }

        } catch {}

        const sent = await message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle("📌 Sticky Message")
              .setDescription(current.message)
          ]
        });

        current.lastMessage = sent.id;

        latest[message.channel.id] = current;

        saveSticky(latest);

      }, 5000)

    );

  });

}