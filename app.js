// start discord.js init
const config = require("./config.json"); // See config.json below for example
const Discord = require("discord.js"); // Code below supports and is tested under "stable" 11.3.x
const client = new Discord.Client();
// end discord.js init

// Initialize **or load** the points database.
const Enmap = require("enmap");
client.points = new Enmap({name: "points"});

client.on("ready", () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 
});

client.on("message", async (message) => {
  // First, ignore itself and all other bots. Also, ignore private messages so a user can't spam the bot for points.
  if (!message.guild || message.author.bot) return;

  /* Now we start the real code for this tutorial */

  // If this is not in a DM, execute the points code.
  if (message.guild) {
    // We'll use the key often enough that simplifying it is worth the trouble.
    const key = `${message.guild.id}-${message.author.id}`;
    
    // Triggers on new users we haven't seen before.
    client.points.ensure(key, {
      user: message.author.id,
      guild: message.guild.id,
      points: 0,
      lastSeen: new Date()
    });
    
    // Increment the points and save them.
    client.points.inc(key, "points");
  
  /* END POINTS ATTRIBUTION. Now let's have some fun with commands. */

  // As usual, we stop processing if the message does not start with our prefix.
  if (message.content.indexOf(config.prefix) !== 0) return;

  // Also we use the config prefix to get our arguments and command:
  const args = message.content.split(/\s+/g);
  const command = args.shift().slice(config.prefix.length).toLowerCase();
  
  // Let's build some useful ones for our points system.

  if (command === "points") {
    const key = `${message.guild.id}-${message.author.id}`;
    return message.channel.send(`You currently have ${client.points.get(key, "points")} E&T points!`);
  }

  if(command === "leaderboard") {
    // Get a filtered list (for this guild only), and convert to an array while we're at it.
    const filtered = client.points.array().filter( p => p.guild === message.guild.id );
  
    // Sort it to get the top results... well... at the top. Y'know.
    const sorted = filtered.sort((a, b) => a.points < b.points);
  
    // Slice it, dice it, get the top 10 of it!
    const top10 = sorted.splice(0, 10);
  
    // Now shake it and show it! (as a nice embed, too!)
    const embed = new Discord.RichEmbed()
      .setTitle("Leaderboard")
      .setAuthor(client.user.username, client.user.avatarURL)
      .setDescription("Our top 10 points leaders!")
      .setColor(0x00AE86);
    for(const data of top10) {
      embed.addField(client.users.get(data.user).tag, `${data.points} points (level ${data.level})`);
    }
    return message.channel.send({embed});
  }

  if(command === "give") {
    // Limited to guild owner - adjust to your own preference!
    if(!message.author.id === message.guild.owner) return message.reply("You're not the boss of me, you can't do that!");

    const user = message.mentions.users.first() || client.users.get(args[0]);
    if(!user) return message.reply("You must mention someone or give their ID!");

    const pointsToAdd = parseInt(args[1], 10);
    if(!pointsToAdd) return message.reply("You didn't tell me how many points to give...");
    
    const key = `${message.guild.id}-${user.id}`;

    // Ensure there is a points entry for this user.
    client.points.ensure(key, {
      user: message.author.id,
      guild: message.guild.id,
      lastSeen: new Date()
    });
    
    // Add the points to the enmap for this user.
    client.points.math(key, "+", pointsToAdd, "points");

    message.channel.send(`${user.tag} has received ${pointsToAdd} points and now has ${client.points.get(key, "points")} points.`);
  }

  if(command === "cleanup") {
    // Let's clean up the database of all "old" users, and those who haven't been around for... say a month.

    // Get a filtered list (for this guild only).
    const filtered = client.points.filter( p => p.guild === message.guild.id );

    // We then filter it again (ok we could just do this one, but for clarity's sake...)
    // So we get only users that haven't been online for a month, or are no longer in the guild.
    const rightNow = new Date();
    const toRemove = filtered.filter(data => {
      return !message.guild.members.has(data.user) || rightNow - 2592000000 > data.lastSeen;
    });

    toRemove.forEach(data => {
      client.points.delete(`${message.guild.id}-${data.user}`);
    });

    message.channel.send(`Removed ${toRemove.size} old users' points.`);
  }


// Start the bot by logging it in.
client.login(config.token);

}
});