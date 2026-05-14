// main.js — Глобальний стан + ініціалізація + основна логіка додатку
// 1️ГЛОБАЛЬНИЙ СТАН ДОДАТКУ

window.App = {
    products: [], // Масив товарів (завантажується з data.json)
    news: [], // Масив новин
    deals: [], // Масив акцій (hotDeals)
    state: {
        currentUser: JSON.parse(localStorage.getItem("currentUser")) || null,
        cart: JSON.parse(localStorage.getItem("cart")) || [],
        currentProducts: [], // Відфільтрований список для відображення
        adminMode: false,
    },
};

// ДОПОМІЖНІ ФУНКЦІЇ (повідомлення, адмін-панель, графіки)

// Очищає всі повідомлення про помилки/успіх у формах
function clearMessages() {
    document
        .querySelectorAll(".error-msg")
        .forEach((el) => (el.textContent = ""));
    document.querySelectorAll(".auth-message, .reg-message").forEach((el) => {
        el.className = el.className.split(" ")[0];
        el.textContent = "";
    });
}

/**
 * Показує повідомлення в елементі
 * @param {string} elementId - ID елемента для повідомлення
 * @param {string} type - 'error' або 'success'
 * @param {string} text - Текст повідомлення
 */
function showMessage(elementId, type, text) {
    const el = document.getElementById(elementId);
    if (el) {
        el.className = `${el.className.split(" ")[0]} ${type}`;
        el.textContent = text;
    }
}

// Показує/приховує адмін-панель додавання товару
function updateAdminPanel() {
    const adminPanel = document.getElementById("admin-add-panel");
    if (adminPanel) {
        adminPanel.style.display = Auth.isAdmin() ? "block" : "none";
    }
}

// Показує/приховує опцію "Популярність" в графіках (тільки для адміна)
function updateChartOptions() {
    const popularityOption = document.querySelector(
        '#chart-type-selector option[value="popularity"]',
    );
    if (popularityOption) {
        popularityOption.style.display = Auth.isAdmin() ? "block" : "none";
    }

    // Якщо адмін вийшов і був вибраний графік популярності — переключаємо на pie
    if (!Auth.isAdmin()) {
        const selector = document.getElementById("chart-type-selector");
        if (selector?.value === "popularity") {
            selector.value = "pie";
            renderAnalytics();
        }
    }
}

// ЗАВАНТАЖЕННЯ ДАНИХ З JSON (вимога лабораторної)

/**
 * Завантажує дані з data.json через fetch()
 * При помилці використовує fallback-дані
 */
async function loadData() {
    try {
        const response = await fetch("data.json");
        if (!response.ok) throw new Error("HTTP " + response.status);

        const data = await response.json(); // Розпарсили JSON!

        // Зберегли в глобальний стан
        App.products = data.products || [];
        App.news = data.news || [];
        App.deals = data.hotDeals || [];
        App.state.currentProducts = [...App.products];

        // Ініціалізуємо адміна в localStorage, якщо ще немає
        if (data.adminUser && !localStorage.getItem("users")) {
            localStorage.setItem("users", JSON.stringify([data.adminUser]));
        }

        console.log("✅ Дані завантажено з data.json");
    } catch (error) {
        console.warn(
            "⚠️ Не вдалося завантажити data.json, використовуємо резервні дані",
        );

        // Fallback: мінімальні дані для тесту без сервера
        App.products = [
            {
                id: 1,
                name: "Demo Product",
                price: 1000,
                type: "phone",
                image: "",
                desc: "",
                discount: 0,
                popularity: 0,
            },
        ];
        App.news = [];
        App.deals = [];
        App.state.currentProducts = [...App.products];
    }

    // Після завантаження — рендеримо всі компоненти
    renderProducts(App.state.currentProducts);
    renderCartUI();
    renderNewsSidebar();
    renderCarousel();
    renderAnalytics();
    updateAuthUI();
}

// РЕНДЕР ФУНКЦІЇ (відображення компонентів)

/**
 * Відмальовує сітку товарів з адмін-кнопками (якщо потрібно)
 * @param {Array} productsList - масив товарів для відображення
 */
