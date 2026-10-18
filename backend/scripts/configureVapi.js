const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const apiKey = process.env.VAPI_API_KEY;
const assistantId = process.env.VAPI_ASSISTANT_ID || 'f99f9a56-214a-47a1-9449-1de9f2d5dbbe';
const serverUrl = 'https://patch-work-rho.vercel.app/api/vapi/webhook';

async function updateAssistant() {
  console.log(`Updating Vapi Assistant: ${assistantId}...`);

  const payload = {
    name: "PatchWork Community Assistant",
    firstMessage: "Hello! Welcome to PatchWork Community Support. I can help you report an infrastructure issue like a broken streetlight, pothole, flooding, or damaged facilities. What problem would you like to report today?",
    endCallMessage: "Thank you for reporting this issue to PatchWork. Our community team has been notified. Have a wonderful day!",
    serverUrl: serverUrl,
    serverMessages: ["tool-calls", "end-of-call-report", "status-update"],
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `You are the friendly, helpful AI voice assistant for PatchWork, a community infrastructure reporting platform.
Your goal is to gather information from residents about civic problems (broken streetlights, potholes, sewage, flooding, damaged infrastructure) and submit an official report.

Follow this conversational flow:
1. Ask for or listen to the problem description and classify the category (e.g., Broken Streetlight, Pothole, Sewage / Flooding, Park / Building Infrastructure, or Other).
2. Ask for the specific location (street name, house or block number, nearby landmark).
3. Ask for the resident's full name.
4. Ask for their phone number(optional) and a mandatory email address so they can receive status updates and confirmation.
5. Once you have all 4 pieces of information (category/description, location, name, and contact):
   - Briefly summarize what you recorded to the caller to confirm.
   - Call the 'submit_community_report' tool with the extracted details.
   - After the tool returns, inform the resident that their report has been logged and their ticket number has been generated, then politely conclude the call.

Rules:
- Keep your verbal responses concise and conversational (1-3 sentences max).
- Speak naturally and reassuringly.
- If the resident doesn't provide phone number, email is sufficient.`
        }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_community_report",
            description: "Submits a verified community issue report to PatchWork and dispatches confirmation emails.",
            parameters: {
              type: "object",
              properties: {
                reporter_name: {
                  type: "string",
                  description: "Full name of the resident"
                },
                contact: {
                  type: "string",
                  description: "Phone number of the resident"
                },
                email: {
                  type: "string",
                  description: "Email address of the resident (if provided)"
                },
                location: {
                  type: "string",
                  description: "Specific location of the issue (e.g. Street 4 near Main Mosque)"
                },
                category: {
                  type: "string",
                  enum: [
                    "Broken Streetlight",
                    "Pothole",
                    "Sewage / Flooding",
                    "Park / Building Infrastructure",
                    "Other Community Issue"
                  ],
                  description: "Category of the problem"
                },
                description: {
                  type: "string",
                  description: "Detailed description of the issue"
                },
                severity: {
                  type: "string",
                  enum: ["low", "medium", "high", "critical"],
                  description: "Estimated urgency or severity"
                },
                media_urls: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of photo or video URLs attached by the resident"
                }
              },
              required: ["reporter_name", "contact", "location", "category", "description"]
            }
          },
          server: {
            url: serverUrl
          }
        }
      ]
    },
    analysisPlan: {
      summaryPlan: {
        enabled: true
      },
      structuredDataPlan: {
        enabled: true
      }
    }
  };

  const response = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update assistant: ${response.status} - ${errorText}`);
  }

  const updated = await response.json();
  console.log("✅ Vapi Assistant updated successfully!");
  console.log("Assistant Name:", updated.name);
  console.log("Model:", updated.model?.model);
  console.log("First Message:", updated.firstMessage);
  console.log("Tools Configured:", updated.model?.tools?.length);
  console.log("Server URL:", updated.serverUrl);
}

updateAssistant().catch(err => {
  console.error("❌ Error configuring Vapi Assistant:", err.message);
  process.exit(1);
});
