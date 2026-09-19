import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

// ============================================================
// CONFIG
// ============================================================

const APPLICATION_REVIEW_CHANNEL = "1458108842490724563";
const APPLICATION_STAFF_ROLE = "1532146862004371707";

// ============================================================
// APPLICATION TYPES
// ============================================================

const applications = {
  staff: {
    title: "🌲 Redwood City Staff Team Application",
    questions: [
      "What’s your Roblox username?",
      "How old are you?",
      "Which timezone do you live in?",
      "How many hours can you give to Redwood City every week?",
      "Have you ever been staff in another Roblox game or Discord server? If yes, tell us a bit about it.",
      "Why are you interested in joining the Redwood City Staff Team?",
      "In your opinion, what makes someone a good staff member?",
      "How is helping a player different from moderating a player?",
      "What would you do if a player started insulting you and got angry?",
      "Why does professionalism matter for staff members?",
      "A player keeps insulting another player in chat. What steps would you take?",
      "A friend breaks the rules and asks you to let it slide. What would you do?",
      "Players report someone for exploiting, but you have no clear evidence. How would you handle it?",
      "Someone starts spamming chat and ruins roleplay. What would you do?",
      "You see a higher-ranking staff member break a rule. Would you report them?",
      "If you make a moderation mistake, what would you do?",
      "How would you respond to criticism from players?",
      "What does abuse of power mean to you?",
      "Why should we trust you with staff permissions?",
      "Anything else you want to share with the Administration Team?",
    ],
  },

  development: {
    title: "🌲 Redwood City Development Team Application",
    questions: [
      "Roblox Username:",
      "Discord Username:",
      "Age:",
      "Timezone:",
      "How many hours a week can you put into working on Redwood City?",
      "What position are you applying for?",
      "What draws you to this role?",
      "How long have you worked in this area?",
      "How would you rate your skill level and why?",
      "Have you worked on other Roblox projects before?",
      "Can you share examples of your work?",
      "What is your strongest skill for this role?",
      "What are you still working to improve?",
      "You realize you won't finish a task before the deadline. What do you do?",
      "How do you handle feedback from another developer?",
      "You accidentally damage an important project asset. What do you do?",
      "A Lead Developer asks you to redo finished work. How do you respond?",
      "You disagree with another developer about a feature. How do you solve it?",
      "Why do you want to join the Redwood City Development Team?",
      "What makes a great developer or teammate?",
      "How do you handle criticism?",
      "Why are you the right fit for this team?",
    ],
  },

  tester: {
    title: "🌲 Redwood City Game Tester Application",
    questions: [
      "What’s your Roblox Username?",
      "What’s your Discord Username?",
      "How old are you?",
      "How many hours a week can you spend testing Redwood City?",
      "Why do you want to be a Game Tester?",
      "What makes someone a good Game Tester?",
      "Have you tested other games before?",
      "You find a bug that lets players earn money unfairly. What do you do?",
      "You find a small visual bug that doesn't affect gameplay. Do you report it?",
      "A friend asks about a secret upcoming update. How do you handle it?",
      "Why should we pick you for the Redwood City Game Tester team?",
    ],
  },
};

// ============================================================
// STATE
// ============================================================

const activeApplications = new Map();
const processedApplications = new Set();

let applicationClient = null;

// ============================================================
// AI WARNING SYSTEM
// WARNING ONLY — NEVER AUTO REJECTS
// ============================================================

function detectPossibleAI(text) {
  const warnings = [];

  const lower = text.toLowerCase();

  const suspiciousPhrases = [
    "as an ai",
    "as a language model",
    "i cannot assist",
    "i am unable to",
    "certainly! here",
    "here is a professional response",
  ];

  for (const phrase of suspiciousPhrases) {
    if (lower.includes(phrase)) {
      warnings.push(`Contains phrase: "${phrase}"`);
    }
  }

  if (text.length > 1800) {
    warnings.push("Unusually long response");
  }

  if (
    text.includes("Firstly") ||
    text.includes("Secondly") ||
    text.includes("Thirdly")
  ) {
    warnings.push("Highly structured/formal wording");
  }

  return warnings;
}

