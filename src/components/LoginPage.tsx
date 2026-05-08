import React, { useState } from "react";

interface Props {
  onLogin: (email: string, password: string, userType: string) => boolean;
}

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [type, setType] = useState("student");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onLogin(email.trim(), password, type);
    if (!ok) setError("Invalid credentials");
    else setError("");
  };

  return (
    <div className="app-shell">
      <div className="page-shell hero-card auth-card">
        <h2 className="hero-title">AI Classroom — Login</h2>
        <p className="hero-subtitle">Open the student or doctor dashboard by signing in below.</p>
        <form onSubmit={submit} className="login-grid" style={{ marginTop: 20 }}>
          <div className="field">
            <label>{type === "student" ? "Student ID or Arabic Name" : "Doctor Email"}</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={type === "student" ? "231014666 or نور احمد محمد" : "dr.mohamed.fathy@example.com"}
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="field">
            <label>Login as</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="student">Student</option>
              <option value="doctor">Doctor</option>
            </select>
          </div>
          {error && <div className="error-text">{error}</div>}
          <button type="submit">Login</button>
        </form>

        <div className="demo-panel">
          <div className="section-title">Demo accounts</div>
          <div className="demo-grid">
            <div className="demo-card">
              <div className="demo-role">Doctor</div>
              <div className="demo-line">Name: Dr Mohamed Fathy</div>
              <div className="demo-line">Email: dr.mohamed.fathy@example.com</div>
              <div className="demo-line">Password: password</div>
            </div>
            <div className="demo-card">
              <div className="demo-role">Student</div>
              <div className="demo-line">Name: Nour Ahmed Mohamed</div>
              <div className="demo-line">Student ID: 231014666</div>
              <div className="demo-line">Password: password</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
