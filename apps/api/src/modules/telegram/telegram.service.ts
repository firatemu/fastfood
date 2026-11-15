import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
  Optional,
} from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';
import type { OrderDto } from '../order/order.service.js';

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  title?: string;
  type: string;
}

interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  my_chat_member?: {
    chat: TelegramChat;
    new_chat_member: {
      status: string;
      user: TelegramUser;
    };
  };
}

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private isPolling = false;
  private abortController: AbortController | null = null;
  private lastUpdateId = 0;

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  private get token(): string | null {
    return process.env.TELEGRAM_BOT_TOKEN || null;
  }

  private get isEnabled(): boolean {
    return process.env.TELEGRAM_ENABLED === 'true' && Boolean(this.token);
  }

  private get defaultChatId(): string | null {
    return process.env.TELEGRAM_DEFAULT_CHAT_ID || null;
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.log('Telegram order notification service is disabled.');
      return;
    }
    this.logger.log('Starting Telegram polling worker...');
    this.startPolling();
  }

  onModuleDestroy(): void {
    this.isPolling = false;
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Sends an order notification to the assigned branch's Telegram group.
   */
  async sendOrderNotification(order: OrderDto): Promise<boolean> {
    if (!this.isEnabled || !this.token) {
      return false;
    }

    try {
      let targetChatId = this.defaultChatId;
      let branchName = 'Şube';

      if (order.branchId && this.prisma) {
        const branch = await this.prisma.branch.findUnique({
          where: { id: order.branchId },
          select: { name: true, code: true, telegramChatId: true },
        });

        if (branch) {
          branchName = branch.name;
          if (branch.telegramChatId) {
            targetChatId = branch.telegramChatId;
          }
        }
      }

      if (!targetChatId) {
        this.logger.warn(`No target telegram chat found for order ${order.displayNumber || order.id}`);
        return false;
      }

      const text = this.formatOrderMessage(order, branchName);
      const replyMarkup = {
        inline_keyboard: [
          [
            { text: '✅ Siparişi Onayla', callback_data: `tg_appr:${order.id}` },
            { text: '❌ Reddet', callback_data: `tg_rejc:${order.id}` },
          ],
        ],
      };

      const result = await this.callApi<{ message_id: number }>('sendMessage', {
        chat_id: targetChatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });

      if (result) {
        this.logger.log(
          `Telegram order notification sent for #${order.displayNumber || order.id} to chat ${targetChatId}`,
        );
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Failed to send Telegram order notification', error);
      return false;
    }
  }

  private formatOrderMessage(order: OrderDto, branchName: string): string {
    const isPickup = order.fulfillmentMode === 'PICKUP';
    const fulfillmentLabel = isPickup ? '🏃 GEL-AL SİPARİŞİ' : '🛵 ADRESE TESLİMAT';

    const customerName = order.customer?.displayName || 'Değerli Müşteri';
    const customerPhone = order.customer?.phone ? `(${order.customer.phone})` : '';

    let addressLine = 'Belirtilmedi';
    if (isPickup) {
      addressLine = `Şubeden Teslim Alınacak (${branchName})`;
    } else if (order.deliveryAddressJson?.line1) {
      addressLine = order.deliveryAddressJson.line1;
    }

    const itemsFormatted = (order.items || [])
      .map((item) => {
        let line = `🍔 <b>${item.quantity}x ${escapeHtml(item.productNameSnapshot)}</b>`;
        const modifiers = item.modifiers || [];
        const removals = item.removals || [];

        if (modifiers.length > 0) {
          line += '\n' + modifiers.map((m) => `   ➕ <i>${escapeHtml(m.nameSnapshot)}</i>`).join('\n');
        }
        if (removals.length > 0) {
          line += '\n' + removals.map((r) => `   ➖ <i>Çıkarılan: ${escapeHtml(r.nameSnapshot)}</i>`).join('\n');
        }
        return line;
      })
      .join('\n\n');

    const amountFormatted = (Number(order.finalPayableMinor || 0n) / 100).toFixed(2);
    const paymentLabel = order.status === 'PAID' || order.status === 'BRANCH_ASSIGNED'
      ? '✅ Online Ödendi (İyzico)'
      : '💵 Kapıda Ödeme / Bekleniyor';

    let message = `🔥 <b>YENİ SİPARİŞ — ${escapeHtml(branchName.toUpperCase())}</b>\n\n`;
    message += `📦 <b>Sipariş No:</b> <code>#${escapeHtml(order.displayNumber || order.id.slice(0, 8))}</code>\n`;
    message += `🏷️ <b>Tür:</b> ${fulfillmentLabel}\n`;
    message += `👤 <b>Müşteri:</b> ${escapeHtml(customerName)} ${customerPhone}\n`;
    message += `📍 <b>Adres:</b> ${escapeHtml(addressLine)}\n`;

    if (order.deliveryNote) {
      message += `📝 <b>Not:</b> <i>${escapeHtml(order.deliveryNote)}</i>\n`;
    }

    message += `\n━━━━━━━━━━━━━━━━━━━━\n${itemsFormatted}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `💰 <b>Toplam Tutar:</b> ${amountFormatted} ₺\n`;
    message += `💳 <b>Ödeme:</b> ${paymentLabel}`;

    return message;
  }

  private async startPolling(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;

    while (this.isPolling) {
      try {
        this.abortController = new AbortController();
        const url = `https://api.telegram.org/bot${this.token}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=15`;
        const res = await fetch(url, { signal: this.abortController.signal });

        if (!res.ok) {
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }

        const data = (await res.json()) as { ok: boolean; result: TelegramUpdate[] };
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
            await this.handleUpdate(update);
          }
        }
      } catch (err: unknown) {
        if (!this.isPolling) break;
        if ((err as Error)?.name !== 'AbortError') {
          this.logger.debug(`Telegram poll error: ${(err as Error)?.message}`);
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    try {
      if (update.my_chat_member) {
        const { chat, new_chat_member } = update.my_chat_member;
        if (new_chat_member.status === 'member' || new_chat_member.status === 'administrator') {
          this.logger.log(`Bot added to group "${chat.title}" (${chat.id})`);
          await this.sendMessage(
            chat.id,
            `👋 <b>Merhaba ${escapeHtml(chat.title || 'Ekip')}!</b>\n\n` +
              `Burger Home Sipariş Botu gruba katıldı.\n` +
              `Bu grubu bir şubeyle eşleştirmek için lütfen şu komutu bu gruba yazın:\n` +
              `<code>/bagla ŞUBE_KODU</code> (Örn: <code>/bagla ADA-T-OZAL</code> veya <code>/bagla IST-DT</code>)\n\n` +
              `Mevcut şube kodlarını görmek için <code>/subeler</code> yazabilirsiniz.`,
          );
        }
      } else if (update.message?.text) {
        await this.handleTextMessage(update.message);
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      }
    } catch (err) {
      this.logger.error('Error handling Telegram update', err);
    }
  }

  private async handleTextMessage(msg: TelegramMessage): Promise<void> {
    const text = msg.text?.trim() || '';
    const chatId = msg.chat.id;

    if (text.startsWith('/bagla')) {
      const parts = text.split(/\s+/);
      const codeOrSlug = parts[1]?.trim();

      if (!codeOrSlug) {
        await this.sendMessage(
          chatId,
          '⚠️ Lütfen şube kodunu belirtin.\nÖrnek: <code>/bagla ADA-T-OZAL</code> veya <code>/bagla IST-DT</code>',
        );
        return;
      }

      if (msg.chat.type === 'private') {
        await this.sendMessage(
          chatId,
          `⚠️ <b>Dikkat:</b> Bu komutu botun özel sohbetinde çalıştırdınız!\n\n` +
            `Siparişlerin doğrudan <b>şube Telegram grubunuza</b> düşebilmesi için:\n` +
            `1. Şube için açtığınız Telegram grubunu açın (Örn: <b>Burger Home T. Özal</b>).\n` +
            `2. Botu (@burgerhome_siparis_bot) o gruba ekleyin.\n` +
            `3. <code>/bagla ${escapeHtml(codeOrSlug)}</code> komutunu <b>doğrudan o grubun içine</b> yazın.\n\n` +
            `Böylece tüm ekip siparişleri grupta görüp tek tıkla onaylayabilecektir.`,
        );
        return;
      }

      if (!this.prisma) {
        await this.sendMessage(chatId, '❌ Veritabanı bağlantısı mevcut değil.');
        return;
      }

      const branch = await this.prisma.branch.findFirst({
        where: {
          OR: [
            { code: { equals: codeOrSlug, mode: 'insensitive' } },
            { name: { contains: codeOrSlug, mode: 'insensitive' } },
          ],
        },
      });

      if (!branch) {
        await this.sendMessage(
          chatId,
          `❌ "<b>${escapeHtml(codeOrSlug)}</b>" ile eşleşen bir şube bulunamadı.\nMevcut şubeleri görmek için <code>/subeler</code> yazabilirsiniz.`,
        );
        return;
      }

      await this.prisma.branch.update({
        where: { id: branch.id },
        data: { telegramChatId: String(chatId) },
      });

      const groupName = msg.chat.title ? `<b>${escapeHtml(msg.chat.title)}</b> grubu` : 'Bu grup';
      await this.sendMessage(
        chatId,
        `✅ <b>Şube Başarıyla Bağlandı!</b>\n\n📍 <b>Şube:</b> ${escapeHtml(branch.name)} (<code>${branch.code}</code>)\n👥 <b>Bağlanan Grup:</b> ${groupName}\n🆔 <b>Grup ID:</b> <code>${chatId}</code>\n\nBu şubeye düşen tüm yeni siparişler anında buraya iletilecek ve buradan onaylanabilecektir.`,
      );
      return;
    }

    if (text === '/subeler') {
      if (!this.prisma) return;
      const branches = await this.prisma.branch.findMany({
        select: { code: true, name: true, telegramChatId: true },
        orderBy: { name: 'asc' },
      });

      let listText = '📋 <b>BURGER HOME ŞUBELERİ & TELEGRAM DURUMU:</b>\n\n';
      for (const b of branches) {
        const isLinked = Boolean(b.telegramChatId);
        const icon = isLinked ? '🟢' : '⚪';
        const status = isLinked ? `(Bağlı: <code>${b.telegramChatId}</code>)` : '(Bağlı Değil)';
        listText += `${icon} <b>${escapeHtml(b.name)}</b> [<code>${b.code}</code>] ${status}\n`;
      }
      listText += '\n<i>Bir şubeyi gruba bağlamak için o grupta <code>/bagla ŞUBE_KODU</code> yazabilirsiniz.</i>';

      await this.sendMessage(chatId, listText);
      return;
    }

    if (text === '/start' || text === '/yardim') {
      const helpText =
        '🍔 <b>Burger Home Sipariş Bildirim Botu</b>\n\n' +
        'Bu bot, şubelerinize gelen yeni siparişleri anlık olarak gruplarınıza bildirir ve tek tıkla mutfağa onay vermenizi sağlar.\n\n' +
        '<b>Komutlar:</b>\n' +
        '• <code>/bagla ŞUBE_KODU</code> - Bu grubu belirtilen şubeye bağlar.\n' +
        '• <code>/subeler</code> - Tüm şubeleri ve Telegram bağlantı durumlarını listeler.\n' +
        '• <code>/yardim</code> - Yardım mesajını gösterir.';
      await this.sendMessage(chatId, helpText);
    }
  }

  private async handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
    const data = query.data || '';
    const queryId = query.id;
    const fromUser = query.from;
    const msg = query.message;

    if (!data || !msg) return;

    const [action, orderId] = data.split(':');
    if (!orderId) return;

    const userName = fromUser.username ? `@${fromUser.username}` : `${fromUser.first_name || 'Şef'}`;
    const timeStr = new Date().toLocaleTimeString('tr-TR', {
      timeZone: 'Europe/Istanbul',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (action === 'tg_appr') {
      try {
        if (!this.prisma) {
          await this.answerCallback(queryId, '❌ Veritabanı bağlantısı yok.', true);
          return;
        }

        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
          select: { status: true, displayNumber: true },
        });

        if (!order) {
          await this.answerCallback(queryId, '❌ Sipariş bulunamadı.', true);
          return;
        }

        if (order.status !== 'BRANCH_ASSIGNED' && order.status !== 'CREATED' && order.status !== 'PAID') {
          await this.answerCallback(queryId, `⚠️ Bu sipariş zaten "${order.status}" durumunda.`, true);
          return;
        }

        await this.prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: orderId },
            data: { status: 'PREPARING' },
          });
          await tx.orderEvent.create({
            data: {
              orderId,
              eventType: 'OrderStatusChanged',
              fromStatus: order.status,
              toStatus: 'PREPARING',
              actorUserId: null,
              payloadJson: { reason: `telegram_approval_by_${fromUser.id}` },
            },
          });
        });

        await this.answerCallback(queryId, '✅ Sipariş onaylandı, mutfağa iletildi!');

        const updatedText =
          (msg.text || '') +
          `\n\n━━━━━━━━━━━━━━━━━━━━\n` +
          `✅ <b>SİPARİŞ ONAYLANDI & MUTFAKTA HAZIRLANIYOR</b>\n` +
          `👤 <b>Onaylayan:</b> ${escapeHtml(userName)}\n` +
          `⏰ <b>Saat:</b> ${timeStr}`;

        const nextButtons = {
          inline_keyboard: [
            [{ text: '🛵 Kuryeye Teslim Et', callback_data: `tg_rdy:${orderId}` }],
          ],
        };

        await this.editMessage(msg.chat.id, msg.message_id, updatedText, nextButtons);
      } catch (err: unknown) {
        this.logger.warn(`Failed to approve order ${orderId} via Telegram: ${(err as Error)?.message}`);
        await this.answerCallback(queryId, '⚠️ Bu sipariş zaten işlem görmüş veya onaylanamaz.', true);
      }
      return;
    }

    if (action === 'tg_rdy') {
      try {
        if (!this.prisma) {
          await this.answerCallback(queryId, '❌ Veritabanı bağlantısı yok.', true);
          return;
        }

        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
          select: { status: true },
        });

        if (!order) {
          await this.answerCallback(queryId, '❌ Sipariş bulunamadı.', true);
          return;
        }

        if (order.status !== 'PREPARING') {
          await this.answerCallback(queryId, `⚠️ Sipariş durumu "${order.status}", hazır olarak işaretlenemez.`, true);
          return;
        }

        await this.prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: orderId },
            data: { status: 'READY_FOR_COURIER' },
          });
          await tx.orderEvent.create({
            data: {
              orderId,
              eventType: 'OrderStatusChanged',
              fromStatus: 'PREPARING',
              toStatus: 'READY_FOR_COURIER',
              actorUserId: null,
              payloadJson: { reason: `telegram_ready_by_${fromUser.id}` },
            },
          });
        });

        await this.answerCallback(queryId, '🛵 Sipariş hazır olarak işaretlendi!');

        const updatedText =
          (msg.text || '') +
          `\n\n🛵 <b>SİPARİŞ HAZIR — KURYE TESLİMİ BEKLİYOR</b>\n` +
          `👤 <b>İşlem Yapan:</b> ${escapeHtml(userName)}\n` +
          `⏰ <b>Saat:</b> ${timeStr}`;

        await this.editMessage(msg.chat.id, msg.message_id, updatedText, { inline_keyboard: [] });
      } catch (err: unknown) {
        this.logger.warn(`Failed to mark ready order ${orderId} via Telegram: ${(err as Error)?.message}`);
        await this.answerCallback(queryId, '⚠️ Sipariş durumu güncellenemedi.', true);
      }
      return;
    }

    if (action === 'tg_rejc') {
      try {
        if (!this.prisma) {
          await this.answerCallback(queryId, '❌ Veritabanı bağlantısı yok.', true);
          return;
        }

        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
          select: { status: true },
        });

        if (!order) {
          await this.answerCallback(queryId, '❌ Sipariş bulunamadı.', true);
          return;
        }

        await this.prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: orderId },
            data: { status: 'REJECTED' },
          });
          await tx.orderEvent.create({
            data: {
              orderId,
              eventType: 'OrderStatusChanged',
              fromStatus: order.status,
              toStatus: 'REJECTED',
              actorUserId: null,
              payloadJson: { reason: `telegram_rejection_by_${fromUser.id}` },
            },
          });
        });

        await this.answerCallback(queryId, '❌ Sipariş reddedildi.');

        const updatedText =
          (msg.text || '') +
          `\n\n━━━━━━━━━━━━━━━━━━━━\n` +
          `❌ <b>SİPARİŞ REDDEDİLDİ</b>\n` +
          `👤 <b>Reddeden:</b> ${escapeHtml(userName)}\n` +
          `⏰ <b>Saat:</b> ${timeStr}`;

        await this.editMessage(msg.chat.id, msg.message_id, updatedText, { inline_keyboard: [] });
      } catch (err: unknown) {
        this.logger.warn(`Failed to reject order ${orderId} via Telegram: ${(err as Error)?.message}`);
        await this.answerCallback(queryId, '⚠️ Bu sipariş zaten işlem görmüş.', true);
      }
      return;
    }
  }

  private async sendMessage(chatId: string | number, text: string): Promise<boolean> {
    return Boolean(
      await this.callApi('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    );
  }

  private async editMessage(
    chatId: string | number,
    messageId: number,
    text: string,
    replyMarkup?: { inline_keyboard: unknown[] },
  ): Promise<boolean> {
    return Boolean(
      await this.callApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    );
  }

  private async answerCallback(queryId: string, text: string, showAlert = false): Promise<boolean> {
    return Boolean(
      await this.callApi('answerCallbackQuery', {
        callback_query_id: queryId,
        text,
        show_alert: showAlert,
      }),
    );
  }

  private async callApi<T = unknown>(method: string, body: Record<string, unknown>): Promise<T | null> {
    if (!this.token) return null;
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
      if (!data.ok) {
        this.logger.error(`Telegram API error on ${method}: ${data.description}`);
        return null;
      }
      return (data.result ?? null) as T | null;
    } catch (err) {
      this.logger.error(`Telegram network error on ${method}`, err);
      return null;
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
