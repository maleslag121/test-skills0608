import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyTicket } from '../server/classify.js';

describe('classifyTicket', () => {
  it('财务类：含退款或钱', () => {
    const r = classifyTicket('我想申请退款，钱还没到账');
    assert.equal(r.category, '财务');
    assert.equal(r.priority, '高');
    assert.equal(r.summary, '我想申请退款，钱还没');
  });

  it('账号安全类：含密码或登录', () => {
    const r = classifyTicket('登录失败，密码忘记了');
    assert.equal(r.category, '账号安全');
    assert.equal(r.priority, '高');
  });

  it('一般咨询：其他情况', () => {
    const r = classifyTicket('请问营业时间是什么时候');
    assert.equal(r.category, '一般咨询');
    assert.equal(r.priority, '低');
    assert.equal(r.summary, '请问营业时间是什么时');
  });

  it('空内容返回提示', () => {
    const r = classifyTicket('   ');
    assert.ok(r.message);
  });

  it('财务优先于账号安全', () => {
    const r = classifyTicket('登录后想退款');
    assert.equal(r.category, '财务');
  });
});
