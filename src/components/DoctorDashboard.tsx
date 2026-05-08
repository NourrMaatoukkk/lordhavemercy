import React, { useEffect, useState } from "react";
import {
  getDoctorSubjects,
  getSubjectRegistrations,
  getStudentById,
} from "../data/studentsData";

interface Props {
  doctorId: string;
  onLogout: () => void;
}

export default function DoctorDashboard({ doctorId, onLogout }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rosterExpanded, setRosterExpanded] = useState(true);
  const subjects = getDoctorSubjects(doctorId);

  useEffect(() => {
    let mounted = true;
    async function fetchLogs() {
      try {
        const r = await fetch("/api/logs?limit=500");
        const data = await r.json();
        if (mounted) {
          setRows(data);
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
  }, [doctorId]);

  const countByEmotion = rows.reduce((acc: any, r: any) => {
    const e = (r.Emotion || "unknown").toLowerCase();
    acc[e] = (acc[e] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const confidenceValues = rows
    .map((r: any) => {
      const conf = parseFloat(r.Confidence);
      return Number.isFinite(conf) ? conf * 100 : 0;
    })
    .filter((v) => v > 0);

  const confidenceBuckets = Array.from({ length: 10 }, (_, i) => {
    const min = i * 10;
    const max = (i + 1) * 10;
    return {
      range: `${min}-${max}%`,
      count: confidenceValues.filter((v) => v >= min && v < max).length,
    };
  });

  const focusedEmotions = new Set(["happy", "neutral", "surprise"]);
  const distractedEmotions = new Set(["sad", "angry", "fear", "disgust"]);

  const focusMetrics = rows.reduce(
    (acc, row) => {
      const emotion = (row.Emotion || "").toLowerCase();
      const confidence = parseFloat(row.Confidence) || 0;
      if (focusedEmotions.has(emotion)) acc.focused += confidence;
      else if (distractedEmotions.has(emotion)) acc.distracted += confidence;
      else acc.neutral += confidence;
      return acc;
    },
    { focused: 0, distracted: 0, neutral: 0 }
  );

  const totalWeight = focusMetrics.focused + focusMetrics.distracted + focusMetrics.neutral;
  const focusedProb =
    totalWeight > 0 ? ((focusMetrics.focused / totalWeight) * 100).toFixed(1) : "0";
  const distractedProb =
    totalWeight > 0 ? ((focusMetrics.distracted / totalWeight) * 100).toFixed(1) : "0";

  const subjectCards = subjects.map((subject) => {
    const registrations = getSubjectRegistrations(subject.id);
    return {
      ...subject,
      registrations,
    };
  });

  return (
    <div className="app-shell">
      <div className="page-shell">
        <div className="hero-card toolbar">
          <div>
            <h2 className="hero-title">Doctor Dashboard</h2>
            <p className="hero-subtitle">Review student outcomes, emotion trends, and recent events.</p>
          </div>
          <button onClick={onLogout}>Logout</button>
        </div>

        <div className="kpi-grid">
          <div className="panel kpi-card">
            <div className="kpi-label">Samples</div>
            <div className="kpi-value">{rows.length}</div>
          </div>
          <div className="panel kpi-card">
            <div className="kpi-label">Subjects You Teach</div>
            <div className="kpi-value">{subjects.length}</div>
          </div>
          <div className="panel kpi-card">
            <div className="kpi-label">Registered Students</div>
            <div className="kpi-value">{new Set(subjectCards.flatMap((subject) => subject.registrations.map((registration) => registration.studentId))).size}</div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="panel table-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div className="section-title">Your subjects and registered students</div>
              <button
                onClick={() => setRosterExpanded(!rosterExpanded)}
                style={{
                  padding: "6px 12px",
                  background: "rgba(59, 130, 246, 0.18)",
                  border: "1px solid rgba(96, 165, 250, 0.5)",
                  color: "#bfdbfe",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                {rosterExpanded ? "▼ Collapse" : "▶ Expand"}
              </button>
            </div>
            {rosterExpanded && (
              <div className="subject-list">
                {subjectCards.map((subject) => (
                  <div className="subject-card" key={subject.id}>
                    <div className="subject-head">
                      <div>
                        <div className="subject-name">{subject.name}</div>
                        <div className="muted">{subject.id} · {subject.schedule} · {subject.room}</div>
                      </div>
                      <span className="pill">{subject.registrations.length} students</span>
                    </div>
                    <p className="subject-overview">{subject.overview}</p>
                    <div className="student-roster">
                      {subject.registrations.map((registration) => {
                        const student = getStudentById(registration.studentId);
                        return (
                          <div className="roster-row" key={`${subject.id}-${registration.studentId}`}>
                            <div>
                              <div className="roster-name">{student?.name || registration.studentId}</div>
                              <div className="muted">Absences: {registration.absenceCount} · Attendance: {Math.round(registration.attendanceRate * 100)}%</div>
                            </div>
                            <div className="roster-emotion">{registration.latestEmotion}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel stats-card">
            <div className="section-title">Focus metrics</div>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <div>
                <div className="muted">Focused probability</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#22c55e", marginTop: 4 }}>
                  {focusedProb}%
                </div>
              </div>
              <div>
                <div className="muted">Distracted probability</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ef4444", marginTop: 4 }}>
                  {distractedProb}%
                </div>
              </div>
            </div>
          </div>

          <div className="panel stats-card">
            <div className="section-title">Emotion distribution</div>
            <div style={{ marginTop: 12 }}>
              {Object.entries(countByEmotion)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([emotion, count]) => {
                  const maxCount = Math.max(...Object.values(countByEmotion), 1);
                  const barWidth = ((count as number) / maxCount) * 100;
                  return (
                    <div key={emotion} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ textTransform: "capitalize", color: "#dbe7ff" }}>{emotion}</span>
                        <span style={{ color: "#94a3b8" }}>{count}</span>
                      </div>
                      <div style={{ background: "rgba(59, 130, 246, 0.2)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                        <div
                          style={{
                            background: "linear-gradient(90deg, #3b82f6, #22c55e)",
                            height: "100%",
                            width: `${barWidth}%`,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="panel stats-card">
            <div className="section-title">Confidence levels</div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              {confidenceBuckets
                .filter((b) => b.count > 0)
                .map((bucket) => (
                  <div key={bucket.range} style={{ padding: 10, background: "rgba(30, 41, 59, 0.8)", borderRadius: 8 }}>
                    <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{bucket.range}</div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#bfdbfe" }}>{bucket.count}</div>
                  </div>
                ))}
            </div>
          </div>

          <div className="panel table-card">
            <div className="section-title">Latest events</div>
            {loading ? <div className="muted">Loading...</div> : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Time</th>
                      <th>Emotion</th>
                      <th>Confidence</th>
                      <th>Lecture</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(-50).reverse().map((r, i) => (
                      <tr key={i}>
                        <td>{r.Student_ID}</td>
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
    </div>
  );
}
