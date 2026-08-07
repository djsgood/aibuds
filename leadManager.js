// Lead management module for the AIBuds CRM foundation.
// This file keeps the lead data model, modal behavior, and rendering logic in memory only.

const leads = [];

class Lead {
    constructor({
        id,
        createdDate,
        customerName,
        companyName,
        phone,
        email,
        serviceRequested,
        estimatedValue,
        status = 'New',
        notes = '',
    }) {
        this.id = id || this.generateId();
        this.createdDate = createdDate || new Date().toISOString();
        this.customerName = customerName;
        this.companyName = companyName;
        this.phone = phone;
        this.email = email;
        this.serviceRequested = serviceRequested;
        this.estimatedValue = Number(estimatedValue || 0);
        this.status = status;
        this.notes = notes;
    }

    generateId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }

        return `lead-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
}

class LeadManager {
    constructor() {
        this.baseLeadCount = this.getBaseLeadCount();
        this.leads = leads;
        this.modal = document.getElementById('leadModal');
        this.form = document.getElementById('leadForm');
        this.openButton = document.getElementById('openLeadModal');
        this.closeButton = document.getElementById('closeLeadModal');
        this.cancelButton = document.getElementById('cancelLeadModal');
        this.listContainer = document.getElementById('leadList');
        this.totalLeadCounter = document.getElementById('leadCount');
        this.leadCountLabel = document.getElementById('leadCountLabel');
    }

    // Use the existing dashboard value as a base so the total reflects both initial and added leads.
    getBaseLeadCount() {
        const counterValue = document.getElementById('leadCount')?.textContent || '0';
        const numericValue = counterValue.replace(/[^\d]/g, '');
        return Number(numericValue || 0);
    }

    init() {
        this.bindEvents();
        this.renderLeadList();
        this.updateLeadCount();
    }

    // Connect all modal and form events to the lead lifecycle.
    bindEvents() {
        this.openButton.addEventListener('click', () => this.openModal());
        this.closeButton.addEventListener('click', () => this.closeModal());
        this.cancelButton.addEventListener('click', () => this.closeModal());

        this.modal.addEventListener('click', (event) => {
            if (event.target.dataset.close === 'true') {
                this.closeModal();
            }
        });

        this.form.addEventListener('submit', (event) => {
            event.preventDefault();
            const newLead = this.getLeadFromForm();

            if (!newLead) {
                return;
            }

            this.leads.push(newLead);
            this.renderLeadList();
            this.updateLeadCount();
            this.closeModal();
            this.form.reset();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.closeModal();
            }
        });
    }

    openModal() {
        this.modal.classList.remove('hidden');
        this.modal.setAttribute('aria-hidden', 'false');
        const firstInput = this.form.querySelector('input, select, textarea');
        firstInput?.focus();
    }

    closeModal() {
        this.modal.classList.add('hidden');
        this.modal.setAttribute('aria-hidden', 'true');
        this.form.reset();
    }

    // Build a Lead model from the form and validate required fields before saving.
    getLeadFromForm() {
        const formData = new FormData(this.form);
        const leadData = {
            customerName: String(formData.get('customerName') || '').trim(),
            companyName: String(formData.get('companyName') || '').trim(),
            phone: String(formData.get('phone') || '').trim(),
            email: String(formData.get('email') || '').trim(),
            serviceRequested: String(formData.get('serviceRequested') || '').trim(),
            estimatedValue: Number(formData.get('estimatedValue') || 0),
            notes: String(formData.get('notes') || '').trim(),
        };

        if (!leadData.customerName || !leadData.companyName || !leadData.phone || !leadData.email || !leadData.serviceRequested || !leadData.estimatedValue) {
            window.alert('Please fill out all required lead fields before saving.');
            return null;
        }

        return new Lead({
            ...leadData,
            id: this.generateLeadId(),
            createdDate: new Date().toISOString(),
            status: 'New',
        });
    }

    generateLeadId() {
        return `lead-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    }

    // Format values in a clean dashboard-friendly way.
    formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(Number(value || 0));
    }

    getStatusClass(status) {
        const map = {
            New: 'status-new',
            Contacted: 'status-contacted',
            Qualified: 'status-qualified',
            Proposal: 'status-proposal',
            Won: 'status-won',
            Lost: 'status-lost',
        };

        return map[status] || 'status-new';
    }

    // Render each lead card with core CRM fields and a colored badge.
    renderLeadList() {
        if (!this.leads.length) {
            this.listContainer.innerHTML = '<div class="empty-state">No leads yet. Add your first prospect to start recovering revenue.</div>';
            this.leadCountLabel.textContent = '0 active';
            return;
        }

        this.leadCountLabel.textContent = `${this.leads.length} active`;

        this.listContainer.innerHTML = this.leads
            .slice()
            .reverse()
            .map((lead) => {
                return `
                    <article class="lead-item">
                        <div class="lead-main">
                            <h4>${this.escapeHtml(lead.customerName)}</h4>
                            <p>${this.escapeHtml(lead.companyName)}</p>
                        </div>

                        <div class="lead-meta">
                            <span><strong>Service:</strong> ${this.escapeHtml(lead.serviceRequested)}</span>
                            <span><strong>Value:</strong> ${this.formatCurrency(lead.estimatedValue)}</span>
                        </div>

                        <div class="lead-badge-wrap">
                            <span class="lead-status ${this.getStatusClass(lead.status)}">${this.escapeHtml(lead.status)}</span>
                        </div>
                    </article>
                `;
            })
            .join('');
    }

    // Keep the total lead count in sync with the current in-memory list.
    updateLeadCount() {
        const updatedCount = this.baseLeadCount + this.leads.length;
        this.totalLeadCounter.textContent = updatedCount.toLocaleString();
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

// Initialize the CRM foundation once the page is ready.
document.addEventListener('DOMContentLoaded', () => {
    const leadManager = new LeadManager();
    leadManager.init();
});
