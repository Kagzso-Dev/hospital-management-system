const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define('Medicine', {
    name: { type: DataTypes.STRING, allowNull: false },
    generic_name: DataTypes.STRING,
    category: DataTypes.STRING,
    default_dosage: DataTypes.STRING,
  });
