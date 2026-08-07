// AI Assistant module for the AIBuds Command Center.
// This file contains all rule-based recommendation logic and summary calculations.
// It keeps the app modular and avoids any external AI or API dependency.

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
    {
        customerName: 'Mike Adams',
        serviceRequested: 'Driveway Paving',
        estimatedValue: 1800,
        status: 'Contacted',
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

function getTodayDateLabel() {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date());
}

function getPriorityLevel(lead) {
    // Rule-based prioritization keeps the system deterministic and easy to extend.
    if (lead.estimatedValue > 3000 && lead.status === 'New') {
        return 'High';
    }

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

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(Number(value || 0));
}

function sortLeadsForPriority(leads) {
    const ranking = { High: 3, Medium: 2, Low: 1 };

    return [...leads].sort((a, b) => {
        const priorityA = getPriorityLevel(a);
        const priorityB = getPriorityLevel(b);
        return (ranking[priorityB] || 0) - (ranking[priorityA] || 0);
    });
}

function calculateSummary(leads) {
    const activeLeads = leads.length;
    const newLeads = leads.filter((lead) => lead.status === 'New').length;
    const highPriorityLeads = leads.filter((lead) => getPriorityLevel(lead) === 'High').length;
    const appointments = leads.filter((lead) => ['Contacted', 'Quoted', 'Booked'].includes(lead.status)).length;
    const potentialRevenue = leads.reduce((sum, lead) => sum + Number(lead.estimatedValue || 0), 0);
    const revenueRecovered = leads.filter((lead) => lead.status === 'Booked').reduce((sum, lead) => sum + Number(lead.estimatedValue || 0), 0);
    const followUpsDue = leads.filter((lead) => ['New', 'Contacted', 'Quoted'].includes(lead.status)).length;

    return {
        activeLeads,
        newLeads,
        highPriorityLeads,
        appointments,
        potentialRevenue,
        revenueRecovered,
        followUpsDue,
    };
}

function calculateBusinessHealth(leads) {
    const bookCount = leads.filter((lead) => lead.status === 'Booked').length;
    const totalValue = leads.reduce((sum, lead) => sum + Number(lead.estimatedValue || 0), 0);
    const openOpportunities = leads.filter((lead) => !['Booked', 'Lost'].includes(lead.status)).length;
    const averageLeadValue = totalValue / Math.max(leads.length, 1);
    const conversionRate = Math.round((bookCount / Math.max(leads.length, 1)) * 100);

    return {
        conversionRate,
        averageLeadValue,
        openOpportunities,
        estimatedRevenue: totalValue,
    };
}

function generateSuggestedTasks(leads) {
    const tasks = leads.slice(0, 4).map((lead) => {
        if (lead.status === 'New') {
            return `📞 Call ${lead.customerName}`;
        }

        if (lead.status === 'Contacted') {
            return `📧 Send ${lead.customerName} a follow-up`;
        }

        if (lead.status === 'Quoted') {
            return `📅 Confirm ${lead.customerName} appointment`;
        }

        if (getPriorityLevel(lead) === 'High') {
            return `📞 Re-engage ${lead.customerName}`;
        }

        return `📋 Review ${lead.customerName} opportunity`;
    });

    return tasks;
}

function renderGreetingAndDate() {
    const greetingEl = document.getElementById('greetingText');
    const dateEl = document.getElementById('todayDateText');

    if (greetingEl) {
        greetingEl.textContent = getGreeting();
    }

    if (dateEl) {
        dateEl.textContent = getTodayDateLabel();
    }
}

function renderBusinessSnapshot() {
    const summary = calculateSummary(aiLeadQueue);
    const summaryFields = [
        ['summaryActiveLeads', summary.activeLeads],
        ['summaryNewLeads', summary.newLeads],
        ['summaryHighPriority', summary.highPriorityLeads],
        ['summaryAppointments', summary.appointments],
        ['summaryPotentialRevenue', formatCurrency(summary.potentialRevenue)],
        ['summaryRevenueRecovered', formatCurrency(summary.revenueRecovered)],
    ];

    summaryFields.forEach(([id, value]) => {
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
            const badgeClass = getPriorityClass(priority);
            const recommendation = getAiRecommendation(lead);

            return `
                <div class="ai-priority-item">
                    <div class="ai-priority-row">
                        <div>
                            <strong>${lead.customerName}</strong>
                            <span>${lead.serviceRequested}</span>
                        </div>
                        <span class="priority-badge ${badgeClass}">${priority} PRIORITY</span>
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
        .map((task) => {
            const icon = task.startsWith('📞') ? '📞' : task.startsWith('📧') ? '📧' : task.startsWith('📅') ? '📅' : '📋';

            return `
                <div class="task-item">
                    <span class="task-icon">${icon}</span>
                    <span>${task}</span>
                </div>
            `;
        })
        .join('');
}

function renderBusinessHealth() {
    const health = calculateBusinessHealth(aiLeadQueue);

    const healthFields = [
        ['businessLeadConversion', `${health.conversionRate}%`],
        ['businessAverageLeadValue', formatCurrency(health.averageLeadValue)],
        ['businessOpenOpportunities', health.openOpportunities],
        ['businessEstimatedRevenue', formatCurrency(health.estimatedRevenue)],
    ];

    healthFields.forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderGreetingAndDate();
    renderBusinessSnapshot();
    renderAiPriorities();
    renderSuggestedTasks();
    renderBusinessHealth();
});