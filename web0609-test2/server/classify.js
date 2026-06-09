/**
 * 关键词匹配模拟 AI 工单分类与摘要
 */
export function classifyTicket(text) {
  const content = String(text ?? '').trim();

  if (!content) {
    return {
      category: '一般咨询',
      priority: '低',
      summary: '',
      message: '工单内容不能为空',
    };
  }

  let category = '一般咨询';
  let priority = '低';

  if (content.includes('退款') || content.includes('钱')) {
    category = '财务';
    priority = '高';
  } else if (content.includes('密码') || content.includes('登录')) {
    category = '账号安全';
    priority = '高';
  }

  const summary = content.slice(0, 10);

  return { category, priority, summary };
}
