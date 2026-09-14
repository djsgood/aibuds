import os
import subprocess
import json
import urllib.request
import urllib.parse
import re
import base64
from pathlib import Path
from email.message import EmailMessage

from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build


# ============================================================
# CONFIG
# ============================================================

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

MODEL = os.environ.get(
    "AIBUDS_MODEL",
    str(ROOT / "ai_models" / "Qwen3-VL-4B-Instruct-Uncensored-abliterated.Q5_K_M.gguf"),
)

LEADS_URL = os.environ.get(
    "AIBUDS_LEADS_URL",
    "https://script.google.com/macros/s/AKfycbw2TbbigAIsPvEPZuuj1Jel5EprFszhVM-tBhOJy69D8DZSJK4uZe8hYl-3qN4VaIUo/exec"
)

CREDENTIALS_FILE = ROOT / "agent" / "credentials.json"
TOKEN_FILE = ROOT / "agent" / "token.json"

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
            str(TOKEN_FILE),
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
                    f"credentials.json was not found at: {CREDENTIALS_FILE}"
                )

            flow = (
                InstalledAppFlow
                .from_client_secrets_file(
                    str(CREDENTIALS_FILE),
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
        text=True,
        encoding="utf-8"
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

    subject = subject.encode("ascii", "ignore").decode("ascii")

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

    mojibake_markers = ("â", "ð", "ï")

    if any(marker in body for marker in mojibake_markers):
        try:
            body = body.encode("cp1252").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass

    body = (
        body
        .replace("â€™", "'")
        .replace("â€˜", "'")
        .replace("â€œ", '"')
        .replace("â€", '"')
        .replace("â€”", "-")
        .replace("â€“", "-")
        .replace("’", "'")
        .replace("‘", "'")
        .replace("“", '"')
        .replace("”", '"')
        .replace("—", "-")
        .replace("–", "-")
    )

    body = body.encode("ascii", "ignore").decode("ascii")

    body = body.strip()

    if not body:

        return None, None

    body += (
        "\n\n"
        + SIGNATURE
    )

    return subject, body


# ============================================================
# STARTUP VALIDATION
# ============================================================

def validate_runtime():

    if not MODEL or not os.path.exists(MODEL):
        raise RuntimeError(
            f"Model file not found: {MODEL}"
        )

    if not LEADS_URL:
        raise RuntimeError(
            "AIBUDS_LEADS_URL is not configured."
        )

    health = sheet_request("get_leads")

    if not health.get("success"):
        raise RuntimeError(
            health.get("error", "Sheet endpoint is not responding successfully.")
        )


# ============================================================
# MAIN
# ============================================================

print()
print("======================================")
print("       AIBudBots Lead Recovery")
print("======================================")
print()

print("Checking for leads...")
validate_runtime()

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
- Show that their request matters without using canned phrases such as "ASAP", "right away", or "we are prioritizing".
- Make the next step easy.
- Encourage a reply or phone call.
- Keep it approximately 60-120 words.
- Use plain ASCII punctuation only: straight apostrophes, double quotes, and hyphens. Do not use curly quotes, em dashes, or en dashes.
- Sound warm and specific to this customer, not like an automated status update.
- Do not ask the customer to choose a time or imply that a time is being held or reserved.
- Do not use phrases such as "let me know a time that works", "I'll hold it open", "we'll get back to you right away", or "your time matters".
- End with a natural invitation to reply to this email or call 456-098-0987.
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