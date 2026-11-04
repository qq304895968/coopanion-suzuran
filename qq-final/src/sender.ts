/** FIFO outgoing messages, voice/text ordering, deduplication and partial failure receipts. */
import type { Logger } from 'cortico/core/types.ts';
import type { QQWorldConfig } from './config.ts';
import type { OneBotDriver } from './driver.ts';
import { buildOutgoing, splitReplyIntoMessages } from './normalize.ts';
import { synthesizeVoice, type RuntimeVoiceCfg } from './voice.ts';

export const SEND_FAILED = '[send failed] ';
export interface QQSenderContext {
  driver: Pick<OneBotDriver, 'callApi'> | null;
  config: QQWorldConfig;
  log: Logger;
  emojiDirAbs: string;
  imageDirsAbs: string[];
  voiceRuntime(): RuntimeVoiceCfg;
  convLabel(address: string): string;
  checkGroupSpeak(address: string): string | null;
  checkAntiLoop(address: string): string | null;
  recordGroupSpeak(address: string): void;
  recordAntiLoop(address: string): void;
  rememberSentMessage(address: string, response: unknown, ids?: string[]): void;
  outgoingImageTransport(): 'path' | 'base64';
}
export interface QQSenderOptions {
  synthesize?: typeof synthesizeVoice;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}
export class QQMessageSender {
  private sendChain: Promise<unknown> = Promise.resolve();
  private readonly dedupSends = new Map<string, { norm: string; ts: number }>();
  constructor(private readonly runtime: () => QQSenderContext, private readonly options: QQSenderOptions = {}) {}

  /** 串行发送队列：一条消息发完再发下一条，语音与随后补发的文字不会交错。 */
  send(address: string, text: string, replyMessageId?: number, atQQs?: number[], voiceRequested = false, voiceText = ''): Promise<string> {
    const run = this.sendChain.then(
      () => this.sendToDirect(address, text, replyMessageId, atQQs, voiceRequested, voiceText),
      () => this.sendToDirect(address, text, replyMessageId, atQQs, voiceRequested, voiceText),
    );
    this.sendChain = run.catch(() => undefined);
    return run;
  }

