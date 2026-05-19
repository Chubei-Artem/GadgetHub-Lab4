// api.js — Робота з бекендом (CRUD + Auth)
(function () {
  "use strict";
  const API_URL = "https://backend-for-students-production.up.railway.app/api";
  const MY_CATEGORY = "gadget_hub_ua";

  // Допоміжна функція: отримати заголовки з токеном
  function getHeaders() {
    const headers = { "Content-Type": "application/json" };
    const token = App.state.currentUser?.token;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  // AUTH: Реєстрація на сервері
  async function register(username, email, password) {
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }), // Сервер очікує username, email та password
      });
      const data = await response.json();
      return {
        success: response.ok,
        message: response.ok
          ? "Реєстрація успішна!"
          : data.message || "Користувач вже існує",
      };
    } catch (error) {
      console.warn(
        "⚠️ Бекенд не відповідає, використовуємо локальну реєстрацію",
      );
      return Auth.register(username, email, password);
    }
  }

  // AUTH: Авторизація (Вхід на сервер)
  async function login(username, password) {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // Якщо логін admin - даємо роль admin для сайту, інакше user
        const isAdminUser =
          username === "admin" ||
          username === "gadget_admin" ||
          username === "admin_gadget";

        return {
          success: true,
          user: {
            id: data.userId || Date.now(),
            username,
            role: isAdminUser ? "admin" : "user",
            token: data.token, // токен сервера
          },
        };
      }
      return {
        success: false,
        message: data.message || "Невірний логін або пароль",
      };
    } catch (error) {
      console.warn("⚠️ Сервер не відповідає, спроба локального входу...");
      // Резервний вхід, якщо сервер впав
      if (username.length >= 3 && password.length >= 3) {
        return {
          success: true,
          user: {
            id: Date.now(),
            username: username,
            role: username === "admin" ? "admin" : "user",
            token: "mock-local-token",
          },
        };
      }
      return { success: false, message: "Помилка мережі" };
    }
  }

  // READ: отримати товари з сервера
  async function fetchProducts() {
    try {
      const response = await fetch(
        `${API_URL}/items-query?category=${MY_CATEGORY}`,
      );
      if (!response.ok) throw new Error("HTTP " + response.status);
      return await response.json();
    } catch (error) {
      console.warn("⚠️ Резервне завантаження з локального data.json");
      const fallback = await fetch("data.json");
      const data = await fallback.json();
      return data.products || [];
    }
  }

  // CREATE: додати товар (тільки адмін)
  async function createProduct(productData) {
    if (App.state.currentUser?.role !== "admin") throw new Error("❌ Потрібні права адміністратора");

    // Пакуємо нестандартні поля у серверне поле description
    const packedData = JSON.stringify({
        desc: productData.desc,
        type: productData.type,
        discount: productData.discount
    });

    const response = await fetch(`${API_URL}/items`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        name: productData.name,
        price: productData.price,
        image: productData.image,
        category: MY_CATEGORY,
        description: packedData, // Відправляємо запакований текст
        popularity: 0,
      }),
    });

    if (!response.ok) throw new Error("Помилка додавання на сервер");
    return await response.json();
  }

  // UPDATE: оновити товар (тільки admin)
  async function updateProduct(id, updates) {
    if (App.state.currentUser?.role !== "admin") throw new Error("❌ Доступ заборонено");

    const current = await fetchProducts();
    const existing = current.find((p) => p._id === id || p.id === id);
    if (!existing) throw new Error("Товар не знайдено");

    // Відновлюємо старі запаковані дані
    let extra = {};
    try { extra = JSON.parse(existing.description); } catch(e) { extra = { desc: existing.description }; }
    
    // Якщо при редагуванні передали нові знижки чи опис - оновлюємо їх
    if (updates.discount !== undefined) extra.discount = updates.discount;
    if (updates.desc !== undefined) extra.desc = updates.desc;

    const serverId = existing._id || id;
    const response = await fetch(`${API_URL}/items/${serverId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        name: updates.name || existing.name,
        price: updates.price || existing.price,
        image: updates.image || existing.image,
        category: MY_CATEGORY,
        description: JSON.stringify(extra) // Пакуємо назад
      }),
    });

    if (!response.ok) throw new Error("Помилка оновлення на сервері");
    return await response.json();
  }

  // DELETE: видалити товар (тільки admin)
  async function deleteProduct(id) {
    if (App.state.currentUser?.role !== "admin")
      throw new Error("❌ Доступ заборонено");

    const current = await fetchProducts();
    const existing = current.find((p) => p._id === id || p.id === id);
    if (!existing) throw new Error("Товар не знайдено");

    const serverId = existing._id || id;
    const response = await fetch(`${API_URL}/items/${serverId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    if (!response.ok) throw new Error("Помилка видалення з сервера");
    return true;
  }

  // Збільшити популярність
  async function incrementPopularity(productId) {
    if (window.App?.state?.currentProducts) {
      const product = App.state.currentProducts.find(
        (p) => p._id === productId || p.id === productId,
      );
      if (product) product.popularity = (product.popularity || 0) + 1;
    }
  }

  // Експорт
  window.API = {
    register,
    login,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    incrementPopularity,
  };
})();
