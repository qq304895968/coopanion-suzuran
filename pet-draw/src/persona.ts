/**
 * 从部署的「基础设定」里取人设，而不是让玩家在配置页手填。
 *
 * Coopanion 把当前人设放在 `<部署目录>/workspace/CONSTITUTION.md`：
 * `# 我是谁` 的第一句给名字，`# 性子` 的第一段给性格。
 * 文件不在或读不出时退回 displayName 与空性格；画风仍是独立的一项选择。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface PersonaProfile {
  name: string;
  traits: string;
  source?: string;
}

function section(text: string, heading: string): string {
  const start = text.search(new RegExp(`^#\\s*${heading}\\s*$`, 'm'));
  if (start < 0) return '';
  const body = text.slice(start).replace(/^#.*$/m, '');
  const next = body.search(/^#\s/m);
  return (next >= 0 ? body.slice(0, next) : body).replace(/\n---[\s\S]*$/, '');
}

function firstParagraph(text: string): string {
  return (text.trim().split(/\r?\n\s*\r?\n/)[0] ?? '').replace(/\s+/g, ' ').trim();
}

/** 解析一份 `CONSTITUTION.md` 文本；导出给测试。 */
export function parsePersona(text: string, fallbackName = ''): PersonaProfile {
  const who = section(text, '我是谁');
  const match = /(?:我是|我叫|本名)\s*([^\s，。！？、,.;；:：\n]{1,16})/.exec(who);
  const name = (match?.[1] ?? '').replace(/^(干员|博士|小姐|先生)/, '') || fallbackName;
  let traits = firstParagraph(section(text, '性子') || section(text, '性格'));
  traits = traits.replace(/[。．.!！]+$/, '').slice(0, 80);
  return { name, traits };
}

/** 读部署里的基础设定；不存在时只回 displayName。 */
export function loadPersona(botDir: string, botName: string): PersonaProfile {
  const candidates = [
    join(botDir, 'workspace', 'CONSTITUTION.md'),
    join(botDir, 'workspace', 'CONSTITUTION.seed.md'),
    join(botDir, 'CONSTITUTION.md'),
  ];
  for (const source of candidates) {
    try {
      if (!existsSync(source)) continue;
      const profile = parsePersona(readFileSync(source, 'utf8'), botName);
      return { ...profile, source };
    } catch {
      // 读不出就试下一个位置；最终退回 displayName。
    }
  }
  return { name: botName, traits: '' };
}
