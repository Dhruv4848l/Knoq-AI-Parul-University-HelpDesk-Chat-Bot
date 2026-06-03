# Knoq-AI Prompt Testing Guide (Updated)

This guide provides accurate testing prompts for the Parul University AI Chatbot. The system has been updated so that **Navigation queries bypass the Semantic Cache**, ensuring that you always get the exact requested map links, coordinates, or distances without receiving stale cached responses.

## 1. Campus Navigation & Map Links
Navigation queries fetch data *instantly* from the local 4,290-route dataset and always include Google Maps links when requested.

| Prompt | Expected Behavior / Output |
|--------|----------------------------|
| `Map from A1 to A6` | Returns full route details from PIET Main (A1) to Parul Institute of Nursing (A6), **including the Google Maps link** and walking distance (183 meters). |
| `Navigation link from A1 to A6` | Same as above. The Google Maps link will be explicitly provided as a clickable markdown URL. |
| `Distance from H1 to H5` | Returns the distance between Shastri Bhawan A and Sarojini Bhawan A. |
| `Walk time from gym to workshop` | Returns the estimated walk time from A5 to A20. |
| `path from ayurved to ayurved hospital` | Shows the walking directions from A13 to E1. |
| `H1 to H19` | Returns the full route from Shastri A to Teresa A. |

## 2. Basic Info Interceptor (NEW)
A dedicated, instant-response handler has been added for general university information.

| Prompt | Expected Behavior / Output |
|--------|----------------------------|
| `info about parul university` | Instantly returns the university's Name, Brand Ambassador (MS Dhoni), Tagline, NAAC Grade (A++), Website, Admissions Portal, and Toll Free Number. |
| `details of parul university` | Same as above. |
| `about parul university` | Same as above. |

## 3. General FAQ & Knowledge Base (RAG)
These prompts test the AI's ability to fetch data from the newly ingested Excel datasheet and PDF brochures.

| Prompt | Expected Behavior / Output |
|--------|----------------------------|
| `What are the hostel fees?` | AI pulls data from the "Fees & Hostels" chunks in the DB and lists the fee structure. |
| `What are the hostel rules?` | AI retrieves the specific hostel regulations. |
| `Tell me about placement at PU` | Retrieves placement statistics and highlights. |
| `How to apply for scholarship?` | Provides the step-by-step scholarship application process. |
| `What is the fee structure for B.Tech?` | Retrieves exact B.Tech fee details from the Datasheet. |
| `What clubs are there at PU?` | Fetches student club information. |

## 4. Edge Cases & Aliases
The bot supports a robust typo-tolerance (max 2 characters) and alias mapping system.

| Prompt | Expected Behavior / Output |
|--------|----------------------------|
| `what is the bank?` | Auto-maps to Central Bank of India (B1). |
| `A1` | Returns coordinates, google maps name, and route count for PIET Main. |
| `tell me about N block` | Maps to Bhagat Singh Bhawan (A24) and provides its details. |
| `nursing block to nursing` | Recognizes same building and returns standard building info. |
| `from engineering to engineering workshop` | Handles A1 → A20 correctly, differentiating between "engineering" and "engineering workshop". |

---
**Verification Status**: All tests above are verified against the updated codebase (`backend/routes/chat.js`). The semantic cache interference on navigation links is fully resolved, and the basic university details are mapped directly to the contact sheet data.
