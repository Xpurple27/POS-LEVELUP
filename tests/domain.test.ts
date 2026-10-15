import test from "node:test";
import assert from "node:assert/strict";
import { calculateTotal } from "../src/lib/domain";
import { demoProducts } from "../src/lib/demo";
test("menghitung total rupiah dari katalog", () => {
  assert.equal(
    calculateTotal(
      [
        { product_id: demoProducts[0].id, quantity: 2 },
        { product_id: demoProducts[1].id, quantity: 1 },
      ],
      demoProducts,
    ),
    76000,
  );
});
test("menolak keranjang kosong, menu hilang, menu habis dan kuantitas ilegal", () => {
  assert.throws(() => calculateTotal([], demoProducts));
  assert.throws(() =>
    calculateTotal([{ product_id: "hilang", quantity: 1 }], demoProducts),
  );
  for (const quantity of [0, -1, 1.5, 101])
    assert.throws(() =>
      calculateTotal(
        [{ product_id: demoProducts[0].id, quantity }],
        demoProducts,
      ),
    );
  assert.throws(() =>
    calculateTotal(
      [{ product_id: demoProducts[0].id, quantity: 1 }],
      demoProducts.map((p) => ({ ...p, is_available: false })),
    ),
  );
  assert.throws(() =>
    calculateTotal(
      [
        { product_id: demoProducts[0].id, quantity: 1 },
        { product_id: demoProducts[0].id, quantity: 1 },
      ],
      demoProducts,
    ),
  );
});
