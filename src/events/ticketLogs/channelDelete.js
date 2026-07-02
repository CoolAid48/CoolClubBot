const { sendTicketLog } = require('../../utils/ticketLogs');

module.exports = async (client, channel) => {
  try {
    await sendTicketLog(client, channel, 'Deleted');
  } catch (error) {
    console.error('Error in channelDelete ticket log:', error);
  }
};