  private async sendToDirect(address: string, text: string, replyMessageId?: number, atQQs?: number[], voiceRequested = false, voiceText = ''): Promise<string> {
    const context = this.runtime();
    const driver = context.driver;
    if (!driver) return '未连接到 NapCat。';
    // 模型(尤其 DeepSeek)常在回复里把换行写成字面 "\n"(反斜杠+字母n 两字符)。
    // OneBot 会原样发到 QQ 显示成字符,故这里归一化为真实换行符。
    text = text.replace(/\\n/g, '\n');
    const norm = text.replace(/\s+/g, ' ').trim();
    const prev = this.dedupSends.get(address);
    if (prev && prev.norm === norm && (this.options.now ?? Date.now)() - prev.ts < 6000) {
      context.log.info('发送去重：跳过 6s 内同会话相同内容', { address, len: norm.length });
      return '（去重：与刚刚发送的内容相同，已跳过重复发送）';
    }
    const gl = context.checkGroupSpeak(address);
    if (gl) return gl;
    const al = context.checkAntiLoop(address);
    if (al) return al;
    const [kind, idStr] = address.split(':');
    const id = Number(idStr);
    const paramsBase: Record<string, unknown> =
      kind === 'group' ? { message_type: 'group', group_id: id } : { message_type: 'private', user_id: id };
    const wantVoice = context.config.voice.enabled && context.config.voice.tts && voiceRequested;
    const spokenText = voiceText || text;
    let voiceSent = false;
    if (wantVoice) {
      const rec = await (this.options.synthesize ?? synthesizeVoice)(spokenText, address, driver, context.voiceRuntime(), context.log);
      if (rec) {
        // QQ/NapCat 对「引用/@ + 语音」组合段的群聊渲染不稳定：手机端可能只显示
        // 引用头和空白气泡。语音必须单独作为 record 消息发送；引用/@ 仍由文字消息
        // 路径处理，避免把这三类段拼进同一个 send_msg。
        const segs: Array<Record<string, unknown>> = [rec as unknown as Record<string, unknown>];
        try {
          const r: any = await driver.callApi('send_msg', { ...paramsBase, message: segs });
          context.rememberSentMessage(address, r);
          context.recordGroupSpeak(address);
          context.recordAntiLoop(address);
          this.dedupSends.set(address, { norm, ts: (this.options.now ?? Date.now)() });
          voiceSent = true;
          if (!voiceText) return `已向 ${context.convLabel(address)} 发送语音 1 段。`;
        } catch (e) {
          context.log.warn('语音发送失败，回退文字', {
            err: String(e),
            address,
            segs: segs.map((s) => ({ t: (s as { type?: unknown }).type, id: (s.data as { id?: unknown })?.id, hasFile: !!(s.data as { file?: unknown })?.file })),
          });
        }
      } else {
        context.log.warn('TTS 合成失败，回退文字发送');
      }
    }

    const droppedImages: string[] = [];
    const outgoing = buildOutgoing(
      text,
      context.emojiDirAbs,
      context.imageDirsAbs,
      context.outgoingImageTransport(),
      (name) => droppedImages.push(name),
    );
    if (droppedImages.length) {
      context.log.warn('qq_send 图片标记未解析', { address, dropped: droppedImages });
    }
    if (atQQs && atQQs.length) {
      for (const qq of atQQs) outgoing.unshift({ type: 'at', data: { qq } });
    }
    const messages = splitReplyIntoMessages(outgoing, {
      splitBySentence: context.config.splitReplyBySentence,
      sentencesPerMessage: context.config.sentencesPerMessage,
      maxBytes: context.config.maxMessageBytes,
    });
    if (replyMessageId != null && messages.length) {
      messages[0] = [{ type: 'reply', data: { id: String(replyMessageId) } }, ...messages[0]];
    }
    let ok = 0;
    let total = 0;
    const ids: string[] = [];
    for (const segs of messages) {
      const valid = segs.filter((s) => !(s.type === 'text' && !((s.data as { text?: string }).text ?? '').trim()));
      if (!valid.length) continue;
      total++;
      try {
        const r: any = await driver.callApi('send_msg', { ...paramsBase, message: valid });
        ok++;
        context.rememberSentMessage(address, r, ids);
      } catch (e) {
        context.log.warn('发送失败', {
          err: String(e),
          address,
          paramsBase,
          segs: valid.map((s) => ({ t: s.type, id: (s.data as { id?: unknown })?.id, qq: (s.data as { qq?: unknown })?.qq })),
        });
      }
      if (context.config.sendIntervalMs > 0) await (this.options.sleep ?? sleep)(context.config.sendIntervalMs);
    }
    if (ok > 0) {
      context.recordGroupSpeak(address);
      context.recordAntiLoop(address);
      this.dedupSends.set(address, { norm, ts: (this.options.now ?? Date.now)() });
    }
    const tail = ids.length ? `（message_id: ${ids.join(', ')}，可用 #编号 引用回复）` : '';
    const imageWarning = droppedImages.length
      ? `（有 ${droppedImages.length} 个 [图片:] 标记没找到文件，图片未发送：${droppedImages.join('、')}；请把文件放进图片库/额外图片目录，或不要带这个标记）`
      : '';
    const lead = voiceSent ? '已发送语音 1 段，随后补发文字' : `已向 ${context.convLabel(address)} 发送`;
    if (ok < total) {
      // 部分/全部失败：返回明确失败标记，便于 qq_send 识别并真实地报告"未发送"（而非误报"已发送"）。
      return SEND_FAILED + `${lead} ${ok}/${total} 段（有 ${total - ok} 段发送失败，可能因 NapCat 断连或图片获取失败）。${tail}${imageWarning}`;
    }
    return `${lead} ${ok}/${total} 段。${tail}${imageWarning}`;
  }

}

function sleep(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
