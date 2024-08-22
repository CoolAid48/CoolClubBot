const path = require('path');
const getAllfiles = require('./getAllFiles');
const { trusted } = require('mongoose');

module.exports = (exceptions = []) => {
    let localCommands = [];

const commandCategories = getAllfiles(
    path.join(__dirname, '..', 'commands'),
    true
)

for (const commandCategory of commandCategories) {
    const commandFiles = getAllfiles(commandCategory);

  for (const commandFile of commandFiles) {
    const commandObject = require(commandFile);

    if (exceptions.includes(commandObject.name)) {
        continue;
    }
    console.log(commandObject);
    localCommands.push(commandObject);
  }
}

    return localCommands;
}