// ============================================================
// /APPLY
// ============================================================

export async function handleApplicationCommand(interaction) {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "apply") return;

  console.log(
    `📋 /apply received from ${interaction.user.tag}`
  );

  try {
    const type = interaction.options.getString("type");

    console.log(`📋 Application type: ${type}`);

    if (!type || !applications[type]) {
      await interaction.reply({
        content: "❌ Invalid application type.",
        ephemeral: true,
      });

      return;
    }

    const application = applications[type];

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(application.title)
      .setDescription(
        "Click **Start Application** below to begin your application in DMs."
      )
      .addFields({
        name: "⚠️ Important",
        value:
          "Please answer honestly. AI detection only provides warnings for staff review and does not automatically reject applications.",
      })
      .setFooter({
        text: "Redwood City Applications",
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`application_start_${type}`)
        .setLabel("Start Application")
        .setEmoji("📝")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });

    console.log(
      `✅ /apply response sent to ${interaction.user.tag}`
    );
  } catch (error) {
    console.error(
      "❌ /apply error:",
      error
    );

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content:
            "❌ Something went wrong while opening the application.",
          ephemeral: true,
        });
      }
    } catch (replyError) {
      console.error(
        "❌ Could not send /apply error response:",
        replyError
      );
    }
  }
}

// ============================================================
// BUTTON HANDLER
// ============================================================

export async function handleApplicationInteraction(interaction) {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;

  const isStart = customId.startsWith("application_start_");
  const isAccept = customId.startsWith("application_accept_");
  const isDeny = customId.startsWith("application_deny_");

  if (!isStart && !isAccept && !isDeny) {
    return;
  }

  console.log(
    `🔘 Application button: ${customId} by ${interaction.user.tag}`
  );

  // ==========================================================
  // START BUTTON
  // ==========================================================

  if (isStart) {
    await handleStartButton(interaction);
    return;
  }

  // ==========================================================
  // ACCEPT / DENY
  // ==========================================================

  await handleReviewButton(interaction);
}

// Keep the dedicated start-button entry point used by index.js.
// Both application button paths share the same validated dispatcher above.
export async function handleApplicationButton(interaction) {
  return handleApplicationInteraction(interaction);
}

// ============================================================
// START APPLICATION
// ============================================================

async function handleStartButton(interaction) {
  const type = interaction.customId.replace(
    "application_start_",
    ""
  );

  const application = applications[type];

  if (!application) {
    await interaction.reply({
      content: "❌ This application no longer exists.",
      ephemeral: true,
    });

    return;
  }

  try {
    // Respond IMMEDIATELY so Discord doesn't show
    // "This interaction failed".
    await interaction.deferReply({
      ephemeral: true,
    });

    const user = interaction.user;

    if (activeApplications.has(user.id)) {
      await interaction.editReply({
        content:
          "⚠️ You already have an active application. Please finish it first.",
      });

      return;
    }

    // ========================================================
    // TEST DM
    // ========================================================

    try {
      await user.send(
        `🌲 **${application.title}**\n\n` +
          `Welcome to the Redwood City application system!\n\n` +
          `I will send you **one question at a time**.\n` +
          `Reply to each question with your answer.\n\n` +
          `⚠️ Please answer honestly and without AI.`
      );
    } catch (error) {
      console.error(
        `❌ Could not DM ${user.tag}:`,
        error
      );

      await interaction.editReply({
        content:
          "❌ I couldn't send you a DM. Please enable DMs from this server and try again.",
      });

      return;
    }

    // ========================================================
    // CREATE APPLICATION
    // ========================================================

    const applicationData = {
      userId: user.id,
      username: user.tag,
      type,
      title: application.title,
      questions: application.questions,
      answers: [],
      currentQuestion: 0,
      startedAt: Date.now(),
      aiWarnings: [],
    };

    activeApplications.set(
      user.id,
      applicationData
    );

    // ========================================================
    // SEND FIRST QUESTION
    // ========================================================

    await user.send(
      `**Question 1/${application.questions.length}**\n\n` +
        application.questions[0]
    );

    await interaction.editReply({
      content:
        "✅ **Application started!**\n\n" +
        "Check your DMs. I sent you the first question.",
    });

    console.log(
      `📝 Application started: ${user.tag} → ${type}`
    );
  } catch (error) {
    console.error(
      "❌ Start application error:",
      error
    );

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content:
            "❌ Something went wrong while starting your application.",
        });
      } else {
        await interaction.reply({
          content:
            "❌ Something went wrong while starting your application.",
          ephemeral: true,
        });
      }
    } catch (replyError) {
      console.error(
        "❌ Could not respond to start button:",
        replyError
      );
    }
  }
}

