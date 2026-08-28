const TELEGRAM_API = 'https://api.telegram.org'

function botUrl(method: string): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN non configurato')
  return `${TELEGRAM_API}/bot${token}/${method}`
}

type InlineKeyboardButton = { text: string; callback_data: string }

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  inlineKeyboard?: InlineKeyboardButton[][]
) {
  const res = await fetch(botUrl('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: inlineKeyboard
        ? { inline_keyboard: inlineKeyboard }
        : undefined,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Telegram sendMessage fallito: ${res.status} ${body}`)
  }
  return res.json()
}

export async function editTelegramMessage(
  chatId: string,
  messageId: number,
  text: string
) {
  const res = await fetch(botUrl('editMessageText'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Telegram editMessageText fallito: ${res.status} ${body}`)
  }
  return res.json()
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
) {
  const res = await fetch(botUrl('answerCallbackQuery'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Telegram answerCallbackQuery fallito: ${res.status} ${body}`)
  }
  return res.json()
}

export function formatBookingAlert(booking: {
  customer_name: string
  customer_phone: string
  party_size: number
  table_label: string
  start_at: string
}): string {
  const date = new Date(booking.start_at)
  const formatted = date.toLocaleString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    `🔔 <b>Nuova richiesta di prenotazione</b>\n\n` +
    `👤 ${booking.customer_name} (${booking.customer_phone})\n` +
    `👥 ${booking.party_size} persone\n` +
    `🪑 ${booking.table_label}\n` +
    `📅 ${formatted}`
  )
}