function renderProducts(productsList) {
    const grid = document.getElementById("product-grid");
    if (!grid) return;
    grid.innerHTML = "";

    productsList.forEach((product) => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.setAttribute("draggable", "true");
        card.ondragstart = (e) => e.dataTransfer.setData("productId", product.id);

        // Базовий HTML картки товару
        let cardHTML = `
            <div class="img-container">
                ${product.discount > 0 ? `<div class="discount-badge">-${product.discount}%</div>` : ""}
                <img src="${product.image}" alt="${product.name}">
            </div>
            <h3>${product.name}</h3>
            <p>Ціна: <strong>${product.price} грн</strong></p>
            <button class="toggle-desc-btn">Показати опис</button>
            <div class="product-desc modal-hidden">${product.desc}</div>
            <button class="add-to-cart-btn" data-id="${product.id}">Додати до кошика</button>
        `;

        // Адмін-кнопки (тільки якщо користувач — адмін!)
        if (Auth.isAdmin()) {
            cardHTML += `
                <div class="admin-actions" style="margin-top:10px; display:flex; gap:5px;">
                    <button class="admin-edit-btn" data-id="${product.id}" 
                        style="background:#404; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">
                        ✏️ Редагувати
                    </button>
                    <button class="admin-delete-btn" data-id="${product.id}"
                        style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">
                        🗑️ Видалити
                    </button>
                </div>
            `;
        }

        card.innerHTML = cardHTML;

        // Перемикання опису товару
        card.querySelector(".toggle-desc-btn").onclick = (e) => {
            const desc = card.querySelector(".product-desc");
            const hidden = desc.classList.toggle("modal-hidden");
            e.target.textContent = hidden ? "Показати опис" : "Сховати опис";
        };

        grid.appendChild(card);
    });

    // Обробники адмін-кнопок (делегування подій)
    if (Auth.isAdmin()) {
        grid.querySelectorAll(".admin-edit-btn").forEach((btn) => {
            btn.onclick = (e) => adminEditProduct(parseInt(e.target.dataset.id));
        });
        grid.querySelectorAll(".admin-delete-btn").forEach((btn) => {
            btn.onclick = (e) => adminDeleteProduct(parseInt(e.target.dataset.id));
        });
    }
}

/**
 * Відмальовує вміст кошика (товари, кількість, сума)
 */
