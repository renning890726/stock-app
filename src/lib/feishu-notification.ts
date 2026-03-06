/**
 * 飞书通知工具函数
 * 支持更灵活的消息推送和内容处理
 */

/**
 * 飞书消息配置
 */
export interface FeishuNotificationConfig {
  webhookUrl: string;
  title?: string;
  content: string;
  summary?: string; // 摘要（显示在卡片中）
  color?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple' | 'grey';
  maxLength?: number; // 内容最大长度，默认 1500
}

/**
 * 分割内容为多个块
 */
function splitContent(content: string, maxLength: number): string[] {
  const chunks: string[] = [];

  // 尝试在段落边界分割
  const paragraphs = content.split('\n\n');
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = paragraph;
    } else {
      if (currentChunk) {
        currentChunk += '\n\n' + paragraph;
      } else {
        currentChunk = paragraph;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  // 如果仍然太长，强制分割
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length <= maxLength) {
      finalChunks.push(chunk);
    } else {
      // 强制分割
      for (let i = 0; i < chunk.length; i += maxLength) {
        finalChunks.push(chunk.substring(i, i + maxLength));
      }
    }
  }

  return finalChunks;
}

/**
 * 智能截断内容
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }

  // 尝试在句子边界截断
  const truncated = content.substring(0, maxLength);

  // 查找最后一个句号
  const lastPeriod = truncated.lastIndexOf('。');
  if (lastPeriod > maxLength * 0.8) {
    return truncated.substring(0, lastPeriod + 1) + '\n\n...（内容过长，已截断，请登录系统查看完整内容）';
  }

  // 查找最后一个换行
  const lastNewline = truncated.lastIndexOf('\n');
  if (lastNewline > maxLength * 0.8) {
    return truncated.substring(0, lastNewline) + '\n\n...（内容过长，已截断，请登录系统查看完整内容）';
  }

  // 强制截断
  return truncated + '\n\n...（内容过长，已截断，请登录系统查看完整内容）';
}

/**
 * 发送飞书消息（基础版）
 */
export async function sendFeishuNotification(config: FeishuNotificationConfig): Promise<void> {
  const {
    webhookUrl,
    title = '通知',
    content,
    summary,
    color = 'blue',
    maxLength = 1500,
  } = config;

  // 处理内容长度
  let processedContent = content;

  if (content.length > maxLength) {
    processedContent = truncateContent(content, maxLength);
    console.warn(`[Feishu] Content truncated from ${content.length} to ${processedContent.length} characters`);
  }

  const elements = [];

  // 添加标题
  elements.push({
    tag: "div",
    text: {
      tag: "lark_md",
      content: `## ${title}\n\n`,
    },
  });

  // 添加摘要（如果有）
  if (summary) {
    elements.push({
      tag: "div",
      text: {
        tag: "lark_md",
        content: `**摘要**: ${summary}\n\n`,
      },
    });
  }

  // 添加内容（分割成多个元素）
  const chunks = splitContent(processedContent, 1000); // 每个元素最多 1000 字符
  chunks.forEach((chunk) => {
    elements.push({
      tag: "div",
      text: {
        tag: "lark_md",
        content: chunk,
      },
    });
  });

  // 添加底部提示
  elements.push({
    tag: "div",
    text: {
      tag: "plain_text",
      content: "💡 详细数据请登录系统查看",
    },
  });

  const payload = {
    msg_type: "interactive",
    card: {
      config: {
        wide_screen_mode: true,
      },
      elements,
      header: {
        title: {
          tag: "plain_text",
          content: title,
        },
        template: color,
      },
    },
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`飞书推送失败: ${errorText}`);
  }

  console.log(`[Feishu] Message sent successfully, title: ${title}, content length: ${content.length}`);
}

/**
 * 发送飞书简单消息（文本类型）
 */
export async function sendFeishuSimpleMessage(
  webhookUrl: string,
  content: string
): Promise<void> {
  const payload = {
    msg_type: "text",
    content: {
      text: content,
    },
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`飞书推送失败: ${errorText}`);
  }

  console.log(`[Feishu] Simple message sent successfully, length: ${content.length}`);
}

/**
 * 发送飞书富文本消息（Markdown）
 */
export async function sendFeishuMarkdownMessage(
  webhookUrl: string,
  title: string,
  content: string
): Promise<void> {
  const maxLength = 1500;
  let processedContent = content;

  if (content.length > maxLength) {
    processedContent = truncateContent(content, maxLength);
  }

  const payload = {
    msg_type: "interactive",
    card: {
      config: {
        wide_screen_mode: true,
      },
      header: {
        title: {
          tag: "plain_text",
          content: title,
        },
        template: "blue",
      },
      elements: [
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: processedContent,
          },
        },
        {
          tag: "div",
          text: {
            tag: "plain_text",
            content: "💡 详细数据请登录系统查看",
          },
        },
      ],
    },
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`飞书推送失败: ${errorText}`);
  }

  console.log(`[Feishu] Markdown message sent successfully, title: ${title}, length: ${processedContent.length}`);
}

/**
 * 发送飞书警告消息（红色主题）
 */
export async function sendFeishuAlertMessage(
  webhookUrl: string,
  title: string,
  content: string,
  level: 'warning' | 'error' | 'info' = 'info'
): Promise<void> {
  const colorMap: Record<'warning' | 'error' | 'info', 'orange' | 'red' | 'blue'> = {
    warning: 'orange',
    error: 'red',
    info: 'blue',
  };

  await sendFeishuNotification({
    webhookUrl,
    title,
    content,
    color: colorMap[level],
  });
}
