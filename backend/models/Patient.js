const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Patient = sequelize.define('Patient', {
    patient_id: { type: DataTypes.STRING, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    age: DataTypes.INTEGER,
    dob: DataTypes.DATEONLY,
    gender: DataTypes.ENUM('Male', 'Female', 'Other'),
    phone: { type: DataTypes.STRING, allowNull: false },
    address: DataTypes.TEXT,
  }, {
    indexes: [{ fields: ['phone'] }, { fields: ['patient_id'] }],
  });

  Patient.beforeCreate(async (patient) => {
    const count = await Patient.count();
    patient.patient_id = `PAT${String(count + 1).padStart(6, '0')}`;
  });

  return Patient;
};
