const { getTicketUpdateAction, sendTicketLog } = require('../../utils/ticketLogs');

module.exports = async (client, oldChannel, newChannel) => {
  try {
    const action = getTicketUpdateAction(oldChannel, newChannel);

    if (!action) {
      return;
    }

    await sendTicketLog(client, newChannel, action);
  } catch (error) {
    console.error('Error in channelUpdate ticket log:', error);
  }
};
