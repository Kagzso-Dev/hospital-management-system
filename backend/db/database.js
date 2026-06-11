require('dotenv').config();
const mysql = require('mysql2/promise');

let _pool = null;

const cfg = () => ({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
});

const DB_NAME = process.env.DB_NAME || 'hospital_db';

const TABLES = [
  `CREATE TABLE IF NOT EXISTS superadmin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    status ENUM('active','suspended') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL DEFAULT 1,
    patient_id VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    age INT,
    dob DATE,
    gender ENUM('Male','Female','Other'),
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_patient_id (patient_id),
    INDEX idx_tenant (tenant_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL DEFAULT 1,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255),
    phone VARCHAR(20),
    password VARCHAR(255),
    consultation_fee DECIMAL(10,2) DEFAULT 300,
    is_active TINYINT DEFAULT 1,
    INDEX idx_tenant (tenant_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL DEFAULT 1,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    date DATE NOT NULL,
    time_slot VARCHAR(10) NOT NULL,
    token_number INT,
    token_display VARCHAR(20),
    queue_position INT,
    status ENUM('waiting','in_progress','completed','cancelled') DEFAULT 'waiting',
    payment_status ENUM('paid','pending') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_date (date),
    INDEX idx_doctor_date (doctor_id, date),
    INDEX idx_tenant (tenant_id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS prescriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL DEFAULT 1,
    appointment_id INT,
    doctor_id INT NOT NULL,
    patient_id INT NOT NULL,
    diagnosis TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS prescription_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prescription_id INT NOT NULL,
    medicine_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    morning TINYINT DEFAULT 0,
    afternoon TINYINT DEFAULT 0,
    night TINYINT DEFAULT 0,
    duration INT,
    instructions VARCHAR(500),
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS doctor_availability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL DEFAULT 1,
    doctor_id INT NOT NULL,
    date DATE NULL,
    day_of_week TINYINT,
    start_time VARCHAR(10),
    end_time VARCHAR(10),
    slot_duration INT DEFAULT 15,
    is_available TINYINT DEFAULT 1,
    substitute_doctor_id INT NULL,
    INDEX idx_tenant (tenant_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS medicines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL DEFAULT 1,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    category VARCHAR(100),
    default_dosage VARCHAR(100),
    usage_info TEXT,
    side_effects TEXT,
    warnings TEXT,
    INDEX idx_name (name),
    INDEX idx_tenant (tenant_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL DEFAULT 1,
    appointment_id INT NOT NULL,
    patient_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_mode ENUM('cash','upi','card') NOT NULL,
    payment_status ENUM('paid','pending') DEFAULT 'pending',
    transaction_ref VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_appointment (appointment_id),
    INDEX idx_patient (patient_id),
    INDEX idx_tenant (tenant_id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS reception_charges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL DEFAULT 1,
    charge_no VARCHAR(30),
    patient_name VARCHAR(255) NOT NULL,
    patient_code VARCHAR(50),
    label VARCHAR(200) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_mode ENUM('cash','upi','card') NOT NULL,
    transaction_ref VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    INDEX idx_date (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

// Each migration is tried individually; duplicate column/key errors are swallowed
const MIGRATIONS = [
  `ALTER TABLE superadmin ADD COLUMN username VARCHAR(100) UNIQUE`,
  `ALTER TABLE superadmin MODIFY COLUMN email VARCHAR(255) NULL DEFAULT NULL`,
  `UPDATE superadmin SET username = 'superadmin' WHERE username IS NULL`,
  `INSERT IGNORE INTO superadmin (username, password) VALUES ('superadmin', 'superadmin123')`,

  `ALTER TABLE tenants ADD COLUMN username VARCHAR(100) UNIQUE`,
  `ALTER TABLE tenants MODIFY COLUMN email VARCHAR(255) NULL DEFAULT NULL`,

  `ALTER TABLE patients ADD COLUMN tenant_id INT NOT NULL DEFAULT 1`,
  `ALTER TABLE patients ADD INDEX idx_tenant (tenant_id)`,
  `ALTER TABLE doctors ADD COLUMN tenant_id INT NOT NULL DEFAULT 1`,
  `ALTER TABLE doctors ADD COLUMN consultation_fee DECIMAL(10,2) DEFAULT 300`,
  `ALTER TABLE doctors ADD INDEX idx_tenant (tenant_id)`,
  `ALTER TABLE appointments ADD COLUMN tenant_id INT NOT NULL DEFAULT 1`,
  `ALTER TABLE appointments ADD COLUMN payment_status ENUM('paid','pending') DEFAULT 'pending'`,
  `ALTER TABLE appointments ADD INDEX idx_tenant (tenant_id)`,
  `ALTER TABLE prescriptions ADD COLUMN tenant_id INT NOT NULL DEFAULT 1`,
  `ALTER TABLE prescriptions ADD INDEX idx_tenant (tenant_id)`,
  `ALTER TABLE doctor_availability ADD COLUMN tenant_id INT NOT NULL DEFAULT 1`,
  `ALTER TABLE doctor_availability ADD COLUMN substitute_doctor_id INT NULL`,
  `ALTER TABLE doctor_availability ADD INDEX idx_tenant (tenant_id)`,
  `ALTER TABLE medicines ADD COLUMN tenant_id INT NOT NULL DEFAULT 1`,
  `ALTER TABLE medicines ADD COLUMN usage_info TEXT NULL`,
  `ALTER TABLE medicines ADD COLUMN side_effects TEXT NULL`,
  `ALTER TABLE medicines ADD COLUMN warnings TEXT NULL`,
  `ALTER TABLE medicines ADD INDEX idx_tenant (tenant_id)`,
  `ALTER TABLE payments ADD COLUMN tenant_id INT NOT NULL DEFAULT 1`,
  `ALTER TABLE payments ADD INDEX idx_tenant (tenant_id)`,
  `ALTER TABLE prescriptions ADD COLUMN procedure_charge DECIMAL(10,2) DEFAULT 0`,
  `ALTER TABLE prescriptions ADD COLUMN procedure_label VARCHAR(100) DEFAULT NULL`,
  `ALTER TABLE prescriptions ADD COLUMN procedure_paid TINYINT DEFAULT 0`,
  `ALTER TABLE prescriptions ADD COLUMN procedure_payment_mode ENUM('cash','upi','card') NULL`,
  `ALTER TABLE prescriptions ADD COLUMN procedure_paid_at DATETIME NULL`,
  `ALTER TABLE prescriptions ADD COLUMN procedure_receipt_no VARCHAR(30) NULL`,
  `ALTER TABLE tenants ADD COLUMN hospital_name VARCHAR(100) NULL DEFAULT NULL`,
  `ALTER TABLE tenants ADD COLUMN hospital_tagline VARCHAR(100) NULL DEFAULT NULL`,
  `ALTER TABLE tenants ADD COLUMN procedure_charge_enabled TINYINT DEFAULT 0`,
  `ALTER TABLE tenants ADD COLUMN smart_pad_enabled TINYINT DEFAULT 1`,
  `ALTER TABLE tenants ADD COLUMN ocr_enabled TINYINT DEFAULT 1`,
];

async function seedDemo(pool) {
  const [[{ cnt }]] = await pool.query('SELECT COUNT(*) as cnt FROM tenants');
  if (cnt >= 3) return;

  // Clear existing data for clean 3-tenant re-seed
  await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
  for (const tbl of ['payments','prescription_items','prescriptions','appointments','doctor_availability','patients','doctors','medicines','tenants']) {
    await pool.execute(`TRUNCATE TABLE ${tbl}`);
  }
  await pool.execute('SET FOREIGN_KEY_CHECKS = 1');

  const today = new Date().toISOString().slice(0, 10);

  // ── Helper ───────────────────────────────────────────────────────────────
  async function addAvailability(tid, docId, startTime, endTime, slotMin, days) {
    for (const day of days) {
      await pool.execute(
        'INSERT INTO doctor_availability (tenant_id, doctor_id, day_of_week, start_time, end_time, slot_duration, is_available) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [tid, docId, day, startTime, endTime, slotMin]
      );
    }
  }

  async function addPatients(tid, list) {
    const ids = [];
    for (let i = 0; i < list.length; i++) {
      const [nm, ag, gn, ph, addr] = list[i];
      const [r] = await pool.execute(
        'INSERT INTO patients (tenant_id, patient_id, name, age, gender, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [tid, `PAT${String(i + 1).padStart(6, '0')}`, nm, ag, gn, ph, addr]
      );
      ids.push(r.insertId);
    }
    return ids;
  }

  async function addAppointment(tid, pid, did, tok, slot, status) {
    const disp = `D${did}-${String(tok).padStart(3, '0')}`;
    const [r] = await pool.execute(
      'INSERT INTO appointments (tenant_id, patient_id, doctor_id, date, time_slot, token_number, token_display, queue_position, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [tid, pid, did, today, slot, tok, disp, tok, status]
    );
    return r.insertId;
  }

  async function addPrescription(tid, aptId, docId, patId, diagnosis, notes, items) {
    const [r] = await pool.execute(
      'INSERT INTO prescriptions (tenant_id, appointment_id, doctor_id, patient_id, diagnosis, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [tid, aptId, docId, patId, diagnosis, notes]
    );
    for (const [med, dos, am, af, ni, dur, instr] of items) {
      await pool.execute(
        'INSERT INTO prescription_items (prescription_id, medicine_name, dosage, morning, afternoon, night, duration, instructions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [r.insertId, med, dos, am, af, ni, dur, instr]
      );
    }
  }

  async function addPayment(tid, aptId, patId, amount, mode) {
    await pool.execute(
      "INSERT INTO payments (tenant_id, appointment_id, patient_id, amount, payment_mode, payment_status) VALUES (?, ?, ?, ?, ?, 'paid')",
      [tid, aptId, patId, amount, mode]
    );
    await pool.execute("UPDATE appointments SET payment_status = 'paid' WHERE id = ?", [aptId]);
  }

  async function addMedicines(tid, list) {
    for (const [nm, gn, cat, dos, usage] of list) {
      await pool.execute(
        'INSERT INTO medicines (tenant_id, name, generic_name, category, default_dosage, usage_info) VALUES (?, ?, ?, ?, ?, ?)',
        [tid, nm, gn, cat, dos, usage]
      );
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TENANT 1 — Apollo Hospital   (apollo / apollo123)
  // ══════════════════════════════════════════════════════════════════════════
  const [t1r] = await pool.execute("INSERT INTO tenants (name, username, password) VALUES ('Apollo Hospital', 'apollo', 'apollo123')");
  const tid1 = t1r.insertId;

  const [da1] = await pool.execute("INSERT INTO doctors (tenant_id, name, specialization, phone, password, consultation_fee) VALUES (?, 'Dr. Arun Kumar', 'General Medicine', '9876543210', 'doc123', 300)", [tid1]);
  const [da2] = await pool.execute("INSERT INTO doctors (tenant_id, name, specialization, phone, password, consultation_fee) VALUES (?, 'Dr. Priya Sharma', 'Cardiology', '9876543211', 'doc123', 500)", [tid1]);
  const [da3] = await pool.execute("INSERT INTO doctors (tenant_id, name, specialization, phone, password, consultation_fee) VALUES (?, 'Dr. Ravi Menon', 'Orthopedics', '9876543212', 'doc123', 400)", [tid1]);

  await addAvailability(tid1, da1.insertId, '09:00', '17:00', 15, [1,2,3,4,5,6]);
  await addAvailability(tid1, da2.insertId, '09:00', '17:00', 15, [1,2,3,4,5,6]);
  await addAvailability(tid1, da3.insertId, '09:00', '17:00', 15, [1,2,3,4,5]);

  const pids1 = await addPatients(tid1, [
    ['Ravi Raj',      32, 'Male',   '9000000001', 'Chennai'],
    ['Meena Bai',     45, 'Female', '9000000002', 'Coimbatore'],
    ['Suresh Kumar',  28, 'Male',   '9000000003', 'Madurai'],
    ['Lakshmi P',     60, 'Female', '9000000004', 'Trichy'],
    ['Arjun V',       22, 'Male',   '9000000005', 'Salem'],
    ['Kavitha Raj',   38, 'Female', '9000000006', 'Erode'],
  ]);

  await addAppointment(tid1, pids1[0], da1.insertId, 1, '09:00', 'waiting');
  const apt1_1 = await addAppointment(tid1, pids1[1], da1.insertId, 2, '09:15', 'completed');
  const apt1_2 = await addAppointment(tid1, pids1[2], da1.insertId, 3, '09:30', 'completed');
  await addAppointment(tid1, pids1[3], da2.insertId, 1, '09:00', 'in_progress');
  await addAppointment(tid1, pids1[4], da2.insertId, 2, '09:15', 'waiting');
  await addAppointment(tid1, pids1[5], da3.insertId, 1, '09:00', 'waiting');

  await addPrescription(tid1, apt1_1, da1.insertId, pids1[1], 'Viral Fever', 'Rest and drink fluids', [
    ['Paracetamol', '500mg', 1, 1, 1, 3, 'After food'],
    ['Cetirizine',  '10mg',  0, 0, 1, 5, 'At bedtime'],
  ]);
  await addPayment(tid1, apt1_1, pids1[1], 300, 'cash');

  await addPrescription(tid1, apt1_2, da1.insertId, pids1[2], 'Acute Bronchitis', 'Avoid cold drinks, steam inhalation', [
    ['Amoxicillin',  '500mg', 1, 0, 1, 7, 'After food'],
    ['Salbutamol',   '2mg',   1, 1, 1, 5, 'With food'],
    ['Omeprazole',   '20mg',  1, 0, 0, 5, 'Before breakfast'],
  ]);
  await addPayment(tid1, apt1_2, pids1[2], 300, 'upi');

  await addMedicines(tid1, [
    ['Paracetamol',  'Acetaminophen',   'Analgesic',      '500mg', 'Fever and mild pain relief'],
    ['Cetirizine',   'Cetirizine HCl',  'Antihistamine',  '10mg',  'Allergies, runny nose'],
    ['Amoxicillin',  'Amoxicillin',     'Antibiotic',     '500mg', 'Broad-spectrum antibiotic'],
    ['Omeprazole',   'Omeprazole',      'Antacid',        '20mg',  'Reduces stomach acid'],
    ['Metformin',    'Metformin HCl',   'Antidiabetic',   '500mg', 'Controls blood sugar'],
    ['Atorvastatin', 'Atorvastatin',    'Statin',         '10mg',  'Lowers cholesterol'],
    ['Ibuprofen',    'Ibuprofen',       'NSAID',          '400mg', 'Anti-inflammatory, pain'],
    ['Salbutamol',   'Salbutamol',      'Bronchodilator', '2mg',   'Relieves bronchospasm'],
  ]);

  // ══════════════════════════════════════════════════════════════════════════
  // TENANT 2 — City Clinic   (cityclinic / city123)
  // ══════════════════════════════════════════════════════════════════════════
  const [t2r] = await pool.execute("INSERT INTO tenants (name, username, password) VALUES ('City Clinic', 'cityclinic', 'city123')");
  const tid2 = t2r.insertId;

  const [db1] = await pool.execute("INSERT INTO doctors (tenant_id, name, specialization, phone, password, consultation_fee) VALUES (?, 'Dr. Sita Devi', 'Pediatrics', '9123456780', 'doc123', 350)", [tid2]);
  const [db2] = await pool.execute("INSERT INTO doctors (tenant_id, name, specialization, phone, password, consultation_fee) VALUES (?, 'Dr. Mohan Lal', 'Dermatology', '9123456781', 'doc123', 400)", [tid2]);
  const [db3] = await pool.execute("INSERT INTO doctors (tenant_id, name, specialization, phone, password, consultation_fee) VALUES (?, 'Dr. Anjali Singh', 'Gynecology', '9123456782', 'doc123', 450)", [tid2]);

  await addAvailability(tid2, db1.insertId, '10:00', '18:00', 15, [1,2,3,4,5]);
  await addAvailability(tid2, db2.insertId, '10:00', '18:00', 15, [1,2,3,4,5,6]);
  await addAvailability(tid2, db3.insertId, '10:00', '17:00', 20, [1,2,3,4,5]);

  const pids2 = await addPatients(tid2, [
    ['Kumar Singh',   5,  'Male',   '9100000001', 'Delhi'],
    ['Anita Roy',     34, 'Female', '9100000002', 'Mumbai'],
    ['Vikram Das',    50, 'Male',   '9100000003', 'Kolkata'],
    ['Sunita Gupta',  29, 'Female', '9100000004', 'Pune'],
    ['Rahul Sharma',   8, 'Male',   '9100000005', 'Hyderabad'],
  ]);

  const apt2_0 = await addAppointment(tid2, pids2[0], db1.insertId, 1, '10:00', 'completed');
  await addAppointment(tid2, pids2[4], db1.insertId, 2, '10:15', 'waiting');
  await addAppointment(tid2, pids2[1], db2.insertId, 1, '10:00', 'in_progress');
  await addAppointment(tid2, pids2[2], db2.insertId, 2, '10:15', 'waiting');
  const apt2_4 = await addAppointment(tid2, pids2[3], db3.insertId, 1, '10:00', 'completed');

  await addPrescription(tid2, apt2_0, db1.insertId, pids2[0], 'Common Cold', 'Keep warm and stay hydrated', [
    ['Paracetamol',  '250mg', 1, 1, 1, 3, 'After food'],
    ['Amoxicillin',  '250mg', 1, 0, 1, 5, 'After food'],
    ['Cough Syrup',  '5ml',   0, 1, 1, 5, 'After meals'],
  ]);
  await addPayment(tid2, apt2_0, pids2[0], 350, 'upi');

  await addPrescription(tid2, apt2_4, db3.insertId, pids2[3], 'Prenatal Checkup', 'Routine prenatal visit, all normal', [
    ['Folic Acid',   '5mg',  1, 0, 0, 30, 'Morning with water'],
    ['Iron Tablet',  '100mg',0, 0, 1, 30, 'At bedtime with water'],
  ]);
  await addPayment(tid2, apt2_4, pids2[3], 450, 'card');

  await addMedicines(tid2, [
    ['Paracetamol', 'Acetaminophen',     'Analgesic',      '250mg', 'Children dosage for fever'],
    ['Amoxicillin', 'Amoxicillin',       'Antibiotic',     '250mg', 'Pediatric antibiotic'],
    ['Cough Syrup', 'Dextromethorphan',  'Antitussive',    '5ml',   'For dry cough relief'],
    ['Clotrimazole','Clotrimazole',      'Antifungal',     '1% cream','For skin fungal infections'],
    ['Betamethasone','Betamethasone',    'Corticosteroid', '0.1% cream','For skin inflammation'],
    ['Folic Acid',  'Folic Acid',        'Vitamin',        '5mg',   'Essential during pregnancy'],
    ['Iron Tablet', 'Ferrous Sulphate',  'Supplement',     '100mg', 'For iron-deficiency anaemia'],
    ['Cetirizine',  'Cetirizine HCl',   'Antihistamine',  '5mg',   'Paediatric allergy relief'],
  ]);

  // ══════════════════════════════════════════════════════════════════════════
  // TENANT 3 — Green Leaf Hospital   (greenleaf / green123)
  // ══════════════════════════════════════════════════════════════════════════
  const [t3r] = await pool.execute("INSERT INTO tenants (name, username, password) VALUES ('Green Leaf Hospital', 'greenleaf', 'green123')");
  const tid3 = t3r.insertId;

  const [dc1] = await pool.execute("INSERT INTO doctors (tenant_id, name, specialization, phone, password, consultation_fee) VALUES (?, 'Dr. Farhan Sheikh', 'Neurology', '9234567890', 'doc123', 600)", [tid3]);
  const [dc2] = await pool.execute("INSERT INTO doctors (tenant_id, name, specialization, phone, password, consultation_fee) VALUES (?, 'Dr. Leela Rani', 'Ophthalmology', '9234567891', 'doc123', 450)", [tid3]);
  const [dc3] = await pool.execute("INSERT INTO doctors (tenant_id, name, specialization, phone, password, consultation_fee) VALUES (?, 'Dr. Ganesh Patel', 'Dentistry', '9234567892', 'doc123', 350)", [tid3]);

  await addAvailability(tid3, dc1.insertId, '08:00', '16:00', 20, [0,1,2,3,4,5,6]);
  await addAvailability(tid3, dc2.insertId, '08:00', '16:00', 20, [1,2,3,4,5,6]);
  await addAvailability(tid3, dc3.insertId, '09:00', '17:00', 15, [1,2,3,4,5]);

  const pids3 = await addPatients(tid3, [
    ['Deepak Nair',    42, 'Male',   '9300000001', 'Kochi'],
    ['Saranya M',      26, 'Female', '9300000002', 'Thiruvananthapuram'],
    ['Biju Thomas',    55, 'Male',   '9300000003', 'Thrissur'],
    ['Reshma V',       31, 'Female', '9300000004', 'Kozhikode'],
    ['Manoj Kumar',    47, 'Male',   '9300000005', 'Kannur'],
  ]);

  await addAppointment(tid3, pids3[0], dc1.insertId, 1, '08:00', 'in_progress');
  await addAppointment(tid3, pids3[1], dc1.insertId, 2, '08:20', 'waiting');
  const apt3_2 = await addAppointment(tid3, pids3[2], dc2.insertId, 1, '08:00', 'completed');
  const apt3_3 = await addAppointment(tid3, pids3[3], dc3.insertId, 1, '09:00', 'completed');
  await addAppointment(tid3, pids3[4], dc3.insertId, 2, '09:15', 'waiting');

  await addPrescription(tid3, apt3_2, dc2.insertId, pids3[2], 'Myopia — Right Eye -2.5, Left Eye -2.0', 'Prescribed corrective lenses, review in 6 months', [
    ['Lubricating Eye Drops', '1-2 drops', 1, 1, 1, 30, 'Instil in both eyes'],
  ]);
  await addPayment(tid3, apt3_2, pids3[2], 450, 'card');

  await addPrescription(tid3, apt3_3, dc3.insertId, pids3[3], 'Dental Caries — Upper Molar', 'Filling done, avoid hard foods for 24 hrs', [
    ['Ibuprofen',      '400mg', 1, 1, 1, 3,  'After food for pain'],
    ['Chlorhexidine',  '10ml',  1, 0, 1, 7,  'Rinse for 30 seconds, do not swallow'],
    ['Amoxicillin',    '500mg', 1, 0, 1, 5,  'After food'],
  ]);
  await addPayment(tid3, apt3_3, pids3[3], 350, 'cash');

  await addMedicines(tid3, [
    ['Lubricating Eye Drops','Carboxymethylcellulose','Ophthalmic',     '1-2 drops', 'Dry eyes and eye irritation'],
    ['Timolol Eye Drops',    'Timolol Maleate',       'Ophthalmic',     '1 drop',    'Glaucoma management'],
    ['Gabapentin',           'Gabapentin',            'Anticonvulsant', '300mg',     'Neuropathic pain'],
    ['Levetiracetam',        'Levetiracetam',         'Anticonvulsant', '500mg',     'Epilepsy and seizures'],
    ['Chlorhexidine',        'Chlorhexidine',         'Antiseptic',     '10ml mouthwash','Oral hygiene and gum disease'],
    ['Ibuprofen',            'Ibuprofen',             'NSAID',          '400mg',     'Dental pain relief'],
    ['Amoxicillin',          'Amoxicillin',           'Antibiotic',     '500mg',     'Post-dental procedure infection prevention'],
    ['Clonazepam',           'Clonazepam',            'Anticonvulsant', '0.5mg',     'Seizure and anxiety management'],
  ]);

  console.log('Demo seeded: 3 tenants — Apollo (6 patients, 3 doctors), City Clinic (5 patients, 3 doctors), Green Leaf (5 patients, 3 doctors)');
}

const db = {
  async init() {
    const temp = await mysql.createConnection(cfg());
    await temp.execute(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await temp.end();

    _pool = mysql.createPool({
      ...cfg(), database: DB_NAME,
      waitForConnections: true, connectionLimit: 10,
      dateStrings: true,
    });

    for (const sql of TABLES) {
      await _pool.execute(sql);
    }

    for (const sql of MIGRATIONS) {
      try { await _pool.execute(sql); } catch (e) {
        if (!e.message.includes('Duplicate') && !e.message.includes('already exists')) throw e;
      }
    }

    await seedDemo(_pool);
    console.log(`Connected to MySQL → ${DB_NAME}`);
  },

  query: (sql, params) => _pool.query(sql, params),
  execute: (sql, params) => _pool.execute(sql, params),

  async transaction(fn) {
    const conn = await _pool.getConnection();
    await conn.beginTransaction();
    try {
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },
};

module.exports = db;
