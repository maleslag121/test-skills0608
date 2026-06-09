import { useEffect, useState } from 'react';
import { fetchSchema } from '../api/client.js';

export default function DataDictionary() {
  const [schema, setSchema] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState('orders');

  useEffect(() => {
    fetchSchema()
      .then(setSchema)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <section className="panel data-dict">
        <header className="panel__header">
          <h2 className="panel__title">数据字典</h2>
        </header>
        <p className="data-dict__error">{error}</p>
      </section>
    );
  }

  if (!schema) {
    return (
      <section className="panel data-dict">
        <header className="panel__header">
          <h2 className="panel__title">数据字典</h2>
          <span className="panel__subtitle">加载中…</span>
        </header>
      </section>
    );
  }

  return (
    <section className="panel data-dict">
      <header className="panel__header">
        <div>
          <h2 className="panel__title">数据字典</h2>
          <span className="panel__subtitle">
            {schema.database.engine} · {schema.database.name}
          </span>
        </div>
        <p className="data-dict__desc">{schema.database.description}</p>
      </header>

      <div className="data-dict__tables">
        {schema.tables.map((table) => (
          <div key={table.table} className="data-dict__table-block">
            <button
              type="button"
              className={`data-dict__table-head ${expanded === table.table ? 'open' : ''}`}
              onClick={() => setExpanded(expanded === table.table ? null : table.table)}
            >
              <span className="data-dict__table-name">{table.label}</span>
              <code className="data-dict__table-code">{table.table}</code>
              <span className="data-dict__toggle">{expanded === table.table ? '−' : '+'}</span>
            </button>

            {expanded === table.table && (
              <div className="data-dict__table-body">
                <p className="data-dict__table-desc">{table.description}</p>

                <div className="data-dict__field-table-wrap">
                  <table className="data-dict__field-table">
                    <thead>
                      <tr>
                        <th>表头</th>
                        <th>字段名</th>
                        <th>类型</th>
                        <th>必填</th>
                        <th>填写示例</th>
                        <th>说明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.fields.map((f) => (
                        <tr key={f.column}>
                          <td className="data-dict__header-cell">{f.header}</td>
                          <td><code>{f.column}</code></td>
                          <td>{f.type}</td>
                          <td>{f.required ? '是' : '否'}</td>
                          <td className="data-dict__example">{f.example}</td>
                          <td className="data-dict__note">{f.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {schema.previews?.[table.table] && (
                  <div className="data-dict__preview">
                    <h4>
                      数据预览（共 {schema.previews[table.table].total.toLocaleString('zh-CN')} 条，展示最近 3 条）
                    </h4>
                    <pre>{JSON.stringify(schema.previews[table.table].rows, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
