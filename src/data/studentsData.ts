import studentsCsvText from "../../students.csv?raw";

export interface StudentRecord {
  id: string;
  name: string;
  photoLink: string;
  password: string;
}

export interface SubjectRecord {
  id: string;
  name: string;
  doctorId: string;
  schedule: string;
  room: string;
  overview: string;
}

export interface RegistrationRecord {
  studentId: string;
  subjectId: string;
  absenceCount: number;
  attendanceRate: number;
  latestEmotion: string;
  details: string;
}

function parseStudentsCsv(csvText: string): StudentRecord[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const records = new Map<string, StudentRecord>();

  for (const line of lines.slice(1)) {
    const [studentId, studentName, ...photoParts] = line.split(",");
    const id = (studentId || "").trim();
    const name = (studentName || "").trim();
    const photoLink = photoParts.join(",").trim();

    if (!id || !name) {
      continue;
    }

    if (!records.has(id)) {
      records.set(id, {
        id,
        name,
        photoLink,
        password: "password",
      });
    }
  }

  return Array.from(records.values());
}

function buildRegistrations(students: StudentRecord[]): RegistrationRecord[] {
  const subjectIds = ["SUB-STAT-401", "SUB-DS-210"];
  const emotions = ["Focused", "Neutral", "Happy", "Tired"];

  return students.flatMap((student, index) => {
    const primarySubject = subjectIds[0];
    const secondarySubject = subjectIds[index % subjectIds.length];
    const baseAbsence = index % 6;
    const attendanceRate = Math.max(0.72, 1 - baseAbsence * 0.03);
    const firstEmotion = emotions[index % emotions.length];

    const primaryRegistration: RegistrationRecord = {
      studentId: student.id,
      subjectId: primarySubject,
      absenceCount: baseAbsence,
      attendanceRate: Number(attendanceRate.toFixed(2)),
      latestEmotion: firstEmotion,
      details: `${student.name} is registered for ${primarySubject} and should be monitored for participation trends.`,
    };

    const secondaryRegistration: RegistrationRecord = {
      studentId: student.id,
      subjectId: secondarySubject,
      absenceCount: (baseAbsence + 1) % 5,
      attendanceRate: Number(Math.max(0.7, attendanceRate - 0.04).toFixed(2)),
      latestEmotion: emotions[(index + 1) % emotions.length],
      details: `${student.name} has activity data recorded for ${secondarySubject}.`,
    };

    return secondarySubject === primarySubject
      ? [primaryRegistration]
      : [primaryRegistration, secondaryRegistration];
  });
}

export const doctors = [
  {
    id: "d1",
    name: "Dr Mohamed Fathy",
    email: "dr.mohamed.fathy@example.com",
    password: "password",
  },
];

export const studentsCSV = parseStudentsCsv(studentsCsvText);

export const subjects: SubjectRecord[] = [
  {
    id: "SUB-STAT-401",
    name: "Advanced Statistics",
    doctorId: "d1",
    schedule: "Mon 10:00 AM",
    room: "Hall A",
    overview: "Hypothesis testing, regression, and confidence intervals.",
  },
  {
    id: "SUB-DS-210",
    name: "Data Science Foundations",
    doctorId: "d1",
    schedule: "Wed 12:00 PM",
    room: "Lab 2",
    overview: "Data wrangling, visualization, and basic modeling.",
  },
];

export const registrations = buildRegistrations(studentsCSV);

export function getDoctorSubjects(doctorId: string) {
  return subjects.filter((subject) => subject.doctorId === doctorId);
}

export function getSubjectRegistrations(subjectId: string) {
  return registrations.filter((registration) => registration.subjectId === subjectId);
}

export function getStudentRegistrations(studentId: string) {
  return registrations.filter((registration) => registration.studentId === studentId);
}

export function getSubjectById(subjectId: string) {
  return subjects.find((subject) => subject.id === subjectId);
}

export function getStudentById(studentId: string) {
  return studentsCSV.find((student) => student.id === studentId);
}

export function findStudentByLogin(loginValue: string) {
  const value = loginValue.trim();
  return studentsCSV.find((student) => student.id === value || student.name === value);
}
