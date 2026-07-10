// Compatibility endpoint for the external cron-job.org job that was originally
// configured as /api/cron/campaigns. It now drains the shared WhatsApp queue:
// online booking confirmations/group alerts + POS invoice/thank-you receipts.
export { GET } from "../booking-queue/route";
