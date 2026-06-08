import { useEffect, useState } from 'react';

export default function App() {
  const [health, setHealth] = useState(null);
  const [message, setMessage] = useState('');

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