function renderCartUI() {
    const container = document.getElementById("cart-items");
    const totalEl = document.getElementById("cart-total");
    const countEl = document.getElementById("cart-count");
    if (!container) return;

    container.innerHTML = "";
    let total = 0;

    App.state.cart.forEach((item, index) => {
        const sum = item.price * item.quantity;
        total += sum;

        const div = document.createElement("div");
        div.className = "cart-item";
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="${item.image}" width="40" height="40">
                <strong>${item.name}</strong>
            </div>
            <input type="number" min="1" value="${item.quantity}" 
                onchange="window.updateQty(${index}, this.value)" style="width:45px">
            <span>${item.price} грн</span>
            <strong>Сума: ${sum} грн</strong>
            <button onclick="window.deleteItem(${index})" 
                style="color:red; border:none; background:none; cursor:pointer; font-size:1.2rem;">&times;</button>
        `;
        container.appendChild(div);
    });

    totalEl.textContent = total;
    countEl.textContent = App.state.cart.reduce((a, i) => a + i.quantity, 0);
    localStorage.setItem("cart", JSON.stringify(App.state.cart));
}

/**
 * Відмальовує бічну панель новин (сортування за датою)
 */
function renderNewsSidebar() {
    const list = document.getElementById("news-headers-list");
    const btn = document.getElementById("load-more-news");
    if (!list) return;

    // Сортуємо новини: новіші перші
    const sorted = [...App.news].sort(
        (a, b) => new Date(b.date + " " + b.time) - new Date(a.date + " " + a.time),
    );
    const display = sorted.slice(0, newsLimit);

    list.innerHTML = display
        .map(
            (news) => `
        <li onclick="openNews(${news.id})" class="status-${news.status}">
            <div>
                <small>${news.date} ${news.time}</small><br>
                ${news.title}
            </div>
        </li>
    `,
        )
        .join("");

    if (btn)
        btn.textContent =
            newsLimit >= App.news.length ? "Менше новин" : "Більше новин";
}

/**
 * Відмальовує карусель "гарячих пропозицій"
 */
function renderCarousel() {
    const inner = document.getElementById("carousel-inner");
    if (!inner) return;

    inner.innerHTML = App.deals
        .map(
            (deal) => `
        <div class="carousel-item">
            <img src="${deal.image}" alt="${deal.title}">
            <div class="carousel-caption">${deal.title}</div>
        </div>
    `,
        )
        .join("");
}

/**
 * Будує графік на основі обраного типу та поточних даних
 * Типи: pie (категорії), bar (ціни), line (знижки), popularity (популярність)
 */
function renderAnalytics() {
    const ctx = document.getElementById("myChart")?.getContext("2d");
    if (!ctx) return;

    const chartType =
        document.getElementById("chart-type-selector")?.value || "pie";
    const data = App.state.currentProducts;

    // Знищуємо попередній графік перед створенням нового
    if (myChartInstance) {
        myChartInstance.destroy();
        myChartInstance = null;
    }

    let labels, values, color;

    if (chartType === "bar") {
        labels = data.map((p) => p.name);
        values = data.map((p) => p.price);
        color = "rgba(64, 0, 68, 0.7)";
    } else if (chartType === "line") {
        labels = data.map((p) => p.name);
        values = data.map((p) => p.discount);
        color = "rgba(255, 99, 132, 0.5)";
    } else if (chartType === "popularity") {
        // Фільтруємо товари з popularity > 0, сортуємо, беремо топ-5
        const withPopularity = data.filter((p) => (p.popularity || 0) > 0);
        const sorted = withPopularity
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
            .slice(0, 5);

        if (sorted.length === 0) {
            labels = ["Немає даних"];
            values = [0];
            color = "#ccc";
        } else {
            labels = sorted.map((p) => p.name);
            values = sorted.map((p) => p.popularity || 0);
            color = "rgba(255, 99, 132, 0.7)";
        }

        // Створюємо графік популярності (тип 'bar') і виходимо
        myChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Кількість виборів",
                        data: values,
                        backgroundColor: color,
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: "top" },
                },
            },
        });
        return; // ← ВАЖЛИВО: не створювати другий графік!
    } else {
        // pie chart — групуємо за типом товару
        const stats = {};
        data.forEach((p) => (stats[p.type] = (stats[p.type] || 0) + 1));
        labels = Object.keys(stats);
        values = Object.values(stats);
        color = ["#404", "#FF6384", "#36A2EB", "#FFCE56"];
    }

    // Підпис осі залежно від типу графіка
    const chartLabel =
        chartType === "bar"
            ? "Ціна (грн)"
            : chartType === "line"
                ? "Знижка (%)"
                : "Кількість товарів";

    myChartInstance = new Chart(ctx, {
        type: chartType,
        data: {
            labels,
            datasets: [
                {
                    label: chartLabel,
                    data: values,
                    backgroundColor: color,
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: chartType === "pie" ? "bottom" : "top",
                },
            },
        },
    });
}

// АВТОРИЗАЦІЯ: форми, валідація, оновлення інтерфейсу


/**
 * Налаштовує обробники подій для форм входу/реєстрації
 */
function setupAuthForms() {
    // Перемикач вкладок: Вхід ↔ Реєстрація
    document.getElementById("show-register")?.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("login-form").classList.add("modal-hidden");
        document.getElementById("register-form").classList.remove("modal-hidden");
        document.getElementById("show-register").classList.add("active");
        document.getElementById("show-login").classList.remove("active");
        clearMessages();
    });

    document.getElementById("show-login")?.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("register-form").classList.add("modal-hidden");
        document.getElementById("login-form").classList.remove("modal-hidden");
        document.getElementById("show-login").classList.add("active");
        document.getElementById("show-register").classList.remove("active");
        clearMessages();
    });

    // Індикатор складності пароля (live при введенні)
    document
        .getElementById("register-password")
        ?.addEventListener("input", (e) => {
            const result = Auth.validatePassword(e.target.value);
            const indicator = document.getElementById("pwd-strength");
            indicator.className = `password-strength ${e.target.value ? result.strength : ""}`;
        });

    // Форма РЕЄСТРАЦІЇ (детальні помилки)
    document.getElementById("register-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        clearMessages();

        const username = document.getElementById("register-username").value.trim();
        const email = document.getElementById("register-email").value.trim();
        const password = document.getElementById("register-password").value;
        const confirm = document.getElementById("register-confirm").value;

        let hasError = false;

        // Перевірка логіну
        if (username.length < 3) {
            document.getElementById("reg-username-error").textContent =
                "Мінімум 3 символи";
            hasError = true;
        }

        // Перевірка email
        const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
        if (!emailRegex.test(email)) {
            document.getElementById("reg-email-error").textContent =
                "Некоректний email";
            hasError = true;
        }

        // Перевірка пароля (детальні помилки!)
        const pwdResult = Auth.validatePassword(password);
        if (!pwdResult.valid) {
            document.getElementById("reg-password-error").textContent =
                pwdResult.errors.join(", ");
            hasError = true;
        }

        // Перевірка збігу паролів
        if (password !== confirm) {
            document.getElementById("reg-confirm-error").textContent =
                "Паролі не співпадають";
            hasError = true;
        }

        if (hasError) {
            showMessage("register-message", "error", "Виправте помилки");
            return;
        }

        // Успішна реєстрація
        const result = Auth.register(username, email, password);
        showMessage(
            "register-message",
            result.success ? "success" : "error",
            result.message,
        );

        if (result.success) {
            updateAuthUI();
            setTimeout(() => {
                document.getElementById("auth-modal").classList.add("modal-hidden");
                document.getElementById("register-form").reset();
            }, 2000);
        }
    });

    // Форма ВХОДУ (загальні помилки — безпека!)
    document.getElementById("login-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        clearMessages();

        const username = document.getElementById("login-username").value.trim();
        const password = document.getElementById("login-password").value;

        if (!username || !password) {
            showMessage("login-message", "error", "Заповніть усі поля");
            return;
        }

        const result = Auth.login(username, password);
        // Загальне повідомлення — БЕЗ деталей (security best practice)
        showMessage(
            "login-message",
            result.success ? "success" : "error",
            result.message,
        );

        if (result.success) {
            updateAuthUI();
            setTimeout(() => {
                document.getElementById("auth-modal").classList.add("modal-hidden");
                document.getElementById("login-form").reset();
            }, 1500);
        }
    });

    // Закриття модального вікна
    document.getElementById("close-auth")?.addEventListener("click", () => {
        document.getElementById("auth-modal").classList.add("modal-hidden");
        clearMessages();
    });

    // Клік по оверлею закриває модальне вікно
    document.getElementById("auth-modal")?.addEventListener("click", (e) => {
        if (e.target.classList.contains("modal-overlay")) {
            document.getElementById("auth-modal").classList.add("modal-hidden");
            clearMessages();
        }
    });
}

/**
 * Оновлює інтерфейс авторизації (кнопки, адмін-функції)
 */
function updateAuthUI() {
    const authBtn = document.getElementById("auth-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const user = App.state.currentUser;

    if (user) {
        authBtn.textContent = `👤 ${user.username}`;
        authBtn.disabled = true;
        authBtn.style.opacity = "0.7";
        logoutBtn.style.display = "inline-block";
    } else {
        authBtn.textContent = "Увійти";
        authBtn.disabled = false;
        authBtn.style.opacity = "1";
        logoutBtn.style.display = "none";
        authBtn.onclick = () => {
            document.getElementById("auth-modal").classList.remove("modal-hidden");
            clearMessages();
        };
    }

    // Оновлюємо адмін-панель + опції графіків + перемальовуємо товари
    updateAdminPanel();
    updateChartOptions();
    renderProducts(App.state.currentProducts);
}

// ФІЛЬТРИ: категорія, пошук, ціна, сортування

/**
 * Налаштовує обробники подій для фільтрів товарів
 */
function setupFilters() {
    const applyFilters = () => {
        // Фільтр за категорією
        const activeType =
            document.querySelector(".filter-btn.active")?.dataset.type || "all";
        let filtered =
            activeType === "all"
                ? [...App.products]
                : App.products.filter((p) => p.type === activeType);

        // Текстовий пошук
        const query =
            document.getElementById("main-search")?.value.toLowerCase() || "";
        if (query)
            filtered = filtered.filter((p) => p.name.toLowerCase().includes(query));

        // Фільтр за ціною
        const min = parseFloat(document.getElementById("min-price")?.value) || 0;
        const max =
            parseFloat(document.getElementById("max-price")?.value) || Infinity;
        filtered = filtered.filter((p) => p.price >= min && p.price <= max);

        // Сортування
        const sortVal = document.getElementById("sort-select")?.value || "default";
        if (sortVal === "price-asc") filtered.sort((a, b) => a.price - b.price);
        else if (sortVal === "price-desc")
            filtered.sort((a, b) => b.price - a.price);
        else if (sortVal === "name-asc")
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        else if (sortVal === "name-desc")
            filtered.sort((a, b) => b.name.localeCompare(a.name));

        // Оновлюємо стан і перемальовуємо
        App.state.currentProducts = filtered;
        renderProducts(filtered);
        renderAnalytics();
    };

    // Обробники подій для фільтрів
    document
        .querySelector(".search-box button")
        ?.addEventListener("click", applyFilters);

    document.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            document
                .querySelectorAll(".filter-btn")
                .forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            applyFilters();
        });
    });

    document
        .getElementById("sort-select")
        ?.addEventListener("change", applyFilters);
    document
        .getElementById("apply-price-filter")
        ?.addEventListener("click", applyFilters);
}

// КОШИК: додавання, зміна кількості, видалення


/**
 * Додає товар до кошика + оновлює популярність
 * @param {number} productId - ID товару
 */
async function addToCartAdvanced(productId) {
    const product = App.products.find((p) => p.id === productId);
    const existing = App.state.cart.find((item) => item.id === productId);

    if (existing) {
        existing.quantity += 1;
    } else {
        App.state.cart.push({ ...product, quantity: 1 });
    }

    // Оновлюємо популярність (await для асинхронності)
    await API.incrementPopularity(productId);

    renderCartUI();
    renderAnalytics(); // Оновлюємо графіки після зміни популярності
}

/**
 * Змінює кількість товару в кошику (мінімум 1)
 */
window.updateQty = (index, val) => {
    App.state.cart[index].quantity = Math.max(1, parseInt(val) || 1);
    renderCartUI();
};

/**
 * Видаляє товар з кошика за індексом
 */
window.deleteItem = (index) => {
    App.state.cart.splice(index, 1);
    renderCartUI();
};

/**
 * Обробляє оформлення замовлення (перевірка авторизації)
 */
function handleCheckout(e) {
    if (!App.state.currentUser) {
        e.preventDefault();

        // Закриваємо кошик перед відкриттям вікна входу
        const cartModal = document.getElementById("cart-modal");
        cartModal.classList.add("modal-hidden");
        cartModal.style.display = "none";

        alert("⚠️ Для оформлення замовлення необхідно увійти в систему");
        document.getElementById("auth-modal").classList.remove("modal-hidden");
        document.getElementById("show-login").click();
        return false;
    }

    if (App.state.cart.length === 0) {
        alert("Кошик порожній!");
        return;
    }

    alert(`✅ Замовлення відправлено, ${App.state.currentUser.username}!`);
    App.state.cart = [];
    renderCartUI();
}

// АДМІН-ФУНКЦІЇ: CRUD операції (редагувати, видалити, додати)


/**
 * Редагування товару (адмін) — простий варіант з prompt
 */
window.adminEditProduct = async (id) => {
    if (!Auth.isAdmin()) return alert("❌ Доступ заборонено");

    const product = App.products.find((p) => p.id === id);
    if (!product) return alert("❌ Товар не знайдено");

    // Прості prompt для швидкого редагування
    const newName = prompt("Нова назва:", product.name);
    if (newName === null) return;

    const newPrice = prompt("Нова ціна (грн):", product.price);
    if (newPrice === null) return;

    const newDiscount = prompt("Нова знижка (%):", product.discount);
    if (newDiscount === null) return;

    try {
        await API.updateProduct(id, {
            name: newName.trim(),
            price: parseFloat(newPrice),
            discount: parseInt(newDiscount) || 0,
        });

        // Оновити локальні дані та перемалювати
        App.products = await API.fetchProducts();
        App.state.currentProducts = [...App.products];
        renderProducts(App.state.currentProducts);
        renderAnalytics();

        alert("✅ Товар оновлено");
    } catch (error) {
        alert("❌ Помилка: " + error.message);
    }
};

/**
 * Видалення товару (адмін) — з підтвердженням
 */
window.adminDeleteProduct = async (id) => {
    if (!Auth.isAdmin()) return alert("❌ Доступ заборонено");

    const product = App.products.find((p) => p.id === id);
    if (!product) return alert("❌ Товар не знайдено");

    // Підтвердження видалення
    if (
        !confirm(`Видалити "${product.name}"?\n\n⚠️ Цю дію не можна скасувати!`)
    ) {
        return;
    }

    try {
        await API.deleteProduct(id);

        // Оновити локальні дані та перемалювати
        App.products = await API.fetchProducts();
        App.state.currentProducts = [...App.products];
        renderProducts(App.state.currentProducts);
        renderAnalytics();

        alert("✅ Товар видалено");
    } catch (error) {
        alert("❌ Помилка: " + error.message);
    }
};

/**
 * Обробка форми додавання нового товару (адмін)
 */
document
    .getElementById("admin-add-form")
    ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const msg = document.getElementById("admin-add-message");

        try {
            await API.createProduct({
                name: document.getElementById("new-name").value.trim(),
                price: parseFloat(document.getElementById("new-price").value),
                type: document.getElementById("new-type").value,
                desc: document.getElementById("new-desc").value.trim(),
                image:
                    document.getElementById("new-image").value.trim() ||
                    "img/placeholder.jpg",
                discount: parseInt(document.getElementById("new-discount").value) || 0,
            });

            msg.textContent = "✅ Товар додано!";
            msg.style.color = "green";
            e.target.reset();

            // Оновити всі відображення
            App.products = await API.fetchProducts();
            App.state.currentProducts = [...App.products];
            renderProducts(App.state.currentProducts);
            renderAnalytics();
        } catch (error) {
            msg.textContent = "❌ " + error.message;
            msg.style.color = "red";
        }
    });

// ІНШІ ФУНКЦІЇ: новини, карусель, підписка, реклама, scroll-top

/**
 * Відкриває повний текст новини в центральній області
 */
window.openNews = (id) => {
    const news = App.news.find((n) => n.id === id);
    const content = document.getElementById("news-content-area");
    if (!content || !news) return;

    content.innerHTML = `
        <h3>${news.title}</h3>
        <p><small>${news.date} | ${news.time}</small></p>
        <hr>
        <p style="font-size:1.1rem; line-height:1.6;">${news.text}</p>
    `;

    // Мобільна адаптація: прокрутка до контенту
    if (window.innerWidth <= 768) {
        content.scrollIntoView({ behavior: "smooth" });
    }
};

/**
 * Налаштовує підписку на новини (спливаюче вікно)
 */
function setupSubscription() {
    const subWindow = document.getElementById("subscribe-window");
    if (!localStorage.getItem("subscribed") && subWindow) {
        setTimeout(() => subWindow.classList.remove("modal-hidden"), 5000);
    }

    document.getElementById("sub-accept")?.addEventListener("click", () => {
        localStorage.setItem("subscribed", "true");
        subWindow?.classList.add("modal-hidden");
        alert("Дякуємо за підписку!");
    });
    document.getElementById("sub-decline")?.addEventListener("click", () => {
        subWindow?.classList.add("modal-hidden");
    });
}

/**
 * Показує рекламне модальне вікно з таймером
 */
function showAd() {
    const ad = document.createElement("div");
    ad.className = "modal-overlay";
    ad.innerHTML = `
        <div class="modal-content">
            <h3>АКЦІЯ!</h3>
            <p>Тільки сьогодні знижки 20%!</p>
            <p>Закрити через: <strong id="ad-timer">5</strong> сек</p>
            <button id="close-ad" disabled>Закрити</button>
        </div>`;
    document.body.appendChild(ad);

    let timeLeft = 5;
    const interval = setInterval(() => {
        timeLeft--;
        document.getElementById("ad-timer").textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(interval);
            const btn = document.getElementById("close-ad");
            btn.disabled = false;
            btn.onclick = () => ad.remove();
        }
    }, 1000);
}

/**
 * Налаштовує кнопку "Нагору" (з'являється після прокрутки)
 */
function setupScrollTop() {
    const btn = document.getElementById("scroll-top");
    if (!btn) return;

    window.addEventListener("scroll", () => {
        btn.style.display =
            window.scrollY > (document.documentElement.scrollHeight * 2) / 3
                ? "block"
                : "none";
    });
    btn.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Налаштовує Drag & Drop товарів до іконки кошика
 */
function setupDragAndDrop() {
    const cartIconBtn = document.getElementById("cart-btn");
    if (!cartIconBtn) return;

    cartIconBtn.ondragover = (e) => {
        e.preventDefault();
        cartIconBtn.style.transform = "scale(1.2)";
    };
    cartIconBtn.ondragleave = () => {
        cartIconBtn.style.transform = "scale(1)";
    };
    cartIconBtn.ondrop = (e) => {
        e.preventDefault();
        cartIconBtn.style.transform = "scale(1)";
        const id = parseInt(e.dataTransfer.getData("productId"));
        if (id) {
            addToCartAdvanced(id);
            cartIconBtn.style.background = "#28a745";
            setTimeout(() => (cartIconBtn.style.background = ""), 500);
        }
    };
}

// ІНІЦІАЛІЗАЦІЯ ДОДАТКУ (виконується після завантаження DOM)

document.addEventListener("DOMContentLoaded", () => {
    // Завантажуємо дані з JSON (перший крок!)
    loadData();

    // Налаштовуємо форми авторизації
    setupAuthForms();

    // Обробник оформлення замовлення
    document
        .getElementById("checkout-btn")
        ?.addEventListener("click", handleCheckout);

    // Налаштовуємо фільтри товарів
    setupFilters();

    // Делегування для кнопок "Додати до кошика"
    document.getElementById("product-grid")?.addEventListener("click", (e) => {
        const btn = e.target.closest(".add-to-cart-btn");
        if (btn) {
            const id = parseInt(btn.dataset.id);
            addToCartAdvanced(id);
        }
    });

    // Обробники кошика (відкриття/закриття)
    document.getElementById("cart-btn")?.addEventListener("click", () => {
        const modal = document.getElementById("cart-modal");
        modal.classList.remove("modal-hidden");
        modal.style.display = "flex";
        renderCartUI();
    });

    document.getElementById("close-cart")?.addEventListener("click", () => {
        const modal = document.getElementById("cart-modal");
        modal.classList.add("modal-hidden");
        modal.style.display = "none";
    });

    document.getElementById("cart-modal")?.addEventListener("click", (e) => {
        if (e.target.classList.contains("modal-overlay")) {
            const modal = document.getElementById("cart-modal");
            modal.classList.add("modal-hidden");
            modal.style.display = "none";
        }
    });

    // 7. Обробник зміни типу графіка
    const chartSelector = document.getElementById("chart-type-selector");
    if (chartSelector) chartSelector.onchange = renderAnalytics;

    // 8. Ініціалізуємо опції графіків (адмін/користувач)
    updateChartOptions();

    // Налаштовуємо підписку, рекламу, scroll-top
    setupSubscription();
    setTimeout(showAd, 10000);
    setupScrollTop();

    // Налаштовуємо Drag & Drop
    setupDragAndDrop();

    // Обробник кнопки "Більше новин"
    document.getElementById("load-more-news")?.addEventListener("click", () => {
        newsLimit = newsLimit >= App.news.length ? 3 : App.news.length;
        renderNewsSidebar();
    });

    // Обробники каруселі
    let currentSlide = 0;
    document.getElementById("carousel-next")?.addEventListener("click", () => {
        currentSlide = (currentSlide + 1) % App.deals.length;
        document.getElementById("carousel-inner").style.transform =
            `translateX(-${currentSlide * 100}%)`;
    });
    document.getElementById("carousel-prev")?.addEventListener("click", () => {
        currentSlide = (currentSlide - 1 + App.deals.length) % App.deals.length;
        document.getElementById("carousel-inner").style.transform =
            `translateX(-${currentSlide * 100}%)`;
    });

    // 13. Кнопка виходу з акаунту
    document.getElementById("logout-btn")?.addEventListener("click", () => {
        Auth.logout();
        updateAuthUI();
        alert("✅ Ви успішно вийшли з системи");
    });

    console.log("🚀 GadgetHub ініціалізовано!");
});

// ГЛОБАЛЬНІ ЗМІННІ (для зручності в HTML обробниках)
let newsLimit = 3; // Кількість новин для відображення
let myChartInstance = null; // Екземпляр графіка Chart.js
