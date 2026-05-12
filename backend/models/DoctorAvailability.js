const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define('DoctorAvailability', {
    date: DataTypes.DATEONLY,
    day_of_week: DataTypes.INTEGER,
    start_time: DataTypes.STRING,
    end_time: DataTypes.STRING,
    slot_duration: { type: DataTypes.INTEGER, defaultValue: 15 },
    is_available: { type: DataTypes.BOOLEAN, defaultValue: true },
  });
