// Lead management module for the AIBuds CRM foundation.
// This file keeps the lead data model, modal behavior, rendering, and detail panel logic in memory only.

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
        this.selectedLeadId = null;
        this.modal = document.getElementById('leadModal');
        this.form = document.getElementById('leadForm');
        this.openButton = document.getElementById('openLeadModal');
        this.closeButton = document.getElementById('closeLeadModal');
        this.cancelButton = document.getElementById('cancelLeadModal');
        this.listContainer = document.getElementById('leadList');
        this.totalLeadCounter = document.getElementById('leadCount');
        this.leadCountLabel = document.getElementById('leadCountLabel');
        this.detailsPanel = document.getElementById('leadDetailsPanel');
        this.detailsContent = document.getElementById('leadDetailsContent');
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
        this.renderLeadDetails();
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
            this.selectedLeadId = newLead.id;
            this.renderLeadList();
            this.renderLeadDetails();
            this.updateLeadCount();
            this.closeModal();
            this.form.reset();
        });

        this.listContainer.addEventListener('click', (event) => {
            const card = event.target.closest('.lead-item');

            if (!card) {
                return;
            }

            const leadId = card.dataset.leadId;

            if (!leadId) {
                return;
            }

            this.selectedLeadId = leadId;
            this.renderLeadDetails();
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

    formatDate(dateString) {
        const date = new Date(dateString);

        if (Number.isNaN(date.getTime())) {
            return '—';
        }

        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(date);
    }

    getStatusClass(status) {
        const map = {
            New: 'status-new',
            Contacted: 'status-contacted',
            Qualified: 'status-qualified',
            Quoted: 'status-proposal',
            Booked: 'status-won',
            Lost: 'status-lost',
        };

        return map[status] || 'status-new';
    }

    // Render each lead card with core CRM fields and a colored badge.
    renderLeadList() {
        if (!this.leads.length) {
            this.listContainer.innerHTML = '<div class="empty-state">No leads yet. Add your first prospect to start recovering revenue.</div>';
            this.leadCountLabel.textContent = '0 active';
            this.selectedLeadId = null;
            return;
        }

        this.leadCountLabel.textContent = `${this.leads.length} active`;

        this.listContainer.innerHTML = this.leads
            .slice()
            .reverse()
            .map((lead) => {
                const isSelected = lead.id === this.selectedLeadId ? 'selected' : '';

                return `
                    <article class="lead-item ${isSelected}" data-lead-id="${lead.id}">
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

    // Build the details panel for the selected lead with AI scoring and action buttons.
    renderLeadDetails() {
        const selectedLead = this.leads.find((lead) => lead.id === this.selectedLeadId) || this.leads[this.leads.length - 1];

        if (!selectedLead) {
            this.detailsPanel.classList.add('hidden');
            this.detailsContent.innerHTML = '';
            return;
        }

        this.selectedLeadId = selectedLead.id;
        this.detailsPanel.classList.remove('hidden');

        const score = this.calculateLeadScore(selectedLead);
        const recommendation = this.getAiRecommendation(selectedLead, score);
        const suggestedAction = this.getSuggestedAction(selectedLead);

        this.detailsContent.innerHTML = `
            <div class="details-layout">
                <div class="details-header-row">
                    <div>
                        <p class="eyebrow">Lead Details</p>
                        <h3>${this.escapeHtml(selectedLead.customerName)}</h3>
                    </div>
                    <span class="lead-status ${this.getStatusClass(selectedLead.status)}">${this.escapeHtml(selectedLead.status)}</span>
                </div>

                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Customer Name</span>
                        <strong>${this.escapeHtml(selectedLead.customerName)}</strong>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Company</span>
                        <strong>${this.escapeHtml(selectedLead.companyName)}</strong>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Phone</span>
                        <strong>${this.escapeHtml(selectedLead.phone)}</strong>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Email</span>
                        <strong>${this.escapeHtml(selectedLead.email)}</strong>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Service Requested</span>
                        <strong>${this.escapeHtml(selectedLead.serviceRequested)}</strong>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Estimated Job Value</span>
                        <strong>${this.formatCurrency(selectedLead.estimatedValue)}</strong>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status</span>
                        <strong>${this.escapeHtml(selectedLead.status)}</strong>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Date Created</span>
                        <strong>${this.formatDate(selectedLead.createdDate)}</strong>
                    </div>
                </div>

                <div class="notes-box">
                    <span class="detail-label">Notes</span>
                    <p>${this.escapeHtml(selectedLead.notes || 'No additional notes provided.')}</p>
                </div>

                <div class="ai-panel">
                    <div class="ai-header">
                        <p class="eyebrow">AI Assistant</p>
                        <h4>Opportunity guidance</h4>
                    </div>

                    <div class="ai-grid">
                        <div class="ai-metric">
                            <span>Lead Score</span>
                            <strong>${score}/100</strong>
                        </div>
                        <div class="ai-metric">
                            <span>AI Recommendation</span>
                            <strong>${this.escapeHtml(recommendation)}</strong>
                        </div>
                        <div class="ai-metric full-width">
                            <span>Suggested Next Action</span>
                            <strong>${this.escapeHtml(suggestedAction)}</strong>
                        </div>
                    </div>
                </div>

                <div class="details-actions">
                    <button type="button" class="primary-btn" data-action="follow-up">Generate Follow-Up</button>
                    <button type="button" class="secondary-btn" data-action="contacted">Mark Contacted</button>
                    <button type="button" class="secondary-btn highlight" data-action="booked">Mark Booked</button>
                </div>
            </div>
        `;

        this.bindDetailActions();
    }

    bindDetailActions() {
        const buttons = this.detailsContent.querySelectorAll('[data-action]');

        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                const lead = this.leads.find((item) => item.id === this.selectedLeadId);

                if (!lead) {
                    return;
                }

                if (action === 'follow-up') {
                    lead.status = 'Quoted';
                }

                if (action === 'contacted') {
                    lead.status = 'Contacted';
                }

                if (action === 'booked') {
                    lead.status = 'Booked';
                }

                this.renderLeadList();
                this.renderLeadDetails();
            });
        });
    }

    calculateLeadScore(lead) {
        let score = 35;

        if (lead.estimatedValue > 3000) {
            score += 30;
        }

        if (lead.status === 'New') {
            score += 20;
        } else if (lead.status === 'Contacted') {
            score += 15;
        } else if (lead.status === 'Quoted') {
            score += 10;
        } else if (lead.status === 'Booked') {
            score += 25;
        }

        if (lead.notes && lead.notes.trim().length > 20) {
            score += 10;
        }

        return Math.min(score, 100);
    }

    getAiRecommendation(lead, score) {
        if (lead.status === 'New') {
            return 'Immediate follow-up recommended';
        }

        if (lead.status === 'Quoted') {
            return 'Check in after 48 hours';
        }

        if (lead.status === 'Booked') {
            return 'Great fit — keep momentum and confirm kickoff';
        }

        if (score >= 80) {
            return 'High-priority opportunity';
        }

        return 'Continue nurturing with value-based outreach';
    }

    getSuggestedAction(lead) {
        if (lead.status === 'New') {
            return 'Call within 30 minutes and send a personalized recap';
        }

        if (lead.status === 'Quoted') {
            return 'Follow up in 48 hours with pricing confirmation and a clear next step';
        }

        if (lead.status === 'Contacted') {
            return 'Share a tailored solution brief and invite a discovery call';
        }

        if (lead.status === 'Booked') {
            return 'Prepare onboarding and confirm timelines with the client';
        }

        return 'Send a relevant follow-up and re-qualify the opportunity';
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
