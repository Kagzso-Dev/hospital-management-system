const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define('Doctor', {
    name: { type: DataTypes.STRING, allowNull: false },
    specialization: DataTypes.STRING,
    phone: DataTypes.STRING,
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  });
