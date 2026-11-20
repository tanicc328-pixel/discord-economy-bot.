const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = '!';
const OWNER_ID = process.env.OWNER_ID || '';
const DB_PATH = path.join(__dirname, 'economy.json');

function loadEconomy() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
      return {};
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Error reading economy.json:', err);
    return {};
  }
}

function saveEconomy(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getBalance(data, userId) {
  return typeof data[userId] === 'number' ? data[userId] : 0;
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = (args.shift() || '').toLowerCase();
  const data = loadEconomy();

  if (command === 'help') {
    const embed = new EmbedBuilder()
      .setTitle('أوامر نظام الاقتصاد')
      .setColor(0x2b2d31)
      .addFields(
        { name: `${PREFIX}balance [@عضو]`, value: 'عرض رصيدك أو رصيد عضو آخر.' },
        { name: `${PREFIX}transfer @عضو <المبلغ>`, value: 'تحويل مبلغ من رصيدك إلى عضو آخر.' },
        { name: `${PREFIX}add @عضو <المبلغ>`, value: 'إضافة رصيد لعضو (للمالك فقط).' },
        { name: `${PREFIX}help`, value: 'عرض قائمة الأوامر.' }
      );
    return message.reply({ embeds: [embed] });
  }

  if (command === 'balance' || command === 'bal') {
    const target = message.mentions.users.first() || message.author;
    const bal = getBalance(data, target.id);
    return message.reply(`رصيد **${target.username}** الحالي هو: **${bal}**`);
  }

  if (command === 'transfer' || command === 'pay') {
    const target = message.mentions.users.first();
    const amount = parseInt(args[1], 10);

    if (!target || target.bot || target.id === message.author.id) {
      return message.reply(`الاستخدام الصحيح: \`${PREFIX}transfer @عضو <المبلغ>\``);
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      return message.reply('يرجى إدخال مبلغ صحيح أكبر من صفر.');
    }

    const senderBal = getBalance(data, message.author.id);
    if (senderBal < amount) {
      return message.reply(`رصيدك غير كافٍ. رصيدك الحالي: **${senderBal}**.`);
    }

    data[message.author.id] = senderBal - amount;
    data[target.id] = getBalance(data, target.id) + amount;
    saveEconomy(data);

    return message.reply(`تم تحويل **${amount}** بنجاح إلى **${target.username}**.`);
  }

  if (command === 'add') {
    if (!OWNER_ID || message.author.id !== OWNER_ID) {
      return message.reply('هذا الأمر مخصص لمالك البوت فقط.');
    }

    const target = message.mentions.users.first();
    const amount = parseInt(args[1], 10);

    if (!target || !Number.isInteger(amount) || amount === 0) {
      return message.reply(`الاستخدام الصحيح: \`${PREFIX}add @عضو <المبلغ>\``);
    }

    const updated = Math.max(0, getBalance(data, target.id) + amount);
    data[target.id] = updated;
    saveEconomy(data);

    return message.reply(`تم تحديث رصيد **${target.username}** ليصبح **${updated}**.`);
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Missing DISCORD_TOKEN environment variable.');
  process.exit(1);
}

client.login(token);
        
