import { useEffect, useState } from 'react';

function formatClock(date) {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function App() {
  const [health, setHealth] = useState(null);
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('/health')
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'error' }));

    fetch('/api/hello')
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage('Backend unavailable'));
  }, []);

  return (
    <main className="container">
      <h1>kaifa-workflow</h1>
      <p>全栈 CI/CD 流水线模板</p>
      <section className="card clock-card">
        <h2>时钟</h2>
        <p className="clock-display">{formatClock(now)}</p>
      </section>
      <section className="card">
        <h2>Health</h2>
        <pre>{JSON.stringify(health, null, 2)}</pre>
      </section>
      <section className="card">
        <h2>API</h2>
        <p>{message}</p>
      </section>
    </main>
  );
}
