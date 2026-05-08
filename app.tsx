import { useState } from "react";
import LoginPage from "./components/LoginPage";
import DoctorDashboard from "./components/DoctorDashboard";
import StudentDashboard from "./components/StudentDashboard";
import { doctors, studentsCSV } from "./data/studentsData";

type UserType = "doctor" | "student" | null;

interface User {
  id: string;
  name: string;
  type: UserType;
}

function App() {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (email: string, password: string, userType: string) => {
    if (userType === "doctor") {
      const doctor = doctors.find(
        (d) => d.email === email && d.password === password,
      );
      if (doctor) {
        setUser({ id: doctor.id, name: doctor.name, type: "doctor" });
        return true;
      }
    } else {
      const student = studentsCSV.find(
        (s) => s.email === email && s.password === password,
      );
      if (student) {
        setUser({ id: student.id, name: student.name, type: "student" });
        return true;
      }
    }
    return false;
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (user.type === "doctor") {
    return <DoctorDashboard doctorId={user.id} onLogout={handleLogout} />;
  }

  return <StudentDashboard studentId={user.id} onLogout={handleLogout} />;
}

export default App;
