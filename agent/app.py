import streamlit as st
import json
import urllib.request
import urllib.parse
import subprocess
import sys


# ============================================================
# PAGE CONFIGURATION
# ============================================================

st.set_page_config(
    page_title="AIBudBots Lead Recovery",
    page_icon="🤖",
    layout="wide"
)


# ============================================================
# CONFIGURATION
# ============================================================

LEADS_URL = (
    "https://script.google.com/macros/s/"
    "AKfycbyYePAY0NK306BGSqoi3xhdALDKr0xTEkFc81BOV5XgpcraNxrqWwjuamsW1VAB13gMnQ/"
    "exec"
)


# ============================================================
# GET LEADS FROM GOOGLE SHEET
# ============================================================

def get_leads():

    params = {
        "action": "get_leads"
    }

    url = LEADS_URL + "?" + urllib.parse.urlencode(params)

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "AIBudBots-Dashboard/1.0"
        }
    )

    with urllib.request.urlopen(request) as response:

        raw = response.read().decode("utf-8")

    result = json.loads(raw)

    if not result.get("success"):

        raise RuntimeError(
            result.get(
                "error",
                "Could not retrieve leads"
            )
        )

    return result.get("leads", [])


# ============================================================
# RUN THE EXISTING AGENT
# ============================================================

def run_agent():

    return subprocess.run(
        [
            sys.executable,
            "agent.py"
        ],
        capture_output=True,
        text=True,
        cwd="."
    )


# ============================================================
# HEADER
# ============================================================

st.title("🤖 AIBudBots Lead Recovery")

st.write(
    "Automatically follow up with new leads before they go cold."
)

st.divider()


# ============================================================
# LOAD LEADS
# ============================================================

try:

    leads = get_leads()

except Exception as error:

    st.error(
        f"Could not load leads: {error}"
    )

    leads = []


# ============================================================
# CALCULATE METRICS
# ============================================================

total_leads = len(leads)

new_leads = len(
    [
        lead
        for lead in leads
        if str(
            lead.get(
                "Status",
                ""
            )
        ).strip().lower() == "new"
    ]
)

contacted_leads = len(
    [
        lead
        for lead in leads
        if str(
            lead.get(
                "Status",
                ""
            )
        ).strip().lower() == "contacted"
    ]
)


# ============================================================
# DISPLAY METRICS
# ============================================================

col1, col2, col3 = st.columns(3)

col1.metric(
    "Total Leads",
    total_leads
)

col2.metric(
    "New Leads",
    new_leads
)

col3.metric(
    "Recovered / Contacted",
    contacted_leads
)


st.divider()


# ============================================================
# LEAD RECOVERY
# ============================================================

st.subheader("Lead Recovery")

st.write(
    "Run the AI Lead Recovery Agent to follow up with all new leads."
)


if st.button(
    "🚀 Recover New Leads",
    type="primary",
    use_container_width=True
):

    with st.spinner(
        "AI Lead Recovery Agent is checking and recovering leads..."
    ):

        result = run_agent()


    st.divider()

    st.subheader("Agent Results")


    if result.returncode == 0:

        st.success(
            "Lead Recovery Agent finished successfully."
        )

    else:

        st.error(
            f"Agent stopped with exit code {result.returncode}"
        )


    st.write("### Agent Output")

    if result.stdout:

        st.code(
            result.stdout,
            language="text"
        )

    else:

        st.warning(
            "The agent returned no standard output."
        )


    if result.stderr:

        st.write("### Agent Warnings / Errors")

        st.code(
            result.stderr,
            language="text"
        )


    st.info(
        "Refresh the browser after reviewing the results to load the updated lead status."
    )


st.divider()


# ============================================================
# LEADS TABLE
# ============================================================

st.subheader("Leads")


if leads:

    display_leads = []

    for lead in leads:

        display_leads.append(
            {
                "Name": lead.get(
                    "Name",
                    ""
                ),
                "Email": lead.get(
                    "Email",
                    ""
                ),
                "Phone": lead.get(
                    "Phone",
                    ""
                ),
                "Service": lead.get(
                    "Service",
                    ""
                ),
                "Message": lead.get(
                    "Message",
                    ""
                ),
                "Status": lead.get(
                    "Status",
                    ""
                )
            }
        )


    st.dataframe(
        display_leads,
        use_container_width=True
    )


else:

    st.info(
        "No leads found."
    )