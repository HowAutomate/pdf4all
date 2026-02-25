

## Problem

The n8n webhook response format doesn't match what the frontend expects. 

**Frontend expects:**
```json
[{"ConversionCost": 1, "Files": [{"FileName": "...", "Url": "..."}]}]
```

**Webhook actually returns:**
```json
[{"mimeType":"application/pdf","fileType":"pdf","fileName":"output.pdf","fileExtension":"pdf","fileSize":"41.5 kB"}]
```

There is no `Url` field in the response. The n8n "Respond to Webhook" node is configured to return binary data (the PDF itself), so the response is likely the raw PDF binary — not JSON with a download link.

## Solution

Update the frontend to:
1. Receive the webhook response as a **binary blob** (the PDF file itself)
2. Create a local **blob URL** (`URL.createObjectURL`) for download
3. Update the `ConversionResult` type and `useConversion` hook to match this new flow

### Changes

**`src/types/conversion.ts`** — Simplify the `ConversionResult` type to match the actual response (fileName, fileSize, plus a local blob URL).

**`src/hooks/useConversion.ts`** — Instead of `response.json()`, use `response.blob()` to get the PDF binary, then create a download URL with `URL.createObjectURL(blob)`. Extract the filename from the Content-Disposition header or default to `output.pdf`.

**`src/components/ConversionResult.tsx`** — Update to use the simplified result type with the blob URL for downloading.

This approach works regardless of whether n8n sends binary data or JSON metadata — we handle both cases.

