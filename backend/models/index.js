const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database.sqlite'),
  logging: false,
});

const Patient = require('./Patient')(sequelize);
const Doctor = require('./Doctor')(sequelize);
const Appointment = require('./Appointment')(sequelize);
const Prescription = require('./Prescription')(sequelize);
const PrescriptionItem = require('./PrescriptionItem')(sequelize);
const DoctorAvailability = require('./DoctorAvailability')(sequelize);
const Medicine = require('./Medicine')(sequelize);

Patient.hasMany(Appointment, { foreignKey: 'patient_id', as: 'appointments' });
Appointment.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

Doctor.hasMany(Appointment, { foreignKey: 'doctor_id', as: 'appointments' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });

Doctor.hasMany(DoctorAvailability, { foreignKey: 'doctor_id' });
DoctorAvailability.belongsTo(Doctor, { foreignKey: 'doctor_id' });

Appointment.hasOne(Prescription, { foreignKey: 'appointment_id', as: 'prescription' });
Prescription.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });

Doctor.hasMany(Prescription, { foreignKey: 'doctor_id' });
Prescription.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });

Patient.hasMany(Prescription, { foreignKey: 'patient_id' });
Prescription.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

Prescription.hasMany(PrescriptionItem, { foreignKey: 'prescription_id', as: 'items' });
PrescriptionItem.belongsTo(Prescription, { foreignKey: 'prescription_id' });

module.exports = { sequelize, Patient, Doctor, Appointment, Prescription, PrescriptionItem, DoctorAvailability, Medicine };
