const db = require('../db/database');

const MEDICINES = [
  ['Paracetamol 500mg', 'Acetaminophen', 'Analgesic', '500mg'],
  ['Paracetamol 650mg', 'Acetaminophen', 'Analgesic', '650mg'],
  ['Ibuprofen 400mg', 'Ibuprofen', 'NSAID', '400mg'],
  ['Amoxicillin 250mg', 'Amoxicillin', 'Antibiotic', '250mg'],
  ['Amoxicillin 500mg', 'Amoxicillin', 'Antibiotic', '500mg'],
  ['Azithromycin 250mg', 'Azithromycin', 'Antibiotic', '250mg'],
  ['Azithromycin 500mg', 'Azithromycin', 'Antibiotic', '500mg'],
  ['Ciprofloxacin 500mg', 'Ciprofloxacin', 'Antibiotic', '500mg'],
  ['Doxycycline 100mg', 'Doxycycline', 'Antibiotic', '100mg'],
  ['Metronidazole 400mg', 'Metronidazole', 'Antibiotic', '400mg'],
  ['Cefixime 200mg', 'Cefixime', 'Antibiotic', '200mg'],
  ['Cetirizine 10mg', 'Cetirizine', 'Antihistamine', '10mg'],
  ['Levocetirizine 5mg', 'Levocetirizine', 'Antihistamine', '5mg'],
  ['Chlorpheniramine 4mg', 'Chlorpheniramine', 'Antihistamine', '4mg'],
  ['Omeprazole 20mg', 'Omeprazole', 'PPI', '20mg'],
  ['Pantoprazole 40mg', 'Pantoprazole', 'PPI', '40mg'],
  ['Ranitidine 150mg', 'Ranitidine', 'Antacid', '150mg'],
  ['Metformin 500mg', 'Metformin', 'Antidiabetic', '500mg'],
  ['Metformin 1000mg', 'Metformin', 'Antidiabetic', '1000mg'],
  ['Amlodipine 5mg', 'Amlodipine', 'Antihypertensive', '5mg'],
  ['Atorvastatin 10mg', 'Atorvastatin', 'Statin', '10mg'],
  ['Atorvastatin 20mg', 'Atorvastatin', 'Statin', '20mg'],
  ['Prednisolone 5mg', 'Prednisolone', 'Steroid', '5mg'],
  ['Diclofenac 50mg', 'Diclofenac', 'NSAID', '50mg'],
  ['Tramadol 50mg', 'Tramadol', 'Analgesic', '50mg'],
  ['Vitamin D3 1000IU', 'Cholecalciferol', 'Supplement', '1000IU'],
  ['Folic Acid 5mg', 'Folic Acid', 'Supplement', '5mg'],
  ['Calcium 500mg', 'Calcium Carbonate', 'Supplement', '500mg'],
  ['Multivitamin', 'Multivitamin', 'Supplement', ''],
  ['ORS Sachet', 'Oral Rehydration Salts', 'Electrolyte', ''],
];

