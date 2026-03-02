const { ApplicationCommandOptionType, PermissionFlagsBits, EmbedBuilder, } = require('discord.js');
const Birthday = require('../../models/Birthday');

const MONTH_CHOICES = [
  { name: '1 - January', value: 1 },
  { name: '2 - February', value: 2 },
  { name: '3 - March', value: 3 },
  { name: '4 - April', value: 4 },
  { name: '5 - May', value: 5 },
  { name: '6 - June', value: 6 },
  { name: '7 - July', value: 7 },
  { name: '8 - August', value: 8 },
  { name: '9 - September', value: 9 },
  { name: '10 - October', value: 10 },
  { name: '11 - November', value: 11 },
  { name: '12 - December', value: 12 },
];

function daysInMonth(month) {
  return new Date(2026, month, 0).getDate();
}

function getFooterText() {
  const now = new Date();

  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();

  let hour = now.getHours();
  const minute = String(now.getMinutes()).padStart(2, '0');
  const period = hour >= 12 ? 'PM' : 'AM';

  hour = hour % 12;
  if (hour === 0) {
    hour = 12;
  }

  const timestamp = `${month}/${day}/${year} ${hour}:${minute} ${period}`;

  return `CoolClubBot Birthdays • ${timestamp}`;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function getMonthName(month) {
  return new Date(2024, month - 1, 1).toLocaleString('en-US', {
    month: 'long',
  });
}

function formatBirthday(month, day) {
  return `${getMonthName(month)} ${ordinal(day)}`;
}

function buildEmbed(title, description, color = 0x1F69FF) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setFooter({ text: getFooterText() });
}

module.exports = {
  name: 'birthday',
  description: 'Register, list, update, and remove birthdays!',
  options: [
    {
      name: 'register',
      description: 'Register a new birthday',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'day',
          description: 'Day (1-31)',
          type: ApplicationCommandOptionType.Integer,
          required: true,
          min_value: 1,
          max_value: 31,
        },
        {
          name: 'month',
          description: 'Select a month',
          type: ApplicationCommandOptionType.Integer,
          required: true,
          choices: MONTH_CHOICES,
        },
      ],
    },
    {
      name: 'remove',
      description: 'MOD-ONLY: Remove a user\'s birthday',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'User whose birthday should be removed',
          type: ApplicationCommandOptionType.User,
          required: true,
        },
      ],
    },
    {
      name: 'list',
      description: 'List all registered birthdays in this server',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'update',
      description: 'MOD-ONLY: Update a user\'s birthday',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'day',
          description: 'Day (1-31)',
          type: ApplicationCommandOptionType.Integer,
          required: true,
          min_value: 1,
          max_value: 31,
        },
        {
          name: 'month',
          description: 'Select a month',
          type: ApplicationCommandOptionType.Integer,
          required: true,
          choices: MONTH_CHOICES,
        },
        {
          name: 'user',
          description: 'User whose birthday should be updated.',
          type: ApplicationCommandOptionType.User,
          required: true,
        },
      ],
    },
  ],

  async callback(client, interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [buildEmbed(
          '❌ Can\'t Register Birthday', 
          'Use this command in the server!', 0xed4245)],
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'register') {
      const month = interaction.options.getInteger('month');
      const day = interaction.options.getInteger('day');

      if (day > daysInMonth(month)) {
        await interaction.reply({
          embeds: [
            buildEmbed(
              '❌ Invalid Date',
              `That date is invalid. **${getMonthName(month)}** only has **${daysInMonth(month)}** days!`,
              0xed4245
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      await Birthday.findOneAndUpdate(
        {
          userId: interaction.user.id,
          guildId: interaction.guild.id,
        },
        {
          month,
          day,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      await interaction.reply({
        embeds: [
          buildEmbed(
            '✅ Birthday Registered',
            `Your birthday has been registered for **${formatBirthday(month, day)}** 🎂`,
            0x57f287
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'remove') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        await interaction.reply({
          embeds: [buildEmbed(
            '❌ Missing Permission', 
            'You need to be a **Moderator** to use `/birthday remove`', 0xed4245)],
          ephemeral: true,
        });
        return;
      }

      const user = interaction.options.getUser('user');
      const deleted = await Birthday.findOneAndDelete({
        userId: user.id,
        guildId: interaction.guild.id,
      });

      await interaction.reply({
        embeds: [
          deleted
            ? buildEmbed('🗑️ Birthday Removed', `Removed ${user}'s registered birthday`, 0x57f287)
            : buildEmbed('❌ Birthday Not Found', `${user} does not have a registered birthday to remove`, 0xed4245),
        ],
        ephemeral: true,
      });
      return;
    }

if (subcommand === 'list') {
      const birthdays = await Birthday.find({ guildId: interaction.guild.id });

      if (!birthdays.length) {
        await interaction.reply({
          embeds: [buildEmbed(
            '🗓️ List of Birthdays in CoolAid\'s Club', 
            'No birthdays are registered in this server yet!', 0xed4245)],
        });
        return;
      }

      const sortedBirthdays = birthdays.sort((a, b) => {
        if (a.month !== b.month) {
          return a.month - b.month;
        }

        return a.day - b.day;
      });

      const groupedLines = [];
      let currentMonth = null;

      for (const entry of sortedBirthdays) {
        if (entry.month !== currentMonth) {
          currentMonth = entry.month;
          groupedLines.push(`\n**${getMonthName(currentMonth)}**`);
        }

        groupedLines.push(`<@${entry.userId}> • ${formatBirthday(entry.month, entry.day)}`);
      }

      const guide = [
        'Add your birthday using `/birthday register <day> <month>`',
        '',
      ].join('\n');

      const listEmbed = buildEmbed(
        "🗓️ List of Birthdays in CoolAid's Club",
        `${guide}${groupedLines.join('\n')}`
      );
      const guildIconUrl = interaction.guild.iconURL({ size: 256 });
      if (guildIconUrl) {
        listEmbed.setThumbnail(guildIconUrl);
      }

      await interaction.reply({
        embeds: [listEmbed],
      });
      return;
    }

    if (subcommand === 'update') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        await interaction.reply({
          embeds: [buildEmbed(
            '❌ Missing Permission', 
            'You need to be a **Moderator** to use `/birthday update`', 0xed4245)],
          ephemeral: true,
        });
        return;
      }

      const user = interaction.options.getUser('user');
      const month = interaction.options.getInteger('month');
      const day = interaction.options.getInteger('day');

      if (day > daysInMonth(month)) {
        await interaction.reply({
          embeds: [
            buildEmbed(
              '❌ Invalid Date',
              `That date is invalid. **${getMonthName(month)}** only has **${daysInMonth(month)}** days!`,
              0xed4245
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      await Birthday.findOneAndUpdate(
        {
          userId: user.id,
          guildId: interaction.guild.id,
        },
        {
          month,
          day,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      await interaction.reply({
        embeds: [
          buildEmbed(
            '✅ Birthday Updated',
            `Updated ${user}'s birthday to **${formatBirthday(month, day)}**.`,
            0x57f287
          ),
        ],
      });
    }
  },
};