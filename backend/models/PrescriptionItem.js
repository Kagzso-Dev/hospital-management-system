const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define('PrescriptionItem', {
    medicine_name: { type: DataTypes.STRING, allowNull: false },
    dosage: DataTypes.STRING,
    morning: { type: DataTypes.BOOLEAN, defaultValue: false },
    afternoon: { type: DataTypes.BOOLEAN, defaultValue: false },
    night: { type: DataTypes.BOOLEAN, defaultValue: false },
    duration: DataTypes.INTEGER,
    instructions: DataTypes.STRING,
  });
