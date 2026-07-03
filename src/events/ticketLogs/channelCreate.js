const { sendTicketLog } = require('../../utils/ticketLogs');

module.exports = async (client, channel) => {
  try {
    await sendTicketLog(client, channel, 'Created');
  } catch (error) {
    console.error('Error in channelCreate ticket log:', error);
  }
};