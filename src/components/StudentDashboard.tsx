import React, { useEffect, useState } from "react";
import { getStudentRegistrations, getSubjectById } from "../data/studentsData";

interface Props {
  studentId: string;
  onLogout: () => void;
}

export default function StudentDashboard({ studentId, onLogout }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const registrations = getStudentRegistrations(studentId);

  useEffect(() => {
    let mounted = true;
    async function fetchLogs() {
      try {
        const r = await fetch("/api/logs?limit=500");
        const data = await r.json();
        if (mounted) {
          setRows(data.filter((row: any) => String(row.Student_ID) === String(studentId)));
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (mounted) setLoading(false);
      }
    }
    fetchLogs();
    const id = setInterval(fetchLogs, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [studentId]);

  return (
    <div className="app-shell">
      <div className="page-shell">
        <div className="hero-card toolbar">
          <div>
            <h2 className="hero-title">Student Dashboard</h2>
            <p className="hero-subtitle">See the subjects you are registered in, your absences, and the latest activity.</p>
          </div>
          <button onClick={onLogout}>Logout</button>
        </div>

        <div className="kpi-grid">
          <div className="panel kpi-card">
            <div className="kpi-label">Registered Subjects</div>
            <div className="kpi-value">{registrations.length}</div>
          </div>
          <div className="panel kpi-card">
            <div className="kpi-label">Total Absences</div>
            <div className="kpi-value">{registrations.reduce((total, registration) => total + registration.absenceCount, 0)}</div>
          </div>
          <div className="panel kpi-card">
            <div className="kpi-label">Latest Status</div>
            <div className="kpi-value">{rows[rows.length - 1]?.Emotion || "-"}</div>
          </div>
        </div>

        <div className="panel table-card">
          <div className="section-title">Your registered subjects</div>
          <div className="subject-list">
            {registrations.map((registration) => {
              const subject = getSubjectById(registration.subjectId);
              return (
                <div className="subject-card" key={`${registration.studentId}-${registration.subjectId}`}>
                  <div className="subject-head">
                    <div>
                      <div className="subject-name">{subject?.name || registration.subjectId}</div>
                      <div className="muted">{subject?.schedule} · {subject?.room}</div>
                    </div>
                    <span className="pill">{Math.round(registration.attendanceRate * 100)}% attendance</span>
                  </div>
                  <p className="subject-overview">{subject?.overview}</p>
                  <div className="student-details-grid">
                    <div className="detail-box">
                      <div className="kpi-label">Absences</div>
                      <div className="detail-value">{registration.absenceCount}</div>
                    </div>
                    <div className="detail-box">
                      <div className="kpi-label">Latest Emotion</div>
                      <div className="detail-value">{registration.latestEmotion}</div>
                    </div>
                  </div>
                  <div className="muted" style={{ marginTop: 10 }}>{registration.details}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel table-card">
          <div className="section-title">Recent events for you</div>
          {loading ? <div className="muted">Loading...</div> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Emotion</th>
                    <th>Confidence</th>
                    <th>Lecture</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(-50).reverse().map((r, i) => (
                    <tr key={i}>
                      <td>{r.Time}</td>
                      <td><span className="pill">{r.Emotion}</span></td>
                      <td>{r.Confidence}</td>
                      <td>{r.Lecture_ID}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
