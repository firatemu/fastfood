#!/usr/bin/env node
/** Inject bridge script + data-ff-* hooks into Stitch export HTML. */
import * as cheerio from 'cheerio';

const BRIDGE_TAG =
  '<script src="/stitch-raw/stitch-bridge.js" defer></script>';

export function enrichStitchHtml(html) {
  const $ = cheerio.load(html, { decodeEntities: false });

  $('header button').each((_, el) => {
    const text = $(el).text();
    if (/sepet/i.test(text) || $(el).find('.material-symbols-outlined').text().includes('shopping_bag')) {
      $(el).attr('data-ff-action', 'open-cart');
      if (!$(el).find('[data-ff-cart-count]').length) {
        $(el).append('<span data-ff-cart-count="" class="ml-1"></span>');
      }
    }
  });

  $('header a[data-path="hesabim"], a[data-path="hesabim"] img').each((_, el) => {
    const link = el.tagName === 'a' ? $(el) : $(el).closest('a');
    if (link.length) link.attr('data-ff-action', 'account');
  });

  let productIndex = 0;
  $('main .grid .group, main [class*="grid"] .group.relative').each((_, el) => {
    if ($(el).find('img').length > 0) {
      $(el).attr('data-ff-product-index', String(productIndex));
      productIndex += 1;
    }
  });

  $('button').each((_, el) => {
    const text = $(el).text();
    if (/sepete\s*ekle/i.test(text)) {
      $(el).attr('data-ff-action', 'add-to-cart');
    }
    if (/ödemeyi\s*başlat|ödeme\s*yap|siparişi\s*tamamla/i.test(text)) {
      $(el).attr('data-ff-action', 'checkout-pay');
    }
  });

  if (!$('script[src="/stitch-raw/stitch-bridge.js"]').length) {
    if ($('body').length) {
      $('body').append(BRIDGE_TAG);
    } else {
      return html + BRIDGE_TAG;
    }
  }

  return $.html();
}