// ============================================================
// DM MESSAGE HANDLER
// ============================================================

export async function handleApplicationMessage(message) {
  if (!message.channel.isDMBased()) return;
  if (message.author.bot) return;

  const application = activeApplications.get(
    message.author.id
  );

  if (!application) return;

  console.log(
    `💬 Application answer received from ${message.author.tag}`
  );

  try {
    const answer = message.content.trim();

    if (!answer) {
      await message.reply(
        "❌ Please provide an answer before continuing."
      );

      return;
    }

    const questionIndex =
      application.currentQuestion;

    const question =
      application.questions[questionIndex];

    // ========================================================
    // SAVE ANSWER
    // ========================================================

    application.answers.push({
      question,
      answer,
    });

    // ========================================================
    // AI WARNING
    // ========================================================

    const warnings =
      detectPossibleAI(answer);

    if (warnings.length > 0) {
      application.aiWarnings.push({
        question: questionIndex + 1,
        warnings,
      });

      console.log(
        `⚠️ Possible AI indicators for ${message.author.tag}:`,
        warnings
      );
    }

    application.currentQuestion++;

    // ========================================================
    // MORE QUESTIONS
    // ========================================================

    if (
      application.currentQuestion <
      application.questions.length
    ) {
      const nextQuestion =
        application.currentQuestion;

      await message.reply(
        `✅ **Answer ${questionIndex + 1} saved.**\n\n` +
          `**Question ${nextQuestion + 1}/${application.questions.length}**\n\n` +
          application.questions[nextQuestion]
      );

      return;
    }

    // ========================================================
    // COMPLETED
    // ========================================================

    await message.reply(
      "✅ **Application completed!**\n\n" +
        "Your application has been sent to the Administration Team for review."
    );

    console.log(
      `📨 Application completed: ${message.author.tag}`
    );

    await submitApplication(application);

    activeApplications.delete(
      message.author.id
    );
  } catch (error) {
    console.error(
      "❌ Application DM error:",
      error
    );

    await message
      .reply(
        "❌ Something went wrong while saving your answer. Please contact Administration."
      )
      .catch(() => {});
  }
}

// ============================================================
// SUBMIT APPLICATION
// ============================================================