// name, specialization, phone, schedule[]
// schedule: { dow (1=Mon..6=Sat,7=Sun), start, end, slot }
const DOCTORS = [
  {
    name: 'Dr. Rajesh Kumar', specialization: 'General Physician', phone: '9000000001',
    schedule: [
      { dow: 1, start: '09:00', end: '13:00', slot: 15 },
      { dow: 2, start: '09:00', end: '13:00', slot: 15 },
      { dow: 3, start: '09:00', end: '13:00', slot: 15 },
      { dow: 4, start: '09:00', end: '13:00', slot: 15 },
      { dow: 5, start: '09:00', end: '13:00', slot: 15 },
      { dow: 6, start: '09:00', end: '13:00', slot: 15 },
      { dow: 1, start: '16:00', end: '19:00', slot: 15 },
      { dow: 3, start: '16:00', end: '19:00', slot: 15 },
      { dow: 5, start: '16:00', end: '19:00', slot: 15 },
    ],
    // simplified: use single block per day
    dailySchedule: [
      { dow: 1, start: '09:00', end: '19:00', slot: 15 },
      { dow: 2, start: '09:00', end: '13:00', slot: 15 },
      { dow: 3, start: '09:00', end: '19:00', slot: 15 },
      { dow: 4, start: '09:00', end: '13:00', slot: 15 },
      { dow: 5, start: '09:00', end: '19:00', slot: 15 },
      { dow: 6, start: '09:00', end: '13:00', slot: 15 },
    ],
  },
  {
    name: 'Dr. Priya Sharma', specialization: 'Paediatrician', phone: '9000000002',
    dailySchedule: [
      { dow: 1, start: '10:00', end: '14:00', slot: 20 },
      { dow: 2, start: '10:00', end: '14:00', slot: 20 },
      { dow: 3, start: '10:00', end: '14:00', slot: 20 },
      { dow: 4, start: '10:00', end: '14:00', slot: 20 },
      { dow: 5, start: '10:00', end: '14:00', slot: 20 },
      { dow: 6, start: '10:00', end: '13:00', slot: 20 },
    ],
  },
  {
    name: 'Dr. Suresh Babu', specialization: 'Cardiologist', phone: '9000000003',
    dailySchedule: [
      { dow: 2, start: '09:00', end: '13:00', slot: 30 },
      { dow: 4, start: '09:00', end: '13:00', slot: 30 },
      { dow: 6, start: '09:00', end: '12:00', slot: 30 },
    ],
  },
  {
    name: 'Dr. Anitha Rao', specialization: 'Gynaecologist', phone: '9000000004',
    dailySchedule: [
      { dow: 1, start: '09:00', end: '17:00', slot: 15 },
      { dow: 2, start: '09:00', end: '17:00', slot: 15 },
      { dow: 3, start: '09:00', end: '17:00', slot: 15 },
      { dow: 4, start: '09:00', end: '17:00', slot: 15 },
      { dow: 5, start: '09:00', end: '17:00', slot: 15 },
    ],
  },
  {
    name: 'Dr. Vikram Nair', specialization: 'Orthopaedic', phone: '9000000005',
    dailySchedule: [
      { dow: 1, start: '10:00', end: '16:00', slot: 20 },
      { dow: 3, start: '10:00', end: '16:00', slot: 20 },
      { dow: 5, start: '10:00', end: '16:00', slot: 20 },
      { dow: 6, start: '09:00', end: '13:00', slot: 20 },
    ],
  },
  {
    name: 'Dr. Meena Patel', specialization: 'Dermatologist', phone: '9000000006',
    dailySchedule: [
      { dow: 2, start: '10:00', end: '16:00', slot: 20 },
      { dow: 4, start: '10:00', end: '16:00', slot: 20 },
      { dow: 6, start: '09:00', end: '13:00', slot: 20 },
    ],
  },
];

const PATIENTS = [
  ['Arjun Mehta',     28, '1998-03-14', 'Male',   '9800000001', 'No.12, Anna Nagar, Chennai'],
  ['Kavitha Suresh',  35, '1991-07-22', 'Female', '9800000002', '45, Brigade Road, Bengaluru'],
  ['Ravi Shankar',    52, '1974-01-05', 'Male',   '9800000003', '8, MG Road, Coimbatore'],
  ['Sunita Patel',    44, '1982-11-30', 'Female', '9800000004', '23, Banjara Hills, Hyderabad'],
  ['Mohammed Farhan', 31, '1995-06-18', 'Male',   '9800000005', '67, Park Street, Kolkata'],
  ['Deepa Nair',      27, '1999-09-09', 'Female', '9800000006', '3, Indiranagar, Bengaluru'],
  ['Suresh Iyer',     60, '1966-04-12', 'Male',   '9800000007', '10, T Nagar, Chennai'],
  ['Preethi Rajan',   39, '1987-12-25', 'Female', '9800000008', '55, Velachery, Chennai'],
  ['Anil Gupta',      48, '1978-08-03', 'Male',   '9800000009', '19, Sector 14, Gurgaon'],
  ['Lakshmi Devi',    55, '1971-02-17', 'Female', '9800000010', '6, Mylapore, Chennai'],
  ['Karthik Raja',    22, '2004-05-28', 'Male',   '9800000011', '34, RS Puram, Coimbatore'],
  ['Ananya Singh',    33, '1993-10-11', 'Female', '9800000012', '78, Koramangala, Bengaluru'],
  ['Bala Murugan',    45, '1981-03-07', 'Male',   '9800000013', '2, Trichy Road, Madurai'],
  ['Divya Krishnan',  29, '1997-08-19', 'Female', '9800000014', '16, Adyar, Chennai'],
  ['Prakash Verma',   64, '1962-06-30', 'Male',   '9800000015', '90, Civil Lines, Nagpur'],
];

