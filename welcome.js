import { EmbedBuilder } from "discord.js";

const WELCOME_CHANNEL_ID = "1446926932259377233";

export async function handleWelcomeMember(member) {
    try {
        const channel = member.guild.channels.cache.get(
            WELCOME_CHANNEL_ID
        );

        if (!channel) {
            console.error(
                `❌ Welcome channel ${WELCOME_CHANNEL_ID} was not found.`
            );
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("🌲 Welcome to Redwood City!")
            .setDescription(
                `Welcome to **Redwood City**, ${member}! 👋\n\n` +
                `We're glad to have you here!\n\n` +
                `Please make sure to read the server rules and enjoy your time with us.`
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                {
                    name: "👤 Member",
                    value: `${member.user.tag}`,
                    inline: true,
                },
                {
                    name: "📊 Member Count",
                    value: `${member.guild.memberCount}`,
                    inline: true,
                }
            )
            .setFooter({
                text: "Redwood City • Welcome!",
            })
            .setTimestamp();

        await channel.send({
            content: `Welcome ${member}! 🌲`,
            embeds: [embed],
        });

        console.log(
            `👋 Welcome message sent for ${member.user.tag}`
        );

    } catch (error) {
        console.error(
            "❌ Welcome system error:",
            error
        );
    }
}