async function submitApplication(application) {
  if (!applicationClient) {
    console.error(
      "❌ Application client has not been initialized."
    );

    return null;
  }

  try {
    const channel =
      await applicationClient.channels
        .fetch(APPLICATION_REVIEW_CHANNEL)
        .catch(() => null);

    if (!channel) {
      console.error(
        `❌ Application review channel ${APPLICATION_REVIEW_CHANNEL} was not found.`
      );

      return null;
    }

    if (!channel.isTextBased()) {
      console.error(
        "❌ Application review channel is not a text channel."
      );

      return null;
    }

    const warningCount =
      application.aiWarnings.length;

    const applicationId =
      `${application.userId}-${Date.now()}`;

    const embed =
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(
          `📋 ${application.title}`
        )
        .setDescription(
          `**Applicant:** <@${application.userId}>\n` +
            `**Discord:** ${application.username}\n` +
            `**Type:** ${application.type}\n` +
            `**Application ID:** \`${applicationId}\``
        )
        .addFields({
          name: "🤖 AI Detection",
          value:
            warningCount > 0
              ? `⚠️ **${warningCount} potential warning(s)** detected.\nManual review required.`
              : "✅ No obvious AI indicators detected.",
          inline: false,
        })
        .setFooter({
          text:
            "Redwood City Applications • Manual review required",
        })
        .setTimestamp();

    // ========================================================
    // ANSWERS
    // ========================================================

    for (
      let i = 0;
      i < application.answers.length;
      i++
    ) {
      const item =
        application.answers[i];

      let value =
        item.answer || "No answer provided.";

      if (value.length > 1000) {
        value =
          value.substring(0, 997) +
          "...";
      }

      let questionName =
        `${i + 1}. ${item.question}`;

      if (questionName.length > 256) {
        questionName =
          questionName.substring(0, 253) +
          "...";
      }

      embed.addFields({
        name: questionName,
        value,
        inline: false,
      });
    }

    // ========================================================
    // REVIEW BUTTONS
    // ========================================================

    const row =
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(
            `application_accept_${application.userId}_${application.type}`
          )
          .setLabel("Accept")
          .setEmoji("✅")
          .setStyle(
            ButtonStyle.Success
          ),

        new ButtonBuilder()
          .setCustomId(
            `application_deny_${application.userId}_${application.type}`
          )
          .setLabel("Deny")
          .setEmoji("❌")
          .setStyle(
            ButtonStyle.Danger
          )
      );

    const sentMessage =
      await channel.send({
        embeds: [embed],
        components: [row],
      });

    console.log(
      `📨 Application sent to review channel: ${sentMessage.id}`
    );

    return sentMessage;
  } catch (error) {
    console.error(
      "❌ Failed to submit application:",
      error
    );

    return null;
  }
}

// ============================================================
// ACCEPT / DENY
// ============================================================

