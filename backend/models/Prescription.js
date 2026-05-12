const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define('Prescription', {
    diagnosis: DataTypes.TEXT,
    notes: DataTypes.TEXT,
  });