function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Generate today's sample appointments
// [ patientIndex, doctorIndex, timeSlot, status ]
const TODAY_APPOINTMENTS = [
  [0,  0, '09:00', 'completed'],
  [1,  0, '09:15', 'completed'],
  [2,  0, '09:30', 'in_progress'],
  [3,  0, '09:45', 'waiting'],
  [4,  0, '10:00', 'waiting'],
  [5,  1, '10:00', 'completed'],
  [6,  1, '10:20', 'in_progress'],
  [7,  1, '10:40', 'waiting'],
  [8,  2, '09:00', 'completed'],
  [9,  2, '09:30', 'waiting'],
  [10, 3, '09:00', 'completed'],
  [11, 3, '09:15', 'completed'],
  [12, 3, '09:30', 'waiting'],
  [13, 4, '10:00', 'in_progress'],
  [14, 5, '10:00', 'waiting'],
];

module.exports = async function seedData() {
  const [[{ count: doctorCount }]] = await db.query('SELECT COUNT(*) as count FROM doctors');

  if (doctorCount === 0) {
    const doctorIds = [];

    await db.transaction(async (conn) => {
      for (const doc of DOCTORS) {
        const [result] = await conn.execute(
          'INSERT INTO doctors (name, specialization, phone) VALUES (?, ?, ?)',
          [doc.name, doc.specialization, doc.phone]
        );
        const doctorId = result.insertId;
        doctorIds.push(doctorId);

        for (const s of doc.dailySchedule) {
          await conn.execute(
            `INSERT INTO doctor_availability
               (doctor_id, date, day_of_week, start_time, end_time, slot_duration, is_available)
             VALUES (?, NULL, ?, ?, ?, ?, 1)`,
            [doctorId, s.dow, s.start, s.end, s.slot]
          );
        }
      }
    });

    console.log(`Seeded ${DOCTORS.length} doctors with timetables`);

    // Seed patients
    const [[{ count: patientCount }]] = await db.query('SELECT COUNT(*) as count FROM patients');
    if (patientCount === 0) {
      const patientIds = [];
      await db.transaction(async (conn) => {
        for (const [name, age, dob, gender, phone, address] of PATIENTS) {
          const [result] = await conn.execute(
            'INSERT INTO patients (name, age, dob, gender, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
            [name, age, dob, gender, phone, address]
          );
          const pid = result.insertId;
          await conn.execute(
            "UPDATE patients SET patient_id = ? WHERE id = ?",
            [`PAT${String(pid).padStart(6, '0')}`, pid]
          );
          patientIds.push(pid);
        }
      });
      console.log(`Seeded ${PATIENTS.length} patients`);

      // Seed today's appointments
      const today = localDateStr();
      await db.transaction(async (conn) => {
        for (let i = 0; i < TODAY_APPOINTMENTS.length; i++) {
          const [pIdx, dIdx, timeSlot, status] = TODAY_APPOINTMENTS[i];
          const patientId = patientIds[pIdx];
          const doctorId  = doctorIds[dIdx];

          const [[{ cnt }]] = await conn.query(
            "SELECT COUNT(*) as cnt FROM appointments WHERE doctor_id = ? AND date = ? AND status != 'cancelled'",
            [doctorId, today]
          );
          const tokenNumber  = cnt + 1;
          const tokenDisplay = `D${doctorId}-${String(tokenNumber).padStart(3, '0')}`;

          await conn.execute(
            `INSERT INTO appointments
               (patient_id, doctor_id, date, time_slot, token_number, token_display, queue_position, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [patientId, doctorId, today, timeSlot, tokenNumber, tokenDisplay, tokenNumber, status]
          );
        }
      });
      console.log(`Seeded ${TODAY_APPOINTMENTS.length} appointments for today (${today})`);
    }
  }

  const [[{ count: medCount }]] = await db.query('SELECT COUNT(*) as count FROM medicines');
  if (medCount === 0) {
    await db.transaction(async (conn) => {
      for (const [name, generic, category, dosage] of MEDICINES) {
        await conn.execute(
          'INSERT INTO medicines (name, generic_name, category, default_dosage) VALUES (?, ?, ?, ?)',
          [name, generic, category, dosage]
        );
      }
    });
    console.log('Seeded 30 medicines');
  }
};
