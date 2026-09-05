import os
import subprocess
import json
import urllib.request
import urllib.parse
import re
import base64
from email.message import EmailMessage

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build


# ============================================================
# CONFIG
# ============================================================

MODEL = r"C:\Users\DJ\Downloads\meta-llama-3.1-8b-instruct-abliterated-q4_k_m 2.gguf"

LEADS_URL = (
    "https://script.google.com/macros/s/"
    "AKfycbzcIEdgtU1s9oz54OBAltFdzfCsTHeIafgBHdJRga_-RSDVr8Yt_Q2E83O1MnNclWQuRw"
    "/exec"
)

CREDENTIALS_FILE = "credentials.json"
TOKEN_FILE = "token.json"

SENDER_EMAIL = "aibudbots.ai@gmail.com"

SIGNATURE = "Best regards,\nAIBudBots"

SCOPES = [
    "https://www.googleapis.com/auth/gmail.send"
]


# ============================================================
# GOOGLE SHEET API
# ============================================================

def sheet_request(action, row=None):

    params = {
        "action": action
    }

    if row is not None:
        params["row"] = row

    url = LEADS_URL + "?" + urllib.parse.urlencode(params)

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "AIBudBots-Agent/1.0"
        }
    )

    with urllib.request.urlopen(request) as response:
        raw = response.read().decode("utf-8")

    print("Sheet response:", raw)

    return json.loads(raw)


def get_leads():

    result = sheet_request(
        "get_leads"
    )

    if not result.get("success"):

        raise RuntimeError(
            result.get(
                "error",
                "Could not retrieve leads"
            )
        )

    return result.get(
        "leads",
        []
    )


def mark_contacted(row):

    result = sheet_request(
        "mark_contacted",
        row
    )

    if not result.get("success"):

        raise RuntimeError(
            result.get(
                "error",
                "Could not mark lead Contacted"
            )
        )

    return result


# ============================================================
# GMAIL OAUTH
# ============================================================

def get_gmail_service():

    creds = None

    if os.path.exists(TOKEN_FILE):

        creds = Credentials.from_authorized_user_file(
            TOKEN_FILE,
            SCOPES
        )

    if not creds or not creds.valid:

        if (
            creds
            and creds.expired
            and creds.refresh_token
        ):

            creds.refresh(
                Request()
            )

        else:

            if not os.path.exists(
                CREDENTIALS_FILE
            ):

                raise RuntimeError(
                    "credentials.json was not found."
                )

            flow = (
                InstalledAppFlow
                .from_client_secrets_file(
                    CREDENTIALS_FILE,
                    SCOPES
                )
            )

            creds = flow.run_local_server(
                port=0
            )

        with open(
            TOKEN_FILE,
            "w",
            encoding="utf-8"
        ) as token:

            token.write(
                creds.to_json()
            )

    return build(
        "gmail",
        "v1",
        credentials=creds
    )


# ============================================================
# LOCAL AI
# ============================================================

