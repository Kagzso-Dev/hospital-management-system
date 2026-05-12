const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define('Appointment', {
    date: { type: DataTypes.DATEONLY, allowNull: false },
    time_slot: { type: DataTypes.STRING, allowNull: false },
    token_number: DataTypes.INTEGER,
    token_display: DataTypes.STRING,
    queue_position: DataTypes.INTEGER,
    status: {
      type: DataTypes.ENUM('waiting', 'in_progress', 'completed', 'cancelled'),
      defaultValue: 'waiting',
    },
  }, {
    indexes: [{ fields: ['date'] }, { fields: ['status'] }],
  });
