import { ApiOrder } from '../../services/api'
import logoImg from '../../assets/logo_imp.png'

const PAYMENT_LABELS: Record<string, string> = {
  PIX: 'Pix',
  CASH: 'Dinheiro',
  DEBIT: 'Cartão Débito',
  CREDIT: 'Cartão Crédito',
}

function fmt(val: number) {
  return `R$ ${val.toFixed(2).replace('.', ',')}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtMaybe(val: string) {
  if (!val) return ''
  const d = new Date(val)
  return isNaN(d.getTime()) ? val : fmtDate(val)
}

export function printThermalOrder(order: ApiOrder, storeName = 'FastFit Store') {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Comanda #${order.id}</title>
  <style>
    @page { size: 58mm 297mm; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; }
    html {
      width: 58mm;
      max-width: 58mm;
      overflow-x: hidden;
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      font-weight: bold;
      color: #000; background: #fff;
      width: 58mm;
      max-width: 58mm;
      padding: 3mm 3mm 10mm;
      overflow-x: hidden;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .center { text-align: center; }
    .bold   { font-weight: 900; }
    .big    { font-size: 14px; font-weight: 900; }
    .small  { font-size: 11px; font-weight: bold; }
    .huge   { font-size: 15px; font-weight: 900; letter-spacing: 1px; }
    .order-num { font-size: 28px; font-weight: 900; letter-spacing: 2px; line-height: 1; }
    .divider       { border-top: 1px dashed #000; margin: 4px 0; }
    .divider-solid { border-top: 2px solid  #000; margin: 4px 0; }
    .divider-dbl   { border-top: 3px double #000; margin: 5px 0; }
    .row { display:flex; justify-content:space-between; align-items:flex-start; gap:2px; margin-top:3px; }
    .row-name { flex:1; word-break:break-word; }
    .row-price { white-space:nowrap; font-weight:900; padding-left:4px; }
    .qty { font-weight:900; margin-right:3px; }
    .tag { display:inline-block; border:2px solid #000; padding:1px 4px; font-size:11px; font-weight:900; }
    .total-blk { background:#000; color:#fff; padding:5px 6px; margin:5px 0; }
    .total-blk .row { color:#fff; }
    .muted { font-size: 11px; font-weight: bold; color: #000; }
    @media screen { body { margin:20px auto; border:1px dashed #ccc; } }
  </style>
</head>
<body>
  <div class="center">
    <img src="${logoImg}" alt="logo" style="max-width:48mm; max-height:40px; display:block; margin:0 auto 4px"/>
    <div class="small" style="margin-top:2px">&#x2605; COMANDA &#x2605;</div>
  </div>

  <div class="divider-solid" style="margin-top:6px"></div>

  <div class="center" style="margin-top:3px">
    <div class="small">PEDIDO</div>
    <div class="order-num">#${order.id}</div>
  </div>

  <div class="divider" style="margin-top:5px"></div>

  <div class="row"><span class="small">Data/Hora:</span><span class="small bold">${fmtDate(order.createdAt)}</span></div>
  <div class="row"><span class="small">Cliente:</span><span class="small bold">${order.userName}</span></div>
  ${order.userPhone ? `<div class="row"><span class="small">Telefone:</span><span class="small bold">${order.userPhone}</span></div>` : ''}
  <div class="row" style="margin-top:5px">
    <span class="small">Tipo:</span>
    <span class="tag">${order.type === 'SCHEDULED'
      ? (order.deliveryAddress ? 'ENCOMENDA — ENTREGA' : 'ENCOMENDA — RETIRADA')
      : (order.type === 'DELIVERY' ? 'DELIVERY' : 'RETIRADA')}</span>
  </div>

  ${order.type === 'SCHEDULED' && order.scheduledDateTime ? `
  <div class="row"><span class="small">Encomenda p/:</span><span class="small bold">${fmtMaybe(order.scheduledDateTime)}</span></div>
  ` : ''}
  ${order.notes && /RETIRADA|Retirada/i.test(order.notes) ? (() => {
    // tentar extrair horário no formato HH:MM dentro das notes
    const m = (order.notes || '').match(/(\d{2}:\d{2})/)
    return m ? `<div class="row"><span class="small">Horário retirada:</span><span class="small bold">${m[1]}</span></div>` : ''
  })() : ''}
  ${order.paymentMethod ? `<div class="row"><span class="small">Pagamento:</span><span class="small bold">${PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</span></div>` : ''}
  ${order.paymentMethod === 'CASH' && order.changeAmount ? `<div class="row"><span class="small">Troco para:</span><span class="small bold">${fmt(order.changeAmount)}</span></div>` : ''}

  ${order.deliveryAddress ? `
  <div class="divider" style="margin-top:6px"></div>
  <div style="margin-top:3px">
    <div class="small bold">ENTREGAR EM:</div>
    <div class="small" style="margin-top:2px">${order.deliveryAddress}</div>
  </div>` : ''}

  <div class="divider-solid" style="margin-top:6px"></div>
  <div class="bold" style="margin-bottom:3px">ITENS</div>

  ${order.items.map(item => {
    let pkgLines = ''
    if (item.packageSelectionsJson) {
      try {
        const sels = JSON.parse(item.packageSelectionsJson)
        pkgLines = sels.map((s: { slotId: number; slotName?: string; productIds: number[]; productNames?: string[] }) => {
          const names = s.productNames && s.productNames.length
            ? s.productNames.join(', ')
            : s.productIds.length + ' item(s)'
          const slotLabel = s.slotName || ('Slot ' + s.slotId)
          return `<div class="muted" style="margin-left:12px">• ${slotLabel}: ${names}</div>`
        }).join('')
      } catch {}
    }
    return `
  <div class="row">
    <div class="row-name">
      <span class="qty">${item.quantity}x</span>${item.productName}
      <div class="muted" style="margin-left:12px">${fmt(item.price)} un.</div>
      ${pkgLines}
    </div>
    <div class="row-price">${fmt(item.subtotal)}</div>
  </div>`
  }).join('')}

  <div class="divider-solid" style="margin-top:6px"></div>

  <div class="total-blk">
    <div class="row">
      <span class="big">TOTAL</span>
      <span class="big">${fmt(order.totalAmount)}</span>
    </div>
  </div>

  ${order.notes ? `
  <div class="divider" style="margin-top:3px"></div>
  <div style="margin-top:3px">
    <div class="small bold">OBS:</div>
    <div class="small" style="margin-top:2px; white-space: pre-wrap;">${order.notes}</div>
  </div>` : ''}

  <div class="divider-dbl" style="margin-top:6px"></div>
  <div class="center small" style="margin-top:3px">Obrigado pela preferencia!</div>
  <div class="center small bold" style="margin-top:2px">${storeName}</div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print()
        window.addEventListener('afterprint', function() { window.close() })
      }, 600)
    }
  </script>
</body>
</html>`

  const w = window.open('', '_blank', 'width=420,height=650,toolbar=0,menubar=0,scrollbars=1')
  if (!w) {
    alert('Permita pop-ups neste site para imprimir a comanda automaticamente.')
    return
  }
  w.document.write(html)
  w.document.close()
}