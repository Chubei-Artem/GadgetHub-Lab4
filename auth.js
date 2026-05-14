// auth.js — Авторизація та валідація

(function () {
    'use strict';

    // Перевірка складності пароля
    function validatePassword(pwd) {
        const errors = [];
        let score = 0;

        if (pwd.length < 8) errors.push('мін. 8 символів');
        else score++;
        if (!/[a-z]/.test(pwd)) errors.push('мала літера');
        else score++;
        if (!/[A-Z]/.test(pwd)) errors.push('велика літера');
        else score++;
        if (!/[0-9]/.test(pwd)) errors.push('цифра');
        else score++;

        const strength = score <= 2 ? 'weak' : score <= 3 ? 'medium' : 'strong';
        return { valid: errors.length === 0, strength, errors };
    }

    // Реєстрація
    function register(username, email, password) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');

        if (users.find(u => u.username === username || u.email === email)) {
            return { success: false, message: 'Користувач вже існує' };
        }

        const newUser = {
            id: Date.now(),
            username, email, password,
            role: 'user',
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        // Авто-вхід
        App.state.currentUser = { id: newUser.id, username, email, role: 'user' };
        localStorage.setItem('currentUser', JSON.stringify(App.state.currentUser));

        return { success: true, user: newUser };
    }

    // Авторизація
    function login(username, password) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === username && u.password === password);

        if (!user) {
            return { success: false, message: 'Невірний логін або пароль' };
        }

        App.state.currentUser = { id: user.id, username: user.username, email: user.email, role: user.role };
        localStorage.setItem('currentUser', JSON.stringify(App.state.currentUser));

        return { success: true, user };
    }

    // Вихід
    function logout() {
        App.state.currentUser = null;
        localStorage.removeItem('currentUser');
    }

    // Перевірка адміна
    function isAdmin() {
        return App.state.currentUser?.role === 'admin';
    }

    // Експорт
    window.Auth = {
        validatePassword,
        register,
        login,
        logout,
        isAdmin,
        getCurrentUser: () => App.state.currentUser
    };

})();
