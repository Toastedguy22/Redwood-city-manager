const countingChannels = new Map();

export function startCounting(channelId) {
    countingChannels.set(channelId, {
        nextNumber: 1,
        lastUserId: null
    });
}

export async function handleCountingMessage(message) {
    // Ignore bots
    if (message.author.bot) return;

    const counting = countingChannels.get(message.channel.id);

    // This channel isn't a counting channel
    if (!counting) return;

    const number = Number(message.content.trim());

    // Ignore messages that aren't whole numbers
    if (!Number.isInteger(number)) return;

    // Same user cannot count twice in a row
    if (message.author.id === counting.lastUserId) {
        await message.react("❌").catch(() => {});

        await message.channel.send(
            `❌ ${message.author}, you cannot count twice in a row! The count has been reset to **1**.`
        ).catch(() => {});

        counting.nextNumber = 1;
        counting.lastUserId = null;
        return;
    }

    // Correct number
    if (number === counting.nextNumber) {
        await message.react("✅").catch(() => {});

        counting.nextNumber++;
        counting.lastUserId = message.author.id;

        return;
    }

    // Wrong number
    await message.react("❌").catch(() => {});

    await message.channel.send(
        `❌ Wrong number! ${message.author} entered **${number}**, but the next number was **${counting.nextNumber}**.\n🔄 The count has been reset to **1**.`
    ).catch(() => {});

    counting.nextNumber = 1;
    counting.lastUserId = null;
}