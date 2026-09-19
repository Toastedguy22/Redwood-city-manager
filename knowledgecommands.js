import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} from "discord.js";

import {
  addKnowledgeArticle,
  removeKnowledgeArticle,
  getKnowledgeArticles
} from "./knowledge.js";


export const knowledgeCommand = new SlashCommandBuilder()
  .setName("knowledge")
  .setDescription("Manage AI support knowledge")

  .setDefaultMemberPermissions(
    PermissionFlagsBits.ManageGuild
  )

  .addSubcommand(sub =>
    sub
      .setName("add")
      .setDescription("Add a knowledge article")

      .addStringOption(option =>
        option
          .setName("title")
          .setDescription("Article title")
          .setRequired(true)
      )

      .addStringOption(option =>
        option
          .setName("keywords")
          .setDescription("Keywords separated by commas")
          .setRequired(true)
      )

      .addStringOption(option =>
        option
          .setName("content")
          .setDescription("Answer content")
          .setRequired(true)
      )
  )


  .addSubcommand(sub =>
    sub
      .setName("list")
      .setDescription("List knowledge articles")
  )


  .addSubcommand(sub =>
    sub
      .setName("remove")
      .setDescription("Remove knowledge article")

      .addStringOption(option =>
        option
          .setName("id")
          .setDescription("Article ID")
          .setRequired(true)
      )
  );



export async function handleKnowledgeCommand(interaction) {

  const sub = interaction.options.getSubcommand();


  if (sub === "add") {

    const article = addKnowledgeArticle({

      title:
        interaction.options.getString("title"),

      keywords:
        interaction.options
        .getString("keywords")
        .split(",")
        .map(k => k.trim()),

      content:
        interaction.options.getString("content"),

      createdBy:
        interaction.user.id
    });


    return interaction.reply({
      content:
        `✅ Knowledge article created!\nID: \`${article.id}\``,
      ephemeral: true
    });

  }



  if (sub === "list") {

    const articles = getKnowledgeArticles();


    const embed = new EmbedBuilder()
      .setTitle("📚 Knowledge Base")
      .setDescription(
        articles.length
        ? articles.map(
          a => `\`${a.id}\` - ${a.title}`
        ).join("\n")
        : "No articles found."
      );


    return interaction.reply({
      embeds: [embed],
      ephemeral: true
    });

  }



  if (sub === "remove") {

    removeKnowledgeArticle(
      Number(
        interaction.options.getString("id")
      )
    );


    return interaction.reply({
      content:
        "🗑️ Knowledge article removed.",
      ephemeral: true
    });

  }

}