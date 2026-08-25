import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseMojoProductTitle,
  buildMojoColorIdentity,
  getColorSwatch,
  normalizeTurkish,
  slugifyTurkish,
  isCustomMojoTemplate,
  generateAutoSku,
  MOJO_COLOR_PALETTE,
  THEME_SUPPORTED_COLORS,
  COLOR_SWATCHES,
} from '../lib/shopify/mojo.ts';

import { categorizeError, normalizeGraphQLError } from '../lib/shopify/errors.ts';
import { buildInventoryQuantity, validateProductSetInventoryInput } from '../lib/shopify/inventory.ts';

test('isCustomMojoTemplate detects mojo-dynamic and theme templates', () => {
  assert.equal(isCustomMojoTemplate('mojo-dynamic'), true);
  assert.equal(isCustomMojoTemplate('pristine3gozlu'), true);
  assert.equal(isCustomMojoTemplate('pristine-mini-capraz'), true);
  assert.equal(isCustomMojoTemplate('mojo-body-bag'), true);
  assert.equal(isCustomMojoTemplate('mojo-ayarlanabilir-zincir'), true);
  assert.equal(isCustomMojoTemplate(''), false);
  assert.equal(isCustomMojoTemplate('standard'), false);
});

test('Turkish normalization and slugification works accurately', () => {
  assert.equal(normalizeTurkish('  Krem  '), 'krem');
  assert.equal(normalizeTurkish('İPEK OMUZ ÇANTASI'), 'ipek omuz çantası');
  assert.equal(slugifyTurkish('Pristine 3 Gözlü Çapraz Çanta - Krem'), 'pristine-3-gozlu-capraz-canta-krem');
});

test('getColorSwatch returns accurate hex codes for preset and theme colors', () => {
  assert.equal(getColorSwatch('Siyah'), '#000000');
  assert.equal(getColorSwatch('siyah'), '#000000');
  assert.equal(getColorSwatch('Krem'), '#EAE3D6');
  assert.equal(getColorSwatch('krem'), '#EAE3D6');
  assert.equal(getColorSwatch('Taba'), '#B85A2B');
  assert.equal(getColorSwatch('Kırmızı'), '#F61F1F');
  assert.equal(getColorSwatch('BilinmeyenRenk'), '#CCCCCC');
});

test('MOJO_COLOR_PALETTE contains the required standard colors', () => {
  assert.ok(MOJO_COLOR_PALETTE.includes('Siyah'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Beyaz'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Krem'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Ekru'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Bej'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Vizon'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Taba'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Kahverengi'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Kırmızı'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Bordo'));
  assert.ok(MOJO_COLOR_PALETTE.includes('Turuncu'));
});

test('parseMojoProductTitle correctly splits model title and color', () => {
  const result1 = parseMojoProductTitle('Luna Omuz Çantası - Krem');
  assert.equal(result1.modelTitle, 'Luna Omuz Çantası');
  assert.equal(result1.colorName, 'Krem');

  const result2 = parseMojoProductTitle('Pristine 3 Gözlü Çanta - Siyah DR');
  assert.equal(result2.modelTitle, 'Pristine 3 Gözlü Çanta');
  assert.equal(result2.colorName, 'Siyah');
  assert.equal(result2.modelCode, 'DR');

  const result3 = parseMojoProductTitle('Standart Model');
  assert.equal(result3.modelTitle, 'Standart Model');
});

test('generateAutoSku generates non-empty SKU with model and color codes', () => {
  const sku = generateAutoSku('Luna Omuz Çantası', 'Krem');
  assert.ok(sku.startsWith('MJ-LUNA-OMU-') || sku.startsWith('MOJO-'));
  assert.ok(sku.includes('KREM'));
});

test('Inventory helpers build valid payloads without availableQuantity', () => {
  const inv = buildInventoryQuantity('gid://shopify/Location/12345', '20', 'available');
  assert.deepEqual(inv, {
    locationId: 'gid://shopify/Location/12345',
    name: 'available',
    quantity: 20,
  });
  assert.equal('availableQuantity' in (inv || {}), false);
  assert.equal(validateProductSetInventoryInput(inv), true);
  assert.equal(validateProductSetInventoryInput({ locationId: 'loc', availableQuantity: 5 }), false);
});

test('Error normalizer sanitizes raw GraphQL and schema errors', () => {
  const schemaError = 'Variable $input of type ProductSetInput! was provided invalid value for variants.0.inventoryQuantities.0.availableQuantity';
  const clean = normalizeGraphQLError(schemaError);
  assert.equal(clean.includes('Variable $input'), false);
  assert.equal(clean.includes('availableQuantity'), false);
  assert.equal(categorizeError('SKU already taken'), 'SKU kodu zaten kullanımda veya çakışıyor.');
});
