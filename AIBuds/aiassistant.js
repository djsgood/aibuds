// AI Assistant module for the AIBudBots Command Center.
// This file owns all rule-based AI logic for prioritization, task generation, and summary metrics.

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
    {
        customerName: 'Lauren Gomez',
        serviceRequested: 'Solar Installation',
        estimatedValue: 12000,
        status: 'Booked',
    },
];

function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) {
        return 'Good Morning';
    }

    if (hour < 18) {
        return 'Good Afternoon';
    }

    return 'Good Evening';
}

function getPriorityLevel(lead) {
    // Rule-based scoring for daily action prioritization.
    // High priority = value over $3,000 and a New status.
    if (lead.estimatedValue > 3000 && lead.status === 'New') {
        return 'High';
    }

    // Medium priority = value between $1,000 and $3,000 or a Contacted status.
    if ((lead.estimatedValue >= 1000 && lead.estimatedValue <= 3000) || lead.status === 'Contacted') {
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

function getAiRecommendation(lead) {
    const priority = getPriorityLevel(lead);

    if (priority === 'High') {
        return 'Call today to schedule the estimate.';
    }

    if (priority === 'Medium') {
        return 'Follow up within 48 hours.';
    }

    return 'No immediate action required.';
}

function sortLeadsForPriority(leads) {
    const ranking = { High: 3, Medium: 2, Low: 1 };

    return [...leads].sort((a, b) => {
        const priorityA = getPriorityLevel(a);
        const priorityB = getPriorityLevel(b);
        return (ranking[priorityB] || 0) - (ranking[priorityA] || 0);
    });
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(Number(value || 0));
}

function calculateSummary(leads) {
    const activeLeads = leads.length;
    const newLeads = leads.filter((lead) => lead.status === 'New').length;
    const highPriorityLeads = leads.filter((lead) => getPriorityLevel(lead) === 'High').length;
    const appointmentsToday = leads.filter((lead) => ['Quoted', 'Booked', 'Contacted'].includes(lead.status)).length;
    const potentialRevenue = leads.reduce((sum, lead) => sum + Number(lead.estimatedValue || 0), 0);
    const followUpsDue = leads.filter((lead) => ['New', 'Contacted', 'Quoted'].includes(lead.status)).length;

    return {
        activeLeads,
        newLeads,
        highPriorityLeads,
        appointmentsToday,
        potentialRevenue,
        followUpsDue,
    };
}

function generateSuggestedTasks(leads) {
    const tasks = leads.slice(0, 4).map((lead) => {
        const priority = getPriorityLevel(lead);

        if (lead.status === 'New') {
            return `📞 Call ${lead.customerName}`;
        }

        if (lead.status === 'Contacted') {
            return `📧 Send ${lead.customerName} a follow-up`;
        }

        if (lead.status === 'Quoted') {
            return `📅 Confirm ${lead.customerName} appointment`;
        }

        if (priority === 'High') {
            return `📞 Re-engage ${lead.customerName}`;
        }

        return `📋 Review ${lead.customerName} opportunity`;
    });

    return tasks;
}

function renderCommandCenterSummary() {
    const summary = calculateSummary(aiLeadQueue);

    const greetingEl = document.getElementById('greetingText');
    if (greetingEl) {
        greetingEl.textContent = getGreeting();
    }

    const fields = [
        ['summaryActiveLeads', summary.activeLeads],
        ['summaryNewLeads', summary.newLeads],
        ['summaryHighPriority', summary.highPriorityLeads],
        ['summaryAppointments', summary.appointmentsToday],
        ['summaryPotentialRevenue', formatCurrency(summary.potentialRevenue)],
        ['summaryFollowUps', summary.followUpsDue],
    ];

    fields.forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });

    const snapshotFields = [
        ['snapshotPotentialRevenue', formatCurrency(summary.potentialRevenue)],
        ['snapshotJobsWon', aiLeadQueue.filter((lead) => lead.status === 'Booked').length],
        ['snapshotJobsLost', aiLeadQueue.filter((lead) => lead.status === 'Lost').length || 1],
        ['snapshotConversionRate', `${Math.round((aiLeadQueue.filter((lead) => lead.status === 'Booked').length / Math.max(summary.activeLeads, 1)) * 100)}%`],
        ['snapshotHoursSaved', `${Math.max(12, summary.activeLeads * 4)}h`],
    ];

    snapshotFields.forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
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
            const recommendation = getAiRecommendation(lead);
            const badgeClass = getPriorityClass(priority);

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
                        <span>${formatCurrency(lead.estimatedValue)}</span>
                        <span>${lead.status}</span>
                    </div>

                    <div class="ai-priority-recommendation">
                        <strong>Recommendation:</strong> ${recommendation}
                    </div>
                </div>
            `;
        })
        .join('');
}

function renderSuggestedTasks() {
    const container = document.getElementById('suggestedTasksList');

    if (!container) {
        return;
    }

    const tasks = generateSuggestedTasks(aiLeadQueue);

    container.innerHTML = tasks
        .map((task) => `
            <div class="task-item">
                <span class="task-icon">${task.startsWith('📞') ? '📞' : task.startsWith('📧') ? '📧' : task.startsWith('📅') ? '📅' : '📋'}</span>
                <span>${task}</span>
            </div>
        `)
        .join('');
}

document.addEventListener('DOMContentLoaded', () => {
    renderCommandCenterSummary();
    renderAiPriorities();
    renderSuggestedTasks();
});