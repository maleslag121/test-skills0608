import { useState } from 'react';
import { classifyTicket } from './api/client.js';

const EXAMPLES = [
  { label: '退款', text: '我上周买的课程想退款，钱还没到账，请尽快处理。' },
  { label: '登录', text: '忘记登录密码了，手机验证码也收不到，账号进不去。' },
  { label: '咨询', text: '请问你们的营业时间是什么时候？周末也开放吗？' },
];

const CATEGORY_STYLE = {
  财务: { bg: '#fef3c7', color: '#b45309', icon: '💰' },
  账号安全: { bg: '#fee2e2', color: '#b91c1c', icon: '🔐' },
  一般咨询: { bg: '#e0f2fe', color: '#0369a1', icon: '💬' },
};

export default function App() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await classifyTicket(text);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function fillExample(sample) {
    setText(sample);
    setResult(null);
    setError('');
  }

  const style = result ? CATEGORY_STYLE[result.category] ?? CATEGORY_STYLE['一般咨询'] : null;

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-badge">AI 模拟 · 关键词分类</div>
        <h1>智能客服工单分类与摘要</h1>
        <p>提交用户工单文本，系统将自动识别分类、优先级，并生成摘要。</p>
      </header>

      <main className="layout">
        <section className="panel input-panel">
          <h2>提交工单</h2>
          <form onSubmit={handleSubmit}>
            <label htmlFor="ticket-text">工单内容</label>
            <textarea
              id="ticket-text"
              rows={7}
              placeholder="请描述您遇到的问题，例如：退款、登录异常、产品咨询…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="actions">
              <button type="submit" disabled={loading || !text.trim()}>
                {loading ? '分析中…' : '智能分类'}
              </button>
            </div>
          </form>

          <div className="examples">
            <span>快速示例：</span>
            {EXAMPLES.map((ex) => (
              <button key={ex.label} type="button" className="chip" onClick={() => fillExample(ex.text)}>
                {ex.label}
              </button>
            ))}
          </div>

          {error && <div className="error">{error}</div>}
        </section>

        <section className="panel result-panel">
          <h2>分析结果</h2>
          {!result ? (
            <div className="empty">
              <div className="empty-icon">📋</div>
              <p>填写工单内容并点击「智能分类」，结果将显示在这里。</p>
            </div>
          ) : (
            <div className="result-card" style={{ '--accent-bg': style.bg, '--accent-color': style.color }}>
              <div className="result-header">
                <span className="result-icon">{style.icon}</span>
                <div>
                  <div className="result-category">{result.category}</div>
                  <div className="result-priority">
                    优先级：
                    <span className={result.priority === '高' ? 'priority-high' : 'priority-low'}>
                      {result.priority}
                    </span>
                  </div>
                </div>
              </div>

              <div className="result-block">
                <div className="label">摘要（前 10 字）</div>
                <div className="summary">{result.summary || '—'}</div>
              </div>

              <div className="result-block">
                <div className="label">原文</div>
                <div className="original">{result.text}</div>
              </div>
            </div>
          )}

          <aside className="rules">
            <h3>分类规则</h3>
            <ul>
              <li><strong>财务</strong> — 含「退款」「钱」→ 高优先级</li>
              <li><strong>账号安全</strong> — 含「密码」「登录」→ 高优先级</li>
              <li><strong>一般咨询</strong> — 其他情况 → 低优先级</li>
            </ul>
          </aside>
        </section>
      </main>
    </div>
  );
}
