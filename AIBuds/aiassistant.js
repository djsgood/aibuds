// AI Assistant module for the AIBudBots dashboard.
// This file owns all AI priority logic so the dashboard behaves like an AI employee without depending on any external API.

const aiLeadQueue = [
    {
        customerName: 'Bob King',
        serviceRequested: 'Deck Construction',
        estimatedValue: 4500,
        status: 'New',
    },
    {
        customerName: 'Sarah Nguyen',
        serviceRequested: 'Garage Conversion',
        estimatedValue: 2200,
        status: 'Contacted',
    },
    {
        customerName: 'Chris Wilson',
        serviceRequested: 'Patio Install',
        estimatedValue: 800,
        status: 'Qualified',
    },
    {
        customerName: 'Maya Patel',
        serviceRequested: 'Fence Replacement',
        estimatedValue: 3600,
        status: 'Quoted',
    },
];

function getPriorityLevel(lead) {
    // Priority rules are intentionally simple and deterministic.
    if (lead.estimatedValue > 3000 && lead.status === 'New') {
        return 'High';
    }

    if (lead.estimatedValue >= 1000 && lead.estimatedValue <= 3000 || lead.status === 'Contacted') {
        return 'Medium';
    }

    return 'Low';
}

function getPriorityClass(priority) {
    const classes = {
        High: 'priority-high',
        Medium: 'priority-medium',
        Low: 'priority-low',
    };

    return classes[priority] || 'priority-low';
}

function getAiRecommendation(priority) {
    const recommendations = {
        High: 'Call this customer today.',
        Medium: 'Follow up within 48 hours.',
        Low: 'No immediate action required.',
    };

    return recommendations[priority] || 'No immediate action required.';
}

function sortLeadsForPriority(leads) {
    const ranking = { High: 3, Medium: 2, Low: 1 };

    return [...leads].sort((a, b) => {
        const priorityA = getPriorityLevel(a);
        const priorityB = getPriorityLevel(b);
        return (ranking[priorityB] || 0) - (ranking[priorityA] || 0);
    });
}

function renderAiPriorities() {
    const container = document.getElementById('aiPriorityList');

    if (!container) {
        return;
    }

    const sortedLeads = sortLeadsForPriority(aiLeadQueue);

    container.innerHTML = sortedLeads
        .map((lead) => {
            const priority = getPriorityLevel(lead);
            const badgeClass = getPriorityClass(priority);
            const recommendation = getAiRecommendation(priority);

            return `
                <div class="ai-priority-item">
                    <div class="ai-priority-row">
                        <div>
                            <strong>${lead.customerName}</strong>
                            <span>${lead.serviceRequested}</span>
                        </div>
                        <span class="priority-badge ${badgeClass}">${priority}</span>
                    </div>

                    <div class="ai-priority-meta">
                        <span>Value: $${Number(lead.estimatedValue).toLocaleString()}</span>
                        <span>Status: ${lead.status}</span>
                    </div>

                    <div class="ai-priority-recommendation">
                        ${recommendation}
                    </div>
                </div>
            `;
        })
        .join('');
}

document.addEventListener('DOMContentLoaded', () => {
    renderAiPriorities();
});
