// 🔄 api.js — CRUD через localStorage (імітація сервера)

(function () {
  "use strict";

  // 🔹 GET: отримати товари (з localStorage або з App.products)
  async function fetchProducts() {
    const stored = localStorage.getItem("products");
    if (stored) {
      return JSON.parse(stored);
    }
    // Fallback на початкові дані
    return App.products;
  }
  
  // 🔹 Збільшити популярність (з правильною синхронізацією)
  async function incrementPopularity(productId) {
    const products = await fetchProducts();
    const product = products.find((p) => p.id === productId);

    if (product) {
      product.popularity = (product.popularity || 0) + 1;
      localStorage.setItem("products", JSON.stringify(products));

      // 🔹 Синхронізуємо з ГЛОБАЛЬНИМ станом (App.products)
      if (window.App?.products) {
        const globalProduct = App.products.find((p) => p.id === productId);
        if (globalProduct) {
          globalProduct.popularity = product.popularity;
        }
      }

      // 🔹 Синхронізуємо з currentProducts (для графіків)
      if (window.App?.state?.currentProducts) {
        const currentProduct = App.state.currentProducts.find(
          (p) => p.id === productId,
        );
        if (currentProduct) {
          currentProduct.popularity = product.popularity;
        }
      }
    }
  }
  // 🔹 POST: додати товар (тільки адмін)
  async function createProduct(productData) {
    if (!Auth.isAdmin()) throw new Error("❌ Потрібні права адміністратора");

    const products = await fetchProducts();
    const newProduct = {
      id: Date.now(),
      ...productData,
      popularity: 0,
      createdAt: new Date().toISOString(),
    };
    products.push(newProduct);
    localStorage.setItem("products", JSON.stringify(products));
    return newProduct;
  }

  // 🔹 PUT: оновити товар
  async function updateProduct(id, updates) {
    if (!Auth.isAdmin()) throw new Error("❌ Доступ заборонено");

    const products = await fetchProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Товар не знайдено");

    products[index] = {
      ...products[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem("products", JSON.stringify(products));
    return products[index];
  }

  // 🔹 DELETE: видалити товар
  async function deleteProduct(id) {
    if (!Auth.isAdmin()) throw new Error("❌ Доступ заборонено");

    const products = await fetchProducts();
    const filtered = products.filter((p) => p.id !== id);
    if (filtered.length === products.length)
      throw new Error("Товар не знайдено");

    localStorage.setItem("products", JSON.stringify(filtered));
    return true;
  }

  // 🔹 Експорт
  window.API = {
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    incrementPopularity,
  };
})();
