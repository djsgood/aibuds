// Navigation router for the SaaS dashboard.
// This keeps the app multi-page in spirit without reloading the browser.

class AppRouter {
    constructor() {
        this.navItems = Array.from(document.querySelectorAll('.nav-item'));
        this.pages = Array.from(document.querySelectorAll('.page'));
    }

    init() {
        this.navItems.forEach((item) => {
            item.addEventListener('click', () => {
                const targetPage = item.dataset.page;
                this.showPage(targetPage);
            });
        });
    }

    showPage(pageName) {
        const pageIdMap = {
            dashboard: 'dashboardPage',
            leads: 'leadsPage',
            appointments: 'appointmentsPage',
            quotes: 'quotesPage',
            'ai-assistant': 'aiAssistantPage',
            analytics: 'analyticsPage',
            automations: 'automationsPage',
            settings: 'settingsPage',
        };

        const targetPageId = pageIdMap[pageName];

        this.pages.forEach((page) => {
            const isActive = page.id === targetPageId;
            page.classList.toggle('active', isActive);
            page.classList.toggle('hidden', !isActive);
        });

        this.navItems.forEach((item) => {
            item.classList.toggle('active', item.dataset.page === pageName);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const appRouter = new AppRouter();
    appRouter.init();
});