def ask_ai(prompt):

    result = subprocess.run(
        [
            "llama-cli",
            "-m",
            MODEL,
            "--device",
            "none",
            "-p",
            prompt,
            "-n",
            "250",
            "--single-turn",
            "--no-display-prompt"
        ],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:

        raise RuntimeError(
            result.stderr.strip()
        )

    output = result.stdout.strip()

    action_position = (
        output.upper().find(
            "ACTION:"
        )
    )

    if action_position >= 0:

        output = output[
            action_position:
        ]

    output = re.sub(
        r"\[\s*Prompt:.*?\]",
        "",
        output,
        flags=re.IGNORECASE | re.DOTALL
    )

    output = re.sub(
        r"\[\s*Generation:.*?\]",
        "",
        output,
        flags=re.IGNORECASE | re.DOTALL
    )

    output = re.sub(
        r"\n*Exiting\.\.\.\s*$",
        "",
        output,
        flags=re.IGNORECASE
    )

    return output.strip()


# ============================================================
# SEND EMAIL THROUGH GMAIL API
# ============================================================

def send_email(
    to_email,
    subject,
    body
):

    service = get_gmail_service()

    message = EmailMessage()

    message["From"] = SENDER_EMAIL
    message["To"] = to_email
    message["Subject"] = subject

    message.set_content(
        body
    )

    encoded_message = (
        base64.urlsafe_b64encode(
            message.as_bytes()
        )
        .decode()
    )

    gmail_message = {
        "raw": encoded_message
    }

    service.users().messages().send(
        userId="me",
        body=gmail_message
    ).execute()


# ============================================================
# EXTRACT AI EMAIL
# ============================================================

def extract_email(decision):

    match = re.search(
        r"ACTION:\s*SEND\s*"
        r"SUBJECT:\s*(.*?)\s*"
        r"BODY:\s*(.*)",
        decision,
        flags=re.IGNORECASE | re.DOTALL
    )

    if not match:

        return None, None

    subject = (
        match.group(1)
        .strip()
    )

    body = (
        match.group(2)
        .strip()
    )

    invalid_subjects = (
        "...",
        "[short subject]",
        "[your subject]",
        "[subject]",
        "actual subject here",
        "[real subject]"
    )

    invalid_bodies = (
        "...",
        "[complete email]",
        "[your email message]",
        "[email message]",
        "actual email here",
        "[real email]"
    )

    if subject.lower() in invalid_subjects:

        return None, None

    if body.lower() in invalid_bodies:

        return None, None

    body = re.sub(
        r"\n*(Best regards|Regards|Sincerely|Thank you),?.*$",
        "",
        body,
        flags=re.IGNORECASE | re.DOTALL
    )

    body = body.strip()

    if not body:

        return None, None

    body += (
        "\n\n"
        + SIGNATURE
    )

    return subject, body


# ============================================================
# MAIN
# ============================================================

print()
print("======================================")
print("       AIBudBots Lead Recovery")
print("======================================")
print()

print("Checking for leads...")


all_leads = get_leads()


leads = [
    lead
    for lead in all_leads
    if str(
        lead.get(
            "Status",
            ""
        )
    ).strip().lower() == "new"
]


print(
    f"Found {len(leads)} new lead(s)."
)

print()


# ============================================================
# PROCESS LEADS
# ============================================================

for lead in leads:

    row = lead.get(
        "Row"
    )

    name = str(
        lead.get(
            "Name",
            ""
        )
    ).strip()

    email = str(
        lead.get(
            "Email",
            ""
        )
    ).strip()

    phone = str(
        lead.get(
            "Phone",
            ""
        )
    ).strip()

    service = str(
        lead.get(
            "Service",
            ""
        )
    ).strip()

    original_message = str(
        lead.get(
            "Message",
            ""
        )
    ).strip()


    print("--------------------------------------")
    print(f"Processing row: {row}")
    print(f"Processing: {name}")
    print(f"Email: {email}")
    print(f"Service: {service}")
    print("--------------------------------------")


    if not row:

        print(
            "Skipping: lead has no Row number."
        )

        continue


    if not email:

        print(
            "Skipping: no email address."
        )

        continue


    prompt = f"""
Write the actual customer follow-up email for this lead.

CUSTOMER:
Name: {name}
Email: {email}
Phone: {phone}
Service requested: {service}
Original message: {original_message}

The customer contacted the business about this request.

Write a short, professional, natural follow-up email.

Requirements:

- Address the customer by first name.
- Acknowledge what they originally requested.
- Mention the service naturally.
- Show that their request matters.
- Make the next step easy.
- Encourage a reply or phone call.
- Keep it approximately 60-120 words.
- Do not invent prices.
- Do not invent appointment times.
- Do not claim an inspection happened.
- Do not invent facts.
- Do not mention AI.
- Do not mention AIBudBots.
- Do not invent a person's name.
- Do not add a signature.
- Do not use placeholders.
- Do not use "...".
- Do not write an example.
- Write the actual email.

The lead has a valid email and service request, so choose SEND.

Return exactly:

ACTION: SEND
SUBJECT: [real subject]
BODY: [real email]

Replace the bracketed instructions with actual content.

Do not literally output:
[real subject]
[real email]

Do not explain anything.
"""


    print(
        "AI is deciding..."
    )


    try:

        decision = ask_ai(
            prompt
        )

    except Exception as error:

        print(
            f"AI ERROR: {error}"
        )

        continue


    print()
    print("AI DECISION:")
    print(decision)
    print()


    if (
        "ACTION: SEND"
        not in decision.upper()
    ):

        print(
            "AI chose not to send."
        )

        continue


    subject, body = extract_email(
        decision
    )


    if not subject or not body:

        print(
            "ERROR: Could not extract a usable email."
        )

        continue


    try:

        print(
            "Sending email..."
        )

        send_email(
            email,
            subject,
            body
        )

        print(
            "Email sent successfully."
        )


    except Exception as error:

        print(
            f"EMAIL ERROR: {error}"
        )

        print(
            "Lead remains NEW."
        )

        continue


    try:

        print(
            f"Updating row {row}..."
        )

        result = mark_contacted(
            row
        )

        print(
            "Status update successful:"
        )

        print(
            result
        )

        print(
            f"Lead on row {row} marked CONTACTED."
        )


    except Exception as error:

        print(
            f"STATUS UPDATE ERROR: {error}"
        )

        print(
            "Email was sent, but lead remains NEW."
        )


    print()


# ============================================================
# FINISHED
# ============================================================

print("======================================")
print("Agent finished.")
print("======================================")