async function handleReviewButton(interaction) {
  try {
    // ========================================================
    // ACKNOWLEDGE IMMEDIATELY
    // ========================================================

    await interaction.deferReply({
      ephemeral: true,
    });

    // ========================================================
    // STAFF PERMISSION
    // ========================================================

    const member =
      interaction.member;

    if (
      !member ||
      !member.roles?.cache?.has(
        APPLICATION_STAFF_ROLE
      )
    ) {
      await interaction.editReply({
        content:
          "❌ You do not have permission to review applications.",
      });

      return;
    }

    // ========================================================
    // PARSE BUTTON
    // ========================================================

    const parts =
      interaction.customId.split("_");

    const action =
      parts[1];

    const userId =
      parts[2];

    const type =
      parts.slice(3).join("_");

    if (
      !userId ||
      !type ||
      (action !== "accept" &&
        action !== "deny")
    ) {
      await interaction.editReply({
        content:
          "❌ Invalid application button.",
      });

      return;
    }

    // ========================================================
    // DUPLICATE PROTECTION
    // ========================================================

    const applicationKey =
      `${userId}_${type}`;

    if (
      processedApplications.has(
        applicationKey
      )
    ) {
      await interaction.editReply({
        content:
          "⚠️ This application has already been processed.",
      });

      return;
    }

    processedApplications.add(
      applicationKey
    );

    // ========================================================
    // FIND USER
    // ========================================================

    const applicant =
      await interaction.client.users
        .fetch(userId)
        .catch(() => null);

    if (!applicant) {
      processedApplications.delete(
        applicationKey
      );

      await interaction.editReply({
        content:
          "❌ Could not find the applicant.",
      });

      return;
    }

    const accepted =
      action === "accept";

    // ========================================================
    // ACCEPT → ADD ROLE
    // ========================================================

    if (accepted) {
      try {
        const guild =
          interaction.guild;

        if (guild) {
          const guildMember =
            await guild.members
              .fetch(userId)
              .catch(() => null);

          if (guildMember) {
            await guildMember.roles.add(
              APPLICATION_STAFF_ROLE
            );

            console.log(
              `✅ Role ${APPLICATION_STAFF_ROLE} added to ${applicant.tag}`
            );
          } else {
            console.warn(
              `⚠️ Could not find ${applicant.tag} in guild.`
            );
          }
        }
      } catch (error) {
        console.error(
          "❌ Failed to add application role:",
          error
        );

        // Don't crash the bot.
      }
    }

    // ========================================================
    // RESULT DM
    // ========================================================

    const resultEmbed =
      new EmbedBuilder()
        .setColor(
          accepted
            ? 0x57f287
            : 0xed4245
        )
        .setTitle(
          accepted
            ? "✅ Application Accepted"
            : "❌ Application Denied"
        )
        .setDescription(
          accepted
            ? `Congratulations! Your **${type}** application for Redwood City has been accepted.`
            : `Thank you for applying for the **${type}** team. Unfortunately, your application was not accepted at this time.`
        )
        .addFields({
          name: "Reviewed by",
          value:
            `<@${interaction.user.id}>`,
        })
        .setTimestamp()
        .setFooter({
          text:
            "Redwood City Administration",
        });

    await applicant
      .send({
        embeds: [resultEmbed],
      })
      .catch(error => {
        console.warn(
          `⚠️ Could not DM applicant ${applicant.tag}:`,
          error.message
        );
      });

    // ========================================================
    // DISABLE BUTTONS
    // ========================================================

    if (interaction.message) {
      const disabledRows =
        interaction.message.components.map(
          row => {
            const newRow =
              new ActionRowBuilder();

            for (
              const component of row.components
            ) {
              newRow.addComponents(
                ButtonBuilder
                  .from(component)
                  .setDisabled(true)
              );
            }

            return newRow;
          }
        );

      await interaction.message
        .edit({
          components:
            disabledRows,
        })
        .catch(error => {
          console.warn(
            "⚠️ Could not disable application buttons:",
            error.message
          );
        });
    }

    // ========================================================
    // FINAL RESPONSE
    // ========================================================

    await interaction.editReply({
      content:
        accepted
          ? "✅ Application accepted."
          : "❌ Application denied.",
    });

    console.log(
      `📋 Application ${accepted ? "accepted" : "denied"}: ${applicant.tag} (${type}) by ${interaction.user.tag}`
    );
  } catch (error) {
    console.error(
      "❌ Application review error:",
      error
    );

    // If processing failed, allow retry.
    try {
      const parts =
        interaction.customId.split("_");

      if (
        parts.length >= 4
      ) {
        processedApplications.delete(
          `${parts[2]}_${parts.slice(3).join("_")}`
        );
      }
    } catch {}

    try {
      if (
        interaction.deferred ||
        interaction.replied
      ) {
        await interaction.editReply({
          content:
            "❌ Something went wrong while processing this application.",
        });
      } else {
        await interaction.reply({
          content:
            "❌ Something went wrong while processing this application.",
          ephemeral: true,
        });
      }
    } catch (replyError) {
      console.error(
        "❌ Could not send review error:",
        replyError
      );
    }
  }
}

// ============================================================
// INITIALIZE APPLICATION SYSTEM
// ============================================================

export function startApplication(client) {
  applicationClient = client;

  console.log(
    "✅ Application system initialized."
  );

  console.log(
    `📋 Review channel: ${APPLICATION_REVIEW_CHANNEL}`
  );

  console.log(
    `👮 Application staff role: ${APPLICATION_STAFF_ROLE}`
  );
} 